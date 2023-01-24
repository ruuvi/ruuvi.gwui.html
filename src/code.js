// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match

    })
  }
}

let apList = null
let selectedSSID = ''
let connectedSSID = ''
let flagUseSavedRemoteCfgAuthBearerToken = false
let flagUseSavedLanAuthApiKey = false
let flagUseSavedLanAuthApiKeyRW = false
let g_flagAccessFromLAN = false
let g_refreshAPActive = false
let g_refreshAPTimer = null
let g_refreshAPInProgress = false
let g_checkStatusActive = false
let g_checkStatusTimer = null
let g_checkStatusInProgress = false
let firmwareUpdatingBaseURL = 'https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/'
let flagLatestFirmwareVersionSupported = false
let counterStatusJsonTimeout = 0
let flagWaitingNetworkConnection = false
let flagNetworkConnected = false
let g_page_ethernet_connection_timer = null
let g_current_page = null
let g_refresh_ap_timeout = 15000
let g_refresh_ap_flag_initial = false
let g_wifi_sort_by_rssi = false
let g_fw_updating_stage

const CONNECTION_STATE = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  FAILED: 'FAILED',
}

const URC_CODE = {
  CONNECTED: 0,
  FAILED: 1,
  DISCONNECTED: 2,
  LOST_CONNECTION: 3,
}

let connectionState = CONNECTION_STATE.NOT_CONNECTED

function log_wrap (msg) {
  return '[' + new Date().toISOString() + '] ' + msg
}

function startCheckStatus (timeout = 0) {
  if (g_checkStatusTimer !== null) {
    console.log(log_wrap('Warning: startCheckStatus is called while the previous timer is not stopped'))
    stopCheckStatus()
  }
  g_checkStatusActive = true
  g_checkStatusTimer = setTimeout(checkStatus, timeout)
}

function stopCheckStatus () {
  console.log(log_wrap('Stop periodic status check'))
  if (g_checkStatusTimer != null) {
    clearTimeout(g_checkStatusTimer)
    g_checkStatusTimer = null
  }
  g_checkStatusActive = false
}

function startRefreshAP (timeout = 0) {
  if (g_refreshAPTimer !== null) {
    console.log(log_wrap('startRefreshAP: Warning: previous timer has not stopped yet'))
    stopRefreshAP()
  }
  g_refreshAPActive = true
  if (g_refreshAPInProgress) {
    console.log(log_wrap('startRefreshAP: Warning: previous query /ap.json is still running'))
    return
  }
  if (timeout === 0) {
    console.log(log_wrap('startRefreshAP: Start refreshing Wi-Fi APs'))
  } else {
    console.log(log_wrap('startRefreshAP: Start refreshing Wi-Fi APs after timeout=' + timeout))
  }
  g_refreshAPTimer = setTimeout(refreshAP, timeout)
}

function stopRefreshAP () {
  console.log(log_wrap('Stop refreshing Wi-Fi APs'))
  if (g_refreshAPTimer != null) {
    clearTimeout(g_refreshAPTimer)
    g_refreshAPTimer = null
  }
  g_refreshAPActive = false
}

function bodyClassLoadingAdd () {
  console.log(log_wrap('Add class \'is-loading\''))
  $('body').addClass('is-loading')
}

function bodyClassLoadingRemove () {
  console.log(log_wrap('Remove class \'is-loading\''))
  $('body').removeClass('is-loading')
}

// Navigation
function change_url (url) {
  if (window.location.hash === ('#' + url)) {
    return
  }
  window.location.hash = url
}

function input_password_on_open_page (input_password) {
  input_password.attr('type', 'password')
  let input_password_eye = input_password.parent().children('.input-password-eye')
  if (input_password_is_saved(input_password)) {
    input_password_eye.addClass('disabled')
  }
  input_password_eye.children('.eye').removeClass('hidden')
  input_password_eye.children('.eye-slash').addClass('hidden')
}

function input_password_set_use_saved (input_password) {
  input_password.attr('placeholder', '********')
  input_password.parent().children('.input-password-eye').addClass('disabled')
  input_password.val('')
  let input_password_eye = input_password.parent().children('.input-password-eye')
  input_password_eye.children('.eye').removeClass('hidden')
  input_password_eye.children('.eye-slash').addClass('hidden')
}

function input_password_is_saved (input_password) {
  return input_password.attr('placeholder') === '********'
}

function input_password_clear_saved (input_password) {
  input_password.removeAttr('placeholder')
  input_password.parent().children('.input-password-eye').removeClass('disabled')
}

function input_password_clear (input_password) {
  input_password.val('')
  input_password_clear_saved(input_password)
}

function on_network_connected_wifi () {
  $('#connected-eth').hide()
  $('#connected-wifi').show()
}

function on_network_connected_eth () {
  $('#connected-wifi').hide()
  $('#connected-eth').show()
}

function change_page_to_network_type () {
  change_url('page-network_type')
}

function change_page_to_wifi_connection () {
  change_url('page-wifi_connection')
}

function change_page_to_ethernet_connection () {
  change_url('page-ethernet_connection')
}

function change_page_to_software_update () {
  bodyClassLoadingRemove()
  change_url('page-software_update')
}

function change_page_to_remote_cfg () {
  change_url('page-remote_cfg')
}

function change_page_to_update_schedule () {
  change_url('page-update_schedule')
}

function change_url_software_update_progress () {
  change_url('page-software_update_progress')
}

function change_page_to_settings_lan_auth () {
  change_url('page-settings_lan_auth')
}

function change_url_ntp_config () {
  change_url('page-ntp_config')
}

function change_url_cloud_options () {
  change_url('page-cloud_options')
}

function change_url_custom_server () {
  change_url('page-custom_server')
}

function change_url_scanning () {
  change_url('page-scanning')
}

function change_page_to_finished (num_steps) {
  let h = ''
  h += '<ul class="progressbar">'
  for (let i = 0; i < num_steps; ++i) {
    h += '<li class="active"></li>'
  }
  h += '</ul>'
  $('section#page-finished div.progressbar-container').html(h)
  change_url('page-finished')
}

function on_show_software_update () {
  if ($('#software_update-version-latest').text() !== '') {
    let latest_release_version = $('#software_update-version-latest').text()
    let software_update_url = firmwareUpdatingBaseURL + latest_release_version
    $('#software_update-url').val(software_update_url)
    return
  }
  $('#page-software_update-latest_fw_ver').hide()
  $('#software_update-button-upgrade').addClass('disable-click')
  $('.software_update-status').hide()
  $('#page-software_update-in_progress').show()

  $('#software_update-status-ok-already_latest').addClass('hidden')
  $('#software_update-status-ok-latest_not_supported').addClass('hidden')
  $('#software_update-status-ok-update_available').addClass('hidden')
  $('#software_update-status-error').addClass('hidden')

  $('#page-software_update-advanced-button').addClass('disable-click')

  bodyClassLoadingAdd()
  stopCheckStatus()
  $.getJSON('/github_latest_release.json', function (data) {
    let latest_release_version = data.tag_name
    let m = latest_release_version.match(/v(\d+)\.(\d+)\.(\d+)/)
    flagLatestFirmwareVersionSupported = false
    if (m) {
      let latest_release_version_bin = (parseInt(m[1]) << 16) + (parseInt(m[2]) << 8) + parseInt(m[3])
      if (latest_release_version_bin >= 0x00010304) {
        flagLatestFirmwareVersionSupported = true
      }
    }

    $('#page-software_update-in_progress').hide()
    $('#software_update-version-latest').text(latest_release_version)
    $('#page-software_update-latest_fw_ver').show()
    if (latest_release_version !== $('#software_update-version-current').text()) {
      $('#page-software_update-button-continue_no_update').addClass('hidden')
      $('#page-software_update-button-continue_without_update').removeClass('hidden')
    } else {
      $('#page-software_update-button-continue_no_update').removeClass('hidden')
      $('#page-software_update-button-continue_without_update').addClass('hidden')
    }

    let software_update_url = firmwareUpdatingBaseURL + latest_release_version
    $('#software_update-url').val(software_update_url)

    $('#page-software_update-advanced-button').removeClass('disable-click')

    let current_version = $('#software_update-version-current').text()

    $('.software_update-status').hide()
    if (!flagLatestFirmwareVersionSupported) {
      $('#software_update-status-ok-latest_not_supported').show()
    } else {
      if (current_version === latest_release_version) {
        $('#software_update-status-ok-already_latest').show()
      } else {
        $('#software_update-status-ok-update_available').show()
        $('#software_update-button-upgrade').removeClass('disable-click')
      }
    }
    bodyClassLoadingRemove()
    startCheckStatus()
  }).fail(function ($xhr) {
    $('#page-software_update-in_progress').hide()
    $('#page-software_update-advanced-button').removeClass('disable-click')
    let data = $xhr.responseJSON
    $('.software_update-status').hide()
    $('#software_update-status-error').show()
    bodyClassLoadingRemove()
    startCheckStatus()
  })
}

function on_remote_cfg_changed () {
  let input_base_url = $('#remote_cfg-base_url')
  let base_url_val = input_base_url.val()
  let remote_cfg_use = $('#remote_cfg-use').prop('checked')
  let remote_cfg_use_auth = $('#remote_cfg-use_auth').prop('checked')

  let remote_cfg_auth_basic_user = $('#remote_cfg-auth_basic-user')
  let remote_cfg_auth_basic_pass = $('#remote_cfg-auth_basic-password')
  let remote_cfg_auth_bearer_token = $('#remote_cfg-auth_bearer-token')
  if (input_validity_is_validation_required(input_base_url)) {
    input_validity_clear_icon(input_base_url)
    input_validity_clear_icon(remote_cfg_auth_basic_user)
    input_validity_clear_icon(remote_cfg_auth_basic_pass)
    input_validity_clear_icon(remote_cfg_auth_bearer_token)
  }

  let h = ''
  h += '<ul class="progressbar">'
  if (remote_cfg_use) {
    $('#remote_cfg-options').removeClass('hidden')
    for (let i = 0; i < 4; ++i) {
      h += '<li class="active"></li>'
    }
    for (let i = 4; i < 5; ++i) {
      h += '<li></li>'
    }
    $('#page-remote_cfg-button-continue').addClass('hidden')
  } else {
    $('#remote_cfg-options').addClass('hidden')
    for (let i = 0; i < 4; ++i) {
      h += '<li class="active"></li>'
    }
    for (let i = 4; i < 8; ++i) {
      h += '<li></li>'
    }
    $('#page-remote_cfg-button-continue').removeClass('hidden')
  }
  h += '</ul>'
  h += '\n'
  $('section#page-remote_cfg div.progressbar-container').html(h)

  let remote_cfg_auth_type = $('input[name=\'remote_cfg_auth_type\']:checked').val()
  if (remote_cfg_use_auth) {
    $('#conf-remote_cfg-auth-options').removeClass('hidden')
    if (remote_cfg_auth_type === undefined) {
      $(`input:radio[name='remote_cfg_auth_type'][value='remote_cfg_auth_type_basic']`).prop('checked', true)
      remote_cfg_auth_type = $('input[name=\'remote_cfg_auth_type\']:checked').val()
    }
    if (remote_cfg_auth_type === 'remote_cfg_auth_type_bearer') {
      $('#conf-remote_cfg-auth_bearer-options').removeClass('hidden')
      $('#conf-remote_cfg-auth_basic-options').addClass('hidden')
    } else {
      $('#conf-remote_cfg-auth_basic-options').removeClass('hidden')
      $('#conf-remote_cfg-auth_bearer-options').addClass('hidden')
    }
  } else {
    $('#conf-remote_cfg-auth-options').addClass('hidden')
  }

  let flag_valid_url = true
  let flag_valid_user = true
  let flag_valid_pass = true
  let flag_valid_token = true
  if (remote_cfg_use && base_url_val === '') {
    flag_valid_url = false
  }
  if (remote_cfg_use_auth) {
    if (remote_cfg_auth_type === 'remote_cfg_auth_type_bearer') {
      if (!flagUseSavedRemoteCfgAuthBearerToken && remote_cfg_auth_bearer_token.val() === '') {
        flag_valid_token = false
      }
    } else {
      if (remote_cfg_auth_basic_user.val() === '') {
        flag_valid_user = false
      }
      if (!input_password_is_saved(remote_cfg_auth_basic_pass) && remote_cfg_auth_basic_pass.val() === '') {
        flag_valid_pass = false
      }
    }
  }

  let flag_base_url_modified = false
  let flag_user_pass_modified = false
  let flag_token_modified = false
  if (remote_cfg_use && input_validity_is_validation_required(input_base_url)) {
    flag_base_url_modified = true
  }
  if (remote_cfg_use && remote_cfg_use_auth &&
    (input_validity_is_validation_required(remote_cfg_auth_basic_user) ||
      input_validity_is_validation_required(remote_cfg_auth_basic_pass))) {
    flag_user_pass_modified = true
  }
  if (remote_cfg_use && remote_cfg_use_auth && input_validity_is_validation_required(remote_cfg_auth_bearer_token)) {
    flag_token_modified = true
  }

  let remote_cfg_button_download = $('#remote_cfg-button-download')
  let remote_cfg_button_check = $('#remote_cfg-button-check')

  if (flag_base_url_modified || input_validity_is_invalid(input_base_url) ||
    flag_user_pass_modified || input_validity_is_invalid(remote_cfg_auth_basic_user) || input_validity_is_invalid(remote_cfg_auth_basic_pass) ||
    flag_token_modified || input_validity_is_invalid(remote_cfg_auth_bearer_token) ||
    !flag_valid_url || !flag_valid_user || !flag_valid_pass || !flag_valid_token) {

    remote_cfg_button_download.addClass('hidden')
    remote_cfg_button_check.removeClass('hidden')

    if (!flag_valid_url || !flag_valid_user || !flag_valid_pass || !flag_valid_token) {
      remote_cfg_button_check.addClass('disable-click')
      if (!flag_valid_url) {
        input_validity_set_invalid(input_base_url)
      }
      if (!flag_valid_user) {
        input_validity_set_invalid(remote_cfg_auth_basic_user)
      }
      if (!flag_valid_pass) {
        input_validity_set_invalid(remote_cfg_auth_basic_pass)
      }
      if (!flag_valid_token) {
        input_validity_set_invalid(remote_cfg_auth_bearer_token)
      }
    } else {
      remote_cfg_button_check.removeClass('disable-click')
    }
  } else {
    remote_cfg_button_check.addClass('hidden')
    remote_cfg_button_download.removeClass('hidden')
    remote_cfg_button_download.removeClass('disable-click')
  }
}

function on_custom_connection_type_changed () {
  let flag_need_to_check = false
  if ($('#use_http_ruuvi').prop('checked')) {
    $('#use_http').prop('disabled', true)
    $('#conf-settings-http').addClass('hidden')
    $('#http_url').val(HTTP_URL_DEFAULT)
    $('#http_user').val('')
    input_password_clear($('#http_pass'))
  } else {
    $('#use_http').prop('disabled', false)
  }
  if ($('#use_http').prop('checked')) {
    $('#conf-settings-http').removeClass('hidden')
    $('#use_http_ruuvi').prop('disabled', true)
  } else {
    $('#conf-settings-http').addClass('hidden')
    $('#use_http_ruuvi').prop('disabled', false)
  }

  if ($('#use_http_stat').prop('checked')) {
    $('#conf-settings-http_stat').removeClass('hidden')
    $('#http_stat_url').prop('disabled', false)
    $('#http_stat_user').prop('disabled', false)
    $('#http_stat_pass').prop('disabled', false)
  } else {
    $('#conf-settings-http_stat').addClass('hidden')
    $('#http_stat_url').prop('disabled', true)
    $('#http_stat_user').prop('disabled', true)
    $('#http_stat_pass').prop('disabled', true)
  }

  if ($('#use_mqtt').prop('checked')) {
    $('#conf-settings-mqtt').removeClass('hidden')
  } else {
    $('#conf-settings-mqtt').addClass('hidden')
  }
}

function on_custom_server_url_changed () {
  let flag_url_modified = false
  let http_url = $('#http_url')
  if ($('#use_http').prop('checked') && input_validity_is_validation_required(http_url)) {
    flag_url_modified = true
    input_validity_clear_icon(http_url)
    input_validity_clear_icon($('#http_user'))
    input_validity_clear_icon($('#http_pass'))
  }
  let http_stat_url = $('#http_stat_url')
  if ($('#use_http_stat').prop('checked') && input_validity_is_validation_required(http_stat_url)) {
    flag_url_modified = true
    input_validity_clear_icon(http_stat_url)
    input_validity_clear_icon($('#http_stat_user'))
    input_validity_clear_icon($('#http_stat_pass'))
  }
  let mqtt_server = $('#mqtt_server')
  if ($('#use_mqtt').prop('checked') && input_validity_is_validation_required(mqtt_server)) {
    flag_url_modified = true
    input_validity_clear_icon(mqtt_server)
    input_validity_clear_icon($('#mqtt_user'))
    input_validity_clear_icon($('#mqtt_pass'))
  }
  if (flag_url_modified || input_validity_is_invalid(http_url) || input_validity_is_invalid(http_stat_url) ||
    input_validity_is_invalid(mqtt_server)) {
    $('#page-custom_server-button-continue').addClass('hidden')
    $('#page-custom_server-button-check').removeClass('hidden')
  } else {
    $('#page-custom_server-button-check').addClass('hidden')
    $('#page-custom_server-button-continue').removeClass('hidden')
  }
}

function on_lan_auth_use_api_key_changed () {
  let lan_auth_api_key = $('#lan_auth-api_key')
  lan_auth_api_key.removeAttr('placeholder')
  if ($('#settings_lan_auth-use_api_key')[0].checked) {
    $('#settings_lan_auth-api_key').show()
    if (lan_auth_api_key.val() === '') {
      lan_auth_api_key.val(CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(CryptoJS.lib.WordArray.random(32))))
    }
  } else {
    $('#settings_lan_auth-api_key').hide()
    flagUseSavedLanAuthApiKey = false
  }
}

function on_lan_auth_use_api_key_rw_changed () {
  let lan_auth_api_key_rw = $('#lan_auth-api_key_rw')
  lan_auth_api_key_rw.removeAttr('placeholder')
  if ($('#settings_lan_auth-use_api_key_rw')[0].checked) {
    $('#settings_lan_auth-api_key_rw').show()
    if (lan_auth_api_key_rw.val() === '') {
      lan_auth_api_key_rw.val(CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(CryptoJS.lib.WordArray.random(32))))
    }
  } else {
    $('#settings_lan_auth-api_key_rw').hide()
    flagUseSavedLanAuthApiKeyRW = false
  }
}

function on_lan_auth_type_changed () {
  let lan_auth_type = $('input[name=\'lan_auth_type\']:checked').val()
  if (lan_auth_type === undefined) {
    $(`input:radio[name='lan_auth_type'][value='lan_auth_deny']`).prop('checked', true)
    lan_auth_type = $('input[name=\'lan_auth_type\']:checked').val()
  }
  $('#settings_lan_auth-use_api_key').attr('disabled', lan_auth_type === LAN_AUTH_TYPE.ALLOW)
  if (lan_auth_type === LAN_AUTH_TYPE.ALLOW) {
    $('#page-settings_lan_auth-advanced').hide()
  } else {
    $('#page-settings_lan_auth-advanced').show()
  }

  switch (lan_auth_type) {
    case LAN_AUTH_TYPE.ALLOW:
      $('#conf-lan_auth-login-password').slideUp()
      $('#conf-lan_auth-default').slideUp()
      $('#settings_lan_auth-use_api_key').prop('checked', false)
      $('#settings_lan_auth-use_api_key_rw').prop('checked', false)
      on_lan_auth_use_api_key_changed()
      on_lan_auth_use_api_key_rw_changed()
      break
    case LAN_AUTH_TYPE.DENY:
      $('#conf-lan_auth-login-password').slideUp()
      $('#conf-lan_auth-default').slideUp()
      break
    case LAN_AUTH_TYPE.DEFAULT:
      $('#conf-lan_auth-login-password').slideUp()
      $('#conf-lan_auth-default').slideDown()
      break
    case LAN_AUTH_TYPE.RUUVI:
    case LAN_AUTH_TYPE.BASIC:
    case LAN_AUTH_TYPE.DIGEST:
      $('#conf-lan_auth-default').slideUp()
      $('#conf-lan_auth-login-password').slideDown()
      break
  }
  on_lan_auth_user_pass_changed()
}

function on_lan_auth_user_pass_changed () {
  let lan_auth_type = $('input[name=\'lan_auth_type\']:checked').val()
  let flag_need_to_disable = false
  if (lan_auth_type !== LAN_AUTH_TYPE.ALLOW && lan_auth_type !== LAN_AUTH_TYPE.DENY &&
    lan_auth_type !== LAN_AUTH_TYPE.DEFAULT) {
    if ($('#lan_auth-user').val() === '' || ($('#lan_auth-pass').val() === '' && g_flag_lan_auth_pass_changed)) {
      flag_need_to_disable = true
    }
  }
  if ($('#settings_lan_auth-use_api_key')[0].checked) {
    let lan_auth_api_key = $('#lan_auth-api_key')
    if (lan_auth_api_key.val() === '' && !lan_auth_api_key.attr('placeholder')) {
      flag_need_to_disable = true
    }
  }
  if ($('#settings_lan_auth-use_api_key_rw')[0].checked) {
    let lan_auth_api_key_rw = $('#lan_auth-api_key_rw')
    if (lan_auth_api_key_rw.val() === '' && !lan_auth_api_key_rw.attr('placeholder')) {
      flag_need_to_disable = true
    }
  }
  if (flag_need_to_disable) {
    $('#page-lan_auth_type-button-continue').addClass('disable-click')
  } else {
    $('#page-lan_auth_type-button-continue').removeClass('disable-click')
  }
}

function on_ntp_config_changed () {
  let ntp_sync = $('input[name=\'ntp_sync\']:checked').val()
  if (ntp_sync === 'ntp_sync_default') {
    $('#ntp_server1').val(NTP_DEFAULT.SERVER1)
    $('#ntp_server2').val(NTP_DEFAULT.SERVER2)
    $('#ntp_server3').val(NTP_DEFAULT.SERVER3)
    $('#ntp_server4').val(NTP_DEFAULT.SERVER4)
    $('#page-ntp_config-custom_options').hide()
  } else if (ntp_sync === 'ntp_sync_custom') {
    $('#page-ntp_config-custom_options').show()
  } else if (ntp_sync === 'ntp_sync_dhcp' || ntp_sync === 'ntp_sync_disabled') {
    $('#ntp_server1').val('')
    $('#ntp_server2').val('')
    $('#ntp_server3').val('')
    $('#ntp_server4').val('')
    $('#page-ntp_config-custom_options').hide()
  }
}

function on_cloud_options_connection_type_changed () {
  let connection_type = $('input[name=\'connection_type\']:checked').val()
  let h = ''
  h += '<ul class="progressbar">'
  if (connection_type === 'ruuvi') {
    for (let i = 0; i < 7; ++i) {
      h += '<li class="active"></li>'
    }
    h += '<li></li>'

    $('#use_http_ruuvi').prop('checked', true)
    $('#use_http').prop('checked', false)
    $('#use_http').prop('disabled', true)
    $('#http_url').val(HTTP_URL_DEFAULT)
    $('#http_user').val('')
    input_password_clear($('#http_pass'))

    $('#use_http_stat_ruuvi').prop('checked', true)
    $('#http_stat_url').val(HTTP_STAT_URL_DEFAULT)
    $('#http_stat_user').val('')
    input_password_clear($('#http_stat_pass'))

    $('#use_mqtt').prop('checked', false)
    $('#mqtt_server').val(MQTT_SERVER_DEFAULT)
    $('#mqtt_port').val(MQTT_PORT_DEFAULT)
    $('#mqtt_user').val('')
    input_password_clear($('#mqtt_pass'))

    $(`input:radio[name='company_use_filtering'][value='1']`).prop('checked', true)
    on_settings_scan_filtering_changed()
  } else {
    for (let i = 0; i < 7; ++i) {
      h += '<li class="active"></li>'
    }
    for (let i = 8; i < 12; ++i) {
      h += '<li></li>'
    }
  }
  h += '</ul>'
  h += '\n'
  $('section#page-cloud_options div.progressbar-container').html(h)
}

function on_settings_scan_filtering_changed () {
  let filtering = $('input[name=\'company_use_filtering\']:checked').val()
  if (filtering === '0') {
    $('#page-scanning-all_nearby_beacons-scanning_options').slideDown()
  } else if (filtering === '1') {
    $('#page-scanning-all_nearby_beacons-scanning_options').slideUp()
    $('#scan_coded_phy')[0].checked = false
    $('#scan_1mbit_phy')[0].checked = true
    $('#scan_extended_payload')[0].checked = true
    $('#scan_channel_37')[0].checked = true
    $('#scan_channel_38')[0].checked = true
    $('#scan_channel_39')[0].checked = true
  } else if (filtering === '2') {
    $('#page-scanning-all_nearby_beacons-scanning_options').slideUp()
    $('#scan_coded_phy')[0].checked = true
    $('#scan_1mbit_phy')[0].checked = true
    $('#scan_extended_payload')[0].checked = true
    $('#scan_channel_37')[0].checked = true
    $('#scan_channel_38')[0].checked = true
    $('#scan_channel_39')[0].checked = true
  }
}

function checkWiFiSSIDAndPassword () {
  let ssid = $('#manual_ssid').val()
  let input_pwd = $('input#pwd')
  let pwd = input_pwd.val()
  let selected_wifi_radio_button = $('input[name="wifi-name"]:checked')
  if (!selected_wifi_radio_button || !selected_wifi_radio_button[0]) {
    return false
  }
  if (!ssid) {
    return false
  }
  if (selected_wifi_radio_button[0].id === 'page-wifi_connection-radio-connect_manually') {
    return true
  } else {
    if (input_password_is_saved(input_pwd)) {
      return true
    }
    if (selected_wifi_radio_button.hasClass('no_auth')) {
      return true
    } else {
      if (pwd.length >= 8) {
        return true
      }
    }
  }
}

function checkAndUpdatePageWiFiListButtonNext () {
  if (flagWaitingNetworkConnection) {
    return
  }
  let wifi_conn_button_continue = $('#page-wifi_connection-button-continue')
  if (checkWiFiSSIDAndPassword()) {
    if (wifi_conn_button_continue.hasClass('disable-click')) {
      console.log(log_wrap('page-wifi_connection-button-continue: add class \'disable-click\''))
      wifi_conn_button_continue.removeClass('disable-click')
    }
  } else {
    if (!wifi_conn_button_continue.hasClass('disable-click')) {
      console.log(log_wrap('page-wifi_connection-button-continue: remove class \'disable-click\''))
      wifi_conn_button_continue.addClass('disable-click')
    }
  }
}

function on_auto_update_cycle_changed () {
  let auto_update_cycle = $('input[name=\'auto_update_cycle\']:checked').val()
  if (auto_update_cycle === undefined) {
    $(`input:radio[name='auto_update_cycle'][value='auto_update_cycle-regular']`).prop('checked', true)
    auto_update_cycle = $('input[name=\'auto_update_cycle\']:checked').val()
  }
  if (auto_update_cycle === 'auto_update_cycle-regular') {
    $('#conf-auto_update_schedule').slideDown()
  } else if (auto_update_cycle === 'auto_update_cycle-beta') {
    $('#conf-auto_update_schedule').slideDown()
  } else if (auto_update_cycle === 'auto_update_cycle-manual') {
    $('#conf-auto_update_schedule').slideUp()
  }
}

function on_edit_automatic_update_settings () {
  let auto_update_cycle = $('input[name=\'auto_update_cycle\']:checked').val()
  if (auto_update_cycle === 'auto_update_cycle-manual') {
    $('#page-update_schedule-button-continue').removeClass('disable-click')
  } else {
    let flag_button_continue_enabled = true
    let auto_update_weekdays_bitmask = 0
    if ($('#conf-auto_update_schedule-button-monday').is(':checked')) {
      auto_update_weekdays_bitmask |= 0x01
    }
    if ($('#conf-auto_update_schedule-button-tuesday').is(':checked')) {
      auto_update_weekdays_bitmask |= 0x02
    }
    if ($('#conf-auto_update_schedule-button-wednesday').is(':checked')) {
      auto_update_weekdays_bitmask |= 0x04
    }
    if ($('#conf-auto_update_schedule-button-thursday').is(':checked')) {
      auto_update_weekdays_bitmask |= 0x08
    }
    if ($('#conf-auto_update_schedule-button-friday').is(':checked')) {
      auto_update_weekdays_bitmask |= 0x10
    }
    if ($('#conf-auto_update_schedule-button-saturday').is(':checked')) {
      auto_update_weekdays_bitmask |= 0x20
    }
    if ($('#conf-auto_update_schedule-button-sunday').is(':checked')) {
      auto_update_weekdays_bitmask |= 0x40
    }

    if (auto_update_weekdays_bitmask === 0) {
      flag_button_continue_enabled = false
    }

    if (flag_button_continue_enabled) {
      $('#page-update_schedule-button-continue').removeClass('disable-click')
    } else {
      $('#page-update_schedule-button-continue').addClass('disable-click')
    }
  }
}

function input_validity_is_invalid (input_elem) {
  if (input_elem === undefined) {
    return false
  }
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  if (input_with_validity_check_icon.hasClass('input-invalid')) {
    return true
  }
  return false
}

function input_validity_has_checked (input_elem) {
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  if (input_with_validity_check_icon.hasClass('input-invalid')) {
    return true
  }
  if (input_with_validity_check_icon.hasClass('input-valid')) {
    return true
  }
  return false
}

function input_validity_clear_icon (input_elem) {
  if (input_elem === undefined) {
    return
  }
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  input_with_validity_check_icon.removeClass('input-checking')
  input_with_validity_check_icon.removeClass('input-valid')
  input_with_validity_check_icon.removeClass('input-invalid')
}

function input_validity_is_validation_required (input_elem) {
  if (input_elem === undefined) {
    return false
  }
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  return input_with_validity_check_icon.hasClass('input-validation_required')
}

function input_validity_set_validation_required (input_elem) {
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  input_with_validity_check_icon.addClass('input-validation_required')
}

function input_validity_clear_validation_required (input_elem) {
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  input_with_validity_check_icon.removeClass('input-validation_required')
}

function input_validity_set_valid (input_elem) {
  if (input_elem === undefined) {
    return
  }
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  input_validity_clear_icon(input_elem)
  input_with_validity_check_icon.removeClass('input-validation_required')
  input_with_validity_check_icon.addClass('input-valid')
}

function input_validity_set_invalid (input_elem) {
  if (input_elem === undefined) {
    return
  }
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  input_validity_clear_icon(input_elem)
  input_with_validity_check_icon.removeClass('input-validation_required')
  input_with_validity_check_icon.addClass('input-invalid')
}

function input_validity_set_checking (input_elem) {
  if (input_elem === undefined) {
    return
  }
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  input_validity_clear_icon(input_elem)
  input_with_validity_check_icon.addClass('input-checking')
}

function input_validity_check_by_regex (input_elem, reg_ex, flag_allow_empty) {
  let input_with_validity_check_icon = input_elem.parent().children('.input-with_validity_check-icon')
  if (reg_ex.test(input_elem.val()) || (flag_allow_empty && input_elem.val() === '')) {
    input_validity_set_valid(input_elem)
    return true
  } else {
    input_validity_set_invalid(input_elem)
    return false
  }
}

function ethernet_connection_check_validity () {
  let flag_all_fields_valid = true
  if (!$('#eth_dhcp')[0].checked) {
    const ip_addr_check = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/
    {
      if (!input_validity_check_by_regex($('#eth_static_ip'), ip_addr_check, false)) {
        flag_all_fields_valid = false
      }
      if (!input_validity_check_by_regex($('#eth_netmask'), ip_addr_check, false)) {
        flag_all_fields_valid = false
      }
      if (!input_validity_check_by_regex($('#eth_gw'), ip_addr_check, false)) {
        flag_all_fields_valid = false
      }
      if (!input_validity_check_by_regex($('#eth_dns1'), ip_addr_check, false)) {
        flag_all_fields_valid = false
      }
      if (!input_validity_check_by_regex($('#eth_dns2'), ip_addr_check, true)) {
        flag_all_fields_valid = false
      }
    }
  }
  let button_continue = $('#page-ethernet_connection-button-continue')
  if (flag_all_fields_valid) {
    button_continue.removeClass('disable-click')
  } else {
    button_continue.addClass('disable-click')
  }
}

$(document).ready(function () {
  console.log(log_wrap('code.js: Ready'))
  window.onpopstate = function (event) {
    console.log(log_wrap('window.onpopstate: ' + document.location.hash + ', current_page: ' + g_current_page))
    let url = window.location.hash.substring(1)
    if (url.startsWith('popup-')) {
      return
    }
    if (g_current_page) {
      $(g_current_page).hide()
      $(g_current_page).trigger('onHide')
    }
    g_current_page = '#' + url
    $(g_current_page).show()
    $(g_current_page).trigger('onShow')

    setTimeout(function () {
      window.scrollTo(0, 0)
    }, 1)

    if (document.location.hash === '#page-finished') {
      // Prevent the user from leaving this page by pressing the Back button
      window.history.pushState(null, '', '#page-finished')
    }
  }

  window.addEventListener('online', function (event) {
    console.log(log_wrap('Became online, is_online=' + window.navigator.onLine))
  }, false)

  window.addEventListener('offline', function (event) {
    console.log(log_wrap('Became offline, is_online=' + window.navigator.onLine))
  }, false)

  // Set initial hash to help back button navigation
  console.log(log_wrap('Open: page-welcome'))
  window.location.hash = null
  window.location.hash = 'page-welcome'

  function on_switch_language (lang) {
    $('p[lang], span[lang]').each(function () {
      if ($(this).attr('lang') === lang)
        $(this).fadeIn()
      else
        $(this).hide()
      if (lang === 'en') {
        $('input#mqtt_client_id').attr('placeholder', 'MAC-address is used if empty')
      } else if (lang === 'fi') {
        $('input#mqtt_client_id').attr('placeholder', 'MAC-osoitetta käytetään, jos se on tyhjä')
      }
    })
  }

  $('#language-switcher-en').click(function (e) {
    $('div#language-switcher > ul > li > a').removeClass('language-switcher-active')
    $(this).addClass('language-switcher-active')
    on_switch_language('en')
  })

  $('#language-switcher-fi').click(function (e) {
    $('div#language-switcher > ul > li > a').removeClass('language-switcher-active')
    $(this).addClass('language-switcher-active')
    on_switch_language('fi')
  })

  $('.input-password-eye').click(function (e) {
    if ($(this).hasClass('disabled')) {
      return
    }
    let password_field = $(this).parent().children('input')
    const flag_hidden = password_field.attr('type') === 'password'
    if (flag_hidden) {
      $(this).children('.eye').addClass('hidden')
      $(this).children('.eye-slash').removeClass('hidden')
      password_field.attr('type', 'text')
    } else {
      $(this).children('.eye-slash').addClass('hidden')
      $(this).children('.eye').removeClass('hidden')
      password_field.attr('type', 'password')
    }
  })

  // ==== page-welcome ===============================================================================================
  $('section#page-welcome').bind('onShow', function () {
    console.log(log_wrap('section#page-welcome: onShow'))
    let progressbar = $('#progressbar')
    progressbar.css('top', $('section#page-welcome div.progressbar-container').position().top)
    progressbar.show()
  })

  $('section#page-welcome').bind('onHide', function () {
    console.log(log_wrap('section#page-welcome: onHide'))
  })

  $('#page-welcome-button-get-started').click(function (e) {
    e.preventDefault()
    change_page_to_network_type()
  })

  // ==== page-network_type ==========================================================================================
  $('section#page-network_type').bind('onShow', function () {
    console.log(log_wrap('section#page-network_type: onShow'))
    if (g_flagAccessFromLAN) {
      $('section#page-network_type input[type=radio][name=network_type]').prop('disabled', true)
      $('#page-network_type-access_from_lan').show()
      $('#page-network_type-button-continue').hide()
      $('#page-network_type-button-skip').show()
    } else {
      $('section#page-network_type input[type=radio][name=network_type]').prop('disabled', false)
      $('#page-network_type-access_from_lan').hide()
      $('#page-network_type-button-skip').hide()
      $('#page-network_type-button-continue').show()
    }
  })

  $('section#page-network_type').bind('onHide', function () {
    console.log(log_wrap('section#page-network_type: onHide'))
  })

  $('section#page-network_type #page-network_type-button-continue').click(function (e) {
    e.preventDefault()
    let network_type = $('input[name=\'network_type\']:checked').val()
    if (network_type === 'wifi') {
      change_page_to_wifi_connection()
    } else {
      change_page_to_ethernet_connection()
    }
  })

  $('section#page-network_type #page-network_type-button-skip').click(function (e) {
    e.preventDefault()
    change_page_to_software_update()
  })

  // ==== page-ethernet_connection ===================================================================================
  $('section#page-ethernet_connection').bind('onShow', function () {
    if (!$('#eth_dhcp')[0].checked) {
      $('#page-ethernet_connection-section-manual_settings').slideDown()
    }
    ethernet_connection_check_validity()
    networkDisconnect()
  })

  $('section#page-ethernet_connection').bind('onHide', function () {
    $('#page-ethernet_connection-ask_user').hide()
    $('#page-ethernet_connection-no_cable').hide()
    $('#page-ethernet_connection-button-continue').removeClass('disable-click')
    if (g_page_ethernet_connection_timer) {
      clearTimeout(g_page_ethernet_connection_timer)
      g_page_ethernet_connection_timer = null
    }
  })

  $('section#page-ethernet_connection #eth_dhcp').change(function (e) {
    if ($('#eth_dhcp')[0].checked) {
      $('#page-ethernet_connection-section-manual_settings').slideUp()
    } else {
      $('#page-ethernet_connection-section-manual_settings').slideDown()
    }
    ethernet_connection_check_validity()
  })

  $('#eth_static_ip').on('input change', function () {
    ethernet_connection_check_validity()
  })

  $('#eth_netmask').on('input change', function () {
    ethernet_connection_check_validity()
  })

  $('#eth_gw').on('input change', function () {
    ethernet_connection_check_validity()
  })

  $('#eth_dns1').on('input change', function () {
    ethernet_connection_check_validity()
  })

  $('#eth_dns2').on('input change', function () {
    ethernet_connection_check_validity()
  })

  $('section#page-ethernet_connection #page-ethernet_connection-button-continue').click(function (e) {
    e.preventDefault()
    $('#page-ethernet_connection-ask_user').show()
    $('#page-ethernet_connection-button-continue').addClass('disable-click')
    bodyClassLoadingAdd()
    flagWaitingNetworkConnection = true
    g_page_ethernet_connection_timer = setTimeout(function () {
      g_page_ethernet_connection_timer = null
      if (document.location.hash === '#page-ethernet_connection') {
        let body = $('body')
        if (body.hasClass('is-loading')) {
          flagWaitingNetworkConnection = false
          $('#page-ethernet_connection-ask_user').hide()
          $('#page-ethernet_connection-no_cable').show()
          bodyClassLoadingRemove()
        }
      }
    }, 15 * 1000)

    let wifi_channel = 1
    save_network_config(
      wifi_channel,
      function () {
        networkConnect(null, null)
      },
      function () {
        bodyClassLoadingRemove()
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus()
      })
  })

  $('section#page-ethernet_connection #page-ethernet_connection-button-back').click(function (e) {
    e.preventDefault()
  })

  // ==== page-wifi_connection =======================================================================================
  $('section#page-wifi_connection').bind('onShow', function () {
    console.log(log_wrap('page-wifi_connection: onShow'))
    bodyClassLoadingAdd()
    checkAndUpdatePageWiFiListButtonNext()
    let input_pwd = $('input#pwd')
    input_password_set_use_saved(input_pwd)
    input_password_on_open_page(input_pwd)
    $('#page-wifi_connection-ssid_password').hide()
    networkDisconnect()
    g_refresh_ap_flag_initial = true
    startRefreshAP()
  })

  $('#wifi_connection-sort_order-by_name').click(function (e) {
    $('div#wifi_connection-sort_order > ul > li > a').removeClass('language-switcher-active')
    $(this).addClass('language-switcher-active')
    g_wifi_sort_by_rssi = false
    refreshAPHTML(apList)
  })

  $('#wifi_connection-sort_order-by_rssi').click(function (e) {
    $('div#wifi_connection-sort_order > ul > li > a').removeClass('language-switcher-active')
    $(this).addClass('language-switcher-active')
    g_wifi_sort_by_rssi = true
    refreshAPHTML(apList)
  })

  $('section#page-wifi_connection').bind('onHide', function () {
    console.log(log_wrap('page-wifi_connection: onHide'))
    $('#page-wifi_connection-button-continue').removeClass('disable-click')
    $('#page-wifi_connection-ssid_password').hide()
    $('#page-wifi_connection-list_of_ssid').html('')
    stopRefreshAP()
  })

  $('section#page-wifi_connection input#manual_ssid').on('keyup click', function () {
    $('#wifi-connection-status-block').hide()
    updatePositionOfWiFiPasswordInput()
    checkAndUpdatePageWiFiListButtonNext()
  })

  $('section#page-wifi_connection input#pwd').on('keyup click', function () {
    input_password_clear_saved($('input#pwd'))
    $('#wifi-connection-status-block').hide()
    updatePositionOfWiFiPasswordInput()
    checkAndUpdatePageWiFiListButtonNext()
  })

  $('section#page-wifi_connection input#page-wifi_connection-radio-connect_manually').change(function (e) {
    $('.wifi_password').css('height', 0)
    $('#input_ssid_block').show()
    $('#input_password_block').show()
    $('#input_password_block-password').show()
    $('#wifi-connection-status-block').hide()
    let div_page_wifi_list_ssid_password = $('#page-wifi_connection-ssid_password')
    let div_ssid_password_wrap = $('#page-wifi_connection-ssid_password-wrap')
    let wifi_password_position = div_ssid_password_wrap.position()
    div_ssid_password_wrap.css('height', div_page_wifi_list_ssid_password.height())
    div_page_wifi_list_ssid_password.css('top', wifi_password_position.top)
    div_page_wifi_list_ssid_password.show()
    $('#manual_ssid').val('')
    $('#pwd').val('')
    updatePositionOfWiFiPasswordInput()
    checkAndUpdatePageWiFiListButtonNext()
    $('input[name=\'wifi-name\']').parent().removeClass('mouse-cursor-default')
    $('#page-wifi_connection-radio-connect_manually').parent().addClass('mouse-cursor-default')
  })

  $('#page-wifi_connection-advanced-button').click(function (e) {
    if ($(this).children('div.btn-dropdown-arrow-down').is(':hidden')) {
      $('section#page-wifi_connection input[type="radio"][name="wifi-name"]').prop('checked', false)
      $('#page-wifi_connection-ssid_password').hide()
    }
  })

  $('section#page-wifi_connection #page-wifi_connection-button-continue').click(function (e) {
    e.preventDefault()
    let selected_wifi_radio_button = $('input[name="wifi-name"]:checked')
    let ssid = ''
    let isAuthNeeded = true
    let wifi_channel = 1
    if (selected_wifi_radio_button[0] && (selected_wifi_radio_button[0].id === 'page-wifi_connection-radio-connect_manually')) {
      ssid = $('#manual_ssid').val()
    } else {
      ssid = selected_wifi_radio_button.val()
      isAuthNeeded = !selected_wifi_radio_button.hasClass('no_auth')
      if (selected_wifi_radio_button.hasClass('wifi_chan_1')) {
        wifi_channel = 1
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_2')) {
        wifi_channel = 2
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_3')) {
        wifi_channel = 3
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_4')) {
        wifi_channel = 4
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_5')) {
        wifi_channel = 5
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_6')) {
        wifi_channel = 6
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_7')) {
        wifi_channel = 7
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_8')) {
        wifi_channel = 8
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_9')) {
        wifi_channel = 9
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_10')) {
        wifi_channel = 10
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_11')) {
        wifi_channel = 11
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_12')) {
        wifi_channel = 12
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_13')) {
        wifi_channel = 13
      } else if (selected_wifi_radio_button.hasClass('wifi_chan_14')) {
        wifi_channel = 14
      }
    }

    let input_pwd = $('#pwd')
    let password = (input_password_is_saved(input_pwd) || !isAuthNeeded) ? null : input_pwd.val()
    $('#page-wifi_connection-button-continue').addClass('disable-click')
    bodyClassLoadingAdd()
    $('#wifi-connection-status-block').hide()
    updatePositionOfWiFiPasswordInput()
    flagWaitingNetworkConnection = true
    save_network_config(
      wifi_channel,
      function () {
        networkConnect(ssid, password)
      },
      function () {
        console.log(log_wrap('save_network_config: failure'))
        flagWaitingNetworkConnection = false
        $('#wifi-connection-status-block').show()
        updatePositionOfWiFiPasswordInput()
        bodyClassLoadingRemove()
        $('#page-wifi_connection-button-continue').removeClass('disable-click')
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus()
        startRefreshAP()
      }
    )
  })

  $('#page-wifi_connection-button-back').click(function (e) {
    e.preventDefault()
  })

  // ==== page-software_update =======================================================================================
  $('section#page-software_update').bind('onShow', function () {
    $('#software_update-set-url-manually').prop('checked', false)
    software_update_on_change_url()
    on_show_software_update()
  })

  $('section#page-software_update').bind('onHide', function () {
    software_update_on_change_url()
    console.log(log_wrap('section#page-software_update: onHide'))
  })

  function is_valid_http_url (str_val) {
    let url
    if (str_val.indexOf('://') === -1) {
      str_val = 'http://' + str_val
    }
    try {
      url = new URL(str_val)
    } catch (_) {
      return false
    }
    return url.protocol === 'http:' || url.protocol === 'https:'
  }

  function software_update_on_change_url () {
    let software_update_url = $('#software_update-url')
    let software_update_button_upgrade = $('#software_update-button-upgrade')
    $('#page-software_update-status-error').addClass('hidden')
    if ($('#software_update-set-url-manually')[0].checked) {
      if (is_valid_http_url(software_update_url.val())) {
        input_validity_clear_icon(software_update_url)
        software_update_button_upgrade.removeClass('disable-click')
      } else {
        input_validity_set_invalid(software_update_url)
        software_update_button_upgrade.addClass('disable-click')
      }
      $('#page-software_update-version_info').hide()
      $('#page-software_update-status').hide()
      software_update_url.show()
      $('#page-software_update-button-continue').addClass('hidden')
    } else {
      if ($('#software_update-version-latest').text() !== '') {
        let latest_release_version = $('#software_update-version-latest').text()
        software_update_url.val(firmwareUpdatingBaseURL + latest_release_version)
      }
      input_validity_clear_icon(software_update_url)
      software_update_url.hide()
      $('#page-software_update-version_info').show()
      $('#page-software_update-status').show()
      $('#page-software_update-button-continue').removeClass('hidden')
      if (!flagLatestFirmwareVersionSupported) {
        software_update_button_upgrade.addClass('disable-click')
      }
    }
  }

  $('section#page-software_update #software_update-url').on('input change', function () {
    software_update_on_change_url()
  })

  $('section#page-software_update #software_update-button-upgrade').click(function (e) {
    e.preventDefault()
    $('#page-software_update-status-error').addClass('hidden')
    let input_software_update_url = $('#software_update-url')
    let software_update_button_upgrade = $('#software_update-button-upgrade')

    let software_update_url_val = input_software_update_url.val()
    if (software_update_url_val.indexOf('://') === -1) {
      software_update_url_val = 'http://' + software_update_url_val
    }
    if (!software_update_url_val.endsWith('/')) {
      software_update_url_val += '/'
    }
    if (software_update_url_val !== input_software_update_url.val()) {
      input_software_update_url.val(software_update_url_val)
    }
    if (!is_valid_http_url(software_update_url_val)) {
      input_validity_set_invalid(software_update_url_val)
      software_update_button_upgrade.addClass('disable-click')
      return
    }
    bodyClassLoadingAdd()
    stopCheckStatus()
    $.ajax({
        method: 'POST',
        url: '/fw_update.json',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        cache: false,
        data: JSON.stringify({ 'url': software_update_url_val }),
        success: function (data, text) {
          let status = data['status']
          let message = data['message']
          if (message === undefined) {
            message = ''
          }
          if (status === 200) {
            change_url_software_update_progress()
          } else {
            $('#page-software_update-status-error-desc').text('Status: ' + status + ', Message: ' + message)
            $('#page-software_update-status-error').removeClass('hidden')
          }
          bodyClassLoadingRemove()
          startCheckStatus()
        },
        error: function (request, status, error) {
          console.log(log_wrap('POST /fw_update.json: failure' +
            ', status=' + status +
            ', error=' + error))
          $('#page-software_update-status-error-desc').text('Status: ' + status + ', Error: ' + error)
          $('#page-software_update-status-error').removeClass('hidden')
          bodyClassLoadingRemove()
          startCheckStatus()
        }
      }
    )
  })

  $('section#page-software_update #software_update-set-url-manually').change(function (e) {
    software_update_on_change_url()
  })

  $('section#page-software_update #page-software_update-button-continue').click(function (e) {
    e.preventDefault()
    change_page_to_remote_cfg()
  })

  $('section#page-software_update #page-software_update-button-back').click(function (e) {
    e.preventDefault()
  })

  // ==== page-software_update_progress ==============================================================================

  $('section#page-software_update_progress').bind('onShow', function () {
    $('#page-software_update_progress-info').removeClass('hidden')
    $('#software_update_progress-status-completed_successfully').addClass('hidden')
    $('#software_update_progress-status-completed_unsuccessfully').addClass('hidden')
    $('#page-software_update_progress-button_container-configure').addClass('hidden')
  })

  $('section#page-software_update_progress #page-software_update_progress-button-configure').click(function (e) {
    e.preventDefault()
    $.ajax({
        method: 'POST',
        url: '/fw_update_reset',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        cache: false,
        data: JSON.stringify({}),
        success: function (data, text) {
          change_page_to_network_type()
        },
        error: function (request, status, error) {
          // ('HTTP error: ' + status + ', ' + 'Status: ' + request.status + '(' + request.statusText + ')' + ', ' + request.responseText);
          console.log(log_wrap('POST /fw_update_reset: failure' +
            ', status=' + status +
            ', error=' + error))
        }
      }
    )
  })

  // ==== page-remote_cfg ============================================================================================
  $('section#page-remote_cfg').bind('onShow', function () {
    if ($('#remote_cfg-use').prop('checked')) {
      dropdownShow('#page-remote_cfg-advanced-dropdown')
    } else {
      dropdownHide('#page-remote_cfg-advanced-dropdown')
    }

    input_password_on_open_page($('input#remote_cfg-auth_basic-password'))

    on_remote_cfg_changed()
  })

  $('#remote_cfg-base_url').on('input change', function () {
    let remote_cfg_base_url = $('#remote_cfg-base_url')
    input_validity_set_validation_required(remote_cfg_base_url)
    input_validity_clear_icon(remote_cfg_base_url)
    on_remote_cfg_changed()
  })

  $('#remote_cfg-auth_basic-user').on('input change', function () {
    input_password_clear_saved($('#remote_cfg-auth_basic-password'))
    input_validity_set_validation_required($('#remote_cfg-auth_basic-user'))
    input_validity_set_validation_required($('#remote_cfg-base_url'))
    on_remote_cfg_changed()
  })

  $('#remote_cfg-auth_basic-password').on('input change', function () {
    let input_remote_cfg_auth_basic_password = $('#remote_cfg-auth_basic-password')
    input_password_clear_saved(input_remote_cfg_auth_basic_password)
    input_validity_set_validation_required(input_remote_cfg_auth_basic_password)
    input_validity_set_validation_required($('#remote_cfg-base_url'))
    on_remote_cfg_changed()
  })

  $('#remote_cfg-auth_bearer-token').on('input change', function () {
    let input_bearer_token = $('#remote_cfg-auth_bearer-token')
    input_bearer_token.removeAttr('placeholder')
    input_validity_set_validation_required(input_bearer_token)
    input_validity_set_validation_required($('#remote_cfg-base_url'))
    on_remote_cfg_changed()
  })

  $('section#page-remote_cfg input#remote_cfg-use').change(function (e) {
    input_validity_set_validation_required($('#remote_cfg-base_url'))
    on_remote_cfg_changed()
  })

  $('section#page-remote_cfg input#remote_cfg-use_auth').change(function (e) {
    input_validity_set_validation_required($('#remote_cfg-base_url'))
    on_remote_cfg_changed()
  })

  $('section#page-remote_cfg input#remote_cfg_auth_type_basic').change(function (e) {
    input_validity_set_validation_required($('#remote_cfg-base_url'))
    on_remote_cfg_changed()
  })

  $('section#page-remote_cfg input#remote_cfg_auth_type_bearer').change(function (e) {
    input_validity_set_validation_required($('#remote_cfg-base_url'))
    on_remote_cfg_changed()
  })

  $('section#page-remote_cfg #page-remote_cfg-button-continue').click(function (e) {
    e.preventDefault()
    change_page_to_update_schedule()
  })

  function remote_cfg_validate_url () {
    bodyClassLoadingAdd()
    stopCheckStatus()

    let remote_cfg_base_url = $('#remote_cfg-base_url')
    let input_user = undefined
    let input_password = undefined
    let aux_params = '&auth_type='
    if ($('#remote_cfg-use_auth').prop('checked')) {
      if ($('#remote_cfg_auth_type_basic').prop('checked')) {
        aux_params += 'basic'
        input_user = $('#remote_cfg-auth_basic-user')
        input_password = $('#remote_cfg-auth_basic-password')
      } else {
        aux_params += 'bearer'
        input_password = $('#remote_cfg-auth_bearer-token')
      }
    } else {
      aux_params += 'none'
    }
    $('#page-remote_cfg-status-error').addClass('hidden')

    if (!validate_url(
      function (err_message) {
        if (err_message) {
          $('#page-remote_cfg-status-error-desc').text(err_message)
          $('#page-remote_cfg-status-error').removeClass('hidden')
        }
        on_remote_cfg_changed()
        bodyClassLoadingRemove()
        startCheckStatus()
      },
      remote_cfg_base_url, remote_cfg_base_url.val(), input_user, input_password, 'check_remote_cfg', aux_params)) {
      bodyClassLoadingRemove()
      startCheckStatus()
    }
  }

  $('section#page-remote_cfg #remote_cfg-button-check').click(function (e) {
    e.preventDefault()
    let input_base_url = $('#remote_cfg-base_url')
    let remote_cfg_auth_basic_user = $('#remote_cfg-auth_basic-user')
    let remote_cfg_auth_basic_pass = $('#remote_cfg-auth_basic-password')
    let remote_cfg_auth_bearer_token = $('#remote_cfg-auth_bearer-token')

    let base_url_val = input_base_url.val()
    if (!base_url_val.startsWith('http://') && !base_url_val.startsWith('https://')) {
      base_url_val = 'https://' + base_url_val
      input_base_url.val(base_url_val)
    }

    input_validity_clear_icon(input_base_url)
    input_validity_clear_icon(remote_cfg_auth_basic_user)
    input_validity_clear_icon(remote_cfg_auth_basic_pass)
    input_validity_clear_icon(remote_cfg_auth_bearer_token)
    input_validity_set_validation_required(input_base_url)

    remote_cfg_validate_url()
  })

  $('section#page-remote_cfg #remote_cfg-button-download').click(function (e) {
    e.preventDefault()
    bodyClassLoadingAdd()
    $('#page-remote_cfg-status-error').addClass('hidden')
    $('#remote_cfg-button-download').addClass('disable-click')
    save_config()
    stopCheckStatus()
    $.ajax({
        method: 'POST',
        url: '/gw_cfg_download',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        cache: false,
        success: function (data, text) {
          let status = data['status']
          let message = data['message']
          if (message === undefined) {
            message = ''
          }
          if (status === 200) {
            $('#remote_cfg-button-download').removeClass('disable-click')
            change_page_to_finished(5)
          } else {
            console.log(log_wrap('POST /gw_cfg_download: failure' +
              ', status=' + status +
              ', message=' + message))
            let desc = 'Status=' + status + ': ' + message
            $('#remote_cfg-button-download').removeClass('disable-click')
            $('#page-remote_cfg-status-error-desc').text(desc)
            $('#page-remote_cfg-status-error').removeClass('hidden')
            startCheckStatus()
          }
          bodyClassLoadingRemove()
        },
        error: function (request, status, error) {
          console.log(log_wrap('POST /gw_cfg_download: failure' +
            ', status=' + status +
            ', error=' + error))
          let desc = 'Status: ' + request.status + ' (' + request.statusText + ')'
          if (request.responseText) {
            desc += '\nResponse: ' + request.responseText
          }
          $('#remote_cfg-button-download').removeClass('disable-click')
          $('#page-remote_cfg-status-error-desc').text(desc)
          $('#page-remote_cfg-status-error').removeClass('hidden')
          startCheckStatus()
          bodyClassLoadingRemove()
        }
      }
    )
  })

  // ==== page-update_schedule =======================================================================================
  $('section#page-update_schedule').bind('onShow', function () {
    $('#page-update_schedule div.btn-dropdown-arrow-up').hide()
    $('#page-update_schedule div.btn-dropdown-arrow-down').show()
    let auto_update_cycle = $('input[name=\'auto_update_cycle\']:checked').val()
    if (auto_update_cycle !== 'auto_update_cycle-regular' ||
      !$('#conf-auto_update_schedule-button-sunday').prop('checked') ||
      !$('#conf-auto_update_schedule-button-monday').prop('checked') ||
      !$('#conf-auto_update_schedule-button-tuesday').prop('checked') ||
      !$('#conf-auto_update_schedule-button-wednesday').prop('checked') ||
      !$('#conf-auto_update_schedule-button-thursday').prop('checked') ||
      !$('#conf-auto_update_schedule-button-friday').prop('checked') ||
      !$('#conf-auto_update_schedule-button-saturday').prop('checked') ||
      $('#conf-auto_update_schedule-period_from').val() !== '0' ||
      $('#conf-auto_update_schedule-period_to').val() !== '24') {
      dropdownShow('#page-update_schedule-advanced-dropdown')
    } else {
      dropdownHide('#page-update_schedule-advanced-dropdown')
    }
    on_auto_update_cycle_changed()
    on_edit_automatic_update_settings()
  })

  $('section#page-update_schedule input[name=\'auto_update_cycle\']').change(function (e) {
    on_auto_update_cycle_changed()
    on_edit_automatic_update_settings()
  })

  $('section#page-update_schedule .checkbox-weekday').change(function () {
    on_edit_automatic_update_settings()
  })

  $('#conf-auto_update_schedule-period_from').change(function () {
    let auto_update_interval_from = parseInt($('#conf-auto_update_schedule-period_from').val())
    let auto_update_interval_to = parseInt($('#conf-auto_update_schedule-period_to').val())
    if (auto_update_interval_from >= auto_update_interval_to) {
      $('#conf-auto_update_schedule-period_to').val(auto_update_interval_from + 1)
    }
  })

  $('#conf-auto_update_schedule-period_to').change(function () {
    let auto_update_interval_from = parseInt($('#conf-auto_update_schedule-period_from').val())
    let auto_update_interval_to = parseInt($('#conf-auto_update_schedule-period_to').val())
    if (auto_update_interval_from >= auto_update_interval_to) {
      $('#conf-auto_update_schedule-period_from').val(auto_update_interval_to - 1)
    }
  })

  $('#conf-auto_update_schedule-tz').change(function () {
  })

  $('section#page-update_schedule #page-update_schedule-button-continue').click(function (e) {
    e.preventDefault()
    change_page_to_settings_lan_auth()
  })

  // ==== page-settings_lan_auth =====================================================================================
  $('section#page-settings_lan_auth').bind('onShow', function () {
    let lan_auth_pass = $('#lan_auth-pass')
    lan_auth_pass.attr('type', 'password')
    let lan_auth_pass_eye = lan_auth_pass.parent().children('.input-password-eye')
    lan_auth_pass_eye.children('.eye').removeClass('hidden')
    lan_auth_pass_eye.children('.eye-slash').addClass('hidden')

    let flag_show_advanced_dropdown = false
    if (!$('#lan_auth-api_key').attr('placeholder')) {
      $('#settings_lan_auth-use_api_key').prop('checked', false)
      $('#settings_lan_auth-api_key').hide()
    } else {
      $('#settings_lan_auth-use_api_key').prop('checked', true)
      $('#settings_lan_auth-api_key').show()
      flag_show_advanced_dropdown = true
    }
    if (!$('#lan_auth-api_key_rw').attr('placeholder')) {
      $('#settings_lan_auth-use_api_key_rw').prop('checked', false)
      $('#settings_lan_auth-api_key_rw').hide()
    } else {
      $('#settings_lan_auth-use_api_key_rw').prop('checked', true)
      $('#settings_lan_auth-api_key_rw').show()
      flag_show_advanced_dropdown = true
    }
    if (flag_show_advanced_dropdown) {
      dropdownShow('#page-settings_lan_auth-advanced-dropdown')
    } else {
      dropdownHide('#page-settings_lan_auth-advanced-dropdown')
    }
    on_lan_auth_type_changed()
  })

  $('section#page-settings_lan_auth #lan_auth-user').on('keyup change', function (e) {
    g_flag_lan_auth_pass_changed = true
    let lan_auth_pass = $('#lan_auth-pass')
    lan_auth_pass.removeAttr('placeholder')
    lan_auth_pass.parent().children('.input-password-eye').removeClass('disabled')
    on_lan_auth_user_pass_changed()
  })

  $('section#page-settings_lan_auth #lan_auth-pass').on('keyup change', function (e) {
    g_flag_lan_auth_pass_changed = true
    let lan_auth_pass = $('#lan_auth-pass')
    lan_auth_pass.removeAttr('placeholder')
    lan_auth_pass.parent().children('.input-password-eye').removeClass('disabled')
    on_lan_auth_user_pass_changed()
  })

  $('section#page-settings_lan_auth input[name=\'lan_auth_type\']').change(function (e) {
    g_flag_lan_auth_pass_changed = true
    on_lan_auth_type_changed()
  })

  $('section#page-settings_lan_auth #page-lan_auth_type-button-continue').click(function (e) {
    e.preventDefault()
    change_url_cloud_options()
  })

  $('section#page-settings_lan_auth #settings_lan_auth-use_api_key').change(function (e) {
    on_lan_auth_use_api_key_changed()
    on_lan_auth_user_pass_changed()
  })

  $('section#page-settings_lan_auth #settings_lan_auth-use_api_key_rw').change(function (e) {
    on_lan_auth_use_api_key_rw_changed()
    on_lan_auth_user_pass_changed()
  })

  $('section#page-settings_lan_auth #lan_auth-api_key').on('focus', function () {
    if (flagUseSavedLanAuthApiKey) {
      flagUseSavedLanAuthApiKey = false
      let lan_auth_api_key = $('#lan_auth-api_key')
      lan_auth_api_key.val('')
      lan_auth_api_key.removeAttr('placeholder')
      on_lan_auth_user_pass_changed()
    }
  })

  $('section#page-settings_lan_auth #lan_auth-api_key_rw').on('focus', function () {
    if (flagUseSavedLanAuthApiKeyRW) {
      flagUseSavedLanAuthApiKeyRW = false
      let lan_auth_api_key_rw = $('#lan_auth-api_key_rw')
      lan_auth_api_key_rw.val('')
      lan_auth_api_key_rw.removeAttr('placeholder')
      on_lan_auth_user_pass_changed()
    }
  })

  $('section#page-settings_lan_auth #lan_auth-api_key').on('input', function () {
    on_lan_auth_user_pass_changed()
  })

  $('section#page-settings_lan_auth #lan_auth-api_key_rw').on('input', function () {
    on_lan_auth_user_pass_changed()
  })

  // ==== page-ntp_config ============================================================================================
  $('section#page-ntp_config').bind('onShow', function () {
    on_ntp_config_changed()
  })

  $('section#page-ntp_config input[type=radio][name=ntp_sync]').change(function () {
    on_ntp_config_changed()
  })

  $('section#page-ntp_config #page-ntp_config-button-continue').click(function (e) {
    e.preventDefault()
    change_url_scanning()
  })

  // ==== page-cloud_options =========================================================================================
  $('section#page-cloud_options').bind('onShow', function () {
    $('#page-cloud_options div.btn-dropdown-arrow-up').hide()
    $('#page-cloud_options div.btn-dropdown-arrow-down').show()
    let connection_type = $('input[name=\'connection_type\']:checked').val()
    if (connection_type !== 'ruuvi') {
      dropdownShow('#page-cloud_options-advanced-dropdown')
    } else {
      dropdownHide('#page-cloud_options-advanced-dropdown')
    }
    on_cloud_options_connection_type_changed()
  })

  $('section#page-cloud_options input[type=radio][name=connection_type]').change(function () {
    on_cloud_options_connection_type_changed()
  })

  $('section#page-cloud_options #page-cloud_options-advanced-button').click(function (e) {
    let id = $(this).attr('id')
    let base_id = id.substring(0, id.lastIndexOf('-'))
    let arrow_up_id = '#' + base_id + '-button div.btn-dropdown-arrow-up'
    if (!$(arrow_up_id).is(':hidden')) {
      $('#use_http').prop('checked', true)
      $('#use_mqtt').prop('checked', false)
    }
  })

  $('section#page-cloud_options #page-cloud_options-button-continue').click(function (e) {
    e.preventDefault()
    let connection_type = $('input[name=\'connection_type\']:checked').val()
    if (connection_type === 'ruuvi') {
      save_config()
      change_page_to_finished(8)
    } else {
      change_url_custom_server()
    }
  })

  // ==== page-custom_server =========================================================================================
  $('section#page-custom_server').bind('onShow', function () {
    input_password_on_open_page($('#http_pass'))
    input_password_on_open_page($('#http_stat_pass'))
    input_password_on_open_page($('#mqtt_pass'))
    on_custom_connection_type_changed()
    if ($('#use_mqtt_prefix_custom').prop('checked')) {
      $('#mqtt_prefix_custom').removeClass('hidden')
    } else {
      $('#mqtt_prefix_custom').addClass('hidden')
    }
    if ($('#use_http_stat_ruuvi').prop('checked')) {
      dropdownHide('#page-custom_server-advanced-button')
    } else {
      dropdownShow('#page-custom_server-advanced-button')
    }
    on_custom_server_url_changed()
  })

  $('section#page-custom_server').bind('onHide', function () {
    $('#conf-settings-http').addClass('hidden')
    $('#conf-settings-mqtt').addClass('hidden')
  })

  $('section#page-custom_server input#use_http_ruuvi').change(function (e) {
    on_custom_connection_type_changed()
    on_custom_server_url_changed()
  })

  $('section#page-custom_server input#use_http').change(function (e) {
    if ($('#use_http').prop('checked')) {
      let http_url = $('#http_url')
      http_url.val('')
      input_validity_set_validation_required(http_url)
    }
    on_custom_connection_type_changed()
    on_custom_server_url_changed()
  })

  $('section#page-custom_server input[name=\'use_statistics\']').change(function (e) {
    if ($('#use_http_stat').prop('checked')) {
      $('#conf-settings-http_stat').removeClass('hidden')
      $('#http_stat_url').prop('disabled', false)
      $('#http_stat_user').prop('disabled', false)
      $('#http_stat_pass').prop('disabled', false)
    } else {
      $('#conf-settings-http_stat').addClass('hidden')
      $('#http_stat_url').prop('disabled', true)
      $('#http_stat_user').prop('disabled', true)
      $('#http_stat_pass').prop('disabled', true)
    }
    if ($('#use_http_stat_ruuvi').prop('checked')) {
      $('#http_stat_url').val(HTTP_STAT_URL_DEFAULT)
      $('#http_stat_user').val('')
      input_password_clear($('#http_stat_pass'))
    } else if ($('#use_http_stat').prop('checked')) {
      let http_stat_url = $('#http_stat_url')
      http_stat_url.val('')
      $('#http_stat_user').val('')
      input_password_clear($('#http_stat_pass'))
      input_validity_set_validation_required(http_stat_url)
    }
    on_custom_server_url_changed()
  })

  $('#http_url').on('input change', function () {
    input_validity_set_validation_required($(this))
    on_custom_server_url_changed()
  })
  $('#http_user').on('input change', function () {
    input_password_clear_saved($('#http_pass'))
    input_validity_set_validation_required($('#http_url'))
    on_custom_server_url_changed()
  })
  $('#http_pass').on('input change', function () {
    input_password_clear_saved($('#http_pass'))
    input_validity_set_validation_required($('#http_url'))
    on_custom_server_url_changed()
  })

  $('#http_stat_url').on('input change', function () {
    input_validity_set_validation_required($(this))
    on_custom_server_url_changed()
  })
  $('#http_stat_user').on('input change', function () {
    input_password_clear_saved($('#http_stat_pass'))
    input_validity_set_validation_required($('#http_stat_url'))
    on_custom_server_url_changed()
  })
  $('#http_stat_pass').on('input change', function () {
    input_password_clear_saved($('#http_stat_pass'))
    input_validity_set_validation_required($('#http_stat_url'))
    on_custom_server_url_changed()
  })

  $('section#page-custom_server input#use_mqtt').change(function (e) {
    if ($('#use_mqtt').prop('checked')) {
      input_validity_set_validation_required($('#mqtt_server'))
    } else {
      input_validity_clear_validation_required($('#mqtt_server'))
    }
    on_custom_connection_type_changed()
    on_custom_server_url_changed()
  })

  $('section#page-custom_server input[type=radio][name=mqtt_transport]').change(function () {
    let mqtt_transport = $('input[name=\'mqtt_transport\']:checked').val()
    let is_mqtt_authentication_used = $('#mqtt_user').val() !== ''
    let default_port = 1883
    if (mqtt_transport === 'mqtt_transport_TCP') {
      if (is_mqtt_authentication_used) {
        default_port = 1884
      } else {
        default_port = 1883
      }
    } else if (mqtt_transport === 'mqtt_transport_SSL') {
      if (is_mqtt_authentication_used) {
        default_port = 8885
      } else {
        default_port = 8886
      }
    } else if (mqtt_transport === 'mqtt_transport_WS') {
      if (is_mqtt_authentication_used) {
        default_port = 8090
      } else {
        default_port = 8080
      }
    } else if (mqtt_transport === 'mqtt_transport_WSS') {
      if (is_mqtt_authentication_used) {
        default_port = 8091
      } else {
        default_port = 8081
      }
    }
    if ($('#mqtt_server').val() === 'test.mosquitto.org') {
      $('#mqtt_port').val(default_port)
      if (is_mqtt_authentication_used) {
        $('#mqtt_user').val('rw')
        $('#mqtt_pass').val('readwrite')
      } else {
        $('#mqtt_pass').val('')
      }
      input_password_clear_saved($('#mqtt_pass'))
    }
    input_validity_set_validation_required($('#mqtt_server'))
    on_custom_server_url_changed()
  })

  $('#mqtt_server').on('input change', function () {
    on_edit_mqtt_settings()
    input_validity_set_validation_required($('#mqtt_server'))
    on_custom_server_url_changed()
  })
  $('#mqtt_port').on('input change', function () {
    on_edit_mqtt_settings()
    input_validity_set_validation_required($('#mqtt_server'))
    on_custom_server_url_changed()
  })
  $('#mqtt_user').on('input change', function () {
    input_password_clear_saved($('#mqtt_pass'))
    on_edit_mqtt_settings()
    input_validity_set_validation_required($('#mqtt_server'))
    on_custom_server_url_changed()
  })
  $('#mqtt_pass').on('input change', function () {
    input_password_clear_saved($('#mqtt_pass'))
    on_edit_mqtt_settings()
    input_validity_set_validation_required($('#mqtt_server'))
    on_custom_server_url_changed()
  })
  $('#use_mqtt_prefix_ruuvi').on('input change', function () {
    on_edit_mqtt_settings()
  })
  $('#use_mqtt_prefix_gw_mac').on('input change', function () {
    on_edit_mqtt_settings()
  })
  $('#use_mqtt_prefix_custom').change(function () {
    if ($('#use_mqtt_prefix_custom').prop('checked')) {
      $('#mqtt_prefix_custom').removeClass('hidden')
    } else {
      $('#mqtt_prefix_custom').addClass('hidden')
    }
    on_edit_mqtt_settings()
  })
  $('#mqtt_prefix_custom').on('input change', function () {
    on_edit_mqtt_settings()
  })

  $('#show_mqtt_examples').change(function () {
    if (this.checked) {
      $('#mqtt_examples').slideDown()
    } else {
      $('#mqtt_examples').slideUp()
    }
  })

  function validate_url (cb_on_finish, input_url, url_val, input_user, input_pass, validate_type, aux_param) {
    if (!input_validity_is_validation_required(input_url) || input_validity_has_checked(input_url)) {
      return false
    }
    console.log('custom_server_validate_urls: validate URL: ' + url_val)
    let url = '/validate_url?url='
    url += encodeURIComponent(url_val)
    url += '&validate_type=' + validate_type
    if (input_user !== undefined) {
      let user_val = input_user.val()
      if (user_val) {
        url += '&user='
        url += encodeURIComponent(user_val)
      }
    }
    if (input_pass !== undefined) {
      if (input_password_is_saved(input_pass)) {
        url += '&use_saved_password=true'
      } else {
        let pass_val = input_pass.val()
        let json_encrypted_password = JSON.parse(ruuvi_edch_encrypt(pass_val))
        url += '&encrypted_password='
        url += encodeURIComponent(json_encrypted_password['encrypted'])
        url += '&encrypted_password_iv='
        url += encodeURIComponent(json_encrypted_password['iv'])
        url += '&encrypted_password_hash='
        url += encodeURIComponent(json_encrypted_password['hash'])
      }
    }
    if (aux_param) {
      url += aux_param
    }
    input_validity_set_checking(input_url)
    input_validity_set_checking(input_user)
    input_validity_set_checking(input_pass)
    $.getJSON(url, function (data) {
      let validation_status = data['status']
      let status_message = undefined
      if (validation_status === 200) {
        input_validity_set_valid(input_url)
        input_validity_set_valid(input_user)
        input_validity_set_valid(input_pass)
      } else if (validation_status === 401) {
        input_validity_set_invalid(input_url)
        input_validity_set_invalid(input_user)
        input_validity_set_invalid(input_pass)
      } else {
        if (data.hasOwnProperty('message')) {
          status_message = data['message']
        }
        input_validity_set_invalid(input_url)
        input_validity_clear_icon(input_user)
        input_validity_clear_icon(input_pass)
      }
      if (cb_on_finish) {
        cb_on_finish(status_message)
      }
    }).fail(function (jqXHR) {
      let status_message = undefined
      if (jqXHR.responseText) {
        try {
          resp = JSON.parse(jqXHR.responseText)
          if (resp.hasOwnProperty('message')) {
            status_message = resp['message']
          }
        } catch (e) {
          log_wrap('Failed to parse response: ' + jqXHR.responseText)
        }
      }
      input_validity_set_invalid(input_url)
      input_validity_set_invalid(input_user)
      input_validity_set_invalid(input_pass)
      if (cb_on_finish) {
        cb_on_finish(status_message)
      }
    })
    return true
  }

  function custom_server_validate_urls () {
    console.log('custom_server_validate_urls')
    bodyClassLoadingAdd()
    stopCheckStatus()
    let http_url = $('#http_url')
    if (validate_url(custom_server_validate_urls, http_url, http_url.val(), $('#http_user'), $('#http_pass'),
      'check_post_advs')) {
      return
    }
    let http_stat_url = $('#http_stat_url')
    if (validate_url(custom_server_validate_urls, http_stat_url, http_stat_url.val(), $('#http_stat_user'), $('#http_stat_pass'),
      'check_post_stat')) {
      return
    }

    if ($('#use_mqtt').prop('checked')) {
      let mqtt_server = $('#mqtt_server')
      let mqtt_transport = $('input[name=\'mqtt_transport\']:checked').val()
      let mqtt_url_prefix = ''
      if (mqtt_transport === 'mqtt_transport_TCP') {
        mqtt_url_prefix = 'mqtt://'
      } else if (mqtt_transport === 'mqtt_transport_SSL') {
        mqtt_url_prefix = 'mqtts://'
      } else if (mqtt_transport === 'mqtt_transport_WS') {
        mqtt_url_prefix = 'mqttws://'
      } else if (mqtt_transport === 'mqtt_transport_WSS') {
        mqtt_url_prefix = 'mqttwss://'
      }
      let mqtt_topic_prefix = get_mqtt_topic_prefix()
      let mqtt_url = mqtt_url_prefix + mqtt_server.val() + ':' + $('#mqtt_port').val()
      let aux_params = ''
      aux_params += '&mqtt_topic_prefix='
      aux_params += encodeURIComponent(mqtt_topic_prefix)
      aux_params += '&mqtt_client_id='
      aux_params += encodeURIComponent($('#mqtt_client_id').val())
      if (validate_url(custom_server_validate_urls, mqtt_server, mqtt_url, $('#mqtt_user'), $('#mqtt_pass'), 'check_mqtt', aux_params)) {
        return
      }
    }

    on_custom_server_url_changed()
    bodyClassLoadingRemove()
    startCheckStatus()
  }

  $('section#page-custom_server #page-custom_server-button-check').click(function (e) {
    e.preventDefault()

    let http_url = $('#http_url')
    if (!http_url.val().startsWith('http://') && !http_url.val().startsWith('https://')) {
      http_url.val('http://' + http_url.val())
      input_validity_set_validation_required(http_url)
    }
    if (input_validity_is_invalid(http_url) || input_validity_is_validation_required(http_url)) {
      input_validity_clear_icon(http_url)
      input_validity_set_validation_required(http_url)
      input_validity_clear_icon($('#http_user'))
      input_validity_clear_icon($('#http_pass'))
    }

    let http_stat_url = $('#http_stat_url')
    if (!http_stat_url.val().startsWith('http://') && !http_stat_url.val().startsWith('https://')) {
      http_stat_url.val('http://' + http_stat_url.val())
      input_validity_set_validation_required(http_stat_url)
    }
    if (input_validity_is_invalid(http_stat_url) || input_validity_is_validation_required(http_stat_url)) {
      input_validity_clear_icon(http_stat_url)
      input_validity_set_validation_required(http_stat_url)
      input_validity_clear_icon($('#http_stat_user'))
      input_validity_clear_icon($('#http_stat_pass'))
    }

    let mqtt_server = $('#mqtt_server')
    if (input_validity_is_invalid(mqtt_server) || input_validity_is_validation_required(mqtt_server)) {
      input_validity_clear_icon(mqtt_server)
      input_validity_set_validation_required(mqtt_server)
      input_validity_clear_icon($('#mqtt_user'))
      input_validity_clear_icon($('#mqtt_pass'))
    }

    custom_server_validate_urls()
  })

  $('section#page-custom_server #page-custom_server-button-continue').click(function (e) {
    e.preventDefault()
    change_url_ntp_config()
  })

  // ==== page-scanning ==============================================================================================
  $('section#page-scanning').bind('onShow', function () {
    $('#page-scanning-advanced-button div.btn-dropdown-arrow-up').hide()
    $('#page-scanning-advanced-button div.btn-dropdown-arrow-down').show()

    let filtering = $('input[name=\'company_use_filtering\']:checked').val()
    if (filtering !== '1') {
      dropdownShow('#page-scanning-advanced-dropdown')
    } else {
      dropdownHide('#page-scanning-advanced-dropdown')
    }
    on_settings_scan_filtering_changed()
  })

  $('section#page-scanning input[name=\'company_use_filtering\']').change(function (e) {
    on_settings_scan_filtering_changed()
  })

  $('section#page-scanning #page-scanning-button-continue').click(function (e) {
    e.preventDefault()
    save_config()
    change_page_to_finished(11)
  })

  // ==== page-finished ==============================================================================================

  $('#page-finished').bind('onShow', function () {
    console.log(log_wrap('onShow: #page-finished'))
    stopCheckStatus()
  })

  // =================================================================================================================

  function dropdownShow (id) {
    let base_id = id.substring(0, id.lastIndexOf('-'))
    let dropdown_id = base_id + '-dropdown'
    $(id).children('div.btn-dropdown-arrow-down').hide()
    $(id).children('div.btn-dropdown-arrow-up').show()
    $(dropdown_id).fadeIn()
  }

  function dropdownHide (id) {
    let base_id = id.substring(0, id.lastIndexOf('-'))
    let dropdown_id = base_id + '-dropdown'
    $(id).children('div.btn-dropdown-arrow-up').hide()
    $(id).children('div.btn-dropdown-arrow-down').show()
    $(dropdown_id).fadeOut()
  }

  function clickOnDropDown (id) {
    if ($(id).children('div.btn-dropdown-arrow-down').is(':hidden')) {
      dropdownHide(id)
    } else {
      dropdownShow(id)
    }
  }

  $('.btn-dropdown').click(function (e) {
    let id = $(this).attr('id')
    clickOnDropDown('#' + id)
  })

  $('.btn-back').click(function (e) {
    e.preventDefault()
    window.history.back()
  })
})

function networkConnect (ssid, password) {
  selectedSSID = ssid
  $('.wifi-network-name').text(ssid)

  stopCheckStatus()

  let stub = ''
  let json_content = JSON.stringify({ 'ssid': ssid, 'password': password, 'stub': stub })
  if (json_content.length < 240) {
    // Make the length of the message the same, regardless of the length of ssid/password
    stub = ' '.repeat(240 - json_content.length)
    json_content = JSON.stringify({ 'ssid': ssid, 'password': password, 'stub': stub })
  }
  let json_content_encrypted = ruuvi_edch_encrypt(json_content)

  console.log(log_wrap('POST /connect.json'))
  $.ajax({
      method: 'POST',
      url: '/connect.json',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      cache: false,
      data: json_content_encrypted,
      success: function (data, text) {
        console.log(log_wrap('POST /connect.json: successful'))
        connectionState = CONNECTION_STATE.CONNECTING
        //now we can re-set the intervals regardless of result
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus()
      },
      error: function (request, status, error) {
        console.log(log_wrap('POST /connect.json: failure' +
          ', status=' + status +
          ', error=' + error))
        bodyClassLoadingRemove()
        //now we can re-set the intervals regardless of result
        $('#page-wifi_connection-button-continue').removeClass('disable-click')
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus()
        if (ssid != null) {
          $('#wifi-connection-status-block').show()
          updatePositionOfWiFiPasswordInput()
          startRefreshAP()
        }
      }
    }
  )
}

function networkDisconnect () {
  stopRefreshAP()
  stopCheckStatus()
  selectedSSID = ''
  console.log(log_wrap('DELETE /connect.json'))
  $.ajax({
    url: '/connect.json',
    dataType: 'json',
    method: 'DELETE',
    cache: false,
    data: { 'timestamp': Date.now() },
    success: function (data, text) {
      console.log(log_wrap('DELETE /connect.json: success'))
      console.log(log_wrap('Start periodic status check'))
      startCheckStatus()
    },
    error: function (request, status, error) {
      console.log(log_wrap('DELETE /connect.json: failure' +
        ', status=' + status +
        ', error=' + error))
      console.log(log_wrap('Start periodic status check'))
      startCheckStatus()
    }
  })
}

function rssiToIcon (rssi) {
  if (rssi >= -60) {
    return 'w0'
  } else if (rssi >= -67) {
    return 'w1'
  } else if (rssi >= -75) {
    return 'w2'
  } else {
    return 'w3'
  }
}

// Load wifi list
function refreshAP () {
  g_refreshAPTimer = null

  if (g_checkStatusInProgress) {
    console.log(log_wrap('refreshAP: checkStatus is active, postpone refreshAP'))
    startRefreshAP(500)
    return
  }

  let timestamp1 = new Date()

  let prevCheckStatusActive = g_checkStatusActive
  stopCheckStatus()

  g_refreshAPInProgress = true
  console.log(log_wrap('GET /ap.json'))
  $.ajax({
    dataType: 'json',
    url: '/ap.json',
    timeout: g_refresh_ap_timeout,
    success: function (data, text) {
      console.log(log_wrap('GET /ap.json: success, data.length=' + data.length))
      g_refreshAPInProgress = false
      refreshAPHTML(data)
      if (g_refresh_ap_flag_initial) {
        g_refresh_ap_flag_initial = false
        bodyClassLoadingRemove()
      }

      if (prevCheckStatusActive) {
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus()
      }
      if (g_refreshAPActive) {
        let timestamp2 = new Date()
        let delta_ms = timestamp2 - timestamp1
        if (delta_ms < 5000) {
          startRefreshAP(5000 - delta_ms)
        } else {
          startRefreshAP(2000)
        }
      }
    },
    error: function (request, status, error) {
      console.log(log_wrap('GET /ap.json: failure' +
        ', status=' + status +
        ', error=' + error +
        ', timeout=' + g_refresh_ap_timeout))
      if (g_refresh_ap_flag_initial) {
        g_refresh_ap_flag_initial = false
        bodyClassLoadingRemove()
      }
      g_refreshAPInProgress = false
      let timestamp2 = new Date()
      if (prevCheckStatusActive) {
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus()
      }
      if (g_refreshAPActive) {
        let delta_ms = timestamp2 - timestamp1
        if (delta_ms < 5000) {
          startRefreshAP(5000 - delta_ms)
        } else {
          startRefreshAP(5000)
        }
      }
    }
  })
}

function updatePositionOfWiFiPasswordInput () {
  let selected_wifi = $('input[name=\'wifi-name\']:checked')

  let is_manual_wifi = false
  if (selected_wifi[0] && (selected_wifi[0].id === 'page-wifi_connection-radio-connect_manually')) {
    is_manual_wifi = true
  }

  if (is_manual_wifi) {
    let div_page_wifi_list_ssid_password = $('#page-wifi_connection-ssid_password')
    let div_ssid_password_wrap = $('#page-wifi_connection-ssid_password-wrap')
    let wifi_password_position = div_ssid_password_wrap.position()
    div_ssid_password_wrap.css('height', div_page_wifi_list_ssid_password.height())
    div_page_wifi_list_ssid_password.css('top', wifi_password_position.top)
  } else {
    let div_wifi_password = selected_wifi.parent().parent().children('.wifi_password')
    let div_page_wifi_list_ssid_password = $('#page-wifi_connection-ssid_password')

    $('.wifi_password').css('height', 0)
    $('#page-wifi_connection-ssid_password-wrap').css('height', 0)

    div_wifi_password.css('height', div_page_wifi_list_ssid_password.height())
    let wifi_password_position = div_wifi_password.position()
    div_page_wifi_list_ssid_password.css('top', wifi_password_position.top)
    div_page_wifi_list_ssid_password.show()
  }
}

function onChangeWiFiName () {
  let selected_wifi = $('input[name=\'wifi-name\']:checked')
  let ssid = selected_wifi.val()
  let isAuthNeeded = !selected_wifi.hasClass('no_auth')

  $('#manual_ssid').val(ssid)
  input_password_clear($('input#pwd'))

  $('#input_ssid_block').hide()
  if (isAuthNeeded) {
    $('#input_password_block').show()
  } else {
    $('#input_password_block').hide()
  }
  $('#wifi-connection-status-block').hide()

  if (ssid === connectedSSID) {
    input_password_set_use_saved($('input#pwd'))
  }

  updatePositionOfWiFiPasswordInput()
  checkAndUpdatePageWiFiListButtonNext()
  $('#page-wifi_connection-radio-connect_manually').parent().removeClass('mouse-cursor-default')
  $('input[name=\'wifi-name\']').parent().removeClass('mouse-cursor-default')
  selected_wifi.parent().addClass('mouse-cursor-default')
}

function refreshAPHTML (data) {
  if (data === null) {
    return
  }
  if (flagWaitingNetworkConnection) {
    return
  }
  if (document.location.hash !== '#page-wifi_connection') {
    return
  }
  console.log(log_wrap('refreshAPHTML'))

  if (data.length > 0) {
    if (g_wifi_sort_by_rssi) {
      //sort by signal strength
      data.sort(function (a, b) {
        let x = a['rssi']
        let y = b['rssi']
        return ((x < y) ? 1 : ((x > y) ? -1 : 0))
      })
    } else {
      data.sort(function (a, b) {
        let x = a['ssid'].toUpperCase()
        let y = b['ssid'].toUpperCase()
        return ((x < y) ? -1 : ((x > y) ? 1 : 0))
      })
    }
  }
  apList = data

  let is_manual_wifi = false
  let prev_selected_wifi_radio_button = $('input[name="wifi-name"]:checked')
  let prev_selected_wifi_radio_button_has_auth = prev_selected_wifi_radio_button.hasClass('auth')
  let selected_wifi_ssid = prev_selected_wifi_radio_button.val()
  if (prev_selected_wifi_radio_button[0] && (prev_selected_wifi_radio_button[0].id === 'page-wifi_connection-radio-connect_manually')) {
    is_manual_wifi = true
    selected_wifi_ssid = null
  }
  if (!is_manual_wifi && !selected_wifi_ssid) {
    if (connectedSSID) {
      selected_wifi_ssid = connectedSSID
    }
  }

  let div_page_wifi_list_ssid_password = $('#page-wifi_connection-ssid_password')
  if (selected_wifi_ssid) {
    $('#input_ssid_block').hide()
  }

  if (data.length === 0) {
    $('#page-wifi_connection-no_wifi').show()
  } else {
    $('#page-wifi_connection-no_wifi').hide()
  }

  let h = ''
  data.forEach(function (e, idx, array) {
    if (idx === 0) {
      h += '<div class="border"></div>'
      h += '\n'
    }
    h += '<div>'
    h += '<label class="control control-radio">'
    h += '    <div style="display: flex">'
    h += '        <div>{0}</div>'.format(e.ssid)
    h += '        <div style="margin-left: auto;" class="{0}"></div>'.format(e.auth === 0 ? '' : 'pw')
    h += '        <div class="{0}"></div>'.format(rssiToIcon(e.rssi))
    h += '    </div>'
    h += '    <input value="{0}" name="wifi-name" type="radio" class="{1} wifi_chan_{2}">'.format(
      e.ssid,
      (e.auth === 0) ? 'no_auth' : 'auth',
      e.chan)
    h += '    <span class="control_indicator"></span>'
    h += '</label>'
    h += '<div class="wifi_password"></div>'
    h += '<div class="border"></div>'
    h += '</div>'
    h += '\n'
  })

  if ($('#page-wifi_connection-list_of_ssid').html() !== h) {
    $('#page-wifi_connection-list_of_ssid').html(h)
    $('div#page-wifi_connection-list_of_ssid label input[name=\'wifi-name\']').change(onChangeWiFiName)

    if (!is_manual_wifi && selected_wifi_ssid) {
      let input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"]')
      if (input_id.length !== 0) {
        if (input_id.length > 1) {
          if (prev_selected_wifi_radio_button[0]) {
            if (prev_selected_wifi_radio_button_has_auth) {
              input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"].auth')
            } else {
              input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"].no_auth')
            }
          } else {
            input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"].auth')
          }
        }
        if (input_id) {
          input_id.prop('checked', true)
          input_id.parent().addClass('mouse-cursor-default')
        }

        if (selected_wifi_ssid) {
          let selected_wifi_has_auth = input_id.hasClass('auth')
          if (selected_wifi_has_auth) {
            $('#input_password_block').show()
          } else {
            $('#input_password_block').hide()
          }
          div_page_wifi_list_ssid_password.show()
        } else {
          div_page_wifi_list_ssid_password.hide()
        }

        $('#manual_ssid').val(selected_wifi_ssid)

        updatePositionOfWiFiPasswordInput(input_id.parent().parent().children('.wifi_password'))
      } else {
        $('#input_password_block').hide()
      }
    }
    if (is_manual_wifi) {
      updatePositionOfWiFiPasswordInput($('#page-wifi_connection-ssid_password-wrap'))
    }
  }
  checkAndUpdatePageWiFiListButtonNext()
}

function onGetStatusJson (data) {
  g_flagAccessFromLAN = data.hasOwnProperty('lan') && (data['lan'] === 1)
  if (data.hasOwnProperty('extra')) {
    let data_extra = data['extra']
    g_fw_updating_stage = data_extra['fw_updating']
    let fw_updating_percentage = data_extra['percentage']
    if (g_fw_updating_stage > 0) {
      if (!$('#page-software_update_progress').is(':visible')) {
        change_url_software_update_progress()
      }
      let progressbar_stage1 = $('#software_update_progress-stage1')
      let progressbar_stage2 = $('#software_update_progress-stage2')
      let progressbar_stage3 = $('#software_update_progress-stage3')
      let progressbar_stage4 = $('#software_update_progress-stage4')
      switch (g_fw_updating_stage) {
        case 1:
          progressbar_stage1.val(fw_updating_percentage)
          break
        case 2:
          progressbar_stage2.val(fw_updating_percentage)
          progressbar_stage1.val(100)
          break
        case 3:
          progressbar_stage3.val(fw_updating_percentage)
          progressbar_stage1.val(100)
          progressbar_stage2.val(100)
          break
        case 4:
          progressbar_stage4.val(fw_updating_percentage)
          progressbar_stage1.val(100)
          progressbar_stage2.val(100)
          progressbar_stage3.val(100)
          break
        case 5: // completed successfully
          progressbar_stage1.val(100)
          progressbar_stage2.val(100)
          progressbar_stage3.val(100)
          progressbar_stage4.val(100)
          $('#page-software_update_progress-info').addClass('hidden')
          $('#software_update_progress-status-completed_successfully').removeClass('hidden')
          stopCheckStatus()
          break
        case 6: // completed unsuccessfully
          $('#page-software_update_progress-info').addClass('hidden')
          $('#software_update_progress-status-completed_unsuccessfully').removeClass('hidden')
          $('#software_update_progress-status-completed_unsuccessfully-message').text(data_extra['message'])
          break
        case 7: // nRF52 firmware updating on reboot completed unsuccessfully
          $('#page-software_update_progress-info').addClass('hidden')
          $('#software_update_progress-status-completed_unsuccessfully').removeClass('hidden')
          $('#software_update_progress-status-completed_unsuccessfully-message').text(data_extra['message'])
          $('#page-software_update_progress-button_container-configure').removeClass('hidden')
          break
      }
      return
    }
  }
  if (g_fw_updating_stage > 0) {
    $('#page-software_update_progress-info').addClass('hidden')
    $('#software_update_progress-status-completed_unsuccessfully').removeClass('hidden')
    $('#software_update_progress-status-completed_unsuccessfully-because_of_gateway_reboot').removeClass('hidden')
    stopCheckStatus()
    return
  }
  if (data.hasOwnProperty('ssid') && !!data['ssid'] && data['ssid'] !== '') {
    connectedSSID = data['ssid']
    if (data['ssid'] === selectedSSID) {
      //that's a connection attempt
      if (data['urc'] === URC_CODE.CONNECTED) {
        $('#ip').text(data['ip'])
        $('#netmask').text(data['netmask'])
        $('#gw').text(data['gw'])
        if (data.hasOwnProperty('dhcp') && data['dhcp'] !== '') {
          $('#dhcp').text(data['dhcp'])
          $('#dhcp-block').show()
        } else {
          $('#dhcp').text('')
          $('#dhcp-block').hide()
        }

        switch (connectionState) {
          case CONNECTION_STATE.NOT_CONNECTED:
            break
          case CONNECTION_STATE.CONNECTING:
            if (!flagNetworkConnected) {
              flagNetworkConnected = true
              on_network_connected_wifi()
            }
            if (flagWaitingNetworkConnection) {
              flagWaitingNetworkConnection = false
              change_page_to_software_update()
            }
            break
          case CONNECTION_STATE.CONNECTED:
            break
          case CONNECTION_STATE.FAILED:
            break
        }
        connectionState = CONNECTION_STATE.CONNECTED
      } else if (data['urc'] === URC_CODE.FAILED) {
        //failed attempt
        $('#ip').text('0.0.0.0')
        $('#netmask').text('0.0.0.0')
        $('#gw').text('0.0.0.0')
        $('#dhcp').text('')
        $('#dhcp-block').hide()

        switch (connectionState) {
          case CONNECTION_STATE.NOT_CONNECTED:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.NOT_CONNECTED'))
            break
          case CONNECTION_STATE.CONNECTING:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.CONNECTING'))
            flagWaitingNetworkConnection = false
            $('#wifi-connection-status-block').show()
            updatePositionOfWiFiPasswordInput()
            bodyClassLoadingRemove()
            startRefreshAP()
            break
          case CONNECTION_STATE.CONNECTED:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.CONNECTED'))
            break
          case CONNECTION_STATE.FAILED:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.FAILED'))
            break
        }
        connectionState = CONNECTION_STATE.FAILED
      }
    } else if (data.hasOwnProperty('urc') && data['urc'] === URC_CODE.CONNECTED) {
      //ESP32 is already connected to a wifi without having the user do anything
      $('.wifi-network-name').text(data['ssid'])
      $('#ip').text(data['ip'])
      $('#netmask').text(data['netmask'])
      $('#gw').text(data['gw'])
      if (data.hasOwnProperty('dhcp') && data['dhcp'] !== '') {
        $('#dhcp').text(data['dhcp'])
        $('#dhcp-block').show()
      } else {
        $('#dhcp').text('')
        $('#dhcp-block').hide()
      }
      switch (connectionState) {
        case CONNECTION_STATE.NOT_CONNECTED:
        case CONNECTION_STATE.CONNECTING:
          if (!flagNetworkConnected) {
            flagNetworkConnected = true
            on_network_connected_wifi()
          }
          if (flagWaitingNetworkConnection) {
            flagWaitingNetworkConnection = false
            change_page_to_software_update()
          }
          break
        case CONNECTION_STATE.CONNECTED:
          break
        case CONNECTION_STATE.FAILED:
          break
      }
      connectionState = CONNECTION_STATE.CONNECTED
    }
  } else {
    connectedSSID = ''
    if (data.hasOwnProperty('urc')) {
      if (data['urc'] === URC_CODE.CONNECTED) {
        // connected to Ethernet
        $('.wifi-network-name').text('')
        $('#ip').text(data['ip'])
        $('#netmask').text(data['netmask'])
        $('#gw').text(data['gw'])
        if (data.hasOwnProperty('dhcp') && data['dhcp'] !== '') {
          $('#dhcp').text(data['dhcp'])
          $('#dhcp-block').show()
        } else {
          $('#dhcp').text('')
          $('#dhcp-block').hide()
        }

        switch (connectionState) {
          case CONNECTION_STATE.NOT_CONNECTED:
          case CONNECTION_STATE.CONNECTING:
            if (!flagNetworkConnected) {
              flagNetworkConnected = true
              on_network_connected_eth()
            }
            if (flagWaitingNetworkConnection) {
              flagWaitingNetworkConnection = false
              change_page_to_software_update()
            }
            break
          case CONNECTION_STATE.CONNECTED:
            break
          case CONNECTION_STATE.FAILED:
            break
        }
        connectionState = CONNECTION_STATE.CONNECTED
      } else if (data['urc'] === URC_CODE.DISCONNECTED) {
        //that's a manual disconnect
        // TODO: implement
        // if($("#wifi-status").is(":visible"))
        // {
        // 	$("#wifi-status").slideUp( "fast", function() {});
        // }
      }
    }
  }
  if (window.location.hash === '#page-welcome') {
    $('#page-welcome-button-get-started').removeClass('disable-click')
  }
}

function checkStatus () {
  g_checkStatusTimer = null

  if (g_refreshAPInProgress) {
    console.log(log_wrap('checkStatus: refreshAP is active, postpone checkStatus'))
    startCheckStatus(500)
    return
  }

  let timestamp1 = new Date()
  console.log(log_wrap('GET /status.json: cnt=' + counterStatusJsonTimeout + ', time: ' + timestamp1.toISOString()))

  g_checkStatusInProgress = true
  $.ajax({
    dataType: 'json',
    url: '/status.json',
    timeout: 3000,
    success: function (data, text) {
      console.log(log_wrap('GET /status.json: success'))
      g_checkStatusInProgress = false
      counterStatusJsonTimeout = 0
      onGetStatusJson(data)
      if (g_checkStatusActive) {
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus(1000)
      }
    },
    error: function (request, status, error) {
      // It's a normal situation after "POST /connect.json", the Gateway will not answer for 5-7 seconds.
      g_checkStatusInProgress = false
      let timestamp2 = new Date()
      console.log(log_wrap('GET /status.json: failure' +
        ', status=' + status +
        ', error=' + error +
        ', cnt=' + counterStatusJsonTimeout +
        ', delta=' + (timestamp2 - timestamp1)))

      counterStatusJsonTimeout += 1
      if (counterStatusJsonTimeout >= 4) {
        $('#overlay-no_gateway_connection').fadeIn()
        bodyClassLoadingRemove()
        stopRefreshAP()
        stopCheckStatus()
      } else {
        if (g_checkStatusActive) {
          let delta_ms = timestamp2 - timestamp1
          if (delta_ms < 1000) {
            console.log(log_wrap('Start periodic status check'))
            startCheckStatus(1000 - delta_ms)
          } else {
            console.log(log_wrap('Start periodic status check'))
            startCheckStatus()
          }
        }
      }
    }
  })
}

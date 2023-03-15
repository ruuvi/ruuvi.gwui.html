let g_ecdh
let g_aes_key
let gw_mac = ''
let g_flag_lan_auth_pass_changed = false
const MQTT_PREFIX_MAX_LENGTH = 256
const HTTP_URL_DEFAULT = 'https://network.ruuvi.com/record'
const HTTP_STAT_URL_DEFAULT = 'https://network.ruuvi.com/status'
const MQTT_SERVER_DEFAULT = 'test.mosquitto.org'
const MQTT_PORT_DEFAULT = 1883

const REMOTE_CFG_AUTH_TYPE = Object.freeze({
  'NO': 'no',
  'BASIC': 'basic',
  'BEARER': 'bearer',
})

const LAN_AUTH_TYPE = Object.freeze({
  'DENY': 'lan_auth_deny',
  'DEFAULT': 'lan_auth_default',
  'RUUVI': 'lan_auth_ruuvi',
  'DIGEST': 'lan_auth_digest',
  'BASIC': 'lan_auth_basic',
  'ALLOW': 'lan_auth_allow'
})

const MQTT_TRANSPORT_TYPE = Object.freeze({
  'TCP': 'TCP',
  'SSL': 'SSL',
  'WS': 'WS',
  'WSS': 'WSS',
})

const AUTO_UPDATE_CYCLE_TYPE = Object.freeze({
  'REGULAR': 'regular',
  'BETA_TESTER': 'beta',
  'MANUAL': 'manual',
})

const NTP_DEFAULT = Object.freeze({
  'SERVER1': 'time.google.com',
  'SERVER2': 'time.cloudflare.com',
  'SERVER3': 'time.nist.gov',
  'SERVER4': 'pool.ntp.org',
})

function get_mqtt_topic_prefix () {
  let mqtt_topic = ''
  if ($('#use_mqtt_prefix_ruuvi').prop('checked')) {
    mqtt_topic += 'ruuvi'
  }
  if ($('#use_mqtt_prefix_gw_mac').prop('checked')) {
    if (mqtt_topic.length > 0) {
      mqtt_topic += '/'
    }
    mqtt_topic += gw_mac
  }
  let flag_add_trailing_slash = mqtt_topic.length > 0
  if ($('#use_mqtt_prefix_custom').prop('checked')) {
    let mqtt_prefix_custom = $('#mqtt_prefix_custom').val()
    if (mqtt_prefix_custom.length > 0) {
      flag_add_trailing_slash = /[a-zA-Z0-9]/.test(mqtt_prefix_custom.slice(-1))
      if (mqtt_topic.length > 0) {
        mqtt_topic += '/'
      }
      let suffix_len = flag_add_trailing_slash ? 1 : 0
      if ((mqtt_topic.length + mqtt_prefix_custom.length + suffix_len) >= MQTT_PREFIX_MAX_LENGTH) {
        if (mqtt_topic.length >= MQTT_PREFIX_MAX_LENGTH) {
          mqtt_prefix_custom = ''
        } else {
          mqtt_prefix_custom = mqtt_prefix_custom.substring(0, MQTT_PREFIX_MAX_LENGTH - mqtt_topic.length - suffix_len)
        }
        $('#mqtt_prefix_custom').val(mqtt_prefix_custom)
      }
      mqtt_topic += mqtt_prefix_custom
    }
  }
  if (flag_add_trailing_slash) {
    mqtt_topic += '/'
  }
  return mqtt_topic
}

function save_config_internal (flag_save_network_cfg, ap_wifi_channel, cb_on_success, cb_on_error) {
  //stop the status refresh. This prevents a race condition where a status
  //request would be refreshed with wrong ip info from a previous connection
  //and the request would automatically shows as successful.
  stopCheckStatus()

  //stop refreshing wifi list
  stopRefreshAP()

  if (g_checkStatusInProgress || g_refreshAPInProgress) {
    // postpone sending the ajax requests until "GET /status.json" and "GET /ap.json" are completed
    setTimeout(save_config_internal, 500, flag_save_network_cfg, ap_wifi_channel, cb_on_success, cb_on_error)
    return
  }

  console.log(log_wrap('save_config'))
  let network_type = $('input[name=\'network_type\']:checked').val()
  let auto_update_cycle = $('input[name=\'auto_update_cycle\']:checked').val()

  let data = {}

  if (flag_save_network_cfg) {
    data.use_eth = !(network_type === 'wifi')
    if (data.use_eth) {
      data.eth_dhcp = $('#eth_dhcp')[0].checked
      if (!data.eth_dhcp) {
        data.eth_static_ip = $('#eth_static_ip').val()
        data.eth_netmask = $('#eth_netmask').val()
        data.eth_gw = $('#eth_gw').val()
        data.eth_dns1 = $('#eth_dns1').val()
        data.eth_dns2 = $('#eth_dns2').val()
      }
    } else {
      data.wifi_ap_config = {}
      data.wifi_ap_config.channel = ap_wifi_channel
    }
  } else {
    data.remote_cfg_use = $('#remote_cfg-use').prop('checked')
    let remote_cfg_base_url = $('#remote_cfg-base_url').val()
    if (remote_cfg_base_url.length < 10) {  // Min URL: "http://a.b"
      data.remote_cfg_url = ''
    } else {
      data.remote_cfg_url = remote_cfg_base_url
    }
    if ($('#remote_cfg-use_auth').prop('checked')) {
      let remote_cfg_auth_type = $('input[name=\'remote_cfg_auth_type\']:checked').val()
      if (remote_cfg_auth_type === 'remote_cfg_auth_type_basic') {
        data.remote_cfg_auth_type = REMOTE_CFG_AUTH_TYPE.BASIC
        data.remote_cfg_auth_basic_user = $('#remote_cfg-auth_basic-user').val()
        let remote_cfg_auth_basic_password = $('#remote_cfg-auth_basic-password')
        if (!input_password_is_saved(remote_cfg_auth_basic_password)) {
          data.remote_cfg_auth_basic_pass = remote_cfg_auth_basic_password.val()
        }
      } else if (remote_cfg_auth_type === 'remote_cfg_auth_type_bearer') {
        data.remote_cfg_auth_type = REMOTE_CFG_AUTH_TYPE.BEARER
        if (!flagUseSavedRemoteCfgAuthBearerToken) {
          data.remote_cfg_auth_bearer_token = $('#remote_cfg-auth_bearer-token').val()
        }
      }
    } else {
      data.remote_cfg_auth_type = REMOTE_CFG_AUTH_TYPE.NO
    }

    data.use_http = $('#use_http_ruuvi').prop('checked') || $('#use_http').prop('checked')
    data.http_url = $('#http_url').val()
    data.http_user = $('#http_user').val()
    let http_pass = $('#http_pass')
    if (!input_password_is_saved(http_pass)) {
      data.http_pass = http_pass.val()
    }

    data.use_http_stat = $('#use_http_stat_ruuvi').prop('checked') || $('#use_http_stat').prop('checked')
    data.http_stat_url = $('#http_stat_url').val()
    data.http_stat_user = $('#http_stat_user').val()
    let http_stat_pass = $('#http_stat_pass')
    if (!input_password_is_saved(http_stat_pass)) {
      data.http_stat_pass = http_stat_pass.val()
    }

    data.use_mqtt = $('#use_mqtt')[0].checked

    data.mqtt_disable_retained_messages = $('#mqtt_disable_retained_messages')[0].checked
    let mqtt_transport = $('input[name=\'mqtt_transport\']:checked').val()
    if (mqtt_transport === 'mqtt_transport_TCP') {
      data.mqtt_transport = MQTT_TRANSPORT_TYPE.TCP
    } else if (mqtt_transport === 'mqtt_transport_SSL') {
      data.mqtt_transport = MQTT_TRANSPORT_TYPE.SSL
    } else if (mqtt_transport === 'mqtt_transport_WS') {
      data.mqtt_transport = MQTT_TRANSPORT_TYPE.WS
    } else if (mqtt_transport === 'mqtt_transport_WSS') {
      data.mqtt_transport = MQTT_TRANSPORT_TYPE.WSS
    } else {
      data.mqtt_transport = MQTT_TRANSPORT_TYPE.TCP
    }

    data.mqtt_server = $('#mqtt_server').val()
    let mqtt_port = parseInt($('#mqtt_port').val())
    if (Number.isNaN(mqtt_port)) {
      mqtt_port = 0
    }
    data.mqtt_port = mqtt_port
    data.mqtt_prefix = get_mqtt_topic_prefix()
    data.mqtt_client_id = $('#mqtt_client_id').val()
    if (!data.mqtt_client_id) {
      data.mqtt_client_id = gw_mac
    }
    data.mqtt_user = $('#mqtt_user').val()
    let mqtt_pass = $('#mqtt_pass')
    if (!input_password_is_saved(mqtt_pass)) {
      data.mqtt_pass = mqtt_pass.val()
    }

    if (g_flag_lan_auth_pass_changed) {
      data.lan_auth_type = $('input[name=\'lan_auth_type\']:checked').val()
      let lan_auth_user = $('#lan_auth-user').val()
      let lan_auth_pass = $('#lan_auth-pass').val()
      let realm = 'RuuviGateway' + gw_mac.substring(12, 14) + gw_mac.substring(15, 17)
      if (data.lan_auth_type === LAN_AUTH_TYPE.RUUVI) {
        data.lan_auth_user = lan_auth_user
        data.lan_auth_pass = CryptoJS.MD5(lan_auth_user + ':' + realm + ':' + lan_auth_pass).toString()
      } else if (data.lan_auth_type === LAN_AUTH_TYPE.DIGEST) {
        data.lan_auth_user = lan_auth_user
        let raw_str = lan_auth_user + ':' + realm + ':' + lan_auth_pass
        let auth_path_md5 = CryptoJS.MD5(raw_str)
        data.lan_auth_pass = auth_path_md5.toString()
      } else if (data.lan_auth_type === LAN_AUTH_TYPE.BASIC) {
        data.lan_auth_user = lan_auth_user
        data.lan_auth_pass = btoa(lan_auth_user + ':' + lan_auth_pass)
      } else if (data.lan_auth_type === LAN_AUTH_TYPE.DENY) {
        data.lan_auth_user = null
        data.lan_auth_pass = null
      } else if (data.lan_auth_type === LAN_AUTH_TYPE.ALLOW) {
        data.lan_auth_user = null
        data.lan_auth_pass = null
      } else {
        data.lan_auth_type = LAN_AUTH_TYPE.DEFAULT
        data.lan_auth_user = null
        data.lan_auth_pass = null
      }
    }
    if (!flagUseSavedLanAuthApiKey) {
      if ($('#settings_lan_auth-use_api_key')[0].checked) {
        data.lan_auth_api_key = $('#lan_auth-api_key').val()
      } else {
        data.lan_auth_api_key = ''
      }
    }
    if (!flagUseSavedLanAuthApiKeyRW) {
      if ($('#settings_lan_auth-use_api_key_rw')[0].checked) {
        data.lan_auth_api_key_rw = $('#lan_auth-api_key_rw').val()
      } else {
        data.lan_auth_api_key_rw = ''
      }
    }

    data.company_use_filtering = ($('input[name=\'company_use_filtering\']:checked').val() !== '0')

    data.scan_coded_phy = $('#scan_coded_phy')[0].checked
    data.scan_1mbit_phy = $('#scan_1mbit_phy')[0].checked
    data.scan_extended_payload = $('#scan_extended_payload')[0].checked
    data.scan_channel_37 = $('#scan_channel_37')[0].checked
    data.scan_channel_38 = $('#scan_channel_38')[0].checked
    data.scan_channel_39 = $('#scan_channel_39')[0].checked

    if (auto_update_cycle === 'auto_update_cycle-regular') {
      data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.REGULAR
    } else if (auto_update_cycle === 'auto_update_cycle-beta') {
      data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.BETA_TESTER
    } else if (auto_update_cycle === 'auto_update_cycle-manual') {
      data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.MANUAL
    } else {
      console.log(log_wrap('Unknown auto_update_cycle: ' + auto_update_cycle))
      data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.REGULAR
    }
    data.auto_update_weekdays_bitmask = 0
    if ($('#conf-auto_update_schedule-button-sunday').is(':checked')) {
      data.auto_update_weekdays_bitmask |= 0x01
    }
    if ($('#conf-auto_update_schedule-button-monday').is(':checked')) {
      data.auto_update_weekdays_bitmask |= 0x02
    }
    if ($('#conf-auto_update_schedule-button-tuesday').is(':checked')) {
      data.auto_update_weekdays_bitmask |= 0x04
    }
    if ($('#conf-auto_update_schedule-button-wednesday').is(':checked')) {
      data.auto_update_weekdays_bitmask |= 0x08
    }
    if ($('#conf-auto_update_schedule-button-thursday').is(':checked')) {
      data.auto_update_weekdays_bitmask |= 0x10
    }
    if ($('#conf-auto_update_schedule-button-friday').is(':checked')) {
      data.auto_update_weekdays_bitmask |= 0x20
    }
    if ($('#conf-auto_update_schedule-button-saturday').is(':checked')) {
      data.auto_update_weekdays_bitmask |= 0x40
    }
    data.auto_update_interval_from = parseInt($('#conf-auto_update_schedule-period_from').val())
    data.auto_update_interval_to = parseInt($('#conf-auto_update_schedule-period_to').val())
    data.auto_update_tz_offset_hours = parseInt($('#conf-auto_update_schedule-tz').val())

    let ntp_sync = $('input[name=\'ntp_sync\']:checked').val()
    if (ntp_sync === 'ntp_sync_default' || ntp_sync === 'ntp_sync_custom') {
      data.ntp_use = true
      data.ntp_use_dhcp = false
      data.ntp_server1 = $('#ntp_server1').val()
      data.ntp_server2 = $('#ntp_server2').val()
      data.ntp_server3 = $('#ntp_server3').val()
      data.ntp_server4 = $('#ntp_server4').val()
    } else if (ntp_sync === 'ntp_sync_dhcp') {
      data.ntp_use = true
      data.ntp_use_dhcp = true
    } else if (ntp_sync === 'ntp_sync_disabled') {
      data.ntp_use = false
    }
  }

  let data_encrypted = ruuvi_edch_encrypt(JSON.stringify(data))

  console.log(log_wrap('ajax: POST /ruuvi.json'))
  $.ajax({
    url: '/ruuvi.json',
    dataType: 'json',
    contentType: 'application/json',
    method: 'POST',
    cache: false,
    headers: { 'ruuvi_ecdh_encrypted': true },
    data: data_encrypted,
    success: function (data, text) {
      console.log(log_wrap('ajax: POST /ruuvi.json: success'))
      console.log(log_wrap('Start periodic status check'))
      if (flag_save_network_cfg) {
        startCheckStatus()
      }
      if (cb_on_success) {
        cb_on_success()
      }
    },
    error: function (request, status, error) {
      console.log(log_wrap('ajax: POST /ruuvi.json: failure' +
        ', status=' + status +
        ', error=' + error))
      let request_status = request.status
      let statusText = request.statusText
      let responseText = request.responseText
      console.log(log_wrap('Start periodic status check'))
      startCheckStatus()
      if (cb_on_error) {
        cb_on_error()
      }
    }
  })
}

function save_config (cb_on_success, cb_on_error) {
  save_config_internal(false, 1, cb_on_success, cb_on_error)
}

function save_network_config (ap_wifi_channel, cb_on_success, cb_on_error) {
  save_config_internal(true, ap_wifi_channel, cb_on_success, cb_on_error)
}

function on_edit_mqtt_settings () {
  let mqtt_use_prefix_ruuvi = $('#use_mqtt_prefix_ruuvi').prop('checked')
  let mqtt_use_prefix_gw_mac = $('#use_mqtt_prefix_gw_mac').prop('checked')
  let mqtt_use_prefix_custom = $('#use_mqtt_prefix_custom').prop('checked')
  let mqtt_prefix_custom = $('#mqtt_prefix_custom').val()

  let mqtt_prefix = get_mqtt_topic_prefix()
  mqtt_prefix += '<SENSOR_MAC_ADDRESS>'

  let mqtt_host = $('#mqtt_server').val()
  let mqtt_port = $('#mqtt_port').val()
  let mqtt_user = $('#mqtt_user').val()
  let mqtt_pass = $('#mqtt_pass').val()
  $('#mqtt_prefix').text(mqtt_prefix)

  let mosquitto_sub_cmd = `mosquitto_sub -h ${mqtt_host} -p ${mqtt_port}`
  if (mqtt_user) {
    mosquitto_sub_cmd += ` -u ${mqtt_user}`
  }
  if (mqtt_pass) {
    mosquitto_sub_cmd += ` -P ${mqtt_pass}`
  }

  let prefix_ruuvi = mqtt_use_prefix_ruuvi ? 'ruuvi' : ''

  {
    let mqtt_example1 = `${prefix_ruuvi}`
    if (mqtt_use_prefix_gw_mac) {
      if (mqtt_example1) {
        mqtt_example1 += '/'
      }
      mqtt_example1 += gw_mac
    }
    if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
      if (mqtt_example1) {
        mqtt_example1 += '/'
      }
      mqtt_example1 += mqtt_prefix_custom
    }
    mqtt_example1 += '/gw_status'
    mqtt_example1 = `"${mqtt_example1}"`
    $('#mqtt_example1').text(`${mosquitto_sub_cmd} -t ${mqtt_example1} -v`)
  }

  {
    let mqtt_example2 = `${prefix_ruuvi}`
    if (mqtt_use_prefix_gw_mac) {
      if (mqtt_example2) {
        mqtt_example2 += '/'
      }
      mqtt_example2 += '+'
    }
    if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
      if (mqtt_example2) {
        mqtt_example2 += '/'
      }
      mqtt_example2 += '+'
    }
    mqtt_example2 += '/gw_status'
    mqtt_example2 = `"${mqtt_example2}"`
    $('#mqtt_example2').text(`${mosquitto_sub_cmd} -t ${mqtt_example2} -v`)
  }

  {
    let mqtt_example3 = `${prefix_ruuvi}`
    if (mqtt_use_prefix_gw_mac) {
      if (mqtt_example3) {
        mqtt_example3 += '/'
      }
      mqtt_example3 += '+'
    }
    if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
      if (mqtt_example3) {
        mqtt_example3 += '/'
      }
      mqtt_example3 += '+'
    }
    mqtt_example3 += '/<TAG_MAC>/#'
    mqtt_example3 = `"${mqtt_example3}"`
    $('#mqtt_example3').text(`${mosquitto_sub_cmd} -t ${mqtt_example3} -v`)
  }

  {
    let mqtt_example4 = `${prefix_ruuvi}`
    if (mqtt_use_prefix_gw_mac) {
      if (mqtt_example4) {
        mqtt_example4 += '/'
      }
      mqtt_example4 += `${gw_mac}`
    }
    if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
      if (mqtt_example4) {
        mqtt_example4 += '/'
      }
      mqtt_example4 += `${mqtt_prefix_custom}`
    }
    mqtt_example4 += '/#'
    mqtt_example4 = `"${mqtt_example4}"`
    $('#mqtt_example4').text(`${mosquitto_sub_cmd} -t ${mqtt_example4} -v`)
  }

  {
    let mqtt_example5 = `${prefix_ruuvi}`
    if (mqtt_example5) {
      mqtt_example5 += '/'
    }
    mqtt_example5 += '#'
    mqtt_example5 = `"${mqtt_example5}"`
    $('#mqtt_example5').text(`${mosquitto_sub_cmd} -t ${mqtt_example5} -v`)
  }
}

function buf2hex (buffer) { // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
}

function ruuvi_edch_encrypt (msg) {
  let hash = crypto_browserify.createHash('sha256').update(msg).digest()
  let aes_iv = crypto_browserify.randomBytes(16)
  let aes_cipher = crypto_browserify.createCipheriv('aes-256-cbc', g_aes_key, aes_iv)
  let msg_encrypted = aes_cipher.update(msg, 'utf8', 'base64')
  msg_encrypted += aes_cipher.final('base64')
  return JSON.stringify({
    'encrypted': msg_encrypted,
    'iv': arrayBufferToBase64(aes_iv),
    'hash': arrayBufferToBase64(hash)
  })
}

function on_get_config (data, ecdh_pub_key_srv_b64) {
  g_aes_key = null
  if (ecdh_pub_key_srv_b64) {
    let ecdh_pub_key_srv = crypto_browserify.createECDH('secp256r1')
    ecdh_pub_key_srv.generateKeys()
    let ecdh_pub_key_srv_buf = arrayBufferFromBase64(ecdh_pub_key_srv_b64)
    console.log(log_wrap(`ECDH PubKey(Srv): ${buf2hex(ecdh_pub_key_srv_buf)}`))
    ecdh_pub_key_srv.setPublicKey(ecdh_pub_key_srv_buf)
    let shared_secret = g_ecdh.computeSecret(ecdh_pub_key_srv.getPublicKey())
    // console.log(log_wrap(`Shared secret: ${buf2hex(shared_secret)}`));
    g_aes_key = crypto_browserify.createHash('sha256').update(shared_secret).digest()
    // console.log(log_wrap(`AES key: ${buf2hex(g_aes_key)}`));
  }

  if (data != null) {
    let use_eth = false
    let remote_cfg_use = false
    let remote_cfg_auth_type = REMOTE_CFG_AUTH_TYPE.NO
    let use_http = false
    let http_url = ''
    let http_user = ''
    let http_stat_user = ''
    let use_http_stat = false
    let http_stat_url = ''
    let use_mqtt = false
    let mqtt_user = ''
    let mqtt_prefix = ''
    let mqtt_client_id = ''
    let ntp_use = true
    let ntp_use_dhcp = false
    let ntp_server1 = ''
    let ntp_server2 = ''
    let ntp_server3 = ''
    let ntp_server4 = ''
    let company_use_filtering = false
    let company_id = 0
    let scan_coded_phy = false
    let scan_1mbit_phy = false
    let scan_extended_payload = false
    let scan_channel_37 = false
    let scan_channel_38 = false
    let scan_channel_39 = false
    const keys = Object.keys(data)
    for (let idx in keys) {
      let key = keys[idx]
      let key_value = data[key]
      switch (key) {
        case 'fw_ver':
          $('#software_update-version-current').text(key_value)
          $('#app-footer-fw_ver').text(key_value)
          break
        case 'nrf52_fw_ver':
          $('#app-footer-fw_ver_nrf52').text(key_value)
          break
        case 'gw_mac':
          gw_mac = key_value
          break
        case 'use_eth':
          use_eth = key_value
          break
        case 'eth_dhcp':
          $('#eth_dhcp').prop('checked', key_value)
          break
        case 'eth_static_ip':
          $('#eth_static_ip').val(key_value)
          break
        case 'eth_netmask':
          $('#eth_netmask').val(key_value)
          break
        case 'eth_gw':
          $('#eth_gw').val(key_value)
          break
        case 'eth_dns1':
          $('#eth_dns1').val(key_value)
          break
        case 'eth_dns2':
          $('#eth_dns2').val(key_value)
          break
        case 'remote_cfg_use':
          remote_cfg_use = key_value
          break
        case 'remote_cfg_url':
          $('#remote_cfg-base_url').val(key_value)
          break
        case 'remote_cfg_auth_type':
          remote_cfg_auth_type = key_value
          break
        case 'remote_cfg_auth_basic_user':
          $('#remote_cfg-auth_basic-user').val(key_value)
          break
        case 'remote_cfg_refresh_interval_minutes':
          // this parameter is not used in UI
          break
        case 'use_http':
          use_http = key_value
          break
        case 'http_url':
          $('#http_url').val(key_value)
          http_url = key_value
          break
        case 'http_user':
          $('#http_user').val(key_value)
          http_user = key_value
          break
        case 'use_http_stat':
          use_http_stat = key_value
          break
        case 'http_stat_url':
          $('#http_stat_url').val(key_value)
          http_stat_url = key_value
          break
        case 'http_stat_user':
          $('#http_stat_user').val(key_value)
          http_stat_user = key_value
          break
        case 'use_mqtt':
          $('#use_mqtt').prop('checked', key_value)
          use_mqtt = key_value
          break
        case 'mqtt_disable_retained_messages':
          $('#mqtt_disable_retained_messages').prop('checked', key_value)
          break
        case 'mqtt_transport':
          if (key_value === MQTT_TRANSPORT_TYPE.TCP) {
            $('#mqtt_transport_TCP').prop('checked', true)
          } else if (key_value === MQTT_TRANSPORT_TYPE.SSL) {
            $('#mqtt_transport_SSL').prop('checked', true)
          } else if (key_value === MQTT_TRANSPORT_TYPE.WS) {
            $('#mqtt_transport_WS').prop('checked', true)
          } else if (key_value === MQTT_TRANSPORT_TYPE.WSS) {
            $('#mqtt_transport_WSS').prop('checked', true)
          }
          break
        case 'mqtt_server':
          if (key_value) {
            $('#mqtt_server').val(key_value)
          }
          break
        case 'mqtt_port':
          if (key_value) {
            $('#mqtt_port').val(key_value)
          }
          break
        case 'mqtt_user':
          $('#mqtt_user').val(key_value)
          mqtt_user = key_value
          break
        case 'mqtt_prefix':
          mqtt_prefix = key_value
          break
        case 'mqtt_client_id':
          mqtt_client_id = key_value
          break
        case 'lan_auth_type':
          if (key_value === LAN_AUTH_TYPE.DENY) {
            $('#lan_auth_type_deny').prop('checked', true)
          } else if (key_value === LAN_AUTH_TYPE.RUUVI) {
            $('#lan_auth_type_ruuvi').prop('checked', true)
          } else if (key_value === LAN_AUTH_TYPE.DIGEST) {
            $('#lan_auth_type_digest').prop('checked', true)
          } else if (key_value === LAN_AUTH_TYPE.BASIC) {
            $('#lan_auth_type_basic').prop('checked', true)
          } else if (key_value === LAN_AUTH_TYPE.ALLOW) {
            $('#lan_auth_type_allow').prop('checked', true)
          } else {
            $('#lan_auth_type_default').prop('checked', true)
          }
          $('input#lan_auth-pass').attr('placeholder', '********')
          break
        case 'lan_auth_user': {
          let lan_auth_user = $('#lan_auth-user')
          let lan_auth_pass = $('#lan_auth-pass')
          let input_password_eye = lan_auth_pass.parent().children('.input-password-eye')
          if (key_value) {
            lan_auth_user.val(key_value)
            lan_auth_pass.val('')
            lan_auth_pass.attr('placeholder', '********')
            input_password_eye.addClass('disabled')
            g_flag_lan_auth_pass_changed = false
          } else {
            lan_auth_user.val('')
            lan_auth_pass.val('')
            lan_auth_pass.removeAttr('placeholder')
            input_password_eye.removeClass('disabled')
            g_flag_lan_auth_pass_changed = true
          }
          break
        }
        case 'lan_auth_api_key_use': {
          $('#settings_lan_auth-use_api_key').prop('checked', key_value)
          if (key_value) {
            $('#lan_auth-api_key').attr('placeholder', '********')
            flagUseSavedLanAuthApiKey = true
          }
          break
        }
        case 'lan_auth_api_key_rw_use': {
          $('#settings_lan_auth-use_api_key_rw').prop('checked', key_value)
          if (key_value) {
            $('#lan_auth-api_key_rw').attr('placeholder', '********')
            flagUseSavedLanAuthApiKeyRW = true
          }
          break
        }
        case 'auto_update_cycle': {
          if (key_value === AUTO_UPDATE_CYCLE_TYPE.REGULAR) {
            $('#auto_update_cycle-regular').prop('checked', true)
          } else if (key_value === AUTO_UPDATE_CYCLE_TYPE.BETA_TESTER) {
            $('#auto_update_cycle-beta').prop('checked', true)
          } else if (key_value === AUTO_UPDATE_CYCLE_TYPE.MANUAL) {
            $('#auto_update_cycle-manual').prop('checked', true)
          } else {
            $('#auto_update_cycle-regular').prop('checked', true)
          }
          break
        }
        case 'auto_update_weekdays_bitmask': {
          let weekdays_bitmask = parseInt(key_value)
          $('#conf-auto_update_schedule-button-sunday').prop('checked', (weekdays_bitmask & 0x01) !== 0).change()
          $('#conf-auto_update_schedule-button-monday').prop('checked', (weekdays_bitmask & 0x02) !== 0).change()
          $('#conf-auto_update_schedule-button-tuesday').prop('checked', (weekdays_bitmask & 0x04) !== 0).change()
          $('#conf-auto_update_schedule-button-wednesday').prop('checked', (weekdays_bitmask & 0x08) !== 0).change()
          $('#conf-auto_update_schedule-button-thursday').prop('checked', (weekdays_bitmask & 0x10) !== 0).change()
          $('#conf-auto_update_schedule-button-friday').prop('checked', (weekdays_bitmask & 0x20) !== 0).change()
          $('#conf-auto_update_schedule-button-saturday').prop('checked', (weekdays_bitmask & 0x40) !== 0).change()
          break
        }
        case 'auto_update_interval_from': {
          $('#conf-auto_update_schedule-period_from option[value=' + key_value + ']').prop('selected', true)
          break
        }
        case 'auto_update_interval_to': {
          $('#conf-auto_update_schedule-period_to option[value=' + key_value + ']').prop('selected', true)
          break
        }
        case 'auto_update_tz_offset_hours': {
          $('#conf-auto_update_schedule-tz option[value=' + key_value + ']').prop('selected', true)
          break
        }
        case 'ntp_use':
          ntp_use = key_value
          break
        case 'ntp_use_dhcp':
          ntp_use_dhcp = key_value
          break
        case 'ntp_server1':
          ntp_server1 = key_value
          break
        case 'ntp_server2':
          ntp_server2 = key_value
          break
        case 'ntp_server3':
          ntp_server3 = key_value
          break
        case 'ntp_server4':
          ntp_server4 = key_value
          break
        case 'company_use_filtering':
          company_use_filtering = key_value
          break
        case 'company_id':
          company_id = parseInt(key_value)
          break
        case 'scan_coded_phy':
          scan_coded_phy = key_value
          break
        case 'scan_1mbit_phy':
          scan_1mbit_phy = key_value
          $('#scan_1mbit_phy').prop('checked', key_value)
          break
        case 'scan_extended_payload':
          scan_extended_payload = key_value
          $('#scan_extended_payload').prop('checked', key_value)
          break
        case 'scan_channel_37':
          scan_channel_37 = key_value
          $('#scan_channel_37').prop('checked', key_value)
          break
        case 'scan_channel_38':
          scan_channel_38 = key_value
          $('#scan_channel_38').prop('checked', key_value)
          break
        case 'scan_channel_39':
          scan_channel_39 = key_value
          $('#scan_channel_39').prop('checked', key_value)
          break
        case 'coordinates':
          $('#coordinates').val(key_value)
          break
        case 'wifi_ap_config':
          break
        case 'wifi_sta_config':
          break
        default:
          alert('get_config: unhandled key: ' + key)
          break
      }
    }
    if (use_eth) {
      $('#network_type_wifi').prop('checked', false)
      $('#network_type_cable').prop('checked', true)
    } else {
      $('#network_type_cable').prop('checked', false)
      $('#network_type_wifi').prop('checked', true)
    }
    if ($('#eth_netmask').val() === '') {
      $('#eth_netmask').val('255.255.255.0')
    }

    $('#remote_cfg-use').prop('checked', remote_cfg_use)
    if (remote_cfg_auth_type === REMOTE_CFG_AUTH_TYPE.NO) {
      $('#remote_cfg-use_auth').prop('checked', false)
    } else if (remote_cfg_auth_type === REMOTE_CFG_AUTH_TYPE.BASIC) {
      $('#remote_cfg-use_auth').prop('checked', true)
      $('#remote_cfg_auth_type_basic').prop('checked', true)
      input_password_set_use_saved($('#remote_cfg-auth_basic-password'))
    } else if (remote_cfg_auth_type === REMOTE_CFG_AUTH_TYPE.BEARER) {
      $('#remote_cfg-use_auth').prop('checked', true)
      $('#remote_cfg_auth_type_bearer').prop('checked', true)
      flagUseSavedRemoteCfgAuthBearerToken = true
      $('#remote_cfg-auth_bearer-token').attr('placeholder', '********')
    }

    $('#ntp_server1').val(ntp_server1)
    $('#ntp_server2').val(ntp_server2)
    $('#ntp_server3').val(ntp_server3)
    $('#ntp_server4').val(ntp_server4)

    if (ntp_use) {
      if (ntp_use_dhcp) {
        $('#ntp_sync_dhcp').prop('checked', true)
      } else {
        if (ntp_server1 === NTP_DEFAULT.SERVER1 &&
          ntp_server2 === NTP_DEFAULT.SERVER2 &&
          ntp_server3 === NTP_DEFAULT.SERVER3 &&
          ntp_server4 === NTP_DEFAULT.SERVER4) {
          $('#ntp_sync_default').prop('checked', true)
        } else {
          $('#ntp_sync_custom').prop('checked', true)
        }
      }
    } else {
      $('#ntp_sync_disabled').prop('checked', true)
    }

    let flag_use_http_ruuvi_cloud = (use_http && (http_url === HTTP_URL_DEFAULT) && (http_user === ''))

    if (use_http) {
      if (flag_use_http_ruuvi_cloud) {
        $('#use_http_ruuvi').prop('checked', true)
        $('#use_http').prop('checked', false)
        $('#use_http').prop('disabled', true)
      } else {
        $('#use_http').prop('checked', true)
        $('#use_http_ruuvi').prop('checked', false)
        $('#use_http_ruuvi').prop('disabled', true)
      }
    } else {
      $('#use_http_ruuvi').prop('checked', false)
      $('#use_http').prop('checked', false)
    }

    let flag_use_http_stat_ruuvi = (use_http_stat && (http_stat_url === HTTP_STAT_URL_DEFAULT) && (http_user === ''))
    if (use_http_stat) {
      if (flag_use_http_stat_ruuvi) {
        $('#use_http_stat_ruuvi').prop('checked', true)
      } else {
        $('#use_http_stat').prop('checked', true)
      }
    } else {
      $('#use_http_stat_no').prop('checked', true)
    }

    let flag_use_ruuvi_cloud_with_default_options = !use_mqtt &&
      (use_http && flag_use_http_ruuvi_cloud) &&
      (use_http_stat && flag_use_http_stat_ruuvi) &&
      (ntp_use && !ntp_use_dhcp && (ntp_server1 === NTP_DEFAULT.SERVER1 &&
        ntp_server2 === NTP_DEFAULT.SERVER2 &&
        ntp_server3 === NTP_DEFAULT.SERVER3 &&
        ntp_server4 === NTP_DEFAULT.SERVER4)) &&
      (company_use_filtering && (company_id === 0x0499) &&
        !scan_coded_phy && scan_1mbit_phy && scan_extended_payload &&
        scan_channel_37 && scan_channel_38 && scan_channel_39)
    if (flag_use_ruuvi_cloud_with_default_options) {
      $('#use_custom').prop('checked', false)
      $('#use_ruuvi').prop('checked', true)
    } else {
      $('#use_ruuvi').prop('checked', false)
      $('#use_custom').prop('checked', true)
    }

    if (http_user) {
      input_password_set_use_saved($('#http_pass'))
    }
    if (http_stat_user) {
      input_password_set_use_saved($('#http_stat_pass'))
    }
    if (mqtt_user) {
      input_password_set_use_saved($('#mqtt_pass'))
    }

    $('#scan_coded_phy').prop('checked', scan_coded_phy)
    if (!company_use_filtering) {
      $(`input:radio[name='company_use_filtering'][value='0']`).prop('checked', true)
    } else {
      if (scan_coded_phy) {
        $(`input:radio[name='company_use_filtering'][value='2']`).prop('checked', true)
      } else {
        $(`input:radio[name='company_use_filtering'][value='1']`).prop('checked', true)
      }
      $('#scan_1mbit_phy').prop('checked', true)
      $('#scan_extended_payload').prop('checked', true)
      $('#scan_channel_37').prop('checked', true)
      $('#scan_channel_38').prop('checked', true)
      $('#scan_channel_39').prop('checked', true)
    }
    if (!mqtt_prefix) {
      $('#use_mqtt_prefix_ruuvi').prop('checked', false)
      $('#use_mqtt_prefix_gw_mac').prop('checked', false)
      $('#use_mqtt_prefix_custom').prop('checked', false)
    } else {
      let start_idx = 0
      let prefix_ruuvi = 'ruuvi'
      let mqtt_topic = mqtt_prefix
      if ((mqtt_topic === prefix_ruuvi) || mqtt_topic.startsWith(prefix_ruuvi + '/')) {
        $('#use_mqtt_prefix_ruuvi').prop('checked', true)
        start_idx = prefix_ruuvi.length
        if (mqtt_topic[start_idx] === '/') {
          start_idx += 1
        }
      } else {
        $('#use_mqtt_prefix_ruuvi').prop('checked', false)
      }
      mqtt_topic = mqtt_topic.substring(start_idx)
      start_idx = 0
      if ((mqtt_topic === gw_mac) || mqtt_topic.startsWith(gw_mac + '/')) {
        $('#use_mqtt_prefix_gw_mac').prop('checked', true)
        start_idx = gw_mac.length
        if (mqtt_topic[start_idx] === '/') {
          start_idx += 1
        }
      } else {
        $('#use_mqtt_prefix_gw_mac').prop('checked', false)
      }
      mqtt_topic = mqtt_topic.substring(start_idx)
      if (mqtt_topic.length > 0) {
        if (mqtt_topic.slice(-1) === '/') {
          if (mqtt_topic.length > 1) {
            if (/[a-zA-Z0-9]/.test(mqtt_topic.slice(-2, -1))) {
              mqtt_topic = mqtt_topic.slice(0, -1)
            }
          }
        }
      }
      $('#mqtt_prefix_custom').val(mqtt_topic)
      if (mqtt_topic.length > 0) {
        $('#use_mqtt_prefix_custom').prop('checked', true)
      } else {
        $('#use_mqtt_prefix_custom').prop('checked', false)
      }
    }
    if (!mqtt_client_id) {
      mqtt_client_id = gw_mac
    }
    $('#mqtt_client_id').val(mqtt_client_id)
    on_edit_mqtt_settings()
  }
}

function arrayBufferToBase64 (arrayBuffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
}

function arrayBufferFromBase64 (base64_string) {
  return Uint8Array.from(atob(base64_string), c => c.charCodeAt(0))
}

function get_config () {
  g_ecdh = crypto_browserify.createECDH('secp256r1')
  let pub_key = g_ecdh.generateKeys()
  console.log(log_wrap(`ECDH PubKey(Cli): ${buf2hex(pub_key)}`))
  console.log(log_wrap('GET /ruuvi.json'))
  $.ajax({
      method: 'GET',
      url: '/ruuvi.json',
      accept: 'application/json, text/plain, */*',
      dataType: 'json',
      cache: false,
      headers: { 'ruuvi_ecdh_pub_key': arrayBufferToBase64(pub_key) },
      success: function (data, textStatus, request) {
        console.log(log_wrap('GET /ruuvi.json: success'))
        on_get_config(data, request.getResponseHeader('ruuvi_ecdh_pub_key'))

        // first time the page loads: attempt get the connection status
        console.log(log_wrap('Start periodic status check'))
        startCheckStatus()
      },
      error: function (request, status, error) {
        console.log(log_wrap('ajax: GET /ruuvi.json: failure' +
          ', status=' + status +
          ', error=' + error))
      }
    }
  )
}

$(document).ready(function () {
  console.log('ruuvi.js: Ready')
})

$(window).on('load', function () {
  console.log(log_wrap('ruuvi.js: Loaded'))
  //get configuration from flash and fill the web page
  get_config()
})

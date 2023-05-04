/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiInputPassword from './gui_input_password.mjs'
import GuiInputText from './gui_input_text.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import gui_loading from './gui_loading.mjs'
import { log_wrap, networkConnect, networkDisconnect } from './utils.mjs'
import GwStatus from './gw_status.mjs'
import GwAP from './gw_ap.mjs'
import Network from './network.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import Navigation from './navigation.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiButton from './gui_button.mjs'

export class PageWiFiConnection {
  #gwCfg
  #auth
  #section = $('section#page-wifi_connection')
  #button_sort_order_by_name = new GuiButton($('#wifi_connection-sort_order-by_name'))
  #button_sort_order_by_rssi = new GuiButton($('#wifi_connection-sort_order-by_rssi'))
  #input_ssid = new GuiInputText($('section#page-wifi_connection input#manual_ssid'))
  #input_password_wifi = new GuiInputPassword($('input#pwd'), true)
  #radio_wifi_name = new GuiRadioButton('wifi-name')
  #radio_wifi_name_manual
  #sect_advanced = new GuiSectAdvanced($('#page-wifi_connection-advanced-button'))
  #button_continue = new GuiButtonContinue($('#page-wifi_connection-button-continue'))
  #button_back = new GuiButtonBack($('#page-wifi_connection-button-back'))
  #apList = null
  #flag_sort_by_rssi = false
  #flag_initial_refresh = false

  constructor (gwCfg, auth) {
    this.#gwCfg = gwCfg
    this.#auth = auth

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#onChangeSortByRSSI(false)

    this.#button_sort_order_by_name.on_click(() => this.#onChangeSortByRSSI(false))
    this.#button_sort_order_by_rssi.on_click(() => this.#onChangeSortByRSSI(true))

    this.#input_ssid.on_change(() => this.#onKeyupInputSSID())
    this.#input_password_wifi.on_change(() => this.#onKeyupInputPassword())

    this.#radio_wifi_name_manual = this.#radio_wifi_name.addOption('', false)
    this.#radio_wifi_name_manual.on_click(() => this.#onClickRadioButtonWiFiManual())

    this.#sect_advanced.on_click(() => this.#onClickButtonAdvanced())
    this.#button_continue.on_click(() => this.#onClickButtonContinue())
  }

  #onShow () {
    console.log(log_wrap('section#page-wifi_connection: onShow'))

    gui_loading.bodyClassLoadingAdd()
    this.#checkAndUpdatePageWiFiListButtonNext()
    $('#page-wifi_connection-ssid_password').hide()
    networkDisconnect().then(() => {
    }).catch((err) => {
      console.log(log_wrap(`networkDisconnect error: ${err}`))
    }).finally(() => {
      this.#flag_initial_refresh = true
      GwAP.startRefreshingAP(0, (data) => {this.#refreshAPHTML(data)})
    })
  }

  #onHide () {
    console.log(log_wrap('section#page-wifi_connection: onHide'))
    this.#button_continue.enable()
    $('#page-wifi_connection-ssid_password').hide()
    $('#page-wifi_connection-list_of_ssid').html('')
    GwAP.stopRefreshingAP()
  }

  #onChangeSortByRSSI (flag_sort_by_rssi) {
    this.#flag_sort_by_rssi = flag_sort_by_rssi
    if (flag_sort_by_rssi) {
      this.#button_sort_order_by_name.removeClass('language-switcher-active')
      this.#button_sort_order_by_rssi.addClass('language-switcher-active')
    } else {
      this.#button_sort_order_by_rssi.removeClass('language-switcher-active')
      this.#button_sort_order_by_name.addClass('language-switcher-active')
    }
    this.#refreshAPHTML(this.#apList)
  }

  #onKeyupInputSSID () {
    $('#wifi-connection-status-block').hide()
    this.#updatePositionOfWiFiPasswordInput()
    this.#checkAndUpdatePageWiFiListButtonNext()
  }

  #onKeyupInputPassword () {
    $('#wifi-connection-status-block').hide()
    this.#updatePositionOfWiFiPasswordInput()
    this.#checkAndUpdatePageWiFiListButtonNext()
  }

  #onClickRadioButtonWiFiManual () {
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
    this.#input_ssid.setVal('')
    this.#input_password_wifi.clear()
    this.#updatePositionOfWiFiPasswordInput()
    this.#checkAndUpdatePageWiFiListButtonNext()
    $('input[name=\'wifi-name\']').parent().removeClass('mouse-cursor-default')
    $('#page-wifi_connection-radio-connect_manually').parent().addClass('mouse-cursor-default')
  }

  #onClickButtonAdvanced () {
    if (!this.#sect_advanced.isHidden()) {
      $('input[name=\'wifi-name\']').prop('checked', false)
      $('#page-wifi_connection-ssid_password').hide()
    }
  }

  async #save_network_config_and_connect_to_wifi (wifi_channel, ssid, password) {
    gui_loading.bodyClassLoadingAdd()
    let isSuccessful = false
    try {
      GwStatus.stopCheckingStatus()
      GwAP.stopRefreshingAP()
      await Network.waitWhileInProgress()
      this.#gwCfg.wifi_ap_cfg.setWiFiChannel(wifi_channel)
      await this.#gwCfg.saveNetworkConfig(this.#auth)
      isSuccessful = await networkConnect(ssid, password, this.#auth)
      console.log(log_wrap(`networkConnect: ${isSuccessful}`))
    } catch (err) {
      console.log(log_wrap(`save_network_config_and_connect_to_wifi failed: ${err}`))
    } finally {
      console.log(log_wrap('Start periodic status check'))
      GwStatus.startCheckingStatus()
      this.#button_continue.enable()
      gui_loading.bodyClassLoadingRemove()
      if (isSuccessful) {
        Navigation.change_page_to_software_update()
      } else {
        $('#wifi-connection-status-block').show()
        this.#updatePositionOfWiFiPasswordInput()
        GwAP.startRefreshingAP()
      }
    }
  }

  #onClickButtonContinue () {
    const selected_wifi_radio_button = $('input[name="wifi-name"]:checked')
    let ssid = ''
    let isAuthNeeded = true
    let wifi_channel = 1
    if (selected_wifi_radio_button[0] && (selected_wifi_radio_button[0].id === 'page-wifi_connection-radio-connect_manually')) {
      ssid = this.#input_ssid.getVal()
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
    let password = !isAuthNeeded ? null : this.#input_password_wifi.getVal()
    this.#button_continue.disable()
    $('#wifi-connection-status-block').hide()
    this.#updatePositionOfWiFiPasswordInput()
    this.#save_network_config_and_connect_to_wifi(wifi_channel, ssid, password).then(() => {})
  }

  #refreshAPHTML (data) {
    if (this.#flag_initial_refresh) {
      this.#flag_initial_refresh = false
      gui_loading.bodyClassLoadingRemove()
    }
    if (data === null) {
      return
    }
    if (GwStatus.isWaitingForNetworkConnection()) {
      return
    }
    if (document.location.hash !== '#page-wifi_connection') {
      return
    }
    console.log(log_wrap('refreshAPHTML'))

    if (data.length > 0) {
      if (this.#flag_sort_by_rssi) {
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
    this.#apList = data

    let is_manual_wifi = false
    let prev_selected_wifi_radio_button = $('input[name="wifi-name"]:checked')
    let prev_selected_wifi_radio_button_has_auth = prev_selected_wifi_radio_button.hasClass('auth')
    let selected_wifi_ssid = prev_selected_wifi_radio_button.val()
    if (prev_selected_wifi_radio_button[0] && (prev_selected_wifi_radio_button[0].id === 'page-wifi_connection-radio-connect_manually')) {
      is_manual_wifi = true
      selected_wifi_ssid = null
    }
    if (!is_manual_wifi && !selected_wifi_ssid) {
      const connectedSSID = GwStatus.getConnectedSSID()
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
    data.forEach((e, idx) => {
      if (idx === 0) {
        h += '<div class="border"></div>'
        h += '\n'
      }
      h += '<div>'
      h += '<label class="control control-radio">'
      h += '    <div style="display: flex">'
      h += `        <div>${e.ssid}</div>`
      h += `        <div style="margin-left: auto;" class="${e.auth === 0 ? '' : 'pw'}"></div>`
      h += `        <div class="${this.#rssiToIcon(e.rssi)}"></div>`
      h += '    </div>'
      h += `    <input value="${e.ssid}" name="wifi-name" type="radio" class="${(e.auth === 0) ? 'no_auth' : 'auth'} wifi_chan_${e.chan}">`
      h += '    <span class="control_indicator"></span>'
      h += '</label>'
      h += '<div class="wifi_password"></div>'
      h += '<div class="border"></div>'
      h += '</div>'
      h += '\n'
    })

    if ($('#page-wifi_connection-list_of_ssid').html() !== h) {
      $('#page-wifi_connection-list_of_ssid').html(h)
      $('div#page-wifi_connection-list_of_ssid label input[name=\'wifi-name\']').change(() => this.#onChangeWiFiName())

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

          this.#input_ssid.setVal(selected_wifi_ssid)

          this.#updatePositionOfWiFiPasswordInput(input_id.parent().parent().children('.wifi_password'))
        } else {
          $('#input_password_block').hide()
        }
      }
      if (is_manual_wifi) {
        this.#updatePositionOfWiFiPasswordInput($('#page-wifi_connection-ssid_password-wrap'))
      }
    }
    this.#checkAndUpdatePageWiFiListButtonNext()
  }

  #rssiToIcon (rssi) {
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

  #onChangeWiFiName () {
    let selected_wifi = $('input[name=\'wifi-name\']:checked')
    let ssid = selected_wifi.val()
    let isAuthNeeded = !selected_wifi.hasClass('no_auth')

    this.#input_ssid.setVal(ssid)
    this.#input_password_wifi.clear()

    $('#input_ssid_block').hide()
    if (isAuthNeeded) {
      $('#input_password_block').show()
    } else {
      $('#input_password_block').hide()
    }
    $('#wifi-connection-status-block').hide()

    if (ssid === GwStatus.getConnectedSSID()) {
      this.#input_password_wifi.set_use_saved()
    }

    this.#updatePositionOfWiFiPasswordInput()
    this.#checkAndUpdatePageWiFiListButtonNext()
    $('#page-wifi_connection-radio-connect_manually').parent().removeClass('mouse-cursor-default')
    $('input[name=\'wifi-name\']').parent().removeClass('mouse-cursor-default')
    selected_wifi.parent().addClass('mouse-cursor-default')
  }

  #checkWiFiSSIDAndPassword () {
    let ssid = this.#input_ssid.getVal()
    const selected_wifi_radio_button = $('input[name="wifi-name"]:checked')
    if (!selected_wifi_radio_button || !selected_wifi_radio_button[0]) {
      return false
    }
    if (!ssid) {
      return false
    }
    if (selected_wifi_radio_button[0].id === 'page-wifi_connection-radio-connect_manually') {
      return true
    } else {
      if (this.#input_password_wifi.is_saved()) {
        return true
      }
      if (selected_wifi_radio_button.hasClass('no_auth')) {
        return true
      } else {
        if (this.#input_password_wifi.getVal().length >= 8) {
          return true
        }
      }
    }
  }

  #checkAndUpdatePageWiFiListButtonNext () {
    if (GwStatus.isWaitingForNetworkConnection()) {
      return
    }

    if (this.#checkWiFiSSIDAndPassword()) {
      if (!this.#button_continue.isEnabled()) {
        console.log(log_wrap('page-wifi_connection-button-continue: enable'))
        this.#button_continue.enable()
      }
    } else {
      if (this.#button_continue.isEnabled()) {
        console.log(log_wrap('page-wifi_connection-button-continue: disable'))
        this.#button_continue.disable()
      }
    }
  }

  #updatePositionOfWiFiPasswordInput () {
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

}

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import logger from './logger.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiInputTextWithValidation from './gui_input_text_with_validation.mjs'
import GuiText from './gui_text.mjs'
import { log_wrap, networkConnect, networkDisconnect } from './utils.mjs'
import GwStatus from './gw_status.mjs'
import GwAP from './gw_ap.mjs'
import Network from './network.mjs'
import Navigation from './navigation.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiOverlay from './gui_overlay.mjs'
import GuiButton from "./gui_button.mjs";

export class PageEthernetConnection {
  /** @type GwCfg */
  #gwCfg

  /** @type Auth */
  #auth

  #section = $('section#page-ethernet_connection')
  #buttonContinue = new GuiButtonContinue($('#page-ethernet_connection-button-continue'))
  #buttonBack = new GuiButtonBack($('#page-ethernet_connection-button-back'))
  #checkbox_eth_dhcp = new GuiCheckbox($('#eth_dhcp'))
  #input_eth_static_ip = new GuiInputTextWithValidation($('#eth_static_ip'))
  #input_eth_netmask = new GuiInputTextWithValidation($('#eth_netmask'))
  #input_eth_gw = new GuiInputTextWithValidation($('#eth_gw'))
  #input_eth_dns1 = new GuiInputTextWithValidation($('#eth_dns1'))
  #input_eth_dns2 = new GuiInputTextWithValidation($('#eth_dns2'))
  #subSectionManualSettings = new GuiText($('#page-ethernet_connection-section-manual_settings'))
  #overlay_connect_ethernet = new GuiOverlay($('#overlay-connect_ethernet'))
  #buttonCancelFromOverlayWaitConnection = new GuiButton($('#overlay-connect_ethernet-cancel'))
  #overlay_wait_time_sync = new GuiOverlay($('#overlay-wait_time_sync'))
  #buttonCancelFromOverlayWaitTimeSync = new GuiButton($('#overlay-wait_time_sync-cancel'))
  #overlay_time_sync_failed = new GuiOverlay($('#overlay-time_sync_failed'))
  #buttonContinueFromOverlayTimeSyncFailed = new GuiButton($('#overlay-time_sync_failed-continue'))
  #connectTimeout_ms = 15000;
  #networkConnectAbortController = null
  #flagAbortWaitingConnection = false;

  constructor (gwCfg, auth) {
    this.#gwCfg = gwCfg
    this.#auth = auth

    this.#section.bind('onShow', async () => this.#onShow())
    this.#section.bind('onHide', async () => this.#onHide())

    this.#checkbox_eth_dhcp.on_change(() => this.#onChange_eth_dhcp())

    this.#input_eth_static_ip.on_change(() => this.#ethernet_connection_check_validity())
    this.#input_eth_netmask.on_change(() => this.#ethernet_connection_check_validity())
    this.#input_eth_gw.on_change(() => this.#ethernet_connection_check_validity())
    this.#input_eth_dns1.on_change(() => this.#ethernet_connection_check_validity())
    this.#input_eth_dns2.on_change(() => this.#ethernet_connection_check_validity())

    this.#buttonContinue.on_click(() => this.#onClickButtonContinue())
    this.#buttonCancelFromOverlayWaitConnection.on_click(() => this.#onClickButtonCancelFromOverlayWaitConnection())
  }

  async #onShow () {
    console.log(log_wrap('section#page-ethernet_connection: onShow'))
    this.#buttonCancelFromOverlayWaitTimeSync.on_click(() => this.#onClickButtonCancelFromOverlayWaitTimeSync())
    this.#buttonContinueFromOverlayTimeSyncFailed.on_click(() => this.#onClickButtonContinueFromOverlayTimeSyncFailed())
    this.#checkbox_eth_dhcp.setState(this.#gwCfg.eth.eth_dhcp)
    if (this.#gwCfg.eth.eth_dhcp) {
      this.#subSectionManualSettings.hide()
    } else {
      this.#input_eth_static_ip.setVal(this.#gwCfg.eth.eth_static_ip)
      this.#input_eth_netmask.setVal(this.#gwCfg.eth.eth_netmask)
      this.#input_eth_gw.setVal(this.#gwCfg.eth.eth_gw)
      this.#input_eth_dns1.setVal(this.#gwCfg.eth.eth_dns1)
      this.#input_eth_dns2.setVal(this.#gwCfg.eth.eth_dns2)
      this.#subSectionManualSettings.show()
    }

    this.#ethernet_connection_check_validity()
    networkDisconnect().then(() => {})
  }

  #updateGwCfg () {
    this.#gwCfg.eth.eth_dhcp = this.#checkbox_eth_dhcp.isChecked()
    if (!this.#gwCfg.eth.eth_dhcp) {
      this.#gwCfg.eth.eth_static_ip = this.#input_eth_static_ip.getVal()
      this.#gwCfg.eth.eth_netmask = this.#input_eth_netmask.getVal()
      this.#gwCfg.eth.eth_gw = this.#input_eth_gw.getVal()
      this.#gwCfg.eth.eth_dns1 = this.#input_eth_dns1.getVal()
      this.#gwCfg.eth.eth_dns2 = this.#input_eth_dns2.getVal()
    }
  }

  async #onHide () {
    console.log(log_wrap('section#page-ethernet_connection: onHide'))
    this.#buttonCancelFromOverlayWaitTimeSync.off_click()
    this.#buttonContinueFromOverlayTimeSyncFailed.off_click()
    this.#overlay_connect_ethernet.fadeOut()
    this.#overlay_wait_time_sync.fadeOut()
    $('#page-ethernet_connection-no_cable').hide()
    this.#buttonContinue.enable()
    this.#updateGwCfg()
  }

  #onChange_eth_dhcp () {
    if (this.#checkbox_eth_dhcp.isChecked()) {
      this.#subSectionManualSettings.slideUp()
    } else {
      this.#subSectionManualSettings.slideDown()
    }
    this.#ethernet_connection_check_validity()
  }

  #cbOnConnected() {
    console.log(log_wrap(`cbOnConnected`))
    this.#overlay_connect_ethernet.fadeOut();
    this.#overlay_wait_time_sync.fadeIn();
  }

  async #save_network_config_and_connect_to_ethernet () {
    let isSuccessful = false
    this.#flagAbortWaitingConnection = false;
    this.#networkConnectAbortController = new AbortController()
    try {
      GwStatus.stopCheckingStatus()
      GwAP.stopRefreshingAP()
      await Network.waitWhileInProgress()
      this.#gwCfg.wifi_ap_cfg.setWiFiChannel(1)
      this.#updateGwCfg()
      await this.#gwCfg.saveNetworkConfig(this.#auth)
      isSuccessful = await networkConnect(null, null, this.#auth,
          this.#connectTimeout_ms,
          this.#cbOnConnected.bind(this),
          this.#networkConnectAbortController.signal);
      console.log(log_wrap(`networkConnect: ${isSuccessful}`))
    } catch (err) {
      console.log(log_wrap(`networkConnect failed: ${err}`))
    }
    this.#overlay_connect_ethernet.fadeOut();
    this.#overlay_wait_time_sync.fadeOut();
    logger.info('Start periodic status check')
    GwStatus.startCheckingStatus()
    if (isSuccessful) {
      Navigation.change_page_to_software_update()
    } else {
      if (GwStatus.isWaitingForTimeSync()) {
        this.#overlay_time_sync_failed.fadeIn();
      } else {
        networkDisconnect().then(() => {
        });
        if (!this.#flagAbortWaitingConnection) {
          $('#page-ethernet_connection-no_cable').show();
        }
      }
      this.#buttonContinue.enable()
    }
  }

  #onClickButtonContinue () {
    if (GwStatus.isConnectedAndTimeSynced()) {
      Navigation.change_page_to_software_update();
      return;
    }
    if (GwStatus.isWaitingForTimeSync()) {
      // If the user aborted while waiting for time sync,
      // we can navigate to the Software Update page immediately.
      // However, firmware update checks may fail because the device time
      // may still be invalid.
      Navigation.change_page_to_software_update();
      return;
    }
    this.#buttonContinue.disable();
    $('#page-ethernet_connection-no_cable').hide()

    this.#save_network_config_and_connect_to_ethernet().then(() => {
    });
    this.#overlay_connect_ethernet.fadeIn();
  }

  #onClickButtonCancelFromOverlayWaitConnection() {
    this.#flagAbortWaitingConnection = true;
    this.#networkConnectAbortController.abort();
  }

  #onClickButtonCancelFromOverlayWaitTimeSync() {
    this.#networkConnectAbortController.abort();
  }

  #onClickButtonContinueFromOverlayTimeSyncFailed() {
    this.#overlay_time_sync_failed.fadeOut();
    Navigation.change_page_to_software_update()
  }

  #input_validity_check_by_regex (input_elem, reg_ex, flag_allow_empty) {
    const val = input_elem.getVal()
    if (reg_ex.test(val) || (flag_allow_empty && val === '')) {
      input_elem.setValid()
      return true
    } else {
      input_elem.setInvalid()
      return false
    }
  }

  #ethernet_connection_check_validity () {
    let flag_all_fields_valid = true
    if (!this.#checkbox_eth_dhcp.isChecked()) {
      const ip_addr_check = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/
      {
        if (!this.#input_validity_check_by_regex(this.#input_eth_static_ip, ip_addr_check, false)) {
          flag_all_fields_valid = false
        }
        if (!this.#input_validity_check_by_regex(this.#input_eth_netmask, ip_addr_check, false)) {
          flag_all_fields_valid = false
        }
        if (!this.#input_validity_check_by_regex(this.#input_eth_gw, ip_addr_check, false)) {
          flag_all_fields_valid = false
        }
        if (!this.#input_validity_check_by_regex(this.#input_eth_dns1, ip_addr_check, false)) {
          flag_all_fields_valid = false
        }
        if (!this.#input_validity_check_by_regex(this.#input_eth_dns2, ip_addr_check, true)) {
          flag_all_fields_valid = false
        }
      }
    }
    this.#buttonContinue.setEnabled(flag_all_fields_valid)
  }
}

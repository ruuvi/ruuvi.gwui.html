/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiDiv from './gui_div.mjs'
import GuiInputText from './gui_input_text.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import Navigation from './navigation.mjs'
import { GwCfgNtp } from './gw_cfg_ntp.mjs'

class PageTimeSync {
  /** @type GwCfgNtp */
  #gwCfgNtp

  #section = $('section#page-ntp_config')

  #radio_ntp_sync = new GuiRadioButton('ntp_sync')

  /** @type GuiRadioButtonOption */
  #radio_ntp_sync_default
  /** @type GuiRadioButtonOption */
  #radio_ntp_sync_custom
  /** @type GuiRadioButtonOption */
  #radio_ntp_sync_dhcp
  /** @type GuiRadioButtonOption */
  #radio_ntp_sync_disabled

  #div_custom_options = new GuiDiv($('#page-ntp_config-custom_options'))
  #input_ntp_server1 = new GuiInputText($('#ntp_server1'))
  #input_ntp_server2 = new GuiInputText($('#ntp_server2'))
  #input_ntp_server3 = new GuiInputText($('#ntp_server3'))
  #input_ntp_server4 = new GuiInputText($('#ntp_server4'))

  #button_back = new GuiButtonBack($('#page-ntp_config-button-back'))
  #button_continue = new GuiButtonContinue($('#page-ntp_config-button-continue'))

  /**
   * @param {GwCfgNtp} gwCfgNtp
   */
  constructor (gwCfgNtp) {
    this.#gwCfgNtp = gwCfgNtp

    this.#radio_ntp_sync_default = this.#radio_ntp_sync.addOption('ntp_sync_default', false)
    this.#radio_ntp_sync_custom = this.#radio_ntp_sync.addOption('ntp_sync_custom', false)
    this.#radio_ntp_sync_dhcp = this.#radio_ntp_sync.addOption('ntp_sync_dhcp', false)
    this.#radio_ntp_sync_disabled = this.#radio_ntp_sync.addOption('ntp_sync_disabled', false)

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#radio_ntp_sync_default.on_click(() => this.#onNtpConfigChanged())
    this.#radio_ntp_sync_custom.on_click(() => this.#onNtpConfigChanged())
    this.#radio_ntp_sync_dhcp.on_click(() => this.#onNtpConfigChanged())
    this.#radio_ntp_sync_disabled.on_click(() => this.#onNtpConfigChanged())

    this.#button_continue.on_click(() => Navigation.change_url_scanning())
  }

  #onShow () {
    console.log(log_wrap('section#page-ntp_config: onShow'))
    if (this.#gwCfgNtp.is_default()) {
      this.#radio_ntp_sync_default.setChecked()
    } else if (!this.#gwCfgNtp.ntp_use) {
      this.#radio_ntp_sync_disabled.setChecked()
    } else if (this.#gwCfgNtp.ntp_use_dhcp) {
      this.#radio_ntp_sync_dhcp.setChecked()
    } else {
      this.#radio_ntp_sync_custom.setChecked()
    }

    this.#input_ntp_server1.setVal(this.#gwCfgNtp.ntp_server1)
    this.#input_ntp_server2.setVal(this.#gwCfgNtp.ntp_server2)
    this.#input_ntp_server3.setVal(this.#gwCfgNtp.ntp_server3)
    this.#input_ntp_server4.setVal(this.#gwCfgNtp.ntp_server4)

    this.#onNtpConfigChanged()
  }

  #onHide () {
    console.log(log_wrap('section#page-ntp_config: onHide'))

    if (this.#radio_ntp_sync_default.isChecked()) {
      this.#gwCfgNtp.set_default()
    } else if (this.#radio_ntp_sync_custom.isChecked()) {
      this.#gwCfgNtp.ntp_use = true
      this.#gwCfgNtp.ntp_use_dhcp = false
      this.#gwCfgNtp.ntp_server1 = this.#input_ntp_server1.getVal()
      this.#gwCfgNtp.ntp_server2 = this.#input_ntp_server2.getVal()
      this.#gwCfgNtp.ntp_server3 = this.#input_ntp_server3.getVal()
      this.#gwCfgNtp.ntp_server4 = this.#input_ntp_server4.getVal()
    } else if (this.#radio_ntp_sync_dhcp.isChecked()) {
      this.#gwCfgNtp.ntp_use = true
      this.#gwCfgNtp.ntp_use_dhcp = true
      this.#gwCfgNtp.ntp_server1 = ''
      this.#gwCfgNtp.ntp_server2 = ''
      this.#gwCfgNtp.ntp_server3 = ''
      this.#gwCfgNtp.ntp_server4 = ''
    } else if (this.#radio_ntp_sync_disabled.isChecked()) {
      this.#gwCfgNtp.ntp_use = false
      this.#gwCfgNtp.ntp_use_dhcp = false
      this.#gwCfgNtp.ntp_server1 = ''
      this.#gwCfgNtp.ntp_server2 = ''
      this.#gwCfgNtp.ntp_server3 = ''
      this.#gwCfgNtp.ntp_server4 = ''
    } else {
      throw new Error('Unsupported NTP sync type')
    }
  }

  #onNtpConfigChanged () {
    if (this.#radio_ntp_sync_default.isChecked()) {
      this.#input_ntp_server1.setVal(GwCfgNtp.NTP_DEFAULT.SERVER1)
      this.#input_ntp_server2.setVal(GwCfgNtp.NTP_DEFAULT.SERVER2)
      this.#input_ntp_server3.setVal(GwCfgNtp.NTP_DEFAULT.SERVER3)
      this.#input_ntp_server4.setVal(GwCfgNtp.NTP_DEFAULT.SERVER4)
      this.#div_custom_options.hide()
    } else if (this.#radio_ntp_sync_custom.isChecked()) {
      this.#div_custom_options.show()
    } else {
      this.#input_ntp_server1.setVal('')
      this.#input_ntp_server2.setVal('')
      this.#input_ntp_server3.setVal('')
      this.#input_ntp_server4.setVal('')
      this.#div_custom_options.hide()
    }
  }
}

export default PageTimeSync

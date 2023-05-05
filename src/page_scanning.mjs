/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import GuiDiv from './gui_div.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import Navigation from './navigation.mjs'

class PageScanning {
  /** @type GwCfg */
  #gwCfg

  #section = $('section#page-scanning')

  #radio_company_use_filtering = new GuiRadioButton('company_use_filtering')

  /** @type GuiRadioButtonOption */
  #radio_company_use_filtering_0
  /** @type GuiRadioButtonOption */
  #radio_company_use_filtering_1
  /** @type GuiRadioButtonOption */
  #radio_company_use_filtering_2

  #sect_advanced = new GuiSectAdvanced($('#page-scanning-advanced-button'))

  #div_all_nearby_beacons_scanning_options = new GuiDiv($('#page-scanning-all_nearby_beacons-scanning_options'))
  #checkbox_scan_coded_phy = new GuiCheckbox($('#scan_coded_phy'))
  #checkbox_scan_1mbit_phy = new GuiCheckbox($('#scan_1mbit_phy'))
  #checkbox_scan_extended_payload = new GuiCheckbox($('#scan_extended_payload'))
  #checkbox_scan_channel_37 = new GuiCheckbox($('#scan_channel_37'))
  #checkbox_scan_channel_38 = new GuiCheckbox($('#scan_channel_38'))
  #checkbox_scan_channel_39 = new GuiCheckbox($('#scan_channel_39'))

  #button_back = new GuiButtonBack($('#page-scanning-button-back'))
  #button_continue = new GuiButtonContinue($('#page-scanning-button-continue'))

  /**
   * @param {GwCfg} gwCfg
   */
  constructor (gwCfg) {
    this.#gwCfg = gwCfg

    this.#radio_company_use_filtering_0 = this.#radio_company_use_filtering.addOption('0', false)
    this.#radio_company_use_filtering_1 = this.#radio_company_use_filtering.addOption('1', false)
    this.#radio_company_use_filtering_2 = this.#radio_company_use_filtering.addOption('2', false)

    this.#section.bind('onShow', async () => this.#onShow())
    this.#section.bind('onHide', async () => this.#onHide())

    this.#radio_company_use_filtering_0.on_click(() => this.#on_settings_scan_filtering_changed())
    this.#radio_company_use_filtering_1.on_click(() => this.#on_settings_scan_filtering_changed())
    this.#radio_company_use_filtering_2.on_click(() => this.#on_settings_scan_filtering_changed())

    this.#button_continue.on_click(() => Navigation.change_page_to_finished(11))
  }

  async #onShow () {
    console.log(log_wrap('section#page-scanning: onShow'))

    if (!this.#radio_company_use_filtering_1.isChecked()) {
      this.#sect_advanced.hide()
    } else {
      this.#sect_advanced.show()
    }

    this.#checkbox_scan_coded_phy.setState(this.#gwCfg.scan.scan_coded_phy)

    if (!this.#gwCfg.company_filter.company_use_filtering) {
      this.#radio_company_use_filtering_0.setChecked()
    } else {
      if (this.#gwCfg.scan.scan_coded_phy) {
        this.#radio_company_use_filtering_2.setChecked()
      } else {
        this.#radio_company_use_filtering_1.setChecked()
      }
      this.#checkbox_scan_1mbit_phy.setChecked()
      this.#checkbox_scan_extended_payload.setChecked()
      this.#checkbox_scan_channel_37.setChecked()
      this.#checkbox_scan_channel_38.setChecked()
      this.#checkbox_scan_channel_39.setChecked()
    }

    this.#on_settings_scan_filtering_changed()
  }

  async #onHide () {
    console.log(log_wrap('section#page-scanning: onHide'))

    this.#gwCfg.company_filter.company_use_filtering = !this.#radio_company_use_filtering_0.isChecked()
    this.#gwCfg.scan.scan_coded_phy = this.#checkbox_scan_coded_phy.isChecked()
    this.#gwCfg.scan.scan_1mbit_phy = this.#checkbox_scan_1mbit_phy.isChecked()
    this.#gwCfg.scan.scan_extended_payload = this.#checkbox_scan_extended_payload.isChecked()
    this.#gwCfg.scan.scan_channel_37 = this.#checkbox_scan_channel_37.isChecked()
    this.#gwCfg.scan.scan_channel_38 = this.#checkbox_scan_channel_38.isChecked()
    this.#gwCfg.scan.scan_channel_39 = this.#checkbox_scan_channel_39.isChecked()
  }

  #on_settings_scan_filtering_changed () {
    if (this.#radio_company_use_filtering_0.isChecked()) {
      this.#div_all_nearby_beacons_scanning_options.show()
    } else if (this.#radio_company_use_filtering_1.isChecked()) {
      this.#div_all_nearby_beacons_scanning_options.hide()
      this.#checkbox_scan_coded_phy.setUnchecked()
      this.#checkbox_scan_1mbit_phy.setChecked()
      this.#checkbox_scan_extended_payload.setChecked()
      this.#checkbox_scan_channel_37.setChecked()
      this.#checkbox_scan_channel_38.setChecked()
      this.#checkbox_scan_channel_38.setChecked()
    } else if (this.#radio_company_use_filtering_2.isChecked()) {
      this.#div_all_nearby_beacons_scanning_options.hide()
      this.#checkbox_scan_coded_phy.setChecked()
      this.#checkbox_scan_1mbit_phy.setChecked()
      this.#checkbox_scan_extended_payload.setChecked()
      this.#checkbox_scan_channel_37.setChecked()
      this.#checkbox_scan_channel_38.setChecked()
      this.#checkbox_scan_channel_39.setChecked()
    } else {
      throw new Error('Unsupported scan_filtering')
    }
  }
}

export default PageScanning

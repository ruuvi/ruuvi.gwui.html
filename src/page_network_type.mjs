import $ from 'jquery'
import Navigation from './navigation.mjs'
import GuiButton from './gui_button.mjs'
import GuiText from './gui_text.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import { log_wrap } from './utils.mjs'
import GuiButtonBack from './gui_button_back.mjs'

export class PageNetworkType {
  #flagAccessFromLAN
  #gwCfgEth
  #section = $('section#page-network_type')
  #text_access_from_lan = new GuiText($('#page-network_type-access_from_lan'))
  #button_continue = new GuiButton($('section#page-network_type #page-network_type-button-continue'))
  #button_skip = new GuiButton($('section#page-network_type #page-network_type-button-skip'))
  #radio_network_type = new GuiRadioButton('network_type')
  #buttonBack = new GuiButtonBack($('#page-network_type-button-back'))
  #radio_network_type_cable
  #radio_network_type_wifi

  constructor (flagAccessFromLAN, gwCfgEth) {
    this.#flagAccessFromLAN = flagAccessFromLAN
    this.#gwCfgEth = gwCfgEth

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#button_continue.on_click(() => this.#onClickButtonContinue())
    this.#button_skip.on_click(() => this.#onClickButtonSkip())
  }

  #onShow () {
    console.log(log_wrap('section#page-network_type: onShow'))
    this.#radio_network_type_cable = this.#radio_network_type.addOption('cable', this.#gwCfgEth.use_eth)
    this.#radio_network_type_wifi = this.#radio_network_type.addOption('wifi', !this.#gwCfgEth.use_eth)

    if (this.#flagAccessFromLAN) {
      this.#radio_network_type.disable()
      this.#text_access_from_lan.show()
      this.#button_skip.show()
      this.#button_continue.hide()
    } else {
      this.#radio_network_type.enable()
      this.#text_access_from_lan.hide()
      this.#button_skip.hide()
      this.#button_continue.show()
    }
  }

  #onHide () {
    console.log(log_wrap('section#page-network_type: onHide'))
    this.#gwCfgEth.use_eth = this.#radio_network_type_cable.isChecked()
  }

  #onClickButtonContinue () {
    if (this.#radio_network_type_wifi.isChecked()) {
      Navigation.change_page_to_wifi_connection()
    } else {
      Navigation.change_page_to_ethernet_connection()
    }
  }

  #onClickButtonSkip () {
    Navigation.change_page_to_software_update()
  }
}

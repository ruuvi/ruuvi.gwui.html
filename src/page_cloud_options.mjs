import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import { GwCfg } from './gw_cfg.mjs'
import { GwCfgHttp } from './gw_cfg_http.mjs'
import { GwCfgHttpStat } from './gw_cfg_http_stat.mjs'
import { GwCfgCompanyFilter } from './gw_cfg_company_filter.mjs'
import { GwCfgMqtt } from './gw_cfg_mqtt.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import Navigation from './navigation.mjs'

class PageCloudOptions {
  /** @type GwCfg */
  #gwCfg

  #section = $('section#page-cloud_options')
  #radio_connection_type = new GuiRadioButton('connection_type')

  /** @type GuiRadioButtonOption */
  #radio_connection_type_ruuvi
  /** @type GuiRadioButtonOption */
  #radio_connection_type_custom

  #sect_advanced = new GuiSectAdvanced($('#page-cloud_options-advanced-button'))

  #button_continue = new GuiButtonContinue($('#page-cloud_options-button-continue'))
  #button_back = new GuiButtonBack($('#page-cloud_options-button-back'))

  /**
   * @param {GwCfg} gwCfg
   */
  constructor (gwCfg) {
    this.#gwCfg = gwCfg

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#radio_connection_type_ruuvi = this.#radio_connection_type.addOption('ruuvi', false)
    this.#radio_connection_type_custom = this.#radio_connection_type.addOption('custom', false)

    this.#radio_connection_type_ruuvi.on_click(() => this.#onChangeConnectionType())
    this.#radio_connection_type_custom.on_click(() => this.#onChangeConnectionType())

    this.#button_continue.on_click(() => this.#onButtonContinue())
  }

  #onShow () {
    console.log(log_wrap('section#page-cloud_options: onShow'))

    if (this.#gwCfg.is_use_ruuvi_cloud_with_default_options()) {
      this.#radio_connection_type_custom.setUnchecked()
      this.#radio_connection_type_ruuvi.setChecked()
      this.#sect_advanced.hide()
    } else {
      this.#radio_connection_type_ruuvi.setUnchecked()
      this.#radio_connection_type_custom.setChecked()
      this.#sect_advanced.show()
    }

    this.#onChangeConnectionType()
  }

  #onHide () {
    console.log(log_wrap('section#page-cloud_options: onHide'))
    if (this.#radio_connection_type_ruuvi.isChecked()) {
      this.#gwCfg.http.set_default()
      this.#gwCfg.http_stat.set_default()
      this.#gwCfg.mqtt.set_default()
      this.#gwCfg.ntp.set_default()
      this.#gwCfg.company_filter.set_default()
      this.#gwCfg.scan.set_default()
    }
  }

  #onChangeConnectionType () {
    let h = ''
    h += '<ul class="progressbar">'
    if (this.#radio_connection_type_ruuvi.isChecked()) {
      for (let i = 0; i < 7; ++i) {
        h += '<li class="active"></li>'
      }
      h += '<li></li>'

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

  #onButtonContinue () {
    if (this.#radio_connection_type_ruuvi.isChecked()) {
      Navigation.change_page_to_finished(8)
    } else {
      Navigation.change_url_custom_server()
    }
  }

}

export default PageCloudOptions

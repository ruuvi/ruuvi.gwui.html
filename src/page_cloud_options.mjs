/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import {log_wrap, validate_url} from './utils.mjs';
import GuiRadioButton from './gui_radio_button.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import { GwCfg } from './gw_cfg.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import Navigation from './navigation.mjs'
import gui_loading from "./gui_loading.mjs";
import GwStatus from "./gw_status.mjs";
import Network from "./network.mjs";
import {GwCfgHttp, HTTP_AUTH} from "./gw_cfg_http.mjs";
import GuiDiv from "./gui_div.mjs";
import GuiText from "./gui_text.mjs";

class PageCloudOptions {
  /** @type GwCfg */
  #gwCfg

  /** @type Auth */
  #auth

  #section = $('section#page-cloud_options')
  #radio_connection_type = new GuiRadioButton('connection_type')

  /** @type GuiRadioButtonOptionWithValidation */
  #radio_connection_type_ruuvi
  /** @type GuiRadioButtonOption */
  #radio_connection_type_custom

  #div_http_validation_error = new GuiDiv($('#page-cloud_options-http_validation_error'))
  #text_http_validation_error_desc = new GuiText($('#page-cloud_options-http_validation_error-desc'))

  #sect_advanced = new GuiSectAdvanced($('#page-cloud_options-advanced-button'))

  #button_check = new GuiButtonContinue($('#page-cloud_options-button-check'))
  #button_continue = new GuiButtonContinue($('#page-cloud_options-button-continue'))
  #button_ignore_errors_and_continue = new GuiButtonContinue($('#page-cloud_options-button-ignore_errors_and_continue'))
  #button_back = new GuiButtonBack($('#page-cloud_options-button-back'))

  /**
   * constructor
   * @param {GwCfg} gwCfg
   * @param {Auth} auth
   */
  constructor (gwCfg, auth) {
    this.#gwCfg = gwCfg
    this.#auth = auth

    this.#section.bind('onShow', async () => this.#onShow())
    this.#section.bind('onHide', async () => this.#onHide())

    this.#radio_connection_type_ruuvi = this.#radio_connection_type.addOptionWithValidation('ruuvi', false)
    this.#radio_connection_type_custom = this.#radio_connection_type.addOption('custom', false)

    this.#radio_connection_type_ruuvi.on_click(() => this.#onChangeConnectionType())
    this.#radio_connection_type_custom.on_click(() => this.#onChangeConnectionType())

    this.#button_check.on_click(async () => this.#onButtonCheck())
    this.#button_continue.on_click(async () => this.#onButtonContinue())
    this.#button_ignore_errors_and_continue.on_click(() => this.#onButtonIgnoreErrorsAndContinue())
  }

  async #onShow () {
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

    this.#button_check.hide()
    this.#button_ignore_errors_and_continue.hide()
    this.#button_continue.show()
  }

  async #onHide () {
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
    this.#radio_connection_type_ruuvi.clearValidationIcon()
    this.#div_http_validation_error.hide()
    this.#text_http_validation_error_desc.setVal('')

    this.#button_check.hide()
    this.#button_ignore_errors_and_continue.hide()
    this.#button_continue.show()
  }

  async #validate_url_ruuvi_cloud () {
    console.log('Check connection with Ruuvi Cloud')

    this.#radio_connection_type_ruuvi.clearValidationIcon()

    gui_loading.bodyClassLoadingAdd()
    GwStatus.stopCheckingStatus()
    this.#button_continue.disable()
    await Network.waitWhileInProgress()

    const auth_type = HTTP_AUTH.none
    let res = await validate_url(this.#auth, GwCfgHttp.HTTP_URL_DEFAULT, 'check_post_advs', auth_type, {
      use_ssl_client_cert: false,
      use_ssl_server_cert: false,
      error: this.#text_http_validation_error_desc,
      div_status: this.#div_http_validation_error,
    })
    if (res === true) {
      this.#radio_connection_type_ruuvi.setValid()
      await this.#sleep(1000) // Wait a bit to show the validation icon
    } else {
      this.#radio_connection_type_ruuvi.setInvalid()
      this.#button_continue.enable()
    }
    gui_loading.bodyClassLoadingRemove()
    GwStatus.startCheckingStatus()
    return res
  }

  async #sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async #onButtonCheck () {
    await this.#validate_url_ruuvi_cloud()
  }

  async #onButtonContinue () {
    if (this.#radio_connection_type_ruuvi.isChecked()) {
      if (await this.#validate_url_ruuvi_cloud()) {
        this.#button_check.hide()
        Navigation.change_page_to_finished(8)
      } else {
        this.#button_check.show()
        this.#button_continue.hide()
        this.#button_ignore_errors_and_continue.show()
      }
    } else {
      Navigation.change_url_custom_server()
    }
  }

  async #onButtonIgnoreErrorsAndContinue () {
    if (this.#radio_connection_type_ruuvi.isChecked()) {
      Navigation.change_page_to_finished(8)
    } else {
      Navigation.change_url_custom_server()
    }
  }

}

export default PageCloudOptions

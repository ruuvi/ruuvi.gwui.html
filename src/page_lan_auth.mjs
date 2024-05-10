/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import { GwCfgLanAuth } from './gw_cfg_lan_auth.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiDiv from './gui_div.mjs'
import GuiInputText from './gui_input_text.mjs'
import GuiInputPassword from './gui_input_password.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiInputToken from './gui_input_token.mjs'
import Navigation from './navigation.mjs'
import * as crypto from './crypto.mjs'

class PageLanAuth {
  /** @type GwCfgLanAuth */
  #gwCfgLanAuth

  /** @type Auth */
  #auth

  #section = $('section#page-settings_lan_auth')
  #radio_lan_auth_type = new GuiRadioButton('lan_auth_type')

  /** @type GuiRadioButtonOption */
  #radio_lan_auth_type_default
  /** @type GuiRadioButtonOption */
  #radio_lan_auth_type_ruuvi
  /** @type GuiRadioButtonOption */
  #radio_lan_auth_type_deny
  /** @type GuiRadioButtonOption */
  #radio_lan_auth_type_allow

  #div_login_password = new GuiDiv($('#conf-lan_auth-login-password'))
  #input_user = new GuiInputText($('#lan_auth-user'))
  #input_password = new GuiInputPassword($('#lan_auth-pass'), true)

  #div_auth_default = new GuiDiv($('#conf-lan_auth-default'))

  #sect_advanced = new GuiSectAdvanced($('#page-settings_lan_auth-advanced-button'))

  #checkbox_use_api_key = new GuiCheckbox($('#settings_lan_auth-use_api_key'))
  #div_api_key = new GuiDiv($('#settings_lan_auth-api_key'))
  #input_api_key = new GuiInputToken($('#lan_auth-api_key'), true)

  #checkbox_use_api_key_rw = new GuiCheckbox($('#settings_lan_auth-use_api_key_rw'))
  #div_api_key_rw = new GuiDiv($('#settings_lan_auth-api_key_rw'))
  #input_api_key_rw = new GuiInputToken($('#lan_auth-api_key_rw'), true)

  #button_continue = new GuiButtonContinue($('#page-lan_auth_type-button-continue'))
  #button_back = new GuiButtonBack($('#page-lan_auth_type-button-back'))

  /**
   * @param {GwCfgLanAuth} gwCfgLanAuth
   * @param {Auth} auth
   */
  constructor (gwCfgLanAuth, auth) {
    this.#gwCfgLanAuth = gwCfgLanAuth
    this.#auth = auth

    this.#section.bind('onShow', async () => this.#onShow())
    this.#section.bind('onHide', async () => this.#onHide())

    this.#radio_lan_auth_type_default = this.#radio_lan_auth_type.addOption('lan_auth_default', false)
    this.#radio_lan_auth_type_ruuvi = this.#radio_lan_auth_type.addOption('lan_auth_ruuvi', false)
    this.#radio_lan_auth_type_deny = this.#radio_lan_auth_type.addOption('lan_auth_deny', false)
    this.#radio_lan_auth_type_allow = this.#radio_lan_auth_type.addOption('lan_auth_allow', false)

    this.#input_user.on_change(() => this.#onChangeUser())
    this.#input_password.on_change(() => this.#onChangePassword())

    this.#radio_lan_auth_type_default.on_click(() => this.#onChangeAuthType())
    this.#radio_lan_auth_type_ruuvi.on_click(() => this.#onChangeAuthType())
    this.#radio_lan_auth_type_allow.on_click(() => this.#onChangeAuthType())
    this.#radio_lan_auth_type_deny.on_click(() => this.#onChangeAuthType())

    this.#checkbox_use_api_key.on_change(() => this.#onChangeUseApiKey())
    this.#checkbox_use_api_key_rw.on_change(() => this.#onChangeUseApiKeyRw())

    this.#input_api_key.on_change(() => this.#onChangeApiKey())
    this.#input_api_key_rw.on_change(() => this.#onChangeApiKeyRw())

    this.#button_continue.on_click(() => Navigation.change_url_cloud_options())
  }

  async #onShow () {
    console.log(log_wrap('section#page-settings_lan_auth: onShow'))
    this.#input_user.setVal(this.#gwCfgLanAuth.lan_auth_user)
    this.#div_login_password.hide()

    if (this.#gwCfgLanAuth.lan_auth_type.isAuthDefault()) {
      this.#radio_lan_auth_type_default.setChecked()
    } else if (this.#gwCfgLanAuth.lan_auth_type.isAuthRuuvi()) {
      this.#radio_lan_auth_type_ruuvi.setChecked()
      this.#div_login_password.show()
    } else if (this.#gwCfgLanAuth.lan_auth_type.isAuthAllow()) {
      this.#radio_lan_auth_type_allow.setChecked()
    } else if (this.#gwCfgLanAuth.lan_auth_type.isAuthDeny()) {
      this.#radio_lan_auth_type_deny.setChecked()
    } else {
      this.#radio_lan_auth_type_default.setChecked()
    }

    let flag_show_advanced_dropdown = false

    if (!this.#gwCfgLanAuth.lan_auth_type.isAuthDefault()) {
      flag_show_advanced_dropdown = true
    }

    this.#checkbox_use_api_key.setState(this.#gwCfgLanAuth.lan_auth_api_key_use)
    if (this.#gwCfgLanAuth.lan_auth_api_key_use) {
      flag_show_advanced_dropdown = true
      if (this.#gwCfgLanAuth.lan_auth_api_key === undefined) {
        this.#input_api_key.set_use_saved()
      }
      this.#div_api_key.show()
    } else {
      this.#div_api_key.hide()
    }

    this.#checkbox_use_api_key_rw.setState(this.#gwCfgLanAuth.lan_auth_api_key_rw_use)
    if (this.#gwCfgLanAuth.lan_auth_api_key_rw_use) {
      flag_show_advanced_dropdown = true
      if (this.#gwCfgLanAuth.lan_auth_api_key_rw === undefined) {
        this.#input_api_key_rw.set_use_saved()
      }
      this.#div_api_key_rw.show()
    } else {
      this.#div_api_key_rw.hide()
    }

    if (flag_show_advanced_dropdown) {
      this.#sect_advanced.show()
    } else {
      this.#sect_advanced.hide()
    }
    this.#on_lan_auth_type_changed()
  }

  async #onHide () {
    console.log(log_wrap('section#page-settings_lan_auth: onHide'))
    this.#input_api_key.hidePassword()
    this.#input_api_key_rw.hidePassword()
    if (this.#radio_lan_auth_type_default.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthDefault()
      this.#gwCfgLanAuth.setDefaultUser()
      this.#gwCfgLanAuth.lan_auth_pass = null
    } else if (this.#radio_lan_auth_type_ruuvi.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthRuuvi()
      this.#gwCfgLanAuth.lan_auth_user = this.#input_user.getVal()
      if (!this.#input_password.is_saved()) {
        const lan_auth_pass_unencrypted = this.#input_password.getVal()
        const user_gw_password = this.#gwCfgLanAuth.lan_auth_user + ':' + this.#auth.gatewayName + ':' + lan_auth_pass_unencrypted
        this.#gwCfgLanAuth.lan_auth_pass = crypto.MD5(user_gw_password).toString()
      }
    } else if (this.#radio_lan_auth_type_allow.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthAllow()
      this.#gwCfgLanAuth.setDefaultUser()
      this.#gwCfgLanAuth.lan_auth_pass = null
    } else if (this.#radio_lan_auth_type_deny.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthDeny()
      this.#gwCfgLanAuth.setDefaultUser()
      this.#gwCfgLanAuth.lan_auth_pass = null
    } else {
      throw new Error('Unknown lan_auth_type')
    }

    if (this.#checkbox_use_api_key.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_api_key_use = true
      if (!this.#input_api_key.is_saved()) {
        this.#gwCfgLanAuth.lan_auth_api_key = this.#input_api_key.getVal()
      } else {
        this.#gwCfgLanAuth.lan_auth_api_key = undefined
      }
    } else {
      this.#gwCfgLanAuth.lan_auth_api_key_use = false
      this.#gwCfgLanAuth.lan_auth_api_key = ''
    }

    if (this.#checkbox_use_api_key_rw.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_api_key_rw_use = true
      if (!this.#input_api_key_rw.is_saved()) {
        this.#gwCfgLanAuth.lan_auth_api_key_rw = this.#input_api_key_rw.getVal()
      } else {
        this.#gwCfgLanAuth.lan_auth_api_key_rw = undefined
      }
    } else {
      this.#gwCfgLanAuth.lan_auth_api_key_rw_use = false
      this.#gwCfgLanAuth.lan_auth_api_key_rw = ''
    }

  }

  #onChangeUser () {
    this.#input_password.clear()
    this.#on_lan_auth_user_pass_changed()
  }

  #onChangePassword () {
    this.#on_lan_auth_user_pass_changed()
  }

  #onChangeAuthType () {
    this.#on_lan_auth_type_changed()
  }

  #onChangeUseApiKey () {
    this.#on_lan_auth_use_api_key_changed()
    this.#on_lan_auth_user_pass_changed()
  }

  #onChangeUseApiKeyRw () {
    this.#on_lan_auth_use_api_key_rw_changed()
    this.#on_lan_auth_user_pass_changed()
  }

  #onChangeApiKey () {
    this.#on_lan_auth_user_pass_changed()
  }

  #onChangeApiKeyRw () {
    this.#on_lan_auth_user_pass_changed()
  }

  #on_lan_auth_use_api_key_changed () {
    if (this.#checkbox_use_api_key.isChecked()) {
      this.#input_api_key.setNewTokenIfEmpty()
      this.#div_api_key.show()
      this.#input_api_key.put_cursor_at_end();
    } else {
      this.#div_api_key.hide()
    }
  }

  #on_lan_auth_use_api_key_rw_changed () {
    if (this.#checkbox_use_api_key_rw.isChecked()) {
      this.#input_api_key_rw.setNewTokenIfEmpty()
      this.#div_api_key_rw.show()
      this.#input_api_key_rw.put_cursor_at_end();
    } else {
      this.#div_api_key_rw.hide()
    }
  }

  #on_lan_auth_type_changed () {
    if (this.#radio_lan_auth_type_allow.isChecked()) {
      this.#checkbox_use_api_key.disable()
      this.#checkbox_use_api_key_rw.disable()
    } else {
      this.#checkbox_use_api_key.enable()
      this.#checkbox_use_api_key_rw.enable()
    }

    if (this.#radio_lan_auth_type_allow.isChecked()) {
      this.#div_login_password.slideUp()
      this.#div_auth_default.slideUp()
      this.#checkbox_use_api_key.setUnchecked()
      this.#checkbox_use_api_key_rw.setUnchecked()
      this.#on_lan_auth_use_api_key_changed()
      this.#on_lan_auth_use_api_key_rw_changed()
    } else if (this.#radio_lan_auth_type_deny.isChecked()) {
      this.#div_login_password.slideUp()
      this.#div_auth_default.slideUp()
    } else if (this.#radio_lan_auth_type_default.isChecked()) {
      this.#div_login_password.slideUp()
      this.#div_auth_default.slideDown()
    } else {
      this.#div_auth_default.slideUp()
      this.#div_login_password.slideDown()
    }

    this.#on_lan_auth_user_pass_changed()
  }

  #on_lan_auth_user_pass_changed () {
    let flagDisableContinueButton = false

    if (this.#radio_lan_auth_type_ruuvi.isChecked()) {
      if (this.#input_user.getVal() === '' || this.#input_password.getVal() === '') {
        flagDisableContinueButton = true
      }
    }

    if (this.#checkbox_use_api_key.isChecked()) {
      if (this.#input_api_key.getVal() === '' && !this.#input_api_key.is_saved()) {
        flagDisableContinueButton = true
      }
    }
    if (this.#checkbox_use_api_key_rw.isChecked()) {
      if (this.#input_api_key_rw.getVal() === '' && !this.#input_api_key_rw.is_saved()) {
        flagDisableContinueButton = true
      }
    }
    if (flagDisableContinueButton) {
      this.#button_continue.disable()
    } else {
      this.#button_continue.enable()
    }
  }

}

export default PageLanAuth

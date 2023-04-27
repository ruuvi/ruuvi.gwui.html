import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import { GwCfgLanAuth } from './gw_cfg_lan_auth.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiDiv from './gui_div.mjs'
import GuiInputText from './gui_input_text.mjs'
import GuiInputPassword from './gui_input_password.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiButton from './gui_button.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiInputToken from './gui_input_token.mjs'
import Navigation from './navigation.mjs'
import * as crypto from './crypto.mjs'

class PageLanAuth {
  /** @type #GwCfgLanAuth */
  #gwCfgLanAuth
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
  #input_password = new GuiInputPassword($('#lan_auth-pass'))

  #div_auth_default = new GuiDiv($('#conf-lan_auth-default'))

  #sect_advanced = new GuiSectAdvanced($('#page-settings_lan_auth-advanced-button'))

  #checkbox_use_api_key = new GuiCheckbox($('#settings_lan_auth-use_api_key'))
  #div_api_key = new GuiDiv($('#settings_lan_auth-api_key'))
  #input_api_key = new GuiInputToken($('#lan_auth-api_key'))

  #checkbox_use_api_key_rw = new GuiCheckbox($('#settings_lan_auth-use_api_key_rw'))
  #div_api_key_rw = new GuiDiv($('#settings_lan_auth-api_key_rw'))
  #input_api_key_rw = new GuiInputToken($('#lan_auth-api_key_rw'))

  #button_continue = new GuiButton($('#page-lan_auth_type-button-continue'))
  #button_back = new GuiButtonBack($('#page-lan_auth_type-button-back'))

  constructor (gwCfgLanAuth) {
    this.#gwCfgLanAuth = gwCfgLanAuth

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#radio_lan_auth_type_default = this.#radio_lan_auth_type.addOption('lan_auth_default', false)
    this.#radio_lan_auth_type_ruuvi = this.#radio_lan_auth_type.addOption('lan_auth_ruuvi', false)
    this.#radio_lan_auth_type_deny = this.#radio_lan_auth_type.addOption('lan_auth_deny', false)
    this.#radio_lan_auth_type_allow = this.#radio_lan_auth_type.addOption('lan_auth_allow', false)

    this.#input_user.on_input_or_change(() => this.#onChangeUser())
    this.#input_password.on_input_or_change(() => this.#onChangePassword())

    this.#radio_lan_auth_type_default.on_click(() => this.#onChangeAuthType())
    this.#radio_lan_auth_type_ruuvi.on_click(() => this.#onChangeAuthType())
    this.#radio_lan_auth_type_allow.on_click(() => this.#onChangeAuthType())
    this.#radio_lan_auth_type_deny.on_click(() => this.#onChangeAuthType())

    this.#checkbox_use_api_key.on_change(() => this.#onChangeUseApiKey())
    this.#checkbox_use_api_key_rw.on_change(() => this.#onChangeUseApiKeyRw())

    this.#input_api_key.on_input_or_change(() => this.#onChangeApiKey())
    this.#input_api_key_rw.on_input_or_change(() => this.#onChangeApiKeyRw())

    this.#button_continue.on_click(() => Navigation.change_url_cloud_options())
  }

  #onShow () {
    console.log(log_wrap('section#page-settings_lan_auth: onShow'))
    this.#input_user.setVal(this.#gwCfgLanAuth.lan_auth_user)
    this.#div_login_password.hide()

    if (this.#gwCfgLanAuth.lan_auth_type.isAuthDefault()) {
      this.#radio_lan_auth_type_default.setChecked()
    } else if (this.#gwCfgLanAuth.lan_auth_type.isAuthRuuvi()) {
      this.#radio_lan_auth_type_ruuvi.setChecked()
      if (this.#gwCfgLanAuth.lan_auth_pass === undefined) {
        this.#input_password.set_use_saved()
      }
      this.#div_login_password.show()
    } else if (this.#gwCfgLanAuth.lan_auth_type.isAuthAllow()) {
      this.#radio_lan_auth_type_allow.setChecked()
    } else if (this.#gwCfgLanAuth.lan_auth_type.isAuthDeny()) {
      this.#radio_lan_auth_type_deny.setChecked()
    } else {
      this.#radio_lan_auth_type_default.setChecked()
    }

    let flag_show_advanced_dropdown = false

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

  #onHide () {
    console.log(log_wrap('section#page-settings_lan_auth: onHide'))
    if (this.#radio_lan_auth_type_default.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthDefault()
    } else if (this.#radio_lan_auth_type_ruuvi.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthRuuvi()
    } else if (this.#radio_lan_auth_type_allow.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthAllow()
    } else if (this.#radio_lan_auth_type_deny.isChecked()) {
      this.#gwCfgLanAuth.lan_auth_type.setAuthDeny()
    } else {
      this.#gwCfgLanAuth.lan_auth_type.setAuthDefault()
    }
    this.#gwCfgLanAuth.lan_auth_user = this.#input_user.getVal()
    this.#gwCfgLanAuth.lan_auth_pass = this.#input_password.getVal()
    if (this.#radio_lan_auth_type_ruuvi.isChecked()) {
      if (this.#input_password.is_saved()) {
        this.#gwCfgLanAuth.lan_auth_pass = undefined
      }
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
    this.#input_password.clear_saved()
    this.#on_lan_auth_user_pass_changed()
  }

  #onChangeAuthType () {
    this.#input_password.clear()
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
    this.#input_api_key.clear_saved()
    this.#on_lan_auth_user_pass_changed()
  }

  #onChangeApiKeyRw () {
    this.#input_api_key_rw.clear_saved()
    this.#on_lan_auth_user_pass_changed()
  }

  #on_lan_auth_use_api_key_changed () {
    this.#input_api_key.clear_saved()
    if (this.#checkbox_use_api_key.isChecked()) {
      this.#div_api_key.show()
      if (this.#input_api_key.getVal() === '') {
        this.#input_api_key.setVal(crypto.enc.Base64.stringify(crypto.SHA256(crypto.lib.WordArray.random(32))))
      }
    } else {
      this.#div_api_key.hide()
    }
  }

  #on_lan_auth_use_api_key_rw_changed () {
    this.#input_api_key_rw.clear_saved()
    if (this.#checkbox_use_api_key_rw.isChecked()) {
      this.#div_api_key_rw.show()
      if (this.#input_api_key_rw.getVal() === '') {
        this.#input_api_key_rw.setVal(crypto.enc.Base64.stringify(crypto.SHA256(crypto.lib.WordArray.random(32))))
      }
    } else {
      this.#div_api_key_rw.hide()
    }
  }

  #on_lan_auth_type_changed () {
    if (this.#radio_lan_auth_type_allow.isChecked()) {
      this.#checkbox_use_api_key.disable()
      this.#checkbox_use_api_key_rw.disable()
      this.#sect_advanced.hide()
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
    let flag_need_to_disable = false

    if (!this.#radio_lan_auth_type_allow.isChecked() && !this.#radio_lan_auth_type_deny.isChecked() &&
        !this.#radio_lan_auth_type_default.isChecked()) {
      if (this.#input_user.getVal() === '' || (this.#input_password.getVal() === '' && !this.#input_password.is_saved())) {
        flag_need_to_disable = true
      }
    }

    if (this.#checkbox_use_api_key.isChecked()) {
      if (this.#input_api_key.getVal() === '' && !this.#input_api_key.is_saved()) {
        flag_need_to_disable = true
      }
    }
    if (this.#checkbox_use_api_key_rw.isChecked()) {
      if (this.#input_api_key_rw.getVal() === '' && !this.#input_api_key_rw.is_saved()) {
        flag_need_to_disable = true
      }
    }
    if (flag_need_to_disable) {
      this.#button_continue.disable()
    } else {
      this.#button_continue.enable()
    }
  }

}

export default PageLanAuth

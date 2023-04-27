import $ from 'jquery'
import { log_wrap, validate_url } from './utils.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiDiv from './gui_div.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import GuiInputWithValidation from './gui_input_with_validation.mjs'
import GuiInputPasswordWithValidation from './gui_input_password_with_validataion.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiButton from './gui_button.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import Navigation from './navigation.mjs'
import gui_loading from './gui_loading.mjs'
import GwStatus from './gw_status.mjs'
import GuiText from './gui_text.mjs'
import Network from './network.mjs'
import GuiInputTokenWithValidation from './gui_input_token_with_validation.mjs'

class PageRemoteCfg {
  /** @type GwCfg */
  #gwCfg

  /** @type Auth */
  #auth

  #section = $('section#page-remote_cfg')

  #checkbox_remote_cfg_use = new GuiCheckbox($('#remote_cfg-use'))
  #checkbox_remote_cfg_use_auth = new GuiCheckbox($('#remote_cfg-use_auth'))
  #radio_remote_cfg_auth_type = new GuiRadioButton('remote_cfg_auth_type')

  /** @type GuiRadioButtonOption */
  #radio_remote_cfg_auth_type_basic
  /** @type GuiRadioButtonOption */
  #radio_remote_cfg_auth_type_bearer

  #sect_advanced = new GuiSectAdvanced($('#page-remote_cfg-advanced-button'))
  #input_base_url = new GuiInputWithValidation($('#remote_cfg-base_url'))
  #input_auth_basic_user = new GuiInputWithValidation($('#remote_cfg-auth_basic-user'))
  #input_auth_basic_pass = new GuiInputPasswordWithValidation($('#remote_cfg-auth_basic-password'))
  #input_auth_bearer_token = new GuiInputTokenWithValidation($('#remote_cfg-auth_bearer-token'), 'text')
  #button_continue = new GuiButton($('#page-remote_cfg-button-continue'))
  #button_back = new GuiButtonBack($('#page-remote_cfg-button-back'))
  #button_check = new GuiButton($('#remote_cfg-button-check'))
  #button_download = new GuiButton($('#remote_cfg-button-download'))
  #div_status_error = new GuiDiv($('#page-remote_cfg-status-error'))
  #text_status_error_desc = new GuiText($('#page-remote_cfg-status-error-desc'))
  #div_options = new GuiDiv($('#remote_cfg-options'))
  #div_auth_options = new GuiDiv($('#conf-remote_cfg-auth-options'))
  #div_auth_basic_options = new GuiDiv($('#conf-remote_cfg-auth_basic-options'))
  #div_auth_bearer_options = new GuiDiv($('#conf-remote_cfg-auth_bearer-options'))

  constructor (gwCfg, auth) {
    this.#gwCfg = gwCfg
    this.#auth = auth

    this.#radio_remote_cfg_auth_type_basic = this.#radio_remote_cfg_auth_type.addOption('remote_cfg_auth_type_basic', false)
    this.#radio_remote_cfg_auth_type_bearer = this.#radio_remote_cfg_auth_type.addOption('remote_cfg_auth_type_bearer', false)

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#checkbox_remote_cfg_use.on_change(() => this.#onChangeRemoteCfgUse())
    this.#checkbox_remote_cfg_use_auth.on_change(() => this.#onChangeRemoteCfgUseAuth())
    this.#radio_remote_cfg_auth_type_basic.on_click(() => this.#onChangeRemoteCfgAuthType())
    this.#radio_remote_cfg_auth_type_bearer.on_click(() => this.#onChangeRemoteCfgAuthType())
    this.#input_base_url.on_input_or_change(() => this.#onChangeBaseURL())
    this.#input_auth_basic_user.on_input_or_change(() => this.#onChangeAuthBasicUser())
    this.#input_auth_basic_pass.on_input_or_change(() => this.#onChangeAuthBasicPass())
    this.#input_auth_bearer_token.on_input_or_change(() => this.#onChangeAuthBearerToken())

    this.#button_continue.on_click(() => Navigation.change_page_to_update_schedule())
    this.#button_check.on_click(() => this.#onButtonCheck())
    this.#button_download.on_click(async () => this.#onButtonDownload())
  }

  #onShow () {
    console.log(log_wrap('section#page-remote_cfg: onShow'))
    this.#checkbox_remote_cfg_use.setState(this.#gwCfg.remote_cfg.remote_cfg_use)
    if (this.#gwCfg.remote_cfg.remote_cfg_use) {
      this.#input_base_url.setVal(this.#gwCfg.remote_cfg.remote_cfg_url)
      if (this.#gwCfg.remote_cfg.remote_cfg_auth_type.isNoAuth()) {
        this.#checkbox_remote_cfg_use_auth.setUnchecked()
      } else if (this.#gwCfg.remote_cfg.remote_cfg_auth_type.isBasicAuth()) {
        this.#checkbox_remote_cfg_use_auth.setChecked()
        this.#radio_remote_cfg_auth_type_basic.setChecked()
        this.#input_auth_basic_user.setVal(this.#gwCfg.remote_cfg.remote_cfg_auth_basic_user)
        if (this.#gwCfg.remote_cfg.remote_cfg_auth_basic_pass === undefined) {
          this.#input_auth_basic_pass.set_use_saved()
        }
      } else if (this.#gwCfg.remote_cfg.remote_cfg_auth_type.isBearerAuth()) {
        this.#checkbox_remote_cfg_use_auth.setChecked()
        this.#radio_remote_cfg_auth_type_bearer.setChecked()
        if (this.#gwCfg.remote_cfg.remote_cfg_auth_bearer_token === undefined) {
          this.#input_auth_bearer_token.set_use_saved()
        }
      }
      this.#sect_advanced.show()
    } else {
      this.#sect_advanced.hide()
    }
    this.#on_remote_cfg_changed()
  }

  #onHide () {
    console.log(log_wrap('section#page-remote_cfg: onHide'))
    this.#gwCfg.remote_cfg.remote_cfg_use = this.#checkbox_remote_cfg_use.isChecked()
    if (this.#gwCfg.remote_cfg.remote_cfg_use) {
      this.#gwCfg.remote_cfg.remote_cfg_url = this.#input_base_url.getVal()
      if (!this.#checkbox_remote_cfg_use_auth.isChecked()) {
        this.#gwCfg.remote_cfg.remote_cfg_auth_type.setNoAuth()
      } else {
        if (this.#radio_remote_cfg_auth_type_basic.isChecked()) {
          this.#gwCfg.remote_cfg.remote_cfg_auth_type.setBasicAuth()
          this.#gwCfg.remote_cfg.remote_cfg_auth_basic_user = this.#input_auth_basic_user.getVal()
          if (!this.#input_auth_basic_pass.is_saved()) {
            this.#gwCfg.remote_cfg.remote_cfg_auth_basic_pass = this.#input_auth_basic_pass.getVal()
          }
        } else if (this.#radio_remote_cfg_auth_type_bearer.isChecked()) {
          this.#gwCfg.remote_cfg.remote_cfg_auth_type.setBearerAuth()
          if (!this.#input_auth_bearer_token.is_saved()) {
            this.#gwCfg.remote_cfg.remote_cfg_auth_bearer_token = this.#input_auth_bearer_token.getVal()
          }
        }
      }
    }
  }

  #onChangeRemoteCfgUse () {
    this.#input_base_url.setValidationRequired()
    this.#on_remote_cfg_changed()
  }

  #onChangeRemoteCfgUseAuth () {
    this.#input_base_url.setValidationRequired()
    this.#on_remote_cfg_changed()
  }

  #onChangeRemoteCfgAuthType () {
    this.#input_base_url.setValidationRequired()
    this.#on_remote_cfg_changed()
  }

  #onChangeBaseURL () {
    this.#input_base_url.setValidationRequired()
    this.#input_base_url.clearValidationIcon()
    this.#on_remote_cfg_changed()
  }

  #onChangeAuthBasicUser () {
    this.#input_auth_basic_pass.clear_saved()
    this.#input_auth_basic_user.setValidationRequired()
    this.#input_base_url.setValidationRequired()
    this.#on_remote_cfg_changed()
  }

  #onChangeAuthBasicPass () {
    this.#input_auth_basic_pass.clear_saved()
    this.#input_auth_basic_pass.setValidationRequired()
    this.#input_base_url.setValidationRequired()
    this.#on_remote_cfg_changed()
  }

  #onChangeAuthBearerToken () {
    this.#input_auth_bearer_token.clear_saved()
    this.#input_auth_bearer_token.setValidationRequired()
    this.#input_base_url.setValidationRequired()
    this.#on_remote_cfg_changed()
  }

  #remote_cfg_validate_url () {
    gui_loading.bodyClassLoadingAdd()
    GwStatus.stopCheckingStatus()

    let auth_type = 'none'

    let params = {
      input_url: this.#input_base_url,
      error: this.#text_status_error_desc,
      div_status: this.#div_status_error,
    }
    if (this.#checkbox_remote_cfg_use_auth.isChecked()) {
      if (this.#radio_remote_cfg_auth_type_basic.isChecked()) {
        auth_type = 'basic'
        params['input_user'] = this.#input_auth_basic_user
        params['input_pass'] = this.#input_auth_basic_pass
      } else {
        auth_type = 'bearer'
        params['input_token'] = this.#input_auth_bearer_token
      }
    }
    this.#div_status_error.hide()

    validate_url(this.#auth, this.#input_base_url.getVal(), 'check_remote_cfg', auth_type, params)
        .finally(() => {
          this.#on_remote_cfg_changed()
          gui_loading.bodyClassLoadingRemove()
          GwStatus.startCheckingStatus()
        })
  }

  #onButtonCheck () {
    let base_url_val = this.#input_base_url.getVal()
    if (!base_url_val.startsWith('http://') && !base_url_val.startsWith('https://')) {
      base_url_val = 'https://' + base_url_val
      this.#input_base_url.setVal(base_url_val)
    }

    this.#input_base_url.clearValidationIcon()
    this.#input_auth_basic_user.clearValidationIcon()
    this.#input_auth_basic_pass.clearValidationIcon()
    this.#input_auth_bearer_token.clearValidationIcon()
    this.#input_base_url.setValidationRequired()

    this.#remote_cfg_validate_url()
  }

  async #onButtonDownload () {
    gui_loading.bodyClassLoadingAdd()
    this.#div_status_error.hide()
    this.#button_download.disable()

    GwStatus.stopCheckingStatus()
    await Network.waitWhileInProgress()

    try {
      await this.#gwCfg.saveConfig(this.#auth)
      let data = await Network.httpPostJson('/gw_cfg_download', 10000, '{}')
      const status = data['status']
      let message = data['message']
      if (message === undefined) {
        message = ''
      }
      if (status === 200) {
        this.#button_download.enable()
        Navigation.change_page_to_finished(5)
      } else {
        console.log(log_wrap(`POST /gw_cfg_download: failure, status=${status}, message=${message}`))
        this.#button_download.enable()
        this.#text_status_error_desc.setVal('Status=' + status + ': ' + message)
        this.#div_status_error.show()
        GwStatus.startCheckingStatus()
      }
    } catch (err) {
      console.log(log_wrap(`POST /gw_cfg_download: failure, error=${err}`))
      this.#button_download.enable()
      this.#text_status_error_desc.setVal(`${err}`)
      this.#div_status_error.show()
      GwStatus.startCheckingStatus()
    } finally {
      gui_loading.bodyClassLoadingRemove()
    }
  }

  #on_remote_cfg_changed () {
    const remote_cfg_use = this.#checkbox_remote_cfg_use.isChecked()
    const remote_cfg_use_auth = this.#checkbox_remote_cfg_use_auth.isChecked()

    if (this.#input_base_url.isValidationRequired()) {
      this.#input_base_url.clearValidationIcon()
      this.#input_auth_basic_user.clearValidationIcon()
      this.#input_auth_basic_pass.clearValidationIcon()
      this.#input_auth_bearer_token.clearValidationIcon()
    }

    let h = ''
    h += '<ul class="progressbar">'
    if (remote_cfg_use) {
      this.#div_options.show()
      for (let i = 0; i < 4; ++i) {
        h += '<li class="active"></li>'
      }
      for (let i = 4; i < 5; ++i) {
        h += '<li></li>'
      }
      this.#button_continue.hide()
    } else {
      this.#div_options.hide()
      for (let i = 0; i < 4; ++i) {
        h += '<li class="active"></li>'
      }
      for (let i = 4; i < 8; ++i) {
        h += '<li></li>'
      }
      this.#button_continue.show()
    }
    h += '</ul>'
    h += '\n'
    $('section#page-remote_cfg div.progressbar-container').html(h)

    let remote_cfg_auth_type = this.#radio_remote_cfg_auth_type.getCheckedVal()

    if (remote_cfg_use_auth) {
      this.#div_auth_options.show()
      if (remote_cfg_auth_type === undefined) {
        this.#radio_remote_cfg_auth_type_basic.setChecked()
        remote_cfg_auth_type = this.#radio_remote_cfg_auth_type.getCheckedVal()
      }
      if (remote_cfg_auth_type === 'remote_cfg_auth_type_bearer') {
        this.#div_auth_bearer_options.show()
        this.#div_auth_basic_options.hide()
      } else {
        this.#div_auth_bearer_options.hide()
        this.#div_auth_basic_options.show()
      }
    } else {
      this.#div_auth_options.hide()
    }

    let flag_valid_url = true
    let flag_valid_user = true
    let flag_valid_pass = true
    let flag_valid_token = true
    if (remote_cfg_use && this.#input_base_url.getVal() === '') {
      flag_valid_url = false
    }
    if (remote_cfg_use_auth) {
      if (remote_cfg_auth_type === 'remote_cfg_auth_type_bearer') {
        if (!this.#input_auth_bearer_token.is_saved() && this.#input_auth_bearer_token.getVal() === '') {
          flag_valid_token = false
        }
      } else {
        if (this.#input_auth_basic_user.getVal() === '') {
          flag_valid_user = false
        }

        if (!this.#input_auth_basic_pass.is_saved() && this.#input_auth_basic_pass.getVal() === '') {
          flag_valid_pass = false
        }
      }
    }

    let flag_base_url_modified = false
    let flag_user_pass_modified = false
    let flag_token_modified = false
    if (remote_cfg_use && this.#input_base_url.isValidationRequired()) {
      flag_base_url_modified = true
    }
    if (remote_cfg_use && remote_cfg_use_auth &&
        (this.#input_auth_basic_user.isValidationRequired() || this.#input_auth_basic_pass.isValidationRequired())) {
      flag_user_pass_modified = true
    }
    if (remote_cfg_use && remote_cfg_use_auth && this.#input_auth_bearer_token.isValidationRequired()) {
      flag_token_modified = true
    }

    if (flag_base_url_modified || this.#input_base_url.isInvalid() ||
        flag_user_pass_modified || this.#input_auth_basic_user.isInvalid() || this.#input_auth_basic_pass.isInvalid() ||
        flag_token_modified || this.#input_auth_bearer_token.isInvalid() ||
        !flag_valid_url || !flag_valid_user || !flag_valid_pass || !flag_valid_token) {

      this.#button_download.hide()
      this.#button_check.show()

      if (!flag_valid_url || !flag_valid_user || !flag_valid_pass || !flag_valid_token) {
        this.#button_check.disable()
        if (!flag_valid_url) {
          this.#input_base_url.setInvalid()
        }
        if (!flag_valid_user) {
          this.#input_auth_basic_user.setInvalid()
        }
        if (!flag_valid_pass) {
          this.#input_auth_basic_pass.setInvalid()
        }
        if (!flag_valid_token) {
          this.#input_auth_bearer_token.setInvalid()
        }
      } else {
        this.#button_check.enable()
      }
    } else {
      this.#button_check.hide()
      this.#button_download.show()
      this.#button_download.enable()
    }
  }
}

export default PageRemoteCfg

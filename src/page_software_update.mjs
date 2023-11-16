/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import {log_wrap, validate_url} from './utils.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiInputTextWithValidation from './gui_input_text_with_validation.mjs'
import GuiDiv from './gui_div.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiText from './gui_text.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import gui_loading from './gui_loading.mjs'
import GwStatus from './gw_status.mjs'
import Network from './network.mjs'
import Navigation from './navigation.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiButton from './gui_button.mjs'

const SwUpdateStatus = {
  empty: 'empty',
  ok_already_latest: 'ok_already_latest',
  ok_latest_not_supported: 'ok_latest_not_supported',
  ok_update_available: 'ok_update_available',
  error: 'error',
}

class PageSoftwareUpdate {
  /** @type GwCfg */
  #gwCfg

  /** @type Auth */
  #auth

  #latest_version = null
  #latest_url = null
  #flagLatestFirmwareVersionSupported = false
  #section = $('section#page-software_update')
  #checkbox_software_update_set_url_manually = new GuiCheckbox($('#software_update-set-url-manually'))

  #div_fw_update_server = new GuiDiv($('#page-software_update-fw_update_server-div'))
  #input_fw_update_server_url = new GuiInputTextWithValidation($('#page-software_update-fw_update_server_url'))
  #button_fw_update_server_check = new GuiButton($('#page-software_update-button-fw_update_server_url-check'))
  #button_fw_update_server_save = new GuiButton($('#page-software_update-button-fw_update_server_url-save'))

  #div_fw_update_binary_files = new GuiDiv($('#page-software_update-fw_update_binary_files-div'))
  #input_fw_update_binary_files_url = new GuiInputTextWithValidation($('#page-software_update-fw_update_binary_files_url'))

  #div_fw_update_status_error = new GuiDiv($('#page-software_update-fw_update-status-error'))
  #text_fw_update_status_error_desc = new GuiText($('#page-software_update-fw_update-status-error-desc'))

  #button_upgrade = new GuiButton($('#software_update-button-upgrade'))

  #button_continue = new GuiButtonContinue($('#page-software_update-button-continue'))
  #div_in_button_continue_no_update = new GuiText($('#page-software_update-button-continue_no_update'))
  #div_in_button_continue_without_update = new GuiText($('#page-software_update-button-continue_without_update'))
  #button_back = new GuiButtonBack($('#page-software_update-button-back'))

  #div_version_info = new GuiDiv($('#page-software_update-version_info'))
  #text_version_latest = new GuiText($('#software_update-version-latest'))
  #text_version_current = new GuiText($('#software_update-version-current'))

  #div_in_progress = new GuiDiv($('#page-software_update-in_progress'))

  #div_status_empty = new GuiDiv($('#software_update-status-empty'))
  #div_status_ok_already_latest = new GuiDiv($('#software_update-status-ok-already_latest'))
  #div_status_ok_latest_not_supported = new GuiDiv($('#software_update-status-ok-latest_not_supported'))
  #div_status_ok_update_available = new GuiDiv($('#software_update-status-ok-update_available'))
  #div_status_error = new GuiDiv($('#software_update-status-error'))

  #div_updating_status_error = new GuiDiv($('#page-software_update-updating-status-error'))
  #text_updating_status_error_desc = new GuiText($('#page-software_update-updating-status-error-desc'))

  #sect_advanced = new GuiSectAdvanced($('#page-software_update-advanced-button'))

  constructor (gwCfg, auth) {
    this.#gwCfg = gwCfg
    this.#auth = auth

    this.#section.bind('onShow', async () => this.#onShow())
    this.#section.bind('onHide', async () => this.#onHide())

    this.#input_fw_update_server_url.on_change(() => this.#on_change_url_fw_update_server())
    this.#button_fw_update_server_check.on_click(async () => this.#on_button_url_fw_update_server_check())
    this.#button_fw_update_server_save.on_click(async () => this.#on_button_url_fw_update_server_save())

    this.#checkbox_software_update_set_url_manually.on_change(() => this.#on_change_url_fw_update_binary_files())
    this.#input_fw_update_binary_files_url.on_change(() => this.#on_change_url_fw_update_binary_files())

    this.#button_upgrade.on_click(async () => this.#on_button_upgrade())
    this.#button_continue.on_click(() => Navigation.change_page_to_remote_cfg())

    this.#text_version_current.setVal(gwCfg.info.fw_ver)
  }

  async #onShow () {
    console.log(log_wrap('section#page-software_update: onShow'))
    this.#checkbox_software_update_set_url_manually.setUnchecked()
    if (this.#text_version_latest.getVal() !== '') {
      this.#input_fw_update_binary_files_url.setVal(this.#latest_url)
      return
    }
    this.#button_upgrade.disable()
    this.#div_in_progress.show()

    this.#set_software_update_status_empty()

    this.#input_fw_update_server_url.setVal(this.#gwCfg.fw_update_url.fw_update_url)
    this.#button_fw_update_server_save.disable()

    this.#sect_advanced.disable()

    this.#on_change_url_fw_update_binary_files()

    gui_loading.bodyClassLoadingAdd()
    GwStatus.stopCheckingStatus()
    await Network.waitWhileInProgress()

    Network.httpGetJson('/firmware_update.json', 40000).then((data) => {
      this.#on_get_latest_release_info(data)
    }).catch((err) => {
      console.log(log_wrap(`GET firmware_update.json failed: ${err}`))
      this.#div_in_progress.hide()
      this.#sect_advanced.enable()
      this.#set_software_update_status_error()
    }).finally(() => {
      gui_loading.bodyClassLoadingRemove()
      GwStatus.startCheckingStatus()
    })
  }

  async #onHide () {
    console.log(log_wrap('section#page-software_update: onHide'))
    this.#on_change_url_fw_update_binary_files()
  }


  /**
   * @param {SwUpdateStatus} status
   */
  #set_software_update_status(status) {
    this.#div_status_empty.hide()
    this.#div_status_ok_already_latest.hide()
    this.#div_status_ok_latest_not_supported.hide()
    this.#div_status_ok_update_available.hide()
    this.#div_status_error.hide()
    switch (status) {
        case SwUpdateStatus.empty:
            this.#div_status_empty.show()
            break;
        case SwUpdateStatus.ok_already_latest:
            this.#div_status_ok_already_latest.show()
            break;
        case SwUpdateStatus.ok_latest_not_supported:
            this.#div_status_ok_latest_not_supported.show()
            break;
        case SwUpdateStatus.ok_update_available:
            this.#div_status_ok_update_available.show()
            break;
        case SwUpdateStatus.error:
            this.#div_status_error.show()
            break;
        default:
            break;
    }
  }

  #set_software_update_status_empty() {
    this.#set_software_update_status(SwUpdateStatus.empty)
  }

  #set_software_update_status_ok_already_latest() {
    this.#set_software_update_status(SwUpdateStatus.ok_already_latest)
  }

  #set_software_update_status_ok_latest_not_supported() {
    this.#set_software_update_status(SwUpdateStatus.ok_latest_not_supported)
  }

  #set_software_update_status_ok_update_available() {
    this.#set_software_update_status(SwUpdateStatus.ok_update_available)
  }

  #set_software_update_status_error() {
    this.#set_software_update_status(SwUpdateStatus.error)
  }

  #is_valid_http_url (str_val) {
    let url
    if (str_val.indexOf('://') === -1) {
      str_val = 'http://' + str_val
    }
    try {
      url = new URL(str_val)
    } catch (_) {
      return false
    }
    return url.protocol === 'http:' || url.protocol === 'https:'
  }

  #on_get_latest_release_info (data) {
    const { latest = {}, beta = {}, alpha = {} } = data
    if (!('version' in latest) || !('url' in latest)) {
      console.warn("'latest' object should have 'version' and 'url' properties")
      return false
    }
    this.#latest_version = latest.version
    this.#latest_url = latest.url
    const beta_version = beta?.version
    const beta_url = beta?.url
    const alpha_version = alpha?.version
    const alpha_url = alpha?.url

    let m = this.#latest_version.match(/v(\d+)\.(\d+)\.(\d+)/)
    this.#flagLatestFirmwareVersionSupported = false
    if (m) {
      let latest_release_version_bin = (parseInt(m[1]) << 16) + (parseInt(m[2]) << 8) + parseInt(m[3])
      if (latest_release_version_bin >= 0x00010304) {
        this.#flagLatestFirmwareVersionSupported = true
      }
    }

    this.#div_in_progress.hide()
    this.#text_version_latest.setVal(this.#latest_version)
    if (this.#latest_version !== this.#text_version_current.getVal()) {
      this.#div_in_button_continue_no_update.hide()
      this.#div_in_button_continue_without_update.show()
    } else {
      this.#div_in_button_continue_no_update.show()
      this.#div_in_button_continue_without_update.hide()
    }

    this.#input_fw_update_binary_files_url.setVal(this.#latest_url)

    this.#sect_advanced.enable()

    if (!this.#flagLatestFirmwareVersionSupported) {
      this.#set_software_update_status_ok_latest_not_supported()
    } else {
      if (this.#text_version_current.getVal() === this.#text_version_latest.getVal()) {
        this.#set_software_update_status_ok_already_latest()
        this.#button_upgrade.disable()
      } else {
        this.#set_software_update_status_ok_update_available()
        this.#button_upgrade.enable()
      }
    }
    return true
  }

  #on_change_url_fw_update_server() {
    this.#div_fw_update_status_error.hide()
    this.#input_fw_update_server_url.clearValidationIcon()
    this.#input_fw_update_server_url.setValidationRequired()
    this.#button_fw_update_server_save.disable()
  }

  #on_change_url_fw_update_binary_files () {
    this.#div_updating_status_error.hide()
    this.#set_software_update_status_empty()
    if (this.#checkbox_software_update_set_url_manually.isChecked()) {
      this.#div_fw_update_server.slideUp()
      if (this.#is_valid_http_url(this.#input_fw_update_binary_files_url.getVal())) {
        this.#input_fw_update_binary_files_url.clearValidationIcon()
        this.#button_upgrade.enable()
      } else {
        this.#input_fw_update_binary_files_url.setInvalid()
        this.#button_upgrade.disable()
      }
      this.#div_version_info.slideUp()
      this.#div_fw_update_binary_files.slideDown()
      this.#button_continue.hide()
    } else {
      this.#div_fw_update_server.slideDown()
      if (this.#text_version_latest.getVal() !== '') {
        this.#input_fw_update_binary_files_url.setVal(this.#latest_url)
        if (this.#text_version_latest.getVal() === '' || this.#text_version_current.getVal() === this.#text_version_latest.getVal()) {
          this.#button_upgrade.disable()
        } else {
          this.#button_upgrade.enable()
        }
      }
      this.#input_fw_update_binary_files_url.clearValidationIcon()
      this.#div_fw_update_binary_files.slideUp()
      this.#div_version_info.slideDown()
      this.#button_continue.show()
      if (!this.#flagLatestFirmwareVersionSupported) {
        this.#button_upgrade.disable()
      }
    }
  }

  async #on_button_url_fw_update_server_check () {
    this.#div_updating_status_error.hide()
    let fw_update_url_val = this.#input_fw_update_server_url.getVal()
    if (fw_update_url_val.indexOf('://') === -1) {
      fw_update_url_val = 'https://' + fw_update_url_val
    }
    if (fw_update_url_val !== this.#input_fw_update_server_url.getVal()) {
      this.#input_fw_update_server_url.setVal(fw_update_url_val)
    }
    if (!this.#is_valid_http_url(fw_update_url_val)) {
      this.#input_fw_update_server_url.setInvalid()
      this.#button_fw_update_server_save.disable()
      return
    }

    gui_loading.bodyClassLoadingAdd()
    GwStatus.stopCheckingStatus()
    await Network.waitWhileInProgress()

    this.#input_fw_update_server_url.clearValidationIcon()
    this.#input_fw_update_server_url.setValidationRequired()

    let params = {
      input_url: this.#input_fw_update_server_url,
      error: this.#text_fw_update_status_error_desc,
      div_status: this.#div_fw_update_status_error,
    }
    this.#div_fw_update_status_error.hide()

    validate_url(this.#auth, this.#input_fw_update_server_url.getVal(), 'check_fw_update_url', 'none', params)
        .then((resp) => {
          if (resp && Object.prototype.toString.call(resp) === '[object Object]') {
            console.log(log_wrap(`validate_url resp: ${resp}`))

            if (this.#on_get_latest_release_info(resp)) {
              this.#button_fw_update_server_save.enable()
            }
          }
        })
        .finally(() => {
          // this.#on_remote_cfg_changed()
          gui_loading.bodyClassLoadingRemove()
          GwStatus.startCheckingStatus()
        })
  }

  async #on_button_url_fw_update_server_save () {
    this.#div_updating_status_error.hide()
    let fw_update_url_val = this.#input_fw_update_server_url.getVal()
    if (fw_update_url_val.indexOf('://') === -1) {
      fw_update_url_val = 'https://' + fw_update_url_val
    }
    if (fw_update_url_val !== this.#input_fw_update_server_url.getVal()) {
      this.#input_fw_update_server_url.setVal(fw_update_url_val)
    }
    if (!this.#is_valid_http_url(fw_update_url_val)) {
      this.#input_fw_update_server_url.setInvalid()
      this.#button_fw_update_server_save.disable()
      return
    }

    gui_loading.bodyClassLoadingAdd()
    GwStatus.stopCheckingStatus()
    await Network.waitWhileInProgress()

    this.#div_updating_status_error.hide()

    const timeout = 8 * 1000
    const json_data = { 'url': fw_update_url_val }
    Network.httpPostJson('/fw_update_url.json', timeout, json_data).then((data) => {
      const status = data['status']
      let message = data['message']
      if (message === undefined) {
        message = ''
      }
      if (status === 200) {
        this.#button_fw_update_server_save.disable()
      } else {
        this.#text_updating_status_error_desc.setVal(`Status: ${status}, Message: ${message}`)
        this.#div_updating_status_error.show()
      }
    }).catch((err) => {
      console.log(log_wrap(`POST /fw_update_url.json: failure: ${err}`))
      this.#text_updating_status_error_desc.setVal(`${err}`)
      this.#div_updating_status_error.show()
    }).finally(() => {
      gui_loading.bodyClassLoadingRemove()
      GwStatus.startCheckingStatus()
    })
  }

  async #on_button_upgrade () {
    this.#set_software_update_status_empty()
    this.#input_fw_update_binary_files_url.clearValidationIcon()
    let software_update_url_val = this.#input_fw_update_binary_files_url.getVal()

    if (software_update_url_val.indexOf('://') === -1) {
      software_update_url_val = 'http://' + software_update_url_val
    }
    if (!software_update_url_val.endsWith('/')) {
      software_update_url_val += '/'
    }
    if (software_update_url_val !== this.#input_fw_update_binary_files_url.getVal()) {
      this.#input_fw_update_binary_files_url.setVal(software_update_url_val)
    }
    if (!this.#is_valid_http_url(software_update_url_val)) {
      this.#input_fw_update_binary_files_url.setInvalid()
      this.#button_upgrade.disable()
      return
    }
    gui_loading.bodyClassLoadingAdd()
    GwStatus.stopCheckingStatus()
    await Network.waitWhileInProgress()

    const timeout = 8 * 60 * 1000
    const json_data = { 'url': software_update_url_val }
    Network.httpPostJson('/fw_update.json', timeout, json_data).then((data) => {
      const status = data['status']
      let message = data['message']
      if (message === undefined) {
        message = ''
      }
      if (status === 200) {
        Navigation.change_url_software_update_progress()
      } else {
        this.#text_updating_status_error_desc.setVal(`Status: ${status}, Message: ${message}`)
        this.#div_updating_status_error.show()
        this.#input_fw_update_binary_files_url.setInvalid()
      }
    }).catch((err) => {
      console.log(log_wrap(`POST /fw_update.json: failure: ${err}`))
      this.#text_updating_status_error_desc.setVal(`${err}`)
      this.#div_updating_status_error.show()
      this.#input_fw_update_binary_files_url.setInvalid()
    }).finally(() => {
      gui_loading.bodyClassLoadingRemove()
      GwStatus.startCheckingStatus()
    })
  }
}

export default PageSoftwareUpdate

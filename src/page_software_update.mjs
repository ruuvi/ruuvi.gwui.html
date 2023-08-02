/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import { log_wrap } from './utils.mjs'
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

class PageSoftwareUpdate {
  #latest_version = null
  #latest_url = null
  #flagLatestFirmwareVersionSupported = false
  #section = $('section#page-software_update')
  #checkbox_software_update_set_url_manually = new GuiCheckbox($('#software_update-set-url-manually'))
  #div_software_update_url = new GuiDiv($('#software_update-url-div'))
  #input_software_update_url = new GuiInputTextWithValidation($('#software_update-url'))
  #button_upgrade = new GuiButton($('#software_update-button-upgrade'))

  #button_continue = new GuiButtonContinue($('#page-software_update-button-continue'))
  #div_in_button_continue_no_update = new GuiText($('#page-software_update-button-continue_no_update'))
  #div_in_button_continue_without_update = new GuiText($('#page-software_update-button-continue_without_update'))
  #button_back = new GuiButtonBack($('#page-software_update-button-back'))

  #div_version_info = new GuiDiv($('#page-software_update-version_info'))
  #text_version_latest = new GuiText($('#software_update-version-latest'))
  #text_version_current = new GuiText($('#software_update-version-current'))

  #div_in_progress = new GuiDiv($('#page-software_update-in_progress'))

  #div_status = new GuiDiv($('#page-software_update-status'))
  #div_status_ok_already_latest = new GuiDiv($('#software_update-status-ok-already_latest'))
  #div_status_ok_latest_not_supported = new GuiDiv($('#software_update-status-ok-latest_not_supported'))
  #div_status_ok_update_available = new GuiDiv($('#software_update-status-ok-update_available'))
  #div_status_error = new GuiDiv($('#software_update-status-error'))

  #div_updating_status_error = new GuiDiv($('#page-software_update-updating-status-error'))
  #text_updating_status_error_desc = new GuiText($('#page-software_update-updating-status-error-desc'))

  #sect_advanced = new GuiSectAdvanced($('#page-software_update-advanced-button'))

  constructor (cur_fw_ver) {
    this.#section.bind('onShow', async () => this.#onShow())
    this.#section.bind('onHide', async () => this.#onHide())

    this.#input_software_update_url.on_change(() => this.#on_change_url())
    this.#button_upgrade.on_click(async () => this.#on_button_upgrade())
    this.#checkbox_software_update_set_url_manually.on_change(() => this.#on_change_url())
    this.#button_continue.on_click(() => Navigation.change_page_to_remote_cfg())

    this.#text_version_current.setVal(cur_fw_ver)
  }

  async #onShow () {
    console.log(log_wrap('section#page-software_update: onShow'))
    this.#checkbox_software_update_set_url_manually.setUnchecked()
    if (this.#text_version_latest.getVal() !== '') {
      this.#input_software_update_url.setVal(this.#latest_url)
      return
    }
    this.#button_upgrade.disable()
    this.#div_status.hide()
    this.#div_in_progress.show()

    this.#div_status_ok_already_latest.hide()
    this.#div_status_ok_latest_not_supported.hide()
    this.#div_status_ok_update_available.hide()
    this.#div_status_error.hide()

    this.#sect_advanced.disable()

    this.#on_change_url()

    gui_loading.bodyClassLoadingAdd()
    GwStatus.stopCheckingStatus()
    await Network.waitWhileInProgress()

    Network.httpGetJson('/github_latest_release.json', 40000).then((data) => {
      this.#on_get_latest_release_info(data)
    }).catch((err) => {
      console.log(log_wrap(`GET github_latest_release.json failed: ${err}`))
      this.#div_in_progress.hide()
      this.#sect_advanced.enable()
      this.#div_status_ok_update_available.hide()
      this.#div_status_ok_already_latest.hide()
      this.#div_status_ok_latest_not_supported.hide()
      this.#div_status_error.show()
      this.#div_status.show()
    }).finally(() => {
      gui_loading.bodyClassLoadingRemove()
      GwStatus.startCheckingStatus()
    })
  }

  async #onHide () {
    console.log(log_wrap('section#page-software_update: onHide'))
    this.#on_change_url()
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
      console.warn("'latest' object should have 'version' and 'url' properties");
      return;
    }
    this.#latest_version = latest.version
    this.#latest_url = latest.url
    const beta_version = beta?.version;
    const beta_url = beta?.url;
    const alpha_version = alpha?.version;
    const alpha_url = alpha?.url;

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

    this.#input_software_update_url.setVal(this.#latest_url)

    this.#sect_advanced.enable()

    this.#div_status_ok_already_latest.hide()
    this.#div_status_ok_latest_not_supported.hide()
    this.#div_status_ok_update_available.hide()
    this.#div_status_error.hide()

    if (!this.#flagLatestFirmwareVersionSupported) {
      this.#div_status_ok_latest_not_supported.show()
    } else {
      if (this.#text_version_current.getVal() === this.#text_version_latest.getVal()) {
        this.#div_status_ok_already_latest.show()
        this.#button_upgrade.disable()
      } else {
        this.#div_status_ok_update_available.show()
        this.#button_upgrade.enable()
      }
    }
  }

  #on_change_url () {
    this.#div_status_error.hide()
    if (this.#checkbox_software_update_set_url_manually.isChecked()) {
      if (this.#is_valid_http_url(this.#input_software_update_url.getVal())) {
        this.#input_software_update_url.clearValidationIcon()
        this.#button_upgrade.enable()
      } else {
        this.#input_software_update_url.setInvalid()
        this.#button_upgrade.disable()
      }
      this.#div_version_info.hide()
      this.#div_status.hide()
      this.#div_software_update_url.show()
      this.#button_continue.hide()
    } else {
      if (this.#text_version_latest.getVal() !== '') {
        this.#input_software_update_url.setVal(this.#latest_url)
        if (this.#text_version_latest.getVal() === '' || this.#text_version_current.getVal() === this.#text_version_latest.getVal()) {
          this.#button_upgrade.disable()
        } else {
          this.#button_upgrade.enable()
        }
      }
      this.#input_software_update_url.clearValidationIcon()
      this.#div_software_update_url.hide()
      this.#div_version_info.show()
      this.#div_status.show()
      this.#button_continue.show()
      if (!this.#flagLatestFirmwareVersionSupported) {
        this.#button_upgrade.disable()
      }
    }
  }

  async #on_button_upgrade () {
    this.#div_status_error.hide()
    let software_update_url_val = this.#input_software_update_url.getVal()

    if (software_update_url_val.indexOf('://') === -1) {
      software_update_url_val = 'http://' + software_update_url_val
    }
    if (!software_update_url_val.endsWith('/')) {
      software_update_url_val += '/'
    }
    if (software_update_url_val !== this.#input_software_update_url.getVal()) {
      this.#input_software_update_url.setVal(software_update_url_val)
    }
    if (!this.#is_valid_http_url(software_update_url_val)) {
      this.#input_software_update_url.setInvalid()
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
      }
    }).catch((err) => {
      console.log(log_wrap(`POST /fw_update.json: failure: ${err}`))
      this.#text_updating_status_error_desc.setVal(`${err}`)
      this.#div_updating_status_error.show()
    }).finally(() => {
      gui_loading.bodyClassLoadingRemove()
      GwStatus.startCheckingStatus()
    })
  }
}

export default PageSoftwareUpdate

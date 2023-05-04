/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import GuiDiv from './gui_div.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import Network from './network.mjs'
import Navigation from './navigation.mjs'
import GwStatus from './gw_status.mjs'
import GuiText from './gui_text.mjs'
import GuiProgress from './gui_progress.mjs'

class PageSoftwareUpdateProgress {
  #section = $('section#page-software_update_progress')
  #fw_updating_stage = 0
  #div_info = new GuiDiv($('#page-software_update_progress-info'))
  #div_status_completed_successfully = new GuiDiv($('#software_update_progress-status-completed_successfully'))
  #div_status_completed_unsuccessfully = new GuiDiv($('#software_update_progress-status-completed_unsuccessfully'))
  #div_button_container_configure = new GuiDiv($('#page-software_update_progress-button_container-configure'))
  #button_configure = new GuiButtonContinue($('#page-software_update_progress-button-configure'))
  #div_software_update_progress_info = new GuiDiv($('#page-software_update_progress-info'))
  #div_software_update_progress_status_completed_successfully = new GuiDiv($('#software_update_progress-status-completed_successfully'))
  #div_software_update_progress_status_completed_unsuccessfully = new GuiDiv($('#software_update_progress-status-completed_unsuccessfully'))
  #text_software_update_progress_status_completed_unsuccessfully_message = new GuiText($('#software_update_progress-status-completed_unsuccessfully-message'))
  #div_software_update_progress_button_container_configure = new GuiDiv($('#page-software_update_progress-button_container-configure'))
  #div_completed_unsuccessfully_because_of_gateway_reboot = new GuiDiv($('#software_update_progress-status-completed_unsuccessfully-because_of_gateway_reboot'))
  #progress_stage1 = new GuiProgress($('#software_update_progress-stage1'))
  #progress_stage2 = new GuiProgress($('#software_update_progress-stage2'))
  #progress_stage3 = new GuiProgress($('#software_update_progress-stage3'))
  #progress_stage4 = new GuiProgress($('#software_update_progress-stage4'))

  constructor () {
    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())

    this.#button_configure.on_click(() => this.#onButtonConfigure())
  }

  #onShow () {
    console.log(log_wrap('page-software_update_progress: onShow'))
    this.#div_info.show()
    this.#div_status_completed_successfully.hide()
    this.#div_status_completed_unsuccessfully.hide()
    this.#div_button_container_configure.hide()
    this.#fw_updating_stage = 0
    GwStatus.setCallbackFirmwareUpdatingProgress((fw_updating_stage, fw_updating_percentage, err_message) =>
        this.#firmwareUpdatingProgress(fw_updating_stage, fw_updating_percentage, err_message))
  }

  #onHide () {
    console.log(log_wrap('page-software_update_progress: onHide'))
    GwStatus.setCallbackFirmwareUpdatingProgress(null)
  }

  #onButtonConfigure () {
    Network.httpPostJson('/fw_update_reset', 10000, JSON.stringify({})).then((data) => {
      Navigation.change_page_to_network_type()
    }).catch((err) => {
      console.log(log_wrap(`POST /fw_update_reset failed: ${err}`))
    })
  }

  #firmwareUpdatingProgress (fw_updating_stage, fw_updating_percentage, err_message) {
    if (!fw_updating_stage && this.#fw_updating_stage > 0) {
      this.#div_software_update_progress_info.hide()
      this.#div_software_update_progress_status_completed_unsuccessfully.show()
      this.#div_completed_unsuccessfully_because_of_gateway_reboot.show()
      GwStatus.stopCheckingStatus()
      return true
    }

    this.#fw_updating_stage = fw_updating_stage
    if (this.#fw_updating_stage === 0) {
      return false
    }
    switch (this.#fw_updating_stage) {
      case 1:
        this.#progress_stage1.setVal(fw_updating_percentage)
        break
      case 2:
        this.#progress_stage2.setVal(fw_updating_percentage)
        this.#progress_stage1.setVal(100)
        break
      case 3:
        this.#progress_stage3.setVal(fw_updating_percentage)
        this.#progress_stage1.setVal(100)
        this.#progress_stage2.setVal(100)
        break
      case 4:
        this.#progress_stage4.setVal(fw_updating_percentage)
        this.#progress_stage1.setVal(100)
        this.#progress_stage2.setVal(100)
        this.#progress_stage3.setVal(100)
        break
      case 5: // completed successfully
        this.#progress_stage1.setVal(100)
        this.#progress_stage2.setVal(100)
        this.#progress_stage3.setVal(100)
        this.#progress_stage4.setVal(100)
        this.#div_software_update_progress_info.hide()
        this.#div_software_update_progress_status_completed_successfully.show()
        GwStatus.stopCheckingStatus()
        break
      case 6: // completed unsuccessfully
        this.#div_software_update_progress_info.hide()
        this.#div_software_update_progress_status_completed_unsuccessfully.show()
        this.#text_software_update_progress_status_completed_unsuccessfully_message.setVal(err_message)
        break
      case 7: // nRF52 firmware updating on reboot completed unsuccessfully
        this.#div_software_update_progress_info.hide()
        this.#div_software_update_progress_status_completed_unsuccessfully.show()
        this.#text_software_update_progress_status_completed_unsuccessfully_message.setVal(err_message)
        this.#div_software_update_progress_button_container_configure.show()
        break
    }
    return true
  }
}

export default PageSoftwareUpdateProgress

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import GuiText from './gui_text.mjs'
import GuiSpan from "./gui_span.mjs"

class AppInfo {
  #app_header = new GuiText($('#app-header'))
  #app_footer_fw_ver = new GuiSpan($('#app-footer-fw_ver'))
  #app_footer_fw_ver_nrf52 = new GuiSpan($('#app-footer-fw_ver_nrf52'))
  #app_document = document

  setGatewayNameSuffix (gatewayNameSuffix) {
    this.#app_header.setVal('Ruuvi Gateway ' + gatewayNameSuffix)
    this.#app_document.title = `Ruuvi Gateway ${gatewayNameSuffix} Configuration Wizard`
  }

  setFirmwareVersions (fw_ver, nrf52_fw_ver) {
    this.#app_footer_fw_ver.setVal(fw_ver)
    this.#app_footer_fw_ver_nrf52.setVal(nrf52_fw_ver)
  }
}

export default AppInfo

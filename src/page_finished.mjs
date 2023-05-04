/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import { log_wrap } from './utils.mjs'
import GuiDiv from './gui_div.mjs'
import GuiText from './gui_text.mjs'
import GwStatus from './gw_status.mjs'
import GuiOverlay from './gui_overlay.mjs'
import gui_loading from './gui_loading.mjs'
import Navigation from './navigation.mjs'

class PageFinished {
  /** @type GwCfg */
  #gwCfg

  /** @type Auth */
  #auth

  #section = $('section#page-finished')
  #div_connected_wifi = new GuiDiv($('#connected-wifi'))
  #text_connected_wifi_network_name = new GuiText($('#connected-wifi-network_name'))
  #div_connected_eth = new GuiDiv($('#connected-eth'))
  #text_ip = new GuiText($('#ip'))
  #text_netmask = new GuiText($('#netmask'))
  #text_gw = new GuiText($('#gw'))
  #div_dhcp_block = new GuiDiv($('#dhcp-block'))
  #text_dhcp = new GuiText($('#dhcp'))
  #overlay_no_gateway_connection = new GuiOverlay($('#overlay-no_gateway_connection'))

  /**
   *
   * @param {GwCfg} gwCfg
   * @param {Auth} auth
   */
  constructor (gwCfg, auth) {
    this.#gwCfg = gwCfg
    this.#auth = auth

    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())
  }

  #onShow () {
    console.log(log_wrap('section#page-finished: onShow'))
    GwStatus.stopCheckingStatus()
    if (Navigation.isRequiredToSaveCfgOnPageFinished()) {
      gui_loading.bodyClassLoadingAdd()
      this.#gwCfg.saveConfig(this.#auth).then(() => {
        console.log(log_wrap(`saveConfig ok`))
      }).catch((err) => {
        console.log(log_wrap(`saveConfig failed: ${err}`))
        this.#overlay_no_gateway_connection.fadeIn()
      }).finally(() => {
        gui_loading.bodyClassLoadingRemove()
      })
    }
    const networkConnectionInfo = GwStatus.getNetworkConnectionInfo()
    if (networkConnectionInfo.ssid) {
      this.#div_connected_wifi.show()
      this.#div_connected_eth.hide()
      this.#text_connected_wifi_network_name.setVal(networkConnectionInfo.ssid)
    } else {
      this.#div_connected_wifi.hide()
      this.#div_connected_eth.show()
    }
    this.#text_ip.setVal(networkConnectionInfo.ip)
    this.#text_netmask.setVal(networkConnectionInfo.netmask)
    this.#text_gw.setVal(networkConnectionInfo.gw)
    if (networkConnectionInfo.dhcp) {
      this.#text_dhcp.setVal(networkConnectionInfo.dhcp)
      this.#div_dhcp_block.show()
    } else {
      this.#div_dhcp_block.hide()
    }
  }

  #onHide () {
    console.log(log_wrap('section#page-finished: onHide'))
  }

}

export default PageFinished

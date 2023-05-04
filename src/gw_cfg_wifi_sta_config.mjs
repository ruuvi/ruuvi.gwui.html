/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgWifiStaCfg {
  ssid = null
  password = null

  parse (data) {
    let wifi_sta_cfg = utils.fetchObjectKeyFromData(data, 'wifi_sta_config')
    if (null == wifi_sta_cfg) {
      return
    }
    this.ssid = utils.fetchStringKeyFromData(wifi_sta_cfg, 'ssid')
    this.password = utils.fetchStringKeyFromData(wifi_sta_cfg, 'password')

    if (Object.keys(wifi_sta_cfg).length !== 0) {
      throw Error(`Unhandled keys in gw_cfg.json:wifi_sta_config: ${JSON.stringify(wifi_sta_cfg)}`)
    }
  }
}

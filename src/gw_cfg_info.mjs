/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgInfo {
  fw_ver = null
  nrf52_fw_ver = null
  gw_mac = null

  parse (data) {
    this.fw_ver = utils.fetchStringKeyFromData(data, 'fw_ver', true)
    this.nrf52_fw_ver = utils.fetchStringKeyFromData(data, 'nrf52_fw_ver', true)
    this.gw_mac = utils.fetchStringKeyFromData(data, 'gw_mac', true)
  }
}

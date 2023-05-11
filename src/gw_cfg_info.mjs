/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgInfo {
  fw_ver = null
  nrf52_fw_ver = null
  gw_mac = null
  storage_client_cert = false
  storage_client_key = false
  storage_cert_http = false
  storage_cert_stat = false
  storage_cert_remote = false
  storage_cert_mqtt = false

  parse (data) {
    this.fw_ver = utils.fetchStringKeyFromData(data, 'fw_ver', true)
    this.nrf52_fw_ver = utils.fetchStringKeyFromData(data, 'nrf52_fw_ver', true)
    this.gw_mac = utils.fetchStringKeyFromData(data, 'gw_mac', true)

    let storage = utils.fetchObjectKeyFromData(data, 'storage')
    if (null == storage) {
      return
    }
    this.storage_client_cert = utils.fetchBoolKeyFromData(storage, 'client_cert.pem', false, false)
    this.storage_client_key = utils.fetchBoolKeyFromData(storage, 'client_key.pem', false, false)
    this.storage_cert_http = utils.fetchBoolKeyFromData(storage, 'cert_http.pem', false, false)
    this.storage_cert_stat = utils.fetchBoolKeyFromData(storage, 'cert_stat.pem', false, false)
    this.storage_cert_remote = utils.fetchBoolKeyFromData(storage, 'cert_remote.pem', false, false)
    this.storage_cert_mqtt = utils.fetchBoolKeyFromData(storage, 'cert_mqtt.pem', false, false)

    if (Object.keys(storage).length !== 0) {
      throw Error(`Unhandled keys in gw_cfg.json:storage: ${JSON.stringify(storage)}`)
    }
  }
}

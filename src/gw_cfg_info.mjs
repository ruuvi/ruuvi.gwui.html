/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgInfo {
  fw_ver = null
  nrf52_fw_ver = null
  gw_mac = null
  storage_ready = false
  storage_http_cli_cert = false
  storage_http_cli_key = false
  storage_http_srv_cert = false
  storage_stat_cli_cert = false
  storage_stat_cli_key = false
  storage_stat_srv_cert = false
  storage_remote_cfg_cli_cert = false
  storage_remote_cfg_cli_key = false
  storage_remote_cfg_srv_cert = false
  storage_mqtt_cli_cert = false
  storage_mqtt_cli_key = false
  storage_mqtt_srv_cert = false

  parse (data) {
    this.fw_ver = utils.fetchStringKeyFromData(data, 'fw_ver', true)
    this.nrf52_fw_ver = utils.fetchStringKeyFromData(data, 'nrf52_fw_ver', true)
    this.gw_mac = utils.fetchStringKeyFromData(data, 'gw_mac', true)

    let storage = utils.fetchObjectKeyFromData(data, 'storage')
    if (null == storage) {
      return
    }
    this.storage_ready = utils.fetchBoolKeyFromData(storage, 'storage_ready', false, false)

    this.storage_http_cli_cert = utils.fetchBoolKeyFromData(storage, 'http_cli_cert', false, false)
    this.storage_http_cli_key = utils.fetchBoolKeyFromData(storage, 'http_cli_key', false, false)
    this.storage_http_srv_cert = utils.fetchBoolKeyFromData(storage, 'http_srv_cert', false, false)

    this.storage_stat_cli_cert = utils.fetchBoolKeyFromData(storage, 'stat_cli_cert', false, false)
    this.storage_stat_cli_key = utils.fetchBoolKeyFromData(storage, 'stat_cli_key', false, false)
    this.storage_stat_srv_cert = utils.fetchBoolKeyFromData(storage, 'stat_srv_cert', false, false)

    this.storage_remote_cfg_cli_cert = utils.fetchBoolKeyFromData(storage, 'rcfg_cli_cert', false, false)
    this.storage_remote_cfg_cli_key = utils.fetchBoolKeyFromData(storage, 'rcfg_cli_key', false, false)
    this.storage_remote_cfg_srv_cert = utils.fetchBoolKeyFromData(storage, 'rcfg_srv_cert', false, false)

    this.storage_mqtt_cli_cert = utils.fetchBoolKeyFromData(storage, 'mqtt_cli_cert', false, false)
    this.storage_mqtt_cli_key = utils.fetchBoolKeyFromData(storage, 'mqtt_cli_key', false, false)
    this.storage_mqtt_srv_cert = utils.fetchBoolKeyFromData(storage, 'mqtt_srv_cert', false, false)

    if (Object.keys(storage).length !== 0) {
      throw Error(`Unhandled keys in gw_cfg.json:storage: ${JSON.stringify(storage)}`)
    }
  }
}

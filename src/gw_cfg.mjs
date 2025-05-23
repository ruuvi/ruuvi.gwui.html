/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import Network from './network.mjs'
import { GwCfgInfo } from './gw_cfg_info.mjs'
import { GwCfgEth } from './gw_cfg_eth.mjs'
import { GwCfgHttp } from './gw_cfg_http.mjs'
import { GwCfgHttpStat } from './gw_cfg_http_stat.mjs'
import { GwCfgMqtt } from './gw_cfg_mqtt.mjs'
import { GwCfgRemoteCfg, REMOTE_CFG_AUTH_TYPE } from './gw_cfg_remote_cfg.mjs'
import { GwCfgLanAuth } from './gw_cfg_lan_auth.mjs'
import { GwCfgAutoUpdate } from './gw_cfg_auto_update.mjs'
import { GwCfgNtp } from './gw_cfg_ntp.mjs'
import { GwCfgCompanyFilter } from './gw_cfg_company_filter.mjs'
import { GwCfgScan } from './gw_cfg_scan.mjs'
import { GwCfgCoordinates } from './gw_cfg_coordinates.mjs'
import { GwCfgWifiAPCfg } from './gw_cfg_wifi_ap_config.mjs'
import { GwCfgWifiStaCfg } from './gw_cfg_wifi_sta_config.mjs'
import { GwCfgFwUpdateUrl } from "./gw_cfg_fw_update_url.mjs";

export class GwCfg {
  info = new GwCfgInfo()
  eth = new GwCfgEth()
  http = new GwCfgHttp()
  http_stat = new GwCfgHttpStat()
  mqtt = new GwCfgMqtt()
  remote_cfg = new GwCfgRemoteCfg()
  lan_auth = new GwCfgLanAuth()
  auto_update = new GwCfgAutoUpdate()
  ntp = new GwCfgNtp()
  company_filter = new GwCfgCompanyFilter()
  scan = new GwCfgScan()
  coordinates = new GwCfgCoordinates()
  fw_update_url = new GwCfgFwUpdateUrl()
  wifi_ap_cfg = new GwCfgWifiAPCfg()
  wifi_sta_cfg = new GwCfgWifiStaCfg()

  constructor () {
  }

  is_use_ruuvi_cloud_with_default_options () {
    return this.http.is_default() &&
        this.http_stat.is_default() &&
        this.mqtt.is_default() &&
        this.ntp.is_default() &&
        this.company_filter.is_default() &&
        this.scan.is_default()
  }

  is_use_ruuvi_scan_with_default_options () {
    return this.company_filter.is_default() &&
        this.scan.is_default()
  }

  #parseResponse (data) {
    this.info.parse(data)
    this.eth.parse(data)
    this.http.parse(data)
    this.http_stat.parse(data)
    this.mqtt.parse(data)
    this.remote_cfg.parse(data)
    this.lan_auth.parse(data)
    this.auto_update.parse(data)
    this.ntp.parse(data)
    this.company_filter.parse(data)
    this.scan.parse(data)
    this.coordinates.parse(data)
    this.fw_update_url.parse(data)
    this.wifi_ap_cfg.parse(data)
    this.wifi_sta_cfg.parse(data)

    if (Object.keys(data).length !== 0) {
      throw Error(`Unhandled keys in gw_cfg.json: ${JSON.stringify(data)}`)
    }
  }

  async fetch () {
    const data = await Network.httpGetJson('/ruuvi.json', 10000)
    // logger.debug(`FetchGwCfg: data: ${JSON.stringify(data)}`)
    this.#parseResponse(data)
  }

  async #prepNetworkConfig () {
    let data = {}
    data.use_eth = this.eth.use_eth
    if (this.eth.use_eth) {
      data.eth_dhcp = this.eth.eth_dhcp
      if (!this.eth.eth_dhcp) {
        data.eth_static_ip = this.eth.eth_static_ip
        data.eth_netmask = this.eth.eth_netmask
        data.eth_gw = this.eth.eth_gw
        data.eth_dns1 = this.eth.eth_dns1
        data.eth_dns2 = this.eth.eth_dns2
      }
    } else {
      data.wifi_ap_config = {}
      data.wifi_ap_config.channel = this.wifi_ap_cfg.channel
    }
    return data;
  }

  async testPrepNetworkConfig() {
    return await this.#prepNetworkConfig()
  }

  async saveNetworkConfig (auth) {
    const data = await this.#prepNetworkConfig()
    return Network.httpEncryptAndPostJson(auth, '/ruuvi.json', 5000, data)
  }

  async #prepFwUpdateUrl () {
    let data = {}
    data.fw_update_url = this.fw_update_url.fw_update_url
    return data
  }

  async testPrepFwUpdateUrl() {
    return await this.#prepFwUpdateUrl()
  }

  async saveFwUpdateUrl (auth) {
    const data = await this.#prepFwUpdateUrl()
    return Network.httpEncryptAndPostJson(auth, '/ruuvi.json', 5000, data)
  }

  async #prepConfig () {
    let data = {}

    data.remote_cfg_use = this.remote_cfg.remote_cfg_use
    data.remote_cfg_url = this.remote_cfg.remote_cfg_url
    data.remote_cfg_refresh_interval_minutes = this.remote_cfg.remote_cfg_refresh_interval_minutes
    if (this.remote_cfg.remote_cfg_auth_type.isBasicAuth()) {
      data.remote_cfg_auth_type = REMOTE_CFG_AUTH_TYPE.BASIC
      data.remote_cfg_auth_basic_user = this.remote_cfg.remote_cfg_auth_basic_user
      if (this.remote_cfg.remote_cfg_auth_basic_pass !== undefined) {
        data.remote_cfg_auth_basic_pass = this.remote_cfg.remote_cfg_auth_basic_pass
      }
    } else if (this.remote_cfg.remote_cfg_auth_type.isBearerAuth()) {
      data.remote_cfg_auth_type = REMOTE_CFG_AUTH_TYPE.BEARER
      if (this.remote_cfg.remote_cfg_auth_bearer_token !== undefined) {
        data.remote_cfg_auth_bearer_token = this.remote_cfg.remote_cfg_auth_bearer_token
      }
    } else {
      data.remote_cfg_auth_type = REMOTE_CFG_AUTH_TYPE.NONE
    }
    data.remote_cfg_use_ssl_client_cert = this.remote_cfg.remote_cfg_use_ssl_client_cert
    data.remote_cfg_use_ssl_server_cert = this.remote_cfg.remote_cfg_use_ssl_server_cert

    data.use_http_ruuvi = this.http.use_http_ruuvi
    data.use_http = this.http.use_http
    data.http_url = this.http.http_url
    data.http_period = this.http.http_period
    data.http_data_format = this.http.http_data_format.getVal()
    data.http_auth = this.http.http_auth.getVal()
    if (this.http.http_auth.isNone()) {
      // do nothing
    } else if (this.http.http_auth.isBasic()) {
      data.http_user = this.http.http_user
      data.http_pass = this.http.http_pass
    } else if (this.http.http_auth.isBearer()) {
      data.http_bearer_token = this.http.http_bearer_token
    } else if (this.http.http_auth.isToken()) {
      data.http_api_key = this.http.http_api_key
    } else if (this.http.http_auth.isApiKey()) {
      data.http_api_key = this.http.http_api_key
    }
    data.http_use_ssl_client_cert = this.http.http_use_ssl_client_cert
    data.http_use_ssl_server_cert = this.http.http_use_ssl_server_cert

    data.use_http_stat = this.http_stat.use_http_stat
    data.http_stat_url = this.http_stat.http_stat_url
    data.http_stat_user = this.http_stat.http_stat_user
    if (this.http_stat.http_stat_pass !== undefined) {
      data.http_stat_pass = this.http_stat.http_stat_pass
    }
    data.http_stat_use_ssl_client_cert = this.http_stat.http_stat_use_ssl_client_cert
    data.http_stat_use_ssl_server_cert = this.http_stat.http_stat_use_ssl_server_cert

    data.use_mqtt = this.mqtt.use_mqtt

    data.mqtt_disable_retained_messages = this.mqtt.mqtt_disable_retained_messages
    data.mqtt_transport = this.mqtt.mqtt_transport.getVal()
    data.mqtt_data_format = this.mqtt.mqtt_data_format.getVal()
    data.mqtt_server = this.mqtt.mqtt_server
    data.mqtt_port = this.mqtt.mqtt_port
    data.mqtt_sending_interval = this.mqtt.mqtt_sending_interval
    data.mqtt_prefix = this.mqtt.mqtt_prefix
    data.mqtt_client_id = this.mqtt.mqtt_client_id
    data.mqtt_user = this.mqtt.mqtt_user
    if (this.mqtt.mqtt_pass !== undefined) {
      data.mqtt_pass = this.mqtt.mqtt_pass
    }
    data.mqtt_use_ssl_client_cert = this.mqtt.mqtt_use_ssl_client_cert
    data.mqtt_use_ssl_server_cert = this.mqtt.mqtt_use_ssl_server_cert

    data.lan_auth_type = this.lan_auth.lan_auth_type.getVal()
    data.lan_auth_user = this.lan_auth.lan_auth_user
    if (this.lan_auth.lan_auth_pass !== undefined) {
      data.lan_auth_pass = this.lan_auth.lan_auth_pass
    }
    if (this.lan_auth.lan_auth_api_key !== undefined) {
      data.lan_auth_api_key = this.lan_auth.lan_auth_api_key
    }
    if (this.lan_auth.lan_auth_api_key_rw !== undefined) {
      data.lan_auth_api_key_rw = this.lan_auth.lan_auth_api_key_rw
    }

    data.company_use_filtering = this.company_filter.company_use_filtering
    data.company_id = this.company_filter.company_id

    if (!this.scan.scan_default) {
      data.scan_coded_phy = this.scan.scan_coded_phy
      data.scan_1mbit_phy = this.scan.scan_1mbit_phy
      data.scan_2mbit_phy = this.scan.scan_2mbit_phy
      data.scan_channel_37 = this.scan.scan_channel_37
      data.scan_channel_38 = this.scan.scan_channel_38
      data.scan_channel_39 = this.scan.scan_channel_39
    }
    data.scan_default = this.scan.scan_default

    data.scan_filter_allow_listed = this.scan.scan_filter_allow_listed
    data.scan_filter_list = this.scan.scan_filter_list

    data.auto_update_cycle = this.auto_update.auto_update_cycle.getVal()
    data.auto_update_weekdays_bitmask = this.auto_update.auto_update_weekdays_bitmask
    data.auto_update_interval_from = this.auto_update.auto_update_interval_from
    data.auto_update_interval_to = this.auto_update.auto_update_interval_to
    data.auto_update_tz_offset_hours = this.auto_update.auto_update_tz_offset_hours

    data.ntp_use = this.ntp.ntp_use
    if (data.ntp_use) {
      data.ntp_use_dhcp = this.ntp.ntp_use_dhcp
      if (!this.ntp.ntp_use_dhcp) {
        data.ntp_server1 = this.ntp.ntp_server1
        data.ntp_server2 = this.ntp.ntp_server2
        data.ntp_server3 = this.ntp.ntp_server3
        data.ntp_server4 = this.ntp.ntp_server4
      }
    }
    return data
  }

  async testPrepConfig() {
    return await this.#prepConfig()
  }

  async saveConfig (auth) {
    const data = await this.#prepConfig()
    return Network.httpEncryptAndPostJson(auth, '/ruuvi.json', 10000, data)
  }

  /**
   * @param {Boolean} company_use_filtering
   * @param {Number} company_id
   * @param {Boolean} scan_coded_phy
   * @param {Boolean} scan_1mbit_phy
   * @param {Boolean} scan_2mbit_phy
   * @param {Boolean} scan_channel_37
   * @param {Boolean} scan_channel_38
   * @param {Boolean} scan_channel_39
   * @param {Boolean} scan_default
   * @returns {Object}
   */
  #prepBluetoothScanningConfig(company_use_filtering,
                                    company_id,
                                    scan_coded_phy,
                                    scan_1mbit_phy,
                                    scan_2mbit_phy,
                                    scan_channel_37,
                                    scan_channel_38,
                                    scan_channel_39,
                                    scan_default) {
    let data = {}

    data.company_use_filtering = company_use_filtering
    data.company_id = company_id

    data.scan_default = scan_default
    if (!data.scan_default) {
      data.scan_coded_phy = scan_coded_phy
      data.scan_1mbit_phy = scan_1mbit_phy
      data.scan_2mbit_phy = scan_2mbit_phy
      data.scan_channel_37 = scan_channel_37
      data.scan_channel_38 = scan_channel_38
      data.scan_channel_39 = scan_channel_39
    }
    return data
  }

  /**
   * @param {Boolean} company_use_filtering
   * @param {Number} company_id
   * @param {Boolean} scan_coded_phy
   * @param {Boolean} scan_1mbit_phy
   * @param {Boolean} scan_2mbit_phy
   * @param {Boolean} scan_channel_37
   * @param {Boolean} scan_channel_38
   * @param {Boolean} scan_channel_39
   * @param {Boolean} scan_default
   * @returns {Promise<Object>}
   */
  testPrepBluetoothScanningConfig(company_use_filtering,
                                        company_id,
                                        scan_coded_phy,
                                        scan_1mbit_phy,
                                        scan_2mbit_phy,
                                        scan_channel_37,
                                        scan_channel_38,
                                        scan_channel_39,
                                        scan_default) {
    return this.#prepBluetoothScanningConfig(company_use_filtering,
        company_id,
        scan_coded_phy,
        scan_1mbit_phy,
        scan_2mbit_phy,
        scan_channel_37,
        scan_channel_38,
        scan_channel_39,
        scan_default)
  }

  /**
   * @param {Auth} auth
   * @param {Boolean} company_use_filtering
   * @param {Number} company_id
   * @param {Boolean} scan_coded_phy
   * @param {Boolean} scan_1mbit_phy
   * @param {Boolean} scan_2mbit_phy
   * @param {Boolean} scan_channel_37
   * @param {Boolean} scan_channel_38
   * @param {Boolean} scan_channel_39
   * @param {Boolean} scan_default
   * @return {Promise<Object>}
   */
  async saveBluetoothScanningConfig(auth,
                                    company_use_filtering,
                                    company_id,
                                    scan_coded_phy,
                                    scan_1mbit_phy,
                                    scan_2mbit_phy,
                                    scan_channel_37,
                                    scan_channel_38,
                                    scan_channel_39,
                                    scan_default) {
    const data = this.#prepBluetoothScanningConfig(
        company_use_filtering,
        company_id,
        scan_coded_phy,
        scan_1mbit_phy,
        scan_2mbit_phy,
        scan_channel_37,
        scan_channel_38,
        scan_channel_39,
        scan_default)
    return Network.httpEncryptAndPostJson(auth, '/bluetooth_scanning.json', 10000, data)
  }
}

function createGwCfg () {
  return new GwCfg()
}

export default createGwCfg

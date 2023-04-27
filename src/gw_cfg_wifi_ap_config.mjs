import * as utils from './utils.mjs'

export class GwCfgWifiAPCfg {
  password = null
  channel = null

  parse (data) {
    let wifi_ap_cfg = utils.fetchObjectKeyFromData(data, 'wifi_ap_config')
    if (null == wifi_ap_cfg) {
      return
    }
    this.password = utils.fetchStringKeyFromData(wifi_ap_cfg, 'password')
    this.channel = utils.fetchIntKeyFromData(wifi_ap_cfg, 'channel')

    if (Object.keys(wifi_ap_cfg).length !== 0) {
      throw Error(`Unhandled keys in gw_cfg.json:wifi_ap_config: ${JSON.stringify(wifi_ap_cfg)}`)
    }
  }

  setWiFiChannel (wifi_channel) {
    this.channel = wifi_channel
  }
}

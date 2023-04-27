import * as utils from './utils.mjs'

export class GwCfgEth {
  use_eth = null
  eth_dhcp = null
  eth_static_ip = null
  eth_netmask = null
  eth_gw = null
  eth_dns1 = null
  eth_dns2 = null

  parse (data) {
    this.use_eth = utils.fetchBoolKeyFromData(data, 'use_eth', true)
    this.eth_dhcp = utils.fetchBoolKeyFromData(data, 'eth_dhcp', false, true)
    this.eth_static_ip = utils.fetchStringKeyFromData(data, 'eth_static_ip', false, '')
    this.eth_netmask = utils.fetchStringKeyFromData(data, 'eth_netmask', false, '')
    this.eth_gw = utils.fetchStringKeyFromData(data, 'eth_gw', false, '')
    this.eth_dns1 = utils.fetchStringKeyFromData(data, 'eth_dns1', false, '')
    this.eth_dns2 = utils.fetchStringKeyFromData(data, 'eth_dns2', false, '')
  }
}

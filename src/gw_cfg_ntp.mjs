/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgNtp {
  static NTP_DEFAULT = Object.freeze({
    'SERVER1': 'time.google.com',
    'SERVER2': 'time.cloudflare.com',
    'SERVER3': 'pool.ntp.org',
    'SERVER4': 'time.ruuvi.com',
  })

  ntp_use = null
  ntp_use_dhcp = null
  ntp_server1 = null
  ntp_server2 = null
  ntp_server3 = null
  ntp_server4 = null

  parse (data) {
    this.ntp_use = utils.fetchBoolKeyFromData(data, 'ntp_use', true)
    this.ntp_use_dhcp = utils.fetchBoolKeyFromData(data, 'ntp_use_dhcp', false, false)
    this.ntp_server1 = utils.fetchStringKeyFromData(data, 'ntp_server1', false, GwCfgNtp.NTP_DEFAULT.SERVER1)
    this.ntp_server2 = utils.fetchStringKeyFromData(data, 'ntp_server2', false, GwCfgNtp.NTP_DEFAULT.SERVER2)
    this.ntp_server3 = utils.fetchStringKeyFromData(data, 'ntp_server3', false, GwCfgNtp.NTP_DEFAULT.SERVER3)
    this.ntp_server4 = utils.fetchStringKeyFromData(data, 'ntp_server4', false, GwCfgNtp.NTP_DEFAULT.SERVER4)
  }

  is_default () {
    return this.ntp_use && !this.ntp_use_dhcp && (this.ntp_server1 === GwCfgNtp.NTP_DEFAULT.SERVER1 &&
        this.ntp_server2 === GwCfgNtp.NTP_DEFAULT.SERVER2 &&
        this.ntp_server3 === GwCfgNtp.NTP_DEFAULT.SERVER3 &&
        this.ntp_server4 === GwCfgNtp.NTP_DEFAULT.SERVER4)
  }

  set_default () {
    this.ntp_use = true
    this.ntp_use_dhcp = false
    this.ntp_server1 = GwCfgNtp.NTP_DEFAULT.SERVER1
    this.ntp_server2 = GwCfgNtp.NTP_DEFAULT.SERVER2
    this.ntp_server3 = GwCfgNtp.NTP_DEFAULT.SERVER3
    this.ntp_server4 = GwCfgNtp.NTP_DEFAULT.SERVER4
  }
}

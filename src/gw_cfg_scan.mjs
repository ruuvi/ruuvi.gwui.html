/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgScan {
  scan_coded_phy = null
  scan_1mbit_phy = null
  scan_extended_payload = null
  scan_channel_37 = null
  scan_channel_38 = null
  scan_channel_39 = null
  scan_filter_allow_listed = null
  scan_filter_list = []

  parse (data) {
    this.scan_coded_phy = utils.fetchBoolKeyFromData(data, 'scan_coded_phy', true)
    this.scan_1mbit_phy = utils.fetchBoolKeyFromData(data, 'scan_1mbit_phy', true)
    this.scan_extended_payload = utils.fetchBoolKeyFromData(data, 'scan_extended_payload', true)
    this.scan_channel_37 = utils.fetchBoolKeyFromData(data, 'scan_channel_37', true)
    this.scan_channel_38 = utils.fetchBoolKeyFromData(data, 'scan_channel_38', true)
    this.scan_channel_39 = utils.fetchBoolKeyFromData(data, 'scan_channel_39', true)
    this.scan_filter_allow_listed = utils.fetchBoolKeyFromData(data, 'scan_filter_allow_listed', false, false)
    let scan_filter_list = utils.fetchListKeyFromData(data, 'scan_filter_list')
    this.scan_filter_list = []
    scan_filter_list.forEach((val, idx) => {
      if (GwCfgScan.isValidMacAddress(val)) {
        this.scan_filter_list.push(val)
      }
    })
  }

  static isValidMacAddress (macAddress) {
    const macAddressRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/
    return macAddressRegex.test(macAddress)
  }

  is_default () {
    return !this.scan_coded_phy && this.scan_1mbit_phy && this.scan_extended_payload &&
        this.scan_channel_37 && this.scan_channel_38 && this.scan_channel_39 &&
        this.scan_filter_list.length === 0
  }

  set_default () {
    this.scan_coded_phy = false
    this.scan_1mbit_phy = true
    this.scan_extended_payload = true
    this.scan_channel_37 = true
    this.scan_channel_38 = true
    this.scan_channel_39 = true
    this.scan_filter_allow_listed = false
    this.scan_filter_list = []
  }
}

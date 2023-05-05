/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

const AUTO_UPDATE_CYCLE_TYPE = Object.freeze({
  'REGULAR': 'regular',
  'BETA_TESTER': 'beta',
  'MANUAL': 'manual',
})

export class GwCfgAutoUpdateCycle {
  #auto_update_cycle

  constructor (val) {
    const allowedValues = Object.values(AUTO_UPDATE_CYCLE_TYPE)
    if (allowedValues.includes(val)) {
      this.#auto_update_cycle = val
    } else {
      throw new Error(`Invalid value for 'auto_update_cycle': ${val}. Allowed values are '${allowedValues.join('\', \'')}'.`)
    }
  }

  getVal () {
    return this.#auto_update_cycle
  }

  isRegular () {
    return this.#auto_update_cycle === AUTO_UPDATE_CYCLE_TYPE.REGULAR
  }

  isBetaTester () {
    return this.#auto_update_cycle === AUTO_UPDATE_CYCLE_TYPE.BETA_TESTER
  }

  isManual () {
    return this.#auto_update_cycle === AUTO_UPDATE_CYCLE_TYPE.MANUAL
  }

  setRegular () {
    this.#auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.REGULAR
  }

  setBetaTester () {
    this.#auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.BETA_TESTER
  }

  setManual () {
    this.#auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.MANUAL
  }
}

export class GwCfgAutoUpdate {
  /** @type GwCfgAutoUpdateCycle */
  auto_update_cycle = null

  auto_update_weekdays_bitmask = null
  auto_update_interval_from = null
  auto_update_interval_to = null
  auto_update_tz_offset_hours = null

  parse (data) {
    this.auto_update_cycle = new GwCfgAutoUpdateCycle(utils.fetchStringKeyFromData(data, 'auto_update_cycle', true))
    this.auto_update_weekdays_bitmask = utils.fetchIntKeyFromData(data, 'auto_update_weekdays_bitmask', false, 127)
    this.auto_update_interval_from = utils.fetchIntKeyFromData(data, 'auto_update_interval_from', false, 0)
    this.auto_update_interval_to = utils.fetchIntKeyFromData(data, 'auto_update_interval_to', false, 24)
    this.auto_update_tz_offset_hours = utils.fetchIntKeyFromData(data, 'auto_update_tz_offset_hours', false, 3)
  }
}

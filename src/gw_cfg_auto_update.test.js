/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgAutoUpdate, GwCfgAutoUpdateCycle } from './gw_cfg_auto_update.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgAutoUpdate', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check auto_update_cycle: regular', () => {
    let data = {
      auto_update_cycle: 'regular',
      auto_update_weekdays_bitmask: 127,
      auto_update_interval_from: 0,
      auto_update_interval_to: 24,
      auto_update_tz_offset_hours: 3,
    }
    let auto_update = new GwCfgAutoUpdate()
    auto_update.parse(data)
    expect(auto_update.auto_update_cycle).to.be.instanceOf(GwCfgAutoUpdateCycle)
    expect(auto_update.auto_update_cycle.isRegular()).to.be.true
    expect(auto_update.auto_update_cycle.isBetaTester()).to.be.false
    expect(auto_update.auto_update_cycle.isManual()).to.be.false

    expect(auto_update.auto_update_weekdays_bitmask).to.equal(127)
    expect(auto_update.auto_update_interval_from).to.equal(0)
    expect(auto_update.auto_update_interval_to).to.equal(24)
    expect(auto_update.auto_update_tz_offset_hours).to.equal(3)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check auto_update_cycle: beta-tester', () => {
    let data = {
      auto_update_cycle: 'beta',
      auto_update_weekdays_bitmask: 63,
      auto_update_interval_from: 1,
      auto_update_interval_to: 23,
      auto_update_tz_offset_hours: 7,
    }
    let auto_update = new GwCfgAutoUpdate()
    auto_update.parse(data)
    expect(auto_update.auto_update_cycle).to.be.instanceOf(GwCfgAutoUpdateCycle)
    expect(auto_update.auto_update_cycle.isRegular()).to.be.false
    expect(auto_update.auto_update_cycle.isBetaTester()).to.be.true
    expect(auto_update.auto_update_cycle.isManual()).to.be.false

    expect(auto_update.auto_update_weekdays_bitmask).to.equal(63)
    expect(auto_update.auto_update_interval_from).to.equal(1)
    expect(auto_update.auto_update_interval_to).to.equal(23)
    expect(auto_update.auto_update_tz_offset_hours).to.equal(7)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check auto_update_cycle: manual, missing optional parameters', () => {
    let data = {
      auto_update_cycle: 'manual',
    }
    let auto_update = new GwCfgAutoUpdate()
    auto_update.parse(data)
    expect(auto_update.auto_update_cycle).to.be.instanceOf(GwCfgAutoUpdateCycle)
    expect(auto_update.auto_update_cycle.isRegular()).to.be.false
    expect(auto_update.auto_update_cycle.isBetaTester()).to.be.false
    expect(auto_update.auto_update_cycle.isManual()).to.be.true

    expect(auto_update.auto_update_weekdays_bitmask).to.equal(127)
    expect(auto_update.auto_update_interval_from).to.equal(0)
    expect(auto_update.auto_update_interval_to).to.equal(24)
    expect(auto_update.auto_update_tz_offset_hours).to.equal(3)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check config with missing auto_update_cycle', () => {
    let data = {}
    let auto_update = new GwCfgAutoUpdate()
    expect(() => auto_update.parse(data)).to.throw(Error, 'Missing \'auto_update_cycle\' key in the data.')
  })
})

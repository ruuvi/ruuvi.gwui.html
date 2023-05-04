/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgInfo } from './gw_cfg_info.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgInfo', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check valid data', () => {
    let data = {
      fw_ver: '1.13.0',
      nrf52_fw_ver: '1.0.0',
      gw_mac: 'AA:BB:CC:DD:EE:FF',
    }
    let info = new GwCfgInfo()
    info.parse(data)
    expect(info.fw_ver).to.equal('1.13.0')
    expect(info.nrf52_fw_ver).to.equal('1.0.0')
    expect(info.gw_mac).to.equal('AA:BB:CC:DD:EE:FF')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing gw_mac', () => {
    let data = {
      fw_ver: '1.13.0',
      nrf52_fw_ver: '1.0.0',
    }
    let info = new GwCfgInfo()
    expect(() => info.parse(data)).to.throw(Error, 'Missing \'gw_mac\' key in the data.')
  })

  it('should check missing nrf52_fw_ver', () => {
    let data = {
      fw_ver: '1.13.0',
    }
    let info = new GwCfgInfo()
    expect(() => info.parse(data)).to.throw(Error, 'Missing \'nrf52_fw_ver\' key in the data.')
  })

  it('should check missing fw_ver', () => {
    let data = {}
    let info = new GwCfgInfo()
    expect(() => info.parse(data)).to.throw(Error, 'Missing \'fw_ver\' key in the data.')
  })
})

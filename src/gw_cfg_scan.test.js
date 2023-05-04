/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgScan } from './gw_cfg_scan.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgScan', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check default settings', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
      scan_channel_37: true,
      scan_channel_38: true,
      scan_channel_39: true,
    }
    let scan = new GwCfgScan()
    scan.parse(data)
    expect(scan.scan_coded_phy).to.be.false
    expect(scan.scan_1mbit_phy).to.be.true
    expect(scan.scan_extended_payload).to.be.true
    expect(scan.scan_channel_37).to.be.true
    expect(scan.scan_channel_38).to.be.true
    expect(scan.scan_channel_39).to.be.true
  })

  it('should check non default scan_coded_phy', () => {
    let data = {
      scan_coded_phy: true,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
      scan_channel_37: true,
      scan_channel_38: true,
      scan_channel_39: true,
    }
    let scan = new GwCfgScan()
    scan.parse(data)
    expect(scan.scan_coded_phy).to.be.true
    expect(scan.scan_1mbit_phy).to.be.true
    expect(scan.scan_extended_payload).to.be.true
    expect(scan.scan_channel_37).to.be.true
    expect(scan.scan_channel_38).to.be.true
    expect(scan.scan_channel_39).to.be.true
  })

  it('should check non default scan_1mbit_phy', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: false,
      scan_extended_payload: true,
      scan_channel_37: true,
      scan_channel_38: true,
      scan_channel_39: true,
    }
    let scan = new GwCfgScan()
    scan.parse(data)
    expect(scan.scan_coded_phy).to.be.false
    expect(scan.scan_1mbit_phy).to.be.false
    expect(scan.scan_extended_payload).to.be.true
    expect(scan.scan_channel_37).to.be.true
    expect(scan.scan_channel_38).to.be.true
    expect(scan.scan_channel_39).to.be.true
  })

  it('should check non default scan_extended_payload', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: false,
      scan_channel_37: true,
      scan_channel_38: true,
      scan_channel_39: true,
    }
    let scan = new GwCfgScan()
    scan.parse(data)
    expect(scan.scan_coded_phy).to.be.false
    expect(scan.scan_1mbit_phy).to.be.true
    expect(scan.scan_extended_payload).to.be.false
    expect(scan.scan_channel_37).to.be.true
    expect(scan.scan_channel_38).to.be.true
    expect(scan.scan_channel_39).to.be.true
  })

  it('should check non default scan_channel_37', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
      scan_channel_37: false,
      scan_channel_38: true,
      scan_channel_39: true,
    }
    let scan = new GwCfgScan()
    scan.parse(data)
    expect(scan.scan_coded_phy).to.be.false
    expect(scan.scan_1mbit_phy).to.be.true
    expect(scan.scan_extended_payload).to.be.true
    expect(scan.scan_channel_37).to.be.false
    expect(scan.scan_channel_38).to.be.true
    expect(scan.scan_channel_39).to.be.true
  })

  it('should check non default scan_channel_38', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
      scan_channel_37: true,
      scan_channel_38: false,
      scan_channel_39: true,
    }
    let scan = new GwCfgScan()
    scan.parse(data)
    expect(scan.scan_coded_phy).to.be.false
    expect(scan.scan_1mbit_phy).to.be.true
    expect(scan.scan_extended_payload).to.be.true
    expect(scan.scan_channel_37).to.be.true
    expect(scan.scan_channel_38).to.be.false
    expect(scan.scan_channel_39).to.be.true
  })

  it('should check non default scan_channel_39', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
      scan_channel_37: true,
      scan_channel_38: true,
      scan_channel_39: false,
    }
    let scan = new GwCfgScan()
    scan.parse(data)
    expect(scan.scan_coded_phy).to.be.false
    expect(scan.scan_1mbit_phy).to.be.true
    expect(scan.scan_extended_payload).to.be.true
    expect(scan.scan_channel_37).to.be.true
    expect(scan.scan_channel_38).to.be.true
    expect(scan.scan_channel_39).to.be.false
  })

  it('should check missing scan_channel_39', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
      scan_channel_37: true,
      scan_channel_38: true,
    }
    let scan = new GwCfgScan()
    expect(() => scan.parse(data)).to.throw(Error, 'Missing \'scan_channel_39\' key in the data.')
  })

  it('should check missing scan_channel_38', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
      scan_channel_37: true,
    }
    let scan = new GwCfgScan()
    expect(() => scan.parse(data)).to.throw(Error, 'Missing \'scan_channel_38\' key in the data.')
  })

  it('should check missing scan_channel_37', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
      scan_extended_payload: true,
    }
    let scan = new GwCfgScan()
    expect(() => scan.parse(data)).to.throw(Error, 'Missing \'scan_channel_37\' key in the data.')
  })

  it('should check missing scan_extended_payload', () => {
    let data = {
      scan_coded_phy: false,
      scan_1mbit_phy: true,
    }
    let scan = new GwCfgScan()
    expect(() => scan.parse(data)).to.throw(Error, 'Missing \'scan_extended_payload\' key in the data.')
  })

  it('should check missing scan_1mbit_phy', () => {
    let data = {
      scan_coded_phy: false,
    }
    let scan = new GwCfgScan()
    expect(() => scan.parse(data)).to.throw(Error, 'Missing \'scan_1mbit_phy\' key in the data.')
  })

  it('should check missing scan_coded_phy', () => {
    let data = {}
    let scan = new GwCfgScan()
    expect(() => scan.parse(data)).to.throw(Error, 'Missing \'scan_coded_phy\' key in the data.')
  })
})

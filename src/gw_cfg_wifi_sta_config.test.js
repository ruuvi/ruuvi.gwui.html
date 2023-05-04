/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgWifiStaCfg } from './gw_cfg_wifi_sta_config.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgWifiStaCfg', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check default cfg', () => {
    let data = {
      wifi_sta_config: {
        ssid: '',
        password: '',
      },
    }
    let wifi_sta_cfg = new GwCfgWifiStaCfg()
    wifi_sta_cfg.parse(data)
    expect(wifi_sta_cfg.ssid).to.equal('')
    expect(wifi_sta_cfg.password).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check custom cfg', () => {
    let data = {
      wifi_sta_config: {
        ssid: 'my_ssid',
        password: 'qwe',
      },
    }
    let wifi_sta_cfg = new GwCfgWifiStaCfg()
    wifi_sta_cfg.parse(data)
    expect(wifi_sta_cfg.ssid).to.equal('my_ssid')
    expect(wifi_sta_cfg.password).to.equal('qwe')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check empty cfg', () => {
    let data = {
      wifi_sta_config: {},
    }
    let wifi_sta_cfg = new GwCfgWifiStaCfg()
    wifi_sta_cfg.parse(data)
    expect(wifi_sta_cfg.ssid).to.be.null
    expect(wifi_sta_cfg.password).to.be.null
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing wifi_sta_config', () => {
    let data = {}
    let wifi_sta_cfg = new GwCfgWifiStaCfg()
    wifi_sta_cfg.parse(data)
    expect(wifi_sta_cfg.ssid).to.be.null
    expect(wifi_sta_cfg.password).to.be.null
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check unhandled key in wifi_sta_config', () => {
    let data = {
      wifi_sta_config: {
        ssid: 'my_ssid',
        password: 'qwe',
        key3: '',
      },
    }
    let wifi_sta_cfg = new GwCfgWifiStaCfg()
    expect(() => wifi_sta_cfg.parse(data)).to.throw(Error,
        'Unhandled keys in gw_cfg.json:wifi_sta_config: {"key3":""}')
  })

})

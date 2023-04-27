import { GwCfgWifiAPCfg } from './gw_cfg_wifi_ap_config.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgWifiAPCfg', () => {
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
      wifi_ap_config: {
        password: '',
        channel: 1
      },
    }
    let wifi_ap_cfg = new GwCfgWifiAPCfg()
    wifi_ap_cfg.parse(data)
    expect(wifi_ap_cfg.password).to.equal('')
    expect(wifi_ap_cfg.channel).to.equal(1)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check custom cfg', () => {
    let data = {
      wifi_ap_config: {
        password: 'qwe',
        channel: 2
      },
    }
    let wifi_ap_cfg = new GwCfgWifiAPCfg()
    wifi_ap_cfg.parse(data)
    expect(wifi_ap_cfg.password).to.equal('qwe')
    expect(wifi_ap_cfg.channel).to.equal(2)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check empty cfg', () => {
    let data = {
      wifi_ap_config: {},
    }
    let wifi_ap_cfg = new GwCfgWifiAPCfg()
    wifi_ap_cfg.parse(data)
    expect(wifi_ap_cfg.password).to.be.null
    expect(wifi_ap_cfg.channel).to.be.null
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing wifi_ap_config', () => {
    let data = {}
    let wifi_ap_cfg = new GwCfgWifiAPCfg()
    wifi_ap_cfg.parse(data)
    expect(wifi_ap_cfg.password).to.be.null
    expect(wifi_ap_cfg.channel).to.be.null
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check unhandled key in wifi_ap_config', () => {
    let data = {
      wifi_ap_config: {
        password: 'qwe',
        channel: 2,
        key3: '',
      },
    }
    let wifi_ap_cfg = new GwCfgWifiAPCfg()
    expect(() => wifi_ap_cfg.parse(data)).to.throw(Error,
        'Unhandled keys in gw_cfg.json:wifi_ap_config: {"key3":""}')
  })

})

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgHttpStat } from './gw_cfg_http_stat.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgHttpStat', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check use_http_stat=false', () => {
    let data = {
      use_http_stat: false,
    }
    let cfg_http_stat = new GwCfgHttpStat()
    cfg_http_stat.parse(data)
    expect(cfg_http_stat.use_http_stat).to.be.false
    expect(cfg_http_stat.http_stat_url).to.equal('')
    expect(cfg_http_stat.http_stat_user).to.equal('')
    expect(cfg_http_stat.http_stat_pass).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_http_stat=true with default params', () => {
    let data = {
      use_http_stat: true,
      http_stat_url: 'https://network.ruuvi.com/status',
      http_stat_user: '',
    }
    let cfg_http_stat = new GwCfgHttpStat()
    cfg_http_stat.parse(data)
    expect(cfg_http_stat.use_http_stat).to.be.true
    expect(cfg_http_stat.http_stat_url).to.equal('https://network.ruuvi.com/status')
    expect(cfg_http_stat.http_stat_user).to.equal('')
    expect(cfg_http_stat.http_stat_pass).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_http_stat=true with custom params', () => {
    let data = {
      use_http_stat: true,
      http_stat_url: 'https://myserver.com:8080/status',
      http_stat_user: 'user1',
    }
    let cfg_http_stat = new GwCfgHttpStat()
    cfg_http_stat.parse(data)
    expect(cfg_http_stat.use_http_stat).to.be.true
    expect(cfg_http_stat.http_stat_url).to.equal('https://myserver.com:8080/status')
    expect(cfg_http_stat.http_stat_user).to.equal('user1')
    expect(cfg_http_stat.http_stat_pass).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing use_http_stat', () => {
    let data = {
      http_stat_url: 'https://myserver.com:8080/status',
      http_stat_user: '',
    }
    let cfg_http_stat = new GwCfgHttpStat()
    expect(() => cfg_http_stat.parse(data)).to.throw(Error, 'Missing \'use_http_stat\' key in the data.')
  })
})

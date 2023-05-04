/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgRemoteCfg, GwCfgRemoteCfgAuthType } from './gw_cfg_remote_cfg.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgRemoteCfg', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check remote_cfg_use=false', () => {
    let data = {
      remote_cfg_use: false,
    }
    let remote_cfg = new GwCfgRemoteCfg()
    remote_cfg.parse(data)
    expect(remote_cfg.remote_cfg_use).to.be.false
    expect(remote_cfg.remote_cfg_url).to.be.null

    expect(remote_cfg.remote_cfg_auth_type).to.be.instanceOf(GwCfgRemoteCfgAuthType)
    expect(remote_cfg.remote_cfg_auth_type.isNull()).to.be.true
    expect(remote_cfg.remote_cfg_auth_type.isNoAuth()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isBasicAuth()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isBearerAuth()).to.be.false

    expect(remote_cfg.remote_cfg_auth_basic_user).to.be.null
    expect(remote_cfg.remote_cfg_auth_basic_pass).to.be.undefined
    expect(remote_cfg.remote_cfg_auth_bearer_token).to.be.undefined

    expect(remote_cfg.remote_cfg_refresh_interval_minutes).to.be.null
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check auth_type=no', () => {
    let data = {
      remote_cfg_use: true,
      remote_cfg_url: 'http://192.168.1.180:8080',
      remote_cfg_auth_type: 'no',
      remote_cfg_auth_basic_user: '',
      remote_cfg_refresh_interval_minutes: 2,
    }
    let remote_cfg = new GwCfgRemoteCfg()
    remote_cfg.parse(data)
    expect(remote_cfg.remote_cfg_use).to.be.true
    expect(remote_cfg.remote_cfg_url).to.equal('http://192.168.1.180:8080')

    expect(remote_cfg.remote_cfg_auth_type).to.be.instanceOf(GwCfgRemoteCfgAuthType)
    expect(remote_cfg.remote_cfg_auth_type.isNull()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isNoAuth()).to.be.true
    expect(remote_cfg.remote_cfg_auth_type.isBasicAuth()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isBearerAuth()).to.be.false

    expect(remote_cfg.remote_cfg_auth_basic_user).to.equal('')
    expect(remote_cfg.remote_cfg_auth_basic_pass).to.be.undefined
    expect(remote_cfg.remote_cfg_auth_bearer_token).to.be.undefined
    expect(remote_cfg.remote_cfg_refresh_interval_minutes).to.equal(2)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check auth_type=basic', () => {
    let data = {
      remote_cfg_use: true,
      remote_cfg_url: 'http://192.168.1.181:8081',
      remote_cfg_auth_type: 'basic',
      remote_cfg_auth_basic_user: 'user1',
      remote_cfg_refresh_interval_minutes: 2,
    }
    let remote_cfg = new GwCfgRemoteCfg()
    remote_cfg.parse(data)
    expect(remote_cfg.remote_cfg_use).to.be.true
    expect(remote_cfg.remote_cfg_url).to.equal('http://192.168.1.181:8081')

    expect(remote_cfg.remote_cfg_auth_type).to.be.instanceOf(GwCfgRemoteCfgAuthType)
    expect(remote_cfg.remote_cfg_auth_type.isNull()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isNoAuth()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isBasicAuth()).to.be.true
    expect(remote_cfg.remote_cfg_auth_type.isBearerAuth()).to.be.false

    expect(remote_cfg.remote_cfg_auth_basic_user).to.equal('user1')
    expect(remote_cfg.remote_cfg_auth_basic_pass).to.be.undefined
    expect(remote_cfg.remote_cfg_auth_bearer_token).to.be.undefined
    expect(remote_cfg.remote_cfg_refresh_interval_minutes).to.equal(2)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check auth_type=bearer', () => {
    let data = {
      remote_cfg_use: true,
      remote_cfg_url: 'http://192.168.1.182:8082',
      remote_cfg_auth_type: 'bearer',
      remote_cfg_refresh_interval_minutes: 2,
    }
    let remote_cfg = new GwCfgRemoteCfg()
    remote_cfg.parse(data)
    expect(remote_cfg.remote_cfg_use).to.be.true
    expect(remote_cfg.remote_cfg_url).to.equal('http://192.168.1.182:8082')

    expect(remote_cfg.remote_cfg_auth_type).to.be.instanceOf(GwCfgRemoteCfgAuthType)
    expect(remote_cfg.remote_cfg_auth_type.isNull()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isNoAuth()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isBasicAuth()).to.be.false
    expect(remote_cfg.remote_cfg_auth_type.isBearerAuth()).to.be.true

    expect(remote_cfg.remote_cfg_auth_basic_user).to.be.null
    expect(remote_cfg.remote_cfg_auth_basic_pass).to.be.undefined
    expect(remote_cfg.remote_cfg_auth_bearer_token).to.be.undefined
    expect(remote_cfg.remote_cfg_refresh_interval_minutes).to.equal(2)
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing remote_cfg_use', () => {
    let data = {
      remote_cfg_url: 'http://192.168.1.180:8080',
      remote_cfg_auth_type: 'bearer',
    }
    let remote_cfg = new GwCfgRemoteCfg()
    expect(() => remote_cfg.parse(data)).to.throw(Error, 'Missing \'remote_cfg_use\' key in the data.')
  })

  it('should check remote_cfg_use=true, remote_cfg_auth_type=bearer, missing remote_cfg_refresh_interval_minutes', () => {
    let data = {
      remote_cfg_use: true,
      remote_cfg_url: 'http://192.168.1.182:8082',
      remote_cfg_auth_type: 'bearer',
    }
    let remote_cfg = new GwCfgRemoteCfg()
    expect(() => remote_cfg.parse(data)).to.throw(Error, 'Missing \'remote_cfg_refresh_interval_minutes\' key in the data.')
  })

  it('should check remote_cfg_use=true, remote_cfg_auth_type=no, missing remote_cfg_refresh_interval_minutes', () => {
    let data = {
      remote_cfg_use: true,
      remote_cfg_url: 'http://192.168.1.182:8082',
      remote_cfg_auth_type: 'no',
    }
    let remote_cfg = new GwCfgRemoteCfg()
    expect(() => remote_cfg.parse(data)).to.throw(Error, 'Missing \'remote_cfg_refresh_interval_minutes\' key in the data.')
  })

  it('should check remote_cfg_use=true, remote_cfg_auth_type=basic, missing remote_cfg_auth_basic_user', () => {
    let data = {
      remote_cfg_use: true,
      remote_cfg_url: 'http://192.168.1.182:8082',
      remote_cfg_auth_type: 'basic',
    }
    let remote_cfg = new GwCfgRemoteCfg()
    expect(() => remote_cfg.parse(data)).to.throw(Error, 'Missing \'remote_cfg_auth_basic_user\' key in the data.')
  })

  it('should check remote_cfg_use=true, missing remote_cfg_auth_type', () => {
    let data = {
      remote_cfg_use: true,
      remote_cfg_url: 'http://192.168.1.182:8082',
    }
    let remote_cfg = new GwCfgRemoteCfg()
    expect(() => remote_cfg.parse(data)).to.throw(Error, 'Missing \'remote_cfg_auth_type\' key in the data.')
  })

  it('should check remote_cfg_use=true, remote_cfg_url', () => {
    let data = {
      remote_cfg_use: true,
    }
    let remote_cfg = new GwCfgRemoteCfg()
    expect(() => remote_cfg.parse(data)).to.throw(Error, 'Missing \'remote_cfg_url\' key in the data.')
  })
})

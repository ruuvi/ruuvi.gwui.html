import { GwCfgLanAuth, GwCfgLanAuthType } from './gw_cfg_lan_auth.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgLanAuth', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check lan_auth_type: lan_auth_default', () => {
    let data = {
      lan_auth_type: 'lan_auth_default',
      lan_auth_user: 'Admin',
      lan_auth_api_key_use: false,
      lan_auth_api_key_rw_use: false,
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.true
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.false

    expect(lan_auth.lan_auth_user).to.equal('Admin')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.false
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.false
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check lan_auth_type: lan_auth_ruuvi, lan_auth_api_key_use=true', () => {
    let data = {
      lan_auth_type: 'lan_auth_ruuvi',
      lan_auth_user: 'user1',
      lan_auth_api_key_use: true,
      lan_auth_api_key_rw_use: false,
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.true
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.false

    expect(lan_auth.lan_auth_user).to.equal('user1')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.true
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.false
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check lan_auth_type: lan_auth_ruuvi, lan_auth_api_key_rw_use=true', () => {
    let data = {
      lan_auth_type: 'lan_auth_ruuvi',
      lan_auth_user: 'user2',
      lan_auth_api_key_use: false,
      lan_auth_api_key_rw_use: true,
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.true
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.false

    expect(lan_auth.lan_auth_user).to.equal('user2')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.false
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.true
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check lan_auth_type: digest', () => {
    let data = {
      lan_auth_type: 'lan_auth_digest',
      lan_auth_user: 'user1',
      lan_auth_api_key_use: false,
      lan_auth_api_key_rw_use: false,
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.true
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.false

    expect(lan_auth.lan_auth_user).to.equal('user1')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.false
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.false
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check lan_auth_type: basic', () => {
    let data = {
      lan_auth_type: 'lan_auth_basic',
      lan_auth_user: 'user1',
      lan_auth_api_key_use: false,
      lan_auth_api_key_rw_use: false,
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.true
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.false

    expect(lan_auth.lan_auth_user).to.equal('user1')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.false
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.false
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check lan_auth_type: allow', () => {
    let data = {
      lan_auth_type: 'lan_auth_allow',
      lan_auth_user: 'user1',
      lan_auth_api_key_use: false,
      lan_auth_api_key_rw_use: false,
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.true
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.false

    expect(lan_auth.lan_auth_user).to.equal('user1')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.false
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.false
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check lan_auth_type: deny', () => {
    let data = {
      lan_auth_type: 'lan_auth_deny',
      lan_auth_user: 'user1',
      lan_auth_api_key_use: false,
      lan_auth_api_key_rw_use: false,
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.true

    expect(lan_auth.lan_auth_user).to.equal('user1')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.false
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.false
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check lan_auth_type: deny, missing optional params', () => {
    let data = {
      lan_auth_type: 'lan_auth_deny',
    }
    let lan_auth = new GwCfgLanAuth()
    lan_auth.parse(data)
    expect(lan_auth.lan_auth_type).to.be.instanceOf(GwCfgLanAuthType)
    expect(lan_auth.lan_auth_type.isAuthDefault()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthRuuvi()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDigest()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthBasic()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthAllow()).to.be.false
    expect(lan_auth.lan_auth_type.isAuthDeny()).to.be.true

    expect(lan_auth.lan_auth_user).to.equal('Admin')
    expect(lan_auth.lan_auth_pass).to.be.undefined
    expect(lan_auth.lan_auth_api_key_use).to.be.false
    expect(lan_auth.lan_auth_api_key).to.be.undefined
    expect(lan_auth.lan_auth_api_key_rw_use).to.be.false
    expect(lan_auth.lan_auth_api_key_rw).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check config with missing lan_auth_type', () => {
    let data = {}
    let lan_auth = new GwCfgLanAuth()
    expect(() => lan_auth.parse(data)).to.throw(Error, 'Missing \'lan_auth_type\' key in the data.')
  })
})

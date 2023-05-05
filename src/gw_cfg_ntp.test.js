/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgNtp } from './gw_cfg_ntp.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgNtp', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check ntp_use=true, ntp_use_dhcp=false, default servers', () => {
    let data = {
      ntp_use: true,
      ntp_use_dhcp: false,
      ntp_server1: 'time.google.com',
      ntp_server2: 'time.cloudflare.com',
      ntp_server3: 'time.nist.gov',
      ntp_server4: 'pool.ntp.org',
    }
    let ntp = new GwCfgNtp()
    ntp.parse(data)
    expect(ntp.ntp_use).to.be.true
    expect(ntp.ntp_use_dhcp).to.be.false
    expect(ntp.ntp_server1).to.equal('time.google.com')
    expect(ntp.ntp_server2).to.equal('time.cloudflare.com')
    expect(ntp.ntp_server3).to.equal('time.nist.gov')
    expect(ntp.ntp_server4).to.equal('pool.ntp.org')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check ntp_use=true, ntp_use_dhcp=false, custom servers', () => {
    let data = {
      ntp_use: true,
      ntp_use_dhcp: false,
      ntp_server1: 'time2.google.com',
      ntp_server2: 'time2.cloudflare.com',
      ntp_server3: 'time2.nist.gov',
      ntp_server4: 'pool2.ntp.org',
    }
    let ntp = new GwCfgNtp()
    ntp.parse(data)
    expect(ntp.ntp_use).to.be.true
    expect(ntp.ntp_use_dhcp).to.be.false
    expect(ntp.ntp_server1).to.equal('time2.google.com')
    expect(ntp.ntp_server2).to.equal('time2.cloudflare.com')
    expect(ntp.ntp_server3).to.equal('time2.nist.gov')
    expect(ntp.ntp_server4).to.equal('pool2.ntp.org')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check ntp_use=true, ntp_use_dhcp=true, default servers', () => {
    let data = {
      ntp_use: true,
      ntp_use_dhcp: true,
      ntp_server1: 'time.google.com',
      ntp_server2: 'time.cloudflare.com',
      ntp_server3: 'time.nist.gov',
      ntp_server4: 'pool.ntp.org',
    }
    let ntp = new GwCfgNtp()
    ntp.parse(data)
    expect(ntp.ntp_use).to.be.true
    expect(ntp.ntp_use_dhcp).to.be.true
    expect(ntp.ntp_server1).to.equal('time.google.com')
    expect(ntp.ntp_server2).to.equal('time.cloudflare.com')
    expect(ntp.ntp_server3).to.equal('time.nist.gov')
    expect(ntp.ntp_server4).to.equal('pool.ntp.org')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check ntp_use=true, ntp_use_dhcp=true, missing servers', () => {
    let data = {
      ntp_use: true,
      ntp_use_dhcp: true,
    }
    let ntp = new GwCfgNtp()
    ntp.parse(data)
    expect(ntp.ntp_use).to.be.true
    expect(ntp.ntp_use_dhcp).to.be.true
    expect(ntp.ntp_server1).to.equal('time.google.com')
    expect(ntp.ntp_server2).to.equal('time.cloudflare.com')
    expect(ntp.ntp_server3).to.equal('time.nist.gov')
    expect(ntp.ntp_server4).to.equal('pool.ntp.org')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check ntp_use=false, default params', () => {
    let data = {
      ntp_use: false,
      ntp_use_dhcp: true,
      ntp_server1: 'time.google.com',
      ntp_server2: 'time.cloudflare.com',
      ntp_server3: 'time.nist.gov',
      ntp_server4: 'pool.ntp.org',
    }
    let ntp = new GwCfgNtp()
    ntp.parse(data)
    expect(ntp.ntp_use).to.be.false
    expect(ntp.ntp_use_dhcp).to.be.true
    expect(ntp.ntp_server1).to.equal('time.google.com')
    expect(ntp.ntp_server2).to.equal('time.cloudflare.com')
    expect(ntp.ntp_server3).to.equal('time.nist.gov')
    expect(ntp.ntp_server4).to.equal('pool.ntp.org')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check ntp_use=false, custom params', () => {
    let data = {
      ntp_use: false,
      ntp_use_dhcp: false,
      ntp_server1: 'time3.google.com',
      ntp_server2: 'time3.cloudflare.com',
      ntp_server3: 'time3.nist.gov',
      ntp_server4: 'pool3.ntp.org',
    }
    let ntp = new GwCfgNtp()
    ntp.parse(data)
    expect(ntp.ntp_use).to.be.false
    expect(ntp.ntp_use_dhcp).to.be.false
    expect(ntp.ntp_server1).to.equal('time3.google.com')
    expect(ntp.ntp_server2).to.equal('time3.cloudflare.com')
    expect(ntp.ntp_server3).to.equal('time3.nist.gov')
    expect(ntp.ntp_server4).to.equal('pool3.ntp.org')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check ntp_use=false, missing params', () => {
    let data = {
      ntp_use: false,
    }
    let ntp = new GwCfgNtp()
    ntp.parse(data)
    expect(ntp.ntp_use).to.be.false
    expect(ntp.ntp_use_dhcp).to.be.false
    expect(ntp.ntp_server1).to.equal('time.google.com')
    expect(ntp.ntp_server2).to.equal('time.cloudflare.com')
    expect(ntp.ntp_server3).to.equal('time.nist.gov')
    expect(ntp.ntp_server4).to.equal('pool.ntp.org')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check config with missing ntp_use', () => {
    let data = {}
    let ntp = new GwCfgNtp()
    expect(() => ntp.parse(data)).to.throw(Error, 'Missing \'ntp_use\' key in the data.')
  })
})

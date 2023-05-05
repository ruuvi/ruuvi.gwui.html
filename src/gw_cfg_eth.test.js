/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgEth } from './gw_cfg_eth.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgEth', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check use_eth=false', () => {
    let data = {
      use_eth: false,
    }
    let cfg_eth = new GwCfgEth()
    cfg_eth.parse(data)
    expect(cfg_eth.use_eth).to.be.false
    expect(cfg_eth.eth_dhcp).to.be.true
    expect(cfg_eth.eth_static_ip).to.equal('')
    expect(cfg_eth.eth_netmask).to.equal('')
    expect(cfg_eth.eth_gw).to.equal('')
    expect(cfg_eth.eth_dns1).to.equal('')
    expect(cfg_eth.eth_dns2).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_eth=true, eth_dhch=true', () => {
    let data = {
      use_eth: true,
      eth_dhcp: true,
    }
    let cfg_eth = new GwCfgEth()
    cfg_eth.parse(data)
    expect(cfg_eth.use_eth).to.be.true
    expect(cfg_eth.eth_dhcp).to.be.true
    expect(cfg_eth.eth_static_ip).to.equal('')
    expect(cfg_eth.eth_netmask).to.equal('')
    expect(cfg_eth.eth_gw).to.equal('')
    expect(cfg_eth.eth_dns1).to.equal('')
    expect(cfg_eth.eth_dns2).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_eth=true, eth_dhch is missing', () => {
    let data = {
      use_eth: true,
    }
    let cfg_eth = new GwCfgEth()
    cfg_eth.parse(data)
    expect(cfg_eth.use_eth).to.be.true
    expect(cfg_eth.eth_dhcp).to.be.true
    expect(cfg_eth.eth_static_ip).to.equal('')
    expect(cfg_eth.eth_netmask).to.equal('')
    expect(cfg_eth.eth_gw).to.equal('')
    expect(cfg_eth.eth_dns1).to.equal('')
    expect(cfg_eth.eth_dns2).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_eth=true, eth_dhch=false', () => {
    let data = {
      use_eth: true,
      eth_dhcp: false,
      eth_static_ip: '192.168.1.150',
      eth_netmask: '255.255.255.0',
      eth_gw: '192.168.1.1',
      eth_dns1: '192.168.1.2',
      eth_dns2: '8.8.8.8',
    }
    let cfg_eth = new GwCfgEth()
    cfg_eth.parse(data)
    expect(cfg_eth.use_eth).to.be.true
    expect(cfg_eth.eth_dhcp).to.be.false
    expect(cfg_eth.eth_static_ip).to.equal('192.168.1.150')
    expect(cfg_eth.eth_netmask).to.equal('255.255.255.0')
    expect(cfg_eth.eth_gw).to.equal('192.168.1.1')
    expect(cfg_eth.eth_dns1).to.equal('192.168.1.2')
    expect(cfg_eth.eth_dns2).to.equal('8.8.8.8')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing use_eth', () => {
    let data = {
      eth_dhcp: true,
    }
    let cfg_eth = new GwCfgEth()
    expect(() => cfg_eth.parse(data)).to.throw(Error, 'Missing \'use_eth\' key in the data.')
  })
})

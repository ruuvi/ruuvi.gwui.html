/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgCompanyFilter } from './gw_cfg_company_filter.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgCompanyFilter', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check company_use_filtering=true, company_id=default', () => {
    let data = {
      company_use_filtering: true,
      company_id: 1177,
    }
    let filter = new GwCfgCompanyFilter()
    filter.parse(data)
    expect(filter.company_use_filtering).to.be.true
    expect(filter.company_id).to.equal(1177)
  })

  it('should check company_use_filtering=true, company_id=non_default', () => {
    let data = {
      company_use_filtering: true,
      company_id: 1000,
    }
    let filter = new GwCfgCompanyFilter()
    filter.parse(data)
    expect(filter.company_use_filtering).to.be.true
    expect(filter.company_id).to.equal(1000)
  })

  it('should check company_use_filtering=true, company_id is missing', () => {
    let data = {
      company_use_filtering: true,
    }
    let filter = new GwCfgCompanyFilter()
    filter.parse(data)
    expect(filter.company_use_filtering).to.be.true
    expect(filter.company_id).to.equal(1177)
  })

  it('should check company_use_filtering=false, company_id=default', () => {
    let data = {
      company_use_filtering: false,
      company_id: 1177,
    }
    let filter = new GwCfgCompanyFilter()
    filter.parse(data)
    expect(filter.company_use_filtering).to.be.false
    expect(filter.company_id).to.equal(1177)
  })

  it('should check company_use_filtering=false, company_id=non_default', () => {
    let data = {
      company_use_filtering: false,
      company_id: 2000,
    }
    let filter = new GwCfgCompanyFilter()
    filter.parse(data)
    expect(filter.company_use_filtering).to.be.false
    expect(filter.company_id).to.equal(2000)
  })

  it('should check company_use_filtering=false, company_id is missing', () => {
    let data = {
      company_use_filtering: false,
    }
    let filter = new GwCfgCompanyFilter()
    filter.parse(data)
    expect(filter.company_use_filtering).to.be.false
    expect(filter.company_id).to.equal(1177)
  })

  it('should check missing company_use_filtering', () => {
    let data = {}
    let filter = new GwCfgCompanyFilter()
    expect(() => filter.parse(data)).to.throw(Error, 'Missing \'company_use_filtering\' key in the data.')
  })
})

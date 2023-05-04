/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgCoordinates } from './gw_cfg_coordinates.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgCoordinates', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check empty coordinates', () => {
    let data = {
      coordinates: '',
    }
    let coordinates = new GwCfgCoordinates()
    coordinates.parse(data)
    expect(coordinates.coordinates).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check non empty coordinates', () => {
    let data = {
      coordinates: 'abc,qwe',
    }
    let coordinates = new GwCfgCoordinates()
    coordinates.parse(data)
    expect(coordinates.coordinates).to.equal('abc,qwe')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing coordinates', () => {
    let data = {}
    let coordinates = new GwCfgCoordinates()
    coordinates.parse(data)
    expect(coordinates.coordinates).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

})

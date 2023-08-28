/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { GwCfgCoordinates } from './gw_cfg_coordinates.mjs'
import chai from 'chai'
import sinon from 'sinon'
import {GwCfgFwUpdateUrl} from "./gw_cfg_fw_update_url.mjs";

const { expect } = chai

describe('GwCfgFwUpdateUrl', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check non empty fw_update_url', () => {
    let data = {
      fw_update_url: 'https://network.ruuvi.com/firmwareupdate',
    }
    let fw_update_url = new GwCfgFwUpdateUrl()
    fw_update_url.parse(data)
    expect(fw_update_url.fw_update_url).to.equal('https://network.ruuvi.com/firmwareupdate')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check empty fw_update_url', () => {
    let data = {
      fw_update_url: '',
    }
    let fw_update_url = new GwCfgFwUpdateUrl()
    fw_update_url.parse(data)
    expect(fw_update_url.fw_update_url).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing fw_update_url', () => {
    let data = {}
    let fw_update_url = new GwCfgFwUpdateUrl()
    fw_update_url.parse(data)
    expect(fw_update_url.fw_update_url).to.equal('')
    expect(Object.keys(data).length).to.equal(0)
  })

})

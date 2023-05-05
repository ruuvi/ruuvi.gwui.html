/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import sinon from 'sinon'

class AppInfoMock {
  constructor () {
    this.setGatewayNameSuffix = sinon.stub()
    this.setFirmwareVersions = sinon.stub()
  }

  // Expose the mocks for testing
  getMocks () {
    return {
      setGatewayNameSuffix: this.setGatewayNameSuffix,
      setFirmwareVersions: this.setFirmwareVersions,
    }
  }
}

export default AppInfoMock

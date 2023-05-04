/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgCoordinates {
  coordinates = null

  parse (data) {
    this.coordinates = utils.fetchStringKeyFromData(data, 'coordinates', false, '')
  }
}

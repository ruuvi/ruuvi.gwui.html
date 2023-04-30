import * as utils from './utils.mjs'

export class GwCfgCoordinates {
  coordinates = null

  parse (data) {
    this.coordinates = utils.fetchStringKeyFromData(data, 'coordinates', false, '')
  }
}

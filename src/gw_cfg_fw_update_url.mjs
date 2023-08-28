/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgFwUpdateUrl {
  fw_update_url = null

  parse (data) {
    this.fw_update_url = utils.fetchStringKeyFromData(data, 'fw_update_url', false, '')
  }
}

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgCompanyFilter {
  static DEFAULT_COMPANY_ID = 0x0499

  company_use_filtering = null
  company_id = null

  parse (data) {
    this.company_use_filtering = utils.fetchBoolKeyFromData(data, 'company_use_filtering', true)
    this.company_id = utils.fetchIntKeyFromData(data, 'company_id', false, GwCfgCompanyFilter.DEFAULT_COMPANY_ID)
  }

  is_default () {
    return this.company_use_filtering && (this.company_id === GwCfgCompanyFilter.DEFAULT_COMPANY_ID)
  }

  set_default () {
    this.company_use_filtering = true
    this.company_id = GwCfgCompanyFilter.DEFAULT_COMPANY_ID
  }
}

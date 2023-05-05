/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export class GwCfgHttpStat {
  static HTTP_STAT_URL_DEFAULT = 'https://network.ruuvi.com/status'

  use_http_stat = null
  http_stat_url = null
  http_stat_user = null
  http_stat_pass = undefined

  parse (data) {
    this.use_http_stat = utils.fetchBoolKeyFromData(data, 'use_http_stat', true)
    this.http_stat_url = utils.fetchStringKeyFromData(data, 'http_stat_url', false, '')
    this.http_stat_user = utils.fetchStringKeyFromData(data, 'http_stat_user', false, '')
  }

  is_default () {
    return (this.use_http_stat &&
        (this.http_stat_url === GwCfgHttpStat.HTTP_STAT_URL_DEFAULT) && (this.http_stat_user === ''))
  }

  set_default () {
    this.use_http_stat = true
    this.http_stat_url = GwCfgHttpStat.HTTP_STAT_URL_DEFAULT
    this.http_stat_user = ''
    this.http_stat_pass = ''
  }
}

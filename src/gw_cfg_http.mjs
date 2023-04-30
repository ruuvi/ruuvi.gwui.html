import * as utils from './utils.mjs'

export class GwCfgHttp {
  static HTTP_URL_DEFAULT = 'https://network.ruuvi.com/record'

  use_http = null
  http_url = null
  http_user = null
  http_pass = undefined

  parse (data) {
    this.use_http = utils.fetchBoolKeyFromData(data, 'use_http', true)
    this.http_url = utils.fetchStringKeyFromData(data, 'http_url', false, '')
    this.http_user = utils.fetchStringKeyFromData(data, 'http_user', false, '')
  }

  is_default () {
    return this.use_http && (this.http_url === GwCfgHttp.HTTP_URL_DEFAULT) && (this.http_user === '')
  }

  set_default () {
    this.use_http = true
    this.http_url = GwCfgHttp.HTTP_URL_DEFAULT
    this.http_user = ''
    this.http_pass = ''
  }
}

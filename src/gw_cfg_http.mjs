/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export const HTTP_DATA_FORMAT = Object.freeze({
  'ruuvi': 'ruuvi',
})

export const HTTP_AUTH = Object.freeze({
  'none': 'none',
  'basic': 'basic',
  'bearer': 'bearer',
  'token': 'token',
})

export class GwCfgHttpDataFormat {
  constructor (val) {
    if (!val) {
      this.http_data_format = HTTP_DATA_FORMAT.ruuvi
      return
    }
    const allowedValues = Object.values(HTTP_DATA_FORMAT)
    if (allowedValues.includes(val)) {
      this.http_data_format = val
    } else {
      throw new Error(`Invalid value for 'http_data_format': ${val}. Allowed values are '${allowedValues.join('\', \'')}'.`)
    }
  }

  getVal() {
    return this.http_data_format
  }

  isRuuvi () {
    return this.http_data_format === HTTP_DATA_FORMAT.ruuvi
  }

  setRuuvi () {
    this.http_data_format = HTTP_DATA_FORMAT.ruuvi
  }
}

export class GwCfgHttpAuth {
  constructor (val) {
    if (!val) {
      this.http_auth = HTTP_AUTH.none
      return
    }
    const allowedValues = Object.values(HTTP_AUTH)
    if (allowedValues.includes(val)) {
      this.http_auth = val
    } else {
      throw new Error(`Invalid value for 'http_auth': ${val}. Allowed values are '${allowedValues.join('\', \'')}'.`)
    }
  }

  getVal() {
    return this.http_auth
  }

  isNone () {
    return this.http_auth === HTTP_AUTH.none
  }

  setNone () {
    this.http_auth = HTTP_AUTH.none
  }

  isBasic () {
    return this.http_auth === HTTP_AUTH.basic
  }

  setBasic () {
    this.http_auth = HTTP_AUTH.basic
  }

  isBearer () {
    return this.http_auth === HTTP_AUTH.bearer
  }

  setBearer () {
    this.http_auth = HTTP_AUTH.bearer
  }

  isToken () {
    return this.http_auth === HTTP_AUTH.token
  }

  setToken () {
    this.http_auth = HTTP_AUTH.token
  }
}

export class GwCfgHttp {
  static HTTP_URL_DEFAULT = 'https://network.ruuvi.com/record'

  use_http_ruuvi = null
  use_http = null
  http_url = null

  /** @type GwCfgHttpDataFormat */
  http_data_format = null

  /** @type GwCfgHttpAuth */
  http_auth = null

  http_user = null
  http_pass = undefined
  http_bearer_token = undefined
  http_api_key = undefined

  http_use_ssl_client_cert = null
  http_use_ssl_server_cert = null

  parse (data) {
    this.use_http_ruuvi = utils.fetchBoolKeyFromData(data, 'use_http_ruuvi', true)
    this.use_http = utils.fetchBoolKeyFromData(data, 'use_http', true)
    this.http_url = utils.fetchStringKeyFromData(data, 'http_url', false, '')
    this.http_data_format = new GwCfgHttpDataFormat(utils.fetchStringKeyFromData(data, 'http_data_format', false))
    this.http_auth = new GwCfgHttpAuth(utils.fetchStringKeyFromData(data, 'http_auth', false))
    if (this.use_http) {
      if (this.http_auth.isBasic()) {
        this.http_user = utils.fetchStringKeyFromData(data, 'http_user', false, '')
      }
    }
    this.http_use_ssl_client_cert = utils.fetchBoolKeyFromData(data, 'http_use_ssl_client_cert', false, false)
    this.http_use_ssl_server_cert = utils.fetchBoolKeyFromData(data, 'http_use_ssl_server_cert', false, false)
    if (this.use_http && this.http_url === GwCfgHttp.HTTP_URL_DEFAULT && this.http_auth.isNone()) {
      this.use_http_ruuvi = true
      this.use_http = false
    }
  }

  is_default () {
    return this.use_http_ruuvi && !this.use_http
  }

  set_default () {
    this.use_http_ruuvi = true
    this.use_http = false
    this.http_url = ''
    this.http_data_format.setRuuvi()
    this.http_auth.setNone()
    this.http_user = ''
    this.http_pass = ''
    this.http_bearer_token = ''
    this.http_api_key = ''
    this.http_use_ssl_client_cert = false
    this.http_use_ssl_server_cert = false
  }
}

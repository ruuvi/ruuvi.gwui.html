import * as utils from './utils.mjs'

const LAN_AUTH_TYPE = Object.freeze({
  'DENY': 'lan_auth_deny',
  'DEFAULT': 'lan_auth_default',
  'RUUVI': 'lan_auth_ruuvi',
  'DIGEST': 'lan_auth_digest',
  'BASIC': 'lan_auth_basic',
  'ALLOW': 'lan_auth_allow'
})

export class GwCfgLanAuthType {
  constructor (val) {
    const allowedValues = Object.values(LAN_AUTH_TYPE)
    if (allowedValues.includes(val)) {
      this.lan_auth_type = val
    } else {
      throw new Error(`Invalid value for 'lan_auth_type': ${val}. Allowed values are '${allowedValues.join('\', \'')}'.`)
    }
  }

  getVal () {
    return this.lan_auth_type
  }

  isAuthDeny () {
    return this.lan_auth_type === LAN_AUTH_TYPE.DENY
  }

  setAuthDeny () {
    this.lan_auth_type = LAN_AUTH_TYPE.DENY
  }

  isAuthDefault () {
    return this.lan_auth_type === LAN_AUTH_TYPE.DEFAULT
  }

  setAuthDefault () {
    this.lan_auth_type = LAN_AUTH_TYPE.DEFAULT
  }

  isAuthRuuvi () {
    return this.lan_auth_type === LAN_AUTH_TYPE.RUUVI
  }

  setAuthRuuvi () {
    this.lan_auth_type = LAN_AUTH_TYPE.RUUVI
  }

  isAuthDigest () {
    return this.lan_auth_type === LAN_AUTH_TYPE.DIGEST
  }

  isAuthBasic () {
    return this.lan_auth_type === LAN_AUTH_TYPE.BASIC
  }

  isAuthAllow () {
    return this.lan_auth_type === LAN_AUTH_TYPE.ALLOW
  }

  setAuthAllow () {
    this.lan_auth_type = LAN_AUTH_TYPE.ALLOW
  }
}

export class GwCfgLanAuth {
  /** @type GwCfgLanAuthType */
  lan_auth_type = null
  lan_auth_user = null
  lan_auth_pass = undefined
  lan_auth_api_key_use = null
  lan_auth_api_key = undefined
  lan_auth_api_key_rw_use = null
  lan_auth_api_key_rw = undefined

  parse (data) {
    this.lan_auth_type = new GwCfgLanAuthType(utils.fetchStringKeyFromData(data, 'lan_auth_type', true))
    this.lan_auth_user = utils.fetchStringKeyFromData(data, 'lan_auth_user', false, 'Admin')
    this.lan_auth_api_key_use = utils.fetchBoolKeyFromData(data, 'lan_auth_api_key_use', false, false)
    this.lan_auth_api_key_rw_use = utils.fetchBoolKeyFromData(data, 'lan_auth_api_key_rw_use', false, false)
  }

  setDefaultUser() {
    this.lan_auth_user = 'Admin'
  }
}

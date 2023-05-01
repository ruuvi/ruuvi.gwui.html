import * as utils from './utils.mjs'

export const REMOTE_CFG_AUTH_TYPE = Object.freeze({
  'NONE': 'none',
  'BASIC': 'basic',
  'BEARER': 'bearer',
})

export class GwCfgRemoteCfgAuthType {
  constructor (val) {
    const allowedValues = Object.values(REMOTE_CFG_AUTH_TYPE)
    if (val === null || allowedValues.includes(val)) {
      this.auth_type = val
    } else {
      if (val === 'no') {
        this.auth_type = REMOTE_CFG_AUTH_TYPE.NONE
      } else {
        throw new Error(`Invalid value for 'remote_cfg_auth_type': ${val}. Allowed values are '${allowedValues.join('\', \'')}'.`)
      }
    }
  }

  isNull () {
    return this.auth_type === null
  }

  isNoAuth () {
    return this.auth_type === REMOTE_CFG_AUTH_TYPE.NONE
  }

  setNoAuth () {
    this.auth_type = REMOTE_CFG_AUTH_TYPE.NONE
  }

  isBasicAuth () {
    return this.auth_type === REMOTE_CFG_AUTH_TYPE.BASIC
  }

  setBasicAuth () {
    this.auth_type = REMOTE_CFG_AUTH_TYPE.BASIC
  }

  isBearerAuth () {
    return this.auth_type === REMOTE_CFG_AUTH_TYPE.BEARER
  }

  setBearerAuth () {
    this.auth_type = REMOTE_CFG_AUTH_TYPE.BEARER
  }
}

export class GwCfgRemoteCfg {
  remote_cfg_use = null
  remote_cfg_url = null

  /** @type GwCfgRemoteCfgAuthType */
  remote_cfg_auth_type = null

  remote_cfg_auth_basic_user = null
  remote_cfg_auth_basic_pass = undefined
  remote_cfg_auth_bearer_token = undefined
  remote_cfg_refresh_interval_minutes = null

  parse (data) {
    this.remote_cfg_use = utils.fetchBoolKeyFromData(data, 'remote_cfg_use', true)
    this.remote_cfg_url = utils.fetchStringKeyFromData(data, 'remote_cfg_url', this.remote_cfg_use)
    this.remote_cfg_auth_type = new GwCfgRemoteCfgAuthType(
        utils.fetchStringKeyFromData(data, 'remote_cfg_auth_type',
            this.remote_cfg_use))
    this.remote_cfg_auth_basic_user = utils.fetchStringKeyFromData(data, 'remote_cfg_auth_basic_user',
        this.remote_cfg_use && this.remote_cfg_auth_type.isBasicAuth())
    this.remote_cfg_refresh_interval_minutes = utils.fetchIntKeyFromData(data,
        'remote_cfg_refresh_interval_minutes',
        this.remote_cfg_use)
  }
}

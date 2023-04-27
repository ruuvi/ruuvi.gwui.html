import * as crypto from './crypto.mjs'
import logger from './logger.mjs'
import AuthStatus from './auth_status.mjs'
import Network from './network.mjs'

class AuthSession {
  realm = null
  challenge = null
  session_cookie = null
  session_id = null

  #parseToken (auth_str, prefix, suffix) {
    const startIndex = auth_str.indexOf(prefix)
    if (startIndex === -1) {
      throw new Error(`Prefix '${prefix}' not found in '${auth_str}'`)
    }
    const endIndex = auth_str.indexOf(suffix, startIndex + prefix.length)
    if (endIndex === -1) {
      throw new Error(`Suffix '${suffix}' not found in '${auth_str}'`)
    }
    return auth_str.substring(startIndex + prefix.length, endIndex)
  }

  constructor (auth_str) {
    // x-ruuvi-interactive realm="RuuviGatewayEEFF" challenge="03601dc11c92170713b68d4bfe430899b61c3df9c2559a9b7bce70ab451d9ade" session_cookie="RUUVISESSION" session_id="CXOHVRWYOIPHMKMV"
    if (!auth_str) {
      throw new Error(`auth_str is empty`)
    }
    if (!auth_str.startsWith('x-ruuvi-interactive ')) {
      throw new Error(`auth_str should start from prefix 'x-ruuvi-interactive ', auth_str: '${auth_str}'`)
    }
    this.realm = this.#parseToken(auth_str, 'realm="', '"')
    this.challenge = this.#parseToken(auth_str, 'challenge="', '"')
    this.session_cookie = this.#parseToken(auth_str, 'session_cookie="', '"')
    this.session_id = this.#parseToken(auth_str, 'session_id="', '"')
  }
}

class AuthResp {
  auth_status
  gatewayName
  gatewayNameSuffix
  fw_ver
  nrf52_fw_ver
  lan_auth_type
  flagAccessFromLAN
  header_www_auth
  err_message

  constructor (response, data) {
    if (response.status !== 200 && response.status !== 401 && response.status !== 403) {
      throw Error(`Unexpected HTTP response status=${response.status}, json='${data}'`)
    }
    this.auth_status = AuthStatus.convHttpRespStatusToAuthStatus(response.status)
    this.header_ruuvi_prev_url = response.headers.get('Ruuvi-prev-url')
    if (this.auth_status === AuthStatus.Unauthorized) {
      this.header_www_auth = response.headers.get('WWW-Authenticate')
      if (!this.header_www_auth) {
        throw Error(`There is no "WWW-Authenticate" key in HTTP response header`)
      }
    }

    if (!data.hasOwnProperty('gateway_name')) {
      throw Error(`Invalid auth json - missing key 'gateway_name', json='${JSON.stringify(data)}'`)
    }
    this.gatewayName = data.gateway_name
    this.gatewayNameSuffix = this.gatewayName.slice(-4)

    if (!data.hasOwnProperty('fw_ver')) {
      throw Error(`Invalid auth json - missing key 'fw_ver', json='${JSON.stringify(data)}'`)
    }
    this.fw_ver = data.fw_ver

    if (!data.hasOwnProperty('nrf52_fw_ver')) {
      throw Error(`Invalid auth json - missing key 'nrf52_fw_ver', json='${JSON.stringify(data)}'`)
    }
    this.nrf52_fw_ver = data.nrf52_fw_ver

    if (!data.hasOwnProperty('lan_auth_type')) {
      throw Error(`Invalid auth json - missing key 'lan_auth_type', json='${JSON.stringify(data)}'`)
    }
    this.lan_auth_type = data.lan_auth_type

    if (data.hasOwnProperty('lan')) {
      this.flagAccessFromLAN = data.lan
    }

    if (data.hasOwnProperty('message')) {
      this.err_message = data.message
    }
  }
}

class Auth {
  anchor
  pageAuth
  appInfo
  authSession
  gatewayName
  flagRedirectToPageAuth
  windowLocationObj
  ecdh
  aes_key
  flagAccessFromLAN

  constructor (anchor, pageAuth, appInfo, windowLocationObj, ecdhInstance) {
    this.anchor = anchor
    this.pageAuth = pageAuth
    this.appInfo = appInfo
    this.windowLocationObj = windowLocationObj
    this.flagRedirectToPageAuth = anchor === '#auth'
    this.ecdh = ecdhInstance || new crypto.ECDH()
    logger.info(`Auth: anchor: ${anchor}`)

    this.performLogIn = this.performLogIn.bind(this)
    this.openHomePage = this.openHomePage.bind(this)
  }

  windowLocationReplace (url) {
    this.windowLocationObj.replace(url)
  }

  windowLocationAssign (url) {
    this.windowLocationObj.assign(url)
  }

  #updateGatewayNameFwVerAndAuth (authResp) {
    this.gatewayName = authResp.gatewayName
    this.appInfo.setGatewayNameSuffix(authResp.gatewayNameSuffix)
    this.appInfo.setFirmwareVersions(authResp.fw_ver, authResp.nrf52_fw_ver)
    if (authResp.auth_status !== AuthStatus.OK) {
      this.pageAuth.setDefaultUserNameAndShowHint(authResp.lan_auth_type === 'lan_auth_default')
    }
  }

  #handleResponseHeader_ruuvi_ecdh_pub_key () {
    let response = Network.getResponse()
    const ecdh_pub_key_srv_b64 = response?.headers.get('ruuvi_ecdh_pub_key')
    if (ecdh_pub_key_srv_b64) {
      logger.info(`ECDH PubKey(Srv): ${ecdh_pub_key_srv_b64}`)
      const shared_secret = this.ecdh.computeSecret(ecdh_pub_key_srv_b64, 'base64')
      // logger.debug(`Shared secret: ${shared_secret}`)
      this.aes_key = crypto.SHA256(shared_secret)
      // logger.debug(`AES key: ${this.aes_key}`)
    }
  }

  async #http_get_or_post_auth (json_data) {
    const timeout = 10000
    let data
    if (json_data) {
      data = await Network.httpPostJson('/auth', timeout, json_data, {
        list_of_allowed_statuses: [200, 401, 403]
      })
      logger.info('FetchAuth: success')
    } else {
      const pub_key_cli = this.ecdh.getPublicKey('base64')
      logger.info(`ECDH PubKey(Cli): ${pub_key_cli}`)
      data = await Network.httpGetJson('/auth', timeout, {
        extra_headers: {
          'ruuvi_ecdh_pub_key': pub_key_cli
        },
        list_of_allowed_statuses: [200, 401, 403]
      })
      logger.info(`FetchAuth: success, status=${Network.getResponse().status}`)
      this.#handleResponseHeader_ruuvi_ecdh_pub_key()
    }
    return new AuthResp(Network.getResponse(), data)
  }

  async #login (json_data) {
    let authResp
    try {
      authResp = await this.#http_get_or_post_auth(json_data)
    } catch (err) {
      logger.info(`CheckAuth: exception: ${err}`)
      this.pageAuth.show_error_message(`${err instanceof Error ? err.message : err}`)
      this.promiseAuthFinishedResolved(false)
      return
    }
    logger.info(`CheckAuth: ${authResp.auth_status}, lan_auth_type=${authResp.lan_auth_type}, gatewayName=${authResp.gatewayName}`)
    this.#updateGatewayNameFwVerAndAuth(authResp)
    this.flagAccessFromLAN = authResp.flagAccessFromLAN
    switch (authResp.auth_status) {
      case AuthStatus.OK:
        this.pageAuth.on_auth_successful()
        if (authResp.header_ruuvi_prev_url) {
          logger.info(`CheckAuth: Open: ${authResp.header_ruuvi_prev_url}`)
          this.windowLocationReplace(authResp.header_ruuvi_prev_url)
        } else {
          if (this.flagRedirectToPageAuth) {
            logger.info('CheckAuth: Open: page-auth')
            this.windowLocationReplace('#page-auth')
          } else {
            logger.info('CheckAuth: Open: page-welcome')
            this.windowLocationReplace('#page-welcome')
          }
        }
        this.promiseAuthFinishedResolved(true)
        break
      case AuthStatus.Unauthorized:
        this.pageAuth.on_auth_unauthorized()
        if (authResp.err_message) {
          this.pageAuth.show_error_message(authResp.err_message)
        }
        this.authSession = new AuthSession(authResp.header_www_auth)
        logger.info('CheckAuth: Open: page-auth')
        this.windowLocationAssign(null)
        this.windowLocationAssign('#page-auth')
        break
      case AuthStatus.Forbidden:
        if (authResp.lan_auth_type === 'lan_auth_deny') {
          this.pageAuth.on_auth_forbidden(true)
          this.promiseAuthFinishedResolved(false)
        } else {
          this.pageAuth.on_auth_forbidden(false)
        }
        logger.info('CheckAuth: Open: page-auth')
        this.windowLocationAssign(null)
        this.windowLocationAssign('#page-auth')
        break
    }
  }

  performLogIn (user, password) {
    let encrypted_password = crypto.MD5(user + ':' + this.authSession.realm + ':' + password).toString()
    let password_sha256 = crypto.SHA256(this.authSession.challenge + ':' + encrypted_password).toString()
    logger.info(`Login: user=${user}, password_sha256=${password_sha256}`)

    let json_data = JSON.stringify({
      'login': user,
      'password': password_sha256,
    })

    this.#login(json_data).then(() => {})
  }

  openHomePage () {
    logger.info(`Open home page: '/'`)
    this.windowLocationReplace('/')
  }

  async waitAuth () {
    this.pageAuth.setCallbacks(this.openHomePage, this.performLogIn)
    this.promiseAuthFinished = new Promise((resolve, reject) => {
      this.promiseAuthFinishedResolved = resolve
      this.promiseAuthFinishedRejected = reject
    })
    await this.#login()
    return await this.promiseAuthFinished
  }

  ecdhEncrypt (msg) {
    const hash = crypto.SHA256(msg)
    const aes_iv = crypto.lib.WordArray.random(16)

    if (!this.aes_key) {
      throw Error('AES key has not yet been initialized.')
    }

    let msg_encrypted = crypto.AES.encrypt(msg, this.aes_key, { iv: aes_iv })

    return JSON.stringify({
      'encrypted': msg_encrypted.toString(),
      'iv': crypto.enc.Base64.stringify(aes_iv),
      'hash': crypto.enc.Base64.stringify(hash)
    })
  }
}

function createAuth (anchor, pageAuth, appInfo, windowLocationObj, ecdhInstance) {
  return new Auth(anchor, pageAuth, appInfo, windowLocationObj, ecdhInstance)
}

export default createAuth

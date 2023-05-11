/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GwStatus from './gw_status.mjs'
import GwAP from './gw_ap.mjs'
import Network from './network.mjs'

export function log_wrap (msg) {
  return '[' + new Date().toISOString() + '] ' + msg
}

function fetchValKeyFromData (data, keyName, flagRequired, defaultVal, cbCheckType, typeName) {
  if (keyName in data) {
    if (cbCheckType(data[keyName])) {
      let val = data[keyName]
      delete data[keyName]
      return val
    }
    throw new Error(`Value of '${keyName}' must be a ${typeName}.`)
  }
  if (flagRequired) {
    if (defaultVal !== undefined) {
      throw new Error('flagRequired is true, and defaultVal is not undefined')
    }
    throw new Error(`Missing '${keyName}' key in the data.`)
  }
  if (defaultVal === undefined) {
    return null
  }
  if (!cbCheckType(defaultVal)) {
    throw new Error(`Value of defaultVal '${defaultVal}' must be a ${typeName}.`)
  }
  return defaultVal
}

export function fetchBoolKeyFromData (data, keyName, flagRequired = false, defaultVal) {
  return fetchValKeyFromData(data, keyName, flagRequired, defaultVal,
      (val) => {return typeof val === 'boolean'}, 'boolean')
}

export function fetchIntKeyFromData (data, keyName, flagRequired = false, defaultVal) {
  return fetchValKeyFromData(data, keyName, flagRequired, defaultVal,
      (val) => {return Number.isInteger(val)}, 'integer')
}

export function fetchStringKeyFromData (data, keyName, flagRequired = false, defaultVal) {
  return fetchValKeyFromData(data, keyName, flagRequired, defaultVal,
      (val) => {return typeof val === 'string'}, 'string')
}

export function fetchObjectKeyFromData (data, keyName, flagRequired = false, defaultVal) {
  return fetchValKeyFromData(data, keyName, flagRequired, defaultVal,
      (val) => {return typeof val === 'object'}, 'object')
}

export async function networkDisconnect () {
  GwAP.stopRefreshingAP()
  GwStatus.stopCheckingStatus()
  await Network.waitWhileInProgress()

  GwStatus.setSelectedSSID('')

  console.log(log_wrap('DELETE /connect.json'))
  const data = { 'timestamp': Date.now() }

  try {
    await Network.httpDeleteJson('/connect.json', 10000, JSON.stringify(data))
    console.log(log_wrap('DELETE /connect.json: success'))
  } catch (err) {
    console.log(log_wrap(`DELETE /connect.json: failure: ${err}`))
  }
  GwStatus.setStateNetworkDisconnected()
  GwStatus.startCheckingStatus()
}

export async function networkConnect (ssid, password, auth) {
  GwStatus.setSelectedSSID(ssid)

  if (password === undefined) {
    password = null
  }

  let stub = ''
  let json_content = JSON.stringify({ 'ssid': ssid, 'password': password, 'stub': stub })
  if (json_content.length < 240) {
    // Make the length of the message the same, regardless of the length of ssid/password
    stub = ' '.repeat(240 - json_content.length)
    json_content = { 'ssid': ssid, 'password': password, 'stub': stub }
  }

  console.log(log_wrap('POST /connect.json'))

  const promiseConnecting = GwStatus.setStateToConnecting()
  try {
    await Network.httpEncryptAndPostJson(auth, '/connect.json', 5000, json_content)
    console.log(log_wrap('POST /connect.json: successful'))
    console.log(log_wrap('Waiting for the connection to be established'))
    console.log(log_wrap('Start periodic status check'))
    GwStatus.startCheckingStatus()
    const isSuccessful = await promiseConnecting
    console.log(log_wrap(`Connection status: ${isSuccessful}`))
    return isSuccessful
  } catch (err) {
    console.log(log_wrap(`POST /connect.json: failure: ${err}`))
    throw err
  }
}

export function createDeferredPromise () {
  let externalResolve
  let externalReject

  const promise = new Promise((resolve, reject) => {
    externalResolve = resolve
    externalReject = reject
  })

  return {
    promise,
    resolve: externalResolve,
    reject: externalReject,
  }
}

function generate_url_for_validation (auth, url_to_validate, validate_type, auth_type, params) {
  let url = '/validate_url?url='
  url += encodeURIComponent(url_to_validate)
  url += '&validate_type=' + validate_type
  url += '&auth_type=' + auth_type

  if ('input_user' in params && 'input_pass' in params) {
    let input_user = params['input_user']
    let input_pass = params['input_pass']
    let user_val = input_user.getVal()
    if (user_val) {
      url += '&user='
      url += encodeURIComponent(user_val)
      if (input_pass.is_saved()) {
        url += '&use_saved_password=true'
      } else {
        let pass_val = input_pass.getVal()
        let json_encrypted_password = JSON.parse(auth.ecdhEncrypt(pass_val))
        url += '&encrypted_password='
        url += encodeURIComponent(json_encrypted_password['encrypted'])
        url += '&encrypted_password_iv='
        url += encodeURIComponent(json_encrypted_password['iv'])
        url += '&encrypted_password_hash='
        url += encodeURIComponent(json_encrypted_password['hash'])
      }
    }
  } else if ('input_token' in params) {
    let input_token = params['input_token']
    if (input_token.is_saved()) {
      url += '&use_saved_password=true'
    } else {
      let token_val = input_token.getVal()
      if (token_val) {
        let json_encrypted_password = JSON.parse(auth.ecdhEncrypt(token_val))
        url += '&encrypted_password='
        url += encodeURIComponent(json_encrypted_password['encrypted'])
        url += '&encrypted_password_iv='
        url += encodeURIComponent(json_encrypted_password['iv'])
        url += '&encrypted_password_hash='
        url += encodeURIComponent(json_encrypted_password['hash'])
      }
    }
  }
  if ('aux_params' in params) {
    url += params['aux_params']
  }
  return url
}

export function validate_url (auth, url_to_validate, validate_type, auth_type, params) {
  function validity_icons_clear (params) {
    params['input_url'].clearValidationIcon()
    if ('input_user' in params && 'input_pass' in params) {
      params['input_user'].clearValidationIcon()
      params['input_pass'].clearValidationIcon()
    } else if ('input_token' in params) {
      params['input_token'].clearValidationIcon()
    }
  }

  function validity_icons_set_checking (params) {
    params['input_url'].setCheckingIsValid()
    if ('input_user' in params && 'input_pass' in params) {
      if (params['input_user'].getVal()) {
        params['input_user'].setCheckingIsValid()
        params['input_pass'].setCheckingIsValid()
      }
    } else if ('input_token' in params) {
      let input_token = params['input_token']
      if (input_token.getVal() || input_token.is_saved()) {
        params['input_token'].setCheckingIsValid()
      }
    }
  }

  function validity_icons_set_valid (params) {
    params['input_url'].setValid()
    if ('input_user' in params && 'input_pass' in params) {
      let input_user = params['input_user']
      let input_pass = params['input_pass']
      if (input_user.getVal()) {
        input_user.setValid()
        input_pass.setValid()
      }
    } else if ('input_token' in params) {
      let input_token = params['input_token']
      if (input_token.getVal() || input_token.is_saved()) {
        input_token.setValid()
      }
    }
  }

  function validity_icons_set_invalid (params) {
    params['input_url'].setInvalid()
    if ('input_user' in params) {
      params['input_user'].setInvalid()
    }
    if ('input_pass' in params) {
      params['input_pass'].setInvalid()
    }
    if ('input_token' in params) {
      params['input_token'].setInvalid()
    }
  }

  function set_error_message (params, msg) {
    if ('error' in params) {
      let error_text = params['error']
      let div_status = params['div_status']
      if (msg) {
        error_text.setVal(msg)
        if (div_status) {
          div_status.show()
        }
      } else {
        error_text.setVal('')
        if (div_status) {
          div_status.hide()
        }
      }
    }
  }

  set_error_message(params, '')

  return new Promise((resolve, reject) => {
    let input_url = params['input_url']
    if (!input_url.isValidationRequired() || input_url.isValidityChecked()) {
      console.log(log_wrap(`Skip URL validation (${validate_type}): ${url_to_validate}`))
      resolve(true)
      return
    }
    console.log(log_wrap(`Validate URL (${validate_type}): ${url_to_validate}`))
    let url = generate_url_for_validation(auth, url_to_validate, validate_type, auth_type, params)
    validity_icons_set_checking(params)

    let response_status = 0
    fetch(url)
        .then((response) => {
          response_status = response.status
          return response.json()
        }, (error) => {
          input_url.setInvalid()
          console.log(log_wrap(`Ruuvi Gateway connection failure: ${error}`))
          set_error_message(params, 'Ruuvi Gateway connection failure')
          resolve(false)
        })
        .then(function (resp) {
          if (resp) {
            console.log(log_wrap(`URL validation result (${validate_type}): status=${resp.status}, message=${resp.message}`))
            validity_icons_clear(params)
            if (resp.status === 200) {
              validity_icons_set_valid(params)
            } else if (resp.status === 401) {
              validity_icons_set_invalid(params)
            } else {
              validity_icons_set_invalid({ input_url: params['input_url'] })
              if (resp.status === 502) {
                set_error_message(params, resp.message)
              } else if (resp.status === 500) {
                set_error_message(params, `Ruuvi Gateway internal error: ${resp.message}`)
              } else {
                if (resp.message.startsWith('HTTP response status:')) {
                  set_error_message(params, resp.message)
                } else {
                  set_error_message(params, `HTTP response status: ${resp.status}, Message: ${resp.message}`)
                }
              }
            }
            resolve(true)
          }
        }, function (error) {
          console.log(log_wrap(`Failed to parse JSON response from Ruuvi Gateway: ${error}`))
          input_url.setInvalid()
          set_error_message(params, `HTTP response status: ${response_status}, Failed to parse JSON response from Ruuvi Gateway`)
          resolve(false)
        })
  })
}


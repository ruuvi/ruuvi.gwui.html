/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import { log_wrap } from './utils.mjs'

class Network {
  static #response = null
  static #timeoutId = null

  constructor () {
  }

  static async fetchWithTimeout (url, options, timeout) {
    const abortController = new AbortController()
    const signal = abortController.signal

    if (this.#timeoutId) {
      throw new Error('Network.fetchWithTimeout: Timeout handler is already active')
    }

    const timeoutPromise = new Promise((_, reject) => {
      this.#timeoutId = setTimeout(() => {
        this.fetchWithTimeoutReset()
        abortController.abort()
        reject(new Error(`Network.fetchWithTimeout: Request timed out after ${timeout}ms`)) // it's excessive since 'reject' was already called by abortController.abort
      }, timeout)
    })

    return Promise.race([
      fetch(url, { ...options, signal }).catch((error) => {
        if (error.name === 'AbortError') {
          throw new Error(`Network.fetchWithTimeout: Request timed out after ${timeout}ms`)
        }
        this.fetchWithTimeoutReset()
        throw error
      }),
      timeoutPromise,
    ])
  }

  static fetchWithTimeoutReset () {
    if (!this.#timeoutId) {
      throw new Error('Network.fetchWithTimeoutReset: Timeout is not active')
    }
    clearTimeout(this.#timeoutId)
    this.#timeoutId = null
  }

  static #handleBadResponse (response) {
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json().then(errorData => {
        throw new Error(`Response HTTP status=${response.status}, statusText=${response.statusText}, ${errorData.message ? 'message="' + errorData.message + '"' : 'json=\'' + JSON.stringify(errorData) + '\''}`)
      })
    } else {
      return response.text().then(bodyText => {
        let error_msg = `Response HTTP status=${response.status}, statusText=${response.statusText}, content-type=${contentType}`
        if (bodyText) {
          error_msg += `, message='${bodyText}'`
        }
        throw new Error(error_msg)
      })
    }
  }

  static async fetch_json (method, url, timeout,
      json_data = undefined,
      options = {
        extra_headers: undefined,
        list_of_allowed_statuses: undefined,
      }) {

    const list_of_allowed_statuses = options.list_of_allowed_statuses ? options.list_of_allowed_statuses : [200]

    const params = {
      method: method,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        ...options.extra_headers,
      },
    }
    if (json_data) {
      params.headers['Content-Type'] = 'application/json; charset=utf-8'
      if (typeof json_data === 'string') {
        params.body = json_data
      } else if (typeof json_data === 'object') {
        params.body = JSON.stringify(json_data)
      } else {
        throw new Error(`Unknown type of json_data: ${typeof json_data}`)
      }
    }

    console.log(log_wrap(`${method} ${url}`))

    if (this.#timeoutId) {
      throw Error('Another fetch_json is active')
    }

    let bodyText
    try {
      this.#response = await this.fetchWithTimeout(url, params, timeout)
      console.log(log_wrap(`fetch_json: response is_ok=${this.#response.ok}, status=${this.#response.status}`))
      bodyText = await this.#response.text()
      this.fetchWithTimeoutReset()
    } catch (err) {
      console.log(log_wrap(`fetch_json: exception: ${err}`))
      throw err
    }
    const contentType = this.#response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      let error_msg = `Response HTTP status=${this.#response.status}, statusText=${this.#response.statusText}, content-type=${contentType}`
      if (bodyText) {
        error_msg += `, message='${bodyText}'`
      }
      throw new Error(error_msg)
    }

    let jsonData
    try {
      jsonData = JSON.parse(bodyText)
    } catch (err) {
      console.log(log_wrap(`fetch_json: JSON.parse failed: ${err}`))
      if (err.name === 'SyntaxError') {
        throw new Error(`fetch_json: JSON.parse failed: ${err.name}: '${bodyText}' is not valid JSON`)
      }
      throw new Error(`fetch_json: JSON.parse failed: ${err}`)
    }

    if (!list_of_allowed_statuses.includes(this.#response.status)) {
      let error_msg = `Response HTTP status=${this.#response.status}, statusText=${this.#response.statusText}, `
      if (jsonData.message) {
        error_msg += `message="${jsonData.message}"`
      } else {
        error_msg += `json='${JSON.stringify(jsonData)}'`
      }
      throw new Error(error_msg)
    }

    console.log(log_wrap('fetch_json: success'))
    return jsonData
  }

  static getResponse () {
    return this.#response
  }

  static async httpGetJson (url, timeout, options) {
    return this.fetch_json('GET', url, timeout, null, options)
  }

  static async httpPostJson (url, timeout, json_data, options) {
    return this.fetch_json('POST', url, timeout, json_data, options)
  }

  static async httpEncryptAndPostJson (auth, url, timeout, json_data, options) {
    const data_encrypted = auth.ecdhEncrypt(JSON.stringify(json_data))
    return Network.httpPostJson(url, timeout, data_encrypted,
        { 'extra_headers': { 'ruuvi_ecdh_encrypted': true } })
  }

  static async httpEncryptAndPostFile (auth, url, timeout, file_data, options) {
    const data_encrypted = auth.ecdhEncrypt(file_data)
    return Network.httpPostJson(url, timeout, data_encrypted,
        { 'extra_headers': { 'ruuvi_ecdh_encrypted': true } })
  }

  static async httpDeleteJson (url, timeout, json_data, options) {
    return this.fetch_json('DELETE', url, timeout, json_data, options)
  }

  static isInProgress () {
    return !!this.#timeoutId
  }

  static async waitWhileInProgress () {
    return new Promise((resolve) => {
      const waitForCompletion = () => {
        if (Network.isInProgress()) {
          setTimeout(waitForCompletion, 500)
        } else {
          resolve()
        }
      }
      waitForCompletion()
    })
  }
}

export default Network

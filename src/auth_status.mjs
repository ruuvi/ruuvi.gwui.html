/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class AuthStatus {
  static OK = new AuthStatus(200, 'OK')
  static Unauthorized = new AuthStatus(401, 'Unauthorized')
  static Forbidden = new AuthStatus(403, 'Forbidden')

  #status
  #name

  constructor (http_resp_status, name) {
    this.#status = http_resp_status
    this.#name = name
  }

  static convHttpRespStatusToAuthStatus (http_resp_status) {
    switch (http_resp_status) {
      case 200:
        return AuthStatus.OK
      case 401:
        return AuthStatus.Unauthorized
      case 403:
        return AuthStatus.Forbidden
      default:
        throw Error(`Unacceptable HTTP status: ${http_resp_status}`)
    }
  }

  toString () {
    return `AuthStatus.${this.#name}`
  }
}

export default AuthStatus

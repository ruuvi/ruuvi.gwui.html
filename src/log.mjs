/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class Log {

  static #getCurrentTimestamp () {
    return new Date().toISOString()
  }

  static debug (message) {
    return `[${Log.#getCurrentTimestamp()}] [DEBUG] ${message}`
  }

  static info (message) {
    return `[${Log.#getCurrentTimestamp()}] [INFO] ${message}`
  }

  static warn (message) {
    return `[${Log.#getCurrentTimestamp()}] [WARN] ${message}`
  }

  static error (message) {
    return `[${Log.#getCurrentTimestamp()}] [ERROR] ${message}`
  }
}

export default Log

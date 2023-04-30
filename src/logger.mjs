class Logger {
  static #instance

  constructor () {
    if (!Logger.#instance) {
      Logger.#instance = this
    }

    // Always return the same instance
    return Logger.#instance
  }

  getCurrentTimestamp () {
    return new Date().toISOString()
  }

  debug (message) {
    console.log(`[${this.getCurrentTimestamp()}] [DEBUG] ${message}`)
  }

  info (message) {
    console.log(`[${this.getCurrentTimestamp()}] [INFO] ${message}`)
  }

  warn (message) {
    console.log(`[${this.getCurrentTimestamp()}] [WARN] ${message}`)
  }

  error (message) {
    console.error(`[${this.getCurrentTimestamp()}] [ERROR] ${message}`)
  }
}

const logger = new Logger()
export default logger

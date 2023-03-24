class Logger {
  getCurrentTimestamp () {
    return new Date().toISOString()
  }

  debug (message) {
    console.log(`[${this.getCurrentTimestamp()}] [DEBUG]: ${message}`)
  }

  info (message) {
    console.log(`[${this.getCurrentTimestamp()}] [INFO]: ${message}`)
  }

  warn (message) {
    console.log(`[${this.getCurrentTimestamp()}] [WARN]: ${message}`)
  }

  error (message) {
    console.error(`[${this.getCurrentTimestamp()}] [ERROR]: ${message}`)
  }
}

const logger = new Logger()
export default logger

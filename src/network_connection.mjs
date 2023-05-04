/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class NetworkConnection {
  static #instance
  #flagConnected = false
  #flagIsWaiting = false

  constructor () {
    if (!NetworkConnection.#instance) {
      NetworkConnection.#instance = this
      this.#flagConnected = false
    }

    // Always return the same instance
    return NetworkConnection.#instance
  }

  setWaiting () {
    this.#flagConnected = false
    this.#flagIsWaiting = true
  }

  setConnected () {
    this.#flagConnected = true
    this.#flagIsWaiting = false
  }

  setDisconnected () {
    this.#flagConnected = false
    this.#flagIsWaiting = false
  }

  isWaiting () {
    return this.#flagIsWaiting
  }

  isConnected () {
    return this.#flagConnected
  }
}

const networkConnection = new NetworkConnection()
export default networkConnection

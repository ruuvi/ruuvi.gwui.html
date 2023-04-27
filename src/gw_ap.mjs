import { log_wrap } from './utils.mjs'
import GwStatus from './gw_status.mjs'
import Network from './network.mjs'

const REFRESH_AP_TIMEOUT_MS = 15000

class GwAP {
  static #instance
  #refreshAPTimer = null
  #refreshAPActive = false
  #cb_refreshAPHTML

  constructor () {
    if (!GwAP.#instance) {
      GwAP.#instance = this
    }

    // Always return the same instance
    return GwAP.#instance
  }

  static getInstance () {
    if (!GwAP.#instance) {
      return new GwAP()
    }
    return GwAP.#instance
  }

  startRefreshAP (timeout = 0) {
    if (this.#refreshAPTimer !== null) {
      console.log(log_wrap('startRefreshAP: Warning: previous timer has not stopped yet'))
      this.stopRefreshAP()
    }
    this.#refreshAPActive = true
    if (timeout === 0) {
      console.log(log_wrap('startRefreshAP: Start refreshing Wi-Fi APs'))
    } else {
      console.log(log_wrap('startRefreshAP: Start refreshing Wi-Fi APs after timeout=' + timeout))
    }
    this.#refreshAPTimer = setTimeout(() => this.#refreshAP(), timeout)
  }

  static startRefreshingAP (timeout, cb_refreshAPHTML) {
    let gw_ap = GwAP.getInstance()
    if (cb_refreshAPHTML) {
      gw_ap.#cb_refreshAPHTML = cb_refreshAPHTML
    }
    gw_ap.startRefreshAP(timeout)
  }

  stopRefreshAP () {
    console.log(log_wrap('Stop refreshing Wi-Fi APs'))
    if (this.#refreshAPTimer != null) {
      clearTimeout(this.#refreshAPTimer)
      this.#refreshAPTimer = null
    }
    const prevIsActive = this.#refreshAPActive
    this.#refreshAPActive = false
    return prevIsActive
  }

  static stopRefreshingAP () {
    return GwAP.getInstance().stopRefreshAP()
  }

  #refreshAP () {
    this.#refreshAPTimer = null

    if (!this.#refreshAPActive) {
      return
    }

    if (Network.isInProgress()) {
      console.log(log_wrap('refreshAP: another network request is in progress, postpone refreshAP'))
      this.startRefreshAP(500)
      return
    }

    const timestamp1 = new Date()

    const prevCheckStatusActive = GwStatus.stopCheckingStatus()

    console.log(log_wrap('GET /ap.json'))

    Network.httpGetJson('/ap.json', REFRESH_AP_TIMEOUT_MS).then((data) => {
      console.log(log_wrap('GET /ap.json: success, data.length=' + data.length))
      if (this.#cb_refreshAPHTML) {
        this.#cb_refreshAPHTML(data)
      }

      if (prevCheckStatusActive) {
        console.log(log_wrap('Start periodic status check'))
        GwStatus.startCheckingStatus()
      }
      if (this.#refreshAPActive) {
        let timestamp2 = new Date()
        let delta_ms = timestamp2 - timestamp1
        if (delta_ms < 5000) {
          this.startRefreshAP(5000 - delta_ms)
        } else {
          this.startRefreshAP(2000)
        }
      }
    }).catch((error) => {
      console.log(log_wrap(`GET /ap.json: failure, error=${error}, timeout=${REFRESH_AP_TIMEOUT_MS}`))
      if (this.#cb_refreshAPHTML) {
        this.#cb_refreshAPHTML(null)
      }
      let timestamp2 = new Date()
      if (prevCheckStatusActive) {
        console.log(log_wrap('Start periodic status check'))
        GwStatus.startCheckingStatus()
      }
      if (this.#refreshAPActive) {
        let delta_ms = timestamp2 - timestamp1
        if (delta_ms < 5000) {
          this.startRefreshAP(5000 - delta_ms)
        } else {
          this.startRefreshAP(5000)
        }
      }
    })
  }
}

export default GwAP

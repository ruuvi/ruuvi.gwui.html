import $ from 'jquery'
import GuiLoading from './gui_loading.mjs'
import GuiOverlay from './gui_overlay.mjs'
import Network from './network.mjs'
import GwAP from './gw_ap.mjs'
import networkConnection from './network_connection.mjs'
import Navigation from './navigation.mjs'
import { log_wrap } from './utils.mjs'

const FETCH_STATUS_JSON_TIMEOUT_MS = 3000

const URC_CODE = {
  CONNECTED: 0,
  FAILED: 1,
  DISCONNECTED: 2,
  LOST_CONNECTION: 3,
}

const CONNECTION_STATE = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  FAILED: 'FAILED',
}

export class NetworkConnectionInfo {
  ssid
  ip
  netmask
  gw
  dhcp
}

class GwStatus {
  static #instance
  #checkStatusTimer = null
  #checkStatusActive = false
  #counterStatusJsonTimeout = 0
  #cbFirmwareUpdatingProgress
  #connectedSSID = ''
  #selectedSSID = ''
  #connectionState = CONNECTION_STATE.NOT_CONNECTED
  #flagNetworkConnected = false
  #flagWaitingNetworkConnection = false
  #resolveOnConnected = null
  #overlay_no_gateway_connection = new GuiOverlay($('#overlay-no_gateway_connection'))
  #networkConnectionInfo = new NetworkConnectionInfo()

  constructor () {
    if (!GwStatus.#instance) {
      GwStatus.#instance = this
    }

    // Always return the same instance
    return GwStatus.#instance
  }

  static getInstance () {
    if (!GwStatus.#instance) {
      return new GwStatus()
    }
    return GwStatus.#instance
  }

  /**
   * @returns {NetworkConnectionInfo}
   */
  static getNetworkConnectionInfo () {
    return GwStatus.getInstance().#networkConnectionInfo
  }

  static isWaitingForNetworkConnection () {
    return GwStatus.getInstance().#flagWaitingNetworkConnection
  }

  static getConnectedSSID () {
    return GwStatus.getInstance().#connectedSSID
  }

  static setSelectedSSID (selectedSSID) {
    GwStatus.getInstance().#selectedSSID = selectedSSID
  }

  static setCallbackFirmwareUpdatingProgress (cb) {
    GwStatus.getInstance().#cbFirmwareUpdatingProgress = cb
  }

  #startCheckingStatus (timeout = 0) {
    if (this.#checkStatusTimer !== null) {
      console.log(log_wrap('Warning: startCheckStatus is called while the previous timer is not stopped'))
      this.#stopCheckingStatus()
    }
    this.#checkStatusActive = true
    this.#checkStatusTimer = setTimeout(() => this.#checkStatus(), timeout)
  }

  static startCheckingStatus () {
    return GwStatus.getInstance().#startCheckingStatus()
  }

  #stopCheckingStatus () {
    console.log(log_wrap('Stop periodic status checking'))
    if (this.#checkStatusTimer != null) {
      clearTimeout(this.#checkStatusTimer)
      this.#checkStatusTimer = null
    }
    const prevIsActive = this.#checkStatusActive
    this.#checkStatusActive = false
    return prevIsActive
  }

  static stopCheckingStatus () {
    return GwStatus.getInstance().#stopCheckingStatus()
  }

  static setStateToConnecting () {
    let gw_status = GwStatus.getInstance()
    gw_status.#connectionState = CONNECTION_STATE.CONNECTING
    gw_status.#flagNetworkConnected = false
    gw_status.#flagWaitingNetworkConnection = true

    const promiseConnecting = new Promise((resolve, reject) => {
      gw_status.#resolveOnConnected = resolve
    })

    networkConnection.setWaiting()
    return promiseConnecting
  }

  static setStateNetworkDisconnected () {
    let gw_status = GwStatus.getInstance()
    gw_status.#flagWaitingNetworkConnection = false
    gw_status.#flagNetworkConnected = false
  }

  #ui_update_network_info (ssid, data) {
    this.#networkConnectionInfo.ssid = ssid
    this.#networkConnectionInfo.ip = data['ip']
    this.#networkConnectionInfo.netmask = data['netmask']
    this.#networkConnectionInfo.gw = data['gw']

    if (data.hasOwnProperty('dhcp') && data['dhcp'] !== '') {
      this.#networkConnectionInfo.dhcp = data['dhcp']
    } else {
      this.#networkConnectionInfo.dhcp = null
    }
  }

  #onGetStatusJsonForWiFi (data) {
    this.#connectedSSID = data['ssid']
    if (data['ssid'] === this.#selectedSSID) {
      //that's a connection attempt
      if (data['urc'] === URC_CODE.CONNECTED) {
        this.#ui_update_network_info(this.#connectedSSID, data)

        switch (this.#connectionState) {
          case CONNECTION_STATE.NOT_CONNECTED:
            break
          case CONNECTION_STATE.CONNECTING:
            if (!this.#flagNetworkConnected) {
              this.#flagNetworkConnected = true
              networkConnection.setConnected()
              if (this.#resolveOnConnected) {
                this.#resolveOnConnected(true)
                this.#resolveOnConnected = null
              }
            }
            break
          case CONNECTION_STATE.CONNECTED:
            break
          case CONNECTION_STATE.FAILED:
            break
        }
        this.#connectionState = CONNECTION_STATE.CONNECTED
      } else if (data['urc'] === URC_CODE.FAILED) {
        //failed attempt
        $('#ip').text('0.0.0.0')
        $('#netmask').text('0.0.0.0')
        $('#gw').text('0.0.0.0')
        $('#dhcp').text('')
        $('#dhcp-block').hide()

        switch (this.#connectionState) {
          case CONNECTION_STATE.NOT_CONNECTED:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.NOT_CONNECTED'))
            break
          case CONNECTION_STATE.CONNECTING:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.CONNECTING'))
            this.#flagWaitingNetworkConnection = false
            if (this.#resolveOnConnected) {
              this.#resolveOnConnected(false)
              this.#resolveOnConnected = null
            }
            break
          case CONNECTION_STATE.CONNECTED:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.CONNECTED'))
            break
          case CONNECTION_STATE.FAILED:
            console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.FAILED'))
            break
        }
        this.#connectionState = CONNECTION_STATE.FAILED
        networkConnection.setDisconnected()
      }
    } else if (data.hasOwnProperty('urc') && data['urc'] === URC_CODE.CONNECTED) {
      //ESP32 is already connected to a Wi-Fi without having the user do anything
      this.#ui_update_network_info(this.#connectedSSID, data)
      switch (this.#connectionState) {
        case CONNECTION_STATE.NOT_CONNECTED:
        case CONNECTION_STATE.CONNECTING:
          if (!this.#flagNetworkConnected) {
            this.#flagNetworkConnected = true
            networkConnection.setConnected()
            if (this.#resolveOnConnected) {
              this.#resolveOnConnected(true)
              this.#resolveOnConnected = null
            }
          }
          break
        case CONNECTION_STATE.CONNECTED:
          break
        case CONNECTION_STATE.FAILED:
          break
      }
      this.#connectionState = CONNECTION_STATE.CONNECTED
    }
  }

  #onGetStatusJsonForEth (data) {
    this.#connectedSSID = ''
    if (data.hasOwnProperty('urc')) {
      if (data['urc'] === URC_CODE.CONNECTED) {
        // connected to Ethernet
        this.#ui_update_network_info(this.#connectedSSID, data)

        switch (this.#connectionState) {
          case CONNECTION_STATE.NOT_CONNECTED:
          case CONNECTION_STATE.CONNECTING:
            if (!this.#flagNetworkConnected) {
              this.#flagNetworkConnected = true
              networkConnection.setConnected()
              if (this.#resolveOnConnected) {
                this.#resolveOnConnected(true)
                this.#resolveOnConnected = null
              }
            }
            break
          case CONNECTION_STATE.CONNECTED:
            break
          case CONNECTION_STATE.FAILED:
            break
        }
        this.#connectionState = CONNECTION_STATE.CONNECTED
      } else if (data['urc'] === URC_CODE.DISCONNECTED) {
        this.#connectionState = CONNECTION_STATE.NOT_CONNECTED
        //that's a manual disconnect
        // TODO: implement
        // if($("#wifi-status").is(":visible"))
        // {
        // 	$("#wifi-status").slideUp( "fast", function() {});
        // }
      }
    }
  }

  #onGetStatusJson (data) {
    if (data.hasOwnProperty('extra')) {
      const data_extra = data['extra']
      const fw_updating_stage = data_extra['fw_updating']
      if (this.#cbFirmwareUpdatingProgress) {
        const fw_updating_percentage = data_extra['percentage']
        const err_message = data_extra['message']
        if (this.#cbFirmwareUpdatingProgress(fw_updating_stage, fw_updating_percentage, err_message)) {
          return
        }
      } else {
        if (fw_updating_stage !== 0) {
          Navigation.change_url_software_update_progress()
        }
      }
    } else {
      if (this.#cbFirmwareUpdatingProgress) {
        if (this.#cbFirmwareUpdatingProgress(null, null)) {
          return
        }
      }
    }

    if (data.hasOwnProperty('ssid') && !!data['ssid'] && data['ssid'] !== '') {
      this.#onGetStatusJsonForWiFi(data)
    } else {
      this.#onGetStatusJsonForEth(data)
    }
    if (window.location.hash === '#page-welcome') {
      $('#page-welcome-button-get-started').removeClass('disable-click')
    }
  }

  #checkStatus () {
    this.#checkStatusTimer = null

    if (Network.isInProgress()) {
      console.log(log_wrap('checkStatus: another network request is in progress, postpone checkStatus'))
      this.#startCheckingStatus(500)
      return
    }

    let timestamp1 = new Date()
    console.log(log_wrap('GET /status.json: cnt=' + this.#counterStatusJsonTimeout + ', time: ' + timestamp1.toISOString()))

    Network.httpGetJson('/status.json', FETCH_STATUS_JSON_TIMEOUT_MS).then((data) => {
      // console.log(log_wrap(`FetchGwStatus: data: ${JSON.stringify(data)}`))
      console.log(log_wrap('GET /status.json: success'))
      this.#counterStatusJsonTimeout = 0
      this.#onGetStatusJson(data)
      if (this.#checkStatusActive) {
        console.log(log_wrap('Start periodic status check'))
        this.#startCheckingStatus(1000)
      }
      return true
    }).catch((error) => {
      // It's a normal situation after "POST /connect.json", the Gateway will not answer for 5-7 seconds.
      const timestamp2 = new Date()
      console.log(log_wrap(`GET /status.json failure: ${error}, cnt=${this.#counterStatusJsonTimeout}, delta=${timestamp2 - timestamp1}`))

      this.#counterStatusJsonTimeout += 1
      if (this.#counterStatusJsonTimeout >= 4) {
        this.#overlay_no_gateway_connection.fadeIn()
        GuiLoading.bodyClassLoadingRemove()
        GwAP.stopRefreshingAP()
        this.#stopCheckingStatus()
      } else {
        if (this.#checkStatusActive) {
          let delta_ms = timestamp2 - timestamp1
          if (delta_ms < 1000) {
            console.log(log_wrap('Start periodic status check'))
            this.#startCheckingStatus(1000 - delta_ms)
          } else {
            console.log(log_wrap('Start periodic status check'))
            this.#startCheckingStatus()
          }
        }
      }
    })
  }
}

export default GwStatus

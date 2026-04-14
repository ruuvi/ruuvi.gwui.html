/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery';
import GuiLoading from './gui_loading.mjs';
import GuiOverlay from './gui_overlay.mjs';
import Network from './network.mjs';
import GwAP from './gw_ap.mjs';
import Navigation from './navigation.mjs';
import {log_wrap} from './utils.mjs';

const FETCH_STATUS_JSON_TIMEOUT_MS = 3000;

/**
 * @typedef {0|1|2|3} UrcCode
 */

/**
 * @readonly
 * @enum {number}
 */
const URC_CODE = {
  CONNECTED: 0,
  FAILED: 1,
  DISCONNECTED: 2,
  LOST_CONNECTION: 3,
};

const CONNECTION_STATE = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED_WAITING_TIME_SYNC: 'CONNECTED_WAITING_TIME_SYNC',
  CONNECTED_AND_SYNCED: 'CONNECTED_AND_SYNCED',
  FAILED: 'FAILED',
};

/**
 * @typedef {Object} NetworkInfoStatusExtraJson
 * @property {number} fw_updating
 * @property {number} percentage
 * @property {string} message
 */

/**
 * @typedef {Object} NetworkInfoStatusJson
 * @property {string|null} [ssid]
 * @property {string} [ip]
 * @property {string} [netmask]
 * @property {string} [gw]
 * @property {string} [dhcp]
 * @property {UrcCode} [urc]
 * @property {0|1} [is_time_valid]
 * @property {NetworkInfoStatusExtraJson} [extra]
 */

/**
 * @typedef {Object} NetworkInfoWithUrcCode
 * @property {string|null} ssid
 * @property {string} ip
 * @property {string} netmask
 * @property {string} gw
 * @property {string} dhcp
 * @property {UrcCode} urc
 * @property {boolean} is_time_valid
 */

/**
 * @typedef {Object} NetworkConnectionInfo
 * @property {string|null} ssid
 * @property {string} ip
 * @property {string} netmask
 * @property {string} gw
 * @property {string|null} dhcp
 */
export class NetworkConnectionInfo {
  ssid;
  ip;
  netmask;
  gw;
  dhcp;
}

class GwStatus {
  static #instance;
  #checkStatusTimer = null;
  #checkStatusActive = false;
  #counterStatusJsonTimeout = 0;
  #cbFirmwareUpdatingProgress;
  /** @type {string} */
  #connectedSSID = '';
  /** @type {string} */
  #selectedSSID = '';
  #connectionState = CONNECTION_STATE.NOT_CONNECTED;
  #cbOnConnected = null;
  #resolveOnConnected = null;
  #rejectConnecting = null;
  #overlay_no_gateway_connection = new GuiOverlay($('#overlay-no_gateway_connection'));
  #networkConnectionInfo = new NetworkConnectionInfo();
  /** @type {boolean} */
  #isTimeValid = false;
  #timestampStartConnecting = null;
  #timestampConnected = null;
  #connectionTimeout = 20 * 1000;
  #syncTimeTimeout = 10 * 1000;

  constructor() {
    if (!GwStatus.#instance) {
      GwStatus.#instance = this;
    }

    // Always return the same instance
    return GwStatus.#instance;
  }

  static getInstance() {
    if (!GwStatus.#instance) {
      return new GwStatus();
    }
    return GwStatus.#instance;
  }

  /**
   * @returns {NetworkConnectionInfo}
   */
  static getNetworkConnectionInfo() {
    return GwStatus.getInstance().#networkConnectionInfo;
  }

  static isWaitingForNetworkConnection() {
    let gw_status = GwStatus.getInstance();
    return gw_status.#connectionState === CONNECTION_STATE.CONNECTING;
  }

  static isWaitingForTimeSync() {
    let gw_status = GwStatus.getInstance();
    return gw_status.#connectionState === CONNECTION_STATE.CONNECTED_WAITING_TIME_SYNC;
  }

  static isConnectedAndTimeSynced() {
    let gw_status = GwStatus.getInstance();
    return gw_status.#connectionState === CONNECTION_STATE.CONNECTED_AND_SYNCED;
  }

  static getConnectedSSID() {
    return GwStatus.getInstance().#connectedSSID;
  }

  static setSelectedSSID(selectedSSID) {
    GwStatus.getInstance().#selectedSSID = selectedSSID;
  }

  static setCallbackFirmwareUpdatingProgress(cb) {
    GwStatus.getInstance().#cbFirmwareUpdatingProgress = cb;
  }

  #startCheckingStatus(timeout = 0) {
    if (this.#checkStatusTimer !== null) {
      console.log(log_wrap('Warning: startCheckStatus is called while the previous timer is not stopped'));
      this.#stopCheckingStatus();
    }
    this.#checkStatusActive = true;
    this.#checkStatusTimer = setTimeout(() => this.#checkStatus(), timeout);
  }

  static startCheckingStatus() {
    return GwStatus.getInstance().#startCheckingStatus();
  }

  #stopCheckingStatus() {
    console.log(log_wrap('Stop periodic status checking'));
    if (this.#checkStatusTimer != null) {
      clearTimeout(this.#checkStatusTimer);
      this.#checkStatusTimer = null;
    }
    const prevIsActive = this.#checkStatusActive;
    this.#checkStatusActive = false;
    return prevIsActive;
  }

  static stopCheckingStatus() {
    return GwStatus.getInstance().#stopCheckingStatus();
  }

  static setStateToConnecting(connectionTimeout = 20 * 1000,
                              cbOnConnected = null,
                              signal = null) {
    let gw_status = GwStatus.getInstance();
    gw_status.#timestampStartConnecting = new Date();
    gw_status.#timestampConnected = null;
    gw_status.#connectionTimeout = connectionTimeout;
    gw_status.#cbOnConnected = cbOnConnected;
    gw_status.#connectionState = CONNECTION_STATE.CONNECTING;

    return new Promise((resolve, reject) => {
      gw_status.#resolveOnConnected = resolve;
      gw_status.#rejectConnecting = reject;

      const abortError = () => new Error('AbortError');

      const onAbort = () => {
        console.log(log_wrap(`GwStatus: onAbort`));
        gw_status.#resolveOnConnected = null;
        gw_status.#rejectConnecting = null;
        gw_status.#timestampStartConnecting = null;
        gw_status.#timestampConnected = null;
        gw_status.#cbOnConnected = null;
        if (gw_status.#connectionState === CONNECTION_STATE.CONNECTING) {
          gw_status.#connectionState = CONNECTION_STATE.NOT_CONNECTED;
        }

        reject(abortError());
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, {once: true});
      }
    });
  }

  static setStateNetworkDisconnected() {
    let gw_status = GwStatus.getInstance();
    let resolve_on_connected = gw_status.#resolveOnConnected;
    gw_status.#resolveOnConnected = null;
    gw_status.#rejectConnecting = null;
    gw_status.#timestampStartConnecting = null;
    gw_status.#timestampConnected = null;
    gw_status.#cbOnConnected = null;
    gw_status.#connectionState = CONNECTION_STATE.NOT_CONNECTED;
    if (resolve_on_connected) {
      resolve_on_connected(false);
    }
  }

  static isTimeValid() {
    return GwStatus.getInstance().#isTimeValid;
  }

  static setTimeInvalid() {
    GwStatus.getInstance().#isTimeValid = false;
  }

  /**
   * Convert partial status JSON into a fully initialized NetworkInfo object.
   *
   * @param {NetworkInfoStatusJson} data
   * @returns {NetworkInfoWithUrcCode}
   */
  #conv_json_to_network_info(data) {
    return {
      ssid: data.ssid ?? null,
      ip: data.ip ?? '',
      netmask: data.netmask ?? '',
      gw: data.gw ?? '',
      dhcp: data.dhcp ?? '',
      urc: data.urc ?? URC_CODE.DISCONNECTED,
      is_time_valid: data.is_time_valid === 1,
    };
  }

  /**
   * @param {string} ssid
   * @param {NetworkInfoWithUrcCode} network_info
   */
  #ui_update_network_info(ssid, network_info) {
    this.#networkConnectionInfo.ssid = ssid;
    this.#networkConnectionInfo.ip = network_info.ip;
    this.#networkConnectionInfo.netmask = network_info.netmask;
    this.#networkConnectionInfo.gw = network_info.gw;
    this.#networkConnectionInfo.dhcp = network_info.dhcp !== '' ? network_info.dhcp : null;
  }

  /**
   * @param {NetworkInfoWithUrcCode} network_info
   */
  #onGetStatusJsonWithUrcCodeConnected(network_info) {
    this.#ui_update_network_info(this.#connectedSSID, network_info);

    switch (this.#connectionState) {
      case CONNECTION_STATE.NOT_CONNECTED:
      case CONNECTION_STATE.FAILED:
      case CONNECTION_STATE.CONNECTING:
        this.#connectionState = CONNECTION_STATE.CONNECTED_WAITING_TIME_SYNC;
        this.#timestampConnected = new Date();
        if (this.#cbOnConnected) {
          this.#cbOnConnected();
          this.#cbOnConnected = null;
        }
        // fall through
      case CONNECTION_STATE.CONNECTED_WAITING_TIME_SYNC:
        if (!network_info.is_time_valid) {
          break;
        }
        this.#connectionState = CONNECTION_STATE.CONNECTED_AND_SYNCED;
        // fall through
      case CONNECTION_STATE.CONNECTED_AND_SYNCED:
        if (this.#resolveOnConnected) {
          this.#resolveOnConnected(true);
          this.#resolveOnConnected = null;
          this.#rejectConnecting = null;
        }
        break;
    }
  }

  #onGetStatusJsonForWiFiWithUrcCodeFailed() {
    $('#ip').text('0.0.0.0');
    $('#netmask').text('0.0.0.0');
    $('#gw').text('0.0.0.0');
    $('#dhcp').text('');
    $('#dhcp-block').hide();

    switch (this.#connectionState) {
      case CONNECTION_STATE.NOT_CONNECTED:
        console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.NOT_CONNECTED'));
        break;
      case CONNECTION_STATE.CONNECTING:
        console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.CONNECTING'));
        break;
      case CONNECTION_STATE.CONNECTED_WAITING_TIME_SYNC:
        console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.CONNECTED_WAITING_TIME_SYNC'));
        break;
      case CONNECTION_STATE.CONNECTED_AND_SYNCED:
        console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.CONNECTED_AND_SYNCED'));
        break;
      case CONNECTION_STATE.FAILED:
        console.log(log_wrap('onGetStatusJson: URC_CODE.FAILED, CONNECTION_STATE.FAILED'));
        break;
    }
    this.#connectionState = CONNECTION_STATE.FAILED;
    if (this.#resolveOnConnected) {
      this.#resolveOnConnected(false);
      this.#resolveOnConnected = null;
      this.#rejectConnecting = null;
    }
  }

  /**
   * @param {NetworkInfoWithUrcCode} network_info
   */
  #onGetStatusJsonForWiFi(network_info) {
    this.#connectedSSID = network_info.ssid;
    if (network_info.urc === URC_CODE.CONNECTED) {
      this.#onGetStatusJsonWithUrcCodeConnected(network_info);
    } else if (network_info.urc === URC_CODE.FAILED) {
      if (this.#connectedSSID === this.#selectedSSID) {
        //that's a failed connection attempt
        this.#onGetStatusJsonForWiFiWithUrcCodeFailed();
      } else {
        this.#connectionState = CONNECTION_STATE.NOT_CONNECTED;
        if (this.#resolveOnConnected) {
          this.#resolveOnConnected(false);
          this.#resolveOnConnected = null;
          this.#rejectConnecting = null;
        }
      }
    } else if (network_info.urc === URC_CODE.DISCONNECTED) {
      this.#connectionState = CONNECTION_STATE.NOT_CONNECTED;
    } else if (network_info.urc === URC_CODE.LOST_CONNECTION) {
      this.#connectionState = CONNECTION_STATE.NOT_CONNECTED;
    }
  }

  /**
   * @param {NetworkInfoWithUrcCode} network_info
   */
  #onGetStatusJsonForEth(network_info) {
    this.#connectedSSID = '';
    if (network_info.urc === URC_CODE.CONNECTED) {
      this.#onGetStatusJsonWithUrcCodeConnected(network_info);
    } else if (network_info.urc === URC_CODE.FAILED) {
      this.#connectionState = CONNECTION_STATE.FAILED;
    } else if (network_info.urc === URC_CODE.DISCONNECTED) {
      this.#connectionState = CONNECTION_STATE.NOT_CONNECTED;
    } else if (network_info.urc === URC_CODE.LOST_CONNECTION) {
      this.#connectionState = CONNECTION_STATE.NOT_CONNECTED;
    }
  }

  #onGetStatusJson(data) {
    if (data.hasOwnProperty('extra')) {
      /** @type {NetworkInfoStatusExtraJson} */
      const data_extra = data['extra'];
      const fw_updating_stage = data_extra['fw_updating'];
      if (this.#cbFirmwareUpdatingProgress) {
        const fw_updating_percentage = data_extra['percentage'];
        const err_message = data_extra['message'];
        if (this.#cbFirmwareUpdatingProgress(fw_updating_stage, fw_updating_percentage, err_message)) {
          return;
        }
      } else {
        if (fw_updating_stage !== 0) {
          Navigation.change_url_software_update_progress();
        }
      }
    } else {
      if (this.#cbFirmwareUpdatingProgress) {
        if (this.#cbFirmwareUpdatingProgress(null, null)) {
          return;
        }
      }
    }

    this.#isTimeValid = data.hasOwnProperty('is_time_valid') && (data['is_time_valid'] === 1);

    if (this.#connectionState === CONNECTION_STATE.CONNECTED_WAITING_TIME_SYNC) {
      if (this.#syncTimeTimeout !== null) {
        const diff_ms = new Date() - this.#timestampConnected;
        if (diff_ms >= this.#syncTimeTimeout) {
          if (this.#rejectConnecting) {
            this.#rejectConnecting(new Error('Time synchronisation timed out'));
          }
          this.#rejectConnecting = null;
          this.#resolveOnConnected = null;
          this.#timestampStartConnecting = null;
          // Leave #connectionState without modification here because we need to be able to go to the next
          // steps of the configuration process and reconfigure NTP servers if needed.
        }
      }
    } else if (this.#connectionState === CONNECTION_STATE.CONNECTING && this.#connectionTimeout !== null) {
      const diff_ms = new Date() - this.#timestampStartConnecting;
      if (diff_ms >= this.#connectionTimeout) {
        if (this.#rejectConnecting) {
          this.#rejectConnecting(new Error('Timeout'));
        }
        this.#rejectConnecting = null;
        this.#resolveOnConnected = null;
        this.#cbOnConnected = null;
        this.#timestampStartConnecting = null;
        this.#timestampConnected = null;
        this.#connectionState = CONNECTION_STATE.FAILED
      }
    }

    if (data.hasOwnProperty('ssid')) {
      /** @type {NetworkInfoWithUrcCode} */
      const network_info = this.#conv_json_to_network_info(data);
      if (network_info.ssid === null) {
        this.#onGetStatusJsonForEth(network_info);
      } else {
        this.#onGetStatusJsonForWiFi(network_info);
      }
    }
    if (window.location.hash === '#page-welcome') {
      $('#page-welcome-button-get-started').removeClass('disable-click');
    }
  }

  #checkStatus() {
    this.#checkStatusTimer = null;

    if (Network.isInProgress()) {
      console.log(log_wrap('checkStatus: another network request is in progress, postpone checkStatus'));
      this.#startCheckingStatus(500);
      return;
    }

    let timestamp1 = new Date();
    console.log(log_wrap('GET /status.json: cnt=' + this.#counterStatusJsonTimeout + ', time: ' + timestamp1.toISOString()));

    Network.httpGetJson('/status.json', FETCH_STATUS_JSON_TIMEOUT_MS).then((data) => {
      // console.log(log_wrap(`FetchGwStatus: data: ${JSON.stringify(data)}`))
      console.log(log_wrap('GET /status.json: success: ' + JSON.stringify(data)));
      this.#counterStatusJsonTimeout = 0;
      this.#onGetStatusJson(data);
      if (this.#checkStatusActive) {
        console.log(log_wrap('Start periodic status check'));
        this.#startCheckingStatus(1000);
      }
      return true;
    }).catch((error) => {
      // It's a normal situation after "POST /connect.json", the Gateway will not answer for 5-7 seconds.
      const timestamp2 = new Date();
      console.log(log_wrap(`GET /status.json failure: ${error}, cnt=${this.#counterStatusJsonTimeout}, delta=${timestamp2 - timestamp1}`));

      this.#counterStatusJsonTimeout += 1;
      if (this.#counterStatusJsonTimeout >= 4) {
        this.#overlay_no_gateway_connection.fadeIn();
        GuiLoading.bodyClassLoadingRemove();
        GwAP.stopRefreshingAP();
        this.#stopCheckingStatus();
      } else {
        if (this.#checkStatusActive) {
          let delta_ms = timestamp2 - timestamp1;
          if (delta_ms < 1000) {
            console.log(log_wrap('Start periodic status check'));
            this.#startCheckingStatus(1000 - delta_ms);
          } else {
            console.log(log_wrap('Start periodic status check'));
            this.#startCheckingStatus();
          }
        }
      }
    });
  }
}

export default GwStatus;

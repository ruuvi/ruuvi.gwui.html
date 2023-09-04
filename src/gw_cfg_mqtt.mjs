/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'
import {GwCfgHttpDataFormat, HTTP_DATA_FORMAT} from "./gw_cfg_http.mjs";

export const MQTT_TRANSPORT_TYPE = Object.freeze({
  'TCP': 'TCP',
  'SSL': 'SSL',
  'WS': 'WS',
  'WSS': 'WSS',
})

export const MQTT_DATA_FORMAT = Object.freeze({
  'ruuvi_raw': 'ruuvi_raw',
  'ruuvi_raw_and_decoded': 'ruuvi_raw_and_decoded',
  'ruuvi_decoded': 'ruuvi_decoded',
})

export class GwCfgMqttTransport {
  constructor (val) {
    const allowedValues = Object.values(MQTT_TRANSPORT_TYPE)
    if (allowedValues.includes(val)) {
      this.mqtt_transport = val
    } else {
      throw new Error(`Invalid value for 'mqtt_transport': ${val}. Allowed values are '${allowedValues.join('\', \'')}'.`)
    }
  }

  getVal() {
    return this.mqtt_transport
  }

  isTCP () {
    return this.mqtt_transport === MQTT_TRANSPORT_TYPE.TCP
  }

  setTCP () {
    this.mqtt_transport = MQTT_TRANSPORT_TYPE.TCP
  }

  isSSL () {
    return this.mqtt_transport === MQTT_TRANSPORT_TYPE.SSL
  }

  setSSL () {
    this.mqtt_transport = MQTT_TRANSPORT_TYPE.SSL
  }

  isWS () {
    return this.mqtt_transport === MQTT_TRANSPORT_TYPE.WS
  }

  setWS () {
    this.mqtt_transport = MQTT_TRANSPORT_TYPE.WS
  }

  isWSS () {
    return this.mqtt_transport === MQTT_TRANSPORT_TYPE.WSS
  }

  setWSS () {
    this.mqtt_transport = MQTT_TRANSPORT_TYPE.WSS
  }
}

export class GwCfgMqttDataFormat {
  constructor (val) {
    if (!val) {
      this.mqtt_data_format = MQTT_DATA_FORMAT.ruuvi_raw
      return
    }
    const allowedValues = Object.values(MQTT_DATA_FORMAT)
    if (allowedValues.includes(val)) {
      this.mqtt_data_format = val
    } else {
      throw new Error(`Invalid value for 'mqtt_data_format': ${val}. Allowed values are '${allowedValues.join('\', \'')}'.`)
    }
  }

  getVal() {
    return this.mqtt_data_format
  }

  isRuuviRaw () {
    return this.mqtt_data_format === MQTT_DATA_FORMAT.ruuvi_raw
  }

  isRuuviRawAndDecoded () {
    return this.mqtt_data_format === MQTT_DATA_FORMAT.ruuvi_raw_and_decoded
  }

  isRuuviDecoded () {
    return this.mqtt_data_format === MQTT_DATA_FORMAT.ruuvi_decoded
  }

  setRuuviRaw () {
    this.mqtt_data_format = MQTT_DATA_FORMAT.ruuvi_raw
  }

  setRuuviRawAndDecoded () {
    this.mqtt_data_format = MQTT_DATA_FORMAT.ruuvi_raw_and_decoded
  }

  setRuuviDecoded () {
    this.mqtt_data_format = MQTT_DATA_FORMAT.ruuvi_decoded
  }
}

export class GwCfgMqtt {
  static MQTT_SERVER_DEFAULT = 'test.mosquitto.org'
  static MQTT_PORT_DEFAULT = 1883
  static MQTT_PREFIX_MAX_LENGTH = 256

  use_mqtt = null
  mqtt_disable_retained_messages = null

  /** @type GwCfgMqttTransport */
  mqtt_transport = null

  /** @type GwCfgMqttDataFormat */
  mqtt_data_format = null

  mqtt_server = null
  mqtt_port = null
  mqtt_sending_interval = null
  mqtt_user = null
  mqtt_pass = undefined
  mqtt_prefix = null
  mqtt_client_id = null
  mqtt_use_ssl_client_cert = null
  mqtt_use_ssl_server_cert = null

  parse (data) {
    this.use_mqtt = utils.fetchBoolKeyFromData(data, 'use_mqtt', true)
    this.mqtt_disable_retained_messages = utils.fetchBoolKeyFromData(data, 'mqtt_disable_retained_messages', true)
    this.mqtt_transport = new GwCfgMqttTransport(utils.fetchStringKeyFromData(data, 'mqtt_transport', true))
    this.mqtt_data_format = new GwCfgMqttDataFormat(utils.fetchStringKeyFromData(data, 'mqtt_data_format', false))
    this.mqtt_server = utils.fetchStringKeyFromData(data, 'mqtt_server', true)
    this.mqtt_port = utils.fetchIntKeyFromData(data, 'mqtt_port', true)
    this.mqtt_sending_interval = utils.fetchIntKeyFromData(data, 'mqtt_sending_interval', false, 0)
    this.mqtt_user = utils.fetchStringKeyFromData(data, 'mqtt_user', true)
    this.mqtt_prefix = utils.fetchStringKeyFromData(data, 'mqtt_prefix', true)
    this.mqtt_client_id = utils.fetchStringKeyFromData(data, 'mqtt_client_id', true)
    this.mqtt_use_ssl_client_cert = utils.fetchBoolKeyFromData(data, 'mqtt_use_ssl_client_cert', false, false)
    this.mqtt_use_ssl_server_cert = utils.fetchBoolKeyFromData(data, 'mqtt_use_ssl_server_cert', false, false)
  }

  is_default() {
    return !this.use_mqtt
  }

  set_default() {
    this.use_mqtt = false
    this.mqtt_server = GwCfgMqtt.MQTT_SERVER_DEFAULT
    this.mqtt_port = GwCfgMqtt.MQTT_PORT_DEFAULT
    this.mqtt_sending_interval = 0
    this.mqtt_transport.setTCP()
    this.mqtt_data_format.setRuuviRaw()
    this.mqtt_user = ''
    this.mqtt_pass = ''
    this.mqtt_use_ssl_client_cert = false
    this.mqtt_use_ssl_server_cert = false
  }
}

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

export const MQTT_TRANSPORT_TYPE = Object.freeze({
  'TCP': 'TCP',
  'SSL': 'SSL',
  'WS': 'WS',
  'WSS': 'WSS',
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

export class GwCfgMqtt {
  static MQTT_SERVER_DEFAULT = 'test.mosquitto.org'
  static MQTT_PORT_DEFAULT = 1883
  static MQTT_PREFIX_MAX_LENGTH = 256

  use_mqtt = null
  mqtt_disable_retained_messages = null

  /** @type GwCfgMqttTransport */
  mqtt_transport = null

  mqtt_server = null
  mqtt_port = null
  mqtt_user = null
  mqtt_pass = undefined
  mqtt_prefix = null
  mqtt_client_id = null

  parse (data) {
    this.use_mqtt = utils.fetchBoolKeyFromData(data, 'use_mqtt', true)
    this.mqtt_disable_retained_messages = utils.fetchBoolKeyFromData(data, 'mqtt_disable_retained_messages', true)
    this.mqtt_transport = new GwCfgMqttTransport(utils.fetchStringKeyFromData(data, 'mqtt_transport', true))
    this.mqtt_server = utils.fetchStringKeyFromData(data, 'mqtt_server', true)
    this.mqtt_port = utils.fetchIntKeyFromData(data, 'mqtt_port', true)
    this.mqtt_user = utils.fetchStringKeyFromData(data, 'mqtt_user', true)
    this.mqtt_prefix = utils.fetchStringKeyFromData(data, 'mqtt_prefix', true)
    this.mqtt_client_id = utils.fetchStringKeyFromData(data, 'mqtt_client_id', true)
  }

  is_default() {
    return !this.use_mqtt
  }

  set_default() {
    this.use_mqtt = false
    this.mqtt_server = GwCfgMqtt.MQTT_SERVER_DEFAULT
    this.mqtt_port = GwCfgMqtt.MQTT_PORT_DEFAULT
    this.mqtt_transport.setTCP()
    this.mqtt_user = ''
    this.mqtt_pass = ''
  }
}

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import {GwCfgMqtt, GwCfgMqttDataFormat, GwCfgMqttTransport} from './gw_cfg_mqtt.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgMqtt', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check use_mqtt=false with default params', () => {
    let data = {
      use_mqtt: false,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'test.mosquitto.org',
      mqtt_port: 1883,
      mqtt_user: '',
      mqtt_prefix: 'prefix123',
      mqtt_client_id: 'client123',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.false
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.true
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('test.mosquitto.org')
    expect(mqtt.mqtt_port).to.equal(1883)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix123')
    expect(mqtt.mqtt_client_id).to.equal('client123')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=false with custom params', () => {
    let data = {
      use_mqtt: false,
      mqtt_disable_retained_messages: true,
      mqtt_transport: 'SSL',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'my_server.com',
      mqtt_port: 2883,
      mqtt_user: 'user1',
      mqtt_prefix: 'prefix123',
      mqtt_client_id: 'client123',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.false
    expect(mqtt.mqtt_disable_retained_messages).to.be.true

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.false
    expect(mqtt.mqtt_transport.isSSL()).to.be.true
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2883)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('user1')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix123')
    expect(mqtt.mqtt_client_id).to.equal('client123')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, transport=TCP', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: true,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'my_server.com',
      mqtt_port: 2883,
      mqtt_user: '',
      mqtt_prefix: 'prefix123',
      mqtt_client_id: 'client123',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.true

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.true
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2883)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix123')
    expect(mqtt.mqtt_client_id).to.equal('client123')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, transport=SSL', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'SSL',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'my_server.com',
      mqtt_port: 2884,
      mqtt_user: 'user1',
      mqtt_prefix: 'prefix124',
      mqtt_client_id: 'client124',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.false
    expect(mqtt.mqtt_transport.isSSL()).to.be.true
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2884)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('user1')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix124')
    expect(mqtt.mqtt_client_id).to.equal('client124')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, transport=WS', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'WS',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'my_server.com',
      mqtt_port: 2885,
      mqtt_user: '',
      mqtt_prefix: 'prefix125',
      mqtt_client_id: 'client125',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.false
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.true
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2885)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix125')
    expect(mqtt.mqtt_client_id).to.equal('client125')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, transport=WSS', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'WSS',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'my_server.com',
      mqtt_port: 2886,
      mqtt_user: '',
      mqtt_prefix: 'prefix126',
      mqtt_client_id: 'client126',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.false
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.true

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2886)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix126')
    expect(mqtt.mqtt_client_id).to.equal('client126')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, data_format=raw', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'my_server.com',
      mqtt_port: 2886,
      mqtt_user: '',
      mqtt_prefix: 'prefix126',
      mqtt_client_id: 'client126',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.true
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2886)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix126')
    expect(mqtt.mqtt_client_id).to.equal('client126')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, data_format=decoded', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_decoded',
      mqtt_server: 'my_server.com',
      mqtt_port: 2886,
      mqtt_user: '',
      mqtt_prefix: 'prefix126',
      mqtt_client_id: 'client126',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.true
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.true

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2886)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix126')
    expect(mqtt.mqtt_client_id).to.equal('client126')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, data_format=raw_and_decoded', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw_and_decoded',
      mqtt_server: 'my_server.com',
      mqtt_port: 2886,
      mqtt_user: '',
      mqtt_prefix: 'prefix126',
      mqtt_client_id: 'client126',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.true
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2886)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix126')
    expect(mqtt.mqtt_client_id).to.equal('client126')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_mqtt=true, mqtt_sending_interval=60', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'WSS',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'my_server.com',
      mqtt_port: 2886,
      mqtt_sending_interval: 60,
      mqtt_user: '',
      mqtt_prefix: 'prefix126',
      mqtt_client_id: 'client126',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.false
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.true

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('my_server.com')
    expect(mqtt.mqtt_port).to.equal(2886)
    expect(mqtt.mqtt_sending_interval).to.equal(60)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix126')
    expect(mqtt.mqtt_client_id).to.equal('client126')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check config with missing use_mqtt', () => {
    let data = {}
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'use_mqtt\' key in the data.')
  })

  it('should check config with missing mqtt_disable_retained_messages', () => {
    let data = {
      use_mqtt: true,
    }
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'mqtt_disable_retained_messages\' key in the data.')
  })

  it('should check config with missing mqtt_transport', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
    }
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'mqtt_transport\' key in the data.')
  })

  it('should check config with missing mqtt_data_format', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_server: 'test.mosquitto.org',
      mqtt_port: 1883,
      mqtt_user: '',
      mqtt_prefix: 'prefix123',
      mqtt_client_id: 'client123',
    }
    let mqtt = new GwCfgMqtt()
    mqtt.parse(data)
    expect(mqtt.use_mqtt).to.be.true
    expect(mqtt.mqtt_disable_retained_messages).to.be.false

    expect(mqtt.mqtt_transport).to.be.instanceOf(GwCfgMqttTransport)
    expect(mqtt.mqtt_transport.isTCP()).to.be.true
    expect(mqtt.mqtt_transport.isSSL()).to.be.false
    expect(mqtt.mqtt_transport.isWS()).to.be.false
    expect(mqtt.mqtt_transport.isWSS()).to.be.false

    expect(mqtt.mqtt_data_format).to.be.instanceOf(GwCfgMqttDataFormat)
    expect(mqtt.mqtt_data_format.isRuuviRaw()).to.be.true
    expect(mqtt.mqtt_data_format.isRuuviRawAndDecoded()).to.be.false
    expect(mqtt.mqtt_data_format.isRuuviDecoded()).to.be.false

    expect(mqtt.mqtt_server).to.equal('test.mosquitto.org')
    expect(mqtt.mqtt_port).to.equal(1883)
    expect(mqtt.mqtt_sending_interval).to.equal(0)
    expect(mqtt.mqtt_user).to.equal('')
    expect(mqtt.mqtt_pass).to.be.undefined
    expect(mqtt.mqtt_prefix).to.equal('prefix123')
    expect(mqtt.mqtt_client_id).to.equal('client123')
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check config with missing mqtt_server', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
    }
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'mqtt_server\' key in the data.')
  })

  it('should check config with missing mqtt_port', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'test.mosquitto.org',
    }
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'mqtt_port\' key in the data.')
  })

  it('should check config with missing mqtt_user', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'test.mosquitto.org',
      mqtt_port: 1883,
    }
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'mqtt_user\' key in the data.')
  })

  it('should check config with missing mqtt_prefix', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'test.mosquitto.org',
      mqtt_port: 1883,
      mqtt_user: '',
    }
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'mqtt_prefix\' key in the data.')
  })

  it('should check config with missing mqtt_client_id', () => {
    let data = {
      use_mqtt: true,
      mqtt_disable_retained_messages: false,
      mqtt_transport: 'TCP',
      mqtt_data_format: 'ruuvi_raw',
      mqtt_server: 'test.mosquitto.org',
      mqtt_port: 1883,
      mqtt_user: '',
      mqtt_prefix: 'prefix123',
    }
    let mqtt = new GwCfgMqtt()
    expect(() => mqtt.parse(data)).to.throw(Error, 'Missing \'mqtt_client_id\' key in the data.')
  })
})

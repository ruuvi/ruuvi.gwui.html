/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import chai from 'chai'
import sinon from 'sinon'
import fetchMock from 'fetch-mock'
import logger from './logger.mjs'
import createGwCfg from './gw_cfg.mjs'

const { expect } = chai

describe('GwCfg', () => {
  let sandbox
  let consoleLogStub
  let loggerInfoStub
  let loggerDebugStub
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
    loggerInfoStub = sinon.stub(logger, 'info')
    loggerDebugStub = sinon.stub(logger, 'debug')
  })

  afterEach(() => {
    sandbox.restore()
    logger.info.restore()
    logger.debug.restore()
    fetchMock.restore()
  })

  describe('fetchGwCfg', () => {
    it('should fetch GwCfg with default config', async () => {
      fetchMock.get('/ruuvi.json', {
        status: 200, body: {
          'fw_ver': 'v1.13.1',
          'nrf52_fw_ver': 'v1.0.0',
          'gw_mac': 'AA:BB:CC:DD:EE:FF',
          'wifi_sta_config': {
            'ssid': '',
            'password': ''
          },
          'wifi_ap_config': {
            'password': '',
            'channel': 1
          },
          'use_eth': true,
          'eth_dhcp': true,
          'eth_static_ip': '',
          'eth_netmask': '',
          'eth_gw': '',
          'eth_dns1': '',
          'eth_dns2': '',
          'remote_cfg_use': false,
          'remote_cfg_url': '',
          'remote_cfg_auth_type': 'no',
          'remote_cfg_auth_basic_user': '',
          'remote_cfg_refresh_interval_minutes': 0,
          'use_http_ruuvi': true,
          'use_http': true,
          'http_url': 'https://network.ruuvi.com/record',
          'http_period': 10,
          'http_data_format': 'ruuvi',
          'http_auth': 'none',
          'use_http_stat': true,
          'http_stat_url': 'https://network.ruuvi.com/status',
          'http_stat_user': '',
          'use_mqtt': false,
          'mqtt_disable_retained_messages': false,
          'mqtt_transport': 'TCP',
          'mqtt_data_format': 'ruuvi_raw',
          'mqtt_server': 'test.mosquitto.org',
          'mqtt_port': 1883,
          'mqtt_prefix': '',
          'mqtt_client_id': '',
          'mqtt_user': '',
          'lan_auth_type': 'lan_auth_default',
          'lan_auth_api_key_use': false,
          'lan_auth_api_key_rw_use': false,
          'auto_update_cycle': 'regular',
          'auto_update_weekdays_bitmask': 127,
          'auto_update_interval_from': 0,
          'auto_update_interval_to': 24,
          'auto_update_tz_offset_hours': 3,
          'ntp_use': true,
          'ntp_use_dhcp': false,
          'ntp_server1': 'time.google.com',
          'ntp_server2': 'time.cloudflare.com',
          'ntp_server3': 'pool.ntp.org',
          'ntp_server4': 'time.ruuvi.com',
          'company_use_filtering': true,
          'company_id': 1177,
          'scan_coded_phy': false,
          'scan_1mbit_phy': true,
          'scan_extended_payload': true,
          'scan_channel_37': true,
          'scan_channel_38': true,
          'scan_channel_39': true,
          'scan_filter_allow_listed': false,
          'scan_filter_list': [],
          'coordinates': '',
          'fw_update_url': 'https://network.ruuvi.com/firmwareupdate'
        },
      })

      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()

      // expect(loggerInfoStub.getCalls().map(call => call.args[0])).to.deep.equal([
      //   'FetchGwCfg: response is_ok=true, status=200',
      //   'FetchGwCfg: success',
      // ])
      expect(gw_cfg.info.gw_mac).to.equal('AA:BB:CC:DD:EE:FF')
    })

    it('should fetch GwCfg with unhandled key', async () => {
      fetchMock.get('/ruuvi.json', {
        status: 200, body: {
          'fw_ver': 'v1.13.1',
          'nrf52_fw_ver': 'v1.0.0',
          'gw_mac': 'AA:BB:CC:DD:EE:FF',
          'wifi_sta_config': {
            'ssid': '',
            'password': ''
          },
          'wifi_ap_config': {
            'password': '',
            'channel': 1
          },
          'use_eth': true,
          'eth_dhcp': true,
          'eth_static_ip': '',
          'eth_netmask': '',
          'eth_gw': '',
          'eth_dns1': '',
          'eth_dns2': '',
          'remote_cfg_use': false,
          'remote_cfg_url': '',
          'remote_cfg_auth_type': 'no',
          'remote_cfg_auth_basic_user': '',
          'remote_cfg_refresh_interval_minutes': 0,
          'use_http_ruuvi': false,
          'use_http': true,
          'http_url': 'https://network.ruuvi.com/record',
          'http_period': 15,
          'http_data_format': 'ruuvi',
          'http_auth': 'none',
          'use_http_stat': true,
          'http_stat_url': 'https://network.ruuvi.com/status',
          'http_stat_user': '',
          'use_mqtt': false,
          'mqtt_disable_retained_messages': false,
          'mqtt_transport': 'TCP',
          'mqtt_data_format': 'ruuvi_raw',
          'mqtt_server': 'test.mosquitto.org',
          'mqtt_port': 1883,
          'mqtt_prefix': '',
          'mqtt_client_id': '',
          'mqtt_user': '',
          'lan_auth_type': 'lan_auth_default',
          'lan_auth_api_key_use': false,
          'lan_auth_api_key_rw_use': false,
          'auto_update_cycle': 'regular',
          'auto_update_weekdays_bitmask': 127,
          'auto_update_interval_from': 0,
          'auto_update_interval_to': 24,
          'auto_update_tz_offset_hours': 3,
          'ntp_use': true,
          'ntp_use_dhcp': false,
          'ntp_server1': 'time.google.com',
          'ntp_server2': 'time.cloudflare.com',
          'ntp_server3': 'pool.ntp.org',
          'ntp_server4': 'time.ruuvi.com',
          'company_use_filtering': true,
          'company_id': 1177,
          'scan_coded_phy': false,
          'scan_1mbit_phy': true,
          'scan_extended_payload': true,
          'scan_channel_37': true,
          'scan_channel_38': true,
          'scan_channel_39': true,
          'coordinates': '',
          'scan_filter_allow_listed': false,
          'scan_filter_list': [],
          'key123': '',
        },
      })

      const gw_cfg = createGwCfg()
      try {
        await gw_cfg.fetch()
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect(error.message).to.equal('Unhandled keys in gw_cfg.json: {"key123":""}')
      }

      // expect(loggerInfoStub.getCalls().map(call => call.args[0])).to.deep.equal([
      //   'FetchGwCfg: response is_ok=true, status=200',
      //   'FetchGwCfg: success',
      // ])
    })

  })
})

// noinspection DuplicatedCode

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
  let defaultGwCfgJson
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
    loggerInfoStub = sinon.stub(logger, 'info')
    loggerDebugStub = sinon.stub(logger, 'debug')
    defaultGwCfgJson = {
      'fw_ver': 'v1.13.1',
      'nrf52_fw_ver': 'v1.0.0',
      'gw_mac': 'AA:BB:CC:DD:EE:FF',
      'storage': {
        storage_ready: false,
      },
      'wifi_sta_config': {
        'ssid': '',
      },
      'wifi_ap_config': {
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
      'remote_cfg_auth_type': 'none',
      'remote_cfg_use_ssl_client_cert': false,
      'remote_cfg_use_ssl_server_cert': false,
      'remote_cfg_refresh_interval_minutes': 0,
      'use_http_ruuvi': true,
      'use_http': true,
      'http_url': 'https://network.ruuvi.com/record',
      'http_period': 60,
      'http_data_format': 'ruuvi',
      'http_auth': 'none',
      'use_http_stat': true,
      'http_stat_url': 'https://network.ruuvi.com/status',
      'http_stat_user': '',
      'http_stat_use_ssl_client_cert': false,
      'http_stat_use_ssl_server_cert': false,
      'use_mqtt': false,
      'mqtt_disable_retained_messages': false,
      'mqtt_transport': 'TCP',
      'mqtt_data_format': 'ruuvi_raw',
      'mqtt_server': 'test.mosquitto.org',
      'mqtt_port': 1883,
      'mqtt_sending_interval': 0,
      'mqtt_prefix': 'ruuvi/AA:BB:CC:DD:EE:FF/',
      'mqtt_client_id': 'AA:BB:CC:DD:EE:FF',
      'mqtt_user': '',
      'mqtt_use_ssl_client_cert': false,
      'mqtt_use_ssl_server_cert': false,
      'lan_auth_type': 'lan_auth_default',
      'lan_auth_user': 'Admin',
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
      'company_id': 1177,
      'company_use_filtering': true,
      'scan_coded_phy': false,
      'scan_1mbit_phy': true,
      'scan_2mbit_phy': true,
      'scan_channel_37': true,
      'scan_channel_38': true,
      'scan_channel_39': true,
      'scan_default': true,
      'scan_filter_allow_listed': false,
      'scan_filter_list': [],
      'coordinates': '',
      'fw_update_url': 'https://network.ruuvi.com/firmwareupdate'
    }
  })

  afterEach(() => {
    sandbox.restore()
    logger.info.restore()
    logger.debug.restore()
    fetchMock.restore()
  })

  describe('fetchGwCfg', () => {
    it('should fetch GwCfg with default config', async () => {
      const copyOfDefaultGwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      fetchMock.get('/ruuvi.json', {
        status: 200, body: copyOfDefaultGwCfgJson,
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
      let gwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      gwCfgJson.key123 = ''
      fetchMock.get('/ruuvi.json', {
        status: 200, body: gwCfgJson,
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

  describe('saveGwCfg', () => {
    it('should save GwCfg with default config', async () => {
      const copyOfDefaultGwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      fetchMock.get('/ruuvi.json', {
        status: 200, body: copyOfDefaultGwCfgJson,
      })

      const expectedData = {
          // 'fw_ver': 'v1.13.1',
          // 'nrf52_fw_ver': 'v1.0.0',
          // 'gw_mac': 'AA:BB:CC:DD:EE:FF',
          // 'storage': {
          //   storage_ready: false,
          // },
          // 'wifi_sta_config': {
          //   'ssid': '',
          // },
          // 'wifi_ap_config': {
          //   'channel': 1
          // },
          // 'use_eth': true,
          // 'eth_dhcp': true,
          // 'eth_static_ip': '',
          // 'eth_netmask': '',
          // 'eth_gw': '',
          // 'eth_dns1': '',
          // 'eth_dns2': '',
          'remote_cfg_use': false,
          'remote_cfg_url': '',
          'remote_cfg_auth_type': 'none',
          'remote_cfg_use_ssl_client_cert': false,
          'remote_cfg_use_ssl_server_cert': false,
          'remote_cfg_refresh_interval_minutes': 0,
          'use_http_ruuvi': true,
          // 'use_http': true,
          'use_http': false,
          'http_url': 'https://network.ruuvi.com/record',
          'http_period': 60,
          'http_data_format': 'ruuvi',
          'http_auth': 'none',
          'http_use_ssl_client_cert': false,
          'http_use_ssl_server_cert': false,
          'use_http_stat': true,
          'http_stat_url': 'https://network.ruuvi.com/status',
          'http_stat_user': '',
          'http_stat_use_ssl_client_cert': false,
          'http_stat_use_ssl_server_cert': false,
          'use_mqtt': false,
          'mqtt_disable_retained_messages': false,
          'mqtt_transport': 'TCP',
          'mqtt_data_format': 'ruuvi_raw',
          'mqtt_server': 'test.mosquitto.org',
          'mqtt_port': 1883,
          'mqtt_sending_interval': 0,
          'mqtt_prefix': 'ruuvi/AA:BB:CC:DD:EE:FF/',
          'mqtt_client_id': 'AA:BB:CC:DD:EE:FF',
          'mqtt_user': '',
          'mqtt_use_ssl_client_cert': false,
          'mqtt_use_ssl_server_cert': false,
          'lan_auth_type': 'lan_auth_default',
          'lan_auth_user': 'Admin',
          // 'lan_auth_api_key_use': false,
          // 'lan_auth_api_key_rw_use': false,
          'lan_auth_api_key': '',
          'lan_auth_api_key_rw': '',
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
          'company_id': 1177,
          'company_use_filtering': true,
          // 'scan_coded_phy': false,
          // 'scan_1mbit_phy': true,
          // 'scan_2mbit_phy': true,
          // 'scan_channel_37': true,
          // 'scan_channel_38': true,
          // 'scan_channel_39': true,
          'scan_default': true,
          'scan_filter_allow_listed': false,
          'scan_filter_list': [],
          // 'coordinates': '',
          // 'fw_update_url': 'https://network.ruuvi.com/firmwareupdate'
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepConfig()
      expect(result).to.deep.equal(expectedData)
    })

    it('should save GwCfg with scan_default=false', async () => {
      let gwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      gwCfgJson.scan_default = false
      fetchMock.get('/ruuvi.json', {
        status: 200, body: gwCfgJson,
      })

      const expectedData = {
        // 'fw_ver': 'v1.13.1',
        // 'nrf52_fw_ver': 'v1.0.0',
        // 'gw_mac': 'AA:BB:CC:DD:EE:FF',
        // 'storage': {
        //   storage_ready: false,
        // },
        // 'wifi_sta_config': {
        //   'ssid': '',
        // },
        // 'wifi_ap_config': {
        //   'channel': 1
        // },
        // 'use_eth': true,
        // 'eth_dhcp': true,
        // 'eth_static_ip': '',
        // 'eth_netmask': '',
        // 'eth_gw': '',
        // 'eth_dns1': '',
        // 'eth_dns2': '',
        'remote_cfg_use': false,
        'remote_cfg_url': '',
        'remote_cfg_auth_type': 'none',
        'remote_cfg_use_ssl_client_cert': false,
        'remote_cfg_use_ssl_server_cert': false,
        'remote_cfg_refresh_interval_minutes': 0,
        'use_http_ruuvi': true,
        // 'use_http': true,
        'use_http': false,
        'http_url': 'https://network.ruuvi.com/record',
        'http_period': 60,
        'http_data_format': 'ruuvi',
        'http_auth': 'none',
        'http_use_ssl_client_cert': false,
        'http_use_ssl_server_cert': false,
        'use_http_stat': true,
        'http_stat_url': 'https://network.ruuvi.com/status',
        'http_stat_user': '',
        'http_stat_use_ssl_client_cert': false,
        'http_stat_use_ssl_server_cert': false,
        'use_mqtt': false,
        'mqtt_disable_retained_messages': false,
        'mqtt_transport': 'TCP',
        'mqtt_data_format': 'ruuvi_raw',
        'mqtt_server': 'test.mosquitto.org',
        'mqtt_port': 1883,
        'mqtt_sending_interval': 0,
        'mqtt_prefix': 'ruuvi/AA:BB:CC:DD:EE:FF/',
        'mqtt_client_id': 'AA:BB:CC:DD:EE:FF',
        'mqtt_user': '',
        'mqtt_use_ssl_client_cert': false,
        'mqtt_use_ssl_server_cert': false,
        'lan_auth_type': 'lan_auth_default',
        'lan_auth_user': 'Admin',
        // 'lan_auth_api_key_use': false,
        // 'lan_auth_api_key_rw_use': false,
        'lan_auth_api_key': '',
        'lan_auth_api_key_rw': '',
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
        'company_id': 1177,
        'company_use_filtering': true,
        'scan_coded_phy': false,
        'scan_1mbit_phy': true,
        'scan_2mbit_phy': true,
        'scan_channel_37': true,
        'scan_channel_38': true,
        'scan_channel_39': true,
        'scan_default': false,
        'scan_filter_allow_listed': false,
        'scan_filter_list': [],
        // 'coordinates': '',
        // 'fw_update_url': 'https://network.ruuvi.com/firmwareupdate'
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepConfig()
      expect(result).to.deep.equal(expectedData)
    })

    it('should save GwCfg with non-default http', async () => {
      let gwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      gwCfgJson.http_url = 'https://my_server.com/record'
      gwCfgJson.use_http = true
      fetchMock.get('/ruuvi.json', gwCfgJson)

      const expectedData = {
        // 'fw_ver': 'v1.13.1',
        // 'nrf52_fw_ver': 'v1.0.0',
        // 'gw_mac': 'AA:BB:CC:DD:EE:FF',
        // 'storage': {
        //   storage_ready: false,
        // },
        // 'wifi_sta_config': {
        //   'ssid': '',
        // },
        // 'wifi_ap_config': {
        //   'channel': 1
        // },
        // 'use_eth': true,
        // 'eth_dhcp': true,
        // 'eth_static_ip': '',
        // 'eth_netmask': '',
        // 'eth_gw': '',
        // 'eth_dns1': '',
        // 'eth_dns2': '',
        'remote_cfg_use': false,
        'remote_cfg_url': '',
        'remote_cfg_auth_type': 'none',
        'remote_cfg_use_ssl_client_cert': false,
        'remote_cfg_use_ssl_server_cert': false,
        'remote_cfg_refresh_interval_minutes': 0,
        'use_http_ruuvi': true,
        'use_http': true,
        'http_url': 'https://my_server.com/record',
        'http_period': 60,
        'http_data_format': 'ruuvi',
        'http_auth': 'none',
        'http_use_ssl_client_cert': false,
        'http_use_ssl_server_cert': false,
        'use_http_stat': true,
        'http_stat_url': 'https://network.ruuvi.com/status',
        'http_stat_user': '',
        'http_stat_use_ssl_client_cert': false,
        'http_stat_use_ssl_server_cert': false,
        'use_mqtt': false,
        'mqtt_disable_retained_messages': false,
        'mqtt_transport': 'TCP',
        'mqtt_data_format': 'ruuvi_raw',
        'mqtt_server': 'test.mosquitto.org',
        'mqtt_port': 1883,
        'mqtt_sending_interval': 0,
        'mqtt_prefix': 'ruuvi/AA:BB:CC:DD:EE:FF/',
        'mqtt_client_id': 'AA:BB:CC:DD:EE:FF',
        'mqtt_user': '',
        'mqtt_use_ssl_client_cert': false,
        'mqtt_use_ssl_server_cert': false,
        'lan_auth_type': 'lan_auth_default',
        'lan_auth_user': 'Admin',
        // 'lan_auth_api_key_use': false,
        // 'lan_auth_api_key_rw_use': false,
        'lan_auth_api_key': '',
        'lan_auth_api_key_rw': '',
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
        'company_id': 1177,
        'company_use_filtering': true,
        // 'scan_coded_phy': false,
        // 'scan_1mbit_phy': true,
        // 'scan_2mbit_phy': true,
        // 'scan_channel_37': true,
        // 'scan_channel_38': true,
        // 'scan_channel_39': true,
        'scan_default': true,
        'scan_filter_allow_listed': false,
        'scan_filter_list': [],
        // 'coordinates': '',
        // 'fw_update_url': 'https://network.ruuvi.com/firmwareupdate'
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepConfig()
      expect(result).to.deep.equal(expectedData)
    })
  })

  describe('saveNetworkConfig', () => {
    it('should save NetworkConfig with default config', async () => {
      const copyOfDefaultGwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      fetchMock.get('/ruuvi.json', copyOfDefaultGwCfgJson)

      const expectedData = {
        'use_eth': true,
        'eth_dhcp': true,
        // 'eth_static_ip': '',
        // 'eth_netmask': '',
        // 'eth_gw': '',
        // 'eth_dns1': '',
        // 'eth_dns2': '',
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepNetworkConfig()
      expect(result).to.deep.equal(expectedData)
    })

    it('should save NetworkConfig with use_eth=true, eth_dhcp=false', async () => {
      let gwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      gwCfgJson.use_eth = true
      gwCfgJson.eth_dhcp = false
      gwCfgJson.eth_static_ip = '192.168.1.10'
      gwCfgJson.eth_netmask = '255.255.255.0'
      gwCfgJson.eth_gw = '192.168.1.1'
      gwCfgJson.eth_dns1 = '192.168.1.1'
      gwCfgJson.eth_dns2 = '8.8.8.8'
      fetchMock.get('/ruuvi.json', gwCfgJson)

      const expectedData = {
        'use_eth': true,
        'eth_dhcp': false,
        'eth_static_ip': '192.168.1.10',
        'eth_netmask': '255.255.255.0',
        'eth_gw': '192.168.1.1',
        'eth_dns1': '192.168.1.1',
        'eth_dns2': '8.8.8.8',
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepNetworkConfig()
      expect(result).to.deep.equal(expectedData)
    })

    it('should save NetworkConfig with use_eth=false', async () => {
      let gwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      gwCfgJson.use_eth = false
      fetchMock.get('/ruuvi.json', gwCfgJson)

      const expectedData = {
        'use_eth': false,
        'wifi_ap_config': {
          'channel': 1
        }
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepNetworkConfig()
      expect(result).to.deep.equal(expectedData)
    })
  })

  describe('saveFwUpdateUrl', () => {
    it('should save FwUpdateUrl with default config', async () => {
      const copyOfDefaultGwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      fetchMock.get('/ruuvi.json', copyOfDefaultGwCfgJson)

      const expectedData = {
        'fw_update_url': 'https://network.ruuvi.com/firmwareupdate',
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepFwUpdateUrl()
      expect(result).to.deep.equal(expectedData)
    })

    it('should save FwUpdateUrl with default config', async () => {
      let gwCfgJson = JSON.parse(JSON.stringify(defaultGwCfgJson))
      gwCfgJson.fw_update_url = 'https://my_server.com/firmwareupdate'
      fetchMock.get('/ruuvi.json', gwCfgJson)

      const expectedData = {
        'fw_update_url': 'https://my_server.com/firmwareupdate',
      }
      const gw_cfg = createGwCfg()
      await gw_cfg.fetch()
      const result = await gw_cfg.testPrepFwUpdateUrl()
      expect(result).to.deep.equal(expectedData)
    })
  })

  describe('saveBluetoothScanningConfig', () => {
    it('should save BluetoothScanningConfig, all disabled', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_coded_phy': false,
        'scan_1mbit_phy': false,
        'scan_2mbit_phy': false,
        'scan_channel_37': false,
        'scan_channel_38': false,
        'scan_channel_39': false,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = false
      const scan_1mbit_phy = false
      const scan_2mbit_phy = false
      const scan_channel_37 = false
      const scan_channel_38 = false
      const scan_channel_39 = false
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, filtering enabled', async () => {
      const expectedData = {
        'company_use_filtering': true,
        'company_id': 1101,
        'scan_coded_phy': false,
        'scan_1mbit_phy': false,
        'scan_2mbit_phy': false,
        'scan_channel_37': false,
        'scan_channel_38': false,
        'scan_channel_39': false,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = true
      const company_id = 1101
      const scan_coded_phy = false
      const scan_1mbit_phy = false
      const scan_2mbit_phy = false
      const scan_channel_37 = false
      const scan_channel_38 = false
      const scan_channel_39 = false
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, scan_coded_phy=true', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_coded_phy': true,
        'scan_1mbit_phy': false,
        'scan_2mbit_phy': false,
        'scan_channel_37': false,
        'scan_channel_38': false,
        'scan_channel_39': false,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = true
      const scan_1mbit_phy = false
      const scan_2mbit_phy = false
      const scan_channel_37 = false
      const scan_channel_38 = false
      const scan_channel_39 = false
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, scan_1mbit_phy=true', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_coded_phy': false,
        'scan_1mbit_phy': true,
        'scan_2mbit_phy': false,
        'scan_channel_37': false,
        'scan_channel_38': false,
        'scan_channel_39': false,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = false
      const scan_1mbit_phy = true
      const scan_2mbit_phy = false
      const scan_channel_37 = false
      const scan_channel_38 = false
      const scan_channel_39 = false
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, scan_2mbit_phy=true', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_coded_phy': false,
        'scan_1mbit_phy': false,
        'scan_2mbit_phy': true,
        'scan_channel_37': false,
        'scan_channel_38': false,
        'scan_channel_39': false,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = false
      const scan_1mbit_phy = false
      const scan_2mbit_phy = true
      const scan_channel_37 = false
      const scan_channel_38 = false
      const scan_channel_39 = false
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, scan_channel_37=true', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_coded_phy': false,
        'scan_1mbit_phy': false,
        'scan_2mbit_phy': false,
        'scan_channel_37': true,
        'scan_channel_38': false,
        'scan_channel_39': false,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = false
      const scan_1mbit_phy = false
      const scan_2mbit_phy = false
      const scan_channel_37 = true
      const scan_channel_38 = false
      const scan_channel_39 = false
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, scan_channel_38=true', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_coded_phy': false,
        'scan_1mbit_phy': false,
        'scan_2mbit_phy': false,
        'scan_channel_37': false,
        'scan_channel_38': true,
        'scan_channel_39': false,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = false
      const scan_1mbit_phy = false
      const scan_2mbit_phy = false
      const scan_channel_37 = false
      const scan_channel_38 = true
      const scan_channel_39 = false
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, scan_channel_39=true', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_coded_phy': false,
        'scan_1mbit_phy': false,
        'scan_2mbit_phy': false,
        'scan_channel_37': false,
        'scan_channel_38': false,
        'scan_channel_39': true,
        'scan_default': false,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = false
      const scan_1mbit_phy = false
      const scan_2mbit_phy = false
      const scan_channel_37 = false
      const scan_channel_38 = false
      const scan_channel_39 = true
      const scan_default = false
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })
    it('should save BluetoothScanningConfig, scan_default=true', async () => {
      const expectedData = {
        'company_use_filtering': false,
        'company_id': 1100,
        'scan_default': true,
      }
      const gw_cfg = createGwCfg()
      const company_use_filtering = false
      const company_id = 1100
      const scan_coded_phy = false
      const scan_1mbit_phy = false
      const scan_2mbit_phy = false
      const scan_channel_37 = false
      const scan_channel_38 = false
      const scan_channel_39 = false
      const scan_default = true
      const result = gw_cfg.testPrepBluetoothScanningConfig(
          company_use_filtering,
          company_id,
          scan_coded_phy,
          scan_1mbit_phy,
          scan_2mbit_phy,
          scan_channel_37,
          scan_channel_38,
          scan_channel_39,
          scan_default)
      expect(result).to.deep.equal(expectedData)
    })

  })

})

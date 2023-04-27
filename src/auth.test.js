import chai from 'chai'
import sinon from 'sinon'
import fetchMock from 'fetch-mock'
import createAuth from './auth.mjs'
import logger from './logger.mjs'
import PageAuthMock from './page_auth_mock.mjs'
import AppInfoMock from './app_info_mock.mjs'
import * as crypto from './crypto.mjs'

const { expect } = chai

class WindowLocationMock {
  constructor (cb_assign) {
    this.cb_assign = cb_assign
    this.replace = sinon.stub().callsFake((url) => {
      logger.info(`WindowLocationMock: replace: ${url}`)
    })
    this.assign = sinon.stub().callsFake((url) => {
      logger.info(`WindowLocationMock: assign: ${url}`)
      if (this.cb_assign) {
        this.cb_assign(url)
      }
    })
  }
}

describe('Auth', () => {
  let sandbox
  let consoleLogStub
  let loggerStub
  let mockPageAuth
  let mockAppInfo
  let mockWindowLocation
  let appInfoMocks

  beforeEach(() => {
    mockPageAuth = new PageAuthMock()
    mockAppInfo = new AppInfoMock()
    mockWindowLocation = new WindowLocationMock()
    appInfoMocks = mockAppInfo.getMocks()
    loggerStub = sinon.stub(logger, 'info')
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
    logger.info.restore()
    fetchMock.restore()
  })

  describe('checkAuth', () => {
    it('should handle successful authentication and redirection to page-welcome', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 200,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'Content-Type': 'application/json',
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(true)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=200',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: AuthStatus.OK, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-welcome',
        'WindowLocationMock: replace: #page-welcome',
      ])

      expect(mockPageAuth.on_auth_successful.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.notCalled).to.be.true

      expect(appInfoMocks.setGatewayNameSuffix.calledOnce).to.be.true
      expect(appInfoMocks.setGatewayNameSuffix.calledWith('AABB')).to.be.true
      expect(appInfoMocks.setFirmwareVersions.calledOnce).to.be.true
      expect(appInfoMocks.setFirmwareVersions.calledWith('1.13.0', '1.0.0')).to.be.true

      expect(mockWindowLocation.replace.calledOnce).to.be.true
      sinon.assert.calledWith(mockWindowLocation.replace.getCall(0), '#page-welcome')
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle successful authentication and redirection to page-auth', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 200,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'Content-Type': 'application/json',
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })

      const anchor = '#auth'
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(true)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: #auth',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=200',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: AuthStatus.OK, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-auth',
        'WindowLocationMock: replace: #page-auth',
      ])

      expect(mockPageAuth.on_auth_successful.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.notCalled).to.be.true

      expect(appInfoMocks.setGatewayNameSuffix.calledOnce).to.be.true
      expect(appInfoMocks.setGatewayNameSuffix.calledWith('AABB')).to.be.true
      expect(appInfoMocks.setFirmwareVersions.calledOnce).to.be.true
      expect(appInfoMocks.setFirmwareVersions.calledWith('1.13.0', '1.0.0')).to.be.true

      expect(mockWindowLocation.replace.calledOnce).to.be.true
      sinon.assert.calledWith(mockWindowLocation.replace.getCall(0), '#page-auth')
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle successful authentication but with missing gateway_name', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 200,
        body: {
          // gateway_name: 'RuuviGatewayAABB',
          fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'Content-Type': 'application/json',
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=200',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Invalid auth json - missing key \'gateway_name\', json=\'{"fw_ver":"1.13.0","nrf52_fw_ver":"1.0.0","lan_auth_type":"default"}\'',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Invalid auth json - missing key \'gateway_name\', json=\'{"fw_ver":"1.13.0","nrf52_fw_ver":"1.0.0","lan_auth_type":"default"}\'')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle successful authentication but with missing fw_ver', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 200,
        body: {
          gateway_name: 'RuuviGatewayAABB', // fw_ver: '1.13.0',
          nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'Content-Type': 'application/json',
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=200',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Invalid auth json - missing key \'fw_ver\', json=\'{"gateway_name":"RuuviGatewayAABB","nrf52_fw_ver":"1.0.0","lan_auth_type":"default"}\'',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Invalid auth json - missing key \'fw_ver\', json=\'{"gateway_name":"RuuviGatewayAABB","nrf52_fw_ver":"1.0.0","lan_auth_type":"default"}\'')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle successful authentication but with missing nrf52_fw_ver', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 200,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', // nrf52_fw_ver: '1.0.0',
          lan_auth_type: 'default'
        },
        headers: {
          'Content-Type': 'application/json',
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=200',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Invalid auth json - missing key \'nrf52_fw_ver\', json=\'{"gateway_name":"RuuviGatewayAABB","fw_ver":"1.13.0","lan_auth_type":"default"}\'',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Invalid auth json - missing key \'nrf52_fw_ver\', json=\'{"gateway_name":"RuuviGatewayAABB","fw_ver":"1.13.0","lan_auth_type":"default"}\'')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle successful authentication but with missing lan_auth_type', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 200,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', // lan_auth_type: 'default'
        },
        headers: {
          'Content-Type': 'application/json',
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=200',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Invalid auth json - missing key \'lan_auth_type\', json=\'{"gateway_name":"RuuviGatewayAABB","fw_ver":"1.13.0","nrf52_fw_ver":"1.0.0"}\'',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Invalid auth json - missing key \'lan_auth_type\', json=\'{"gateway_name":"RuuviGatewayAABB","fw_ver":"1.13.0","nrf52_fw_ver":"1.0.0"}\'')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle an invalid json response', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 200,
        body: 'This is not a json',
        headers: {
          'Content-Type': 'application/json',
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: fetch_json: JSON.parse failed: SyntaxError: Unexpected token \'T\', "This is not a json" is not valid JSON',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'fetch_json: JSON.parse failed: SyntaxError: Unexpected token \'T\', "This is not a json" is not valid JSON')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle a server error', async () => {
      const ecdhInstanceCli = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 500
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Response HTTP status=500, statusText=Internal Server Error, content-type=null',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Response HTTP status=500, statusText=Internal Server Error, content-type=null')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle a server error with a message in json', async () => {
      const ecdhInstanceCli = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 500, body: {
          message: 'Low memory'
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Response HTTP status=500, statusText=Internal Server Error, message="Low memory"',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Response HTTP status=500, statusText=Internal Server Error, message="Low memory"')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle a server error with a json', async () => {
      const ecdhInstanceCli = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 500, body: {
          field123: 'some data'
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Response HTTP status=500, statusText=Internal Server Error, json=\'{"field123":"some data"}\'',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Response HTTP status=500, statusText=Internal Server Error, json=\'{"field123":"some data"}\'')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle a server error with a text', async () => {
      const ecdhInstanceCli = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 500, body: 'some text'
      })

      const anchor = null
      const ecdhInstance = new crypto.ECDH()
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: Response HTTP status=500, statusText=Internal Server Error, content-type=text/plain;charset=UTF-8, message=\'some text\'',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Response HTTP status=500, statusText=Internal Server Error, content-type=text/plain;charset=UTF-8, message=\'some text\'')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle a "connection reset by peer" error', async () => {
      const ecdhInstanceCli = new crypto.ECDH()

      fetchMock.get('/auth', () => {
        throw new TypeError('Failed to fetch: connection reset by peer')
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)

      let result
      try {
        result = await auth.waitAuth()
      } catch (error) {
        expect(error).to.be.instanceOf(TypeError)
        expect(error.message).to.equal('Failed to fetch: connection reset by peer')
      }
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'CheckAuth: exception: TypeError: Failed to fetch: connection reset by peer',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'Failed to fetch: connection reset by peer')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle unauthorized and then perform login', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      const gateway_name = 'RuuviGatewayAABB'
      const challenge = '12341234'
      const user = 'user1'
      const password = 'pass1'
      const password_sha256 = crypto.SHA256(challenge + ':' + crypto.MD5(user + ':' + gateway_name + ':' + password).toString()).toString()

      fetchMock.getOnce('/auth', {
        status: 401,
        body: {
          gateway_name: gateway_name, fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'WWW-Authenticate': `x-ruuvi-interactive realm="${gateway_name}" challenge="${challenge}" session_cookie="COOKIE_RUUVISESSION" session_id="session_id"`,
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64')
        },
      })
      fetchMock.postOnce('/auth', {
        status: 200,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64')
        },
      })

      mockWindowLocation = new WindowLocationMock(function (url) {
        if (url === '#page-auth' && mockPageAuth.on_auth_unauthorized.calledOnce) {
          mockPageAuth.simulateClickButtonLogIn(user, password)
        }
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(true)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=401',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: AuthStatus.Unauthorized, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-auth',
        'WindowLocationMock: assign: null',
        'WindowLocationMock: assign: #page-auth',
        `Login: user=${user}, password_sha256=${password_sha256}`,
        'FetchAuth: success',
        'CheckAuth: AuthStatus.OK, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-welcome',
        'WindowLocationMock: replace: #page-welcome',
      ])

      const [url, request] = fetchMock.lastCall('/auth', 'POST')

      expect(request.headers).to.deep.equal({
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json; charset=utf-8',
      })

      const requestBody = JSON.parse(request.body)
      expect(requestBody).to.deep.equal({
        'login': user, 'password': password_sha256
      })

      expect(mockPageAuth.on_auth_successful.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.notCalled).to.be.true
      expect(mockPageAuth.on_auth_successful.calledAfter(mockPageAuth.on_auth_unauthorized)).to.be.true

      expect(appInfoMocks.setGatewayNameSuffix.callCount).to.equal(2)
      expect(appInfoMocks.setGatewayNameSuffix.calledWith('AABB')).to.be.true
      expect(appInfoMocks.setFirmwareVersions.callCount).to.equal(2)
      expect(appInfoMocks.setFirmwareVersions.calledWith('1.13.0', '1.0.0')).to.be.true

      expect(mockWindowLocation.replace.calledOnce).to.be.true
      expect(mockWindowLocation.assign.callCount).to.equal(2)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(0), null)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(1), '#page-auth')

      expect(mockWindowLocation.replace.calledBefore(mockWindowLocation.assign.getCall(0))).to.be.true
    })

    it('should handle unauthorized and then try to login with incorrect password', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      const gateway_name = 'RuuviGatewayAABB'
      const challenge = '12341234'
      const user = 'user1'
      const password1 = 'pass2'
      const password2 = 'pass1'
      const password_sha256_1 = crypto.SHA256(challenge + ':' + crypto.MD5(user + ':' + gateway_name + ':' + password1).toString()).toString()
      const password_sha256_2 = crypto.SHA256(challenge + ':' + crypto.MD5(user + ':' + gateway_name + ':' + password2).toString()).toString()

      fetchMock.getOnce('/auth', {
        status: 401,
        body: {
          gateway_name: gateway_name, fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'WWW-Authenticate': `x-ruuvi-interactive realm="${gateway_name}" challenge="${challenge}" session_cookie="COOKIE_RUUVISESSION" session_id="session_id"`,
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64')
        },
      })
      fetchMock.post('/auth', {
        status: 401,
        body: {
          gateway_name: 'RuuviGatewayAABB',
          fw_ver: '1.13.0',
          nrf52_fw_ver: '1.0.0',
          lan_auth_type: 'default',
          message: 'Incorrect username or password'
        },
        headers: {
          'WWW-Authenticate': `x-ruuvi-interactive realm="${gateway_name}" challenge="${challenge}" session_cookie="COOKIE_RUUVISESSION" session_id="session_id"`,
        },
      }, { repeat: 1 })
      fetchMock.post('/auth', {
        status: 200, body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64')
        },
      }, { repeat: 1, overwriteRoutes: false })

      mockWindowLocation = new WindowLocationMock(function (url) {
        if (url === '#page-auth') {
          if (mockPageAuth.on_auth_unauthorized.callCount === 1) {
            mockPageAuth.simulateClickButtonLogIn(user, password1)
          } else if (mockPageAuth.on_auth_unauthorized.callCount === 2) {
            mockPageAuth.simulateClickButtonLogIn(user, password2)
          } else {
            throw Error()
          }
        }
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(true)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=401',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: AuthStatus.Unauthorized, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-auth',
        'WindowLocationMock: assign: null',
        'WindowLocationMock: assign: #page-auth',
        `Login: user=${user}, password_sha256=${password_sha256_1}`,
        'FetchAuth: success',
        'CheckAuth: AuthStatus.Unauthorized, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-auth',
        'WindowLocationMock: assign: null',
        'WindowLocationMock: assign: #page-auth',
        `Login: user=${user}, password_sha256=${password_sha256_2}`,
        'FetchAuth: success',
        'CheckAuth: AuthStatus.OK, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-welcome',
        'WindowLocationMock: replace: #page-welcome',
      ])

      const [url1, request1] = fetchMock.calls('/auth', 'POST')[0]

      expect(request1.headers).to.deep.equal({
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json; charset=utf-8',
      })

      const request1Body = JSON.parse(request1.body)
      expect(request1Body).to.deep.equal({
        'login': user, 'password': password_sha256_1
      })

      const [url2, request2] = fetchMock.calls('/auth', 'POST')[1]

      expect(request2.headers).to.deep.equal({
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json; charset=utf-8',
      })

      const request2Body = JSON.parse(request2.body)
      expect(request2Body).to.deep.equal({
        'login': user, 'password': password_sha256_2
      })

      expect(mockPageAuth.on_auth_successful.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.callCount).to.equal(2)
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true

      expect(appInfoMocks.setGatewayNameSuffix.callCount).to.equal(3)
      expect(appInfoMocks.setGatewayNameSuffix.calledWith('AABB')).to.be.true
      expect(appInfoMocks.setFirmwareVersions.callCount).to.equal(3)
      expect(appInfoMocks.setFirmwareVersions.calledWith('1.13.0', '1.0.0')).to.be.true

      expect(mockWindowLocation.replace.calledOnce).to.be.true
      sinon.assert.calledWith(mockWindowLocation.assign, '#page-auth')
      expect(mockWindowLocation.assign.callCount).to.equal(4)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(0), null)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(1), '#page-auth')
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(2), null)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(3), '#page-auth')

      expect(mockWindowLocation.replace.calledBefore(mockWindowLocation.assign.getCall(0))).to.be.true
    })

    it('should handle failed authentication without WWW-Authenticate header', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 401,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
        headers: {
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64')
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=401',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: exception: Error: There is no "WWW-Authenticate" key in HTTP response header',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.notCalled).to.be.true
      expect(mockPageAuth.show_error_message.calledOnce).to.be.true
      sinon.assert.calledWith(mockPageAuth.show_error_message, 'There is no "WWW-Authenticate" key in HTTP response header')

      expect(appInfoMocks.setGatewayNameSuffix.notCalled).to.be.true
      expect(appInfoMocks.setFirmwareVersions.notCalled).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle forbidden', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      fetchMock.get('/auth', {
        status: 403,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'lan_auth_deny'
        },
        headers: {
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64')
        },
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(false)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=403',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: AuthStatus.Forbidden, lan_auth_type=lan_auth_deny, gatewayName=RuuviGatewayAABB',
      ])

      expect(mockPageAuth.on_auth_successful.notCalled).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.notCalled).to.be.true
      expect(mockPageAuth.on_auth_forbidden.calledOnce).to.be.true
      expect(mockPageAuth.show_error_message.notCalled).to.be.true

      expect(appInfoMocks.setGatewayNameSuffix.calledOnce).to.be.true
      expect(appInfoMocks.setGatewayNameSuffix.calledWith('AABB')).to.be.true
      expect(appInfoMocks.setFirmwareVersions.calledOnce).to.be.true
      expect(appInfoMocks.setFirmwareVersions.calledWith('1.13.0', '1.0.0')).to.be.true

      expect(mockWindowLocation.replace.notCalled).to.be.true
      expect(mockWindowLocation.assign.notCalled).to.be.true
    })

    it('should handle unauthorized and then try to login, but forbidden', async () => {
      const ecdhInstanceCli = new crypto.ECDH()
      const ecdhInstanceSrv = new crypto.ECDH()

      const gateway_name = 'RuuviGatewayAABB'
      const challenge = '12341234'
      const user = 'user1'
      const password = 'pass1'
      const password_sha256 = crypto.SHA256(challenge + ':' + crypto.MD5(user + ':' + gateway_name + ':' + password).toString()).toString()
      const user2 = 'user2'
      const password2 = 'pass2'
      const password2_sha256 = crypto.SHA256(challenge + ':' + crypto.MD5(user2 + ':' + gateway_name + ':' + password2).toString()).toString()

      fetchMock.getOnce('/auth', {
        status: 401,
        body: {
          gateway_name: gateway_name, fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'ruuvi'
        },
        headers: {
          'WWW-Authenticate': `x-ruuvi-interactive realm="${gateway_name}" challenge="${challenge}" session_cookie="COOKIE_RUUVISESSION" session_id="session_id"`,
          'ruuvi_ecdh_pub_key': ecdhInstanceSrv.getPublicKey('base64'),
        },
      })
      fetchMock.post('/auth', {
        status: 403,
        body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'ruuvi',
        },
        headers: {
          'WWW-Authenticate': `x-ruuvi-interactive realm="${gateway_name}" challenge="${challenge}" session_cookie="COOKIE_RUUVISESSION" session_id="session_id"`,
        },
      }, { repeat: 1 })
      fetchMock.post('/auth', {
        status: 200, body: {
          gateway_name: 'RuuviGatewayAABB', fw_ver: '1.13.0', nrf52_fw_ver: '1.0.0', lan_auth_type: 'default'
        },
      }, { repeat: 1, overwriteRoutes: false })

      mockWindowLocation = new WindowLocationMock(function (url) {
        if (url === '#page-auth') {
          if (mockPageAuth.auth_status === 'auth_unauthorized') {
            mockPageAuth.simulateClickButtonLogIn(user, password)
          } else if (mockPageAuth.auth_status === 'auth_forbidden') {
            mockPageAuth.simulateClickButtonLogIn(user2, password2)
          } else {
            throw Error()
          }
        }
      })

      const anchor = null
      const auth = createAuth(anchor, mockPageAuth, mockAppInfo, mockWindowLocation, ecdhInstanceCli)
      const result = await auth.waitAuth()
      expect(result).to.equal(true)

      expect(loggerStub.getCalls().map(call => call.args[0])).to.deep.equal([
        'Auth: anchor: null',
        `ECDH PubKey(Cli): ${ecdhInstanceCli.getPublicKey('base64')}`,
        'FetchAuth: success, status=401',
        `ECDH PubKey(Srv): ${ecdhInstanceSrv.getPublicKey('base64')}`,
        'CheckAuth: AuthStatus.Unauthorized, lan_auth_type=ruuvi, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-auth',
        'WindowLocationMock: assign: null',
        'WindowLocationMock: assign: #page-auth',
        `Login: user=${user}, password_sha256=${password_sha256}`,
        'FetchAuth: success',
        'CheckAuth: AuthStatus.Forbidden, lan_auth_type=ruuvi, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-auth',
        'WindowLocationMock: assign: null',
        'WindowLocationMock: assign: #page-auth',
        `Login: user=${user2}, password_sha256=${password2_sha256}`,
        'FetchAuth: success',
        'CheckAuth: AuthStatus.OK, lan_auth_type=default, gatewayName=RuuviGatewayAABB',
        'CheckAuth: Open: page-welcome',
        'WindowLocationMock: replace: #page-welcome',
      ])

      const [url, request] = fetchMock.lastCall('/auth', 'POST')

      expect(request.headers).to.deep.equal({
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json; charset=utf-8',
      })

      const requestBody = JSON.parse(request.body)
      expect(requestBody).to.deep.equal({
        'login': user2, 'password': password2_sha256
      })

      expect(mockPageAuth.on_auth_successful.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_unauthorized.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_forbidden.calledOnce).to.be.true
      expect(mockPageAuth.on_auth_forbidden.calledWith(false)).to.be.true
      expect(mockPageAuth.show_error_message.notCalled).to.be.true

      expect(appInfoMocks.setGatewayNameSuffix.callCount).to.equal(3)
      expect(appInfoMocks.setGatewayNameSuffix.calledWith('AABB')).to.be.true
      expect(appInfoMocks.setFirmwareVersions.callCount).to.equal(3)
      expect(appInfoMocks.setFirmwareVersions.calledWith('1.13.0', '1.0.0')).to.be.true

      expect(mockWindowLocation.assign.callCount).to.equal(4)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(0), null)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(1), '#page-auth')
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(2), null)
      sinon.assert.calledWith(mockWindowLocation.assign.getCall(3), '#page-auth')
      expect(mockWindowLocation.replace.calledOnce).to.be.true
      sinon.assert.calledWith(mockWindowLocation.replace, '#page-welcome')

      expect(mockWindowLocation.assign.getCall(3).calledBefore(mockWindowLocation.replace.getCall(0))).to.be.true
    })

  })
})

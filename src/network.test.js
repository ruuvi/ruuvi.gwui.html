/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import chai from 'chai'
import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import fetchMock from 'fetch-mock'
import Network from './network.mjs'

chai.use(chaiAsPromised)
chai.should()
const { expect } = chai

describe('Network', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    fetchMock.reset()
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('fetchWithTimeout', () => {
    it('should resolve when the fetch is successful', async () => {
      fetchMock.mock('http://example.com', { status: 200, body: 'response_body' })

      const response = await Network.fetchWithTimeout('http://example.com', {}, 1000)
      expect(Network.isInProgress()).to.be.true
      const text = await response.text()
      expect(Network.isInProgress()).to.be.true
      Network.fetchWithTimeoutReset()
      expect(Network.isInProgress()).to.be.false

      expect(response.status).to.equal(200)
      expect(text).to.equal('response_body')
    })

    it('should resolve when the fetch is unsuccessful with status 401', async () => {
      fetchMock.mock('http://example.com', { status: 401, body: 'response_body' })

      const response = await Network.fetchWithTimeout('http://example.com', {}, 1000)
      const text = await response.text()
      Network.fetchWithTimeoutReset()

      expect(response.status).to.equal(401)
      expect(text).to.equal('response_body')
    })

    it('should resolve when the fetch is unsuccessful with status 500 and without body', async () => {
      fetchMock.mock('http://example.com', { status: 500 })

      const response = await Network.fetchWithTimeout('http://example.com', {}, 1000)
      const text = await response.text()
      Network.fetchWithTimeoutReset()

      expect(response.status).to.equal(500)
      expect(text).to.equal('')
    })

    it('should reject when the request takes longer than the specified timeout', async () => {
      // Mock the fetch request to delay the response for 1000ms (longer than the timeout 500 ms)
      fetchMock.mock('http://example.com', () => new Promise((resolve) => setTimeout(() => resolve({
        status: 200,
        body: 'OK'
      }), 1000)))

      const promise = Network.fetchWithTimeout('http://example.com', {}, 500)

      await promise.should.be.rejectedWith('Request timed out after 500ms')
      expect(Network.isInProgress()).to.be.false
    })

    it('should reject when the connection is reset by peer', async () => {
      fetchMock.mock('http://example.com', { throws: new Error('ECONNRESET: Connection reset by peer') })

      const promise = Network.fetchWithTimeout('http://example.com', {}, 1000)

      await promise.should.be.rejectedWith('ECONNRESET: Connection reset by peer')
      expect(Network.isInProgress()).to.be.false
    })
  })

  describe('fetch_json', () => {
    it('should return json data when the response status 200', async () => {
      const mockData = { key: 'value' }
      fetchMock.mock('http://example.com', {
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await Network.fetch_json('GET', 'http://example.com', 500)
      expect(Network.isInProgress()).to.be.false
      expect(data).to.deep.equal(mockData)
      expect(Network.getResponse().status).to.equal(200)
    })

    it('should reject when the response status 200, but content-type header is not json', async () => {
      const mockData = { key: 'value' }
      fetchMock.mock('http://example.com', {
        status: 200,
        body: JSON.stringify(mockData),
      })

      const promise = Network.fetch_json('GET', 'http://example.com', 500)
      await promise.should.be.rejectedWith('Response HTTP status=200, statusText=OK, content-type=text/plain;charset=UTF-8, message=\'{"key":"value"}\'')
      expect(Network.isInProgress()).to.be.false
      expect(Network.getResponse().status).to.equal(200)
    })

    it('should reject when the response status 200, but json is invalid', async () => {
      const invalidJsonBody = 'invalid_json_1234'
      fetchMock.mock('http://example.com', {
        status: 200,
        body: invalidJsonBody,
        headers: { 'Content-Type': 'application/json' },
      })

      const promise = Network.fetch_json('GET', 'http://example.com', 500)
      await promise.should.be.rejectedWith('fetch_json: JSON.parse failed: SyntaxError: \'invalid_json_1234\' is not valid JSON')

      expect(Network.isInProgress()).to.be.false
      expect(Network.getResponse().status).to.equal(200)
    })

    it('should reject when the response status 401 and it is not in the allowed list', async () => {
      const mockData = { key: 'value' }
      fetchMock.mock('http://example.com', {
        status: 401,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      })

      const promise = Network.fetch_json('GET', 'http://example.com', 500)
      await promise.should.be.rejectedWith('Response HTTP status=401, statusText=Unauthorized, json=\'{"key":"value"}\'')
      expect(Network.isInProgress()).to.be.false
      expect(Network.getResponse().status).to.equal(401)
    })

    it('should reject when the response status 401 and it is not in the allowed list, get err message from json', async () => {
      const mockData = { key: 'value', message: 'my_err123' }
      fetchMock.mock('http://example.com', {
        status: 401,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      })

      const promise = Network.fetch_json('GET', 'http://example.com', 500)
      await promise.should.be.rejectedWith('Response HTTP status=401, statusText=Unauthorized, message="my_err123"')
      expect(Network.isInProgress()).to.be.false
      expect(Network.getResponse().status).to.equal(401)
    })

    it('should return json data when the response status 401 and it is in the allowed list', async () => {
      const mockData = { key: 'value' }
      fetchMock.mock('http://example.com', {
        status: 401,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await Network.fetch_json('GET', 'http://example.com', 500, null, { list_of_allowed_statuses: [200, 401] })
      expect(Network.isInProgress()).to.be.false
      expect(data).to.deep.equal(mockData)
      expect(Network.getResponse().status).to.equal(401)
    })

    it('should reject when the response status 400, body is not json', async () => {
      fetchMock.mock('http://example.com', {
        status: 400,
        body: 'text error desc',
      })

      const promise = Network.fetch_json('GET', 'http://example.com', 500)
      await promise.should.be.rejectedWith('Response HTTP status=400, statusText=Bad Request, content-type=text/plain;charset=UTF-8, message=\'text error desc\'')
      expect(Network.isInProgress()).to.be.false
    })

    it('should send extra headers when provided', async () => {
      const mockData = { key: 'value' }
      fetchMock.mock('http://example.com', {
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      })

      const extraHeaders = { 'X-Custom-Header': 'custom-value' }
      await Network.fetch_json('GET', 'http://example.com', 600, null, { extra_headers: extraHeaders })
      expect(Network.isInProgress()).to.be.false

      const [, options] = fetchMock.lastCall()
      expect(options.headers).to.include(extraHeaders)
    })

    it('should send JSON data in the request body when provided', async () => {
      const mockData = { key: 'value' }
      fetchMock.mock('http://example.com', {
        status: 200,
        body: JSON.stringify(mockData),
        headers: { 'Content-Type': 'application/json' },
      })

      const jsonData = { key: 'value' }
      await Network.fetch_json('POST', 'http://example.com', 600, JSON.stringify(jsonData))
      expect(Network.isInProgress()).to.be.false

      const [, options] = fetchMock.lastCall()
      expect(options.body).to.equal(JSON.stringify(jsonData))
      expect(options.headers).to.include({ 'Content-Type': 'application/json; charset=utf-8' })
    })

    it('should reject when the request takes longer than the specified timeout', async () => {
      // Mock the fetch request to delay the response for 1000ms (longer than the timeout)
      const mockData = { key: 'value' }
      fetchMock.mock('http://example.com',
          () => new Promise(
              (resolve) => setTimeout(
                  () => resolve({
                    status: 200,
                    body: JSON.stringify(mockData),
                    headers: { 'Content-Type': 'application/json' }
                  }), 10000)))

      const promise = Network.fetch_json('GET', 'http://example.com', 600)

      await expect(promise).to.be.rejectedWith(`Request timed out after 600ms`)
      expect(Network.isInProgress()).to.be.false
    })

    it('should reject when the fetch throws an error', async () => {
      fetchMock.mock('http://example.com', { throws: new Error('Fetch error') })

      const promise = Network.fetch_json('GET', 'http://example.com', 600)

      await expect(promise).to.be.rejectedWith('Fetch error')
      expect(Network.isInProgress()).to.be.false
    })
  })

})

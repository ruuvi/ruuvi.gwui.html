import { GwCfgHttp } from './gw_cfg_http.mjs'
import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('GwCfgHttp', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should check use_http=false', () => {
    let data = {
      use_http: false,
    }
    let cfg_http = new GwCfgHttp()
    cfg_http.parse(data)
    expect(cfg_http.use_http).to.be.false
    expect(cfg_http.http_url).to.equal('')
    expect(cfg_http.http_user).to.equal('')
    expect(cfg_http.http_pass).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_http=true with default params', () => {
    let data = {
      use_http: true,
      http_url: 'https://network.ruuvi.com/record',
      http_user: '',
    }
    let cfg_http = new GwCfgHttp()
    cfg_http.parse(data)
    expect(cfg_http.use_http).to.be.true
    expect(cfg_http.http_url).to.equal('https://network.ruuvi.com/record')
    expect(cfg_http.http_user).to.equal('')
    expect(cfg_http.http_pass).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check use_http=true with custom params', () => {
    let data = {
      use_http: true,
      http_url: 'https://myserver.com:8080/record',
      http_user: 'user1',
    }
    let cfg_http = new GwCfgHttp()
    cfg_http.parse(data)
    expect(cfg_http.use_http).to.be.true
    expect(cfg_http.http_url).to.equal('https://myserver.com:8080/record')
    expect(cfg_http.http_user).to.equal('user1')
    expect(cfg_http.http_pass).to.be.undefined
    expect(Object.keys(data).length).to.equal(0)
  })

  it('should check missing use_http', () => {
    let data = {
      http_url: 'https://myserver.com:8080/record',
      http_user: '',
    }
    let cfg_http = new GwCfgHttp()
    expect(() => cfg_http.parse(data)).to.throw(Error, 'Missing \'use_http\' key in the data.')
  })
})

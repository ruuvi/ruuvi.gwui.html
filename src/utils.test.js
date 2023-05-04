/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as utils from './utils.mjs'

import chai from 'chai'
import sinon from 'sinon'

const { expect } = chai

describe('Utils', () => {
  let sandbox
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('Utils.fetchBoolKeyFromData', () => {
    it('should check fetchBoolKeyFromData with valid data', () => {
      let data = {
        key1: false,
        key2: true,
      }
      expect(Object.keys(data).length).to.equal(2)

      {
        const res = utils.fetchBoolKeyFromData(data, 'key1', true)
        expect(res).to.equal(false)
        expect(Object.keys(data).length).to.equal(1)
      }

      {
        const res = utils.fetchBoolKeyFromData(data, 'key2', false)
        expect(res).to.equal(true)
        expect(Object.keys(data).length).to.equal(0)
      }

      {
        const res = utils.fetchBoolKeyFromData(data, 'key3', false)
        expect(res).to.equal(null)
      }

      {
        const res = utils.fetchBoolKeyFromData(data, 'key3')
        expect(res).to.equal(null)
      }

      {
        const res = utils.fetchBoolKeyFromData(data, 'key3', false, false)
        expect(res).to.equal(false)
      }

      expect(() => utils.fetchBoolKeyFromData(data, 'key3', false, 0)).to.throw(Error,
          'Value of defaultVal \'0\' must be a boolean.')
      expect(() => utils.fetchBoolKeyFromData(data, 'key3', false, '')).to.throw(Error,
          'Value of defaultVal \'\' must be a boolean.')
      expect(() => utils.fetchBoolKeyFromData(data, 'key3', false, {})).to.throw(Error,
          'Value of defaultVal \'[object Object]\' must be a boolean.')
    })

    it('should check fetchBoolKeyFromData with invalid data', () => {
      let data = {
        key1: 'false',
        key2: 0,
        key3: {},
      }

      expect(() => utils.fetchBoolKeyFromData(data, 'key_x', true)).to.throw(Error,
          'Missing \'key_x\' key in the data.')

      expect(() => utils.fetchBoolKeyFromData(data, 'key1', false)).to.throw(Error,
          'Value of \'key1\' must be a boolean.')

      expect(() => utils.fetchBoolKeyFromData(data, 'key2', false)).to.throw(Error,
          'Value of \'key2\' must be a boolean.')

      expect(() => utils.fetchBoolKeyFromData(data, 'key3', false)).to.throw(Error,
          'Value of \'key3\' must be a boolean.')
    })
  })

  describe('Utils.fetchIntKeyFromData', () => {
    it('should check fetchIntKeyFromData with valid data', () => {
      let data = {
        key1: 0,
        key2: 2,
      }
      expect(Object.keys(data).length).to.equal(2)

      {
        const res = utils.fetchIntKeyFromData(data, 'key1', true)
        expect(res).to.equal(0)
        expect(Object.keys(data).length).to.equal(1)
      }

      {
        const res = utils.fetchIntKeyFromData(data, 'key2', false)
        expect(res).to.equal(2)
        expect(Object.keys(data).length).to.equal(0)
      }

      {
        const res = utils.fetchIntKeyFromData(data, 'key3', false)
        expect(res).to.equal(null)
      }

      {
        const res = utils.fetchIntKeyFromData(data, 'key3')
        expect(res).to.equal(null)
      }

      {
        const res = utils.fetchIntKeyFromData(data, 'key3', false, 1)
        expect(res).to.equal(1)
      }

      expect(() => utils.fetchIntKeyFromData(data, 'key3', false, false)).to.throw(Error,
          'Value of defaultVal \'false\' must be a integer.')
      expect(() => utils.fetchIntKeyFromData(data, 'key3', false, '')).to.throw(Error,
          'Value of defaultVal \'\' must be a integer.')
      expect(() => utils.fetchIntKeyFromData(data, 'key3', false, {})).to.throw(Error,
          'Value of defaultVal \'[object Object]\' must be a integer.')
    })

    it('should check fetchIntKeyFromData with invalid data', () => {
      let data = {
        key1: false,
        key2: '0',
        key3: {},
      }

      expect(() => utils.fetchIntKeyFromData(data, 'key_x', true)).to.throw(Error,
          'Missing \'key_x\' key in the data.')

      expect(() => utils.fetchIntKeyFromData(data, 'key1', false)).to.throw(Error,
          'Value of \'key1\' must be a integer.')

      expect(() => utils.fetchIntKeyFromData(data, 'key2', false)).to.throw(Error,
          'Value of \'key2\' must be a integer.')

      expect(() => utils.fetchIntKeyFromData(data, 'key3', false)).to.throw(Error,
          'Value of \'key3\' must be a integer.')
    })
  })

  describe('Utils.fetchStringKeyFromData', () => {
    it('should check fetchStringKeyFromData with valid data', () => {
      let data = {
        key1: '0',
        key2: 'test',
      }
      expect(Object.keys(data).length).to.equal(2)

      {
        const res = utils.fetchStringKeyFromData(data, 'key1', true)
        expect(res).to.equal('0')
        expect(Object.keys(data).length).to.equal(1)
      }

      {
        const res = utils.fetchStringKeyFromData(data, 'key2', false)
        expect(res).to.equal('test')
        expect(Object.keys(data).length).to.equal(0)
      }

      {
        const res = utils.fetchStringKeyFromData(data, 'key3', false)
        expect(res).to.equal(null)
      }

      {
        const res = utils.fetchStringKeyFromData(data, 'key3')
        expect(res).to.equal(null)
      }
      {
        const res = utils.fetchStringKeyFromData(data, 'key3', false, 'qqq')
        expect(res).to.equal('qqq')
      }

      expect(() => utils.fetchStringKeyFromData(data, 'key3', false, false)).to.throw(Error,
          'Value of defaultVal \'false\' must be a string.')
      expect(() => utils.fetchStringKeyFromData(data, 'key3', false, 123)).to.throw(Error,
          'Value of defaultVal \'123\' must be a string.')
      expect(() => utils.fetchStringKeyFromData(data, 'key3', false, {})).to.throw(Error,
          'Value of defaultVal \'[object Object]\' must be a string.')
    })

    it('should check fetchStringKeyFromData with invalid data', () => {
      let data = {
        key1: false,
        key2: 0,
        key3: {},
      }

      expect(() => utils.fetchStringKeyFromData(data, 'key_x', true)).to.throw(Error,
          'Missing \'key_x\' key in the data.')

      expect(() => utils.fetchStringKeyFromData(data, 'key1', false)).to.throw(Error,
          'Value of \'key1\' must be a string.')

      expect(() => utils.fetchStringKeyFromData(data, 'key2', false)).to.throw(Error,
          'Value of \'key2\' must be a string.')

      expect(() => utils.fetchStringKeyFromData(data, 'key3', false)).to.throw(Error,
          'Value of \'key3\' must be a string.')
    })
  })

  describe('Utils.fetchObjectKeyFromData', () => {
    it('should check fetchObjectKeyFromData with valid data', () => {
      let data = {
        key1: { subkey1: true, },
        key2: 'test',
      }
      expect(Object.keys(data).length).to.equal(2)

      {
        const res = utils.fetchObjectKeyFromData(data, 'key1', true)
        expect(res).to.deep.equal({ subkey1: true })
        expect(Object.keys(data).length).to.equal(1)
      }

      {
        const res = utils.fetchObjectKeyFromData(data, 'key3', false)
        expect(res).to.equal(null)
      }

      {
        const res = utils.fetchObjectKeyFromData(data, 'key3')
        expect(res).to.equal(null)
      }
      {
        const res = utils.fetchObjectKeyFromData(data, 'key3', false, { subkey2: 123 })
        expect(res).to.deep.equal({ subkey2: 123 })
      }

      expect(() => utils.fetchObjectKeyFromData(data, 'key3', false, false)).to.throw(Error,
          'Value of defaultVal \'false\' must be a object.')
      expect(() => utils.fetchObjectKeyFromData(data, 'key3', false, 123)).to.throw(Error,
          'Value of defaultVal \'123\' must be a object.')
      expect(() => utils.fetchObjectKeyFromData(data, 'key3', false, '')).to.throw(Error,
          'Value of defaultVal \'\' must be a object.')
    })

    it('should check fetchObjectKeyFromData with invalid data', () => {
      let data = {
        key1: false,
        key2: 0,
        key3: '',
      }

      expect(() => utils.fetchObjectKeyFromData(data, 'key_x', true)).to.throw(Error,
          'Missing \'key_x\' key in the data.')

      expect(() => utils.fetchObjectKeyFromData(data, 'key1', false)).to.throw(Error,
          'Value of \'key1\' must be a object.')

      expect(() => utils.fetchObjectKeyFromData(data, 'key2', false)).to.throw(Error,
          'Value of \'key2\' must be a object.')

      expect(() => utils.fetchObjectKeyFromData(data, 'key3', false)).to.throw(Error,
          'Value of \'key3\' must be a object.')
    })
  })

})

let MD5 = require('crypto-js/md5')
let SHA256 = require('crypto-js/sha256')
let AES = require('crypto-js/aes')
let enc_base64 = require('crypto-js/enc-base64')
let core = require('crypto-js/core')

let enc = {}
enc.Base64 = enc_base64

let lib = {}
lib.WordArray = core.lib.WordArray

// Create a wordArray that is big-endian (because it's being used with CryptoJS, which is all big-endian).
function convertUint8ArrayToWordArray (u8Array) {
  let words = []

  if (!u8Array instanceof Uint8Array) {
    throw Error(`Error: Wrong type of u8Array: ${Object.prototype.toString.call(u8Array)}`)
  }

  for (let i = 0; i < u8Array.length;) {
    let word = u8Array[i++] << 24
    if (i < i < u8Array.length) {
      word |= u8Array[i++] << 16
    }
    if (i < i < u8Array.length) {
      word |= u8Array[i++] << 8
    }
    if (i < i < u8Array.length) {
      word |= u8Array[i++]
    }
    words.push(word)
  }

  return new lib.WordArray.init(words, u8Array.length)
}

function convertWordArrayToUint8Array (wordArray) {
  const len = wordArray.words.length
  let u8_array = new Uint8Array(len * 4)
  let offset = 0
  for (let i = 0; i < len; i++) {
    let word = wordArray.words[i]
    u8_array[offset++] = (word >> 24) & 0xff
    u8_array[offset++] = (word >> 16) & 0xff
    u8_array[offset++] = (word >> 8) & 0xff
    u8_array[offset++] = word & 0xff
  }
  return u8_array
}

let convert = {}
convert.Uint8ArrayToWordArray = convertUint8ArrayToWordArray
convert.WordArrayToUint8Array = convertWordArrayToUint8Array

export default { MD5, SHA256, AES, enc, enc_base64, lib, convert }
export { MD5, SHA256, AES, enc, enc_base64, lib, convert }

(function (f) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f()
  } else if (typeof define === 'function' && define.amd) {
    define([], f)
  } else {
    var g
    if (typeof window !== 'undefined') {
      g = window
    } else if (typeof global !== 'undefined') {
      g = global
    } else if (typeof self !== 'undefined') {
      g = self
    } else {
      g = this
    }
    g.CryptoJS = f()
  }
})(function () {
  return { MD5, SHA256, AES, enc, enc_base64, lib, convert }
})

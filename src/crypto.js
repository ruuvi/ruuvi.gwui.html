let MD5 = require('crypto-js/md5')
let SHA256 = require('crypto-js/sha256')
let enc_base64 = require('crypto-js/enc-base64')
let core = require('crypto-js/core')

let enc = {}
enc.Base64 = enc_base64

let lib = {}
lib.WordArray = core.lib.WordArray

export default { MD5, SHA256, enc, enc_base64, lib }
export { MD5, SHA256, enc, enc_base64, lib }

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
})(function() {
  return { MD5, SHA256, enc, enc_base64, lib }
})

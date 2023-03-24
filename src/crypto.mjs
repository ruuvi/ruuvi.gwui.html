import MD5 from 'crypto-js/md5.js'
import SHA256 from 'crypto-js/sha256.js'
import AES from 'crypto-js/aes.js'
import enc_base64 from 'crypto-js/enc-base64.js'
import enc_hex from 'crypto-js/enc-hex.js'
import core from 'crypto-js/core.js'
import elliptic from 'elliptic'

let enc = {}
enc.Base64 = enc_base64
enc.Hex = enc_hex

let lib = {}
lib.WordArray = core.lib.WordArray

function ECDH (curve = 'secp256r1') {
  let aliases = {
    secp256k1: {
      name: 'secp256k1',
      byteLength: 32
    },
    secp224r1: {
      name: 'p224',
      byteLength: 28
    },
    prime256v1: {
      name: 'p256',
      byteLength: 32
    },
    prime192v1: {
      name: 'p192',
      byteLength: 24
    },
    ed25519: {
      name: 'ed25519',
      byteLength: 32
    },
    secp384r1: {
      name: 'p384',
      byteLength: 48
    },
    secp521r1: {
      name: 'p521',
      byteLength: 66
    }
  }
  aliases.p224 = aliases.secp224r1
  aliases.p256 = aliases.secp256r1 = aliases.prime256v1
  aliases.p192 = aliases.secp192r1 = aliases.prime192v1
  aliases.p384 = aliases.secp384r1
  aliases.p521 = aliases.secp521r1

  this.curveType = aliases[curve]
  if (!this.curveType) {
    throw new Error('Unsupported curve type')
  }
  this.curve = new elliptic.ec(this.curveType.name)
  this.keys = this.curve.genKeyPair()
}

/**
 Gets the public key of the ECDH object.
 @name getPublicKey
 @param {string} [encoding] - The encoding format to use for the public key.
 The supported encoding formats are 'base64' and 'hex'.
 @returns {lib.WordArray|string} - The public key of the ECDH object.
 The returned value is a WordArray if encoding is not specified.
 If encoding is 'base64', the returned value is a string representing the public key encoded as Base64.
 If encoding is 'hex', the returned value is a string representing the public key encoded as hexadecimal.
 @throws {Error} - Throws an error if the encoding parameter is provided and is not equal to 'base64' or 'hex'.
 @example
 import * as crypto from './crypto'
 let ecdh = new crypto.ECDH(); // create an instance of ECDH
 let pubKey = ecdh.getPublicKey(); // get the public key as a WordArray
 let pubKey_b64 = ecdh.getPublicKey('base64'); // get the public key encoded as Base64
 console.log(pubKey_b64); // print the public key encoded as Base64
 // "BOTrvq54RkahXXRsAxV8LrMVcIMNw2DRS5iv1Et3j7xinlDTQGfqfZk213hjCUwZ+F9P+iQ107gtmvVvlzynuso="
 let pubKey_hex = ecdh.getPublicKey('hex'); // get the public key encoded as hexadecimal
 console.log(pubKey_hex); // print the public key encoded as hexadecimal
 // 04e4ebbeae784646a15d746c03157c2eb31570830dc360d14b98afd44b778fbc629e50d34067ea7d9936d77863094c19f85f4ffa2435d3b82d9af56f973ca7baca
 */
ECDH.prototype.getPublicKey = function (encoding) {
  const flag_compact = false
  const flag_enc = true
  const pub_key = this.keys.getPublic(flag_compact, flag_enc)
  const pub_key_u8 = _convertBigNumberToUint8Array(pub_key)
  const res = _convertUint8ArrayToWordArray(pub_key_u8)
  if (typeof encoding === 'string') {
    if (encoding === 'base64') {
      return res.toString(enc.Base64)
    } else if (encoding === 'hex') {
      return res.toString(enc.Hex)
    }
    throw new Error('Unsupported encoding')
  }
  return res
}

/**
 Computes the shared secret between this ECDH instance's private key and a given public key.
 @name computeSecret
 @param {string|lib.WordArray} otherPubKey - The public key to compute the shared secret with.
        Can be a base64 or hex encoded string, or an lib.WordArray object (with 'words' and 'sigBytes' properties).
 @param {string} [encoding] - Optional parameter specifying the encoding of the otherPubKey parameter.
        Must be 'base64' or 'hex' for otherPubKey of type 'string'.
 @returns {lib.WordArray} - The shared secret as a WordArray.
 @throws {Error} - Throws an error if otherPubKey is of an unsupported type or if the encoding parameter is unsupported.
 @example
 import * as crypto from './crypto'
 const ecdh1 = new crypto.ECDH(); // create first instance of ECDH
 const pubKey1_b64 = ecdh1.getPublicKey('base64'); // get the public key encoded as Base64
 const ecdh2 = new crypto.ECDH(); // create second instance of ECDH
 const pubKey2_b64 = ecdh2.getPublicKey('base64'); // get the public key encoded as Base64
 const secret1 = ecdh2.computeSecret(pubKey1_b64, 'base64') // compute a shared secret between first and second instances of ECDH
 const secret2 = ecdh1.computeSecret(pubKey2_b64, 'base64') // compute a shared secret between second and first instances of ECDH
 console.log(pubKey1_b64); // print the public key1 encoded as Base64
 // BGV2322WZo+UXTskdtJjEuQzVYvYE0MdMRmg4fShtWdHc9DYmd8Sym9mKfNxTXzPKRdlgS7y1JOb6ADna9/nYNc=
 console.log(pubKey2_b64); // print the public key2 encoded as Base64
 // BIttfOt5bEI80RG7LAmYAxWqJNfKWVAfWrc6I4eWYUEK4K8Wox0VXpdWtiqJz4p0d09nSbEMoUE18lY2FaIBrgY=
 console.log(secret1.toString()) // print the computed shared secret for the first instance
 // b17a5b1071eb7ace15d74d65e30bc84ef315fbac5800cad559b33ab40fb871f8
 console.log(secret2.toString()) // print the computed shared secret for the second instance
 // b17a5b1071eb7ace15d74d65e30bc84ef315fbac5800cad559b33ab40fb871f8
 console.log(secret1.toString() === secret2.toString()) // Check that the shared secrets are equal
 // true
 */
ECDH.prototype.computeSecret = function (otherPubKey, encoding) {
  if (typeof otherPubKey === 'string') {
    if (encoding === 'base64') {
      otherPubKey = enc.Base64.parse(otherPubKey)
    } else if (encoding === 'hex') {
      otherPubKey = enc.Hex.parse(otherPubKey)
    } else {
      throw new Error('Unsupported encoding')
    }
  } else if (typeof otherPubKey === 'object' &&
      Object.hasOwn(otherPubKey, 'words') &&
      Object.hasOwn(otherPubKey, 'sigBytes')) {
    if (encoding !== undefined) {
      throw new Error('Unsupported encoding')
    }
  } else {
    throw new Error('Unsupported type of otherPubKey')
  }

  const otherPubKey_u8 = _convertWordArrayToUint8Array(otherPubKey)
  const otherPubPoint = this.curve.keyFromPublic(otherPubKey_u8).getPublic()
  const out = otherPubPoint.mul(this.keys.getPrivate()).getX()
  const secret_u8 = _convertBigNumberToUint8Array(out, this.curveType.byteLength)
  return _convertUint8ArrayToWordArray(secret_u8)
}

/**
 @name _convertBigNumberToUint8Array
 Converts a BigNumber or array of numbers to a Uint8Array.
 @param {BN|number[]} bn - The BigNumber or array of numbers to convert.
 @param {number} [len] - The length to pad the result to, if necessary.
 @returns {Uint8Array} The converted value as a Uint8Array object.
 */
function _convertBigNumberToUint8Array (bn, len) {
  if (!Array.isArray(bn)) {
    bn = bn.toArray();
  }
  let buf = new Uint8Array(bn);
  if (len && buf.length < len) {
    let zeros = new Uint8Array(len - buf.length);
    zeros.fill(0);
    buf = new Uint8Array([...zeros, ...buf]);
  }
  return buf;
}

/**
 Convert a Uint8Array to a WordArray.
 @param {Uint8Array} u8Array - The Uint8Array to be converted to WordArray.
 @throws {Error} - If u8Array is not an instance of Uint8Array.
 @returns {lib.WordArray} - A WordArray object.
 */
function _convertUint8ArrayToWordArray (u8Array) {
  const words = []

  if (!u8Array instanceof Uint8Array) {
    throw Error(`Error: Wrong type of u8Array: ${Object.prototype.toString.call(u8Array)}`)
  }

  for (let i = 0; i < u8Array.length;) {
    let word = u8Array[i++] << 24
    if (i < u8Array.length) {
      word |= u8Array[i++] << 16
    }
    if (i < u8Array.length) {
      word |= u8Array[i++] << 8
    }
    if (i < u8Array.length) {
      word |= u8Array[i++]
    }
    words.push(word)
  }

  return new lib.WordArray.init(words, u8Array.length)
}

/**
 Converts a WordArray to a Uint8Array.
 @param {lib.WordArray} wordArray - The WordArray to be converted.
 @throws {Error} If the input wordArray is not an object with the expected properties.
         wordArray must have two properties:
        - {Array} 'words' - The array of 32-bit words.
        - {number} 'sigBytes' - The number of significant bytes in the 'words'.
 @returns {Uint8Array} - A new Uint8Array representing the WordArray.
 */
function _convertWordArrayToUint8Array (wordArray) {
  if (!(typeof wordArray === 'object' &&
      Object.hasOwn(wordArray, 'words') &&
      Array.isArray(wordArray.words) &&
      Object.hasOwn(wordArray, 'sigBytes'))) {
    throw Error(`Error: Wrong type of wordArray: ${Object.prototype.toString.call(wordArray)}`)
  }
  const u8_array = new Uint8Array(wordArray.sigBytes)
  let offset = 0
  for (let i = 0; i < wordArray.words.length; i++) {
    const word = wordArray.words[i]
    if (offset < wordArray.sigBytes) {
      u8_array[offset++] = (word >> 24) & 0xff
    }
    if (offset < wordArray.sigBytes) {
      u8_array[offset++] = (word >> 16) & 0xff
    }
    if (offset < wordArray.sigBytes) {
      u8_array[offset++] = (word >> 8) & 0xff
    }
    if (offset < wordArray.sigBytes) {
      u8_array[offset++] = word & 0xff
    }
  }
  return u8_array
}

export default { MD5, SHA256, AES, enc, enc_base64, lib, ECDH }
export { MD5, SHA256, AES, enc, enc_base64, lib, ECDH }

(function (f) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f()
  } else if (typeof define === 'function' && define.amd) {
    define([], f)
  } else {
    let g
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
  return { MD5, SHA256, AES, enc, enc_base64, lib, ECDH }
})

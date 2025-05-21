#!/usr/bin/env python

import random
import hashlib
import base64
import Crypto.Util.Padding
from Crypto.PublicKey import ECC
from Crypto.Cipher import AES
from Crypto.Hash import SHA256

g_aes_key = None

def ecdh_compute_shared_secret(priv_key: ECC.EccKey, pub_key: ECC.EccKey):
    return (priv_key.d * pub_key.pointQ).x % priv_key._curve.order

def ecdh_handshake(peer_pub_key_b64):
    print(f'Peer public key base64: {peer_pub_key_b64}')
    peer_pub_key = base64.b64decode(peer_pub_key_b64)
    print(f'Peer public key (len={len(peer_pub_key)}): {peer_pub_key.hex()}')
    ecdh_curve_name = 'secp256r1'
    ecdh_peer_pub_key = ECC.import_key(peer_pub_key, curve_name=ecdh_curve_name)
    ecdh_keys = ECC.generate(curve=ecdh_curve_name)

    ecdh_shared_secret = ecdh_compute_shared_secret(ecdh_keys, ecdh_peer_pub_key.public_key())
    print(f'ECDH shared secret: {ecdh_shared_secret.to_bytes().hex()}')
    aes_key = hashlib.sha256(ecdh_shared_secret.to_bytes()).digest()
    print(f'AES key: {aes_key.hex()}')

    own_pub_key_b64 = base64.b64encode(ecdh_keys.public_key().export_key(format='SEC1')).decode('utf-8')
    return own_pub_key_b64, aes_key


def ecdh_decrypt(aes_key, req_encrypted, req_iv, req_hash):
    cipher = AES.new(aes_key, AES.MODE_CBC, iv=base64.b64decode(req_iv))
    try:
        req_decrypted = Crypto.Util.Padding.unpad(cipher.decrypt(base64.b64decode(req_encrypted)), AES.block_size)
    except ValueError as ex:
        print(f'Error: Bad padding: {ex}')
        return None

    hash_actual = SHA256.new(req_decrypted).digest().hex()
    hash_expected = base64.b64decode(req_hash).hex()
    if hash_actual != hash_expected:
        print(f'Error: Verification failed, hash mismatch: {hash_actual} != {hash_expected}')
        return None

    return req_decrypted.decode('utf-8')

def ecdh_encrypt(aes_key, msg):
    print(f'Encrypt message: {msg}')
    msg_hash = hashlib.sha256(msg.encode('utf-8')).hexdigest()
    print(f'Message hash: {msg_hash}')
    aes_iv = random.randbytes(16)
    print(f'AES IV: {aes_iv.hex()}')
    cipher = AES.new(aes_key, AES.MODE_CBC, iv=aes_iv)
    msg_encrypted = cipher.encrypt(Crypto.Util.Padding.pad(msg.encode('utf-8'), AES.block_size))
    print(f'Message encrypted (hex): {msg_encrypted.hex()}')
    msg_encrypted_b64 = base64.b64encode(msg_encrypted).decode('utf-8')
    print(f'Message encrypted (base64): {msg_encrypted_b64}')
    msg_iv_b64 = base64.b64encode(cipher.iv).decode('utf-8')
    print(f'Message IV: {msg_iv_b64}')
    msg_hash_b64 = base64.b64encode(bytes.fromhex(msg_hash)).decode('utf-8')
    print(f'Message hash (base64): {msg_hash_b64}')
    return msg_encrypted_b64, msg_iv_b64, msg_hash_b64

def main():
    msg = "{'use_eth': True, 'eth_dhcp': True}"
    peer_pub_key_b64 = 'BD/43s36cjsfPeGY1xL8q0iFuVuI8Zdj9ZnKdQ2rMJlSGDGMKWKvjMI1+ANCNeN8rtwalkzDO4J0i3qONcMdnKs='
    own_pub_key_b64, aes_key = ecdh_handshake(peer_pub_key_b64)
    msg_encrypted_b64, msg_iv_b64, msg_hash_b64 = ecdh_encrypt(aes_key, msg)
    msg_decrypted = ecdh_decrypt(aes_key, msg_encrypted_b64, msg_iv_b64, msg_hash_b64)
    if msg_decrypted:
        print(f'Message decrypted: {msg_decrypted}')
    else:
        print('Error: Decryption failed')
    pass

if __name__ == '__main__':
    main()

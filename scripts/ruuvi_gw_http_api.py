#!/usr/bin/env python
import argparse
import os
import hashlib
import base64
import time

import requests
import sys
import json
from Crypto.Util import Padding
from Crypto.PublicKey import ECC
from Crypto.Cipher import AES

ecdh_curve_name = 'secp256r1'

script_name = os.path.basename(sys.argv[0])

def ecdh_create_key():
    return ECC.generate(curve=ecdh_curve_name)

def export_ec_public_key_raw(ec_key: ECC.EccKey):
    # if ec_key.curve != ecdh_curve_name:
    #     raise ValueError(f'Invalid curve name: {ec_key.curve}, expected: {ecdh_curve_name}')
    # Convert IntegerGMP to a regular integer before calling to_bytes
    x = int(ec_key.pointQ.x).to_bytes(32, byteorder='big')
    y = int(ec_key.pointQ.y).to_bytes(32, byteorder='big')
    return b'\x04' + x + y

def ecdh_compute_shared_secret(priv_key: ECC.EccKey, pub_key: ECC.EccKey):
    return (priv_key.d * pub_key.pointQ).x % priv_key._curve.order

def ecdh_handshake(ecdh_key, peer_pub_key_b64):
    peer_pub_key = base64.b64decode(peer_pub_key_b64)
    if len(peer_pub_key) != 65:
        print(f'Error: Invalid peer public key length (expected key in raw format): {len(peer_pub_key)}')
        return None
    ecdh_peer_pub_key = ECC.import_key(peer_pub_key, curve_name=ecdh_curve_name)
    ecdh_shared_secret = ecdh_compute_shared_secret(ecdh_key, ecdh_peer_pub_key.public_key())
    print(f'ECDH shared secret: {ecdh_shared_secret.to_bytes().hex()}')
    aes_key = hashlib.sha256(ecdh_shared_secret.to_bytes(32, 'big')).digest()
    return aes_key

def aes_encrypt(aes_key, msg):
    print(f'Encrypt message: {msg}')
    msg_hash = hashlib.sha256(msg.encode('utf-8')).digest()
    print(f'Message hash: {msg_hash.hex()}')
    aes_iv = os.urandom(16)
    print(f'AES IV: {aes_iv.hex()}')
    cipher = AES.new(aes_key, AES.MODE_CBC, iv=aes_iv)
    msg_encrypted = cipher.encrypt(Padding.pad(msg.encode('utf-8'), AES.block_size))
    print(f'Message encrypted (hex): {msg_encrypted.hex()}')
    msg_encrypted_b64 = base64.b64encode(msg_encrypted).decode('utf-8')
    msg_iv_b64 = base64.b64encode(cipher.iv).decode('utf-8')
    print(f'Message IV (base64): {msg_iv_b64}')
    msg_hash_b64 = base64.b64encode(msg_hash).decode('utf-8')
    print(f'Message hash (base64): {msg_hash_b64}')
    return (
        msg_encrypted_b64,
        msg_iv_b64,
        msg_hash_b64
    )

def parse_token(auth_str, prefix, suffix):
    """Extracts a token from auth_str that is enclosed between prefix and suffix."""

    start_index = auth_str.find(prefix)
    if start_index == -1:
        raise ValueError(f"Prefix '{prefix}' not found in '{auth_str}'")

    end_index = auth_str.find(suffix, start_index + len(prefix))
    if end_index == -1:
        raise ValueError(f"Suffix '{suffix}' not found in '{auth_str}'")

    return auth_str[start_index + len(prefix):end_index]

def perform_auth(gw_name_or_ip, username_password):
    print(f'Generate own ECDH key')
    ecdh_key = ecdh_create_key()
    own_pub_key = export_ec_public_key_raw(ecdh_key)
    print(f'Own public key (hex): {own_pub_key.hex()}')
    own_pub_key_b64 = base64.b64encode(own_pub_key).decode('utf-8')
    print(f'Own public key (base64): {own_pub_key_b64}')

    headers = {
        'Ruuvi-Ecdh-Pub-Key': own_pub_key_b64,
        'User-Agent': 'ruuvi_gw_http_api.py',
    }
    url_auth = f'http://{gw_name_or_ip}/auth'

    print(f'GET {url_auth}, headers: {headers}')
    response = requests.get(url_auth, headers=headers, timeout=10)
    print (f'Response status code: {response.status_code}')
    print (f'Response payload: {response.text}')
    print (f'Response headers: {response.headers}')
    if 'Ruuvi-Ecdh-Pub-Key' not in response.headers:
        print(f'Error: No Ruuvi-Ecdh-Pub-Key header in response')
        return None, None
    gw_pub_key_b64 = response.headers['Ruuvi-Ecdh-Pub-Key']
    print(f'Gateway public key (base64): {gw_pub_key_b64}')
    # Extract the 'RUUVISESSION' from the cookies
    ruuvi_session = response.cookies.get('RUUVISESSION')
    print(f'RUUVISESSION cookie: {ruuvi_session}')
    if response.status_code != 200:
        print(f'Error: GET /auth failed: {response.status_code}')
        if response.status_code != 401:
            return None, None
        auth_str = response.headers.get('WWW-Authenticate')
        if auth_str is None or not auth_str.startswith('x-ruuvi-interactive '):
            print(f'Error: Invalid WWW-Authenticate header: {auth_str}')
            return None, None

        realm = parse_token(auth_str, 'realm="', '"')
        print(f'Realm: {realm}')
        challenge = parse_token(auth_str, 'challenge="', '"')
        print(f'Challenge: {challenge}')
        session_cookie = parse_token(auth_str, 'session_cookie="', '"')
        print(f'Session cookie: {session_cookie}')
        session_id = parse_token(auth_str, 'session_id="', '"')
        print(f'Session ID: {session_id}')

        if username_password is None:
            print(f'Input username and password in the form "username:password":')
            username_password = input()
        username, _, password = username_password.partition(':')
        print(f'Authenticate with Username: {username}, password: {password}')
        unencrypted_password = username + ':' + realm + ':' + password
        print(f'Unencrypted password: {unencrypted_password}')
        encrypted_password = hashlib.md5(unencrypted_password.encode('utf-8')).hexdigest()
        print(f'Encrypted password: {encrypted_password}')
        challenge_with_encrypted_password = challenge + ':' + encrypted_password
        password_sha256 = hashlib.sha256(challenge_with_encrypted_password.encode('utf-8')).hexdigest()
        print(f'Password SHA256: {password_sha256}')

        payload_json = {
            'login': username,
            'password': password_sha256
        }
        headers = {
            'User-Agent': 'ruuvi_gw_http_api.py',
        }
        if ruuvi_session is not None:
            headers['Cookie'] = 'RUUVISESSION=' + ruuvi_session
        payload_json = json.dumps(payload_json)
        print(f'POST {url_auth}, body: {payload_json}, headers: {headers}')
        response = requests.post(url_auth, data=payload_json, headers=headers, timeout=10)
        print (f'Response status code: {response.status_code}')
        print (f'Response payload: {response.text}')
        print (f'Response headers: {response.headers}')
        if response.status_code != 200:
            print(f'Error: GET /auth failed: {response.status_code}')
            return None, None

    aes_key = ecdh_handshake(ecdh_key, gw_pub_key_b64)
    print(f'AES key: {aes_key.hex()}')
    return aes_key, ruuvi_session

def perform_http_post(url, aes_key, ruuvi_session, msg):
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': script_name
    }
    if aes_key is not None:
        msg_encrypted_b64, msg_iv_b64, msg_hash_b64 = aes_encrypt(aes_key, msg)
        payload_json = {
            'encrypted': msg_encrypted_b64,
            'iv': msg_iv_b64,
            'hash': msg_hash_b64,
        }
        headers['Ruuvi-Ecdh-Encrypted'] = 'true'
    else:
            payload_json = msg
    if ruuvi_session is not None:
        headers['Cookie'] = 'RUUVISESSION=' + ruuvi_session

    if isinstance(payload_json, dict):
        payload_json = json.dumps(payload_json)
    print(f'POST {url}, body: {payload_json}, headers: {headers}')
    try:
        response = requests.post(f'{url}', data=payload_json, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f'Error: POST {url} failed: {e}')
        return False
    print (f'Response status code: {response.status_code}')
    print (f'Response payload: {response.text}')
    print (f'Response headers: {response.headers}')
    print (f'')
    return True

def perform_http_delete(url, ruuvi_session):
    headers = {
        'User-Agent': script_name
    }
    if ruuvi_session is not None:
        headers['Cookie'] = 'RUUVISESSION=' + ruuvi_session

    print(f'DELETE {url}, headers: {headers}')
    try:
        response = requests.delete(f'{url}', headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f'Error: DELETE {url} failed: {e}')
        return False
    print (f'Response status code: {response.status_code}')
    print (f'Response payload: {response.text}')
    print (f'Response headers: {response.headers}')
    print (f'')
    return True

def perform_http_get(url, ruuvi_session):
    headers = {
        'User-Agent': script_name
    }
    if ruuvi_session is not None:
        headers['Cookie'] = 'RUUVISESSION=' + ruuvi_session

    print(f'GET {url}, headers: {headers}')
    try:
        response = requests.get(f'{url}', headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f'Error: GET {url} failed: {e}')
        return None
    print (f'Response status code: {response.status_code}')
    print (f'Response payload: {response.text}')
    print (f'Response headers: {response.headers}')
    print (f'')
    json_payload = json.loads(response.text)
    return json_payload


# noinspection HttpUrlsUsage
def main():
    parser = argparse.ArgumentParser(description='Demo of using Ruuvi Gateway HTTP API',
                                     epilog='Examples:\n'
                                            '\truuvi_gw_http_api.py ruuvigateway9c2c.local\n'
                                            '\truuvi_gw_http_api.py 192.168.1.107',
                                     formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument('--no_encryption',
                        help='Do not perform /auth request and do not encrypt data',
                        action='store_true')
    parser.add_argument('--auth',
                        type=str,
                        help='Use authentication in the form "username:password"\n'
                        '\tExample: --auth "Admin:00:11:22:33:44:55:66:77"')
    parser.add_argument('gw_name_or_ip',
                        type=str,
                        help='Ruuvi Gateway name or IP address')
    args = parser.parse_args()
    # ruuvi_gw_http_api.py cfg_eth ruuvigateway9c2c.local
    # ruuvi_gw_http_api.py get_history ruuvigateway9c2c.local
    # ruuvi_gw_http_api.py auth ruuvigateway9c2c.local
    # ruuvi_gw_http_api.py get_status ruuvigateway9c2c.local

    gw_name_or_ip = args.gw_name_or_ip
    flag_no_encryption = args.no_encryption
    username_password = args.auth

    if flag_no_encryption:
        aes_key, ruuvi_session = None, None
    else:
        # Perform ECDH handshake and get AES key
        # Send GET /auth with own public key in HTTP header 'Ruuvi-Ecdh-Pub-Key'
        # Receive Gateway public key in HTTP header 'Ruuvi-Ecdh-Pub-Key'
        # Compute shared secret and derive AES key as SHA256 hash of shared secret
        aes_key, ruuvi_session = perform_auth(gw_name_or_ip, username_password)
        if not aes_key:
            sys.exit(1)

    # Perform DELETE /connect.json to disconnect from the current network
    if not perform_http_delete(f'http://{gw_name_or_ip}/connect.json', ruuvi_session):
        sys.exit(1)

    # Perform POST /ruuvi.json to configure Ethernet and DHCP
    if not perform_http_post(f'http://{gw_name_or_ip}/ruuvi.json', aes_key, ruuvi_session,
                             '{"use_eth": true, "eth_dhcp": true}'):
        sys.exit(1)

    # Perform POST /connect.json to connect to the network
    if not perform_http_post(f'http://{gw_name_or_ip}/connect.json', aes_key, ruuvi_session,
                             '{"ssid":null,"password":null,"stub":"                                                                                                                                                                                                         "}'):
        sys.exit(1)

    # Wait for the connection to be established
    # Perform GET /status.json to check the connection status
    # Repeat the check every second for 20 seconds
    # Wait until 'urc' is 0, which means that the connection is established
    flag_connected = False
    for i in range(20):
        json_payload = perform_http_get(f'http://{gw_name_or_ip}/status.json', ruuvi_session)
        if json_payload is None:
            sys.exit(1)
        print(f'URC: {json_payload["urc"]}')
        if json_payload['urc'] == 0:
            print(f'Connected to {json_payload["ssid"] if json_payload["ssid"] else "Ethernet"}')
            flag_connected = True
            break
        time.sleep(1.0)
    if not flag_connected:
        print(f'Error: Connection failed')
        sys.exit(1)

    # Perform GET /validate_url to check the connection with Ruuvi Cloud
    json_payload = perform_http_get(f'http://{gw_name_or_ip}/validate_url?url=https%3A%2F%2Fnetwork.ruuvi.com%2Frecord&validate_type=check_post_advs&auth_type=none&use_ssl_client_cert=false&use_ssl_server_cert=false"', ruuvi_session)
    if json_payload is None:
        sys.exit(1)
    print(f'Connection with Ruuvi Cloud checked successfully')

if __name__ == '__main__':
    main()

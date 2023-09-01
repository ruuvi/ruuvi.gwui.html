#!/usr/bin/env python
# -*- coding: utf-8 -*-
import binascii
import copy
import datetime
from socketserver import ThreadingMixIn
from http.server import BaseHTTPRequestHandler, HTTPServer
import socketserver
import threading
import argparse
import re
import json
import time
import os
import sys
import shutil
import io
import select
import string
import random
import hashlib
import base64
import urllib.request
import urllib.error
from enum import Enum
from typing import Optional, Dict
import Crypto.Util.Padding
from Crypto.PublicKey import ECC
from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from urllib.parse import urlparse
from urllib.parse import parse_qs

GET_AP_JSON_TIMEOUT = 0.25
GET_HISTORY_JSON_TIMEOUT = 0.25
NETWORK_CONNECTION_TIMEOUT = 0.25
GET_FIRMWARE_UPDATE_TIMEOUT = 0.25

LAN_AUTH_TYPE_DEFAULT = 'lan_auth_default'
LAN_AUTH_TYPE_DENY = 'lan_auth_deny'
LAN_AUTH_TYPE_RUUVI = 'lan_auth_ruuvi'
LAN_AUTH_TYPE_DIGEST = 'lan_auth_digest'
LAN_AUTH_TYPE_BASIC = 'lan_auth_basic'
LAN_AUTH_TYPE_ALLOW = 'lan_auth_allow'

LAN_AUTH_DEFAULT_USER = "Admin"

AUTO_UPDATE_CYCLE_TYPE_REGULAR = 'regular'
AUTO_UPDATE_CYCLE_TYPE_BETA_TESTER = 'beta'
AUTO_UPDATE_CYCLE_TYPE_MANUAL = 'manual'

SIMULATION_MODE_NO_CONNECTION = 0
SIMULATION_MODE_ETH_CONNECTED = 1
SIMULATION_MODE_WIFI_CONNECTED = 2
SIMULATION_MODE_WIFI_FAILED_ATTEMPT = 3
SIMULATION_MODE_USER_DISCONNECT = 4
SIMULATION_MODE_LOST_CONNECTION = 5

STATUS_JSON_URC_CONNECTED = 0
STATUS_JSON_URC_WIFI_FAILED_ATTEMPT = 1
STATUS_JSON_URC_USER_DISCONNECT = 2
STATUS_JSON_URC_LOST_CONNECTION = 3

COOKIE_RUUVISESSION = 'RUUVISESSION'
COOKIE_RUUVILOGIN = 'RUUVILOGIN'
COOKIE_RUUVI_PREV_URL = 'RUUVI_PREV_URL'

SOFTWARE_UPDATE_STAGE_0_NONE = 0
SOFTWARE_UPDATE_STAGE_1_DOWNLOAD_MAIN_FW = 1
SOFTWARE_UPDATE_STAGE_2_DOWNLOAD_UI = 2
SOFTWARE_UPDATE_STAGE_3_DOWNLOAD_NRF52 = 3
SOFTWARE_UPDATE_STAGE_4_FLASH_NRF52 = 4
SOFTWARE_UPDATE_STAGE_5_COMPLETED_SUCCESSFULLY = 5
SOFTWARE_UPDATE_STAGE_6_DOWNLOADING_FAILED = 6
SOFTWARE_UPDATE_STAGE_7_FLASHING_NRF52_FAILED = 7

g_simulation_mode = SIMULATION_MODE_NO_CONNECTION
# g_simulation_mode = SIMULATION_MODE_ETH_CONNECTED
g_software_update_stage = SOFTWARE_UPDATE_STAGE_0_NONE
# g_software_update_stage = SOFTWARE_UPDATE_STAGE_4_FLASH_NRF52
g_software_update_percentage = 0
g_software_update_url = None
g_ssid = None
g_saved_ssid = None
g_password = None
g_timestamp = None
g_auto_toggle_cnt = 0
g_flag_toggle_history_json = False
g_gw_mac = "AA:BB:CC:DD:EE:FF"
g_gw_unique_id = "00:11:22:33:44:55:66:77"
g_flag_access_from_lan = False
g_aes_key = None

RUUVI_AUTH_REALM = 'RuuviGateway' + g_gw_mac[-5:-3] + g_gw_mac[-2:]

g_lan_auth_default_password_hashed = hashlib.md5(f'{LAN_AUTH_DEFAULT_USER}:{RUUVI_AUTH_REALM}:{g_gw_unique_id}'.encode('utf-8')).hexdigest()

g_fw_ver = 'v1.14.0'
g_nrf52_fw_ver = 'v1.0.0'

g_ruuvi_dict = {
    'fw_ver': g_fw_ver,
    'nrf52_fw_ver': g_nrf52_fw_ver,
    'storage': {
        'storage_ready': False,

        'http_cli_cert': False,
        'http_cli_key': False,
        'stat_cli_cert': False,
        'stat_cli_key': False,
        'rcfg_cli_cert': False,
        'rcfg_cli_key': False,
        'mqtt_cli_cert': False,
        'mqtt_cli_key': False,

        'http_srv_cert': False,
        'stat_srv_cert': False,
        'rcfg_srv_cert': False,
        'mqtt_srv_cert': False,
    },
    'use_eth': False,
    'eth_dhcp': True,
    'eth_static_ip': "",
    'eth_netmask': "",
    'eth_gw': "",
    'eth_dns1': "",
    'eth_dns2': "",
    'remote_cfg_use': False,
    'remote_cfg_url': '',
    'remote_cfg_auth_type': 'none',
    'remote_cfg_refresh_interval_minutes': 0,
    'remote_cfg_use_ssl_client_cert': False,
    'remote_cfg_use_ssl_server_cert': False,
    'use_http_ruuvi': True,
    'use_http': True,
    'http_url': 'https://network.ruuvi.com/record',
    'http_period': 10,
    'http_auth': 'none',
    'http_data_format': 'ruuvi',
    'http_use_ssl_client_cert': False,
    'http_use_ssl_server_cert': False,
    # 'http_user': '',
    # 'http_bearer_token': '',
    # 'http_api_key': '',
    'use_http_stat': True,
    'http_stat_url': 'https://network.ruuvi.com/status',
    'http_stat_user': '',
    'http_stat_use_ssl_client_cert': False,
    'http_stat_use_ssl_server_cert': False,
    'use_mqtt': False,
    'mqtt_disable_retained_messages': False,
    'mqtt_transport': 'TCP',
    'mqtt_data_format': 'ruuvi_raw',
    'mqtt_server': 'test.mosquitto.org',
    'mqtt_port': 1883,
    'mqtt_prefix': 'ruuvi/AA:BB:CC:DD:EE:FF/',
    'mqtt_client_id': 'AA:BB:CC:DD:EE:FF',
    'mqtt_user': '',
    'mqtt_use_ssl_client_cert': False,
    'mqtt_use_ssl_server_cert': False,
    'lan_auth_type': LAN_AUTH_TYPE_DEFAULT,
    'lan_auth_user': LAN_AUTH_DEFAULT_USER,
    'lan_auth_pass': g_lan_auth_default_password_hashed,
    'lan_auth_api_key': '',
    'lan_auth_api_key_rw': '',
    'auto_update_cycle': AUTO_UPDATE_CYCLE_TYPE_REGULAR,
    'auto_update_weekdays_bitmask': 0x40,
    'auto_update_interval_from': 20,
    'auto_update_interval_to': 23,
    'auto_update_tz_offset_hours': 3,
    'gw_mac': g_gw_mac,
    'ntp_use': True,
    'ntp_use_dhcp': False,
    'ntp_server1': "time.google.com",
    'ntp_server2': "time.cloudflare.com",
    'ntp_server3': "time.nist.gov",
    'ntp_server4': "pool.ntp.org",
    'company_use_filtering': True,
    'company_id': 0x0499,
    'coordinates': "",
    'scan_coded_phy': False,
    'scan_1mbit_phy': True,
    'scan_extended_payload': True,
    'scan_channel_37': True,
    'scan_channel_38': True,
    'scan_channel_39': True,
    'scan_filter_allow_listed': False,
    'scan_filter_list': [
        # 'AA:BB:CC:00:00:01',
        # 'AA:BB:CC:00:00:03',
        # 'AA:BB:CC:00:00:02'
    ],
    'fw_update_url': 'https://network.ruuvi.com/firmwareupdate'
}

g_content_firmware_update_json = '''
{
  "latest": {
    "version": "v1.13.1",
    "url": "https://s3.eu-central-1.amazonaws.com/dev.network.ruuvi.com/firmwareupdate/v1.13.1",
    "created_at": "2023-03-15T14:54:34Z"
  },
  "beta": {
    "version": "v1.13.1",
    "url": "https://s3.eu-central-1.amazonaws.com/dev.network.ruuvi.com/firmwareupdate/v1.13.1",
    "created_at": "2023-03-15T14:54:34Z"
  },
  "alpha": {
    "version": "1031",
    "url": "https://jenkins.ruuvi.com/job/ruuvi_gateway_esp-PR/1031/artifact/build/"
  }
}
 '''

g_content_firmware_update_json2 = '''
{
    "latest":{
        "version":"v1.14.1",
        "url":"https://fwupdate.ruuvi.com/v1.14.1",
        "created_at":"2023-08-24T14:54:34Z"
    },
    "alpha":{
        "version":"1056",
        "url":"https://jenkins.ruuvi.com/job/ruuvi_gateway_esp-PR/1056/artifact/build/"
    },
    "beta":{
        "version":"v1.14.1",
        "url":"https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/v1.14.1",
        "created_at":"2023-08-21T13:10:34Z"
    }
}
'''

def ecdh_compute_shared_secret(priv_key: ECC.EccKey, pub_key: ECC.EccKey):
    return (priv_key.d * pub_key.pointQ).x % priv_key._curve.order


class LoginSession(object):
    def __init__(self):
        challenge_random = ''.join(random.choice(string.ascii_uppercase) for i in range(32))
        self.challenge = hashlib.sha256(challenge_random.encode('ascii')).hexdigest()
        self.session_id = ''.join(random.choice(string.ascii_uppercase) for i in range(16))

    def generate_auth_header_fields(self):
        header = ''
        header += f'WWW-Authenticate: x-ruuvi-interactive realm="{RUUVI_AUTH_REALM}" challenge="{self.challenge}" session_cookie="{COOKIE_RUUVISESSION}" session_id="{self.session_id}"\r\n'
        header += f'Set-Cookie: RUUVISESSION={self.session_id}\r\n'
        return header


class AuthorizedSession(object):
    def __init__(self, user, session_id):
        self.user = user
        self.session_id = session_id


g_login_session: Optional[LoginSession] = None
g_authorized_sessions: Dict[str, AuthorizedSession] = dict()


class DigestAuth(object):
    def __init__(self):
        self.is_successful = False
        self.username = None
        self.realm = None
        self.nonce = None
        self.uri = None
        self.qop = None
        self.nc = None
        self.cnonce = None
        self.response = None
        self.opaque = None

    def _parse_token(self, authorization_str, prefix, suffix):
        if (idx1 := authorization_str.find(prefix)) < 0:
            return None
        idx1 += len(prefix)
        if (idx2 := authorization_str.find(suffix, idx1)) < 0:
            return None
        return authorization_str[idx1:idx2]

    def parse_authorization_str(self, authorization_str):
        assert isinstance(authorization_str, str)
        self.is_successful = False
        if not authorization_str.startswith('Digest '):
            return False

        self.username = self._parse_token(authorization_str, 'username="', '"')
        if self.username is None:
            return False

        self.realm = self._parse_token(authorization_str, 'realm="', '"')
        if self.realm is None:
            return False

        self.nonce = self._parse_token(authorization_str, 'nonce="', '"')
        if self.nonce is None:
            return False

        self.uri = self._parse_token(authorization_str, 'uri="', '"')
        if self.uri is None:
            return False

        self.qop = self._parse_token(authorization_str, 'qop=', ',')
        if self.qop is None:
            return False

        self.nc = self._parse_token(authorization_str, 'nc=', ',')
        if self.nc is None:
            return False

        self.cnonce = self._parse_token(authorization_str, 'cnonce="', '"')
        if self.cnonce is None:
            return False

        self.response = self._parse_token(authorization_str, 'response="', '"')
        if self.response is None:
            return False

        self.opaque = self._parse_token(authorization_str, 'opaque="', '"')
        if self.opaque is None:
            return False

        self.is_successful = True
        return True

    def check_password(self, encrypted_password):
        ha2 = hashlib.md5(f'GET:{self.uri}'.encode('utf-8')).hexdigest()
        response = hashlib.md5(
            f'{encrypted_password}:{self.nonce}:{self.nc}:{self.cnonce}:{self.qop}:{ha2}'.encode('utf-8')).hexdigest()
        return response == self.response


class HTTPRequestHandler(BaseHTTPRequestHandler):
    def _get_value_from_headers(self, header_name):
        headers = self.headers.as_string()
        idx = headers.find(header_name)
        if idx < 0:
            return None
        start_idx = idx + len(header_name)
        end_idx = start_idx
        while end_idx < len(headers):
            if headers[end_idx] == '\r' or headers[end_idx] == '\n':
                break
            end_idx += 1
        return headers[start_idx: end_idx]

    def _parse_cookies(self, cookies: str) -> dict:
        d = dict()
        cookies_list = cookies.split(';')
        cookies_list = [x.strip() for x in cookies_list]
        for cookie in cookies_list:
            idx = cookie.index('=')
            cookie_name = cookie[:idx]
            cookie_val = cookie[idx + 1:]
            d[cookie_name] = cookie_val
        return d

    def _on_post_resp(self, http_status, content_type, content):
        content = content.encode('utf-8')
        resp = b''
        resp += f'HTTP/1.0 {http_status}\r\n'.encode('ascii')
        resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Content-Type: {content_type}'.encode('ascii')
        resp += f'Content-Length: {len(content)}'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += content
        print(f'Response: {resp}')
        self.wfile.write(resp)

    def _on_post_resp_400(self, desc=''):
        content = f'''
<html>
<head><title>400 Bad Request</title></head>
<body>
<center><h1>400 Bad Request</h1></center>
<hr>
<center>Ruuvi Gateway</center>
<p>{desc}</p>
</body>
</html>
'''
        self._on_post_resp('400 Bad Request', 'text/html; charset=utf-8', content)

    def _on_post_resp_404(self):
        content = '''
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>Ruuvi Gateway</center>
</body>
</html>
'''
        self._on_post_resp('404 Not Found', 'text/html; charset=utf-8', content)

    def _on_post_resp_401(self, message=None):
        global g_flag_access_from_lan
        cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
        if g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_RUUVI or \
                g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DEFAULT:
            message = message if message is not None else ''
            resp_content = self._gen_auth_resp_content(g_flag_access_from_lan, message=message)
            resp_content_encoded = resp_content.encode('utf-8')
            resp = b''
            resp += f'HTTP/1.0 401 Unauthorized\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += g_login_session.generate_auth_header_fields().encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
            print(f'Response: {resp}')
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_BASIC:
            resp = b''
            resp += f'HTTP/1.0 401 Unauthorized\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'WWW-Authenticate: Basic realm="{RUUVI_AUTH_REALM}", charset="UTF-8"\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DIGEST:
            resp = b''
            resp += f'HTTP/1.0 401 Unauthorized\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')

            nonce_random = ''.join(random.choice(string.ascii_uppercase) for i in range(32))
            nonce = hashlib.sha256(nonce_random.encode('ascii')).hexdigest()
            opaque = hashlib.sha256(RUUVI_AUTH_REALM.encode('ascii')).hexdigest()

            resp += f'WWW-Authenticate: Digest realm="{RUUVI_AUTH_REALM}" qop="auth" nonce="{nonce}" opaque="{opaque}"\r\n'.encode(
                'ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        else:
            raise RuntimeError("Unsupported AuthType")

    @staticmethod
    def _prep_resp_200_ok(conent_type):
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: {conent_type}\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        return resp

    def _write_resp_json(self, resp_content):
        resp_content_encoded = resp_content.encode('utf-8')
        resp = self._prep_resp_200_ok('application/json')
        resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += resp_content_encoded
        print(f'Response: {resp}')
        self.wfile.write(resp)

    @staticmethod
    def _ecdh_handshake(pub_key):
        global g_aes_key
        if pub_key is None:
            g_aes_key = None
            return None
        ecdh_curve_name = 'secp256r1'
        ecdh_cli_pub_key = ECC.import_key(base64.b64decode(pub_key), curve_name=ecdh_curve_name)
        ecdh_keys = ECC.generate(curve=ecdh_curve_name)

        ecdh_shared_secret = ecdh_compute_shared_secret(ecdh_keys, ecdh_cli_pub_key.public_key())
        print(f'ECDH shared secret: {ecdh_shared_secret.to_bytes().hex()}')
        g_aes_key = hashlib.sha256(ecdh_shared_secret.to_bytes()).digest()
        print(f'AES key: {g_aes_key.hex()}')

        srv_pub_key_b64 = base64.b64encode(ecdh_keys.public_key().export_key(format='SEC1')).decode('utf-8')
        return srv_pub_key_b64

    def _ecdh_decrypt(self, aes_key, req_encrypted, req_iv, req_hash):
        cipher = AES.new(aes_key, AES.MODE_CBC, iv=base64.b64decode(req_iv))
        try:
            req_decrypted = Crypto.Util.Padding.unpad(cipher.decrypt(base64.b64decode(req_encrypted)), AES.block_size)
        except ValueError as ex:
            print(f'Error: Bad padding: {ex}')
            return None

        hash_actual = SHA256.new(req_decrypted).digest().hex()
        hash_expected = base64.b64decode(req_hash).hex()
        if hash_actual != hash_expected:
            print(f'Error: Verification failed')
            return None

        return req_decrypted.decode('utf-8')


    def _ecdh_decrypt_request(self, aes_key):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('ascii')
        try:
            req_dict = json.loads(post_data)
        except json.decoder.JSONDecodeError as ex:
            print(f'Error: Failed to load encrypted json: {ex}')
            return None
        try:
            req_encrypted = req_dict['encrypted']
            req_iv = req_dict['iv']
            req_hash = req_dict['hash']
        except KeyError as ex:
            print(f'Error: Bad encrypted json: {ex}')
            return None

        return self._ecdh_decrypt(aes_key, req_encrypted, req_iv, req_hash)


    def _ecdh_decrypt_request_json(self, aes_key):
        req_decrypted = self._ecdh_decrypt_request(aes_key)

        try:
            req_dict = json.loads(req_decrypted)
        except json.decoder.JSONDecodeError as ex:
            print(f'Error: Failed to load decrypted json: {ex}')
            return None
        return req_dict

    def _write_json_response(self, content):
        content_encoded = content.encode('utf-8')

        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json; charset=utf-8\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Content-Length: {len(content_encoded)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += content_encoded
        self.wfile.write(resp)

    def _do_post_auth(self):
        global g_ruuvi_dict
        global g_login_session
        global g_authorized_sessions
        global g_flag_access_from_lan
        if g_ruuvi_dict['lan_auth_type'] != LAN_AUTH_TYPE_RUUVI and g_ruuvi_dict['lan_auth_type'] != LAN_AUTH_TYPE_DEFAULT:
            self._on_post_resp_401()
            return
        cookie_str = self._get_value_from_headers('Cookie: ')
        if cookie_str is None:
            self._on_post_resp_401()
            return
        cookies_dict = self._parse_cookies(cookie_str)
        if COOKIE_RUUVISESSION not in cookies_dict:
            self._on_post_resp_401()
            return
        cookie_ruuvi_session = cookies_dict[COOKIE_RUUVISESSION]

        prev_url = None
        if COOKIE_RUUVI_PREV_URL in cookies_dict:
            prev_url = cookies_dict[COOKIE_RUUVI_PREV_URL]

        session = None
        if g_login_session is not None:
            if g_login_session.session_id == cookie_ruuvi_session:
                session = g_login_session
        if session is None:
            self._on_post_resp_401()
            return

        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('ascii')
        print(f'post_data: {post_data}')
        post_dict = json.loads(post_data)
        try:
            login = post_dict['login']
            password = post_dict['password']
        except KeyError:
            self._on_post_resp_401()
            return
        if login != g_ruuvi_dict['lan_auth_user']:
            print(f'User "{login}" is unknown')
            self._on_post_resp_401()
            return
        if login == '':
            self._on_post_resp_401()
            return
        encrypted_password = g_ruuvi_dict['lan_auth_pass']
        password_sha256 = hashlib.sha256(f'{session.challenge}:{encrypted_password}'.encode('ascii')).hexdigest()
        if password != password_sha256:
            print(f'User "{login}" password mismatch: expected {password_sha256}, got {password}')
            self._on_post_resp_401(message='Incorrect username or password')
            return

        g_authorized_sessions[session.session_id] = AuthorizedSession(login, session.session_id)
        g_login_session = None

        cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
        resp_content = self._gen_auth_resp_content(g_flag_access_from_lan)
        resp_content_encoded = resp_content.encode('utf-8')
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
        resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
        if prev_url is not None and prev_url != "":
            resp += f'Ruuvi-prev-url: {prev_url}\r\n'.encode('ascii')
            resp += f'Set-Cookie: {COOKIE_RUUVI_PREV_URL}=; Max-Age=-1; Expires=Thu, 01 Jan 1970 00:00:00 GMT\r\n'.encode(
                'ascii')
        resp += f'Content-type: application/json\r\n'.encode('ascii')
        resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += resp_content_encoded
        print(f'Response: {resp}')
        self.wfile.write(resp)

    def _do_post_connect_json(self):
        global g_ssid
        global g_password
        global g_timestamp
        global g_simulation_mode
        resp = b''
        req_dict = self._ecdh_decrypt_request_json(g_aes_key)
        if req_dict is None:
            resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: 0\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            print(f'Response: {resp}')
            self.wfile.write(resp)
            return
        ssid = req_dict['ssid']
        password = req_dict['password']
        if ssid is None and password is None:
            print(f'Try to connect to Ethernet')
            g_ssid = None
            g_password = None
            g_timestamp = time.time()
            resp_content = f'{{}}'
            resp_content_encoded = resp_content.encode('utf-8')
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
        elif ssid is None:
            resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: 0\r\n'.encode('ascii')
        else:
            print(f'Try to connect to SSID:{ssid} with password:{password}')
            if ssid == 'dlink-noauth-err-400':
                resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
                resp += f'Content-Length: 0\r\n'.encode('ascii')
            elif ssid == 'dlink-noauth-err-503':
                resp += f'HTTP/1.0 503 Service Unavailable\r\n'.encode('ascii')
                resp += f'Content-Length: 0\r\n'.encode('ascii')
            else:
                g_ssid = ssid
                g_password = password
                g_timestamp = time.time()
                g_simulation_mode = SIMULATION_MODE_NO_CONNECTION
                resp_content = f'{{}}'
                resp_content_encoded = resp_content.encode('utf-8')
                resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                resp += f'Content-type: application/json\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
                resp += resp_content_encoded
        print(f'Response: {resp}')
        self.wfile.write(resp)

    def _do_post_ruuvi_json(self):
        global g_ruuvi_dict
        global g_authorized_sessions
        req_dict = self._ecdh_decrypt_request_json(g_aes_key)
        if req_dict is None:
            resp = b''
            resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: {0}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
            return
        lan_auth_type = None
        lan_auth_user = None
        lan_auth_pass = None
        for key, value in req_dict.items():
            if key == 'http_pass':
                continue
            if key == 'http_bearer_token':
                continue
            if key == 'http_api_key':
                continue
            if key == 'http_stat_pass':
                continue
            if key == 'mqtt_pass':
                continue
            if key == 'lan_auth_type':
                lan_auth_type = value
                if value == LAN_AUTH_TYPE_DEFAULT:
                    lan_auth_user = LAN_AUTH_DEFAULT_USER
                    lan_auth_pass = g_lan_auth_default_password_hashed
                continue
            if key == 'lan_auth_user':
                if lan_auth_type != LAN_AUTH_TYPE_DEFAULT:
                    lan_auth_user = value
                continue
            if key == 'lan_auth_pass':
                if lan_auth_type != LAN_AUTH_TYPE_DEFAULT:
                    lan_auth_pass = value
                continue
            g_ruuvi_dict[key] = value

        if not g_ruuvi_dict['use_http']:
            g_ruuvi_dict.pop('http_url', None)
            g_ruuvi_dict.pop('http_auth', None)
            g_ruuvi_dict.pop('http_data_format', None)
            g_ruuvi_dict.pop('http_user', None)
            g_ruuvi_dict.pop('http_bearer_token', None)
            g_ruuvi_dict.pop('http_api_key', None)

        if 'http_auth' in g_ruuvi_dict:
            if g_ruuvi_dict['http_auth'] == 'none':
                g_ruuvi_dict.pop('http_user', None)
                g_ruuvi_dict.pop('http_bearer_token', None)
                g_ruuvi_dict.pop('http_api_key', None)
            elif g_ruuvi_dict['http_auth'] == 'basic':
                g_ruuvi_dict.pop('http_bearer_token', None)
                g_ruuvi_dict.pop('http_api_key', None)
            elif g_ruuvi_dict['http_auth'] == 'bearer':
                g_ruuvi_dict.pop('http_bearer_token', None)
            elif g_ruuvi_dict['http_auth'] == 'token':
                g_ruuvi_dict.pop('http_api_key', None)

        if lan_auth_type is not None:
            if g_ruuvi_dict['lan_auth_type'] != lan_auth_type or g_ruuvi_dict['lan_auth_user'] != lan_auth_user or \
                    g_ruuvi_dict['lan_auth_pass'] != lan_auth_pass:
                g_ruuvi_dict['lan_auth_type'] = lan_auth_type
                g_ruuvi_dict['lan_auth_user'] = lan_auth_user
                if lan_auth_pass is not None:
                    g_ruuvi_dict['lan_auth_pass'] = lan_auth_pass
                    print(f'Set LAN auth: {lan_auth_type}, {lan_auth_user}, {lan_auth_pass}')
                else:
                    lan_auth_pass = g_ruuvi_dict['lan_auth_pass']
                    print(f'Set LAN auth (prev password): {lan_auth_type}, {lan_auth_user}, {lan_auth_pass}')
                g_authorized_sessions = dict()

        content = '{}'
        self._write_json_response(content)

    def _do_post_bluetooth_scanning_json(self):
        req_dict = self._ecdh_decrypt_request_json(g_aes_key)
        if req_dict is None:
            resp = b''
            resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: {0}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
            return
        for key, value in req_dict.items():
            print(f'Bluetooth scanning: "{key}": "{value}"')
        content = '{}'
        self._write_json_response(content)

    def _do_post_gw_cfg_download(self):
        global g_ruuvi_dict
        resp = b''
        try:
            response = urllib.request.urlopen(g_ruuvi_dict['remote_cfg_url'])
        except urllib.error.HTTPError as ex:
            resp += f'HTTP/1.0 {ex.code} {ex.msg}\r\n'.encode('ascii')
            resp += f'Content-Length: 0\r\n'.encode('ascii')
            self.wfile.write(resp)
            return
        except:
            resp += f'HTTP/1.0 503 Service Unavailable\r\n'.encode('ascii')
            resp += f'Content-Length: 0\r\n'.encode('ascii')
            self.wfile.write(resp)
            return
        response_data = response.read()
        response_text = response_data.decode('utf-8')
        content = '{}'
        content_encoded = content.encode('utf-8')
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Content-Length: {len(content_encoded)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += content_encoded
        self.wfile.write(resp)

    def _do_post_fw_update_json(self):
        global g_software_update_url
        global g_software_update_stage
        global g_software_update_percentage
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('ascii')
        new_dict = json.loads(post_data)
        g_software_update_url = new_dict['url']
        if g_software_update_url.startswith('http://'):
            content = '{"status": 400, "message": "Invalid URL"}'
        else:
            g_software_update_stage = SOFTWARE_UPDATE_STAGE_1_DOWNLOAD_MAIN_FW
            g_software_update_percentage = 0
            content = '{"status": 200, "message": "OK"}'
        self._write_json_response(content)

    def _do_post_fw_update_url_json(self):
        global g_ruuvi_dict
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length).decode('ascii')
        new_dict = json.loads(post_data)
        g_ruuvi_dict['fw_update_url'] = new_dict['url']
        content = '{"status": 200, "message": "OK"}'
        self._write_json_response(content)

    def _do_post_fw_update_reset(self):
        global g_software_update_stage
        global g_software_update_percentage
        g_software_update_stage = SOFTWARE_UPDATE_STAGE_0_NONE
        g_software_update_percentage = 0
        content = '{}'
        self._write_json_response(content)

    def _do_post_init_storage(self):
        g_ruuvi_dict['storage']['storage_ready'] = True
        resp = b''
        content = '{}'
        content_encoded = content.encode('utf-8')
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Content-Length: {len(content_encoded)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += content_encoded
        time.sleep(1.5)
        self.wfile.write(resp)

    def _do_post_ssl_cert(self, query_params):
        file_name = query_params.get("file", [None])[0]
        if file_name is None:
            self._on_post_resp_400()
            return
        file_content = self._ecdh_decrypt_request(g_aes_key)

        if file_name == 'http_cli_cert':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'stat_cli_cert':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'rcfg_cli_cert':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'mqtt_cli_cert':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'http_cli_key':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'stat_cli_key':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'rcfg_cli_key':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'mqtt_cli_key':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'http_srv_cert':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'stat_srv_cert':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'rcfg_srv_cert':
            g_ruuvi_dict['storage'][file_name] = True
        elif file_name == 'mqtt_srv_cert':
            g_ruuvi_dict['storage'][file_name] = True
        else:
            self._on_post_resp_400()
            return

        content = '{}'
        content_encoded = content.encode('utf-8')
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Content-Length: {len(content_encoded)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += content_encoded
        self.wfile.write(resp)

    def do_POST(self):
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)

        print(f'POST {parsed_url.path}, Query: {parsed_url.query}')
        if self.path == '/auth':
            self._do_post_auth()
        elif self.path == '/connect.json':
            self._do_post_connect_json()
        elif self.path == '/ruuvi.json':
            self._do_post_ruuvi_json()
        elif self.path == '/bluetooth_scanning.json':
            self._do_post_bluetooth_scanning_json()
        elif self.path == '/gw_cfg_download':
            self._do_post_gw_cfg_download()
        elif self.path == '/fw_update.json':
            self._do_post_fw_update_json()
        elif self.path == '/fw_update_url.json':
            self._do_post_fw_update_url_json()
        elif self.path == '/fw_update_reset':
            self._do_post_fw_update_reset()
        elif self.path == '/init_storage':
            self._do_post_init_storage()
        elif parsed_url.path == '/ssl_cert':
            self._do_post_ssl_cert(query_params)
        else:
            resp = b''
            resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: {0}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        return

    def do_DELETE(self):
        global g_ssid
        global g_saved_ssid
        global g_password
        global g_timestamp
        global g_simulation_mode
        global g_ruuvi_dict
        global g_login_session
        global g_authorized_sessions

        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)

        print(f'DELETE {parsed_url.path}, Query: {parsed_url.query}')
        if self.path == '/auth':
            if g_ruuvi_dict['lan_auth_type'] != LAN_AUTH_TYPE_RUUVI and g_ruuvi_dict['lan_auth_type'] != LAN_AUTH_TYPE_DEFAULT:
                self._on_post_resp_401()
                return
            cookie_str = self._get_value_from_headers('Cookie: ')
            if cookie_str is not None:
                cookies_dict = self._parse_cookies(cookie_str)
                if COOKIE_RUUVISESSION in cookies_dict:
                    cookie_ruuvi_session = cookies_dict[COOKIE_RUUVISESSION]
                    if cookie_ruuvi_session in g_authorized_sessions:
                        del g_authorized_sessions[cookie_ruuvi_session]
                    if g_login_session is not None:
                        if cookie_ruuvi_session == g_login_session.session_id:
                            g_login_session = None
            resp_content = f'{{}}'
            resp_content_encoded = resp_content.encode('utf-8')
            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
            self.wfile.write(resp)
        elif self.path == '/connect.json':
            g_timestamp = None
            g_simulation_mode = SIMULATION_MODE_USER_DISCONNECT

            content = '{}'
            self._write_json_response(content)
        elif parsed_url.path == '/ssl_cert':
            file_name = query_params.get("file", [None])[0]
            if file_name is None:
                self._on_post_resp_400()
                return

            if file_name == 'http_cli_cert':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'stat_cli_cert':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'rcfg_cli_cert':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'mqtt_cli_cert':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'http_cli_key':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'stat_cli_key':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'rcfg_cli_key':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'mqtt_cli_key':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'http_srv_cert':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'stat_srv_cert':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'rcfg_srv_cert':
                g_ruuvi_dict['storage'][file_name] = False
            elif file_name == 'mqtt_srv_cert':
                g_ruuvi_dict['storage'][file_name] = False
            else:
                self._on_post_resp_400()
                return

            content = '{}'
            content_encoded = content.encode('utf-8')
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'Content-Length: {len(content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += content_encoded
            self.wfile.write(resp)
        else:
            resp = b''
            resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: {0}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        return

    def _get_content_type(self, file_path):
        if file_path.endswith('.html'):
            content_type = 'text/html'
        elif file_path.endswith('.css'):
            content_type = 'text/css'
        elif file_path.endswith('.scss'):
            content_type = 'text/css'
        elif file_path.endswith('.js'):
            content_type = 'text/javascript'
        elif file_path.endswith('.png'):
            content_type = 'image/png'
        elif file_path.endswith('.svg'):
            content_type = 'image/svg+xml'
        elif file_path.endswith('.ttf'):
            content_type = 'application/octet-stream'
        else:
            content_type = 'application/octet-stream'
        return content_type

    def _chunk_generator(self):
        # generate some chunks
        for i in range(10):
            time.sleep(.1)
            yield f"this is chunk: {i}\r\n"

    def _write_chunk(self, chunk):
        tosend = f'{len(chunk):x}\r\n{chunk}\r\n'
        self.wfile.write(tosend.encode('ascii'))

    @staticmethod
    def _generate_status_json(urc, ssid, ip='0', netmask='0', gw='0', fw_updating_stage=0,
                              percentage=0, fw_updating_msg=None):
        if fw_updating_stage == 0:
            return f'{{{ssid},"ip":"{ip}","netmask":"{netmask}","gw":"{gw}","urc":{urc}}}'
        else:
            if fw_updating_msg is None:
                return f'{{{ssid},"ip":"{ip}","netmask":"{netmask}","gw":"{gw}","urc":{urc},"extra":{{"fw_updating":{fw_updating_stage},"percentage":{percentage}}}}}'
            else:
                return f'{{{ssid},"ip":"{ip}","netmask":"{netmask}","gw":"{gw}","urc":{urc},"extra":{{"fw_updating":{fw_updating_stage},"percentage":{percentage}, "message":"{fw_updating_msg}"}}}}'

    def _check_auth(self):
        global g_ruuvi_dict
        global g_login_session
        if g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DENY:
            return False
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_RUUVI or \
                g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DEFAULT:
            cookie_str = self._get_value_from_headers('Cookie: ')
            session_id = None
            if cookie_str is not None:
                cookies_dict = self._parse_cookies(cookie_str)
                if COOKIE_RUUVISESSION in cookies_dict:
                    cookie_ruuvi_session = cookies_dict[COOKIE_RUUVISESSION]
                    if cookie_ruuvi_session in g_authorized_sessions:
                        session_id = cookie_ruuvi_session
            if session_id is not None:
                return True
            return False
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_BASIC:
            authorization_str = self._get_value_from_headers('Authorization: ')
            if authorization_str is None:
                return False
            auth_prefix = 'Basic '
            if not authorization_str.startswith(auth_prefix):
                return False
            auth_token = authorization_str[len(auth_prefix):]
            try:
                user_password_str = base64.b64decode(auth_token).decode('utf-8')
            except binascii.Error:
                return False
            if not user_password_str.startswith(f"{g_ruuvi_dict['lan_auth_user']}:"):
                return False
            if auth_token != g_ruuvi_dict['lan_auth_pass']:
                return False
            return True
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DIGEST:
            authorization_str = self._get_value_from_headers('Authorization: ')
            if authorization_str is None:
                return False
            digest_auth = DigestAuth()
            if not digest_auth.parse_authorization_str(authorization_str):
                return False
            if digest_auth.username != g_ruuvi_dict['lan_auth_user']:
                return False
            if not digest_auth.check_password(g_ruuvi_dict['lan_auth_pass']):
                return False
            return True
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_ALLOW:
            return True
        else:
            raise RuntimeError("Unsupported Auth")

    def _gen_auth_resp_content(self, flag_access_from_lan, message=None):
        flag_access_from_lan = 1 if flag_access_from_lan else 0

        lan_auth_type = g_ruuvi_dict['lan_auth_type']
        if message is None:
            resp_content = f'{{"gateway_name": "{RUUVI_AUTH_REALM}", "fw_ver": "{g_fw_ver}", "nrf52_fw_ver": "{g_nrf52_fw_ver}", "lan_auth_type": "{lan_auth_type}", "lan":{flag_access_from_lan}}}'
        else:
            resp_content = f'{{"gateway_name": "{RUUVI_AUTH_REALM}", "fw_ver": "{g_fw_ver}", "nrf52_fw_ver": "{g_nrf52_fw_ver}", "lan_auth_type": "{lan_auth_type}", "lan":{flag_access_from_lan}, "message": "{message}"}}'
        return resp_content

    def _do_get_auth(self):
        global g_ruuvi_dict
        global g_login_session
        global g_flag_access_from_lan
        print(f"LAN auth: {g_ruuvi_dict['lan_auth_type']}")
        pub_key_b64_cli = self._ecdh_handshake(self._get_value_from_headers('ruuvi_ecdh_pub_key: '))

        if g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DENY:
            print(f"Resp: 403 Forbidden")
            resp = b''
            resp += f'HTTP/1.0 403 Forbidden\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')

            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp_content = self._gen_auth_resp_content(g_flag_access_from_lan)
            resp_content_encoded = resp_content.encode('utf-8')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_RUUVI or g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DEFAULT:
            cookie_str = self._get_value_from_headers('Cookie: ')
            session_id = None
            if cookie_str is not None:
                cookies_dict = self._parse_cookies(cookie_str)
                if COOKIE_RUUVISESSION in cookies_dict:
                    cookie_ruuvi_session = cookies_dict[COOKIE_RUUVISESSION]
                    print(f"Cookie session ID: {cookie_ruuvi_session}")
                    if cookie_ruuvi_session in g_authorized_sessions:
                        session_id = cookie_ruuvi_session
            # if True or session_id is not None:
            print(f"Session ID: {session_id}")
            if session_id is not None:
                print(f"Resp: 200 OK")
                resp = b''
                resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            else:
                print(f"Resp: 401 Unauthorized")
                g_login_session = LoginSession()
                resp = b''
                resp += f'HTTP/1.0 401 Unauthorized\r\n'.encode('ascii')
                resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
                resp += g_login_session.generate_auth_header_fields().encode('ascii')

            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            if pub_key_b64_cli is not None:
                resp += f'ruuvi_ecdh_pub_key: {pub_key_b64_cli}\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp_content = self._gen_auth_resp_content(g_flag_access_from_lan)
            resp_content_encoded = resp_content.encode('utf-8')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_BASIC:
            authorization_str = self._get_value_from_headers('Authorization: ')
            print(f"Authorization: {authorization_str}")
            if authorization_str is None:
                self._on_post_resp_401()
                return
            auth_prefix = 'Basic '
            if not authorization_str.startswith(auth_prefix):
                self._on_post_resp_401()
                return
            auth_token = authorization_str[len(auth_prefix):]
            try:
                user_password_str = base64.b64decode(auth_token).decode('utf-8')
            except binascii.Error:
                self._on_post_resp_401()
                return
            if not user_password_str.startswith(f"{g_ruuvi_dict['lan_auth_user']}:"):
                self._on_post_resp_401()
                return
            if auth_token != g_ruuvi_dict['lan_auth_pass']:
                self._on_post_resp_401()
                return

            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            if pub_key_b64_cli is not None:
                resp += f'ruuvi_ecdh_pub_key: {pub_key_b64_cli}\r\n'.encode('ascii')
            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp_content = self._gen_auth_resp_content(g_flag_access_from_lan)
            resp_content_encoded = resp_content.encode('utf-8')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DIGEST:
            authorization_str = self._get_value_from_headers('Authorization: ')
            if authorization_str is None:
                self._on_post_resp_401()
                return
            digest_auth = DigestAuth()
            if not digest_auth.parse_authorization_str(authorization_str):
                self._on_post_resp_401()
                return
            if digest_auth.username != g_ruuvi_dict['lan_auth_user']:
                self._on_post_resp_401()
                return
            if not digest_auth.check_password(g_ruuvi_dict['lan_auth_pass']):
                self._on_post_resp_401()
                return

            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            if pub_key_b64_cli is not None:
                resp += f'ruuvi_ecdh_pub_key: {pub_key_b64_cli}\r\n'.encode('ascii')
            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp_content = self._gen_auth_resp_content(g_flag_access_from_lan)
            resp_content_encoded = resp_content.encode('utf-8')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_ALLOW:
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            if pub_key_b64_cli is not None:
                resp += f'ruuvi_ecdh_pub_key: {pub_key_b64_cli}\r\n'.encode('ascii')
            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp_content = self._gen_auth_resp_content(g_flag_access_from_lan)
            resp_content_encoded = resp_content.encode('utf-8')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content_encoded
            self.wfile.write(resp)
        else:
            raise RuntimeError("Unsupported Auth")

    def _resp_200_json_empty(self):
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
        cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
        resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        content_type = 'application/json'
        resp += f'Content-type: {content_type}\r\n'.encode('ascii')
        content = '{}'
        resp += f'Content-Length: {len(content)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _resp_200_json_validate_url_status(self, status, message=None, json=None):
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
        cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
        resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        content_type = 'application/json'
        resp += f'Content-type: {content_type}\r\n'.encode('ascii')
        if message is not None:
            content = f'{{"status": {status}, "message": "{message}"}}'
        elif json is not None:
            content = f'{{"status": {status}, "json": {json}}}'
        else:
            content = f'{{"status": {status}}}'
        resp += f'Content-Length: {len(content)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _resp_200_json_validate_url_status_incorrect_json(self, status, message=None):
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
        cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
        resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        content_type = 'application/json'
        resp += f'Content-type: {content_type}\r\n'.encode('ascii')
        if message is None:
            content = f'{{"status: {status}}}'
        else:
            content = f'{{"status: {status}, "message": "{message}"}}'
        resp += f'Content-Length: {len(content)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _resp_400(self):
        resp = b''
        resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
        resp += f'Content-Length: 0\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        print(f'Response: {resp}')
        self.wfile.write(resp)

    def _resp_401(self):
        resp = b''
        resp += f'HTTP/1.0 401 Unauthorized\r\n'.encode('ascii')
        resp += f'WWW-Authenticate: Basic realm="Test"'.encode('ascii')
        resp += f'Content-Length: 0\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        print(f'Response: {resp}')
        self.wfile.write(resp)

    def _resp_500(self):
        content = '{}'
        resp = b''
        resp += f'HTTP/1.0 500 Internal Server Error\r\n'.encode('ascii')
        resp += f'Content-type: application/json; charset=utf-8\r\n'.encode('ascii')
        resp += f'Content-Length: {len(content)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += content.encode('ascii')
        print(f'Response: {resp}')
        self.wfile.write(resp)

    def _validate_url_check_post_advs(self, url, user, password):
        if url == 'http://':
            return self._resp_500()
        elif url == 'http://qwe':
            return
        elif url == 'http://asd':
            return self._resp_200_json_validate_url_status_incorrect_json(200)
        elif url == 'https://network.ruuvi.com/record':
            return self._resp_200_json_validate_url_status(200)
        elif url == 'https://network2.ruuvi.com/record':
            return self._resp_200_json_validate_url_status(200)
        elif url == 'https://network.ruuvi.com/record1':
            if user is None or password is None:
                return self._resp_200_json_validate_url_status(401)
            elif user == 'user1' and (password is None or password == 'pass1'):
                return self._resp_200_json_validate_url_status(200)
            return self._resp_200_json_validate_url_status(401)
        return self._resp_200_json_validate_url_status(400, "Error description")

    def _validate_url_check_post_stat(self, url, user, password):
        if url == 'https://network.ruuvi.com/status':
            return self._resp_200_json_validate_url_status(200)
        elif url == 'https://network.ruuvi.com/status1':
            if user is None or password is None:
                return self._resp_200_json_validate_url_status(401)
            elif user == 'user1' and (password is None or password == 'pass1'):
                return self._resp_200_json_validate_url_status(200)
            return self._resp_200_json_validate_url_status(401)
        return self._resp_200_json_validate_url_status(400, "Error description")

    def _validate_url_check_mqtt(self, url, user, password, topic_prefix, client_id):
        if url == 'mqtt://test.mosquitto.org:1883':
            if user is None and password is None:
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)
        elif url == 'mqtt://test.mosquitto.org:1884':
            if user == 'rw' and (password is None or password == 'readwrite'):
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)

        elif url == 'mqtts://test.mosquitto.org:8886':
            if user is None and password is None:
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)
        elif url == 'mqtts://test.mosquitto.org:1885':
            if user == 'rw' and (password is None or password == 'readwrite'):
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)

        elif url == 'mqttws://test.mosquitto.org:8080':
            if user is None and password is None:
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)
        elif url == 'mqttws://test.mosquitto.org:8090':
            if user == 'rw' and (password is None or password == 'readwrite'):
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)

        elif url == 'mqttwss://test.mosquitto.org:8081':
            if user is None and password is None:
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)
        elif url == 'mqttwss://test.mosquitto.org:8091':
            if user == 'rw' and (password is None or password == 'readwrite'):
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)

        return self._resp_200_json_validate_url_status(400, "Error description")

    def _validate_url_check_remote_cfg(self, url, user, password, auth_type):
        if url == 'http://192.168.1.100':
            if auth_type == 'none' and user is None and password is None:
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)

        elif url == 'http://192.168.1.101':
            if auth_type == 'basic' and user is not None and user == 'user1' and password is not None and password == 'pass1':
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)

        elif url == 'http://192.168.1.102':
            if auth_type == 'bearer' and user is None and password is not None and password == 'token123':
                return self._resp_200_json_validate_url_status(200)
            else:
                return self._resp_200_json_validate_url_status(401)

        return self._resp_200_json_validate_url_status(400, "Error description")

    def _validate_url_check_check_fw_update_url(self, url):
        if url == 'https://network.ruuvi.com/firmwareupdate':
            return self._resp_200_json_validate_url_status(200, json=g_content_firmware_update_json)
        if url == 'https://network2.ruuvi.com/firmwareupdate':
            return self._resp_200_json_validate_url_status(200, json=g_content_firmware_update_json2)
        elif url == 'https://network.ruuvi.com/firmwareupdate2':
            return self._resp_200_json_validate_url_status(404, "{\\\"message\\\":\\\"Not Found\\\"}" )
        elif url == 'https://network.ruuvi2.com/firmwareupdate':
            return self._resp_200_json_validate_url_status(502, "Failed to resolve hostname")
        return self._resp_200_json_validate_url_status(400, "Error description")

    def _validate_url(self, url_with_params):
        parsed_url = urlparse(url_with_params)
        url = parse_qs(parsed_url.query)['url'][0]
        validate_type = parse_qs(parsed_url.query)['validate_type'][0]
        try:
            user = parse_qs(parsed_url.query)['user'][0]
        except KeyError:
            user = None
        try:
            encrypted_password = parse_qs(parsed_url.query)['encrypted_password'][0]
        except KeyError:
            encrypted_password = None

        password = None
        if encrypted_password is not None:
            try:
                encrypted_password_iv = parse_qs(parsed_url.query)['encrypted_password_iv'][0]
                encrypted_password_hash = parse_qs(parsed_url.query)['encrypted_password_hash'][0]
            except KeyError:
                return self._resp_400()
            password = self._ecdh_decrypt(g_aes_key, encrypted_password, encrypted_password_iv, encrypted_password_hash)
            if password is None:
                return self._resp_400()

        if validate_type == 'check_post_advs':
            return self._validate_url_check_post_advs(url, user, password)
        elif validate_type == 'check_post_stat':
            return self._validate_url_check_post_stat(url, user, password)
        elif validate_type == 'check_mqtt':
            return self._validate_url_check_mqtt(url, user, password, parse_qs(parsed_url.query)['mqtt_topic_prefix'][0],
                                                 parse_qs(parsed_url.query)['mqtt_client_id'][0])
        elif validate_type == 'check_remote_cfg':
            return self._validate_url_check_remote_cfg(url, user, password, parse_qs(parsed_url.query)['auth_type'][0])
        elif validate_type == 'check_fw_update_url':
            return self._validate_url_check_check_fw_update_url(url)
        return self._resp_400()

    def _do_get_ruuvi_json(self, resp):
        resp += f'\r\n'.encode('ascii')
        ruuvi_dict = copy.deepcopy(g_ruuvi_dict)
        if 'http_pass' in ruuvi_dict:
            del ruuvi_dict['http_pass']
        if 'http_stat_pass' in ruuvi_dict:
            del ruuvi_dict['http_stat_pass']
        if 'mqtt_pass' in ruuvi_dict:
            del ruuvi_dict['mqtt_pass']
        if 'lan_auth_pass' in ruuvi_dict:
            del ruuvi_dict['lan_auth_pass']
        if 'remote_cfg_auth_basic_pass' in ruuvi_dict:
            del ruuvi_dict['remote_cfg_auth_basic_pass']
        if 'remote_cfg_auth_bearer_token' in ruuvi_dict:
            del ruuvi_dict['remote_cfg_auth_bearer_token']

        if 'lan_auth_type' in ruuvi_dict:
            if ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_RUUVI and \
                    g_ruuvi_dict['lan_auth_user'] == LAN_AUTH_DEFAULT_USER and \
                    g_ruuvi_dict['lan_auth_pass'] == g_lan_auth_default_password_hashed:
                g_ruuvi_dict['lan_auth_type'] = LAN_AUTH_TYPE_DEFAULT
        if 'lan_auth_api_key' in ruuvi_dict:
            if ruuvi_dict['lan_auth_api_key'] != "":
                ruuvi_dict['lan_auth_api_key_use'] = True
            else:
                ruuvi_dict['lan_auth_api_key_use'] = False
            del ruuvi_dict['lan_auth_api_key']
        if 'lan_auth_api_key_rw' in ruuvi_dict:
            if ruuvi_dict['lan_auth_api_key_rw'] != "":
                ruuvi_dict['lan_auth_api_key_rw_use'] = True
            else:
                ruuvi_dict['lan_auth_api_key_rw_use'] = False
            del ruuvi_dict['lan_auth_api_key_rw']

        content = json.dumps(ruuvi_dict)
        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _do_get_ap_json(self, resp):
        global g_auto_toggle_cnt
        resp += f'\r\n'.encode('ascii')
        if True or g_auto_toggle_cnt <= 3:
            content = '''[
        {"ssid":"Pantum-AP-A6D49F","chan":11,"rssi":-55,"auth":4},
        {"ssid":"a0308","chan":1,"rssi":-56,"auth":3},
        {"ssid":"dlink-noauth","chan":11,"rssi":-82,"auth":0},
        {"ssid":"dlink-noauth-err-400","chan":7,"rssi":-85,"auth":0},
        {"ssid":"dlink-noauth-err-503","chan":7,"rssi":-85,"auth":0},
        {"ssid":"SINGTEL-5171","chan":9,"rssi":-88,"auth":4},
        {"ssid":"1126-1","chan":11,"rssi":-89,"auth":4},
        {"ssid":"SINGTEL-5171","chan":10,"rssi":-88,"auth":0},
        {"ssid":"The Shah 5GHz-2","chan":1,"rssi":-90,"auth":3},
        {"ssid":"SINGTEL-1D28 (2G)","chan":11,"rssi":-91,"auth":3},
        {"ssid":"dlink-F864","chan":1,"rssi":-92,"auth":4},
        {"ssid":"dlink-74F0","chan":1,"rssi":-93,"auth":4}
        ] '''
        elif g_auto_toggle_cnt <= 6:
            content = '''[
        {"ssid":"Pantum-AP-A6D49F","chan":11,"rssi":-55,"auth":4},
        {"ssid":"dlink-noauth","chan":11,"rssi":-82,"auth":0},
        {"ssid":"dlink-noauth-err-400","chan":7,"rssi":-85,"auth":0},
        {"ssid":"dlink-noauth-err-503","chan":7,"rssi":-85,"auth":0},
        {"ssid":"SINGTEL-5171","chan":9,"rssi":-88,"auth":4},
        {"ssid":"1126-1","chan":11,"rssi":-89,"auth":4},
        {"ssid":"SINGTEL-5171","chan":10,"rssi":-88,"auth":0},
        {"ssid":"The Shah 5GHz-2","chan":1,"rssi":-90,"auth":3},
        {"ssid":"SINGTEL-1D28 (2G)","chan":11,"rssi":-91,"auth":3},
        {"ssid":"dlink-74F0","chan":1,"rssi":-93,"auth":4}
        ] '''
        else:
            content = '[]'
        g_auto_toggle_cnt += 1
        if g_auto_toggle_cnt >= 9:
            g_auto_toggle_cnt = 0
        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        time.sleep(GET_AP_JSON_TIMEOUT)
        self.wfile.write(resp)

    def _do_get_status_json(self, resp):
        global g_software_update_stage
        global g_software_update_percentage

        resp += f'\r\n'.encode('ascii')
        if g_ssid is None:
            ssid_key_with_val = '"ssid":null'
        else:
            ssid_key_with_val = f'"ssid":"{g_ssid}"'
        if g_simulation_mode == SIMULATION_MODE_NO_CONNECTION:
            content = '{}'
        elif g_simulation_mode == SIMULATION_MODE_ETH_CONNECTED or g_simulation_mode == SIMULATION_MODE_WIFI_CONNECTED:
            if g_simulation_mode == SIMULATION_MODE_ETH_CONNECTED:
                if g_ruuvi_dict['eth_dhcp']:
                    ip = '192.168.100.119'
                    netmask = '255.255.255.0'
                    gw = '192.168.100.1'
                else:
                    ip = g_ruuvi_dict['eth_static_ip']
                    netmask = g_ruuvi_dict['eth_netmask']
                    gw = g_ruuvi_dict['eth_gw']
            else:
                ip = '192.168.1.119'
                netmask = '255.255.255.0'
                gw = '192.168.1.1'

            fw_updating_msg = None
            if SOFTWARE_UPDATE_STAGE_0_NONE < g_software_update_stage <= SOFTWARE_UPDATE_STAGE_3_DOWNLOAD_NRF52:
                g_software_update_percentage += 10
                if g_software_update_percentage >= 100:
                    g_software_update_percentage = 0
                    g_software_update_stage += 1
                    if g_software_update_stage == SOFTWARE_UPDATE_STAGE_4_FLASH_NRF52:
                        g_software_update_stage = SOFTWARE_UPDATE_STAGE_5_COMPLETED_SUCCESSFULLY
            elif g_software_update_stage == SOFTWARE_UPDATE_STAGE_4_FLASH_NRF52:
                g_software_update_percentage += 10
                if g_software_update_percentage >= 100:
                    g_software_update_percentage = 0
                    g_software_update_stage = SOFTWARE_UPDATE_STAGE_7_FLASHING_NRF52_FAILED
            if g_software_update_stage == SOFTWARE_UPDATE_STAGE_6_DOWNLOADING_FAILED:
                fw_updating_msg = "Failed to download firmware"
            elif g_software_update_stage == SOFTWARE_UPDATE_STAGE_7_FLASHING_NRF52_FAILED:
                fw_updating_msg = "Failed to update nRF52 firmware"

            content = self._generate_status_json(STATUS_JSON_URC_CONNECTED,
                                                 ssid_key_with_val, ip, netmask, gw, g_software_update_stage,
                                                 g_software_update_percentage, fw_updating_msg=fw_updating_msg)

        elif g_simulation_mode == SIMULATION_MODE_WIFI_FAILED_ATTEMPT:
            content = self._generate_status_json(STATUS_JSON_URC_WIFI_FAILED_ATTEMPT,
                                                 ssid_key_with_val)
        elif g_simulation_mode == SIMULATION_MODE_USER_DISCONNECT:
            content = self._generate_status_json(STATUS_JSON_URC_USER_DISCONNECT,
                                                 ssid_key_with_val)
        elif g_simulation_mode == SIMULATION_MODE_LOST_CONNECTION:
            content = self._generate_status_json(STATUS_JSON_URC_LOST_CONNECTION,
                                                 ssid_key_with_val)
        else:
            content = ''
        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _do_get_firmware_update_json(self):
        content = g_content_firmware_update_json
        time.sleep(GET_FIRMWARE_UPDATE_TIMEOUT)
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json; charset=utf-8\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Content-Length: {len(content)}\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')

        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _do_get_firmware_update_without_len_json(self):
        content = g_content_firmware_update_json
        time.sleep(10.0)
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json; charset=utf-8\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')

        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _do_get_firmware_update_chunked_json(self):
        chunk1 = g_content_firmware_update_json[:10]
        chunk2 = g_content_firmware_update_json[10:5000]
        chunk3 = g_content_firmware_update_json[5000:]
        content = ''
        content += f'{len(chunk1):x}\r\n'
        content += chunk1
        content += '\r\n'
        content += f'{len(chunk2):x}\r\n'
        content += chunk2
        content += '\r\n'
        content += f'{len(chunk3):x}\r\n'
        content += chunk3
        content += '\r\n'
        content += f'0\r\n\r\n'

        time.sleep(10.0)
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json; charset=utf-8\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Transfer-Encoding: chunked\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')

        print(f'Resp: {content}')
        resp += content.encode('utf-8')
        self.wfile.write(resp)

    def _do_get_metrics(self, file_path):
            if not self._check_auth():
                lan_auth_type = g_ruuvi_dict['lan_auth_type']
                if lan_auth_type == LAN_AUTH_TYPE_RUUVI or lan_auth_type == LAN_AUTH_TYPE_DEFAULT \
                        or lan_auth_type == LAN_AUTH_TYPE_DENY:
                    resp = b''
                    resp += f'HTTP/1.0 302 Found\r\n'.encode('ascii')
                    resp += f'Location: {"/#auth"}\r\n'.encode('ascii')
                    resp += f'Server: {"Ruuvi Gateway"}\r\n'.encode('ascii')
                    resp += f'Set-Cookie: {COOKIE_RUUVI_PREV_URL}={file_path}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    self.wfile.write(resp)
                    return
                else:
                    self._do_get_auth()
                    return
            content = '''ruuvigw_received_advertisements 18940
    ruuvigw_uptime_us 12721524523
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_EXEC"} 197596
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_32BIT"} 200392
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_8BIT"} 132212
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_DMA"} 132212
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_PID2"} 0
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_PID3"} 0
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_PID4"} 0
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_PID5"} 0
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_PID6"} 0
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_PID7"} 0
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_SPIRAM"} 0
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_INTERNAL"} 200392
    ruuvigw_heap_free_bytes{capability="MALLOC_CAP_DEFAULT"} 132212
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_EXEC"} 93756
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_32BIT"} 93756
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_8BIT"} 93756
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_DMA"} 93756
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_PID2"} 0
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_PID3"} 0
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_PID4"} 0
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_PID5"} 0
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_PID6"} 0
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_PID7"} 0
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_SPIRAM"} 0
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_INTERNAL"} 93756
    ruuvigw_heap_largest_free_block_bytes{capability="MALLOC_CAP_DEFAULT"} 93756
                '''
            content_encoded = content.encode('utf-8')
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: text/plain; charset=utf-8; version=0.0.4\r\n'.encode('ascii')
            resp += f'Content-Length: {len(content_encoded)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += content_encoded
            self.wfile.write(resp)

    def _do_get_history(self):
        global g_flag_toggle_history_json
        g_flag_toggle_history_json = not g_flag_toggle_history_json
        if g_flag_toggle_history_json:
            content = '''
{
	"data":	{
		"coordinates":	"",
		"timestamp":	"1683166503",
		"gw_mac":	"C8:25:2D:8E:9C:2C",
		"tags":	{
			"F4:1F:0C:28:CB:D6":	{
				"rssi":	-39,
				"timestamp":	"1683166503",
				"data":	"0201061BFF99040513CE4910C6F20004FFB803E069F6125BC3F41F0C28CBD6"
			},
			"C6:A5:B9:E0:AD:06":	{
				"rssi":	-63,
				"timestamp":	"1683166503",
				"data":	"0201061BFF99040512E84A93C6C5002C0004041C9C76A87980C6A5B9E0AD06"
			},
			"E3:75:CF:37:4E:23":	{
				"rssi":	-54,
				"timestamp":	"1683166503",
				"data":	"0201061BFF99040513384BFEC677FFEC001403E09C76023B97E375CF374E23"
			}
		}
	}
}
            '''
        else:
            content = '''
        {
        	"data":	{
        		"coordinates":	"",
        		"timestamp":	"1683166503",
        		"gw_mac":	"C8:25:2D:8E:9C:2C",
        		"tags":	{
        			"F4:1F:0C:28:CB:D6":	{
        				"rssi":	-39,
        				"timestamp":	"1683166503",
        				"data":	"0201061BFF99040513CE4910C6F20004FFB803E069F6125BC3F41F0C28CBD6"
        			},
        			"C6:A5:B9:E0:AD:06":	{
        				"rssi":	-63,
        				"timestamp":	"1683166503",
        				"data":	"0201061BFF99040512E84A93C6C5002C0004041C9C76A87980C6A5B9E0AD06"
        			}
        		}
        	}
        }
                    '''
        time.sleep(GET_HISTORY_JSON_TIMEOUT)
        self._write_json_response(content)

    def do_GET(self):
        global g_ruuvi_dict
        global g_login_session
        print('GET %s' % self.path)
        file_path = self.path.split('?')[0]
        if file_path == '/auth':
            self._do_get_auth()
            return
        elif file_path.endswith('.json'):
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json; charset=utf-8\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            if file_path == '/ruuvi.json':
                self._do_get_ruuvi_json(resp)
            elif file_path == '/ap.json':
                self._do_get_ap_json(resp)
            elif file_path == '/status.json':
                self._do_get_status_json(resp)
            elif file_path == '/firmware_update.json':
                self._do_get_firmware_update_json()
            elif file_path == '/firmware_update_without_len.json':
                self._do_get_firmware_update_without_len_json()
            elif file_path == '/firmware_update_chunked.json':
                self._do_get_firmware_update_chunked_json()
            else:
                resp = b''
                resp += f'HTTP/1.0 404 Not Found\r\n'.encode('ascii')
                resp += f'Content-Length: {0}\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
                self.wfile.write(resp)
        elif file_path == '/validate_url':
            self._validate_url(self.path)
        elif file_path == '/metrics':
            self._do_get_metrics(file_path)
        elif file_path == '/history':
            self._do_get_history()
        else:
            if file_path == '/':
                file_path = 'index.html'
            else:
                file_path = self.path[1:]
            if os.path.isfile(file_path):
                content_type = self._get_content_type(file_path)
                file_size = os.path.getsize(file_path)
                resp = b''
                resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
                with open(file_path, 'rb') as fd:
                    resp += fd.read()
                self.wfile.write(resp)
            else:
                if file_path == 'test_chunked.txt':
                    resp = b''
                    resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                    resp += f'Content-type: text/plain; charset=utf-8\r\n'.encode('ascii')
                    resp += f'Transfer-Encoding: chunked\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    self.wfile.write(resp)
                    for chunk in self._chunk_generator():
                        self._write_chunk(chunk)
                    # send the chunked trailer
                    self.wfile.write('0\r\n\r\n'.encode('ascii'))
                elif file_path == 'test_nonchunked.txt':
                    resp = b''
                    resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                    resp += f'Content-type: text/plain; charset=utf-8\r\n'.encode('ascii')
                    one_chunk = f"this is chunk: {0}\r\n"
                    resp += f'Content-Length: {len(one_chunk) * 10}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    self.wfile.write(resp)
                    for chunk in self._chunk_generator():
                        self.wfile.write(chunk.encode('ascii'))
                else:
                    resp = b''
                    resp += f'HTTP/1.0 404 Not Found\r\n'.encode('ascii')
                    resp += f'Content-Length: {0}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    self.wfile.write(resp)
        pass


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True

    def shutdown(self):
        self.socket.close()
        HTTPServer.shutdown(self)


class SimpleHttpServer(object):
    def __init__(self, ip, port):
        self.server_thread = None
        self.server = socketserver.BaseRequestHandler
        self.server = ThreadedHTTPServer((ip, port), HTTPRequestHandler)

    def start(self):
        self.server_thread = threading.Thread(target=self.server.serve_forever)
        self.server_thread.daemon = True
        self.server_thread.start()

    def wait_for_thread(self):
        self.server_thread.join()

    def stop(self):
        self.server.shutdown()
        self.wait_for_thread()


def handle_wifi_connect():
    global g_simulation_mode
    global g_ssid
    global g_saved_ssid
    global g_password
    global g_timestamp
    while True:
        if g_timestamp is not None:
            if (time.time() - g_timestamp) > NETWORK_CONNECTION_TIMEOUT:
                if g_ssid is None:
                    print(f'Set simulation mode: ETH_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_ETH_CONNECTED
                elif g_ssid == 'dlink-noauth':
                    print(f'Set simulation mode: WIFI_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                elif g_ssid == 'SINGTEL-5171' and (g_password is None or g_password == 'null'):
                    print(f'Set simulation mode: WIFI_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                elif (g_password is None or g_password == 'null') and g_ssid == g_saved_ssid:
                    print(f'Set simulation mode: WIFI_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                elif g_password == '12345678':
                    print(f'Set simulation mode: WIFI_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                    g_saved_ssid = g_ssid
                if (g_simulation_mode != SIMULATION_MODE_WIFI_CONNECTED) and (
                        g_simulation_mode != SIMULATION_MODE_ETH_CONNECTED):
                    print(f'Set simulation mode: WIFI_FAILED_ATTEMPT')
                    g_simulation_mode = SIMULATION_MODE_WIFI_FAILED_ATTEMPT
                    g_saved_ssid = None
                g_timestamp = None
        time.sleep(0.5)
    pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Simulator of Ruuvi Gateway HTTP Server')
    parser.add_argument('--port', type=int, help='Listening port for HTTP Server', default=8001)
    parser.add_argument('--ip', help='HTTP Server IP', default='0.0.0.0')
    parser.add_argument('--lan', help='Set flag Access from LAN', action='store_true')
    args = parser.parse_args()
    print('To change the simulation mode, press digit and then Enter')
    print('Simulation modes:')
    print('    0 - WiFi is not connected')
    print('    1 - Eth is connected')
    print('    2 - WiFi is connected')
    print('    3 - failed to connect to WiFi')
    print('    4 - disconnected by the user command')
    print('    5 - lost connection')

    build_dir = '../build'
    if not os.path.exists(build_dir):
        os.makedirs(build_dir)
    os.chdir(os.path.join(os.path.dirname(os.path.realpath(__file__)), build_dir))

    if args.lan:
        g_flag_access_from_lan = True

    server = SimpleHttpServer(args.ip, args.port)
    print('HTTP Server Running: IP:%s, port:%d' % (args.ip, args.port))
    server.start()
    threading.Thread(target=handle_wifi_connect).start()
    while True:
        ch = input()
        simulation_mode = ch
        if simulation_mode == '0':
            print(f'Set simulation mode: NO_CONNECTION')
            g_simulation_mode = SIMULATION_MODE_NO_CONNECTION
        elif simulation_mode == '1':
            print(f'Set simulation mode: ETH_CONNECTED')
            g_simulation_mode = SIMULATION_MODE_ETH_CONNECTED
        elif simulation_mode == '2':
            print(f'Set simulation mode: WIFI_CONNECTED')
            g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
            g_ssid = 'Pantum-AP-A6D49F'
            g_password = '12345678'
        elif simulation_mode == '3':
            print(f'Set simulation mode: WIFI_FAILED_ATTEMPT')
            g_simulation_mode = SIMULATION_MODE_WIFI_FAILED_ATTEMPT
        elif simulation_mode == '4':
            print(f'Set simulation mode: USER_DISCONNECT')
            g_simulation_mode = SIMULATION_MODE_USER_DISCONNECT
        elif simulation_mode == '5':
            print(f'Set simulation mode: LOST_CONNECTION')
            g_simulation_mode = SIMULATION_MODE_LOST_CONNECTION
        else:
            print(f'Error: incorrect simulation mode: {ch}')
            continue
    server.wait_for_thread()

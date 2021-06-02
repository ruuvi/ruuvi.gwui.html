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
from enum import Enum
from typing import Optional, Dict


LAN_AUTH_TYPE_DENY = 'lan_auth_deny'
LAN_AUTH_TYPE_RUUVI = 'lan_auth_ruuvi'
LAN_AUTH_TYPE_DIGEST = 'lan_auth_digest'
LAN_AUTH_TYPE_BASIC = 'lan_auth_basic'
LAN_AUTH_TYPE_ALLOW = 'lan_auth_allow'

SIMULATION_MODE_NO_CONNECTION = 0
SIMULATION_MODE_ETH_CONNECTED = 1
SIMULATION_MODE_WIFI_CONNECTED = 2
SIMULATION_MODE_WIFI_FAILED_ATTEMPT = 3
SIMULATION_MODE_USER_DISCONNECT = 4
SIMULATION_MODE_LOST_CONNECTION = 5

COOKIE_RUUVISESSION = 'RUUVISESSION'
COOKIE_RUUVILOGIN = 'RUUVILOGIN'

g_simulation_mode = SIMULATION_MODE_NO_CONNECTION
g_ssid = None
g_password = None
g_timestamp = None
g_use_alt_wifi_list = False
g_gw_mac = "AA:BB:CC:DD:EE:FF"

RUUVI_AUTH_REALM = 'RuuviGateway' + g_gw_mac[-5:-3] + g_gw_mac[-2:]

g_ruuvi_dict = {
    'fw_ver': 'v1.3.3-dirty',
    'nrf52_fw_ver': 'v0.7.1',
    'use_eth': False,
    'eth_dhcp': True,
    'eth_static_ip': "",
    'eth_netmask': "",
    'eth_gw': "",
    'eth_dns1': "",
    'eth_dns2': "",
    'use_mqtt': False,
    'mqtt_server': '',
    'mqtt_port': 0,
    'mqtt_prefix': '',
    'mqtt_user': '',
    'use_http': False,
    'http_url': 'https://network.ruuvi.com/record',
    'http_user': '',
    'lan_auth_type': LAN_AUTH_TYPE_DENY,
    'lan_auth_user': '',
    'lan_auth_pass': hashlib.md5(f'{"username"}:{RUUVI_AUTH_REALM}:{"password"}'.encode('utf-8')).hexdigest(),
    'gw_mac': g_gw_mac,
    'use_filtering': True,
    'company_id': "0x0499",
    'coordinates':  "",
    'use_coded_phy': False,
    'use_1mbit_phy': True,
    'use_extended_payload': True,
    'use_channel_37': True,
    'use_channel_38': True,
    'use_channel_39': True,
}


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
        response = hashlib.md5(f'{encrypted_password}:{self.nonce}:{self.nc}:{self.cnonce}:{self.qop}:{ha2}'.encode('utf-8')).hexdigest()
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
        resp = b''
        resp += f'HTTP/1.1 404 Not Found\r\n'.encode('ascii')
        resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'Content-Type: text/html; charset=utf-8'.encode('ascii')
        resp += f'Content-Length: {len(content)}'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += content.encode('utf-8')
        print(f'Response: {resp}')
        self.wfile.write(resp)

    def _on_post_resp_401(self, message=None):
        cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
        if g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_RUUVI:
            message = message if message is not None else ''
            resp_content = f'{{"message":"{message}"}}'
            resp = b''
            resp += f'HTTP/1.1 401 Unauthorized\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += g_login_session.generate_auth_header_fields().encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content.encode('ascii')
            print(f'Response: {resp}')
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_BASIC:
            resp = b''
            resp += f'HTTP/1.1 401 Unauthorized\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'WWW-Authenticate: Basic realm="{RUUVI_AUTH_REALM}", charset="UTF-8"\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DIGEST:
            resp = b''
            resp += f'HTTP/1.1 401 Unauthorized\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')

            nonce_random = ''.join(random.choice(string.ascii_uppercase) for i in range(32))
            nonce = hashlib.sha256(nonce_random.encode('ascii')).hexdigest()
            opaque = hashlib.sha256(RUUVI_AUTH_REALM.encode('ascii')).hexdigest()

            resp += f'WWW-Authenticate: Digest realm="{RUUVI_AUTH_REALM}" qop="auth" nonce="{nonce}" opaque="{opaque}"\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        else:
            raise RuntimeError("Unsupported AuthType")

    def do_POST(self):
        global g_ssid
        global g_password
        global g_timestamp
        global g_ruuvi_dict
        global g_login_session
        print('POST %s' % self.path)
        if self.path == '/auth':
            if g_ruuvi_dict['lan_auth_type'] != LAN_AUTH_TYPE_RUUVI:
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
                self._on_post_resp_401('Incorrect username or password')
                return

            g_authorized_sessions[session.session_id] = AuthorizedSession(login, session.session_id)
            g_login_session = None

            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            resp_content = f'{{}}'
            resp = b''
            resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content.encode('ascii')
            print(f'Response: {resp}')
            self.wfile.write(resp)
        elif self.path == '/connect.json':
            ssid = self._get_value_from_headers('X-Custom-ssid: ')
            password = self._get_value_from_headers('X-Custom-pwd: ')
            resp = b''
            if ssid is None and password is None:
                print(f'Try to connect to Ethernet')
                g_ssid = None
                g_password = None
                g_timestamp = time.time()
                resp_content = f'{{}}'
                resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                resp += f'Content-type: application/json\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
                resp += resp_content.encode('ascii')
            elif ssid is None or password is None:
                resp += f'HTTP/1.1 400 Bad Request\r\n'.encode('ascii')
                resp += f'Content-Length: 0\r\n'.encode('ascii')
            else:
                print(f'Try to connect to SSID:{ssid} with password:{password}')
                if ssid == 'dlink-noauth-err-400':
                    resp += f'HTTP/1.1 400 Bad Request\r\n'.encode('ascii')
                    resp += f'Content-Length: 0\r\n'.encode('ascii')
                elif ssid == 'dlink-noauth-err-503':
                    resp += f'HTTP/1.1 503 Service Unavailable\r\n'.encode('ascii')
                    resp += f'Content-Length: 0\r\n'.encode('ascii')
                else:
                    g_ssid = ssid
                    g_password = password
                    g_timestamp = time.time()
                    resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                    resp += f'Content-type: application/json\r\n'.encode('ascii')
                    resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                    resp += f'Pragma: no-cache\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    resp_content = f'{{}}'
                    resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
                    resp += resp_content.encode('ascii')
            print(f'Response: {resp}')
            self.wfile.write(resp)
        elif self.path == '/ruuvi.json':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length).decode('ascii')
            new_dict = json.loads(post_data)
            for key, value in new_dict.items():
                if key == 'http_pass':
                    continue
                if key == 'mqtt_pass':
                    continue
                g_ruuvi_dict[key] = value
                # if key == 'use_eth':
                #     g_ssid = None
                #     g_password = None
                #     g_timestamp = time.time()
            resp = b''
            resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'Content-Length: 0\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        else:
            resp = b''
            resp += f'HTTP/1.1 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: {0}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        return

    def do_DELETE(self):
        global g_ssid
        global g_password
        global g_timestamp
        global g_simulation_mode
        global g_ruuvi_dict
        global g_login_session
        print('DELETE %s' % self.path)
        if self.path == '/auth':
            if g_ruuvi_dict['lan_auth_type'] != LAN_AUTH_TYPE_RUUVI:
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
            cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
            resp = b''
            resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
            resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
            resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += resp_content.encode('ascii')
            self.wfile.write(resp)
        elif self.path == '/connect.json':
            g_timestamp = None
            g_simulation_mode = SIMULATION_MODE_USER_DISCONNECT

            resp = b''
            resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'Content-Length: {0}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        else:
            resp = b''
            resp += f'HTTP/1.1 400 Bad Request\r\n'.encode('ascii')
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

    def do_GET(self):
        global g_ruuvi_dict
        global g_login_session
        print('GET %s' % self.path)
        if self.path == '/auth' or self.path.startswith('/auth?') or self.path == '/auth.html':
            flag_content_html = True if self.path == '/auth.html' else False

            if g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_DENY:
                resp = b''
                resp += f'HTTP/1.1 403 Forbidden\r\n'.encode('ascii')
                resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')

                cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
                resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                if flag_content_html:
                    file_path = 'auth.html'
                    content_type = self._get_content_type(file_path)
                    file_size = os.path.getsize(file_path)
                    resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                    resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    with open(file_path, 'rb') as fd:
                        resp += fd.read()
                else:
                    resp_content = f'{{"success": {"false"}, "gateway_name": "{RUUVI_AUTH_REALM}"}}'
                    resp += f'Content-type: application/json\r\n'.encode('ascii')
                    resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    resp += resp_content.encode('ascii')
                self.wfile.write(resp)
            elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_RUUVI:
                cookie_str = self._get_value_from_headers('Cookie: ')
                session_id = None
                if cookie_str is not None:
                    cookies_dict = self._parse_cookies(cookie_str)
                    if COOKIE_RUUVISESSION in cookies_dict:
                        cookie_ruuvi_session = cookies_dict[COOKIE_RUUVISESSION]
                        if cookie_ruuvi_session in g_authorized_sessions:
                            session_id = cookie_ruuvi_session
                if session_id is not None:
                    resp = b''
                    resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                    resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
                else:
                    g_login_session = LoginSession()
                    resp = b''
                    resp += f'HTTP/1.1 401 Unauthorized\r\n'.encode('ascii')
                    resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
                    resp += g_login_session.generate_auth_header_fields().encode('ascii')

                cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
                resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                if flag_content_html:
                    file_path = 'auth.html'
                    content_type = self._get_content_type(file_path)
                    file_size = os.path.getsize(file_path)
                    resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                    resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    with open(file_path, 'rb') as fd:
                        resp += fd.read()
                else:
                    is_success = True if session_id is not None else False
                    resp_content = f'{{"success": {"true" if is_success else "false"}, "gateway_name": "{RUUVI_AUTH_REALM}"}}'
                    resp += f'Content-type: application/json\r\n'.encode('ascii')
                    resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    resp += resp_content.encode('ascii')
                self.wfile.write(resp)
            elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_BASIC:
                authorization_str = self._get_value_from_headers('Authorization: ')
                if authorization_str is None:
                    self._on_post_resp_401()
                    return
                auth_prefix = 'Basic '
                if not authorization_str.startswith(auth_prefix):
                    self._on_post_resp_401()
                    return
                auth_token = authorization_str[len(auth_prefix):]
                flag_authorized = False
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
                resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
                cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
                resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                if flag_content_html:
                    file_path = 'auth.html'
                    content_type = self._get_content_type(file_path)
                    file_size = os.path.getsize(file_path)
                    resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                    resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    with open(file_path, 'rb') as fd:
                        resp += fd.read()
                else:
                    is_success = True
                    resp_content = f'{{"success": {"true" if is_success else "false"}, "gateway_name": "{RUUVI_AUTH_REALM}"}}'
                    resp += f'Content-type: application/json\r\n'.encode('ascii')
                    resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    resp += resp_content.encode('ascii')
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
                resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
                cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
                resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                if flag_content_html:
                    file_path = 'auth.html'
                    content_type = self._get_content_type(file_path)
                    file_size = os.path.getsize(file_path)
                    resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                    resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    with open(file_path, 'rb') as fd:
                        resp += fd.read()
                else:
                    is_success = True
                    resp_content = f'{{"success": {"true" if is_success else "false"}, "gateway_name": "{RUUVI_AUTH_REALM}"}}'
                    resp += f'Content-type: application/json\r\n'.encode('ascii')
                    resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    resp += resp_content.encode('ascii')
                self.wfile.write(resp)
            elif g_ruuvi_dict['lan_auth_type'] == LAN_AUTH_TYPE_ALLOW:
                resp = b''
                resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                resp += f'Server: Ruuvi Gateway\r\n'.encode('ascii')
                cur_time_str = datetime.datetime.now().strftime('%a %d %b %Y %H:%M:%S %Z')
                resp += f'Date: {cur_time_str}\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                if flag_content_html:
                    file_path = 'auth.html'
                    content_type = self._get_content_type(file_path)
                    file_size = os.path.getsize(file_path)
                    resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                    resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    with open(file_path, 'rb') as fd:
                        resp += fd.read()
                else:
                    is_success = True
                    resp_content = f'{{"success": {"true" if is_success else "false"}, "gateway_name": "{RUUVI_AUTH_REALM}"}}'
                    resp += f'Content-type: application/json\r\n'.encode('ascii')
                    resp += f'Content-Length: {len(resp_content)}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    resp += resp_content.encode('ascii')
                self.wfile.write(resp)
            else:
                raise RuntimeError("Unsupported Auth")
        elif self.path.endswith('.json'):
            resp = b''
            resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json; charset=utf-8\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            ruuvi_dict = copy.deepcopy(g_ruuvi_dict)
            if 'http_pass' in ruuvi_dict:
                del ruuvi_dict['http_pass']
            if 'mqtt_pass' in ruuvi_dict:
                del ruuvi_dict['mqtt_pass']
            if 'lan_auth_pass' in ruuvi_dict:
                del ruuvi_dict['lan_auth_pass']
            content = json.dumps(ruuvi_dict)
            if self.path == '/ruuvi.json':
                print(f'Resp: {content}')
                resp += content.encode('utf-8')
                self.wfile.write(resp)
            elif self.path == '/ap.json':
                if not g_use_alt_wifi_list:
                    content = '''[
{"ssid":"Pantum-AP-A6D49F","chan":11,"rssi":-55,"auth":4},
{"ssid":"a0308","chan":1,"rssi":-56,"auth":3},
{"ssid":"dlink-noauth","chan":11,"rssi":-82,"auth":0},
{"ssid":"dlink-noauth-err-400","chan":7,"rssi":-85,"auth":0},
{"ssid":"dlink-noauth-err-503","chan":7,"rssi":-85,"auth":0},
{"ssid":"SINGTEL-5171","chan":9,"rssi":-88,"auth":4},
{"ssid":"1126-1","chan":11,"rssi":-89,"auth":4},
{"ssid":"The Shah 5GHz-2","chan":1,"rssi":-90,"auth":3},
{"ssid":"SINGTEL-1D28 (2G)","chan":11,"rssi":-91,"auth":3},
{"ssid":"dlink-F864","chan":1,"rssi":-92,"auth":4},
{"ssid":"dlink-74F0","chan":1,"rssi":-93,"auth":4}
] '''
                else:
                    content = '''[
{"ssid":"Pantum2","chan":11,"rssi":-55,"auth":4},
{"ssid":"a0308","chan":1,"rssi":-56,"auth":3},
{"ssid":"dlink-noauth","chan":11,"rssi":-82,"auth":0},
{"ssid":"dlink-noauth-err-400","chan":7,"rssi":-85,"auth":0},
{"ssid":"dlink-noauth-err-503","chan":7,"rssi":-85,"auth":0}
] '''
                print(f'Resp: {content}')
                resp += content.encode('utf-8')
                self.wfile.write(resp)
            elif self.path == '/status.json':
                if g_ssid is None:
                    ssid_key_with_val = '"ssid":null'
                else:
                    ssid_key_with_val = f'"ssid":"{g_ssid}"'
                if g_simulation_mode == SIMULATION_MODE_NO_CONNECTION:
                    content = '{}'
                elif g_simulation_mode == SIMULATION_MODE_ETH_CONNECTED:
                    if g_ruuvi_dict['eth_dhcp']:
                        ip = '192.168.100.119'
                        netmask = '255.255.255.0'
                        gw = '192.168.100.1'
                    else:
                        ip = g_ruuvi_dict['eth_static_ip']
                        netmask = g_ruuvi_dict['eth_netmask']
                        gw = g_ruuvi_dict['eth_gw']
                    content = f'{{{ssid_key_with_val},"ip":"{ip}","netmask":"{netmask}","gw":"{gw}","urc":0}}'
                elif g_simulation_mode == SIMULATION_MODE_WIFI_CONNECTED:
                    ip = '192.168.1.119'
                    netmask = '255.255.255.0'
                    gw = '192.168.1.1'
                    content = f'{{{ssid_key_with_val},"ip":"{ip}","netmask":"{netmask}","gw":"{gw}","urc":0}}'
                elif g_simulation_mode == SIMULATION_MODE_WIFI_FAILED_ATTEMPT:
                    content = f'{{{ssid_key_with_val},"ip":"0","netmask":"0","gw":"0","urc":1}}'
                elif g_simulation_mode == SIMULATION_MODE_USER_DISCONNECT:
                    content = f'{{{ssid_key_with_val},"ip":"0","netmask":"0","gw":"0","urc":2}}'
                elif g_simulation_mode == SIMULATION_MODE_LOST_CONNECTION:
                    content = f'{{{ssid_key_with_val},"ip":"0","netmask":"0","gw":"0","urc":3}}'
                else:
                    content = ''
                print(f'Resp: {content}')
                resp += content.encode('utf-8')
                self.wfile.write(resp)
            elif self.path == '/github_latest_release.json':
                content = '''{
  "url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/40983653",
  "assets_url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/40983653/assets",
  "upload_url": "https://uploads.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/40983653/assets{?name,label}",
  "html_url": "https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/tag/v1.3.2",
  "id": 40983653,
  "author": {
    "login": "ojousima",
    "id": 2360368,
    "node_id": "MDQ6VXNlcjIzNjAzNjg=",
    "avatar_url": "https://avatars.githubusercontent.com/u/2360368?v=4",
    "gravatar_id": "",
    "url": "https://api.github.com/users/ojousima",
    "html_url": "https://github.com/ojousima",
    "followers_url": "https://api.github.com/users/ojousima/followers",
    "following_url": "https://api.github.com/users/ojousima/following{/other_user}",
    "gists_url": "https://api.github.com/users/ojousima/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/ojousima/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/ojousima/subscriptions",
    "organizations_url": "https://api.github.com/users/ojousima/orgs",
    "repos_url": "https://api.github.com/users/ojousima/repos",
    "events_url": "https://api.github.com/users/ojousima/events{/privacy}",
    "received_events_url": "https://api.github.com/users/ojousima/received_events",
    "type": "User",
    "site_admin": false
  },
  "node_id": "MDc6UmVsZWFzZTQwOTgzNjUz",
  "tag_name": "v1.3.2",
  "target_commitish": "master",
  "name": "GW A2 beta tester release",
  "draft": false,
  "prerelease": false,
  "created_at": "2021-04-05T10:19:27Z",
  "published_at": "2021-04-06T09:02:28Z",
  "assets": [
    {
      "url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/assets/34512683",
      "id": 34512683,
      "node_id": "MDEyOlJlbGVhc2VBc3NldDM0NTEyNjgz",
      "name": "bootloader.bin",
      "label": null,
      "uploader": {
        "login": "ojousima",
        "id": 2360368,
        "node_id": "MDQ6VXNlcjIzNjAzNjg=",
        "avatar_url": "https://avatars.githubusercontent.com/u/2360368?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/ojousima",
        "html_url": "https://github.com/ojousima",
        "followers_url": "https://api.github.com/users/ojousima/followers",
        "following_url": "https://api.github.com/users/ojousima/following{/other_user}",
        "gists_url": "https://api.github.com/users/ojousima/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/ojousima/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/ojousima/subscriptions",
        "organizations_url": "https://api.github.com/users/ojousima/orgs",
        "repos_url": "https://api.github.com/users/ojousima/repos",
        "events_url": "https://api.github.com/users/ojousima/events{/privacy}",
        "received_events_url": "https://api.github.com/users/ojousima/received_events",
        "type": "User",
        "site_admin": false
      },
      "content_type": "application/macbinary",
      "state": "uploaded",
      "size": 25408,
      "download_count": 19,
      "created_at": "2021-04-06T09:03:42Z",
      "updated_at": "2021-04-06T09:03:43Z",
      "browser_download_url": "https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/v1.3.2/bootloader.bin"
    },
    {
      "url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/assets/34512672",
      "id": 34512672,
      "node_id": "MDEyOlJlbGVhc2VBc3NldDM0NTEyNjcy",
      "name": "fatfs_gwui.bin",
      "label": null,
      "uploader": {
        "login": "ojousima",
        "id": 2360368,
        "node_id": "MDQ6VXNlcjIzNjAzNjg=",
        "avatar_url": "https://avatars.githubusercontent.com/u/2360368?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/ojousima",
        "html_url": "https://github.com/ojousima",
        "followers_url": "https://api.github.com/users/ojousima/followers",
        "following_url": "https://api.github.com/users/ojousima/following{/other_user}",
        "gists_url": "https://api.github.com/users/ojousima/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/ojousima/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/ojousima/subscriptions",
        "organizations_url": "https://api.github.com/users/ojousima/orgs",
        "repos_url": "https://api.github.com/users/ojousima/repos",
        "events_url": "https://api.github.com/users/ojousima/events{/privacy}",
        "received_events_url": "https://api.github.com/users/ojousima/received_events",
        "type": "User",
        "site_admin": false
      },
      "content_type": "application/macbinary",
      "state": "uploaded",
      "size": 393216,
      "download_count": 18,
      "created_at": "2021-04-06T09:03:35Z",
      "updated_at": "2021-04-06T09:03:39Z",
      "browser_download_url": "https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/v1.3.2/fatfs_gwui.bin"
    },
    {
      "url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/assets/34512676",
      "id": 34512676,
      "node_id": "MDEyOlJlbGVhc2VBc3NldDM0NTEyNjc2",
      "name": "fatfs_nrf52.bin",
      "label": null,
      "uploader": {
        "login": "ojousima",
        "id": 2360368,
        "node_id": "MDQ6VXNlcjIzNjAzNjg=",
        "avatar_url": "https://avatars.githubusercontent.com/u/2360368?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/ojousima",
        "html_url": "https://github.com/ojousima",
        "followers_url": "https://api.github.com/users/ojousima/followers",
        "following_url": "https://api.github.com/users/ojousima/following{/other_user}",
        "gists_url": "https://api.github.com/users/ojousima/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/ojousima/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/ojousima/subscriptions",
        "organizations_url": "https://api.github.com/users/ojousima/orgs",
        "repos_url": "https://api.github.com/users/ojousima/repos",
        "events_url": "https://api.github.com/users/ojousima/events{/privacy}",
        "received_events_url": "https://api.github.com/users/ojousima/received_events",
        "type": "User",
        "site_admin": false
      },
      "content_type": "application/macbinary",
      "state": "uploaded",
      "size": 262144,
      "download_count": 18,
      "created_at": "2021-04-06T09:03:39Z",
      "updated_at": "2021-04-06T09:03:40Z",
      "browser_download_url": "https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/v1.3.2/fatfs_nrf52.bin"
    },
    {
      "url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/assets/34512674",
      "id": 34512674,
      "node_id": "MDEyOlJlbGVhc2VBc3NldDM0NTEyNjc0",
      "name": "partition-table.bin",
      "label": null,
      "uploader": {
        "login": "ojousima",
        "id": 2360368,
        "node_id": "MDQ6VXNlcjIzNjAzNjg=",
        "avatar_url": "https://avatars.githubusercontent.com/u/2360368?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/ojousima",
        "html_url": "https://github.com/ojousima",
        "followers_url": "https://api.github.com/users/ojousima/followers",
        "following_url": "https://api.github.com/users/ojousima/following{/other_user}",
        "gists_url": "https://api.github.com/users/ojousima/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/ojousima/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/ojousima/subscriptions",
        "organizations_url": "https://api.github.com/users/ojousima/orgs",
        "repos_url": "https://api.github.com/users/ojousima/repos",
        "events_url": "https://api.github.com/users/ojousima/events{/privacy}",
        "received_events_url": "https://api.github.com/users/ojousima/received_events",
        "type": "User",
        "site_admin": false
      },
      "content_type": "application/macbinary",
      "state": "uploaded",
      "size": 3072,
      "download_count": 17,
      "created_at": "2021-04-06T09:03:37Z",
      "updated_at": "2021-04-06T09:03:38Z",
      "browser_download_url": "https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/v1.3.2/partition-table.bin"
    },
    {
      "url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/releases/assets/34512679",
      "id": 34512679,
      "node_id": "MDEyOlJlbGVhc2VBc3NldDM0NTEyNjc5",
      "name": "ruuvi_gateway_esp.bin",
      "label": null,
      "uploader": {
        "login": "ojousima",
        "id": 2360368,
        "node_id": "MDQ6VXNlcjIzNjAzNjg=",
        "avatar_url": "https://avatars.githubusercontent.com/u/2360368?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/ojousima",
        "html_url": "https://github.com/ojousima",
        "followers_url": "https://api.github.com/users/ojousima/followers",
        "following_url": "https://api.github.com/users/ojousima/following{/other_user}",
        "gists_url": "https://api.github.com/users/ojousima/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/ojousima/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/ojousima/subscriptions",
        "organizations_url": "https://api.github.com/users/ojousima/orgs",
        "repos_url": "https://api.github.com/users/ojousima/repos",
        "events_url": "https://api.github.com/users/ojousima/events{/privacy}",
        "received_events_url": "https://api.github.com/users/ojousima/received_events",
        "type": "User",
        "site_admin": false
      },
      "content_type": "application/macbinary",
      "state": "uploaded",
      "size": 1057856,
      "download_count": 18,
      "created_at": "2021-04-06T09:03:40Z",
      "updated_at": "2021-04-06T09:03:43Z",
      "browser_download_url": "https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/v1.3.2/ruuvi_gateway_esp.bin"
    }
  ],
  "tarball_url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/tarball/v1.3.2",
  "zipball_url": "https://api.github.com/repos/ruuvi/ruuvi.gateway_esp.c/zipball/v1.3.2",
  "body": "* Adds Ruuvi Network support\\r\\n* Adds support for SWD update of connected nRF52\\r\\n* GW hotspot UI fixes\\r\\n* Scan configuration\\r\\n* Reliability improvements\\r\\n\\r\\nTo update Gateway A2, you need to only flash these binaries to the gateway according to instructions on README page. RED led will be blinking quickly while nRF52 onboard is reprogrammed, this takes a few minutes. If GREEN led does not start blinking, disconnect and reconnect USB power.\\r\\n\\r\\nTo update Gateway A1, you need to flash the nRF52 separately with 0.7.1 binary available [here](https://github.com/ruuvi/ruuvi.gateway_nrf.c/releases/download/0.7.1/ruuvigw_nrf_armgcc_ruuvigw_release_0.7.1_full.hex).\\r\\n\\r\\nNote: Trace to R15 has to be cut to use this release. \\r\\n![image](https://user-images.githubusercontent.com/2360368/113686295-c7d5b400-96cf-11eb-91ff-c075ed93adbb.png)\\r\\n![image](https://user-images.githubusercontent.com/2360368/113686356-d7ed9380-96cf-11eb-91f2-b11c9b89b954.png)\\r\\n"
}
 '''
                print(f'Resp: {content}')
                resp += content.encode('utf-8')
                self.wfile.write(resp)
            else:
                resp = b''
                resp += f'HTTP/1.1 404 Not Found\r\n'.encode('ascii')
                resp += f'Content-Length: {0}\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
                self.wfile.write(resp)
            pass
        else:
            if self.path == '/':
                file_path = 'index.html'
            else:
                file_path = self.path[1:]
            if os.path.isfile(file_path):
                content_type = self._get_content_type(file_path)
                file_size = os.path.getsize(file_path)
                resp = b''
                resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
                with open(file_path, 'rb') as fd:
                    resp += fd.read()
                self.wfile.write(resp)
            else:
                if file_path == 'test_chunked.txt':
                    resp = b''
                    resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
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
                    resp += f'HTTP/1.1 200 OK\r\n'.encode('ascii')
                    resp += f'Content-type: text/plain; charset=utf-8\r\n'.encode('ascii')
                    one_chunk = f"this is chunk: {0}\r\n"
                    resp += f'Content-Length: {len(one_chunk) * 10}\r\n'.encode('ascii')
                    resp += f'\r\n'.encode('ascii')
                    self.wfile.write(resp)
                    for chunk in self._chunk_generator():
                        self.wfile.write(chunk.encode('ascii'))
                else:
                    resp = b''
                    resp += f'HTTP/1.1 404 Not Found\r\n'.encode('ascii')
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
    global g_password
    global g_timestamp
    while True:
        if g_timestamp is not None:
            if (time.time() - g_timestamp) > 3:
                if g_ssid is None:
                    print(f'Set simulation mode: ETH_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_ETH_CONNECTED
                elif g_ssid == 'dlink-noauth':
                    print(f'Set simulation mode: WIFI_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                elif g_password == '12345678':
                    print(f'Set simulation mode: WIFI_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                if (g_simulation_mode != SIMULATION_MODE_WIFI_CONNECTED) and (
                        g_simulation_mode != SIMULATION_MODE_ETH_CONNECTED):
                    print(f'Set simulation mode: WIFI_FAILED_ATTEMPT')
                    g_simulation_mode = SIMULATION_MODE_WIFI_FAILED_ATTEMPT
                g_timestamp = None
        time.sleep(0.5)
    pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Simulator of Ruuvi Gateway HTTP Server')
    parser.add_argument('--port', type=int, help='Listening port for HTTP Server', default=8001)
    parser.add_argument('--ip', help='HTTP Server IP', default='0.0.0.0')
    args = parser.parse_args()
    print('To change the simulation mode, press digit and then Enter')
    print('Simulation modes:')
    print('    0 - WiFi is not connected')
    print('    1 - Eth is connected')
    print('    2 - WiFi is connected')
    print('    3 - failed to connect to WiFi')
    print('    4 - disconnected by the user command')
    print('    5 - lost connection')
    print('    w - toggle the list of WiFi')

    os.chdir(os.path.join(os.path.dirname(os.path.realpath(__file__)), '../src'))

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
        elif simulation_mode == 'w':
            print(f'Toggle list of WiFi')
            g_use_alt_wifi_list = not g_use_alt_wifi_list
        else:
            print(f'Error: incorrect simulation mode: {ch}')
            continue
    server.wait_for_thread()

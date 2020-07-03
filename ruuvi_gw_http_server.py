#!/usr/bin/env python
# -*- coding: utf-8 -*-
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


SIMULATION_MODE_NO_WIFI = 1
SIMULATION_MODE_WIFI_CONNECTED = 2
SIMULATION_MODE_WIFI_FAILED = 3

g_simulation_mode = SIMULATION_MODE_NO_WIFI
g_ssid = None
g_password = None
g_timestamp = None


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

    def do_POST(self):
        global g_ssid
        global g_password
        global g_timestamp
        print('POST %s' % self.path)
        if self.path == '/connect.json':
            ssid = self._get_value_from_headers('X-Custom-ssid: ')
            password = self._get_value_from_headers('X-Custom-pwd: ')
            resp = b''
            if ssid is None or password is None:
                resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
                resp += f'Content-Length: 0\r\n'.encode('ascii')
            else:
                g_ssid = ssid
                g_password = password
                g_timestamp = time.time()
                resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                resp += f'Content-type: application/json\r\n'.encode('ascii')
                resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
                resp += f'Pragma: no-cache\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        else:
            resp = b''
            resp += f'HTTP/1.0 400 Bad Request\r\n'.encode('ascii')
            resp += f'Content-Length: {0}\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            self.wfile.write(resp)
        return

    def do_DELETE(self):
        global g_ssid
        global g_password
        global g_timestamp
        global g_simulation_mode
        print('DELETE %s' % self.path)
        if self.path == '/connect.json':
            g_timestamp = None
            g_ssid = None
            g_password = None
            g_simulation_mode = SIMULATION_MODE_NO_WIFI

            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
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

    def do_GET(self):
        print('GET %s' % self.path)
        if self.path.endswith('.json'):
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            if self.path == '/ruuvi.json':
                content = '''{
        "eth_dhcp":     true,
        "eth_static_ip":        "",
        "eth_netmask":  "",
        "eth_gw":       "",
        "eth_dns1":     "",
        "eth_dns2":     "",
        "use_http":     false,
        "http_url":     "",
        "use_mqtt":     false,
        "mqtt_server":  "",
        "mqtt_port":    0,
        "mqtt_prefix":  "",
        "mqtt_user":    "",
        "coordinates":  "",
        "use_filtering":        true,
        "company_id":   "0x0499"
}'''
                print(f'Resp: {content}')
                resp += content.encode('ascii')
                self.wfile.write(resp)
            elif self.path == '/ap.json':
                content = '''[
{"ssid":"Pantum-AP-A6D49F","chan":11,"rssi":-55,"auth":4},
{"ssid":"a0308","chan":1,"rssi":-56,"auth":3},
{"ssid":"dlink-noauth","chan":11,"rssi":-82,"auth":0},
{"ssid":"Linksys06730","chan":7,"rssi":-85,"auth":3},
{"ssid":"SINGTEL-5171","chan":9,"rssi":-88,"auth":4},
{"ssid":"1126-1","chan":11,"rssi":-89,"auth":4},
{"ssid":"The Shah 5GHz-2","chan":1,"rssi":-90,"auth":3},
{"ssid":"SINGTEL-1D28 (2G)","chan":11,"rssi":-91,"auth":3},
{"ssid":"dlink-F864","chan":1,"rssi":-92,"auth":4},
{"ssid":"dlink-74F0","chan":1,"rssi":-93,"auth":4}
] '''
                print(f'Resp: {content}')
                resp += content.encode('ascii')
                self.wfile.write(resp)
            elif self.path == '/status.json':
                if g_simulation_mode == SIMULATION_MODE_NO_WIFI:
                    content = '{}'
                elif g_simulation_mode == SIMULATION_MODE_WIFI_CONNECTED:
                    content = '{"ssid":"%s","ip":"192.168.1.119","netmask":"255.255.255.0","gw":"192.168.1.1","urc":0}' % g_ssid
                elif g_simulation_mode == SIMULATION_MODE_WIFI_FAILED:
                    content = '{"ssid":"%s","ip":"0","netmask":"0","gw":"0","urc":1}' % g_ssid
                else:
                    content = ''
                print(f'Resp: {content}')
                resp += content.encode('ascii')
                self.wfile.write(resp)
            else:
                resp = b''
                resp += f'HTTP/1.0 404 Not Found\r\n'.encode('ascii')
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
                resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                resp += f'Content-type: {content_type}\r\n'.encode('ascii')
                resp += f'Content-Length: {file_size}\r\n'.encode('ascii')
                resp += f'\r\n'.encode('ascii')
                with open(file_path, 'rb') as fd:
                    resp += fd.read()
                self.wfile.write(resp)
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
    global g_password
    global g_timestamp
    while True:
        if g_timestamp is not None:
            if (time.time() - g_timestamp) > 3:
                if g_ssid == 'dlink-noauth':
                    if g_password == '':
                        print(f'Set simulation mode: WIFI_CONNECTED')
                        g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                elif g_password == '12345678':
                    print(f'Set simulation mode: WIFI_CONNECTED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
                if g_simulation_mode != SIMULATION_MODE_WIFI_CONNECTED:
                    print(f'Set simulation mode: WIFI_FAILED')
                    g_simulation_mode = SIMULATION_MODE_WIFI_FAILED
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
    print('    1 - WiFi is not connected')
    print('    2 - WiFi is connected')
    print('    3 - failed to connect to WiFi')

    os.chdir(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'src'))

    server = SimpleHttpServer(args.ip, args.port)
    print('HTTP Server Running: IP:%s, port:%d' % (args.ip, args.port))
    server.start()
    threading.Thread(target=handle_wifi_connect).start()
    while True:
        ch = input()
        if not ch.isdigit():
            print(f'Error: incorrect simulation mode: {ch}')
            continue
        simulation_mode = int(ch)
        if simulation_mode == 1:
            print(f'Set simulation mode: NO_WIFI')
            g_simulation_mode = SIMULATION_MODE_NO_WIFI
        elif simulation_mode == 2:
            print(f'Set simulation mode: WIFI_CONNECTED')
            g_simulation_mode = SIMULATION_MODE_WIFI_CONNECTED
        elif simulation_mode == 3:
            print(f'Set simulation mode: WIFI_FAILED')
            g_simulation_mode = SIMULATION_MODE_WIFI_FAILED
        else:
            print(f'Error: incorrect simulation mode: {ch}')
            continue
    server.wait_for_thread()

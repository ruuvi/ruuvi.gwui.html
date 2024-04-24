#!/usr/bin/env python

# Extended python -m http.serve with --username and --password parameters for
# basic auth, based on https://gist.github.com/fxsjy/5465353

from functools import partial
from http.server import SimpleHTTPRequestHandler, BaseHTTPRequestHandler, ThreadingHTTPServer
# from http.server import test
import base64
import os
import logging
import ssl
import sys
import time
import socket

g_simulate_post_delay = 0
g_record = None


# This custom filter will allow through any records with a level less than ERROR
class StdoutFilter(logging.Filter):
    def filter(self, record):
        return record.levelno < logging.ERROR


class Logger:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)

        formatter = logging.Formatter('[%(asctime)s %(levelname)s] %(message)s', datefmt='%Y-%m-%dT%H:%M:%S')

        handler_out = logging.StreamHandler(sys.stdout)
        handler_out.setLevel(logging.INFO)
        handler_out.setFormatter(formatter)
        handler_out.addFilter(StdoutFilter())

        handler_err = logging.StreamHandler(sys.stderr)
        handler_err.setLevel(logging.ERROR)
        handler_err.setFormatter(formatter)

        self.logger.addHandler(handler_out)
        self.logger.addHandler(handler_err)

    def debug(self, msg):
        self.logger.debug(msg)

    def info(self, msg):
        self.logger.info(msg)

    def warning(self, msg):
        self.logger.warning(msg)

    def error(self, msg):
        self.logger.error(msg)

    def critical(self, msg):
        self.logger.critical(msg)


logger = Logger()


def log(msg):
    logger.info(msg)


def create_ssl_context(cert_file, key_file, ca_file):
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    if cert_file == key_file:
        log(f'Loading cert file {cert_file} as both cert and key file.')
        context.load_cert_chain(cert_file)
    else:
        log(f'Loading cert file {cert_file} and key file {key_file}.')
        context.load_cert_chain(cert_file, key_file)

    if ca_file is not None:
        log(f'Loading CA file {ca_file}.')
        context.load_verify_locations(ca_file)
        context.verify_mode = ssl.CERT_REQUIRED
    return context


class AuthHTTPRequestHandler(SimpleHTTPRequestHandler):
    """ Main class to present webpages and authentication. """

    def __init__(self, *args, **kwargs):
        username = kwargs.pop("username")
        password = kwargs.pop("password")
        bearer_token = kwargs.pop("bearer_token")
        if username is None or password is None:
            self._auth = None
        else:
            self._auth = base64.b64encode(f"{username}:{password}".encode()).decode()
        self._bearer_token = bearer_token

        self.close_connection = False
        super().__init__(*args, **kwargs)

    # def handle_one_request(self):
    #     super(AuthHTTPRequestHandler, self).handle_one_request()
    #     # self.close_connection = False
    #     # self.protocol_version = 'HTTP/1.0'

    def do_HEAD(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
        else:
            # Assuming the base directory for files is the current working directory
            file_path = '.' + self.path  # Prepend '.' to make the path relative to the current directory
            # SimpleHTTPRequestHandler class has built-in measures to prevent directory traversal attacks,
            # so we don't need to sanitize the path to ensure that it cannot navigate outside the current directory
            # using relative paths like '..'.
            if os.path.isfile(file_path):
                self.send_response(200)
                self.send_header("Content-type", self.guess_type(file_path))
                self.send_header("Content-length", str(os.stat(file_path).st_size))
                self.end_headers()
            else:
                # File not found, return 404
                self.send_response(404)
                self.end_headers()

    def do_AUTHHEAD(self):
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Test"')
        self.send_header("Content-type", "text/html")
        self.end_headers()

    def _do_POST(self, use_auth):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        if use_auth:
            log('POST (with auth) %s: %s' % (self.path, post_data.decode('utf-8')))
        else:
            log('POST (without auth) %s: %s' % (self.path, post_data.decode('utf-8')))
        log('POST headers: %s' % str(self.headers))
        logger.debug(f"POST: {str(self.path)}\nHeaders:\n{str(self.headers)}\n\nBody:\n{post_data.decode('utf-8')}\n")
        if g_simulate_post_delay != 0:
            log(f'Simulating delay of {g_simulate_post_delay} seconds...')
            time.sleep(g_simulate_post_delay)
            log('Simulated delay done.')
        if self.path == '/record':
            global g_record
            g_record = post_data.decode('utf-8')
        self.send_response(200)
        self.send_header('Ruuvi-HMAC-KEY', 'new_key')
#         self.send_header('X-Ruuvi-Gateway-Rate', '5')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_POST(self):
        log(f'POST {self.path}')
        if self.path == '/kill':
            log(f'Kill command received, exiting.')
            self.server.running = False
        if self._auth is None:
            self._do_POST(False)
        else:
            """ Present frontpage with user authentication. """
            if self.headers.get("Authorization") is None:
                self.do_AUTHHEAD()
                self.wfile.write(b"no auth header received")
            elif self.headers.get("Authorization") == "Basic " + self._auth:
                self._do_POST(True)
            elif self.headers.get("Authorization") == "Bearer " + self._bearer_token:
                self._do_POST(True)
            else:
                self.do_AUTHHEAD()
                self.wfile.write(self.headers.get("Authorization").encode())
                self.wfile.write(b"not authenticated")

    def _do_GET(self, use_auth):
        # SimpleHTTPRequestHandler.do_GET(self)
        resp = b''
        if self.path != '/':
            # Assuming the base directory for files is the current working directory
            file_path = '.' + self.path  # Prepend '.' to make the path relative to the current directory
            # SimpleHTTPRequestHandler class has built-in measures to prevent directory traversal attacks,
            # so we don't need to sanitize the path to ensure that it cannot navigate outside the current directory
            # using relative paths like '..'.
            if os.path.isfile(file_path):
                # File exists, serve it
                with open(file_path, 'rb') as file:
                    file_content = file.read()
                resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
                # You might want to dynamically set the Content-type based on the file type
                resp += f'Content-type: {self.guess_type(file_path)}\r\n'.encode('ascii')
                resp += f'Content-length: {str(os.stat(file_path).st_size)}\r\n'.encode('ascii')
            else:
                # File not found, return 404
                resp += f'HTTP/1.0 404 Not Found\r\n'.encode('ascii')
                file_content = b'File not found'
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            resp += file_content
        else:
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            if use_auth:
                content = '{"use_auth": true}'
            else:
                content = '{"use_auth": false}'
            resp += content.encode('ascii')
        self.wfile.write(resp)

    def handle_firmware_update(self):
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            content = '''
    {
      "latest": {
        "version": "v1.14.3",
        "url": "https://fwupdate.ruuvi.com/v1.14.3",
        "created_at": "2023-10-06T11:26:07Z"
      }
    }
     '''
            resp += content.encode('ascii')
            self.wfile.write(resp)

    def handle_firmware_update_beta(self):
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        content = '''
{
  "latest": {
    "version": "v1.14.3",
    "url": "https://fwupdate.ruuvi.com/v1.14.3",
    "created_at": "2023-10-06T11:26:07Z"
  },
  "beta": {
    "version": "v1.14.2",
    "url": "https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/v1.14.2",
    "created_at": "2023-09-19T11:16:48Z"
  }
}
 '''
        resp += content.encode('ascii')
        self.wfile.write(resp)

    def handle_firmware_update_not_exist(self):
            resp = b''
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: application/json\r\n'.encode('ascii')
            resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
            resp += f'Pragma: no-cache\r\n'.encode('ascii')
            resp += f'\r\n'.encode('ascii')
            content = '''
    {
      "latest": {
        "version": "v1.14.9",
        "url": "https://fwupdate.ruuvi.com/v1.14.9",
        "created_at": "2023-09-19T11:16:48Z"
      }
    }
     '''
            resp += content.encode('ascii')
            self.wfile.write(resp)

    def handle_firmware_update_empty(self):
        resp = b''
        resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
        resp += f'Content-type: application/json\r\n'.encode('ascii')
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        content = '{ "latest": { "version": "", "url": "", "created_at": "" } }'
        resp += content.encode('ascii')
        self.wfile.write(resp)

    def handle_get_record(self):
        global g_record
        resp = b''
        if g_record is not None:
            file_content = g_record.encode('utf-8')
            resp += f'HTTP/1.0 200 OK\r\n'.encode('ascii')
            resp += f'Content-type: Application\r\n'.encode('ascii')
            resp += f'Content-length: {len(file_content)}\r\n'.encode('ascii')
            g_record = None
        else:
            resp += f'HTTP/1.0 404 Not Found\r\n'.encode('ascii')
            file_content = b'File not found'
        resp += f'Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n'.encode('ascii')
        resp += f'Pragma: no-cache\r\n'.encode('ascii')
        resp += f'\r\n'.encode('ascii')
        resp += file_content
        self.wfile.write(resp)

    def do_GET(self):
        log(f'GET {self.path}')
        if self.path == '/firmwareupdate':
            self.handle_firmware_update()
            return
        if self.path == '/firmwareupdate_beta':
            self.handle_firmware_update_beta()
            return
        if self.path == '/firmwareupdate_not_exist':
            self.handle_firmware_update_not_exist()
            return
        if self.path == '/firmwareupdate_empty':
            self.handle_firmware_update_empty()
            return
        if self.path == '/record':
            self.handle_get_record()
            return
        if self._auth is None:
            self._do_GET(False)
        else:
            """ Present frontpage with user authentication. """
            if self.headers.get("Authorization") is None:
                self.do_AUTHHEAD()
                self.wfile.write(b"no auth header received")
            elif self.headers.get("Authorization") == "Basic " + self._auth:
                self._do_GET(True)
            elif self.headers.get("Authorization") == "Bearer " + self._bearer_token:
                self._do_GET(True)
            else:
                self.do_AUTHHEAD()
                self.wfile.write(self.headers.get("Authorization").encode())
                self.wfile.write(b"not authenticated")


def httpd_run(HandlerClass=BaseHTTPRequestHandler,
              ServerClass=ThreadingHTTPServer,
              protocol="HTTP/1.0", port=8000, bind="", ssl_cert=None, ssl_key=None, ca_cert=None):
    """Test the HTTP request handler class.

    This runs an HTTP server on port 8000 (or the port argument).

    """
    server_address = (bind, port)

    HandlerClass.protocol_version = protocol
    with ServerClass(server_address, HandlerClass) as httpd:
        if ssl_cert is not None:
            if ssl_key is not None:
                context = create_ssl_context(ssl_cert, ssl_key, ca_cert)
            else:
                context = create_ssl_context(ssl_cert, ssl_cert, ca_cert)
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

        sa = httpd.socket.getsockname()
        serve_message = "Serving {conn_type} on {host} port {port} ({conn_type2}://{host}:{port}/) ..."
        conn_type = "HTTP" if ssl_cert is None else "HTTPS"
        log(serve_message.format(conn_type=conn_type.upper(), conn_type2=conn_type.lower(), host=sa[0], port=sa[1]))
        try:
            httpd.running = True
            while httpd.running:
                log("Handle request...")
                httpd.handle_request()
        except KeyboardInterrupt:
            print('\n')
            log("Keyboard interrupt received, exiting.")
            sys.exit(0)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--bind",
        "-b",
        metavar="ADDRESS",
        default="0.0.0.0",
        help="Specify alternate bind address " "[default: all interfaces]",
    )
    parser.add_argument(
        "--directory",
        "-d",
        default=os.getcwd(),
        help="Specify alternative directory " "[default:current directory]",
    )
    parser.add_argument(
        "--port",
        action="store",
        default=8000,
        type=int,
        nargs="?",
        help="Specify alternate port [default: 8000]",
    )
    parser.add_argument(
        "--simulate_just_listen_port",
        action="store_true",
        help="Just listen on the port, don't serve anything",
    )
    parser.add_argument(
        "--simulate_just_accept_connection",
        action="store_true",
        help="Just accept a connection, don't serve anything",
    )
    parser.add_argument(
        "--ssl_cert",
        help="Path to server.pem (for HTTPS), if it contains private key, then --ssl_key is not needed",
    )
    parser.add_argument(
        "--ssl_key",
        help="Path to server_key.pem (for HTTPS)",
    )
    parser.add_argument(
        "--ca_cert",
        help="Path to ca_cert.pem (for HTTPS)",
    )
    parser.add_argument("--username", "-u", metavar="USERNAME")
    parser.add_argument("--password", "-p", metavar="PASSWORD")
    parser.add_argument("--bearer_token", "-t", metavar="BEARER_TOKEN")
    parser.add_argument(
        "--simulate_post_delay",
        action="store",
        default=0,
        type=int,
        help="Simulate delay in POST request processing (seconds)",
    )
    args = parser.parse_args()
    g_simulate_post_delay = args.simulate_post_delay
    if args.simulate_just_listen_port and args.simulate_just_accept_connection:
        print("Options --simulate_just_listen_port and --simulate_just_accept_connection are mutually exclusive.")
        sys.exit(1)
    if args.simulate_just_listen_port:
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind(('0.0.0.0', args.port))
        server_socket.listen(5)
        log(f"Listening for incoming connections on 0.0.0.0 port {args.port}")
        while True:
            time.sleep(1)
    if args.simulate_just_accept_connection:
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind(('0.0.0.0', args.port))
        server_socket.listen(5)
        log(f"Listening for incoming connections on 0.0.0.0 port {args.port}")
        while True:
            client_socket, addr = server_socket.accept()
            log(f"Got a connection from {addr}")
            log("Waiting for 20 seconds before closing a connection...")
            time.sleep(20)
            log(f"Close connection from {addr}")
            client_socket.close()

    handler_class = partial(
        AuthHTTPRequestHandler,
        username=args.username,
        password=args.password,
        bearer_token=args.bearer_token,
        directory=args.directory,
    )
    httpd_run(HandlerClass=handler_class,
              port=args.port,
              bind=args.bind,
              ssl_cert=args.ssl_cert,
              ssl_key=args.ssl_key if args.ssl_key is not None else args.ssl_cert,
              ca_cert=args.ca_cert)

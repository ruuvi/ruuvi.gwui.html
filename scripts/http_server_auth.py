
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


class AuthHTTPRequestHandler(SimpleHTTPRequestHandler):
    """ Main class to present webpages and authentication. """

    def __init__(self, *args, **kwargs):
        username = kwargs.pop("username")
        password = kwargs.pop("password")
        if username is None or password is None:
            self._auth = None
        else:
            self._auth = base64.b64encode(f"{username}:{password}".encode()).decode()
        self.close_connection = False
        super().__init__(*args, **kwargs)

    # def handle_one_request(self):
    #     super(AuthHTTPRequestHandler, self).handle_one_request()
    #     # self.close_connection = False
    #     # self.protocol_version = 'HTTP/1.1'

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
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
            print('POST (with auth) %s: %s' % (self.path, post_data.decode('utf-8')))
        else:
            print('POST (without auth) %s: %s' % (self.path, post_data.decode('utf-8')))
        logging.debug("POST: %s\nHeaders:\n%s\n\nBody:\n%s\n", str(self.path), str(self.headers), post_data.decode('utf-8'))
        self.send_response(200)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_POST(self):
        if self._auth is None:
            self._do_POST(False)
        else:
            """ Present frontpage with user authentication. """
            if self.headers.get("Authorization") is None:
                self.do_AUTHHEAD()
                self.wfile.write(b"no auth header received")
            elif self.headers.get("Authorization") == "Basic " + self._auth:
                self._do_POST(True)
            else:
                self.do_AUTHHEAD()
                self.wfile.write(self.headers.get("Authorization").encode())
                self.wfile.write(b"not authenticated")

    def _do_GET(self, use_auth):
        # SimpleHTTPRequestHandler.do_GET(self)
        print('GET %s' % self.path)
        resp = b''
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

    def do_GET(self):
        if self._auth is None:
            self._do_GET(False)
        else:
            """ Present frontpage with user authentication. """
            if self.headers.get("Authorization") is None:
                self.do_AUTHHEAD()
                self.wfile.write(b"no auth header received")
            elif self.headers.get("Authorization") == "Basic " + self._auth:
                self._do_GET(True)
            else:
                self.do_AUTHHEAD()
                self.wfile.write(self.headers.get("Authorization").encode())
                self.wfile.write(b"not authenticated")


def httpd_run(HandlerClass=BaseHTTPRequestHandler,
              ServerClass=ThreadingHTTPServer,
              protocol="HTTP/1.0", port=8000, bind="", ssl_cert=None):
    """Test the HTTP request handler class.

    This runs an HTTP server on port 8000 (or the port argument).

    """
    server_address = (bind, port)

    HandlerClass.protocol_version = protocol
    with ServerClass(server_address, HandlerClass) as httpd:
        if ssl_cert is not None:
            httpd.socket = ssl.wrap_socket(httpd.socket, certfile=ssl_cert, server_side=True)
        sa = httpd.socket.getsockname()
        serve_message = "Serving {conn_type} on {host} port {port} ({conn_type2}://{host}:{port}/) ..."
        conn_type = "HTTP" if ssl_cert is None else "HTTPS"
        print(serve_message.format(conn_type=conn_type.upper(), conn_type2=conn_type.lower(), host=sa[0], port=sa[1]))
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nKeyboard interrupt received, exiting.")
            sys.exit(0)


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--bind",
        "-b",
        metavar="ADDRESS",
        default="127.0.0.1",
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
        "--ssl_cert",
        help="Path to server.pem (for HTTPS)",
    )
    parser.add_argument("--username", "-u", metavar="USERNAME")
    parser.add_argument("--password", "-p", metavar="PASSWORD")
    args = parser.parse_args()
    handler_class = partial(
        AuthHTTPRequestHandler,
        username=args.username,
        password=args.password,
        directory=args.directory,
    )
    httpd_run(HandlerClass=handler_class, port=args.port, bind=args.bind, ssl_cert=args.ssl_cert)
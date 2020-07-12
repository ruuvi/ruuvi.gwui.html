# ruuvi.ruuvi_gwui.html
Ruuvi Gateway web UI

For the UI testing, a Gateway simulator can be used.

To start simulator run: 

`python ./ruuvi_gw_http_server.py`

This simulator requires python 3.8

To test UI, open web-browser: http://127.0.0.1:8001

You can choose any WiFi from the list, the valid password is `12345678`

======================================

To test connection from the Gateway to HTTP-server, use `http_server_auth.py`

To run HTTP-server without auth:

`pyton http_server_auth.py --bind <IP>`

To run HTTP-server with auth:

`pyton http_server_auth.py --bind <IP> -u <username> -p <password>`

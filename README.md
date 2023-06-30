# ruuvi.gwui.html

## Ruuvi Gateway web UI
This repository contains files related to the web interface of the Gateway configurator. 

### Pre-requisites:

* Install npm:

  `sudo apt install npm`

* Install the Node.js modules that ruuvi.gwui.html depends on:

  `npm install`

## Gateway simulator

For the UI testing, a Gateway simulator can be used.

### Pre-requisites:
* python 3.8

To start simulator run: 

`python ./ruuvi_gw_http_server.py`

To test UI, open in web-browser: http://127.0.0.1:8001

You can choose any Wi-Fi from the list, the valid password is `12345678`

======================================

## Testing HTTP requests from the Gateway

To test connection from the Gateway to HTTP server you need to run an HTTP server on your PC.

You can use `http_server_auth.py` script to run HTTP server. 

### Pre-requisites:
* python 3.8

To test connection from the Gateway to HTTP server, use `http_server_auth.py`

To run HTTP server without auth:

`python http_server_auth.py --bind 0.0.0.0 --port 8000`

To run HTTP server with auth:

`python http_server_auth.py --bind 0.0.0.0 --port 8000 -u <username> -p <password>`

To run HTTPS server:

`python http_server_auth.py --bind 0.0.0.0 --port 8000 --ssl_cert=./server_cert.pem --ssl_key=./server_key.pem`

To run HTTPS server with the client SSL certificate checking:

`python http_server_auth.py --bind 0.0.0.0 --port 8000 --ssl_cert=./server_cert.pem --ssl_key=./server_key.pem --ca_cert=./client_cert.pem`

To generate a certificate and a private key for HTTPS server (2048-bit RSA key) (`server_cert.pem` and `server_key.pem`):

* Generate a private key :

  `openssl genrsa -out server_key.pem 2048`

* Create a Certificate Signing Request (CSR): Generate a CSR using the private key created in the previous step.
  The CSR contains information about your client that the Certificate Authority (CA) will use to create the client certificate.

  `openssl req -new -key server_key.pem -out server_csr.pem`

* Generate the client certificate: You have two options for generating the client certificate:
  * Option A: Self-signed certificate - You can create a self-signed client certificate using the CSR and the client's private key.
    Note that self-signed certificates might not be trusted by all servers and are generally not recommended for production environments.

    `openssl x509 -req -in server_csr.pem -signkey server_key.pem -out server_cert.pem -days 365`

  * Option B: Certificate signed by a Certificate Authority (CA) - If you need a trusted client certificate,
    you should send the CSR (client_csr.pem) to a Certificate Authority (CA) and request them to sign the certificate.
    The CA will provide you with a signed client certificate (usually in PEM format) upon approval.


To generate a certificate and a private key for the client (2048-bit RSA key) (`client_cert.pem` and `client_key.pem`):

* Generate a private key:
  
  `openssl genrsa -out client_key.pem 2048`

* Create a Certificate Signing Request (CSR): Generate a CSR using the private key created in the previous step. 
  The CSR contains information about your client that the Certificate Authority (CA) will use to create the client certificate.
 
  `openssl req -new -key client_key.pem -out client_csr.pem`

* Generate the client certificate: You have two options for generating the client certificate:
  * Option A: Self-signed certificate - You can create a self-signed client certificate using the CSR and the client's private key. 
    Note that self-signed certificates might not be trusted by all servers and are generally not recommended for production environments.

    `openssl x509 -req -in client_csr.pem -signkey client_key.pem -out client_cert.pem -days 365`

  * Option B: Certificate signed by a Certificate Authority (CA) - If you need a trusted client certificate, 
    you should send the CSR (client_csr.pem) to a Certificate Authority (CA) and request them to sign the certificate. 
    The CA will provide you with a signed client certificate (usually in PEM format) upon approval.

## Example of testing a gateway configured to transfer data via HTTP

* Connect your computer to a Wi-Fi network 
  and find out what IP address has been assigned to your computer 
  (we will refer to it as `<IP>` in the following).
  
* Reset the Gateway configuration by pressing the CONFIGURE button for 5 seconds
  
* Connect your PC to the Gateway's Wi-Fi access point, 
  the Gateway configuration page will be automatically opened in your web-browser
  
* On the "SERVER SETTINGS" page select "Use Custom Server" option: 
  
  ![server_settings](docs/ruuvi_server_settings.png)
  
* On the next page set URL to `http://<IP>:8000/record`, leave the 'User' and 'Pass' fields blank:
  
  ![ruuvi_custom_server_settings_http](docs/ruuvi_custom_server_settings_http.png)
  
* On the next page select which devices to scan
  
* On the next page (`INTERNET CONNECTION`) select Wi-Fi
  
* On the next page choose WiFi-network and connect to it, after the connection will be established you should see the following page:
  
  ![ruuvi_configuring_finished](docs/ruuvi_configuring_finished.png)
  
* Close the Configuration UI in browser
  
* Connect your PC to the same WiFi-network as the Gateway is connected
  
* Check that your PC can communicate with the Gateway via Wi-Fi - use `ping <gateway-IP>`
  
* Run HTTP server on your PC:
  `python http_server_auth.py --port 8000 --bind <IP>`
  
  in this example: `python http_server_auth.py --port 8000 --bind 192.168.1.38`
  
* Wait at least 10 seconds until the Gateway to send the accumulated data

## Example of testing a gateway configured to transfer data via HTTPS

* Connect your computer to a Wi-Fi network
  and find out what IP address has been assigned to your computer
  (we will refer to it as `<IP>` in the following).
  
* Reset the Gateway configuration by pressing the CONFIGURE button for 5 seconds
  
* Connect your PC to the Gateway's Wi-Fi access point,
  the Gateway configuration page will be automatically opened in your web-browser
  
* On the "SERVER SETTINGS" page select "Use Custom Server" option:

  ![ruuvi_server_settings](docs/ruuvi_server_settings.png)
  
* On the next page set URL to `https://<IP>:8000/record`, 
  fill the 'User' and 'Pass' fields with `user` and `pass` accordingly:

  ![ruuvi_custom_server_settings_https](docs/ruuvi_custom_server_settings_https.png)
* On the next page select which devices to scan
  
* On the next page (`INTERNET CONNECTION`) select Wi-Fi
  
* On the next page choose WiFi-network and connect to it, after the connection will be established you should see the following page:

  ![ruuvi_configuring_finished](docs/ruuvi_configuring_finished.png)
  
* Close the Configuration UI in browser
  
* Connect your PC to the same WiFi-network as the Gateway is connected
  
* Check that your PC can communicate with the Gateway via Wi-Fi - use `ping <gateway-IP>`
  
* Run HTTPS server on your PC:
  `python http_server_auth.py --port 8000 --bind <IP> --ssl_cert=./server.pem -u user -p pass`
  
  in this example: `python http_server_auth.py --port 8000 --bind 192.168.1.38`
  
* Wait at least 10 seconds until the Gateway to send the accumulated data

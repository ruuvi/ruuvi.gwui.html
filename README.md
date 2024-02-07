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

* python 3.10

### Setup venv

* Create venv:

  `cd scripts`
  `python3 -m venv .venv`
 
* Activate venv:

  `source scripts/.venv/bin/activate`
 
* Upgrade pip:

  `pip install --upgrade pip`

* Install dependencies:

  `pip install -r requirements.txt`

### Run simulator

* `source scripts/.venv/bin/activate`
* `python3 scripts/ruuvi_gw_http_server.py`

To test UI, open in web-browser: http://127.0.0.1:8001
Use default password to access the UI: `00:11:22:33:44:55:66:77`

On the 'Wi-Fi Networks' page you can simulate connection to Wi-Fi network. 
Choose Wi-Fi 'Pantum-AP-A6D49F' with password `12345678`.

On the 'Custom Server' page use URL 'https://network2.ruuvi.com/record' to simulate connection with a custom HTTP server.
To check authentication use URL 'https://network.ruuvi.com/record1' with username 'user1' and password 'pass1'.

On the 'Software Update' page under 'Advanced settings' you can use one of the following URLs to simulate checking for firmware updates:
'https://network.ruuvi.com/firmwareupdate', 'https://network2.ruuvi.com/firmwareupdate'.

On the 'Automatic Configuration Download' page you can use one of the following URLs to simulate downloading configuration from the remote server:
* 'http://192.168.1.100' - to download without authentication
* 'http://192.168.1.101' - to download with 'basic' authentication, username 'user1' and password 'pass1'
* 'http://192.168.1.102' - to download with 'bearer' authentication, token 'token123'

======================================

## Testing HTTP requests from the Gateway

To test connection from the Gateway to HTTP server you need to run an HTTP server on your PC.

You can use `http_server_auth.py` script to run HTTP server. 

### Pre-requisites:

* python 3.10


### Examples of running HTTP server

To test connection from the Gateway to HTTP server, use `http_server_auth.py`

* Activate venv:

  `source scripts/.venv/bin/activate`

* To run HTTP server without auth:

  `python3 scripts/http_server_auth.py --port 8000`

* To run HTTP server with auth:

  `python3 scripts/http_server_auth.py --port 8000 -u <username> -p <password>`

* To run HTTPS server:

  `python3 scripts/http_server_auth.py --port 8000 --ssl_cert=./server_cert.pem --ssl_key=./server_key.pem`

* To run HTTPS server with the client SSL certificate checking:

  `python3 scripts/http_server_auth.py --port 8000 --ssl_cert=./server_cert.pem --ssl_key=./server_key.pem --ca_cert=./client_cert.pem`

### Configuring Domain Name (if you don't have a registered domain)

If you don't have a registered domain name and you want to simulate a domain locally, 
you can achieve this by using mDNS in your local network. 

Here's how you can install and configure mDNS using Avahi on Ubuntu:

* Install Avahi:

  `sudo apt install avahi-daemon`
 
* Open the Avahi configuration file using a text editor. You may use nano, vim, or any other text editor of your choice:

  `sudo nano /etc/avahi/avahi-daemon.conf`
 
* Locate the line that starts with #domain-name= and uncomment it by removing the #. Set the desired domain name for your local network. For example:
  ```text
  domain-name=local
  ```
* Locate the line that starts with #host-name= and uncomment it by removing the #. Set the desired host name for your computer. For example:
  ```text
    host-name=my-https-server
    ```
* Save the changes and exit the text editor.
 
* Restart the Avahi service to apply the changes:

  `sudo service avahi-daemon restart`


To generate a certificate and a private key for HTTPS server (2048-bit RSA key) (`server_cert.pem` and `server_key.pem`):

* Generate a private key :

  `openssl genrsa -out server_key.pem 2048`

* Create a Certificate Signing Request (CSR): Generate a CSR using the private key created in the previous step.
  The CSR contains information about your client that the Certificate Authority (CA) will use to create the client certificate.

  `openssl req -new -key server_key.pem -out server_csr.pem`

  For self-signed certificate when prompted for the following information, enter following values (and leave the rest of the fields default):
  * Enter country name (2 letter code) [AU]: `FI`
  * Common name  (e.g. server FQDN or YOUR name) []: `my-https-server.local`

* Generate the client self-signed certificate:

    `openssl x509 -req -in server_csr.pem -signkey server_key.pem -out server_cert.pem -days 365`

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

* Run HTTP server on your PC:

  * Activate venv:

    `source scripts/.venv/bin/activate`

  `python3 ./scripts/http_server_auth.py --port 8000`

  or if you want to test with authentication:

  `python3 ./scripts/http_server_auth.py --port 8000 -u user -p pass`

* Connect your computer to a Wi-Fi network 
  and find out what IP address has been assigned to your computer 
  (we will refer to it as `<IP>` in the following).
  
* Optionally reset the Gateway configuration by pressing the CONFIGURE button for 5 seconds
  
  * Connect your PC to the Gateway's Wi-Fi access point, 
    the Gateway configuration page will be automatically opened in your web-browser

  * Configure the Gateway to connect to Wi-Fi or Ethernet, then apply default settings and save the configuration.
   
  * Close the Configuration UI in browser

* Connect your PC to the same Wi-Fi/Ethernet network as the Gateway is connected

* Check that your PC can communicate with the Gateway via Wi-Fi - use `ping <gateway-IP>`

* Open the Configuration UI in browser.
  
* On the "Cloud Options" page under "Advanced settings" select "Use Ruuvi Cloud and/or a custom server and configure other advanced settings" option: 
  
  ![server_settings](docs/ruuvi_server_settings.png)
  
* On the next page configure custom HTTP(S) and set URL to `http://<IP>:8000/record`:
  
  ![ruuvi_custom_server_settings_http](docs/ruuvi_custom_server_settings_http.png)

* Configure the required options on the following pages and complete the configuration:
  
  ![ruuvi_configuring_finished](docs/ruuvi_configuring_finished.png)
  
* Wait at least 10 seconds until the Gateway to send the accumulated data


## Example of testing a gateway configured to transfer data via HTTPS

* Run HTTPS server on your PC:

  * Activate venv:

    `source scripts/.venv/bin/activate`

  `python3 scripts/http_server_auth.py --port 8000 --ssl_cert=./server_cert.pem --ssl_key=./server_key.pem`

  or to run HTTPS server with the client SSL certificate checking:

  `python3 scripts/http_server_auth.py --port 8000 --ssl_cert=./server_cert.pem --ssl_key=./server_key.pem --ca_cert=./client_cert.pem`

* Connect your computer to a Wi-Fi network and ensure that mDNS is installed and configured on your computer as described earlier.
  
* Optionally reset the Gateway configuration by pressing the CONFIGURE button for 5 seconds
  
  * Connect your PC to the Gateway's Wi-Fi access point,
    the Gateway configuration page will be automatically opened in your web-browser
 
  * Configure the Gateway to connect to Wi-Fi or Ethernet, then apply default settings and save the configuration.

  * Close the Configuration UI in browser

* Connect your PC to the same Wi-Fi/Ethernet network as the Gateway is connected

* Check that your PC can communicate with the Gateway via Wi-Fi - use `ping <gateway-IP>`

* Open the Configuration UI in browser.

* On the "Cloud Options" page under "Advanced settings" select "Use Ruuvi Cloud and/or a custom server and configure other advanced settings" option: 

  ![ruuvi_server_settings](docs/ruuvi_server_settings.png)

* On the next page configure custom HTTP(S) and 
  * Set URL to `https://my-https-server.local:8000/record`
  * Enable the "Use custom SSL certificate for the server" checkbox and upload the generated server certificate `server_cert.pem`.

    ![ruuvi_custom_server_settings_https](docs/ruuvi_custom_server_settings_https.png)

* Click on the "Check" button to verify that connection with your server is successful.

* Configure the required options on the following pages and complete the configuration:

  ![ruuvi_configuring_finished](docs/ruuvi_configuring_finished.png)
  
* Close the Configuration UI in browser
  
* Wait at least 10 seconds until the Gateway to send the accumulated data

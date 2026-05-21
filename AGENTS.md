# AGENTS.md — Ruuvi Gateway Web UI

## Project Overview
Web configurator UI for Ruuvi Gateway (ESP-based IoT gateway). Configures Wi-Fi, Ethernet, HTTP/MQTT data forwarding, Bluetooth scanning, NTP, firmware updates, and remote configuration. Served from a FATFS partition on the ESP32.

## Tech Stack
- ES modules (`.mjs`) with jQuery for DOM manipulation
- Webpack (dev/prod configs) with Babel (targeting Safari 12)
- Mocha + Chai + Sinon + fetch-mock for testing
- Python 3.10 gateway simulator (`scripts/ruuvi_gw_http_server.py`)

## Commands
```bash
npm install           # Install dependencies
npm test              # Run unit tests (Mocha/Chai/Sinon)
npm run build-dev     # Webpack dev build
npm run build-prod    # Webpack prod build
```

### Gateway Simulator
```bash
cd scripts && python3 -m venv .venv
source scripts/.venv/bin/activate
pip install --upgrade pip && pip install -r requirements.txt
python3 scripts/ruuvi_gw_http_server.py
# Open http://127.0.0.1:8001, password: 00:11:22:33:44:55:66:77
# Wi-Fi test: network 'Pantum-AP-A6D49F', password '12345678'
```

## Project Structure
- `src/` — All source files
  - `gw_cfg.mjs` — Main config class (`GwCfg`), orchestrates fetch/save of all config sections
  - `gw_cfg_*.mjs` — Config section modules (http, mqtt, ntp, scan, eth, info, etc.)
  - `page_*.mjs` — UI page controllers (custom_server, wifi_connection, scanning, etc.)
  - `gui_*.mjs` — Reusable GUI components (input, checkbox, button, div, etc.)
  - `network.mjs` — HTTP client (`Network` class with static methods)
  - `utils.mjs` — Shared utilities (`fetchBoolKeyFromData`, `validate_url`, etc.)
  - `*.test.js` — Test files (same directory as source, named `<module>.test.js`)

## Code Conventions
- ES module imports/exports (`.mjs` extension)
- Classes with private fields (`#field`) for encapsulation
- Config parsing uses `utils.fetchBoolKeyFromData(data, key, required, default)` pattern which deletes consumed keys from `data` object (for detecting unhandled keys)
- GUI components extend `GuiObj` base class
- `Network` class methods: `httpGetJson`, `httpGetPlainText`, `httpPostJson`, `httpEncryptAndPostJson`, `httpDeleteJson`
- `log_wrap(msg)` prepends ISO timestamp to log messages

## Testing Patterns
- Each `gw_cfg_*.mjs` has a corresponding `gw_cfg_*.test.js`
- Tests use `describe`/`it` blocks, `sinon.createSandbox()`, and stub `console.log` in `beforeEach`
- Tests verify parsing by checking field values after `parse(data)` and that consumed keys are removed (`Object.keys(data).length === 0`)
- Integration tests in `gw_cfg.test.js` use `fetch-mock` to mock `/ruuvi.json` endpoint
- `GwCfg` exposes `testPrepConfig()`, `testPrepNetworkConfig()`, etc. for testing serialization


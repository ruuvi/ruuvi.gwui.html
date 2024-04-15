/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import puppeteer from 'puppeteer';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import fs from 'fs';
import yaml from 'js-yaml';
import {UiScript} from "./ruuvi_gw_ui_script.js";

class CmdArgs {
  constructor(args) {
    this.args = args;
  }

  get config() {
    return this.args.config;
  }

  get secrets() {
    return this.args.secrets;
  }
}

/** Delay execution for the specified number of milliseconds
 *
 * @param {number | string} ms - The number of milliseconds to wait.
 * @param {string?} log_msg - The message to log.
 * @returns {Promise<unknown>}
 */
async function delay(ms, log_msg) {
  ms = parseInt(ms || 0);
  if (ms === 0) {
    return;
  }
  if (log_msg) {
    console.log(`${log_msg}: ${ms} ms`);
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Loads YAML data from a specified file.
 *
 * @param {string} filePath - The path to the JSON file.
 * @returns {Object} The parsed YAML object.
 */
function loadConfig(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    console.error(`Error reading YAML from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Loads JSON data from a specified file.
 *
 * @param {string} filePath - The path to the JSON file.
 * @returns {Object} The parsed JSON object.
 */
function loadJsonFile(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error reading JSON from ${filePath}:`, error);
    throw error;
  }
}

(async () => {
  try {
    const argv = yargs(hideBin(process.argv))
        .options({
          config: { type: 'string', demandOption: true, describe: 'Path to the YAML config file' },
        })
        .options({
          secrets: { type: 'string', demandOption: true, describe: 'Path to the JSON file with the secrets' },
        })
        .argv;

    const args = new CmdArgs(argv);
    const secrets = loadJsonFile(args.secrets);
    for (const key in secrets) {
      if (Array.isArray(secrets[key])) {
        secrets[key] = secrets[key].join('\n');
      }
    }

    const params = {
      secrets: secrets
    }

    const config = loadConfig(args.config);
    const uiScript = new UiScript(config, params);

    const screenWidth = uiScript.env.screenWidth ? uiScript.env.screenWidth : 800;
    const screenHeight = uiScript.env.screenWidth ? uiScript.env.screenHeight : 1024;

    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null, // Disables Puppeteer's default viewport settings
      args: [`--window-size=${screenWidth},${screenHeight}`] // Set initial window size, height will be adjusted
    });
    const page = await browser.newPage();

    await page.goto(uiScript.env.url);

    // Wait for the page to load, which includes completing redirection
    await page.waitForNavigation({ waitUntil: 'load' });
    await delay(2000);

    const currentUrl = page.url();
    console.log(`UI opened, current URL: ${currentUrl}`);

    await uiScript.execute(page);

    await browser.close();

    console.log(`Finished successfully`);

    process.exit(0);
  } catch (error) {
    console.error('An error occurred: ', error);
    process.exit(1);
  }
})();

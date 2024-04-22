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
import logger from './ruuvi_gw_ui_logger.js';
import path from "path";

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
    logger.info(`${log_msg}: ${ms} ms`);
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
    logger.error(`Error reading YAML from ${filePath}:`, error);
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
    logger.error(`Error reading JSON from ${filePath}:`, error);
    throw error;
  }
}

async function directoryExists(path) {
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
}

async function removeDirectory(path) {
  if(await directoryExists(path)) {
    await fs.promises.rmdir(path, {recursive: true});
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
        .options({
          dir_test: { type: 'string', demandOption: true, describe: 'Path to the folder with the test data, results and logs' },
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
      secrets: secrets,
      dir: {
        test: argv.dir_test,
      },
    }

    const config = loadConfig(args.config);
    const uiScript = new UiScript(config, params);

    const screenWidth = uiScript.env.screenWidth ? uiScript.env.screenWidth : 800;
    const screenHeight = uiScript.env.screenWidth ? uiScript.env.screenHeight : 1024;

    const browser_tmp = path.join(argv.dir_test, 'tmp');
    await removeDirectory(browser_tmp);
    const browser = await puppeteer.launch({
      headless: false,
      ignoreDefaultArgs: false,
      args: [
        `--window-size=${screenWidth},${screenHeight}`,
        '--disable-infobars',
        '--noerrdialogs',
        '--disable-translate',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disk-cache-size=0'
      ],
      defaultViewport: null, // Disables Puppeteer's default viewport settings
      userDataDir: browser_tmp,
    });

    await uiScript.execute(browser);

    logger.info(`Finished successfully`);

    process.exit(0);
  } catch (error) {
    logger.error('An error occurred: ', error);
    process.exit(1);
  }
})();

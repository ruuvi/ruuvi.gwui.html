/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import puppeteer, {Page} from 'puppeteer';
import fs from 'fs';
import path from "path";

/**
 * Checks if the element specified by selector has a certain class.
 *
 * @param {Page} page - The Puppeteer page object.
 * @param {string} selector - The CSS selector for the element to check.
 * @param {string} className - The class name to check for.
 * @returns {Promise<boolean>} A promise that resolves to true if the element has the class, false otherwise.
 */
async function hasClass(page, selector, className) {
  return page.$eval(selector, (elem, className) => {
    return elem.classList.contains(className);
  }, className);
}

/** Check if the given element has style "display: none;"
 *
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
async function hasStyleDisplayNone(page, selector) {
  return page.$eval(selector, (elem) => {
    return getComputedStyle(elem).display === 'none';
  });
}

/** Check if the given element is disabled
 *
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
async function hasAttributeDisabled(page, selector) {
  return page.$eval(selector, (elem) => {
    return elem.hasAttribute('disabled');
  });
}

/** Check if the given checkbox is checked
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
async function checkIsCheckboxChecked(page, selector) {
  const isCheckboxChecked = await page.$eval(selector, /** @type {HTMLInputElement} */ (elem) => {
    if (elem.type !== 'checkbox') {
      throw new Error(`Element ${selector} is not a checkbox: ${elem}`);
    }
    return elem.checked;
  });
  if (isCheckboxChecked === null) {
    throw new Error(`Checkbox '${selector}' not found`);
  }
  return isCheckboxChecked;
}

/**
 * @class
 */
export class UiScriptAction {
  constructor() {
  }

  /**
   * @abstract
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    throw new Error("Method 'execute' must be implemented.");
  }
}

/**
 * @class
 */
export class UiScriptActionIf {
  static UiScriptActionIfType = {
    IS_INVISIBLE: "isInvisible",
    IS_VISIBLE: "isVisible",
    IS_DISABLED: "isDisabled",
    IS_ENABLED: "isEnabled",
    HAS_CLASS_DISABLE_CLICK: "hasClassDisableClick",
    HAS_NO_CLASS_DISABLE_CLICK: "hasNoClassDisableClick"
  };

  /**
   * @param {boolean} is_inverse
   */
  constructor(is_inverse) {
    this.is_inverse = is_inverse;
  }

  /**
   * @param {string} check
   * @param {string[]} args
   */
  static create(check, args) {
    if (check === UiScriptActionIf.UiScriptActionIfType.IS_INVISIBLE) {
      return new UiScriptActionIfIsInvisible(false, args);
    }
    if (check === UiScriptActionIf.UiScriptActionIfType.IS_VISIBLE) {
      return new UiScriptActionIfIsInvisible(true, args);
    }
    if (check === UiScriptActionIf.UiScriptActionIfType.IS_DISABLED) {
      return new UiScriptActionIfIsDisabled(false, args);
    }
    if (check === UiScriptActionIf.UiScriptActionIfType.IS_ENABLED) {
      return new UiScriptActionIfIsDisabled(true, args);
    }
    if (check === UiScriptActionIf.UiScriptActionIfType.HAS_CLASS_DISABLE_CLICK) {
      return new UiScriptActionIfHasClassDisableClick(false, args);
    }
    if (check === UiScriptActionIf.UiScriptActionIfType.HAS_NO_CLASS_DISABLE_CLICK) {
      return new UiScriptActionIfHasClassDisableClick(true, args);
    }
    throw new Error(`Invalid check: ${check}`);
  }

  /**
   * @abstract
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async check(page) {
    throw new Error("Method 'check' must be implemented.");
  }
}

/**
 * @class
 * @extends UiScriptActionIf
 */
export class UiScriptActionIfIsInvisible extends UiScriptActionIf {
  /**
   * @param {boolean} is_inverse
   * @param {string[]} args
   */
  constructor(is_inverse, args) {
    super(is_inverse);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionIfIsInvisible: Expected 1 argument, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
  }

  /**
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async check(page) {
    const isDisplayNone = await hasStyleDisplayNone(page, this.selector);
    return this.is_inverse ? !isDisplayNone : isDisplayNone;
  }
}

/**
 * @class
 * @extends UiScriptActionIf
 * @param {string[]} args
 */
export class UiScriptActionIfIsDisabled extends UiScriptActionIf {
  constructor(is_inverse, args) {
    super(is_inverse);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionIfIsDisabled: Expected 1 argument, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
  }
  /**
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async check(page) {
    const isDisabled = await hasAttributeDisabled(page, this.selector);
    return this.is_inverse ? !isDisabled : isDisabled;
  }
}

/**
 * @class
 * @extends UiScriptActionIf
 * @param {string[]} args
 */
export class UiScriptActionIfHasClassDisableClick extends UiScriptActionIf {
  constructor(is_inverse, args) {
    super(is_inverse);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionIfHasClassDisableClick: Expected 1 argument, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
  }
  /**
   * @param {Page} page
   * @returns {Promise<boolean>}
   */
  async check(page) {
    const isDisabled = await hasClass(page, this.selector, 'disable-click');
    return this.is_inverse ? !isDisabled : isDisabled;
  }
}

/**
 * @class
 */
export class UiScriptActionDo extends UiScriptAction {
  static defaultPreClickDelay = 1000;
  static defaultPostClickDelay = 2000;

  static resetToDefaults() {
    UiScriptActionDo.defaultPreClickDelay = 1000;
    UiScriptActionDo.defaultPostClickDelay = 2000;
  }

  static UiScriptActionDoType = {
    FILL_INPUT: "fillInput",
    CLICK_AND_NAVIGATE: "clickAndNavigate",
    FAIL: "fail",
    DELAY: "delay",
    WAIT_UNTIL_LOADED: "waitUntilLoaded",
    SHOW_ADVANCED_SETTINGS: "showAdvancedSettings",
    HIDE_ADVANCED_SETTINGS: "hideAdvancedSettings",
    SELECT_RADIO: "selectRadio",
    CHECK_CHECKBOX: "checkCheckbox",
    UNCHECK_CHECKBOX: "uncheckCheckbox",
    CLICK_BUTTON: "clickButton",
    CLICK_BUTTON_UPLOAD_FILE: "clickButtonUploadFile",
    SAVE_FILE: "saveFile",
  };

  /**
   * @param {string} action_type
   * @param {Object | undefined} params
   */
  constructor(action_type, params) {
    super();
    this.action_type = action_type;
    this.preClickDelay = UiScriptActionDo.defaultPreClickDelay;
    this.postClickDelay = UiScriptActionDo.defaultPostClickDelay;

    if (params) {
      this.preClickDelay = (params.preClickDelay !== undefined) ? Number(params.preClickDelay) :
          UiScriptActionDo.defaultPreClickDelay;
      if (isNaN(this.preClickDelay)) {
        throw new Error(`UiScriptActionDo: 'preClickDelay' must be a number, got '${typeof this.preClickDelay}': ${params.preClickDelay}.`);
      }
      delete params.preClickDelay;

      this.postClickDelay = (params.postClickDelay !== undefined) ? Number(params.postClickDelay) :
          UiScriptActionDo.defaultPostClickDelay;
      if (isNaN(this.postClickDelay)) {
        throw new Error(`UiScriptActionDo: 'postClickDelay' must be a number, got '${typeof this.postClickDelay}': ${params.postClickDelay}.`);
      }
      delete params.postClickDelay;
    }
  }

  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   * @returns {UiScriptActionDo}
   * @throws {Error} If the action type is invalid.
   */
  static create(action_type, args, params) {
    if (action_type === UiScriptActionDo.UiScriptActionDoType.FILL_INPUT) {
      return new UiScriptActionDoFillInput(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.CLICK_AND_NAVIGATE) {
      return new UiScriptActionDoClickAndNavigate(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.FAIL) {
      return new UiScriptActionDoFail(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.DELAY) {
      return new UiScriptActionDoDelay(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.WAIT_UNTIL_LOADED) {
      return new UiScriptActionDoWaitUntilLoaded(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.SHOW_ADVANCED_SETTINGS) {
      return new UiScriptActionDoShowAdvancedSettings(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.HIDE_ADVANCED_SETTINGS) {
      return new UiScriptActionDoHideAdvancedSettings(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.SELECT_RADIO) {
      return new UiScriptActionDoSelectRadio(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.CHECK_CHECKBOX) {
      return new UiScriptActionDoCheckbox(action_type, args, params, true);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.UNCHECK_CHECKBOX) {
      return new UiScriptActionDoCheckbox(action_type, args, params, false);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.CLICK_BUTTON) {
      return new UiScriptActionDoClickButton(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.CLICK_BUTTON_UPLOAD_FILE) {
      return new UiScriptActionDoClickButtonUploadFile(action_type, args, params);
    }
    if (action_type === UiScriptActionDo.UiScriptActionDoType.SAVE_FILE) {
      return new UiScriptActionDoSaveFile(action_type, args, params);
    }
    throw new Error(`Invalid 'do' action: ${action_type}`);
  }

  /** Delay execution for the specified number of milliseconds
   *
   * @param {number | string} ms - The number of milliseconds to wait.
   * @param {string?} log_msg - The message to log.
   * @returns {Promise<unknown>}
   */
  async delay(ms, log_msg) {
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
   * @abstract
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    throw new Error("Method 'execute' must be implemented.");
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoFillInput extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 2) {
      throw new Error(`UiScriptActionDoFillInput: Expected 2 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
    this.value = args[1];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    console.log(`Execute sequence: Fill input: ${this.selector} with ${this.value}`);
    await page.waitForSelector(this.selector);

    await page.evaluate(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView();
      }
    }, this.selector);

    await this.delay(this.preClickDelay);

    await page.focus(this.selector);
    // Select all text in the input element
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');

    // Press 'Backspace' to delete all selected text
    await page.keyboard.press('Backspace');

    await page.type(this.selector, this.value);

    await this.delay(this.postClickDelay, "Post click delay");
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoClickAndNavigate extends UiScriptActionDo {
  static defaultNavigationTimeout = 30000;

  static resetToDefaults() {
    UiScriptActionDoClickAndNavigate.defaultNavigationTimeout = 30000;
  }

  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoClickAndNavigate: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
    this.navigationTimeout = UiScriptActionDoClickAndNavigate.defaultNavigationTimeout;
    if (params) {
      this.navigationTimeout = (params.navigationTimeout !== undefined) ? Number(params.navigationTimeout) :
          UiScriptActionDoClickAndNavigate.defaultNavigationTimeout;
      if (isNaN(this.navigationTimeout)) {
        throw new Error(`UiScriptActionDoClickAndNavigate: 'navigationTimeout' must be a number, got '${typeof this.navigationTimeout}': ${params.navigationTimeout}.`);
      }
      delete params.navigationTimeout;
    }
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    await page.evaluate(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView();
      }
    }, this.selector);

    await this.delay(this.preClickDelay);

    console.log(`Execute sequence: Click on ${this.selector} and waiting for navigation (timeout: ${this.navigationTimeout} ms)...`);
    await Promise.race([
      page.click(this.selector),
      page.waitForNavigation({ timeout: this.navigationTimeout }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for navigation')), parseInt(this.navigationTimeout)))
    ]);
    await this.delay(this.postClickDelay, 'Post click delay');
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoFail extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoFail: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.message = args[0];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    console.error(`Execute sequence: Fail: ${this.message}`);
    process.exit(1);
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoDelay extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoDelay: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.delay_ms = args[0];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    console.log(`Execute sequence: Delay: ${this.delay_ms} ms.`);
    await this.delay(this.delay_ms);
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoWaitUntilLoaded extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoWaitUntilLoaded: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.timeout = parseInt(args[0]);
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    console.log(`Execute sequence: WaitUntilLoaded: with timeout ${this.timeout} ms`);
    await this.#waitUntilLoaded(page, this.timeout)
        .catch(error => {
          console.error('Failed to wait until page is loaded:', error.message);
          throw error;  // Stop execution and throw the error
        });
    console.log(`Execute sequence: WaitUntilLoaded: done`);
  }

  /**
   * Waits until a specific loading condition is no longer true or until a timeout occurs.
   * @param {Page} page - The Puppeteer page object.
   * @param {number} timeout - The maximum time to wait in milliseconds.
   */
  async #waitUntilLoaded(page, timeout) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = 500;  // Check every 500ms

      const interval = setInterval(async () => {
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed >= timeout) {
          clearInterval(interval);
          reject(new Error('Timeout waiting for loading to finish'));
        }

        try {
          const isLoading = await hasClass(page, 'body', 'is-loading');
          if (!isLoading) {
            clearInterval(interval);
            resolve();
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, checkInterval);
    });
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoShowAdvancedSettings extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoShowAdvancedSettings: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    const isVisibleAdvancedSettings = await hasStyleDisplayNone(page,
        `${this.selector} .btn-dropdown-arrow-down`);
    console.log(`Show Advanced settings`);
    if (isVisibleAdvancedSettings) {
      console.log(`Advanced settings are already visible`);
      return;
    }
    await page.evaluate(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView();
      }
    }, this.selector);

    await this.delay(this.preClickDelay);
    console.log(`Execute sequence: Click on ${this.selector}`);
    await page.click(this.selector);
    await this.delay(this.postClickDelay, 'Post click delay');
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoHideAdvancedSettings extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoHideAdvancedSettings: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    const isVisibleAdvancedSettings = await hasStyleDisplayNone(page,
        `${this.selector} .btn-dropdown-arrow-down`);
    console.log(`Hide Advanced settings`);
    if (!isVisibleAdvancedSettings) {
      console.log(`Advanced settings are not visible`);
      return;
    }
    await page.evaluate(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView();
      }
    }, this.selector);

    await this.delay(this.preClickDelay);
    console.log(`Execute sequence: Click on ${this.selector}`);
    await page.click(this.selector);
    await this.delay(this.postClickDelay, 'Post click delay');
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoSelectRadio extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoSelectRadio: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    console.log(`Execute sequence: Select radio ${this.selector}`);

    await this.delay(this.preClickDelay);

    const inputHandle = await page.$(this.selector);
    const isRadioInput = await page.evaluate(/** @type {HTMLInputElement} */ elem => {
      return elem.tagName === 'INPUT' && elem.type === 'radio';
    }, inputHandle);
    if (!isRadioInput) {
      throw new Error(`Element ${this.selector} is not a radio input`);
    }
    const parentLabelHandle = await page.evaluateHandle(elem => elem.parentElement, inputHandle);
    const isLabel = await page.evaluate(elem => elem.tagName === 'LABEL', parentLabelHandle);
    if (!isLabel) {
      throw new Error(`Parent element of ${this.selector} is not a label`);
    }
    await page.evaluate(elem => {
      elem.scrollIntoView();
      elem.click(); // Perform the click inside the browser context
    }, parentLabelHandle);

    console.log(`Post click delay:  ${this.postClickDelay} ms`);
    await this.delay(this.postClickDelay);
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoCheckbox extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   * @param {boolean} setChecked
   */
  constructor(action_type, args, params, setChecked) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoSelectCheckbox: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
    this.setChecked = setChecked;
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    console.log(`Execute sequence: Set checkbox '${this.selector}': ${this.setChecked ? 'checked' : 'unchecked'}`);

    const inputHandle = await page.$(this.selector);
    const isCheckboxInput = await page.evaluate(/** @type {HTMLInputElement} */ elem => {
      return elem.tagName === 'INPUT' && elem.type === 'checkbox';
    }, inputHandle);
    if (!isCheckboxInput) {
      throw new Error(`Element ${this.selector} is not a checkbox input`);
    }

    const parentLabelHandle = await page.evaluateHandle(elem => elem.parentElement, inputHandle);
    const isLabel = await page.evaluate(elem => elem.tagName === 'LABEL', parentLabelHandle);
    if (!isLabel) {
      throw new Error(`Parent element of ${this.selector} is not a label`);
    }

    const isCheckboxChecked = await page.evaluate(/** @type {HTMLInputElement} */ elem => {
      return elem.checked;
    }, inputHandle);

    await page.evaluate(elem => {
      elem.scrollIntoView();
    }, parentLabelHandle);

    await this.delay(this.preClickDelay);

    if (isCheckboxChecked === this.setChecked) {
      console.log(`Checkbox ${this.selector} is already ${this.setChecked ? 'checked' : 'unchecked'}`);
    } else {
      await page.evaluate(elem => {
        elem.click(); // Perform the click inside the browser context
      }, parentLabelHandle);
    }

    await this.delay(this.postClickDelay, "Post click delay");
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoClickButton extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 1) {
      throw new Error(`UiScriptActionDoClickButton: Expected 1 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    await page.evaluate(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView();
      }
    }, this.selector);

    await this.delay(this.preClickDelay);
    console.log(`Execute sequence: Click on the button ${this.selector}`);
    await page.click(this.selector);
    await this.delay(this.postClickDelay, 'Post click delay');
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoClickButtonUploadFile extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 3) {
      throw new Error(`UiScriptActionDoClickButtonUploadFile: Expected 3 arguments, got ${args.length}, args: ${args}`);
    }
    this.selector = args[0];
    this.file_path = args[1];
    this.flag_remove_file = args[2].toLowerCase() === 'true';
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    await page.evaluate(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView();
      }
    }, this.selector);

    await this.delay(this.preClickDelay);
    console.log(`Execute sequence: Click on the button '${this.selector}' and upload file '${this.file_path}'`);

    const fullPath = path.resolve(this.file_path);
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click(this.selector),
    ]);
    await fileChooser.accept([fullPath]);
    if (this.flag_remove_file) {
      console.log(`Delete file: ${this.file_path}`);
      try {
        await fs.promises.unlink(fullPath);
      } catch (error) {
        console.log(`Error deleting file: ${fullPath}`, error);
      }
    }
    await this.delay(this.postClickDelay, 'Post click delay');
  }
}

/**
 * @class
 * @extends UiScriptActionDo
 */
export class UiScriptActionDoSaveFile extends UiScriptActionDo {
  /**
   * @param {string} action_type
   * @param {string[]} args
   * @param {Object | undefined} params
   */
  constructor(action_type, args, params) {
    super(action_type, params);
    if (args.length !== 2) {
      throw new Error(`UiScriptActionDoClickButtonUploadFile: Expected 2 arguments, got ${args.length}, args: ${args}`);
    }
    this.file_path = args[0];
    this.file_content = args[1];
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    console.log(`Execute sequence: Save file: '${this.file_path}'`);
    await fs.promises.writeFile(this.file_path, this.file_content);
  }
}

/**
 * @class
 */
export class UiScriptStep {
  static UiScriptStepType = {
    IF: "if",
    DO: "do",
    STEPS: "steps",
  };

  /**
   * @param {string} control_statement_type
   *     The type of the control statement: 'if', 'do', or 'steps'.
   */
  constructor(control_statement_type) {
    if (this.constructor === UiScriptStep) {
      throw new Error("Abstract class ControlStatement cannot be instantiated directly.");
    }
    if (!Object.values(UiScriptStep.UiScriptStepType).includes(control_statement_type)) {
      throw new Error(`Invalid control statement: ${control_statement_type}`);
    }
    this.control_statement_type = control_statement_type;
  }

  /**
   * @param {Object} step
   *   It can be an object:
   *   - { do: "fillInput \"#auth-pass\" \"${env:password}\"" }
   *   - { if: "isInvisible \"#auth-user_login\"" }
   *   - { steps: [{}, {}] }
   * @returns {UiScriptStep}
   * @throws {Error} If the control statement is invalid.
   */
  static create(step) {
    const control_statement = Object.keys(step)[0];
    switch (control_statement) {
      case UiScriptStep.UiScriptStepType.IF:
        return new UiScriptStepIf(step);

      case UiScriptStep.UiScriptStepType.DO:
        return new UiScriptStepDo(step);

      case UiScriptStep.UiScriptStepType.STEPS:
        return new UiScriptStepSteps(step);

      default:
        throw new Error(`Invalid control statement: ${control_statement}`);
    }
  }

  /**
   * @abstract
   * @param page
   * @returns {Promise<void>}
   */
  async execute(page) {
    throw new Error("Method 'execute' must be implemented.");
  }
}

/**
 * @class
 * @extends UiScriptStep
 */
export class UiScriptStepIf extends UiScriptStep {
  /**
   * @param {object} step
   *   It can be an object: { if: "isInvisible \"#auth-user_login\"", then: [], else: [] }
   * */
  constructor(step) {
    super(UiScriptStep.UiScriptStepType.IF);

    if (typeof step !== 'object') {
      throw new Error(`UiScriptControlStatementIf: 'if' must be an object, got '${typeof step}' instead: ${step}.`);
    }

    // Remove 'if', 'then' and 'else' keys from the object
    const emptyStatement = Object.entries(step)
        .filter(([key, _]) => ![UiScriptStep.UiScriptStepType.IF, 'then', 'else'].includes(key))
        .reduce((obj, [key, value]) => ({...obj, [key]: value}), {});
    if (Object.keys(emptyStatement).length !== 0) {
      throw new Error(`UiScriptControlStatementIf: Unexpected key(s) found: ${Object.keys(emptyStatement)}`);
    }

    const statement_params = step[UiScriptStep.UiScriptStepType.IF];
    const words = statement_params.match(/(?:[^\s"]+|"[^"]*")+/g);
    const [check, ...args] = words;
    const argsWithoutQuotes = args.map(arg => arg.replace(/^"|"$/g, ''));

    this.action_if = UiScriptActionIf.create(check, argsWithoutQuotes);
    const then_part = step['then'];
    if (!then_part) {
      throw new Error("UiScriptStepIf: 'then' expected after 'if'.");
    }

    this.then_part = new UiScriptStepSteps({ steps: this.#get_arr_of_steps(then_part) });
    this.else_part = new UiScriptStepSteps({ steps: this.#get_arr_of_steps(step['else']) });
  }

  /**
   * Parses the steps in the UI script.
   * @param {object[] | string | undefined} steps
   * @returns {object[]}
   * @throws {Error} If steps is not an array or string.
   */
  #get_arr_of_steps(steps) {
    if (!steps) {
      return [];
    } else if (typeof steps === 'string') {
      return [{ do: steps }];
    } else if (Array.isArray(steps)) {
      return steps;
    } else {
      throw new Error(`UiScriptStepIf: 'steps' must be an array, got '${typeof steps}' instead: '${steps}'.`);
    }
  }

  /**
   * @param page
   * @returns {Promise<void>}
   */
  async execute(page) {
    const result = await this.action_if.check(page);
    if (result) {
      await this.then_part.execute(page);
    } else {
      await this.else_part.execute(page);
    }
  }
}

/**
 * @class
 * @extends UiScriptStep
 */
export class UiScriptStepDo extends UiScriptStep {
  /**
   * @param {object} step
   * */
  constructor(step) {
    super(UiScriptStep.UiScriptStepType.DO);

    if (!step) {
      throw new Error("UiScriptControlStatementDo: 'do' is empty.");
    }

    const statement_params = step[UiScriptStep.UiScriptStepType.DO];
    if (typeof statement_params !== 'string') {
      throw new Error(`UiScriptControlStatementDo: 'do' must have argument of a string type, got '${typeof statement_params}' instead: ${step}.`);
    }

    // Remove 'do' and 'params' keys from the object
    const emptyStatement = Object.entries(step)
        .filter(([key, _]) => ![UiScriptStep.UiScriptStepType.DO, 'params'].includes(key))
        .reduce((obj, [key, value]) => ({...obj, [key]: value}), {});
    if (Object.keys(emptyStatement).length !== 0) {
      throw new Error(`UiScriptControlStatementDo: Unexpected key(s) found: '${Object.keys(emptyStatement)}'.`);
    }

    const words = statement_params.match(/(?:[^\s"]+|"[^"]*")+/g);
    const [action, ...args] = words;
    const argsWithoutQuotes = args.map(arg => arg.replace(/^"|"$/g, ''));
    let params = step['params'];
    if (params) {
      if (typeof params !== 'object') {
        throw new Error(`UiScriptControlStatementDo: 'params' must be an object, got '${typeof params}' instead: '${params}'.`);
      }
      if (Array.isArray(params)) {
        throw new Error(`UiScriptControlStatementDo: 'params' must be an object, got an array instead: '${params}'.`);
      }
    }
    this.action_do = UiScriptActionDo.create(action, argsWithoutQuotes, params);

    if (params) {
      if (Object.keys(params).length !== 0) {
        throw new Error(`UiScriptControlStatementDo: Unexpected key(s) found in 'params': '${Object.keys(params)}'.`);
      }
    }
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    await this.action_do.execute(page);
  }
}

/**
 * @class
 * @extends UiScriptStep
 */
export class UiScriptStepSteps extends UiScriptStep {
  /**
   * @param {object} step
   *   It can be an object: { steps: [] }
   * */
  constructor(step) {
    super(UiScriptStep.UiScriptStepType.STEPS);

    if (!step) {
      this.steps = [];
      return;
    }

    const arr_of_steps = step[UiScriptStep.UiScriptStepType.STEPS];
    if (!arr_of_steps) {
      this.steps = [];
      return;
    }
    if (!Array.isArray(arr_of_steps)) {
      throw new Error(`UiScriptControlStatementSteps: 'steps' must be an array, got '${typeof arr_of_steps}' instead: ${step}.`);
    }
    this.steps = arr_of_steps.map(step => UiScriptStep.create(step));
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    for (const step of this.steps) {
      await step.execute(page);
    }
  }
}

/**
 * Represents a page in a UI script.
 * @class
 */
export class UiScriptPage {
  /**
   * @param {Object} obj
   */
  constructor(obj) {
    const key = Object.keys(obj)[0];
    if (key === 'page') {
      this.page_url = obj['page'];
      this.is_url_optional = false;
    } else if (key === 'page?') {
      this.page_url = obj['page?'];
      this.is_url_optional = true;
    } else {
      throw new Error(`UiScriptPage: 'page' or 'page?' expected, got '${key}' instead.`);
    }
    if (typeof this.page_url !== 'string') {
      throw new Error(`UiScriptPage: 'page' or 'page?' must be a string, got '${typeof this.page_url}' instead.`);
    }
    this.steps = new UiScriptStepSteps({ steps: obj['steps'] });

    // Remove 'page', 'page?' and 'steps' keys from the object
    const emptyStatement = Object.entries(obj)
        .filter(([key, _]) => !['page', 'page?', 'steps'].includes(key))
        .reduce((obj, [key, value]) => ({...obj, [key]: value}), {});
    if (Object.keys(emptyStatement).length !== 0) {
      throw new Error(`UiScriptPage: Unexpected key(s) found: '${Object.keys(emptyStatement)}'.`);
    }
  }

  /**
   * @param {Page} page
   */
  async execute(page) {
    if (!page.url().endsWith(this.page_url)) {
      if (this.is_url_optional) {
        console.log(`Skipping page ${this.page_url}`);
        return;
      }
      throw new Error(`Expected URL ${this.page_url}, actual URL ${page.url()}`);
    }
    await this.steps.execute(page);
  }
}

/**
 * Represents a UI script.
 * @class
 * @param {object} obj
 * @param {object?} subst_obj
 */
export class UiScript {
  constructor(script_obj, subst_obj = undefined) {
    UiScriptActionDo.resetToDefaults();
    UiScriptActionDoClickAndNavigate.resetToDefaults();

    if (!script_obj) {
      throw new Error("UiScript: the script is empty.");
    }
    if (!script_obj.hasOwnProperty('pages')) {
      throw new Error("UiScript: 'pages' is required.");
    }
    if (script_obj.pages === null) {
      throw new Error("UiScript: 'pages' cannot be empty.");
    }
    if (!Array.isArray(script_obj.pages)) {
      throw new Error(`UiScript: 'pages' must be an array, got '${typeof script_obj.pages}' instead.`);
    }

    // Remove 'env' and 'pages' keys from the object
    const emptyStatement = Object.entries(script_obj)
        .filter(([key, _]) => !['env', 'pages'].includes(key))
        .reduce((obj, [key, value]) => ({...obj, [key]: value}), {});
    if (Object.keys(emptyStatement).length !== 0) {
      throw new Error(`UiScript: Unexpected key(s) found: '${Object.keys(emptyStatement)}'.`);
    }

    if (subst_obj) {
      if (typeof subst_obj !== 'object' || Array.isArray(subst_obj)) {
        throw new Error(`UiScript: 'subst_obj' must be an object, got '${typeof subst_obj}' instead.`);
      }
      Object.keys(subst_obj).forEach(key => {
        if (typeof subst_obj[key] !== 'object' || Array.isArray(subst_obj[key])) {
          throw new Error(`UiScript: 'subst_obj' values must be objects, got '${typeof subst_obj[key]}' instead.`);
        }
        this.#substituteValues(script_obj, subst_obj[key], new RegExp(`\\$\{${key}:(\\w+)\}`, 'g'));
      });
    }
    this.env = script_obj.env;
    if (script_obj.env) {
      this.#substituteValues(script_obj, script_obj.env, /\${env:(\w+)}/g);
      if (script_obj.env.preClickDelay) {
        UiScriptActionDo.defaultPreClickDelay = Number(script_obj.env.preClickDelay);
      }
      if (script_obj.env.postClickDelay) {
        UiScriptActionDo.defaultPostClickDelay = Number(script_obj.env.postClickDelay);
      }
      if (script_obj.env.navigationTimeout) {
        UiScriptActionDoClickAndNavigate.defaultNavigationTimeout = Number(script_obj.env.navigationTimeout);
      }
      delete script_obj.env;
    }

    this.pages = script_obj.pages.map(page => new UiScriptPage(page));
  }

  /**
   * Parses the steps in the UI script.
   * @param {object[] | string | undefined} steps
   * @returns {UiScriptStep[]}
   * @throws {Error} If steps is not an array or string.
   */
  static parseSteps(steps) {
    if (!steps) {
      return [];
    }
    else if (typeof steps === 'string') {
      return [UiScriptStep.create({ do: steps })];
    } else if (Array.isArray(steps)) {
      return steps.map(step => UiScriptStep.create(step));
    } else {
      throw new Error(`UiScriptPageSteps: 'steps' must be an array, got '${typeof steps}' instead.`);
    }
  }

  /**
   * Recursively substitutes environment and secret placeholders in the configuration object.
   * @param {Object} obj - The configuration object.
   * @param {Object} subst_obj - An object containing values to substitute.
   * @param {RegExp} reg_exp - The regular expression pattern to match.
   */
  #substituteValues(obj, subst_obj, reg_exp) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object') {
        // Recurse into nested objects
        if (obj[key] !== null) {
          this.#substituteValues(obj[key], subst_obj, reg_exp);
        }
      } else if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(reg_exp, (match, name) => {
          if (subst_obj[name] !== undefined) {
            return subst_obj[name];
          }
          throw new Error(`Placeholder not found for ${match}`);
        });
      }
    });
  }

  /**
   * @param {Page} page
   * @returns {Promise<void>}
   */
  async execute(page) {
    for (const page_obj of this.pages) {
      await page_obj.execute(page);
    }
  }
}


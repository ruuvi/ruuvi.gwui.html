/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiInputToken from './gui_input_token.mjs'
import GuiInputValidationIcon from './gui_input_validation_icon.mjs'

class GuiInputTokenWithValidation extends GuiInputToken {
  /** @type GuiInputValidationIcon */
  #validation

  constructor (obj, useSavedToken = true) {
    super(obj, useSavedToken)
    this.#validation = new GuiInputValidationIcon(obj)
  }

  isValidationRequired () {
    return this.#validation.isValidationRequired()
  }

  setValidationRequired () {
    return this.#validation.setValidationRequired()
  }

  clearValidationRequired () {
    return this.#validation.clearValidationRequired()
  }

  clearValidationIcon () {
    this.#validation.clearValidationIcon()
  }

  setCheckingIsValid () {
    this.#validation.setCheckingIsValid()
  }

  setValid () {
    this.#validation.setValid()
  }

  setInvalid () {
    this.#validation.setInvalid()
  }

  isInvalid () {
    return this.#validation.isInvalid()
  }

  isValidityChecked () {
    return this.#validation.isValidityChecked()
  }
}

export default GuiInputTokenWithValidation

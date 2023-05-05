/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiInputText from './gui_input_text.mjs'
import GuiInputValidationIcon from './gui_input_validation_icon.mjs'

class GuiInputTextWithValidation extends GuiInputText {
  /** @type GuiInputValidationIcon */
  #validation

  constructor (obj) {
    super(obj)
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

export default GuiInputTextWithValidation

import GuiInputPassword from './gui_input_password.mjs'
import GuiInputValidationIcon from './gui_input_validation_icon.mjs'

class GuiInputPasswordWithValidation extends GuiInputPassword {
  /** @type GuiInputValidationIcon */
  #validation

  constructor (obj, useSavedPassword = true) {
    super(obj, useSavedPassword)
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

export default GuiInputPasswordWithValidation

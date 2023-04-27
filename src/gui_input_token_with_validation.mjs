class GuiInputTokenWithValidation {
  #obj
  #parent
  #icon

  constructor (obj) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'text') {
      throw new Error('GuiInputTokenWithValidation class constructor requires an <input type="text"> element.')
    }
    this.#obj = obj
    this.#parent = this.#obj.parent()
    if (!this.#parent.hasClass('input-password')) {
      throw new Error(`Parent of GuiInputTokenWithValidation must have CSS class 'input-password'.`)
    }
    if (!this.#parent.hasClass('input-with_validity_check')) {
      throw new Error('Parent of GuiInputTokenWithValidation must have \'input-with_validity_check\' CSS class.')
    }
    this.#icon = this.#parent.children('.input-with_validity_check-icon')
    if (this.#icon === undefined || this.#icon === null) {
      throw new Error('There is no child of GuiInputTokenWithValidation with \'input-with_validity_check-icon\' CSS class.')
    }
    if (this.#icon.prop('tagName') !== 'DIV') {
      throw new Error('Child of GuiInputWithValidation class must be a <div> element.')
    }
  }

  on_keyup_or_click (fn) {
    this.#obj.on('keyup click', () => fn())
  }

  on_input_or_change (fn) {
    this.#obj.on('input change', () => fn())
  }

  getVal () {
    return this.#obj.val()
  }

  setVal (val) {
    this.#obj.val(val)
  }

  disable () {
    this.#obj.prop('disabled', true)
  }

  enable () {
    this.#obj.prop('disabled', false)
  }

  is_saved () {
    return this.#obj.attr('placeholder') === '********'
  }

  clear_saved () {
    this.#obj.removeAttr('placeholder')
  }

  clear () {
    this.#obj.val('')
    this.clear_saved()
  }

  set_use_saved () {
    this.#obj.attr('placeholder', '********')
    this.#obj.val('')
  }

  isValidationRequired () {
    return this.#icon.hasClass('input-validation_required')
  }

  setValidationRequired () {
    this.#icon.addClass('input-validation_required')
  }

  clearValidationRequired () {
    this.#icon.removeClass('input-validation_required')
  }

  clearValidationIcon () {
    this.#icon.removeClass('input-checking')
    this.#icon.removeClass('input-valid')
    this.#icon.removeClass('input-invalid')
  }

  setCheckingIsValid () {
    this.clearValidationIcon()
    this.#icon.addClass('input-checking')
  }

  setValid () {
    this.clearValidationIcon()
    this.#icon.removeClass('input-validation_required')
    this.#icon.addClass('input-valid')
  }

  setInvalid () {
    this.clearValidationIcon()
    this.#icon.removeClass('input-validation_required')
    this.#icon.addClass('input-invalid')
  }

  isInvalid () {
    return !!this.#icon.hasClass('input-invalid')
  }

  isValidityChecked () {
    const flagInvalid = this.#icon.hasClass('input-invalid')
    const flagValid = this.#icon.hasClass('input-valid')
    return !!(flagInvalid || flagValid)
  }
}

export default GuiInputTokenWithValidation

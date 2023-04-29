class GuiInputTextWithValidation {
  #obj
  #parent
  #icon

  constructor (obj) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'text') {
      throw new Error('GuiInputWithValidation class constructor requires an <input type="text"> element.')
    }
    this.#obj = obj
    this.#parent = obj.parent()
    if (this.#parent.prop('tagName') !== 'DIV') {
      throw new Error('Parent of GuiInputWithValidation class must be a <div> element.')
    }
    if (!this.#parent.hasClass('input-with_validity_check')) {
      throw new Error('Parent of GuiInputWithValidation must have \'input-with_validity_check\' CSS class.')
    }
    this.#icon = this.#parent.children('.input-with_validity_check-icon')
    if (this.#icon === undefined || this.#icon === null) {
      throw new Error('There is no child of GuiInputWithValidation with \'input-with_validity_check-icon\' CSS class.')
    }
    if (this.#icon.prop('tagName') !== 'DIV') {
      throw new Error('Child of GuiInputWithValidation class must be a <div> element.')
    }
  }

  setVal (val) {
    this.#obj.val(val)
  }

  getVal () {
    return this.#obj.val()
  }

  disable () {
    this.#obj.prop('disabled', true)
  }

  enable () {
    this.#obj.prop('disabled', false)
  }

  on_change (fn) {
    this.#obj.on('input change keyup paste', () => fn())
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

export default GuiInputTextWithValidation

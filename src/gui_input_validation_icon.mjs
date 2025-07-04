/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiObj from './gui_obj.mjs'

class GuiInputValidationIcon extends GuiObj {
  #parent
  #icon

  constructor (obj) {
    super('GuiInputValidationIcon', obj, 'INPUT')
    let parent = obj.parent()
    if (parent.prop('tagName') === 'LABEL') {
      if (parent.parent().prop('tagName') === 'DIV' && parent.parent().hasClass('input-with_validity_check')) {
        parent = parent.parent()
      } else if (parent.parent().parent().prop('tagName') === 'DIV' && parent.parent().parent().hasClass('input-with_validity_check')) {
        parent = parent.parent().parent()
      } else {
        throw new Error(`GuiInputWithValidation: Parent class must be a DIV element with 'input-with_validity_check' CSS class.`)
      }
    }
    this.#parent = parent
    if (this.#parent.prop('tagName') !== 'DIV') {
      throw new Error(`GuiInputWithValidation: Parent class must be a DIV element.`)
    }
    if (!this.#parent.hasClass('input-with_validity_check')) {
      throw new Error(`GuiInputWithValidation: Parent class must have 'input-with_validity_check' CSS class.`)
    }
    this.#icon = this.#parent.children('.input-with_validity_check-icon')
    if (this.#icon === undefined || this.#icon === null || this.#icon.length === 0) {
      throw new Error(`GuiInputWithValidation: There is no children with 'input-with_validity_check-icon' CSS class.`)
    }
    if (this.#icon.prop('tagName') !== 'DIV') {
      throw new Error(`GuiInputWithValidation: Child class must be a DIV element.`)
    }
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

export default GuiInputValidationIcon

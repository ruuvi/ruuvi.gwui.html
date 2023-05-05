/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiObj from './gui_obj.mjs'

class GuiInputEyeIcon extends GuiObj {
  #input
  #eye
  #icon_eye
  #icon_eye_slash

  constructor (obj) {
    super('GuiInputEyeIcon', obj, 'INPUT')
    const parent = obj.parent()
    if (!parent.hasClass('input-password')) {
      throw new Error(`GuiInputEyeIcon: Parent must have CSS class 'input-password'.`)
    }

    this.#input = parent.children('input')
    if (this.#input.length === 0) {
      throw new Error(`GuiInputEyeIcon: There is no INPUT element.`)
    }
    if (this.#input.length !== 1) {
      throw new Error(`GuiInputEyeIcon: There are more than one INPUT element.`)
    }

    this.#eye = parent.children('.input-password-eye')
    if (this.#eye.length === 0) {
      throw new Error(`GuiInputEyeIcon: There is no child with CSS class 'input-password-eye'.`)
    }
    if (this.#eye.length !== 1) {
      throw new Error(`GuiInputEyeIcon: There are more than one child with CSS class 'input-password-eye'.`)
    }

    this.#icon_eye = this.#eye.children('.eye')
    if (this.#icon_eye.length === 0) {
      throw new Error(`GuiInputEyeIcon: There is no child of .input-password-eye with CSS class 'eye'.`)
    }
    if (this.#icon_eye.length !== 1) {
      throw new Error(`GuiInputEyeIcon: There are more than one child of .input-password-eye with CSS class 'eye'.`)
    }

    this.#icon_eye_slash = this.#eye.children('.eye-slash')
    if (this.#icon_eye_slash.length === 0) {
      throw new Error(`GuiInputEyeIcon: There is no child of .input-password-eye with CSS class 'eye-slash'.`)
    }
    if (this.#icon_eye_slash.length !== 1) {
      throw new Error(`GuiInputEyeIcon: There are more than one child of .input-password-eye with CSS class 'eye-slash'.`)
    }

    this.#eye.click(() => this.#onClickEye())
  }

  #onClickEye () {
    if (this.#eye.hasClass('disabled')) {
      return
    }
    const flag_hidden = this.#input.attr('type') === 'password'
    if (flag_hidden) {
      this.#icon_eye.addClass('hidden')
      this.#icon_eye_slash.removeClass('hidden')
      this.#input.attr('type', 'text')
    } else {
      this.#icon_eye_slash.addClass('hidden')
      this.#icon_eye.removeClass('hidden')
      this.#input.attr('type', 'password')
    }
  }

  enableEye () {
    this.#eye.removeClass('disabled')
  }

  disableEye () {
    this.#eye.addClass('disabled')
    this.#icon_eye.removeClass('hidden')
    this.#icon_eye_slash.addClass('hidden')
  }

}

export default GuiInputEyeIcon

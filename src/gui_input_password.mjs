class GuiInputPassword {
  #obj
  #eye
  #icon_eye
  #icon_eye_slash

  constructor (obj, useSavedPassword = true) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'password') {
      throw new Error('GuiInputPassword class constructor requires an <input type="password"> element.')
    }
    this.#obj = obj
    const parent = this.#obj.parent()
    if (!parent.hasClass('input-password')) {
      throw new Error(`Parent of GuiInputPassword must have CSS class 'input-password'.`)
    }
    this.#eye = parent.children('.input-password-eye')
    if (this.#eye.length === 0) {
      throw new Error(`There is no child of GuiInputPassword with CSS class 'input-password-eye'.`)
    }
    if (this.#eye.length !== 1) {
      throw new Error(`There are more than one child of GuiInputPassword with CSS class 'input-password-eye'.`)
    }
    this.#icon_eye = this.#eye.children('.eye')
    this.#icon_eye_slash = this.#eye.children('.eye-slash')

    if (this.#icon_eye.length === 0) {
      throw new Error(`There is no child of GuiInputPassword.input-password-eye with CSS class 'eye'.`)
    }
    if (this.#icon_eye.length !== 1) {
      throw new Error(`There are more than one child of GuiInputPassword.input-password-eye with CSS class 'eye'.`)
    }
    if (this.#icon_eye_slash.length === 0) {
      throw new Error(`There is no child of GuiInputPassword.input-password-eye with CSS class 'eye-slash'.`)
    }
    if (this.#icon_eye_slash.length !== 1) {
      throw new Error(`There are more than one child of GuiInputPassword.input-password-eye with CSS class 'eye-slash'.`)
    }
    if (useSavedPassword) {
      this.set_use_saved()
    } else {
      this.#clear_saved()
    }

    this.on_change(() => {
      this.#clear_saved()
    })
  }

  on_change (fn) {
    this.#obj.on('input change keyup paste', () => fn())
  }

  getVal () {
    if (this.is_saved()) {
      return undefined
    }
    return this.#obj.val()
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

  #clear_saved () {
    this.#obj.removeAttr('placeholder')
    this.#eye.removeClass('disabled')
  }

  clear () {
    this.#obj.val('')
    this.#clear_saved()
  }

  set_use_saved () {
    this.#obj.attr('placeholder', '********')
    this.#eye.addClass('disabled')
    this.#obj.val('')
    this.#icon_eye.removeClass('hidden')
    this.#icon_eye_slash.addClass('hidden')
  }
}

export default GuiInputPassword

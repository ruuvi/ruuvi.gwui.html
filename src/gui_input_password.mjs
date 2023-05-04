/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiInputTextWithSaving from './gui_input_text_with_saving.mjs'
import GuiInputEyeIcon from './gui_input_eye_icon.mjs'

class GuiInputPassword extends GuiInputTextWithSaving {
  /** @type GuiInputEyeIcon */
  #eyeIcon

  constructor (obj, useSavedPassword = true, attrType = 'password', className = 'GuiInputPassword') {
    super(obj, useSavedPassword, attrType, className)
    this.#eyeIcon = new GuiInputEyeIcon(obj)
    if (this.is_saved()) {
      this.set_use_saved()
    } else {
      this._clear_saved()
    }
  }

  /** @deprecated setVal for an input-password is prohibited, use setPassword */
  setVal () {
    throw new Error('setVal for an input-password is prohibited, use setPassword')
  }

  setPassword (password) {
    this._obj.val(password)
    this._clear_saved()
  }

  showPassword () {
    this._obj.attr('type', 'text')
  }

  hidePassword () {
    this._obj.attr('type', 'password')
  }

  _clear_saved () {
    super._clear_saved()
    this.#eyeIcon.enableEye()
  }

  set_use_saved () {
    super.set_use_saved()
    this.#eyeIcon.disableEye()
  }

}

export default GuiInputPassword

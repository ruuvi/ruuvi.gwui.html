/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiInputText from './gui_input_text.mjs'

class GuiInputTextWithSaving extends GuiInputText {

  constructor (obj, useSaved = true, attrType = 'text', className = 'GuiInputTextWithSaving') {
    super(obj, attrType, className)

    if (useSaved) {
      this.#set_use_saved()
    } else {
      this.#clear_saved()
    }

    this.on_change(() => {
      this._clear_saved()
    })
  }

  #setValue (val) {
    this._obj.val(val)
    if (val === '') {
      this._clear_saved()
    }
  }

  getVal () {
    if (this.is_saved()) {
      return undefined
    }
    return super.getVal()
  }

  is_saved () {
    return this._obj.attr('placeholder') === '********'
  }

  #clear_saved () {
    this._obj.removeAttr('placeholder')
    this._setDefaultPlaceholder()
  }

  _clear_saved () {
    this.#clear_saved()
  }

  clear () {
    this.#setValue('')
  }

  #set_use_saved () {
    this._obj.attr('placeholder', '********')
    this._obj.val('')
  }

  set_use_saved () {
    this.#set_use_saved()
  }
}

export default GuiInputTextWithSaving

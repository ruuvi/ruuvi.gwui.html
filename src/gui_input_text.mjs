/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiObj from './gui_obj.mjs'

class GuiInputText extends GuiObj {

  constructor (obj, attrType = 'text', className = 'GuiInputText') {
    super(className, obj, 'INPUT', 'type', attrType)
  }

  setVal (val) {
    this._obj.val(val)
  }

  getVal () {
    return this._obj.val()
  }

  disable () {
    this._obj.prop('disabled', true)
  }

  enable () {
    this._obj.prop('disabled', false)
  }

  on_change (fn) {
    this._obj.on('input change keyup paste', () => fn())
  }

  focus() {
    this._obj.focus()
  }

  put_cursor_at_end() {
    // For the 'focus' method to work, the element must be visible
    this._obj.focus()

    const len = this._obj.val().length
    this._obj.get(0).setSelectionRange(len, len)
  }
}

export default GuiInputText

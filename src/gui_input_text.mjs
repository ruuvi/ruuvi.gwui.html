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
}

export default GuiInputText

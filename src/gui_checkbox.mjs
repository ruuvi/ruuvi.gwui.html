/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiCheckbox {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'checkbox') {
      throw new Error('GuiCheckbox class constructor requires an <input type="checkbox"> element.')
    }
    this.#obj = obj
  }

  disable () {
    this.#obj.prop('disabled', true)
  }

  enable () {
    this.#obj.prop('disabled', false)
  }

  setEnabled (flagEnabled) {
    if (flagEnabled) {
      this.enable()
    } else {
      this.disable()
    }
  }

  show () {
    this.#obj.show()
  }

  hide () {
    this.#obj.hide()
  }

  isChecked () {
    return this.#obj.prop('checked')
  }

  setState (isChecked) {
    if (typeof isChecked !== 'boolean') {
      throw Error('isChecked must be boolean')
    }
    this.#obj.prop('checked', isChecked)
  }

  setChecked () {
    this.setState(true)
  }

  setUnchecked () {
    this.setState(false)
  }

  on_change (fn) {
    this.#obj.click((e) => {
      fn()
    })
  }

}

export default GuiCheckbox

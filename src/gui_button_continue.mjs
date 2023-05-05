/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiButtonContinue {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'A') {
      throw new Error('GuiButtonContinue class constructor requires a <A> element.')
    }
    if (!obj.hasClass('btn')) {
      throw new Error('GuiButtonContinue must have CSS style "btn".')
    }
    this.#obj = obj
  }

  show () {
    this.#obj.show()
  }

  hide () {
    this.#obj.hide()
  }

  enable () {
    this.#obj.removeClass('disable-click')
  }

  disable () {
    this.#obj.addClass('disable-click')
  }

  isEnabled () {
    return !this.#obj.hasClass('disable-click')
  }

  setEnabled (flagEnabled) {
    if (flagEnabled) {
      this.enable()
    } else {
      this.disable()
    }
  }

  on_click (fn) {
    this.#obj.click((e) => {
      e.preventDefault()
      fn()
    })
  }

  addClass (css_class) {
    this.#obj.addClass(css_class)
  }

  removeClass (css_class) {
    this.#obj.removeClass(css_class)
  }

}

export default GuiButtonContinue

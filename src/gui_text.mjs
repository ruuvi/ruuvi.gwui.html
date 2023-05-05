/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiText {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'DIV') {
      throw new Error('GuiText class constructor requires a <div> element.')
    }
    this.#obj = obj
  }

  setVal (val) {
    this.#obj.text(val)
  }

  getVal () {
    return this.#obj.text()
  }

  show () {
    this.#obj.show()
  }

  hide () {
    this.#obj.hide()
  }

  slideUp () {
    this.#obj.slideUp()
  }

  slideDown () {
    this.#obj.slideDown()
  }
}

export default GuiText

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiDiv {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'DIV') {
      throw new Error('GuiDiv class constructor requires a <div> element.')
    }
    this.#obj = obj
  }

  show () {
    this.#obj.show()
  }

  hide () {
    this.#obj.hide()
  }

  isHidden() {
    return this.#obj.hasClass("hidden")
  }

  slideUp () {
    this.#obj.slideUp()
  }

  slideDown () {
    this.#obj.slideDown()
  }

  setVisibility(isVisible) {
    if (isVisible) {
      this.#obj.removeClass('invisible')
    } else {
      this.#obj.addClass('invisible')
    }
  }

  setInvisible() {
    this.setVisibility(false)
  }

  setVisible() {
    this.setVisibility(true)
  }
}

export default GuiDiv

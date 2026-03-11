/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiTableRow {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'TR') {
      throw new Error('GuiTableRow class constructor requires a <tr> element.')
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

export default GuiTableRow

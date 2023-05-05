/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiProgress {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'PROGRESS') {
      throw new Error('GuiProgress class constructor requires a <progress> element.')
    }
    this.#obj = obj
  }

  show () {
    this.#obj.show()
  }

  hide () {
    this.#obj.hide()
  }

  setVal (val) {
    this.#obj.val(val)
  }

  getVal () {
    return this.#obj.val()
  }
}

export default GuiProgress

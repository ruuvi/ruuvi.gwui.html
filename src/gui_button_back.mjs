/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiButtonBack {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'A') {
      throw new Error('GuiButtonBack class constructor requires a <A> element.')
    }
    if (!obj.hasClass('btn-back')) {
      throw new Error('GuiButtonBack must have CSS style \'btn-back\'.')
    }
    this.#obj = obj

    this.#obj.click((e) => {
      e.preventDefault()
      window.history.back()
    })
  }
}

export default GuiButtonBack

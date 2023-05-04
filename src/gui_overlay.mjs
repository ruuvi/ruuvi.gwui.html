/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiOverlay {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'DIV') {
      throw new Error('GuiOverlay class constructor requires a <div> element.')
    }
    if (!obj.hasClass('overlay-container')) {
      throw new Error('GuiOverlay must have CSS class overlay-container.')
    }
    this.#obj = obj
  }

  fadeIn () {
    this.#obj.fadeIn()
  }

  fadeOut () {
    this.#obj.fadeOut()
  }
}

export default GuiOverlay

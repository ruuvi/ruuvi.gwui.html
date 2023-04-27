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

  slideUp () {
    this.#obj.slideUp()
  }

  slideDown () {
    this.#obj.slideDown()
  }
}

export default GuiDiv

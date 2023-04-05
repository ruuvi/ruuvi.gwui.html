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
}

export default GuiText

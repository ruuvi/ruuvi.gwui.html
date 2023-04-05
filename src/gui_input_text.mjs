class GuiInputText {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'text') {
      throw new Error('InputText class constructor requires an <input type="text"> element.')
    }
    this.#obj = obj
  }

  setVal (val) {
    this.#obj.val(val)
  }

  getVal () {
    return this.#obj.val()
  }

  disable () {
    this.#obj.prop('disabled', true)
  }

  enable () {
    this.#obj.prop('disabled', false)
  }
}

export default GuiInputText

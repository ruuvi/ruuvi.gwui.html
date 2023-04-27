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

  on_input (fn) {
    this.#obj.on('input', () => fn())
  }

  on_change (fn) {
    this.#obj.on('change', () => fn())
  }

  on_input_or_change (fn) {
    this.#obj.on('input change', () => fn())
  }

  on_keyup_or_click (fn) {
    this.#obj.on('keyup click', () => fn())
  }
}

export default GuiInputText

class GuiInputToken {
  #obj

  constructor (obj) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'text') {
      throw new Error('GuiInputToken class constructor requires an <input type="text"> element.')
    }
    this.#obj = obj
  }

  on_keyup_or_click (fn) {
    this.#obj.on('keyup click', () => fn())
  }

  on_input_or_change (fn) {
    this.#obj.on('input change', () => fn())
  }

  getVal () {
    return this.#obj.val()
  }

  setVal (val) {
    this.#obj.val(val)
  }

  disable () {
    this.#obj.prop('disabled', true)
  }

  enable () {
    this.#obj.prop('disabled', false)
  }

  is_saved () {
    return this.#obj.attr('placeholder') === '********'
  }

  clear_saved () {
    this.#obj.removeAttr('placeholder')
  }

  clear () {
    this.#obj.val('')
    this.clear_saved()
  }

  set_use_saved () {
    this.#obj.attr('placeholder', '********')
    this.#obj.val('')
  }
}

export default GuiInputToken

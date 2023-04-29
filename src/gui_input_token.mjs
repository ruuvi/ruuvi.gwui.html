import * as crypto from './crypto.mjs'

class GuiInputToken {
  #obj

  constructor (obj, useSaved = true) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'text') {
      throw new Error('GuiInputToken class constructor requires an <input type="text"> element.')
    }
    this.#obj = obj

    if (useSaved) {
      this.set_use_saved()
    } else {
      this.#clear_saved()
    }

    this.on_change(() => {
      this.#clear_saved()
    })
  }

  on_change (fn) {
    this.#obj.on('input change keyup paste', () => fn())
  }

  getVal () {
    if (this.is_saved()) {
      return undefined
    }
    return this.#obj.val()
  }

  setVal (val) {
    this.#clear_saved()
    this.#obj.val(val)
  }

  setNewTokenIfEmpty () {
    if (this.#obj.val() === '') {
      this.#clear_saved()
      this.#obj.val(crypto.enc.Base64.stringify(crypto.SHA256(crypto.lib.WordArray.random(32))))
    }
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

  #clear_saved () {
    this.#obj.removeAttr('placeholder')
  }

  clear () {
    this.#obj.val('')
    this.#clear_saved()
  }

  set_use_saved () {
    this.#obj.attr('placeholder', '********')
    this.#obj.val('')
  }
}

export default GuiInputToken

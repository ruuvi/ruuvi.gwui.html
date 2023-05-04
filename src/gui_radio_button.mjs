/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'

export class GuiRadioButtonOption {
  #obj

  constructor (obj, flagChecked) {
    if (obj.prop('tagName') !== 'INPUT' || obj.attr('type') !== 'radio') {
      throw new Error('RadioButtonOption class constructor requires an <input type="radio"> element.')
    }
    if (flagChecked === undefined) {
      throw new Error('RadioButtonOption argument flagChecked is undefined.')
    }
    if (typeof flagChecked !== 'boolean') {
      throw new Error('RadioButtonOption argument flagChecked must be boolean.')
    }
    this.#obj = obj
    this.#obj.prop('checked', flagChecked)
  }

  show () {
    this.#obj.show()
  }

  hide () {
    this.#obj.hide()
  }

  isChecked () {
    return this.#obj.prop('checked')
  }

  setChecked () {
    this.#obj.prop('checked', true)
  }

  setUnchecked () {
    this.#obj.prop('checked', false)
  }

  setState (isChecked) {
    this.#obj.prop('checked', isChecked)
  }

  on_click (fn) {
    this.#obj.click((e) => {
      fn()
    })
  }

}

export class GuiRadioButton {
  #name
  #obj
  #dict = {}

  constructor (name) {
    this.#name = name
    this.#obj = $(`input[type=radio][name=${name}]`)
    if (this.#obj.length === 0) {
      throw new Error(`Can't find radio button with name '${name}'.`)
    }
  }

  /**
   *
   * @param {string} value
   * @param {boolean} flagChecked
   * @returns {GuiRadioButtonOption}
   */
  addOption (value, flagChecked) {
    const obj = $(`input[type=radio][name=${this.#name}][value='${value}']`)
    const opt = new GuiRadioButtonOption(obj, flagChecked)
    this.#dict[value] = opt
    return opt
  }

  disable () {
    this.#obj.prop('disabled', true)
  }

  enable () {
    this.#obj.prop('disabled', false)
  }

  setUnchecked () {
    this.#obj.prop('checked', false)
  }

  getChecked () {
    return this.#obj.filter(':checked')
  }

  getCheckedVal () {
    return this.#obj.filter(':checked').val()
  }

}

export default GuiRadioButton

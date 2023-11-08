/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiObj from './gui_obj.mjs'
import Lang from "./lang.mjs"

class GuiInputText extends GuiObj {
  #input_obj
  #placeholder_lang_dict

  constructor (obj, attrType = 'text', className = 'GuiInputText') {
    super(className, obj, 'INPUT', 'type', attrType)
    this.#input_obj = obj
    let parent = obj.parent()
    if (parent.prop('tagName') === 'LABEL') {
      parent = parent.parent()
    }
    if (parent.prop('tagName') !== 'DIV') {
      throw new Error(`GuiInputText: Parent class must be a DIV element.`)
    }
    let input_placeholder_div = parent.children('.input-placeholder')
    if (input_placeholder_div && input_placeholder_div.length) {
      if (input_placeholder_div.prop('tagName') !== 'DIV') {
        throw new Error(`GuiInputText: Child with class '.input-placeholder' must be a DIV element.`)
      }

      let placeholder_lang_dict = {}

      let spans = input_placeholder_div[0].querySelectorAll('span[lang]')
      spans.forEach(function (span) {
        let lang = span.getAttribute('lang')
        placeholder_lang_dict[lang] = span.textContent
      })
      this.#placeholder_lang_dict = placeholder_lang_dict

      let active_lang = Lang.getActiveLang()
      this.#input_obj.prop('placeholder', placeholder_lang_dict[active_lang])

      this.#input_obj[0].associatedGuiObj = this
    }
  }

  onLanguageChange() {
    if (this.#placeholder_lang_dict) {
      let active_lang = Lang.getActiveLang()
      let placeholder = this.#placeholder_lang_dict[active_lang]
      if (placeholder) {
        this.#input_obj.prop('placeholder', placeholder)
      } else {
        this.#input_obj.prop('placeholder', "")
      }
    }
  }

  setVal (val) {
    this._obj.val(val)
  }

  getVal () {
    return this._obj.val()
  }

  disable () {
    this._obj.prop('disabled', true)
  }

  enable () {
    this._obj.prop('disabled', false)
  }

  on_change (fn) {
    this._obj.on('input change keyup paste', () => fn())
  }

  focus() {
    this._obj.focus()
  }

  put_cursor_at_end() {
    // For the 'focus' method to work, the element must be visible
    this._obj.focus()

    const len = this._obj.val().length
    this._obj.get(0).setSelectionRange(len, len)
  }
}

export default GuiInputText

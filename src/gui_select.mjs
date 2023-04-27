export class GuiSelect {
  #obj

  constructor (obj) {
    this.#obj = obj
    if (obj.prop('tagName') !== 'SELECT') {
      throw new Error('GuiSelect class constructor requires a <SELECT> element.')
    }
  }

  getSelectedVal () {
    return this.#obj.val()
  }

  setSelectedVal (key_value) {
    this.#obj.find('option[value=' + key_value + ']').prop('selected', true)
  }

  on_change (fn) {
    this.#obj.change(() => fn())
  }

}

export default GuiSelect

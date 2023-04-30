import $ from 'jquery'

class GuiSectAdvanced {
  #obj
  #dropdown_obj
  #arrow_down
  #arrow_up

  constructor (obj) {
    if (obj.prop('tagName') !== 'DIV') {
      throw new Error('GuiSectAdvanced class constructor requires a <DIV> element.')
    }
    if (!obj.hasClass('btn-dropdown')) {
      throw new Error('GuiSectAdvanced must have CSS class btn-dropdown.')
    }
    this.#obj = obj
    const id = obj.attr('id')
    const base_id = id.substring(0, id.lastIndexOf('-'))
    const dropdown_id = base_id + '-dropdown'
    this.#dropdown_obj = $('#' + dropdown_id)
    if (this.#dropdown_obj === undefined || this.#dropdown_obj === null) {
      throw new Error('There is no corresponding \'DIV\' for GuiSectAdvanced with \'-dropdown\' suffix.')
    }
    if (this.#dropdown_obj.prop('tagName') !== 'DIV') {
      throw new Error('GuiSectAdvanced-dropdown requires a <DIV> element.')
    }
    this.#arrow_down = this.#obj.children('div.btn-dropdown-arrow-down')
    if (this.#arrow_down === undefined || this.#arrow_down === null) {
      throw new Error('There is no child \'DIV\' for GuiSectAdvanced with \'.btn-dropdown-arrow-down\' CSS style.')
    }
    this.#arrow_up = this.#obj.children('div.btn-dropdown-arrow-up')
    if (this.#arrow_up === undefined || this.#arrow_up === null) {
      throw new Error('There is no child \'DIV\' for GuiSectAdvanced with \'.btn-dropdown-arrow-up\' CSS style.')
    }
    this.#obj.click((e) => {
      if (this.#arrow_down.is(':hidden')) {
        this.hide()
      } else {
        this.show()
      }
    })
  }

  isHidden () {
    return this.#obj.children('div.btn-dropdown-arrow-down').is(':hidden')
  }

  disable () {
    this.#obj.addClass('disable-click')
  }

  enable () {
    this.#obj.removeClass('disable-click')
  }

  on_click (fn) {
    this.#obj.click((e) => {
      e.preventDefault()
      fn()
    })
  }

  show () {
    this.#arrow_down.hide()
    this.#arrow_up.show()
    this.#dropdown_obj.fadeIn()
  }

  hide () {
    this.#arrow_up.hide()
    this.#arrow_down.show()
    this.#dropdown_obj.fadeOut()
  }

}

export default GuiSectAdvanced

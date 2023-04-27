import $ from 'jquery'
import { log_wrap } from './utils.mjs'

class GuiLoading {
  static #instance
  #body

  constructor () {
    if (!GuiLoading.#instance) {
      GuiLoading.#instance = this
      this.#body = $('body')
    }

    // Always return the same instance
    return GuiLoading.#instance
  }

  static getInstance () {
    if (!GuiLoading.#instance) {
      return new GuiLoading()
    }
    return GuiLoading.#instance
  }

  static isLoading () {
    return GuiLoading.getInstance().#body.hasClass('is-loading')
  }

  static bodyClassLoadingAdd () {
    console.log(log_wrap('Add class \'is-loading\''))
    GuiLoading.getInstance().#body.addClass('is-loading')
  }

  static bodyClassLoadingRemove () {
    console.log(log_wrap('Remove class \'is-loading\''))
    GuiLoading.getInstance().#body.removeClass('is-loading')
  }

}

export default GuiLoading

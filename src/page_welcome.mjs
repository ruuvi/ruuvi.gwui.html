import $ from 'jquery'
import logger from './logger.mjs'
import Navigation from './navigation.mjs'
import GuiButton from './gui_button.mjs'

export class PageWelcome {
  #section = $('section#page-welcome')
  #button_get_started = new GuiButton($('#page-welcome-button-get-started'))

  constructor () {
    this.#section.bind('onShow', () => this.#onShow())
    this.#section.bind('onHide', () => this.#onHide())
    this.#button_get_started.on_click(() => this.#onClickButtonGetStarted())
  }

  #onShow () {
    logger.info('section#page-welcome: onShow')
    let progressbar = $('#progressbar')
    progressbar.css('top', $('section#page-welcome div.progressbar-container').position().top)
    progressbar.show()
  }

  #onHide () {
    logger.info('section#page-welcome: onHide')
  }

  #onClickButtonGetStarted () {
    Navigation.change_page_to_network_type()
  }
}


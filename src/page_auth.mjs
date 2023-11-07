/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import logger from './logger.mjs'
import GuiInputText from './gui_input_text.mjs'
import GuiInputPassword from './gui_input_password.mjs'

class PageAuth {
  #auth_yes = $('#auth-yes')
  #auth_forbidden = $('#auth-forbidden')
  #auth_denied = $('#auth-denied')
  #auth_error = $('#auth-error')
  #auth_default = $('#auth-default')
  #auth_reconfigure = $('#auth-reconfigure')
  #auth_user_login = $('#auth-user_login')
  #auth_home = $('#auth-home')
  #auth_button_login = $('#auth-button-login')
  #auth_button_home = $('#auth-button-home')
  #auth_user = new GuiInputText($('#auth-user'))
  #auth_pass = new GuiInputPassword($('#auth-pass'), false)
  #cb_openHomePage
  #cb_performLogIn

  constructor () {
    this.#auth_yes.hide()
    this.#auth_forbidden.hide()
    this.#auth_denied.hide()
    this.#auth_error.hide()
    this.#auth_default.hide()
    this.#auth_reconfigure.hide()
    this.#auth_user_login.hide()
    this.#auth_home.hide()

    this.#auth_button_login.click((e) => {
      e.preventDefault()
      this.#on_click_button_login()
    })

    this.#auth_button_home.click((e) => {
      e.preventDefault()
      this.#cb_openHomePage()
    })

  }

  #on_click_button_login () {
    this.hide_all_statuses()
    let user = this.getUserName()
    let password = this.getPassword()
    this.#cb_performLogIn(user, password)
  }

  setCallbacks (cb_openHomePage, cb_performLogIn) {
    this.#cb_openHomePage = cb_openHomePage
    this.#cb_performLogIn = cb_performLogIn
  }

  setDefaultUserNameAndShowHint (isDefaultAuth) {
    if (isDefaultAuth) {
      this.#auth_user.setVal('Admin')
      this.#auth_user.disable()
      this.#auth_default.show()
    } else {
      this.#auth_default.hide()
    }
  }

  on_auth_successful () {
    this.#auth_user_login.hide()
    this.#auth_yes.show()
    this.#auth_home.show()
  }

  on_auth_unauthorized () {
    this.#auth_user_login.show()
  }

  on_auth_forbidden (isAccessDenied) {
    this.#auth_user_login.hide()
    if (isAccessDenied) {
      this.#auth_denied.show()
    } else {
      this.#auth_forbidden.show()
    }
    this.#auth_reconfigure.show()
  }

  show_error_message (error) {
    logger.info(`PageAuth: show error message: ${error}`)
    this.#auth_error.show()
  }

  hide_all_statuses () {
    this.#auth_yes.hide()
    this.#auth_forbidden.hide()
    this.#auth_denied.hide()
    this.#auth_error.hide()
  }

  getUserName () {
    return this.#auth_user.getVal()
  }

  getPassword () {
    return this.#auth_pass.getVal()
  }
}

export default PageAuth

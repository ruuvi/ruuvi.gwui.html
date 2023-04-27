import sinon from 'sinon'

class PageAuthMock {
  #cb_openHomePage
  #cb_performLogIn
  auth_status

  constructor () {
    this.setDefaultUserNameAndShowHint = sinon.stub()
    this.on_auth_successful = sinon.stub().callsFake(() => {this.auth_status = 'auth_successful'})
    this.on_auth_unauthorized = sinon.stub().callsFake(() => {this.auth_status = 'auth_unauthorized'})
    this.on_auth_forbidden = sinon.stub().callsFake(() => {this.auth_status = 'auth_forbidden'})
    this.show_error_message = sinon.stub()
    this.hide_all_statuses = sinon.stub()
    this.getUserName = sinon.stub()
    this.getPassword = sinon.stub()
  }

  setCallbacks (cb_openHomePage, cb_performLogIn) {
    this.#cb_openHomePage = cb_openHomePage
    this.#cb_performLogIn = cb_performLogIn
  }

  simulateClickButtonLogIn (user, password) {
    this.#cb_performLogIn(user, password)
  }
}

export default PageAuthMock

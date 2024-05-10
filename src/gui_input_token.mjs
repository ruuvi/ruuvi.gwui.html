/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiInputPassword from "./gui_input_password.mjs";
import * as crypto from './crypto.mjs'

class GuiInputToken extends GuiInputPassword {

  constructor (obj, useSavedToken = true) {
    super(obj, useSavedToken, 'password', 'GuiInputToken')
  }

  setNewTokenIfEmpty () {
    if (this._obj.val() === '') {
      this._clear_saved()
      this._obj.val(crypto.enc.Base64.stringify(crypto.SHA256(crypto.lib.WordArray.random(32))))
      this.showPassword()
    }
  }
}

export default GuiInputToken

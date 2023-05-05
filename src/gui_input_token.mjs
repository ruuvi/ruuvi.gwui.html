/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import GuiInputTextWithSaving from './gui_input_text_with_saving.mjs'
import * as crypto from './crypto.mjs'

class GuiInputToken extends GuiInputTextWithSaving {

  constructor (obj, useSavedToken = true) {
    super(obj, useSavedToken, 'text', 'GuiInputToken')
  }

  setNewTokenIfEmpty () {
    if (this._obj.val() === '') {
      this._clear_saved()
      this._obj.val(crypto.enc.Base64.stringify(crypto.SHA256(crypto.lib.WordArray.random(32))))
    }
  }
}

export default GuiInputToken

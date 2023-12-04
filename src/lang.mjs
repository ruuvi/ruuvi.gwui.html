/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'

class Lang {
    constructor () {
    }

    static getActiveLang () {
        let activeLanguage = $('#language-switcher .language-switcher-active').attr('id').split('-').pop()
        return activeLanguage
    }
}

export default Lang

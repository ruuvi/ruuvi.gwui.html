/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

class GuiSpan {
    #obj

    constructor(obj) {
        if (obj.prop('tagName') !== 'SPAN') {
            throw new Error('GuiDiv class constructor requires a <span> element.')
        }
        this.#obj = obj
    }

    show() {
        this.#obj.show()
    }

    hide() {
        this.#obj.hide()
    }

    setVal(val) {
        this.#obj.text(val)
    }

    getVal() {
        return this.#obj.text()
    }
}

export default GuiSpan

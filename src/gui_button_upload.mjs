/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */
import GuiObj from "./gui_obj.mjs";

class GuiButtonUpload extends GuiObj {
    #obj
    #input
    #cb_upload

    constructor(obj, cb_upload) {
        super('GuiButtonUpload', obj, 'BUTTON', 'type', 'button')

        this.#cb_upload = cb_upload

        if (obj.prop('tagName') !== 'BUTTON') {
            throw new Error('GuiButtonUpload class constructor requires a <BUTTON> element.')
        }
        if (!obj.hasClass('btn')) {
            throw new Error('GuiButtonUpload must have CSS style \'btn\'.')
        }
        this.#obj = obj
        const parent = obj.parent()
        if (parent.prop('tagName') !== 'DIV') {
            throw new Error(`GuiButtonUpload: Parent must be a 'DIV'.`)
        }
        if (!parent.hasClass('button-upload')) {
            throw new Error(`GuiButtonUpload: Parent must have CSS class 'button-upload'.`)
        }
        let label = parent.children('label')
        if (label.length === 0) {
            throw new Error(`GuiButtonUpload: There is no LABEL element.`)
        }
        if (label.length !== 1) {
            throw new Error(`GuiButtonUpload: There are more than one LABEL element.`)
        }
        this.#input = label.children('input')
        if (this.#input.length === 0) {
            throw new Error(`GuiButtonUpload: There is no INPUT element.`)
        }
        if (this.#input.length !== 1) {
            throw new Error(`GuiButtonUpload: There are more than one INPUT element.`)
        }
        if (this.#input.attr('type') !== 'file') {
            throw new Error(`GuiButtonUpload: INPUT type must be 'file'.`)
        }

        this.#input.on("change", async (event) => this.#onChangeFileInput(event))

        this.#obj.click((e) => {
            this.#input.click();
        })
    }

    #onChangeFileInput(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        this.#input.val('')

        reader.onload = async (e) => this.#onLoadFile(e)
        reader.readAsArrayBuffer(file);
    }

    async #onLoadFile(e) {
        const fileContent = e.target.result;

        function arrayBufferToString(arrayBuffer) {
            const decoder = new TextDecoder();
            return decoder.decode(arrayBuffer);
        }

        const fileTextContent = arrayBufferToString(fileContent)

        this.#cb_upload(fileTextContent)
    }

    show() {
        this.#obj.show()
    }

    hide() {
        this.#obj.hide()
    }

    enable() {
        this.#obj.removeClass('disable-click')
    }

    disable() {
        this.#obj.addClass('disable-click')
    }

    isEnabled() {
        return !this.#obj.hasClass('disable-click')
    }

    setEnabled(flagEnabled) {
        if (flagEnabled) {
            this.enable()
        } else {
            this.disable()
        }
    }

    addClass(css_class) {
        this.#obj.addClass(css_class)
    }

    removeClass(css_class) {
        this.#obj.removeClass(css_class)
    }

}

export default GuiButtonUpload

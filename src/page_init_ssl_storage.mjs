/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from "jquery";
import GuiButton from "./gui_button.mjs";
import {log_wrap} from "./utils.mjs";
import gui_loading from "./gui_loading.mjs";
import GwStatus from "./gw_status.mjs";
import Network from "./network.mjs";
import Navigation from "./navigation.mjs";
import GuiDiv from "./gui_div.mjs";
import GuiText from "./gui_text.mjs";
import GuiButtonBack from "./gui_button_back.mjs";
import GuiSpan from "./gui_span.mjs";

class PageInitSslStorage {
    #id = $('#section-init_ssl_storage')
    #div_status_success = new GuiDiv($('#section-init_ssl_storage-status-ok'))
    #div_status_rebooting = new GuiDiv($('#section-init_ssl_storage-status-rebooting'))
    #div_status_error = new GuiDiv($('#section-init_ssl_storage-status-error'))
    #text_status_error_desc = new GuiText($('#section-init_ssl_storage-status-error-desc'))
    #div_buttons = new GuiDiv($('#section-init_ssl_storage-buttons'))
    #button_back = new GuiButtonBack($('#section-init_ssl_storage-button-back'))
    #button_close = new GuiButtonBack($('#section-init_ssl_storage-button-close'))
    #button_init_storage = new GuiButton($('#section-init_ssl_storage-button-init_storage'))
    #time_until_reconnection = null

    constructor() {
        this.#button_init_storage.on_click(async () => this.#onClickButtonInitStorage())

        this.#id.bind('onShow', async () => this.#onShow())
        this.#id.bind('onHide', async () => this.#onHide())
    }

    async #onShow() {
        this.#div_status_success.hide()
        this.#div_status_rebooting.hide()
        this.#div_status_error.hide()
        this.#text_status_error_desc.setVal('')
        this.#div_buttons.show()
    }

    async #onHide() {
        this.#div_status_success.hide()
        this.#div_status_rebooting.hide()
        this.#div_status_error.hide()
        this.#text_status_error_desc.setVal('')
        this.#div_buttons.show()
    }

    static show() {
        window.location.hash = '#section-init_ssl_storage'
    }

    async #onClickButtonInitStorage() {
        console.log(log_wrap('Initialize SSL storage'))
        this.#div_buttons.hide()
        gui_loading.bodyClassLoadingAdd()
        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()

        const timeout = 5 * 1000
        const json_data = {}
        Network.httpPostJson('/init_storage', timeout, json_data).then((data) => {
            this.#time_until_reconnection = 20
            this.#button_close.hide()
            this.#div_status_success.show()
            this.#div_status_rebooting.show()
            this.#reconnection_timer()
        }).catch((err) => {
            console.log(log_wrap(`POST /init_storage: failure: ${err}`))
            this.#text_status_error_desc.setVal(`${err}`)
            this.#div_status_error.show()
        }).finally(() => {
            gui_loading.bodyClassLoadingRemove()
        })
    }

    #reconnection_timer() {
        $('.section-init_ssl_storage-status-time_until_reconnect').text(this.#time_until_reconnection)
        if (this.#time_until_reconnection === 0) {
            location.reload()
        } else {
            this.#time_until_reconnection -= 1
            setTimeout(() => this.#reconnection_timer(), 1000)
        }
    }
}

export default PageInitSslStorage

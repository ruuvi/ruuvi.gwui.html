/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import {log_wrap, networkGetHistoryJson} from './utils.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import GuiDiv from './gui_div.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import Navigation from './navigation.mjs'
import gui_loading from './gui_loading.mjs'
import GuiButton from './gui_button.mjs'
import GuiInputTextWithValidation from './gui_input_text_with_validation.mjs'
import {GwCfgScan} from './gw_cfg_scan.mjs'
import {GwCfg} from "./gw_cfg.mjs";
import GuiOverlay from "./gui_overlay.mjs";
import GwStatus from "./gw_status.mjs";
import Network from "./network.mjs";

class PageScanning {
    /** @type GwCfg */
    #gwCfg

    /** @type Auth */
    #auth

    #section = $('section#page-scanning')

    #radio_scan_phy = new GuiRadioButton('scan_phy')

    /** @type GuiRadioButtonOption */
    #radio_scan_phy_1mbit
    /** @type GuiRadioButtonOption */
    #radio_scan_phy_coded
    /** @type GuiRadioButtonOption */
    #radio_scan_phy_1mbit_and_coded

    #radio_company_use_filtering = new GuiRadioButton('company_use_filtering')

    /** @type GuiRadioButtonOption */
    #radio_company_use_filtering_0
    /** @type GuiRadioButtonOption */
    #radio_company_use_filtering_1
    /** @type GuiRadioButtonOption */
    #radio_company_use_filtering_2

    #sect_advanced = new GuiSectAdvanced($('#page-scanning-advanced-button'))

    #div_all_nearby_beacons_scanning_options = new GuiDiv($('#page-scanning-all_nearby_beacons-scanning_options'))
    #checkbox_scan_extended_payload = new GuiCheckbox($('#scan_extended_payload'))
    #checkbox_scan_channel_37 = new GuiCheckbox($('#scan_channel_37'))
    #checkbox_scan_channel_38 = new GuiCheckbox($('#scan_channel_38'))
    #checkbox_scan_channel_39 = new GuiCheckbox($('#scan_channel_39'))

    #div_scan_extended_payload = new GuiDiv($('#scan_extended_payload-div'))

    #checkbox_scan_filtering = new GuiCheckbox($('#scan_filtering'))
    #div_scan_filtering_options = new GuiDiv($('#scan_filtering-options'))
    #radio_scan_filtering_type = new GuiRadioButton('scan_filtering-type')

    /** @type GuiRadioButtonOption */
    #radio_scan_filtering_type_discard
    /** @type GuiRadioButtonOption */
    #radio_scan_filtering_type_allow

    #list_of_mac = $('#page_scanning-list_of_mac')
    #button_refresh_list_of_mac = new GuiButton($('#scan_filter_refresh'))
    #input_add_mac_filter = new GuiInputTextWithValidation($('#scan_filter_add_mac'))
    #button_add_mac_filter_manually = new GuiButton($('#scan_filter-button-add_manually'))

    #button_back = new GuiButtonBack($('#page-scanning-button-back'))
    #button_continue = new GuiButtonContinue($('#page-scanning-button-continue'))

    #overlay_no_gateway_connection = new GuiOverlay($('#overlay-no_gateway_connection'))

    /**
     * @param {GwCfg} gwCfg
     * @param {Auth} auth
     */
    constructor(gwCfg, auth) {
        this.#gwCfg = gwCfg
        this.#auth = auth

        this.#radio_scan_phy_1mbit = this.#radio_scan_phy.addOption('scan_phy_1mbit', false)
        this.#radio_scan_phy_coded = this.#radio_scan_phy.addOption('scan_phy_coded', false)
        this.#radio_scan_phy_1mbit_and_coded = this.#radio_scan_phy.addOption('scan_phy_1mbit_and_coded', false)

        this.#radio_company_use_filtering_0 = this.#radio_company_use_filtering.addOption('0', false)
        this.#radio_company_use_filtering_1 = this.#radio_company_use_filtering.addOption('1', false)
        this.#radio_company_use_filtering_2 = this.#radio_company_use_filtering.addOption('2', false)

        this.#radio_scan_filtering_type_discard = this.#radio_scan_filtering_type.addOption('scan_filtering-type_discard', true)
        this.#radio_scan_filtering_type_allow = this.#radio_scan_filtering_type.addOption('scan_filtering-type_allow', false)

        this.#gwCfg.scan.scan_filter_list.forEach((mac, idx) => {
            this.#add_row_configured_sensor(mac)
        })

        this.#section.bind('onShow', async () => this.#onShow())
        this.#section.bind('onHide', async () => this.#onHide())


        this.#radio_company_use_filtering_0.on_click(() => this.#on_settings_scan_filtering_changed())
        this.#radio_company_use_filtering_1.on_click(() => this.#on_settings_scan_filtering_changed())
        this.#radio_company_use_filtering_2.on_click(() => this.#on_settings_scan_filtering_changed())

        this.#radio_scan_phy_1mbit.on_click(() => this.#on_bluetooth_scanning_changed())
        this.#radio_scan_phy_coded.on_click(() => this.#on_bluetooth_scanning_changed())
        this.#radio_scan_phy_1mbit_and_coded.on_click(() => this.#on_bluetooth_scanning_changed())
        this.#checkbox_scan_extended_payload.on_change(() => this.#on_bluetooth_scanning_changed())
        this.#checkbox_scan_channel_37.on_change(() => this.#on_bluetooth_scanning_changed())
        this.#checkbox_scan_channel_38.on_change(() => this.#on_bluetooth_scanning_changed())
        this.#checkbox_scan_channel_39.on_change(() => this.#on_bluetooth_scanning_changed())

        this.#checkbox_scan_filtering.on_change(() => this.#onChangeCheckboxScanFiltering())
        this.#button_refresh_list_of_mac.on_click(async () => this.#refreshListOfMac())
        this.#input_add_mac_filter.on_change(() => this.#onChangeInputFilter())
        this.#button_add_mac_filter_manually.on_click(() => this.#onClickButtonAddFilterManually())

        this.#button_continue.on_click(() => Navigation.change_page_to_finished(11))

        if (this.#gwCfg.scan.scan_1mbit_phy && this.#gwCfg.scan.scan_coded_phy) {
            this.#radio_scan_phy_1mbit_and_coded.setChecked()
        } else if (this.#gwCfg.scan.scan_coded_phy) {
            this.#radio_scan_phy_coded.setChecked()
        } else {
            this.#radio_scan_phy_1mbit.setChecked()
        }

        if (this.#gwCfg.scan.scan_filter_list.length === 0) {
            this.#checkbox_scan_filtering.setUnchecked()
            this.#div_scan_filtering_options.hide()
            this.#radio_scan_filtering_type_discard.setChecked()
        } else {
            this.#checkbox_scan_filtering.setChecked()
            this.#div_scan_filtering_options.show()
            if (this.#gwCfg.scan.scan_filter_allow_listed) {
                this.#radio_scan_filtering_type_allow.setChecked()
            } else {
                this.#radio_scan_filtering_type_discard.setChecked()
            }
        }
    }

    async #onShow() {
        console.log(log_wrap('section#page-scanning: onShow'))

        if (this.#gwCfg.scan.scan_1mbit_phy && this.#gwCfg.scan.scan_coded_phy) {
            this.#radio_scan_phy_1mbit_and_coded.setChecked()
        } else if (this.#gwCfg.scan.scan_coded_phy) {
            this.#radio_scan_phy_coded.setChecked()
        } else {
            this.#radio_scan_phy_1mbit.setChecked()
        }

        if (this.#div_scan_extended_payload.isHidden()) {
            this.#checkbox_scan_extended_payload.setState(false)
        } else {
            this.#checkbox_scan_extended_payload.setState(this.#gwCfg.scan.scan_extended_payload)
        }

        this.#checkbox_scan_channel_37.setState(this.#gwCfg.scan.scan_channel_37)
        this.#checkbox_scan_channel_38.setState(this.#gwCfg.scan.scan_channel_38)
        this.#checkbox_scan_channel_39.setState(this.#gwCfg.scan.scan_channel_39)

        if (!this.#gwCfg.company_filter.company_use_filtering) {
            this.#radio_company_use_filtering_0.setChecked()
        } else {
            if (this.#gwCfg.scan.scan_coded_phy) {
                this.#radio_company_use_filtering_2.setChecked()
            } else {
                this.#radio_company_use_filtering_1.setChecked()
            }
        }
        this.#on_settings_scan_filtering_changed(false)

        this.#onChangeInputFilter()

        if (this.#radio_company_use_filtering_1.isChecked() && !this.#checkbox_scan_filtering.isChecked()) {
            this.#sect_advanced.hide()
        } else {
            this.#sect_advanced.show()
        }

        if (this.#checkbox_scan_filtering.isChecked()) {
            await this.#refreshListOfMac()
        }
    }

    #extractMacAddrFromRowId(prefixedMacAddr) {
        const lastIndex = prefixedMacAddr.lastIndexOf('-')
        const macAddress = prefixedMacAddr.substring(lastIndex + 1)
        return macAddress.match(/.{1,2}/g).join(':')
    }


    async #onHide() {
        console.log(log_wrap('section#page-scanning: onHide'))

        if (this.#div_scan_extended_payload.isHidden())
        {
            this.#checkbox_scan_extended_payload.setState(false)
        }

        this.#input_add_mac_filter.setVal('')
        this.#input_add_mac_filter.clearValidationIcon('')

        this.#gwCfg.company_filter.company_use_filtering = !this.#radio_company_use_filtering_0.isChecked()
        if (this.#radio_scan_phy_1mbit.isChecked()) {
            this.#gwCfg.scan.scan_1mbit_phy = true
            this.#gwCfg.scan.scan_coded_phy = false
        } else if (this.#radio_scan_phy_coded.isChecked()) {
            this.#gwCfg.scan.scan_1mbit_phy = false
            this.#gwCfg.scan.scan_coded_phy = true
        } else if (this.#radio_scan_phy_1mbit_and_coded.isChecked()) {
            this.#gwCfg.scan.scan_1mbit_phy = true
            this.#gwCfg.scan.scan_coded_phy = true
        } else {
            this.#gwCfg.scan.scan_1mbit_phy = true
            this.#gwCfg.scan.scan_coded_phy = false
        }
        this.#gwCfg.scan.scan_extended_payload = this.#checkbox_scan_extended_payload.isChecked()
        this.#gwCfg.scan.scan_channel_37 = this.#checkbox_scan_channel_37.isChecked()
        this.#gwCfg.scan.scan_channel_38 = this.#checkbox_scan_channel_38.isChecked()
        this.#gwCfg.scan.scan_channel_39 = this.#checkbox_scan_channel_39.isChecked()

        let list_of_mac = []
        if (this.#checkbox_scan_filtering.isChecked()) {
            $('#page_scanning-list_of_mac tr').each((index, row) => {
                const row_id = $(row).attr('id')
                const mac = this.#extractMacAddrFromRowId(row_id)
                if ($(`#${this.#get_scan_filter_checkbox(mac)}`).prop('checked')) {
                    list_of_mac.push(mac)
                }
            })
            list_of_mac.sort()
        }

        this.#gwCfg.scan.scan_filter_list = list_of_mac
        if (list_of_mac.length === 0) {
            this.#gwCfg.scan.scan_filter_allow_listed = false
        } else {
            this.#gwCfg.scan.scan_filter_allow_listed = this.#radio_scan_filtering_type_allow.isChecked()
        }
    }

    #update_bluetooth_scanning_options() {
        gui_loading.bodyClassLoadingAdd()

        GwStatus.stopCheckingStatus()
        Network.waitWhileInProgress().then(() => {
            let scan_1mbit_phy = false
            let scan_coded_phy = false
            if (this.#radio_scan_phy_1mbit.isChecked()) {
                scan_1mbit_phy = true
            } else if (this.#radio_scan_phy_coded.isChecked()) {
                scan_coded_phy = true
            } else if (this.#radio_scan_phy_1mbit_and_coded.isChecked()) {
                scan_1mbit_phy = true
                scan_coded_phy = true
            } else {
                scan_1mbit_phy = true
            }

            this.#gwCfg.saveBluetoothScanningConfig(this.#auth,
                !this.#radio_company_use_filtering_0.isChecked(),
                scan_coded_phy,
                scan_1mbit_phy,
                this.#checkbox_scan_extended_payload.isChecked(),
                this.#checkbox_scan_channel_37.isChecked(),
                this.#checkbox_scan_channel_38.isChecked(),
                this.#checkbox_scan_channel_39.isChecked()).then(() => {
                console.log(log_wrap(`saveBluetoothScanningConfig ok`))
            }).catch((err) => {
                console.log(log_wrap(`saveBluetoothScanningConfig failed: ${err}`))
                this.#overlay_no_gateway_connection.fadeIn()
            }).finally(() => {
                setTimeout(() => {
                    this.#refreshListOfMac(false).then(() => {
                        GwStatus.startCheckingStatus()
                        gui_loading.bodyClassLoadingRemove()
                    })
                }, 3000)
            })
        })
    }

    #on_settings_scan_filtering_changed(flag_smoothly = true) {
        if (this.#radio_company_use_filtering_0.isChecked()) {
            if (flag_smoothly) {
                this.#div_all_nearby_beacons_scanning_options.slideDown()
            } else {
                this.#div_all_nearby_beacons_scanning_options.show()
            }
        } else if (this.#radio_company_use_filtering_1.isChecked()) {
            if (flag_smoothly) {
                this.#div_all_nearby_beacons_scanning_options.slideUp()
            } else {
                this.#div_all_nearby_beacons_scanning_options.hide()
            }
            this.#radio_scan_phy_1mbit.setChecked()
            this.#checkbox_scan_extended_payload.setUnchecked()
            this.#checkbox_scan_channel_37.setChecked()
            this.#checkbox_scan_channel_38.setChecked()
            this.#checkbox_scan_channel_38.setChecked()
        } else if (this.#radio_company_use_filtering_2.isChecked()) {
            if (flag_smoothly) {
                this.#div_all_nearby_beacons_scanning_options.slideUp()
            } else {
                this.#div_all_nearby_beacons_scanning_options.hide()
            }
            this.#radio_scan_phy_1mbit_and_coded.setChecked()
            this.#checkbox_scan_extended_payload.setUnchecked()
            this.#checkbox_scan_channel_37.setChecked()
            this.#checkbox_scan_channel_38.setChecked()
            this.#checkbox_scan_channel_39.setChecked()
        } else {
            throw new Error('Unsupported scan_filtering')
        }

        if (this.#checkbox_scan_filtering.isChecked()) {
            this.#update_bluetooth_scanning_options()
        }
    }

    #on_bluetooth_scanning_changed() {
        if (this.#checkbox_scan_filtering.isChecked()) {
            this.#update_bluetooth_scanning_options()
        }
    }

    #onChangeCheckboxScanFiltering() {
        if (this.#checkbox_scan_filtering.isChecked()) {
            this.#div_scan_filtering_options.slideDown()
            this.#update_bluetooth_scanning_options()
        } else {
            this.#div_scan_filtering_options.slideUp()
        }
    }

    async #refreshListOfMac(flag_show_loading = true) {
        if (flag_show_loading) {
            gui_loading.bodyClassLoadingAdd()
        }
        let history_json = await networkGetHistoryJson()
        await this.#updateListOfMac(history_json)
        if (flag_show_loading) {
            gui_loading.bodyClassLoadingRemove()
        }
    }

    #updateListOfMac(history_json) {
        const dict_of_tags = history_json.data.tags
        let arr_of_mac = []
        for (const [mac, value] of Object.entries(dict_of_tags)) {
            arr_of_mac.push(mac)
        }
        arr_of_mac.sort()

        let list_of_mac_to_remove = []
        $('#page_scanning-list_of_mac tr').each((index, row) => {
            const row_id = $(row).attr('id')
            const mac = this.#extractMacAddrFromRowId(row_id)
            if (!$(`#${this.#get_scan_filter_checkbox(mac)}`).prop('checked')) {
                list_of_mac_to_remove.push(mac)
            }
        })
        list_of_mac_to_remove.forEach((mac) => {
            $(`#${this.#get_scan_filter_row_id(mac)}`).remove()
        })

        arr_of_mac.forEach((mac, idx) => {
            let row = $(`#${this.#get_scan_filter_row_id(mac)}`)
            if (row.length === 0) {
                this.#list_of_mac.append(this.#generateRowForMAC(mac))
            }
        })
    }

    #add_row_configured_sensor(mac) {
        this.#list_of_mac.append(this.#generateRowForMAC(mac))
        $(`#${this.#get_scan_filter_checkbox(mac)}`).prop('checked', true)
    }

    #onChangeInputFilter() {
        const mac = this.#input_add_mac_filter.getVal()
        if (GwCfgScan.isValidMacAddress(mac)) {
            this.#button_add_mac_filter_manually.enable()
            this.#input_add_mac_filter.setValid()
        } else {
            this.#button_add_mac_filter_manually.disable()
            if (mac === '') {
                this.#input_add_mac_filter.clearValidationIcon()
            } else {
                this.#input_add_mac_filter.setInvalid()
            }
        }
    }

    #onClickButtonAddFilterManually() {
        const mac = this.#input_add_mac_filter.getVal()
        this.#input_add_mac_filter.setVal('')
        this.#input_add_mac_filter.clearValidationIcon('')
        $(`#${this.#get_scan_filter_row_id(mac)}`).remove()
        this.#add_row_configured_sensor(mac)
    }

    #get_scan_filter_row_id(mac) {
        return `scan_filter-row-${this.#removeColonsFromMacAddress(mac)}`
    }

    #get_scan_filter_checkbox(mac) {
        return `scan_filter-checkbox-${this.#removeColonsFromMacAddress(mac)}`
    }

    #generateRowForMAC(mac) {
        return `
      <tr id="${this.#get_scan_filter_row_id(mac)}" class="page_scanning-list_of_mac-row">
          <td class="page_scanning-list_of_mac-column_mac">${mac}</td>
          <td class="page_scanning-list_of_mac-column_checkbox">
                <label class="control control-checkbox">
                    <input id="${this.#get_scan_filter_checkbox(mac)}" type="checkbox">
                    <span class="control_indicator"></span>
                </label>
          </td>
      </tr>
    `
    }

    #removeColonsFromMacAddress(macAddress) {
        return macAddress.replace(/:/g, '')
    }

}

export default PageScanning

/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import $ from 'jquery'
import {log_wrap, validate_url} from './utils.mjs'
import GuiCheckbox from './gui_checkbox.mjs'
import GuiDiv from './gui_div.mjs'
import GuiSectAdvanced from './gui_sect_advanced.mjs'
import GuiInputTextWithValidation from './gui_input_text_with_validation.mjs'
import GuiInputPasswordWithValidation from './gui_input_password_with_validataion.mjs'
import GuiRadioButton from './gui_radio_button.mjs'
import GuiButtonContinue from './gui_button_continue.mjs'
import GuiButtonBack from './gui_button_back.mjs'
import Navigation from './navigation.mjs'
import gui_loading from './gui_loading.mjs'
import GwStatus from './gw_status.mjs'
import GuiText from './gui_text.mjs'
import Network from './network.mjs'
import GuiInputTokenWithValidation from './gui_input_token_with_validation.mjs'
import GuiButton from './gui_button.mjs'
import GuiButtonUpload from "./gui_button_upload.mjs";

class PageRemoteCfg {
    /** @type GwCfg */
    #gwCfg

    /** @type Auth */
    #auth

    #section = $('section#page-remote_cfg')

    #checkbox_remote_cfg_use = new GuiCheckbox($('#remote_cfg-use'))
    #checkbox_remote_cfg_use_auth = new GuiCheckbox($('#remote_cfg-use_auth'))
    #radio_remote_cfg_auth_type = new GuiRadioButton('remote_cfg_auth_type')

    /** @type GuiRadioButtonOption */
    #radio_remote_cfg_auth_type_basic
    /** @type GuiRadioButtonOption */
    #radio_remote_cfg_auth_type_bearer

    #sect_advanced = new GuiSectAdvanced($('#page-remote_cfg-advanced-button'))
    #input_base_url = new GuiInputTextWithValidation($('#remote_cfg-base_url'))
    #input_auth_basic_user = new GuiInputTextWithValidation($('#remote_cfg-auth_basic-user'))
    #input_auth_basic_pass = new GuiInputPasswordWithValidation($('#remote_cfg-auth_basic-password'))
    #input_auth_bearer_token = new GuiInputTokenWithValidation($('#remote_cfg-auth_bearer-token'), true)
    #button_continue = new GuiButtonContinue($('#page-remote_cfg-button-continue'))
    #button_back = new GuiButtonBack($('#page-remote_cfg-button-back'))
    #button_check = new GuiButton($('#remote_cfg-button-check'))
    #button_download = new GuiButton($('#remote_cfg-button-download'))
    #div_status_error = new GuiDiv($('#page-remote_cfg-status-error'))
    #text_status_error_desc = new GuiText($('#page-remote_cfg-status-error-desc'))
    #div_options = new GuiDiv($('#remote_cfg-options'))
    #div_auth_options = new GuiDiv($('#conf-remote_cfg-auth-options'))
    #div_auth_basic_options = new GuiDiv($('#conf-remote_cfg-auth_basic-options'))
    #div_auth_bearer_options = new GuiDiv($('#conf-remote_cfg-auth_bearer-options'))

    #checkbox_remote_cfg_use_client_ssl_cert = new GuiCheckbox($('#remote_cfg-use_client_ssl_cert'))
    #button_remote_cfg_upload_client_cert = new GuiButtonUpload($('#remote_cfg-button_upload_client_cert'),
        async (fileTextContent) => this.#onUploadClientCert(fileTextContent))
    #button_remote_cfg_upload_client_key = new GuiButtonUpload($('#remote_cfg-button_upload_client_key'),
        async (fileTextContent) => this.#onUploadClientKey(fileTextContent))
    #button_remote_cfg_remove_client_cert_and_key = new GuiButton($('#remote_cfg-button_remove_client_cert_and_key'))

    #checkbox_remote_cfg_use_server_ssl_cert = new GuiCheckbox($('#remote_cfg-use_server_ssl_cert'))
    #button_remote_cfg_upload_server_cert = new GuiButtonUpload($('#remote_cfg-button_upload_server_cert'),
        async (fileTextContent) => this.#onUploadServerCertRemote(fileTextContent))
    #button_remote_cfg_remove_server_cert = new GuiButton($('#remote_cfg-button_remove_server_cert'))

    constructor(gwCfg, auth) {
        this.#gwCfg = gwCfg
        this.#auth = auth

        this.#radio_remote_cfg_auth_type_basic = this.#radio_remote_cfg_auth_type.addOption('remote_cfg_auth_type_basic', false)
        this.#radio_remote_cfg_auth_type_bearer = this.#radio_remote_cfg_auth_type.addOption('remote_cfg_auth_type_bearer', false)

        this.#section.bind('onShow', async () => this.#onShow())
        this.#section.bind('onHide', async () => this.#onHide())

        if (!this.#gwCfg.remote_cfg.remote_cfg_use || !this.#gwCfg.remote_cfg.remote_cfg_auth_type.isBasicAuth()) {
            this.#input_auth_basic_pass.clear()
        }
        if (!this.#gwCfg.remote_cfg.remote_cfg_use || !this.#gwCfg.remote_cfg.remote_cfg_auth_type.isBearerAuth()) {
            this.#input_auth_bearer_token.clear()
        }

        this.#checkbox_remote_cfg_use.on_change(() => this.#onChangeRemoteCfgUse())
        this.#checkbox_remote_cfg_use_auth.on_change(() => this.#onChangeRemoteCfgUseAuth())
        this.#radio_remote_cfg_auth_type_basic.on_click(() => this.#onChangeRemoteCfgAuthType())
        this.#radio_remote_cfg_auth_type_bearer.on_click(() => this.#onChangeRemoteCfgAuthType())
        this.#input_base_url.on_change(() => this.#onChangeBaseURL())
        this.#input_auth_basic_user.on_change(() => this.#onChangeAuthBasicUser())
        this.#input_auth_basic_pass.on_change(() => this.#onChangeAuthBasicPass())
        this.#input_auth_bearer_token.on_change(() => this.#onChangeAuthBearerToken())

        this.#checkbox_remote_cfg_use_client_ssl_cert.on_change(() => this.#onChangeUseClientSslCertRemote())
        this.#checkbox_remote_cfg_use_server_ssl_cert.on_change(() => this.#onChangeUseServerSslCertRemote())
        this.#button_remote_cfg_remove_client_cert_and_key.on_click(async () => this.#onRemoveClientCertAndKey())
        this.#button_remote_cfg_remove_server_cert.on_click(async () => this.#onRemoveServerCertRemote())

        this.#button_continue.on_click(() => Navigation.change_page_to_update_schedule())
        this.#button_check.on_click(() => this.#onButtonCheck())
        this.#button_download.on_click(async () => this.#onButtonDownload())
    }

    async #onShow() {
        console.log(log_wrap('section#page-remote_cfg: onShow'))
        this.#checkbox_remote_cfg_use.setState(this.#gwCfg.remote_cfg.remote_cfg_use)
        if (this.#gwCfg.remote_cfg.remote_cfg_use) {
            this.#input_base_url.setVal(this.#gwCfg.remote_cfg.remote_cfg_url)
            if (this.#gwCfg.remote_cfg.remote_cfg_auth_type.isNoAuth()) {
                this.#checkbox_remote_cfg_use_auth.setUnchecked()
            } else if (this.#gwCfg.remote_cfg.remote_cfg_auth_type.isBasicAuth()) {
                this.#checkbox_remote_cfg_use_auth.setChecked()
                this.#radio_remote_cfg_auth_type_basic.setChecked()
                this.#input_auth_basic_user.setVal(this.#gwCfg.remote_cfg.remote_cfg_auth_basic_user)
            } else if (this.#gwCfg.remote_cfg.remote_cfg_auth_type.isBearerAuth()) {
                this.#checkbox_remote_cfg_use_auth.setChecked()
                this.#radio_remote_cfg_auth_type_bearer.setChecked()
            }

            this.#checkbox_remote_cfg_use_client_ssl_cert.setState(this.#gwCfg.remote_cfg.remote_cfg_use_ssl_client_cert)
            this.#checkbox_remote_cfg_use_server_ssl_cert.setState(this.#gwCfg.remote_cfg.remote_cfg_use_ssl_server_cert)
            if (!this.#gwCfg.info.storage_remote_cfg_cli_cert || !this.#gwCfg.info.storage_remote_cfg_cli_key) {
                this.#checkbox_remote_cfg_use_client_ssl_cert.setUnchecked()
            }
            if (!this.#gwCfg.info.storage_remote_cfg_srv_cert) {
                this.#checkbox_remote_cfg_use_server_ssl_cert.setUnchecked()
            }

            this.#sect_advanced.show()
        } else {
            this.#sect_advanced.hide()
        }
        this.#on_remote_cfg_changed()
    }

    #updateGwCfg() {
        this.#gwCfg.remote_cfg.remote_cfg_use = this.#checkbox_remote_cfg_use.isChecked()
        if (this.#gwCfg.remote_cfg.remote_cfg_use) {
            this.#gwCfg.remote_cfg.remote_cfg_refresh_interval_minutes = 0
            this.#gwCfg.remote_cfg.remote_cfg_url = this.#input_base_url.getVal()
            if (!this.#checkbox_remote_cfg_use_auth.isChecked()) {
                this.#gwCfg.remote_cfg.remote_cfg_auth_type.setNoAuth()
                this.#gwCfg.remote_cfg.remote_cfg_auth_basic_user = ''
                this.#gwCfg.remote_cfg.remote_cfg_auth_basic_pass = ''
                this.#gwCfg.remote_cfg.remote_cfg_auth_bearer_token = ''
            } else {
                if (this.#radio_remote_cfg_auth_type_basic.isChecked()) {
                    this.#gwCfg.remote_cfg.remote_cfg_auth_type.setBasicAuth()
                    this.#gwCfg.remote_cfg.remote_cfg_auth_basic_user = this.#input_auth_basic_user.getVal()
                    if (!this.#input_auth_basic_pass.is_saved()) {
                        this.#gwCfg.remote_cfg.remote_cfg_auth_basic_pass = this.#input_auth_basic_pass.getVal()
                    }
                    this.#gwCfg.remote_cfg.remote_cfg_auth_bearer_token = ''
                } else if (this.#radio_remote_cfg_auth_type_bearer.isChecked()) {
                    this.#gwCfg.remote_cfg.remote_cfg_auth_type.setBearerAuth()
                    this.#gwCfg.remote_cfg.remote_cfg_auth_bearer_token = this.#input_auth_bearer_token.getVal()
                    this.#gwCfg.remote_cfg.remote_cfg_auth_basic_user = ''
                    this.#gwCfg.remote_cfg.remote_cfg_auth_basic_pass = ''
                } else {
                    throw new Error('Unsupported remote_cfg_auth_type')
                }
            }
            this.#gwCfg.remote_cfg.remote_cfg_use_ssl_client_cert = this.#checkbox_remote_cfg_use_client_ssl_cert.isChecked()
            this.#gwCfg.remote_cfg.remote_cfg_use_ssl_server_cert = this.#checkbox_remote_cfg_use_server_ssl_cert.isChecked()
        } else {
            this.#gwCfg.remote_cfg.remote_cfg_url = ''
            this.#gwCfg.remote_cfg.remote_cfg_refresh_interval_minutes = 0
            this.#gwCfg.remote_cfg.remote_cfg_auth_type.setNoAuth()
            this.#gwCfg.remote_cfg.remote_cfg_auth_basic_user = ''
            this.#gwCfg.remote_cfg.remote_cfg_auth_basic_pass = ''
            this.#gwCfg.remote_cfg.remote_cfg_auth_bearer_token = ''
            this.#gwCfg.remote_cfg.remote_cfg_use_ssl_client_cert = false
            this.#gwCfg.remote_cfg.remote_cfg_use_ssl_server_cert = false
        }
    }

    async #onHide() {
        console.log(log_wrap('section#page-remote_cfg: onHide'))
        this.#updateGwCfg()
    }

    #onChangeRemoteCfgUse() {
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    #onChangeRemoteCfgUseAuth() {
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    #onChangeRemoteCfgAuthType() {
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    #onChangeBaseURL() {
        this.#input_base_url.setValidationRequired()
        this.#input_base_url.clearValidationIcon()
        this.#on_remote_cfg_changed()
    }

    #onChangeAuthBasicUser() {
        this.#input_auth_basic_pass.clear()
        this.#input_auth_basic_user.setValidationRequired()
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    #onChangeAuthBasicPass() {
        this.#input_auth_basic_pass.setValidationRequired()
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    #onChangeAuthBearerToken() {
        this.#input_auth_bearer_token.setValidationRequired()
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    async #onUploadClientCert(fileTextContent) {
        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()
        try {
            await Network.httpEncryptAndPostFile(this.#auth, '/ssl_cert?file=rcfg_cli_cert', 5000, fileTextContent)
            console.log(log_wrap('POST /ssl_cert: successful'))
            this.#gwCfg.info.storage_remote_cfg_cli_cert = true
        } catch (err) {
            console.log(log_wrap(`POST /ssl_cert: failure: ${err}`))
            throw err
        } finally {
            GwStatus.startCheckingStatus()
        }
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    async #onUploadClientKey(fileTextContent) {
        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()
        try {
            await Network.httpEncryptAndPostFile(this.#auth, '/ssl_cert?file=rcfg_cli_key', 5000, fileTextContent)
            console.log(log_wrap('POST /ssl_cert: successful'))
            this.#gwCfg.info.storage_remote_cfg_cli_key = true
        } catch (err) {
            console.log(log_wrap(`POST /ssl_cert: failure: ${err}`))
            throw err
        } finally {
            GwStatus.startCheckingStatus()
        }
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    async #onRemoveClientCertAndKey() {
        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()
        try {
            try {
                const data = {'timestamp': Date.now()}
                await Network.httpDeleteJson('/ssl_cert?file=rcfg_cli_cert', 5000, JSON.stringify(data))
                console.log(log_wrap('DELETE /ssl_cert: successful'))
                this.#gwCfg.info.storage_remote_cfg_cli_cert = false
            } catch (err) {
                console.log(log_wrap(`DELETE /ssl_cert: failure: ${err}`))
            }
            try {
                const data = {'timestamp': Date.now()}
                await Network.httpDeleteJson('/ssl_cert?file=rcfg_cli_key', 5000, JSON.stringify(data))
                console.log(log_wrap('DELETE /ssl_key: successful'))
                this.#gwCfg.info.storage_remote_cfg_cli_key = false
            } catch (err) {
                console.log(log_wrap(`DELETE /ssl_key: failure: ${err}`))
            }
        } finally {
            GwStatus.startCheckingStatus()
        }
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    async #onUploadServerCertRemote(fileTextContent) {
        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()
        try {
            await Network.httpEncryptAndPostFile(this.#auth, '/ssl_cert?file=rcfg_srv_cert', 5000, fileTextContent)
            console.log(log_wrap('POST /ssl_cert: successful'))
            this.#gwCfg.info.storage_remote_cfg_srv_cert = true
        } catch (err) {
            console.log(log_wrap(`POST /ssl_cert: failure: ${err}`))
            throw err
        } finally {
            GwStatus.startCheckingStatus()
        }
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    async #onRemoveServerCertRemote() {
        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()
        try {
            try {
                const data = {'timestamp': Date.now()}
                await Network.httpDeleteJson('/ssl_cert?file=rcfg_srv_cert', 5000, JSON.stringify(data))
                console.log(log_wrap('DELETE /ssl_cert: successful'))
                this.#gwCfg.info.storage_remote_cfg_srv_cert = false
            } catch (err) {
                console.log(log_wrap(`DELETE /ssl_cert: failure: ${err}`))
            }
        } finally {
            GwStatus.startCheckingStatus()
        }
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    #onChangeUseClientSslCertRemote() {
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }

    #onChangeUseServerSslCertRemote() {
        this.#input_base_url.setValidationRequired()
        this.#on_remote_cfg_changed()
    }


    async #remote_cfg_validate_url() {
        gui_loading.bodyClassLoadingAdd()
        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()

        let auth_type = 'none'

        let params = {
            input_url: this.#input_base_url,
            use_ssl_client_cert: this.#checkbox_remote_cfg_use_client_ssl_cert.isChecked(),
            use_ssl_server_cert: this.#checkbox_remote_cfg_use_server_ssl_cert.isChecked(),
            error: this.#text_status_error_desc,
            div_status: this.#div_status_error,
        }
        if (this.#checkbox_remote_cfg_use_auth.isChecked()) {
            if (this.#radio_remote_cfg_auth_type_basic.isChecked()) {
                auth_type = 'basic'
                params['input_user'] = this.#input_auth_basic_user
                params['input_pass'] = this.#input_auth_basic_pass
            } else {
                auth_type = 'bearer'
                params['input_token'] = this.#input_auth_bearer_token
            }
        }
        this.#div_status_error.hide()

        validate_url(this.#auth, this.#input_base_url.getVal(), 'check_remote_cfg', auth_type, params)
            .finally(() => {
                this.#on_remote_cfg_changed()
                gui_loading.bodyClassLoadingRemove()
                GwStatus.startCheckingStatus()
            })
    }

    #onButtonCheck() {
        let base_url_val = this.#input_base_url.getVal()
        if (!base_url_val.startsWith('http://') && !base_url_val.startsWith('https://')) {
            base_url_val = 'https://' + base_url_val
            this.#input_base_url.setVal(base_url_val)
        }

        this.#input_base_url.clearValidationIcon()
        this.#input_auth_basic_user.clearValidationIcon()
        this.#input_auth_basic_pass.clearValidationIcon()
        this.#input_auth_bearer_token.clearValidationIcon()
        this.#input_base_url.setValidationRequired()

        this.#remote_cfg_validate_url().then(() => {
        })
    }

    async #onButtonDownload() {
        gui_loading.bodyClassLoadingAdd()
        this.#div_status_error.hide()
        this.#button_download.disable()

        GwStatus.stopCheckingStatus()
        await Network.waitWhileInProgress()

        this.#updateGwCfg()

        try {
            await this.#gwCfg.saveConfig(this.#auth)
            let data = await Network.httpPostJson('/gw_cfg_download', 10000, '{}')
            const status = data['status']
            let message = data['message']
            if (message === undefined) {
                message = ''
            }
            if (status === 200) {
                this.#button_download.enable()
                Navigation.change_page_to_finished(5, false)
            } else {
                console.log(log_wrap(`POST /gw_cfg_download: failure, status=${status}, message=${message}`))
                this.#button_download.enable()
                this.#text_status_error_desc.setVal('Status=' + status + ': ' + message)
                this.#div_status_error.show()
                GwStatus.startCheckingStatus()
            }
        } catch (err) {
            console.log(log_wrap(`POST /gw_cfg_download: failure, error=${err}`))
            this.#button_download.enable()
            this.#text_status_error_desc.setVal(`${err}`)
            this.#div_status_error.show()
            GwStatus.startCheckingStatus()
        } finally {
            gui_loading.bodyClassLoadingRemove()
        }
    }

    #on_remote_cfg_changed() {
        const remote_cfg_use = this.#checkbox_remote_cfg_use.isChecked()
        const remote_cfg_use_auth = this.#checkbox_remote_cfg_use_auth.isChecked()

        if (this.#input_base_url.isValidationRequired()) {
            this.#input_base_url.clearValidationIcon()
            this.#input_auth_basic_user.clearValidationIcon()
            this.#input_auth_basic_pass.clearValidationIcon()
            this.#input_auth_bearer_token.clearValidationIcon()
        }

        this.#checkbox_remote_cfg_use_client_ssl_cert.setEnabled(this.#gwCfg.info.storage_remote_cfg_cli_cert && this.#gwCfg.info.storage_remote_cfg_cli_key)
        this.#button_remote_cfg_upload_client_cert.setStorageReady(this.#gwCfg.info.storage_ready)
        this.#button_remote_cfg_upload_client_cert.setEnabled(!this.#gwCfg.info.storage_remote_cfg_cli_cert)
        this.#button_remote_cfg_upload_client_key.setStorageReady(this.#gwCfg.info.storage_ready)
        this.#button_remote_cfg_upload_client_key.setEnabled(!this.#gwCfg.info.storage_remote_cfg_cli_key)
        this.#button_remote_cfg_remove_client_cert_and_key.setEnabled(this.#gwCfg.info.storage_remote_cfg_cli_cert || this.#gwCfg.info.storage_remote_cfg_cli_key)
        if (!this.#gwCfg.info.storage_remote_cfg_cli_cert || !this.#gwCfg.info.storage_remote_cfg_cli_key) {
            this.#checkbox_remote_cfg_use_client_ssl_cert.setUnchecked()
        }
        this.#checkbox_remote_cfg_use_server_ssl_cert.setEnabled(this.#gwCfg.info.storage_remote_cfg_srv_cert)
        this.#button_remote_cfg_upload_server_cert.setStorageReady(this.#gwCfg.info.storage_ready)
        this.#button_remote_cfg_upload_server_cert.setEnabled(!this.#gwCfg.info.storage_remote_cfg_srv_cert)
        this.#button_remote_cfg_remove_server_cert.setEnabled(this.#gwCfg.info.storage_remote_cfg_srv_cert)
        if (!this.#gwCfg.info.storage_remote_cfg_srv_cert) {
            this.#checkbox_remote_cfg_use_server_ssl_cert.setUnchecked()
        }

        let h = ''
        h += '<ul class="progressbar">'
        if (remote_cfg_use) {
            this.#div_options.show()
            for (let i = 0; i < 4; ++i) {
                h += '<li class="active"></li>'
            }
            for (let i = 4; i < 5; ++i) {
                h += '<li></li>'
            }
            this.#button_continue.hide()
        } else {
            this.#div_options.hide()
            for (let i = 0; i < 4; ++i) {
                h += '<li class="active"></li>'
            }
            for (let i = 4; i < 8; ++i) {
                h += '<li></li>'
            }
            this.#button_continue.show()
        }
        h += '</ul>'
        h += '\n'
        $('section#page-remote_cfg div.progressbar-container').html(h)

        let remote_cfg_auth_type = this.#radio_remote_cfg_auth_type.getCheckedVal()

        if (remote_cfg_use_auth) {
            this.#div_auth_options.show()
            if (remote_cfg_auth_type === undefined) {
                this.#radio_remote_cfg_auth_type_basic.setChecked()
                remote_cfg_auth_type = this.#radio_remote_cfg_auth_type.getCheckedVal()
            }
            if (remote_cfg_auth_type === 'remote_cfg_auth_type_bearer') {
                this.#div_auth_bearer_options.show()
                this.#div_auth_basic_options.hide()
            } else {
                this.#div_auth_bearer_options.hide()
                this.#div_auth_basic_options.show()
            }
        } else {
            this.#div_auth_options.hide()
        }

        let flag_valid_url = true
        let flag_valid_user = true
        let flag_valid_pass = true
        let flag_valid_token = true
        if (remote_cfg_use && this.#input_base_url.getVal() === '') {
            flag_valid_url = false
        }
        if (remote_cfg_use_auth) {
            if (remote_cfg_auth_type === 'remote_cfg_auth_type_bearer') {
                if (!this.#input_auth_bearer_token.is_saved() && this.#input_auth_bearer_token.getVal() === '') {
                    flag_valid_token = false
                }
            } else {
                if (this.#input_auth_basic_user.getVal() === '') {
                    flag_valid_user = false
                }

                if (!this.#input_auth_basic_pass.is_saved() && this.#input_auth_basic_pass.getVal() === '') {
                    flag_valid_pass = false
                }
            }
        }

        let flag_base_url_modified = false
        let flag_user_pass_modified = false
        let flag_token_modified = false
        if (remote_cfg_use && this.#input_base_url.isValidationRequired()) {
            flag_base_url_modified = true
        }
        if (remote_cfg_use && remote_cfg_use_auth &&
            (this.#input_auth_basic_user.isValidationRequired() || this.#input_auth_basic_pass.isValidationRequired())) {
            flag_user_pass_modified = true
        }
        if (remote_cfg_use && remote_cfg_use_auth && this.#input_auth_bearer_token.isValidationRequired()) {
            flag_token_modified = true
        }

        if (flag_base_url_modified || this.#input_base_url.isInvalid() ||
            flag_user_pass_modified || this.#input_auth_basic_user.isInvalid() || this.#input_auth_basic_pass.isInvalid() ||
            flag_token_modified || this.#input_auth_bearer_token.isInvalid() ||
            !flag_valid_url || !flag_valid_user || !flag_valid_pass || !flag_valid_token) {

            this.#button_download.hide()
            this.#button_check.show()

            if (!flag_valid_url || !flag_valid_user || !flag_valid_pass || !flag_valid_token) {
                this.#button_check.disable()
                if (!flag_valid_url) {
                    this.#input_base_url.setInvalid()
                }
                if (!flag_valid_user) {
                    this.#input_auth_basic_user.setInvalid()
                }
                if (!flag_valid_pass) {
                    this.#input_auth_basic_pass.setInvalid()
                }
                if (!flag_valid_token) {
                    this.#input_auth_bearer_token.setInvalid()
                }
            } else {
                this.#button_check.enable()
            }
        } else {
            this.#button_check.hide()
            this.#button_download.show()
            this.#button_download.enable()
        }
    }
}

export default PageRemoteCfg

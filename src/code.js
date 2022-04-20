// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

const WIFI_USE_SAVED_PASSWORD = "\xff\xff\xff\xff\xff\xff\xff\xff";

let apList = null;
let selectedSSID = "";
let connectedSSID = "";
let flagUseSavedWiFiPassword = false;
let flagUseSavedHTTPPassword = false;
let flagUseSavedRemoteCfgAuthBasicPassword = false;
let flagUseSavedHTTPStatPassword = false;
let flagUseSavedMQTTPassword = false;
let g_flagAccessFromLAN = false;
let g_refreshAPActive = false;
let g_refreshAPTimer = null;
let g_refreshAPInProgress = false;
let g_checkStatusActive = false;
let g_checkStatusTimer = null;
let g_checkStatusInProgress = false;
let firmwareUpdatingBaseURL = 'https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/';
let flagLatestFirmwareVersionSupported = false;
let counterStatusJsonTimeout = 0;
let flagWaitingNetworkConnection = false;
let flagNetworkConnected = false;
let g_page_ethernet_connection_timer = null;
let g_current_page = null;

const CONNECTION_STATE = {
    NOT_CONNECTED: "NOT_CONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    FAILED: "FAILED",
};

const URC_CODE = {
    CONNECTED: 0,
    FAILED: 1,
    DISCONNECTED: 2,
    LOST_CONNECTION: 3,
};

let connectionState = CONNECTION_STATE.NOT_CONNECTED;

function startCheckStatus(timeout = 0) {
    if (g_checkStatusTimer !== null) {
        console.log('Warning: startCheckStatus is called while the previous timer is not stopped');
        stopCheckStatus();
    }
    g_checkStatusActive = true;
    g_checkStatusTimer = setTimeout(checkStatus, timeout);
}

function stopCheckStatus() {
    if (g_checkStatusTimer != null) {
        clearTimeout(g_checkStatusTimer);
        g_checkStatusTimer = null;
    }
    g_checkStatusActive = false;
}

function startRefreshAP(timeout = 0) {
    if (g_refreshAPTimer !== null) {
        console.log('Warning: startRefreshAP is called while the previous timer is not stopped');
        stopRefreshAP();
    }
    if (!g_refreshAPActive) {
        console.log("Start refreshing Wi-Fi APs");
    }
    g_refreshAPActive = true;
    g_refreshAPTimer = setTimeout(refreshAP, timeout);
}

function stopRefreshAP() {
    console.log("Stop refreshing Wi-Fi APs");
    if (g_refreshAPTimer != null) {
        clearTimeout(g_refreshAPTimer);
        g_refreshAPTimer = null;
    }
    g_refreshAPActive = false;
}

// Navigation
function change_url(url) {
    if (window.location.hash === ('#' + url)) {
        return;
    }
    window.location.hash = url;
}

function on_network_connected_wifi() {
    $("#connected-eth").hide()
    $("#connected-wifi").show()
}

function on_network_connected_eth() {
    $("#connected-wifi").hide()
    $("#connected-eth").show()
}

function change_page_to_network_type() {
    change_url('page-network_type');
}

function change_page_to_wifi_connection() {
    change_url('page-wifi_connection');
}

function change_page_to_ethernet_connection() {
    change_url('page-ethernet_connection');
}

function change_page_to_software_update() {
    $('body').removeClass('is-loading');
    change_url('page-software_update');
}

function change_page_to_remote_cfg() {
    change_url('page-remote_cfg');
}

function change_page_to_update_schedule() {
    change_url('page-update_schedule');
}

function change_url_software_update_progress() {
    change_url('page-software_update_progress');
}

function change_page_to_settings_lan_auth() {
    change_url('page-settings_lan_auth');
}

function change_url_cloud_options() {
    change_url('page-cloud_options');
}

function change_url_custom_server() {
    change_url('page-custom_server');
}

function change_url_scanning() {
    change_url('page-scanning');
}

function change_page_to_finished(num_steps) {
    let h = "";
    h += '<ul class="progressbar">';
    for (let i = 0; i < num_steps; ++i) {
        h += '<li class="active"></li>';
    }
    h += '</ul>';
    $('section#page-finished div.progressbar-container').html(h);
    change_url('page-finished');
}

function on_show_software_update() {
    $("#software_update-button-upgrade").addClass("disable-click");
    $('.software_update-status').hide();
    $("#page-software_update-in_progress").show();

    $("#software_update-status-ok-already_latest").addClass('hidden');
    $("#software_update-status-ok-latest_not_supported").addClass('hidden');
    $("#software_update-status-ok-update_available").addClass('hidden');
    $("#software_update-status-error").addClass('hidden');

    $("#page-software_update-advanced-button").addClass("disable-click");

    $('body').addClass('is-loading');
    $.getJSON("/github_latest_release.json", function (data) {
        let latest_release_version = data.tag_name;
        let m = latest_release_version.match(/v(\d+)\.(\d+)\.(\d+)/);
        flagLatestFirmwareVersionSupported = false;
        if (m) {
            let latest_release_version_bin = (parseInt(m[1]) << 16) + (parseInt(m[2]) << 8) + parseInt(m[3]);
            if (latest_release_version_bin >= 0x00010304) {
                flagLatestFirmwareVersionSupported = true;
            }
        }

        $('#page-software_update-in_progress').hide();
        $('#software_update-version-latest').text(latest_release_version);
        $('#page-software_update-latest_fw_ver').show();

        let software_update_url = firmwareUpdatingBaseURL + latest_release_version;
        $("#software_update-url").val(software_update_url);

        $("#page-software_update-advanced-button").removeClass("disable-click");

        let current_version = $("#software_update-version-current").text();

        $('.software_update-status').hide();
        if (!flagLatestFirmwareVersionSupported) {
            $("#software_update-status-ok-latest_not_supported").show();
        } else {
            if (current_version === latest_release_version) {
                $("#software_update-status-ok-already_latest").show();
            } else {
                $("#software_update-status-ok-update_available").show();
                $("#software_update-button-upgrade").removeClass("disable-click");
            }
        }
        $('body').removeClass('is-loading');
    }).fail(function ($xhr) {
        $('#page-software_update-in_progress').hide();
        $("#page-software_update-advanced-button").removeClass("disable-click");
        let data = $xhr.responseJSON;
        $('.software_update-status').hide();
        $("#software_update-status-error").show();
        $('body').removeClass('is-loading');
    });
}

function on_remote_cfg_changed() {
    let h = "";
    h += '<ul class="progressbar">';
    if ($('#remote_cfg-use').prop('checked')) {
        $('#remote_cfg-options').removeClass('hidden');
        for (let i = 0; i < 4; ++i) {
            h += '<li class="active"></li>';
        }
        for (let i = 4; i < 5; ++i) {
            h += '<li></li>';
        }
        $("#remote_cfg-button-download").removeClass("hidden");
        $("#page-remote_cfg-button-continue").addClass("disable-click");
    } else {
        $('#remote_cfg-options').addClass('hidden');
        for (let i = 0; i < 4; ++i) {
            h += '<li class="active"></li>';
        }
        for (let i = 4; i < 8; ++i) {
            h += '<li></li>';
        }
        $("#page-remote_cfg-button-continue").removeClass("disable-click");
        $("#remote_cfg-button-download").addClass("hidden");
    }
    h += '</ul>';
    h += '\n';
    $('section#page-remote_cfg div.progressbar-container').html(h);

    let remote_cfg_auth_type = $("input[name='remote_cfg_auth_type']:checked").val();
    if ($('#remote_cfg-use_auth').prop('checked')) {
        $('#conf-remote_cfg-auth-options').removeClass('hidden');
        if (remote_cfg_auth_type === undefined) {
            $(`input:radio[name='remote_cfg_auth_type'][value='remote_cfg_auth_type_basic']`).prop('checked', true);
            remote_cfg_auth_type = $("input[name='remote_cfg_auth_type']:checked").val();
        }
        if (remote_cfg_auth_type === "remote_cfg_auth_type_bearer") {
            $('#conf-remote_cfg-auth_bearer-options').removeClass('hidden');
            $('#conf-remote_cfg-auth_basic-options').addClass('hidden');
        } else {
            $('#conf-remote_cfg-auth_basic-options').removeClass('hidden');
            $('#conf-remote_cfg-auth_bearer-options').addClass('hidden');
        }
    } else {
        $('#conf-remote_cfg-auth-options').addClass('hidden');
    }
    let remote_cfg_base_url = $("#remote_cfg-base_url");
    let base_url = remote_cfg_base_url.val();
    let full_url = "";

    let flag_valid = true;
    if (base_url !== "") {
        let gw_cfg_json_name = "gw_cfg.json";
        if (base_url.endsWith(gw_cfg_json_name)) {
            base_url = base_url.slice(0, -1 * gw_cfg_json_name.length);
        }
        full_url = ''
        if (!base_url.startsWith("http://") && !base_url.startsWith("https://")) {
            full_url += "http://";
        }
        full_url += base_url;
        if (!full_url.endsWith("/")) {
            full_url += "/";
        }
        full_url += gw_cfg_json_name
    } else {
        flag_valid = false;
    }
    if ($('#remote_cfg-use_auth').prop('checked')) {
        if (remote_cfg_auth_type === "remote_cfg_auth_type_bearer") {
            if ($('#remote_cfg-auth_bearer-token').val() === "") {
                flag_valid = false;
            }
        } else {
            if (($('#remote_cfg-auth_basic-user').val() === "") || ($('#remote_cfg-auth_basic-password').val() === "")) {
                flag_valid = false;
            }
        }
    }
    if (remote_cfg_base_url.val() !== base_url) {
        remote_cfg_base_url.val(base_url);
    }
    $("#remote_cfg-url").text(full_url);
    if (flag_valid) {
        $("#remote_cfg-button-download").removeClass("disable-click");
    } else {
        $("#remote_cfg-button-download").addClass("disable-click");
    }
}

function on_custom_connection_type_changed() {
    if ($("#use_http")[0].checked) {
        $('#conf-settings-http').removeClass('hidden');
    } else {
        $('#conf-settings-http').addClass('hidden');
    }
    if ($("#use_mqtt")[0].checked) {
        $('#conf-settings-mqtt').removeClass('hidden');
    } else {
        $('#conf-settings-mqtt').addClass('hidden');
    }
}

function on_lan_auth_type_changed() {
    let lan_auth_type = $("input[name='lan_auth_type']:checked").val();
    if (lan_auth_type === undefined) {
        $(`input:radio[name='lan_auth_type'][value='lan_auth_deny']`).prop('checked', true);
        lan_auth_type = $("input[name='lan_auth_type']:checked").val();
    }
    switch (lan_auth_type)
    {
        case LAN_AUTH_TYPE.ALLOW:
        case LAN_AUTH_TYPE.DENY:
            $('#conf-lan_auth-login-password').slideUp();
            $('#conf-lan_auth-default').slideUp();
            break;
        case LAN_AUTH_TYPE.DEFAULT:
            $('#conf-lan_auth-login-password').slideUp();
            $('#conf-lan_auth-default').slideDown();
            break;
        case LAN_AUTH_TYPE.RUUVI:
        case LAN_AUTH_TYPE.BASIC:
        case LAN_AUTH_TYPE.DIGEST:
            $('#conf-lan_auth-default').slideUp();
            $('#conf-lan_auth-login-password').slideDown();
            break;
    }
    on_lan_auth_user_pass_changed();
}

function on_lan_auth_user_pass_changed() {
    let lan_auth_type = $("input[name='lan_auth_type']:checked").val();
    let flag_need_to_disable = false;
    if (lan_auth_type !== LAN_AUTH_TYPE.ALLOW && lan_auth_type !== LAN_AUTH_TYPE.DENY &&
        lan_auth_type !== LAN_AUTH_TYPE.DEFAULT) {
        if ($("#lan_auth-user").val() === "" || ($("#lan_auth-pass").val() === "" && g_flag_lan_auth_pass_changed)) {
            flag_need_to_disable = true;
        }
    }
    if ($('#settings_lan_auth-use_api_key')[0].checked) {
        if ($("#lan_auth-api_key").val() === '') {
            flag_need_to_disable = true;
        }
    }
    if (flag_need_to_disable) {
        $("#page-lan_auth_type-button-continue").addClass("disable-click");
    } else {
        $("#page-lan_auth_type-button-continue").removeClass("disable-click");
    }
}

function on_cloud_options_connection_type_changed() {
    let connection_type = $("input[name='connection_type']:checked").val();
    let h = "";
    h += '<ul class="progressbar">';
    if (connection_type === 'ruuvi') {
        for (let i = 0; i < 7; ++i) {
            h += '<li class="active"></li>';
        }
        h += '<li></li>';
        $('#use_http').prop('checked', true);
        $('#http_url').val(HTTP_URL_DEFAULT);
        $('#http_user').val("");
        $('#http_pass').val("");
        $('#use_http_stat').prop('checked', true);
        $('#http_stat_url').val(HTTP_STAT_URL_DEFAULT);
        $('#http_stat_user').val("");
        $('#http_stat_pass').val("");
        $('#use_mqtt').prop('checked', false);
        $(`input:radio[name='company_use_filtering'][value='1']`).prop('checked', true);
        on_settings_scan_filtering_changed();
    } else {
        for (let i = 0; i < 7; ++i) {
            h += '<li class="active"></li>';
        }
        for (let i = 7; i < 10; ++i) {
            h += '<li></li>';
        }
    }
    h += '</ul>';
    h += '\n';
    $('section#page-cloud_options div.progressbar-container').html(h);
}

function on_settings_scan_filtering_changed() {
    let filtering = $("input[name='company_use_filtering']:checked").val();
    if (filtering === "0") {
        $('#page-scanning-all_nearby_beacons-scanning_options').slideDown();
    } else if (filtering === "1") {
        $('#page-scanning-all_nearby_beacons-scanning_options').slideUp();
        $("#scan_coded_phy")[0].checked = false;
        $("#scan_1mbit_phy")[0].checked = true;
        $("#scan_extended_payload")[0].checked = true;
        $("#scan_channel_37")[0].checked = true;
        $("#scan_channel_38")[0].checked = true;
        $("#scan_channel_39")[0].checked = true;
    } else if (filtering === "2") {
        $('#page-scanning-all_nearby_beacons-scanning_options').slideUp();
        $("#scan_coded_phy")[0].checked = true;
        $("#scan_1mbit_phy")[0].checked = true;
        $("#scan_extended_payload")[0].checked = true;
        $("#scan_channel_37")[0].checked = true;
        $("#scan_channel_38")[0].checked = true;
        $("#scan_channel_39")[0].checked = true;
    }
}

function checkWiFiSSIDAndPassword() {
    let ssid = $('#manual_ssid').val();
    let pwd = $('#pwd').val();
    let selected_wifi_radio_button = $('input[name="wifi-name"]:checked');
    if (!selected_wifi_radio_button || !selected_wifi_radio_button[0]) {
        return false;
    }
    if (!ssid) {
        return false;
    }
    if (selected_wifi_radio_button[0].id === "page-wifi_connection-radio-connect_manually") {
        return true;
    } else {
        if (flagUseSavedWiFiPassword && pwd === WIFI_USE_SAVED_PASSWORD) {
            return true;
        }
        if (selected_wifi_radio_button.hasClass('no_auth')) {
            return true;
        } else {
            if (pwd.length >= 8) {
                return true;
            }
        }
    }
}

function checkAndUpdatePageWiFiListButtonNext() {
    if (flagWaitingNetworkConnection) {
        return;
    }
    if (checkWiFiSSIDAndPassword()) {
        $('#page-wifi_connection-button-continue').removeClass("disable-click");
    } else {
        $('#page-wifi_connection-button-continue').addClass("disable-click");
    }
}

function on_auto_update_cycle_changed() {
    let auto_update_cycle = $("input[name='auto_update_cycle']:checked").val();
    if (auto_update_cycle === undefined) {
        $(`input:radio[name='auto_update_cycle'][value='auto_update_cycle-regular']`).prop('checked', true);
        auto_update_cycle = $("input[name='auto_update_cycle']:checked").val();
    }
    if (auto_update_cycle === 'auto_update_cycle-regular') {
        $('#conf-auto_update_schedule').slideDown();
    } else if (auto_update_cycle === 'auto_update_cycle-beta') {
        $('#conf-auto_update_schedule').slideDown();
    } else if (auto_update_cycle === 'auto_update_cycle-manual') {
        $('#conf-auto_update_schedule').slideUp();
    }
}

function on_edit_automatic_update_settings() {
    let auto_update_cycle = $("input[name='auto_update_cycle']:checked").val();
    if (auto_update_cycle === 'auto_update_cycle-manual') {
        $("#page-update_schedule-button-continue").removeClass("disable-click");
    } else {
        let flag_button_continue_enabled = true;
        let auto_update_weekdays_bitmask = 0;
        if ($('#conf-auto_update_schedule-button-monday').is(":checked")) {
            auto_update_weekdays_bitmask |= 0x01;
        }
        if ($('#conf-auto_update_schedule-button-tuesday').is(":checked")) {
            auto_update_weekdays_bitmask |= 0x02;
        }
        if ($('#conf-auto_update_schedule-button-wednesday').is(":checked")) {
            auto_update_weekdays_bitmask |= 0x04;
        }
        if ($('#conf-auto_update_schedule-button-thursday').is(":checked")) {
            auto_update_weekdays_bitmask |= 0x08;
        }
        if ($('#conf-auto_update_schedule-button-friday').is(":checked")) {
            auto_update_weekdays_bitmask |= 0x10;
        }
        if ($('#conf-auto_update_schedule-button-saturday').is(":checked")) {
            auto_update_weekdays_bitmask |= 0x20;
        }
        if ($('#conf-auto_update_schedule-button-sunday').is(":checked")) {
            auto_update_weekdays_bitmask |= 0x40;
        }

        if (auto_update_weekdays_bitmask === 0) {
            flag_button_continue_enabled = false;
        }

        if (flag_button_continue_enabled) {
            $("#page-update_schedule-button-continue").removeClass("disable-click");
        } else {
            $("#page-update_schedule-button-continue").addClass("disable-click");
        }
    }
}


$(document).ready(function () {
    window.onpopstate = function (event) {
        console.log("window.onpopstate: " + document.location.hash);
        let url = window.location.hash.substring(1);
        if (g_current_page) {
            $(g_current_page).hide();
            $(g_current_page).trigger('onHide');
        }
        g_current_page = '#' + url;
        $(g_current_page).show();
        $(g_current_page).trigger('onShow');

        setTimeout(function() {
            window.scrollTo(0, 0);
        }, 1);


        if (document.location.hash === "#page-finished") {
            // Prevent the user from leaving this page by pressing the Back button
            window.history.pushState(null, "", "#page-finished");
        }
    };

    $(document).keyup(function (e) {
        // Use jquery's constants rather than an unintuitive magic number.
        // $.ui.keyCode.DELETE is also available. <- See how constants are better than '46'?
        if (e.keyCode === 8 || e.keyCode === 46) {

            // Filters out events coming from any of the following tags so Backspace
            // will work when typing text, but not take the page back otherwise.
            let rx = /INPUT|SELECT|TEXTAREA/i;
            if (rx.test(e.target.tagName)) {
                if (e.target.id === 'lan_auth-user' || e.target.id === 'lan_auth-pass') {
                    g_flag_lan_auth_pass_changed = true;
                    $("#lan_auth-pass").removeAttr('placeholder');
                    on_lan_auth_user_pass_changed();
                }
                if (e.target.id === 'lan_auth-api_key') {
                    on_lan_auth_user_pass_changed();
                }
            }

            // Add your code here.
        }
    });

    window.addEventListener('online', function (event) {
        console.log('Became online, is_online=' + window.navigator.onLine);
    }, false);

    window.addEventListener('offline', function (event) {
        console.log('Became offline, is_online=' + window.navigator.onLine);
    }, false);

    // Set initial hash to help back button navigation
    window.location.hash = 'page-welcome';

    // ==== page-welcome ===============================================================================================
    $('section#page-welcome').bind('onShow', function () {
        console.log("section#page-welcome: onShow");
        let progressbar = $('#progressbar');
        progressbar.css('top', $('section#page-welcome div.progressbar-container').position().top);
        progressbar.show();
    });

    $('section#page-welcome').bind('onHide', function () {
        console.log("section#page-welcome: onHide");
    });

    $('#page-welcome-button-get-started').click(function (e) {
        e.preventDefault();
        change_page_to_network_type();
    });

    // ==== page-network_type ==========================================================================================
    $('section#page-network_type').bind('onShow', function () {
        console.log("section#page-network_type: onShow");
        if (g_flagAccessFromLAN) {
            $('section#page-network_type input[type=radio][name=network_type]').prop('disabled', true);
            $('#page-network_type-access_from_lan').show();
            $('#page-network_type-button-continue').hide();
            $('#page-network_type-button-skip').show();
        } else {
            $('section#page-network_type input[type=radio][name=network_type]').prop('disabled', false);
            $('#page-network_type-access_from_lan').hide();
            $('#page-network_type-button-skip').hide();
            $('#page-network_type-button-continue').show();
        }
    });

    $('section#page-network_type').bind('onHide', function () {
        console.log("section#page-network_type: onHide");
    });

    $('section#page-network_type #page-network_type-button-continue').click(function (e) {
        e.preventDefault();
        let network_type = $("input[name='network_type']:checked").val();
        if (network_type === 'wifi') {
            change_page_to_wifi_connection();
        } else {
            change_page_to_ethernet_connection();
        }
    });

    $('section#page-network_type #page-network_type-button-skip').click(function (e) {
        e.preventDefault();
        change_page_to_software_update();
    });

    // ==== page-ethernet_connection ===================================================================================
    $('section#page-ethernet_connection').bind('onShow', function () {
        if (!$('#eth_dhcp')[0].checked) {
            $('#page-ethernet_connection-section-manual_settings').slideDown();
        }
        networkDisconnect();
    });

    $('section#page-ethernet_connection').bind('onHide', function () {
        $('#page-ethernet_connection-ask_user').hide();
        $('#page-ethernet_connection-no_cable').hide();
        $('#page-ethernet_connection-button-continue').removeClass("disable-click");
        if (g_page_ethernet_connection_timer) {
            clearTimeout(g_page_ethernet_connection_timer);
            g_page_ethernet_connection_timer = null;
        }
    });

    $('section#page-ethernet_connection #eth_dhcp').change(function (e) {
        if ($('#eth_dhcp')[0].checked) {
            $('#page-ethernet_connection-section-manual_settings').slideUp();
        } else {
            $('#page-ethernet_connection-section-manual_settings').slideDown();
        }
    });

    $('section#page-ethernet_connection #page-ethernet_connection-button-continue').click(function (e) {
        e.preventDefault();
        $('#page-ethernet_connection-ask_user').show();
        $('#page-ethernet_connection-button-continue').addClass("disable-click");
        $('body').addClass('is-loading');
        flagWaitingNetworkConnection = true;
        g_page_ethernet_connection_timer = setTimeout(function () {
            g_page_ethernet_connection_timer = null;
            if (document.location.hash === "#page-ethernet_connection") {
                let body = $('body');
                if (body.hasClass('is-loading')) {
                    $('#page-ethernet_connection-ask_user').hide();
                    $('#page-ethernet_connection-no_cable').show();
                    body.removeClass('is-loading');
                }
            }
        }, 15 * 1000);
        save_network_config(
            function () {
                networkConnect(null, null);
            },
            function () {
                $('body').removeClass('is-loading');
                startCheckStatus();
            });
    });

    $('section#page-ethernet_connection #page-ethernet_connection-button-back').click(function (e) {
        e.preventDefault();
    });

    // ==== page-wifi_connection =======================================================================================
    $('section#page-wifi_connection').bind('onShow', function () {
        $('body').addClass('is-loading');
        checkAndUpdatePageWiFiListButtonNext();
        flagUseSavedWiFiPassword = true;
        $('#page-wifi_connection-ssid_password').hide();
        networkDisconnect();
        startRefreshAP();
    });

    $('section#page-wifi_connection').bind('onHide', function () {
        $('#page-wifi_connection-button-continue').removeClass("disable-click");
        $('#page-wifi_connection-ssid_password').hide();
        $("#page-wifi_connection-list_of_ssid").html("");
        stopRefreshAP();
    });

    $('section#page-wifi_connection input#manual_ssid').on('keyup click', function () {
        $('#wifi-connection-status-block').hide();
        updatePositionOfWiFiPasswordInput();
        checkAndUpdatePageWiFiListButtonNext();
    });

    $('section#page-wifi_connection input#pwd').on('keyup click', function () {
        $('#wifi-connection-status-block').hide();
        updatePositionOfWiFiPasswordInput();
        checkAndUpdatePageWiFiListButtonNext();
    });

    $('section#page-wifi_connection input#wifi-show-password').click(function (e) {
        let pwd = $('#pwd');
        if (flagUseSavedWiFiPassword) {
            flagUseSavedWiFiPassword = false;
            pwd.val("");
        }
        if (pwd.prop("type") === "password") {
            pwd.prop("type", "text");
        } else {
            pwd.prop("type", "password");
        }
    });

    $('section#page-wifi_connection input#page-wifi_connection-radio-connect_manually').change(function (e) {
        $('.wifi_password').css('height', 0);
        $('#input_ssid_block').show();
        $('#input_password_block').show();
        $('#input_password_block-password').show();
        $('#wifi-connection-status-block').hide();
        let div_page_wifi_list_ssid_password = $('#page-wifi_connection-ssid_password');
        let div_ssid_password_wrap = $('#page-wifi_connection-ssid_password-wrap');
        let wifi_password_position = div_ssid_password_wrap.position();
        div_ssid_password_wrap.css('height', div_page_wifi_list_ssid_password.height());
        div_page_wifi_list_ssid_password.css('top', wifi_password_position.top);
        div_page_wifi_list_ssid_password.show();
        $('#manual_ssid').val("");
        $('#pwd').val("");
        updatePositionOfWiFiPasswordInput();
        checkAndUpdatePageWiFiListButtonNext();
    });

    $('#page-wifi_connection-advanced-button').click(function (e) {
        if ($(this).children('div.btn-dropdown-arrow-down').is(":hidden")) {
            $('section#page-wifi_connection input[type="radio"][name="wifi-name"]').prop('checked', false);
            $('#page-wifi_connection-ssid_password').hide();
        }
    });

    $('section#page-wifi_connection #page-wifi_connection-button-continue').click(function (e) {
        e.preventDefault();
        let selected_wifi_radio_button = $('input[name="wifi-name"]:checked');
        let ssid = "";
        let isAuthNeeded = true;
        if (selected_wifi_radio_button[0] && (selected_wifi_radio_button[0].id === "page-wifi_connection-radio-connect_manually")) {
            ssid = $('#manual_ssid').val();
        } else {
            ssid = selected_wifi_radio_button.val();
            isAuthNeeded = !selected_wifi_radio_button.hasClass('no_auth');
        }

        let pwd = $('#pwd').val();
        let password = ((flagUseSavedWiFiPassword && pwd === WIFI_USE_SAVED_PASSWORD) || !isAuthNeeded) ? null : pwd;
        $('#page-wifi_connection-button-continue').addClass('disable-click');
        $('body').addClass('is-loading');
        $("#wifi-connection-status-block").hide();
        updatePositionOfWiFiPasswordInput();
        flagWaitingNetworkConnection = true;
        save_network_config(
            function () {
                networkConnect(ssid, password);
            },
            function () {
                flagWaitingNetworkConnection = false;
                $("#wifi-connection-status-block").show();
                updatePositionOfWiFiPasswordInput();
                $('body').removeClass('is-loading');
                $('#page-wifi_connection-button-continue').removeClass("disable-click");
                startCheckStatus();
                startRefreshAP();
            }
        );
    });

    $('#page-wifi_connection-button-back').click(function (e) {
        e.preventDefault();
    });

    // ==== page-software_update =======================================================================================
    $('section#page-software_update').bind('onShow', function () {
        $('#page-software_update-latest_fw_ver').hide();
        on_show_software_update();
    });

    $('section#page-software_update').bind('onHide', function () {
        console.log("section#page-software_update: onHide");
    });

    $('section#page-software_update #software_update-button-upgrade').click(function (e) {
        e.preventDefault();
        let software_update_url = $("#software_update-url").val();
        $.ajax({
                method: 'POST',
                url: '/fw_update.json',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                cache: false,
                data: JSON.stringify({'url': software_update_url}),
                success: function (data, text) {
                    change_url_software_update_progress();
                },
                error: function (request, status, error) {
                    // ('HTTP error: ' + status + ', ' + 'Status: ' + request.status + '(' + request.statusText + ')' + ', ' + request.responseText);
                }
            }
        );
    });

    $('section#page-software_update #software_update-set-url-manually').change(function (e) {
        if ($('#software_update-set-url-manually')[0].checked) {
            $('#page-software_update-version_info').hide();
            $('#page-software_update-status').hide();
            $('#software_update-url').show();
            $("#software_update-button-upgrade").removeClass("disable-click");
            $("#page-software_update-button-continue").addClass("disable-click");
        } else {
            $('#software_update-url').hide();
            $('#page-software_update-version_info').show();
            $('#page-software_update-status').show();
            $("#page-software_update-button-continue").removeClass("disable-click");
            if (!flagLatestFirmwareVersionSupported) {
                $("#software_update-button-upgrade").addClass("disable-click");
            }
        }
    });

    $('section#page-software_update #page-software_update-button-continue').click(function (e) {
        e.preventDefault();
        change_page_to_remote_cfg();
    });

    $('section#page-software_update #page-software_update-button-back').click(function (e) {
        e.preventDefault();
    });

    // ==== page-software_update_progress ==============================================================================

    $('section#page-software_update_progress').bind('onShow', function () {
    });

    // ==== page-remote_cfg ============================================================================================
    $('section#page-remote_cfg').bind('onShow', function () {
        $("#remote_cfg-base_url").val($("#remote_cfg-url").text());
        on_remote_cfg_changed();
    });

    $('#remote_cfg-base_url').on("input", function () {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-base_url').change(function () {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-auth_basic-user').on("input", function () {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-auth_basic-user').change(function () {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-auth_bearer-token').on("input", function () {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-auth_bearer-token').change(function () {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-auth_basic-password').on("input", function () {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-auth_basic-password').change(function () {
        on_remote_cfg_changed();
    });

    $("section#page-remote_cfg input#remote_cfg-use").change(function (e) {
        on_remote_cfg_changed();
    });

    $("section#page-remote_cfg input#remote_cfg-use_auth").change(function (e) {
        on_remote_cfg_changed();
    });

    $("section#page-remote_cfg input#remote_cfg_auth_type_basic").change(function (e) {
        on_remote_cfg_changed();
    });

    $("section#page-remote_cfg input#remote_cfg_auth_type_bearer").change(function (e) {
        on_remote_cfg_changed();
    });

    $('#remote_cfg-auth_basic-password').on("focus", function () {
        if (flagUseSavedRemoteCfgAuthBasicPassword) {
            flagUseSavedRemoteCfgAuthBasicPassword = false;
            $('#remote_cfg-auth_basic-password').val("");
            on_remote_cfg_changed();
        }
    });

    $('section#page-remote_cfg #page-remote_cfg-button-continue').click(function (e) {
        e.preventDefault();
        change_page_to_update_schedule();
    });

    $('section#page-remote_cfg #remote_cfg-button-download').click(function (e) {
        e.preventDefault();
        $('#page-remote_cfg-status').addClass('hidden');
        save_config();
        $.ajax({
                method: 'POST',
                url: '/gw_cfg_download',
                dataType: 'text',
                contentType: "application/json; charset=utf-8",
                cache: false,
                success: function (data, text) {
                    change_page_to_finished(5);
                },
                error: function (request, status, error) {
                    let desc = 'Status: ' + request.status + ' (' + request.statusText + ')';
                    if (request.responseText) {
                        desc += "\nResponse: " + request.responseText;
                    }
                    $('#page-remote_cfg-status-error-desc').text(desc);
                    $('#page-remote_cfg-status-error').removeClass('hidden');
                }
            }
        );
    });

    // ==== page-update_schedule =======================================================================================
    $('section#page-update_schedule').bind('onShow', function () {
        $('#page-update_schedule div.btn-dropdown-arrow-up').hide();
        $('#page-update_schedule div.btn-dropdown-arrow-down').show();
        let auto_update_cycle = $("input[name='auto_update_cycle']:checked").val();
        if (auto_update_cycle !== 'auto_update_cycle-regular' ||
            !$("#conf-auto_update_schedule-button-sunday").prop('checked') ||
            !$("#conf-auto_update_schedule-button-monday").prop('checked') ||
            !$("#conf-auto_update_schedule-button-tuesday").prop('checked') ||
            !$("#conf-auto_update_schedule-button-wednesday").prop('checked') ||
            !$("#conf-auto_update_schedule-button-thursday").prop('checked') ||
            !$("#conf-auto_update_schedule-button-friday").prop('checked') ||
            !$("#conf-auto_update_schedule-button-saturday").prop('checked') ||
            $("#conf-auto_update_schedule-period_from").val() !== '0' ||
            $("#conf-auto_update_schedule-period_to").val() !== '24') {
            dropdownShow('#page-update_schedule-advanced-dropdown');
        } else {
            dropdownHide('#page-update_schedule-advanced-dropdown');
        }
        on_auto_update_cycle_changed();
        on_edit_automatic_update_settings();
    });

    $("section#page-update_schedule input[name='auto_update_cycle']").change(function (e) {
        on_auto_update_cycle_changed();
        on_edit_automatic_update_settings();
    });

    $('section#page-update_schedule .checkbox-weekday').change(function () {
        on_edit_automatic_update_settings();
    });

    $('#conf-auto_update_schedule-period_from').change(function () {
        let auto_update_interval_from = parseInt($("#conf-auto_update_schedule-period_from").val());
        let auto_update_interval_to = parseInt($("#conf-auto_update_schedule-period_to").val());
        if (auto_update_interval_from >= auto_update_interval_to) {
            $("#conf-auto_update_schedule-period_to").val(auto_update_interval_from + 1);
        }
    });

    $('#conf-auto_update_schedule-period_to').change(function () {
        let auto_update_interval_from = parseInt($("#conf-auto_update_schedule-period_from").val());
        let auto_update_interval_to = parseInt($("#conf-auto_update_schedule-period_to").val());
        if (auto_update_interval_from >= auto_update_interval_to) {
            $("#conf-auto_update_schedule-period_from").val(auto_update_interval_to - 1);
        }
    });

    $('#conf-auto_update_schedule-tz').change(function () {
    });

    $('section#page-update_schedule #page-update_schedule-button-continue').click(function (e) {
        e.preventDefault();
        change_page_to_settings_lan_auth();
    });

    // ==== page-settings_lan_auth =====================================================================================
    $('section#page-settings_lan_auth').bind('onShow', function () {
        if ($("#lan_auth-api_key").val() === '') {
            $('#settings_lan_auth-use_api_key').prop('checked', false);
            $('#settings_lan_auth-api_key').hide();
            dropdownHide('#page-settings_lan_auth-advanced-dropdown');
        } else {
            $('#settings_lan_auth-use_api_key').prop('checked', true);
            $('#settings_lan_auth-api_key').show();
            dropdownShow('#page-settings_lan_auth-advanced-dropdown');
        }
        on_lan_auth_type_changed();
    });

    $('section#page-settings_lan_auth #lan_auth-user').on("keyup change", function (e) {
        g_flag_lan_auth_pass_changed = true;
        $("#lan_auth-pass").removeAttr('placeholder');
        on_lan_auth_user_pass_changed();
    });

    $('section#page-settings_lan_auth #lan_auth-pass').on("keyup change", function (e) {
        g_flag_lan_auth_pass_changed = true;
        $("#lan_auth-pass").removeAttr('placeholder');
        on_lan_auth_user_pass_changed();
    });

    $("section#page-settings_lan_auth input[name='lan_auth_type']").change(function (e) {
        g_flag_lan_auth_pass_changed = true;
        on_lan_auth_type_changed();
    });

    $('section#page-settings_lan_auth #page-lan_auth_type-button-continue').click(function (e) {
        e.preventDefault();
        change_url_cloud_options();
    });

    $('section#page-settings_lan_auth #settings_lan_auth-use_api_key').change(function (e) {
        let lan_auth_api_key = $("#lan_auth-api_key");
        if ($('#settings_lan_auth-use_api_key')[0].checked) {
            $('#settings_lan_auth-api_key').show();
            if (lan_auth_api_key.val() === "") {
                lan_auth_api_key.val(CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(CryptoJS.lib.WordArray.random(32))));
            }
        } else {
            $('#settings_lan_auth-api_key').hide();
            lan_auth_api_key.val('');
        }
        on_lan_auth_user_pass_changed();
    });

    $('section#page-settings_lan_auth #lan_auth-api_key').on("input", function () {
        on_lan_auth_user_pass_changed();
    });

    // ==== page-cloud_options =========================================================================================
    $('section#page-cloud_options').bind('onShow', function () {
        $('#page-cloud_options div.btn-dropdown-arrow-up').hide();
        $('#page-cloud_options div.btn-dropdown-arrow-down').show();
        let connection_type = $("input[name='connection_type']:checked").val();
        if (connection_type !== 'ruuvi') {
            dropdownShow('#page-cloud_options-advanced-dropdown');
        } else {
            dropdownHide('#page-cloud_options-advanced-dropdown');
        }
        on_cloud_options_connection_type_changed();
    });

    $('section#page-cloud_options input[type=radio][name=connection_type]').change(function () {
        on_cloud_options_connection_type_changed();
    });

    $('section#page-cloud_options #page-cloud_options-advanced-button').click(function (e) {
        let id = $(this).attr('id');
        let base_id = id.substring(0, id.lastIndexOf('-'));
        let arrow_up_id = '#' + base_id + '-button div.btn-dropdown-arrow-up';
        if (!$(arrow_up_id).is(":hidden")) {
            $('#use_http').prop('checked', true);
            $('#use_mqtt').prop('checked', false);
        }
    });

    $('section#page-cloud_options #page-cloud_options-button-continue').click(function (e) {
        e.preventDefault();
        let connection_type = $("input[name='connection_type']:checked").val();
        if (connection_type === 'ruuvi') {
            save_config();
            change_page_to_finished(8);
        } else {
            change_url_custom_server();
        }
    });


    // ==== page-custom_server =========================================================================================
    $('section#page-custom_server').bind('onShow', function () {
        on_custom_connection_type_changed();
        if ($('#use_mqtt_prefix_custom').prop('checked')) {
            $('#mqtt_prefix_custom').removeClass('hidden');
        } else {
            $('#mqtt_prefix_custom').addClass('hidden');
        }
        if ($("#use_http_stat")[0].checked && $("#http_stat_url").val() !== "https://network.ruuvi.com/status") {
            dropdownShow('#page-custom_server-advanced-button');
        } else {
            dropdownHide('#page-custom_server-advanced-button');
        }
        if ($("#use_http_stat")[0].checked) {
            $('#http_stat_url').prop('disabled', false);
            $('#http_stat_user').prop('disabled', false);
            $('#http_stat_pass').prop('disabled', false);
        } else {
            $('#http_stat_url').prop('disabled', true);
            $('#http_stat_user').prop('disabled', true);
            $('#http_stat_pass').prop('disabled', true);
        }
    });

    $('section#page-custom_server').bind('onHide', function () {
        $("#conf-settings-http").addClass('hidden');
        $("#conf-settings-mqtt").addClass('hidden');
    });

    $("section#page-custom_server input#use_http").change(function (e) {
        on_custom_connection_type_changed();
    });

    $('#http_pass').on("focus", function () {
        if (flagUseSavedHTTPPassword) {
            flagUseSavedHTTPPassword = false;
            $('#http_pass').val("");
        }
    });

    $('#http_stat_pass').on("focus", function () {
        if (flagUseSavedHTTPStatPassword) {
            flagUseSavedHTTPStatPassword = false;
            $('#http_stat_pass').val("");
        }
    });

    $("section#page-custom_server input#use_http_stat").change(function (e) {
        if ($("#use_http_stat")[0].checked) {
            $('#http_stat_url').prop('disabled', false);
            $('#http_stat_user').prop('disabled', false);
            $('#http_stat_pass').prop('disabled', false);
        } else {
            $('#http_stat_url').prop('disabled', true);
            $('#http_stat_user').prop('disabled', true);
            $('#http_stat_pass').prop('disabled', true);
        }
    });

    $("section#page-custom_server input#use_mqtt").change(function (e) {
        on_custom_connection_type_changed();
    });

    $('section#page-custom_server input[type=radio][name=mqtt_transport]').change(function () {
        let mqtt_transport = $("input[name='mqtt_transport']:checked").val();
        let default_port = 1883;
        if (mqtt_transport === "mqtt_transport_TCP") {
            default_port = 1883;
        } else if (mqtt_transport === "mqtt_transport_SSL") {
            default_port = 8883;
        } else if (mqtt_transport === "mqtt_transport_WS") {
            default_port = 8080;
        } else if (mqtt_transport === "mqtt_transport_WSS") {
            default_port = 8081;
        }
        if ($('#mqtt_server').val() === "test.mosquitto.org") {
            $('#mqtt_port').val(default_port);
        }
    });

    $('#mqtt_server').on("input", function () {
        on_edit_mqtt_settings();
    });
    $('#mqtt_port').on("input", function () {
        on_edit_mqtt_settings();
    });
    $('#mqtt_user').on("input", function () {
        on_edit_mqtt_settings();
    });
    $('#mqtt_pass').on("focus", function () {
        if (flagUseSavedMQTTPassword) {
            flagUseSavedMQTTPassword = false;
            $('#mqtt_pass').val("");
        }
    });
    $('#mqtt_pass').on("input", function () {
        on_edit_mqtt_settings();
    });
    $('#use_mqtt_prefix_ruuvi').change(function () {
        on_edit_mqtt_settings();
    });
    $('#use_mqtt_prefix_gw_mac').change(function () {
        on_edit_mqtt_settings();
    });
    $('#use_mqtt_prefix_custom').change(function () {
        if ($('#use_mqtt_prefix_custom').prop('checked')) {
            $('#mqtt_prefix_custom').removeClass('hidden');
        } else {
            $('#mqtt_prefix_custom').addClass('hidden');
        }
        on_edit_mqtt_settings();
    });
    $('#mqtt_prefix_custom').on("input", function () {
        on_edit_mqtt_settings();
    });

    $('#show_mqtt_examples').change(function () {
        if (this.checked) {
            $('#mqtt_examples').slideDown();
        } else {
            $('#mqtt_examples').slideUp();
        }
    });

    $('section#page-custom_server #page-custom_server-button-continue').click(function (e) {
        e.preventDefault();
        change_url_scanning();
    });

    // ==== page-scanning ==============================================================================================
    $('section#page-scanning').bind('onShow', function () {
        $('#page-scanning-advanced-button div.btn-dropdown-arrow-up').hide();
        $('#page-scanning-advanced-button div.btn-dropdown-arrow-down').show();

        let filtering = $("input[name='company_use_filtering']:checked").val();
        if (filtering !== '1') {
            dropdownShow('#page-scanning-advanced-dropdown');
        } else {
            dropdownHide('#page-scanning-advanced-dropdown');
        }
        on_settings_scan_filtering_changed();
    });

    $("section#page-scanning input[name='company_use_filtering']").change(function (e) {
        on_settings_scan_filtering_changed();
    });

    $('section#page-scanning #page-scanning-button-continue').click(function (e) {
        e.preventDefault();
        save_config();
        change_page_to_finished(10);
    });

    // ==== page-finished ==============================================================================================

    $('#page-finished').bind('onShow', function () {
        console.log("onShow: #page-finished");
    });

    // =================================================================================================================

    function dropdownShow(id) {
        let base_id = id.substring(0, id.lastIndexOf('-'));
        let dropdown_id = base_id + '-dropdown';
        $(id).children('div.btn-dropdown-arrow-down').hide();
        $(id).children('div.btn-dropdown-arrow-up').show();
        $(dropdown_id).fadeIn();
    }

    function dropdownHide(id) {
        let base_id = id.substring(0, id.lastIndexOf('-'));
        let dropdown_id = base_id + '-dropdown';
        $(id).children('div.btn-dropdown-arrow-up').hide();
        $(id).children('div.btn-dropdown-arrow-down').show();
        $(dropdown_id).fadeOut();
    }

    function clickOnDropDown(id) {
        if ($(id).children('div.btn-dropdown-arrow-down').is(":hidden")) {
            dropdownHide(id);
        } else {
            dropdownShow(id);
        }
    }

    $('.btn-dropdown').click(function (e) {
        let id = $(this).attr('id');
        clickOnDropDown('#' + id);
    });

    $('.btn-back').click(function (e) {
        e.preventDefault();
        window.history.back();
    });

    // Language switcher
    $(".lang_select").change(function () {
        const lang = $(this).val();
        $("p[lang], span[lang]").each(function () {
            if ($(this).attr("lang") === lang)
                $(this).fadeIn();
            else
                $(this).hide();
            if (lang === 'en') {
                $('input#pwd').attr('placeholder', "Password");
                $('input#mqtt_pass').attr('placeholder', "Password");
                $('input#mqtt_client_id').attr('placeholder', "MAC-address is used if empty");
            } else if (lang === 'fi') {
                $('input#pwd').attr('placeholder', "Salasana");
                $('input#mqtt_pass').attr('placeholder', "Salasana");
                $('input#mqtt_client_id').attr('placeholder', "MAC-osoitetta käytetään, jos se on tyhjä");
            }
        })
    });

    // first time the page loads: attempt get the connection status
    startCheckStatus();
});

// Check if need for auth screen
function selected_wifi_auth_required(ssid) {
    let selectedItem = jQuery.grep(apList, function (item) {
        return (item.ssid === ssid);
    });
    if (selectedItem.length) {
        return (selectedItem[0].auth !== 0);
    }
    return true;
}

function networkConnect(ssid, password) {
    selectedSSID = ssid;
    $(".wifi-network-name").text(ssid);

    stopCheckStatus();

    let stub = ''
    let json_content = JSON.stringify({'ssid': ssid, 'password': password, 'stub':stub});
    if (json_content.length < 240) {
        // Make the length of the message the same, regardless of the length of ssid/password
        stub = ' '.repeat(240 - json_content.length);
        json_content = JSON.stringify({'ssid': ssid, 'password': password, 'stub':stub});
    }
    let json_content_encrypted = ruuvi_edch_encrypt(json_content);

    $.ajax({
            method: 'POST',
            url: '/connect.json',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            cache: false,
            data: json_content_encrypted,
            success: function (data, text) {
                connectionState = CONNECTION_STATE.CONNECTING;
                //now we can re-set the intervals regardless of result
                $('#page-wifi_connection-button-continue').removeClass("disable-click");
                startCheckStatus();
            },
            error: function (request, status, error) {
                $('body').removeClass('is-loading');
                //now we can re-set the intervals regardless of result
                $('#page-wifi_connection-button-continue').removeClass("disable-click");
                startCheckStatus();
                if (ssid != null) {
                    $("#wifi-connection-status-block").show();
                    updatePositionOfWiFiPasswordInput();
                    startRefreshAP();
                }
            }
        }
    );
}

function networkDisconnect() {
    stopRefreshAP();
    stopCheckStatus();
    selectedSSID = "";
    $.ajax({
        url: '/connect.json',
        dataType: 'json',
        method: 'DELETE',
        cache: false,
        data: {'timestamp': Date.now()},
        success: function (data, text) {
            startCheckStatus();
        },
        error: function (request, status, error) {
            startCheckStatus();
        }
    });
}

function rssiToIcon(rssi) {
    if (rssi >= -60) {
        return 'w0';
    } else if (rssi >= -67) {
        return 'w1';
    } else if (rssi >= -75) {
        return 'w2';
    } else {
        return 'w3';
    }
}

// Load wifi list
function refreshAP() {
    g_refreshAPTimer = null;

    if (g_checkStatusInProgress) {
        console.log("refreshAP: checkStatus is active, postpone refreshAP");
        startRefreshAP(500);
        return;
    }

    let timestamp1 = new Date();

    let prevCheckStatusActive = g_checkStatusActive;
    stopCheckStatus();

    g_refreshAPInProgress = true;
    $.ajax({
        dataType: "json",
        url: "/ap.json",
        timeout: 10000,
        success: function (data, text) {
            g_refreshAPInProgress = false;
            if (data.length > 0) {
                //sort by signal strength
                data.sort(function (a, b) {
                    let x = a["rssi"];
                    let y = b["rssi"];
                    return ((x < y) ? 1 : ((x > y) ? -1 : 0));
                });
            }
            apList = data;
            refreshAPHTML(apList);

            if (prevCheckStatusActive) {
                startCheckStatus();
            }
            if (g_refreshAPActive) {
                startRefreshAP(2000);
            }
        },
        error: function (request, status, error) {
            g_refreshAPInProgress = false;
            let timestamp2 = new Date();
            console.log("ajax: refreshAP: error, status=" + status + ", error=" + error);
            if (prevCheckStatusActive) {
                startCheckStatus();
            }
            if (g_refreshAPActive) {
                let delta_ms = timestamp2 - timestamp1;
                if (delta_ms < 2000) {
                    startRefreshAP(2000 - delta_ms);
                } else {
                    startRefreshAP();
                }
            }
        }
    });
}

function updatePositionOfWiFiPasswordInput() {
    let selected_wifi = $("input[name='wifi-name']:checked");

    let is_manual_wifi = false;
    if (selected_wifi[0] && (selected_wifi[0].id === "page-wifi_connection-radio-connect_manually")) {
        is_manual_wifi = true;
    }

    if (is_manual_wifi) {

    } else {
        let div_wifi_password = selected_wifi.parent().parent().children(".wifi_password");
        let div_page_wifi_list_ssid_password = $('#page-wifi_connection-ssid_password');

        $('.wifi_password').css('height', 0);
        $('#page-wifi_connection-ssid_password-wrap').css('height', 0);

        div_wifi_password.css('height', div_page_wifi_list_ssid_password.height());
        let wifi_password_position = div_wifi_password.position();
        div_page_wifi_list_ssid_password.css('top', wifi_password_position.top);
        div_page_wifi_list_ssid_password.show();
    }
}

function onChangeWiFiName() {
    let selected_wifi = $("input[name='wifi-name']:checked");
    let ssid = selected_wifi.val();
    let isAuthNeeded = !selected_wifi.hasClass('no_auth');

    $('#manual_ssid').val(ssid);
    $('#pwd').val("");

    $('#input_ssid_block').hide();
    if (isAuthNeeded) {
        $('#input_password_block').show();
    } else {
        $('#input_password_block').hide();
    }
    $('#wifi-connection-status-block').hide();

    flagUseSavedWiFiPassword = false;

    updatePositionOfWiFiPasswordInput();
    checkAndUpdatePageWiFiListButtonNext();
}

function refreshAPHTML(data) {
    if (flagWaitingNetworkConnection) {
        return;
    }
    if (document.location.hash !== "#page-wifi_connection") {
        return;
    }
    let is_manual_wifi = false;
    let prev_selected_wifi_radio_button = $('input[name="wifi-name"]:checked');
    let prev_selected_wifi_radio_button_has_auth = prev_selected_wifi_radio_button.hasClass('auth');
    let selected_wifi_ssid = prev_selected_wifi_radio_button.val();
    if (prev_selected_wifi_radio_button[0] && (prev_selected_wifi_radio_button[0].id === "page-wifi_connection-radio-connect_manually")) {
        is_manual_wifi = true;
        selected_wifi_ssid = null;
    }
    if (!is_manual_wifi && !selected_wifi_ssid) {
        if (connectedSSID) {
            selected_wifi_ssid = connectedSSID;
        }
    }

    let div_page_wifi_list_ssid_password = $('#page-wifi_connection-ssid_password');
    if (selected_wifi_ssid) {
        $('#input_ssid_block').hide();
    }

    if (data.length === 0) {
        $('#page-wifi_connection-no_wifi').show();
    } else {
        $('#page-wifi_connection-no_wifi').hide();
    }

    let h = "";
    data.forEach(function (e, idx, array) {
        if (idx === 0) {
            h += '<div class="border"></div>';
            h += "\n";
        }
        h += '<div>';
        h += '<label class="control control-radio">';
        h += '    <div style="display: flex">';
        h += '        <div>{0}</div>'.format(e.ssid);
        h += '        <div style="margin-left: auto;" class="{0}"></div>'.format(e.auth === 0 ? '' : 'pw');
        h += '        <div class="{0}"></div>'.format(rssiToIcon(e.rssi));
        h += '    </div>';
        h += '    <input value="{0}" name="wifi-name" type="radio" class="{1}">'.format(
            e.ssid,
            (e.auth === 0) ? 'no_auth' : 'auth');
        h += '    <span class="control_indicator"></span>';
        h += '</label>';
        h += '<div class="wifi_password"></div>';
        h += '<div class="border"></div>';
        h += '</div>';
        h += "\n";
    });

    $("#page-wifi_connection-list_of_ssid").html(h);

    $("div#page-wifi_connection-list_of_ssid label input[name='wifi-name']").change(onChangeWiFiName);

    if (!is_manual_wifi && selected_wifi_ssid) {
        let input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"]');
        if (input_id.length !== 0) {
            if (input_id.length > 1) {
                if (prev_selected_wifi_radio_button[0]) {
                    if (prev_selected_wifi_radio_button_has_auth) {
                        input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"].auth');
                    } else {
                        input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"].no_auth');
                    }
                } else {
                    input_id = $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"].auth');
                }
            }
            if (input_id) {
                input_id.prop('checked', true);
            }

            if (selected_wifi_ssid) {
                let selected_wifi_has_auth = input_id.hasClass('auth');
                if (selected_wifi_has_auth) {
                    $('#input_password_block').show();
                } else {
                    $('#input_password_block').hide();
                }
                div_page_wifi_list_ssid_password.show();
            } else {
                div_page_wifi_list_ssid_password.hide();
            }

            if (flagUseSavedWiFiPassword) {
                let input_pwd = $('input#pwd');
                input_pwd.val(WIFI_USE_SAVED_PASSWORD);
                input_pwd.focus(function () {
                    if (flagUseSavedWiFiPassword) {
                        flagUseSavedWiFiPassword = false;
                        $('input#pwd').val("");
                    }
                });
            }
            $('#manual_ssid').val(selected_wifi_ssid);

            updatePositionOfWiFiPasswordInput(input_id.parent().parent().children(".wifi_password"));
        } else {
            $('#input_password_block').hide();
        }
    }
    if (is_manual_wifi) {
        updatePositionOfWiFiPasswordInput($('#page-wifi_connection-ssid_password-wrap'));
    }
    checkAndUpdatePageWiFiListButtonNext();
    $('body').removeClass('is-loading');
}

function onGetStatusJson(data) {
    if (data.hasOwnProperty('extra')) {
        let data_extra = data['extra'];
        let fw_updating_stage = data_extra['fw_updating'];
        let fw_updating_percentage = data_extra['percentage'];
        if (fw_updating_stage > 0) {
            if (!$('#page-software_update_progress').is(':visible')) {
                change_url_software_update_progress();
            }
            let progressbar_stage1 = $('#software_update_progress-stage1');
            let progressbar_stage2 = $('#software_update_progress-stage2');
            let progressbar_stage3 = $('#software_update_progress-stage3');
            let progressbar_stage4 = $('#software_update_progress-stage4');
            switch (fw_updating_stage) {
                case 1:
                    progressbar_stage1.val(fw_updating_percentage);
                    break;
                case 2:
                    progressbar_stage2.val(fw_updating_percentage);
                    progressbar_stage1.val(100);
                    break;
                case 3:
                    progressbar_stage3.val(fw_updating_percentage);
                    progressbar_stage1.val(100);
                    progressbar_stage2.val(100);
                    break;
                case 4:
                    progressbar_stage4.val(fw_updating_percentage);
                    progressbar_stage1.val(100);
                    progressbar_stage2.val(100);
                    progressbar_stage3.val(100);
                    break;
                case 5: // completed successfully
                    progressbar_stage1.val(100);
                    progressbar_stage2.val(100);
                    progressbar_stage3.val(100);
                    progressbar_stage4.val(100);
                    $("#software_update_progress-status-completed_successfully").removeClass("hidden");
                    stopCheckStatus();
                    break;
                case 6: // completed unsuccessfully
                    $("#software_update_progress-status-completed_unsuccessfully").removeClass("hidden");
                    $('#software_update_progress-status-completed_unsuccessfully-message').text(data_extra['message']);
                    break;
            }
            return;
        }
    }
    if (data.hasOwnProperty('ssid') && !!data['ssid'] && data['ssid'] !== "") {
        connectedSSID = data["ssid"];
        if (data["ssid"] === selectedSSID) {
            //that's a connection attempt
            if (data["urc"] === URC_CODE.CONNECTED) {
                $("#ip").text(data["ip"]);
                $("#netmask").text(data["netmask"]);
                $("#gw").text(data["gw"]);
                if (data.hasOwnProperty('dhcp') && data["dhcp"] !== "") {
                    $("#dhcp").text(data["dhcp"]);
                    $("#dhcp-block").show();
                } else {
                    $("#dhcp").text("");
                    $("#dhcp-block").hide();
                }

                switch (connectionState) {
                    case CONNECTION_STATE.NOT_CONNECTED:
                        break;
                    case CONNECTION_STATE.CONNECTING:
                        if (!flagNetworkConnected) {
                            flagNetworkConnected = true;
                            on_network_connected_wifi();
                        }
                        if (flagWaitingNetworkConnection) {
                            flagWaitingNetworkConnection = false;
                            change_page_to_software_update();
                        }
                        break;
                    case CONNECTION_STATE.CONNECTED:
                        break;
                    case CONNECTION_STATE.FAILED:
                        break;
                }
                connectionState = CONNECTION_STATE.CONNECTED
            } else if (data["urc"] === URC_CODE.FAILED) {
                //failed attempt
                $("#ip").text('0.0.0.0');
                $("#netmask").text('0.0.0.0');
                $("#gw").text('0.0.0.0');
                $("#dhcp").text("");
                $("#dhcp-block").hide();

                switch (connectionState) {
                    case CONNECTION_STATE.NOT_CONNECTED:
                        break;
                    case CONNECTION_STATE.CONNECTING:
                        flagWaitingNetworkConnection = false;
                        $("#wifi-connection-status-block").show();
                        updatePositionOfWiFiPasswordInput();
                        $('body').removeClass('is-loading');
                        startRefreshAP();
                        break;
                    case CONNECTION_STATE.CONNECTED:
                        break;
                    case CONNECTION_STATE.FAILED:
                        break;
                }
                connectionState = CONNECTION_STATE.FAILED
            }
        } else if (data.hasOwnProperty('urc') && data['urc'] === URC_CODE.CONNECTED) {
            //ESP32 is already connected to a wifi without having the user do anything
            $(".wifi-network-name").text(data["ssid"]);
            $("#ip").text(data["ip"]);
            $("#netmask").text(data["netmask"]);
            $("#gw").text(data["gw"]);
            if (data.hasOwnProperty('dhcp') && data["dhcp"] !== "") {
                $("#dhcp").text(data["dhcp"]);
                $("#dhcp-block").show();
            } else {
                $("#dhcp").text("");
                $("#dhcp-block").hide();
            }
            switch (connectionState) {
                case CONNECTION_STATE.NOT_CONNECTED:
                case CONNECTION_STATE.CONNECTING:
                    if (!flagNetworkConnected) {
                        flagNetworkConnected = true;
                        on_network_connected_wifi();
                    }
                    if (flagWaitingNetworkConnection) {
                        flagWaitingNetworkConnection = false;
                        change_page_to_software_update();
                    }
                    break;
                case CONNECTION_STATE.CONNECTED:
                    break;
                case CONNECTION_STATE.FAILED:
                    break;
            }
            connectionState = CONNECTION_STATE.CONNECTED;
        }
    } else {
        connectedSSID = "";
        if (data.hasOwnProperty('urc')) {
            if (data["urc"] === URC_CODE.CONNECTED) {
                // connected to Ethernet
                $(".wifi-network-name").text("");
                $("#ip").text(data["ip"]);
                $("#netmask").text(data["netmask"]);
                $("#gw").text(data["gw"]);
                if (data.hasOwnProperty('dhcp') && data["dhcp"] !== "") {
                    $("#dhcp").text(data["dhcp"]);
                    $("#dhcp-block").show();
                } else {
                    $("#dhcp").text("");
                    $("#dhcp-block").hide();
                }

                switch (connectionState) {
                    case CONNECTION_STATE.NOT_CONNECTED:
                    case CONNECTION_STATE.CONNECTING:
                        if (!flagNetworkConnected) {
                            flagNetworkConnected = true;
                            on_network_connected_eth();
                        }
                        if (flagWaitingNetworkConnection) {
                            flagWaitingNetworkConnection = false;
                            change_page_to_software_update();
                        }
                        break;
                    case CONNECTION_STATE.CONNECTED:
                        break;
                    case CONNECTION_STATE.FAILED:
                        break;
                }
                connectionState = CONNECTION_STATE.CONNECTED
            } else if (data["urc"] === URC_CODE.DISCONNECTED) {
                //that's a manual disconnect
                // TODO: implement
                // if($("#wifi-status").is(":visible"))
                // {
                // 	$("#wifi-status").slideUp( "fast", function() {});
                // }
            }
        }
    }
    g_flagAccessFromLAN = data.hasOwnProperty('lan') && (data["lan"] === 1);
    if (window.location.hash === '#page-welcome') {
        $('#page-welcome-button-get-started').removeClass("disable-click");
    }
}

function checkStatus() {
    g_checkStatusTimer = null;

    if (g_refreshAPInProgress) {
        console.log("checkStatus: refreshAP is active, postpone checkStatus");
        startCheckStatus(500);
        return;
    }

    let timestamp1 = new Date();
    if (counterStatusJsonTimeout !== 0) {
        console.log('GET status.json: cnt=' + counterStatusJsonTimeout + ', time: ' + timestamp1.toISOString());
    }

    g_checkStatusInProgress = true;
    $.ajax({
        dataType: "json",
        url: "/status.json",
        timeout: 3000,
        success: function (data, text) {
            g_checkStatusInProgress = false;
            counterStatusJsonTimeout = 0;
            onGetStatusJson(data);
            if (g_checkStatusActive) {
                startCheckStatus(1000);
            }
        },
        error: function (request, status, error) {
            g_checkStatusInProgress = false;
            let timestamp2 = new Date();
            console.log("ajax: checkStatus: error, time: " + timestamp2.toISOString() +
                "status=" + status +
                ", error=" + error +
                ", cnt=" + counterStatusJsonTimeout +
                ", delta=" + (timestamp2 - timestamp1));

            counterStatusJsonTimeout += 1;
            if (counterStatusJsonTimeout >= 4) {
                $('#overlay-no_gateway_connection').fadeIn();
                $('body').removeClass('is-loading');
                stopRefreshAP();
                stopCheckStatus();
            } else {
                if (g_checkStatusActive) {
                    let delta_ms = timestamp2 - timestamp1;
                    if (delta_ms < 1000) {
                        startCheckStatus(1000 - delta_ms);
                    } else {
                        startCheckStatus();
                    }
                }
            }
        }
    });
}

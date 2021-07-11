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


let apList = null;
let selectedSSID = "";
let refreshAPInterval = null;
let checkStatusInterval = null;
let flagNeedToCheckFirmwareUpdates = false;
let firmwareUpdatingBaseURL = 'https://github.com/ruuvi/ruuvi.gateway_esp.c/releases/download/';
let flagLatestFirmwareVersionSupported = false;

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


function stopCheckStatusInterval() {
    if (checkStatusInterval != null) {
        clearInterval(checkStatusInterval);
        checkStatusInterval = null;
    }
}

function stopRefreshAPInterval() {
    if (refreshAPInterval != null) {
        clearInterval(refreshAPInterval);
        refreshAPInterval = null;
    }
}

function startCheckStatusInterval() {
    checkStatusInterval = setInterval(checkStatus, 950);
}

function startRefreshAPInterval() {
    refreshAPInterval = setInterval(refreshAP, 2800);
}


// The popstate event is fired each time when the current history entry changes.
window.addEventListener('popstate', function (event) {
    var url = window.location.hash.substring(1);

    $('section.section').hide();

    $('#' + url).show();

}, false);

// Navigation
function change_url(url) {
    if (window.location.hash === ('#' + url)) {
        return;
    }
    $('section.section').hide();
    $('#' + url).show('show', function () {
        $(this).trigger('onShow');
    });
    window.location.hash = url;
}

function on_network_connected_wifi(url) {
    $("#connected-eth").hide()
    $("#connected-wifi").show()
}

function on_network_connected_eth(url) {
    $("#connected-wifi").hide()
    $("#connected-eth").show()
}

function change_url_network_connected() {
    if (flagNeedToCheckFirmwareUpdates) {
        change_url('firmware_updating');
    } else {
        change_url('network-connected');
    }
}

function change_url_firmware_updating_progress() {
    change_url('firmware_updating_progress');
}

function on_show_firmware_updating() {
    $("#firmware_updating-button-upgrade").addClass("disable-click");
    $("#checking-latest-available-version").show();
    $("#page-firmware_updating-button-back").addClass("disable-click");
    $("#page-firmware_updating-button-continue").addClass("disable-click");

    $("#firmware_updating-status-ok-already_latest").addClass('hidden');
    $("#firmware_updating-status-ok-latest_not_supported").addClass('hidden');
    $("#firmware_updating-status-ok-update_available").addClass('hidden');
    $("#firmware_updating-status-error").addClass('hidden');

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

        $("#firmware_updating-version-latest").text(latest_release_version);
        let firmware_updating_url = firmwareUpdatingBaseURL + latest_release_version;
        $("#firmware_updating-url").val(firmware_updating_url);

        $("#checking-latest-available-version").hide();
        $("#page-firmware_updating-button-back").removeClass("disable-click");
        $("#page-firmware_updating-button-continue").removeClass("disable-click");

        let current_version = $("#firmware_updating-version-current").text();
        $("#firmware_updating-status-error").addClass('hidden');

        if (!flagLatestFirmwareVersionSupported) {
            $("#firmware_updating-status-ok-latest_not_supported").removeClass("hidden");
        } else {
            if (current_version === latest_release_version) {
                $("#firmware_updating-status-ok-already_latest").removeClass("hidden");
            } else {
                $("#firmware_updating-status-ok-update_available").removeClass("hidden");
                $("#firmware_updating-button-upgrade").removeClass("disable-click");
            }
        }
    }).fail(function ($xhr) {
        $("#checking-latest-available-version").hide();
        $("#page-firmware_updating-button-back").removeClass("disable-click");
        $("#page-firmware_updating-button-continue").removeClass("disable-click");
        let data = $xhr.responseJSON;
        $("#firmware_updating-status-error").removeClass('hidden');
        $("#firmware_updating-status-ok-already_latest").addClass('hidden');
        $("#firmware_updating-status-ok-update_available").addClass('hidden');
    });
}

function on_show_firmware_updating_progress() {
    $("#page-firmware_updating_progress-button-back").addClass("disable-click");
    $("#page-firmware_updating_progress-button-refresh").addClass("disable-click");
}

function on_custom_connection_type_changed() {
    let custom_connection_type = $("input[name='custom_connection']:checked").val();
    if (custom_connection_type === undefined) {
        $(`input:radio[name='custom_connection'][value='use_http']`).prop('checked', true);
        custom_connection_type = $("input[name='custom_connection']:checked").val();
    }
    if (custom_connection_type === 'use_http') {
        $('.conf-settings-http').slideDown();
        $('.conf-settings-mqtt').slideUp();
    }
    if (custom_connection_type === 'use_mqtt') {
        $('.conf-settings-mqtt').slideDown();
        $('.conf-settings-http').slideUp();
    }
}

function on_lan_auth_type_changed() {
    let lan_auth_type = $("input[name='lan_auth_type']:checked").val();
    if (lan_auth_type === undefined) {
        $(`input:radio[name='lan_auth_type'][value='lan_auth_deny']`).prop('checked', true);
        lan_auth_type = $("input[name='lan_auth_type']:checked").val();
    }
    if (lan_auth_type === 'lan_auth_allow' || lan_auth_type === 'lan_auth_deny') {
        $('#conf-lan_auth-login-password').slideUp();
    } else {
        $('#conf-lan_auth-login-password').slideDown();
    }
    on_lan_auth_user_pass_changed();
}

function on_lan_auth_user_pass_changed() {
    let lan_auth_type = $("input[name='lan_auth_type']:checked").val();
    let flag_need_to_disable = false;
    if (lan_auth_type !== 'lan_auth_allow' && lan_auth_type !== 'lan_auth_deny') {
        if ($("#lan_auth-user").val() === "" || ($("#lan_auth-pass").val() === "" && g_flag_lan_auth_pass_changed)) {
            flag_need_to_disable = true;
        }
    }
    if (flag_need_to_disable) {
        $("#page-lan_auth_type-button-continue").addClass("disable-click");
    } else {
        $("#page-lan_auth_type-button-continue").removeClass("disable-click");
    }
}

function on_settings_scan_filtering_changed() {
    if ($('#use_coded_phy')[0].checked) {
        $('#use_experimental_long_range_sensors').prop('checked', true);
    } else {
        $('#use_experimental_long_range_sensors').prop('checked', false);
    }
    if (!($("input[name='filtering']:checked").val() === "1")) {
        $('#page-settings_scan-section-ruuvi_sensors_only-scanning_options').slideUp();
        $('#page-settings_scan-section-all_nearby_beacons-scanning_options').slideDown();
    } else {
        $('#page-settings_scan-section-all_nearby_beacons-scanning_options').slideUp();
        $('#page-settings_scan-section-ruuvi_sensors_only-scanning_options').slideDown();
        // set default values
        $("#use_1mbit_phy")[0].checked = true;
        $("#use_extended_payload")[0].checked = true;
        $("#use_channel_37")[0].checked = true;
        $("#use_channel_38")[0].checked = true;
        $("#use_channel_39")[0].checked = true;
    }
}

$(document).ready(function () {
    // Set initial hash to help back button navigation
    window.location.hash = 'welcome';

    window.onpopstate = function (event) {
        if (document.location.hash === "#network-connected") {
            // Prevent the user from leaving this page by pressing the Back button
            window.history.pushState(null, "", "#network-connected");
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
            }

            // Add your code here.
        }
    });

    $('.btn-back').click(function (e) {
        e.preventDefault();
        window.history.back();
    });

    $('#page-welcome-button-get-started').click(function (e) {
        e.preventDefault();
        change_url('settings');
    });

    $('#page-settings-button-continue').click(function (e) {
        e.preventDefault();
        let connection_type = $("input[name='connection_type']:checked").val();
        if (connection_type === 'ruuvi')
            change_url('settings_lan_auth_type');
        else
            change_url('settings_custom');
    });

    $('#page-settings_custom-button-continue').click(function (e) {
        e.preventDefault();
        change_url('settings_scan');
    });

    $('#page-settings_scan-button-continue').click(function (e) {
        e.preventDefault();
        change_url('settings_lan_auth_type');
    });

    $('#lan_auth-user').on("keyup change", function (e) {
        g_flag_lan_auth_pass_changed = true;
        $("#lan_auth-pass").removeAttr('placeholder');
        on_lan_auth_user_pass_changed();
    });

    $('#lan_auth-pass').on("keyup change", function (e) {
        g_flag_lan_auth_pass_changed = true;
        $("#lan_auth-pass").removeAttr('placeholder');
        on_lan_auth_user_pass_changed();
    });

    $('#page-lan_auth_type-button-continue').click(function (e) {
        e.preventDefault();
        change_url('connection_type');
    });

    $('#page-connection_type-button-continue').click(function (e) {
        e.preventDefault();
        let network_type = $("input[name='network_type']:checked").val();
        if (network_type === 'wifi')
            change_url('wifi_list');
        else
            change_url('cable_settings');
    });

    $('#page-cable_settings-button-continue').click(function (e) {
        e.preventDefault();
        saveConfigAndPerformConnect(null, null);
    });

    $('#page-firmware_updating-button-continue').click(function (e) {
        e.preventDefault();
        flagNeedToCheckFirmwareUpdates = false;
        change_url_network_connected();
    });

    $('#page-firmware_updating_progress-button-refresh').click(function (e) {
        e.preventDefault();
        location.reload();
    });

    $('#page-network-connected-button-check_updates').click(function (e) {
        e.preventDefault();
        change_url('firmware_updating');
    });

    $('#firmware_updating-button-upgrade').click(function (e) {
        e.preventDefault();
        let firmware_updating_url = $("#firmware_updating-url").val();
        $.ajax({
                method: 'POST',
                url: '/fw_update.json',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                cache: false,
                data: JSON.stringify({'url': firmware_updating_url}),
                success: function (data, text) {
                    change_url_firmware_updating_progress();
                    flagNeedToCheckFirmwareUpdates = false;
                },
                error: function (request, status, error) {
                    flagNeedToCheckFirmwareUpdates = false;
                    // ('HTTP error: ' + status + ', ' + 'Status: ' + request.status + '(' + request.statusText + ')' + ', ' + request.responseText);
                }
            }
        );
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
                $('input#mqtt_client_id').attr('placeholder', "MAC-address is used if empty");
            } else if (lang === 'fi') {
                $('input#pwd').attr('placeholder', "Salasana");
                $('input#mqtt_client_id').attr('placeholder', "MAC-osoitetta käytetään, jos se on tyhjä");
            }
        })
    });

    $('#settings_scan').bind('onShow', function () {
        on_settings_scan_filtering_changed();
    });

    $("input[name='filtering']").change(function (e) {
        on_settings_scan_filtering_changed();
    });

    $('#use_experimental_long_range_sensors').change(function (e) {
        if ($('#use_experimental_long_range_sensors')[0].checked) {
            $('#use_coded_phy').prop('checked', true);
        } else {
            $('#use_coded_phy').prop('checked', false);
        }
    });

    $('#use_coded_phy').change(function (e) {
        if ($('#use_coded_phy')[0].checked) {
            $('#use_experimental_long_range_sensors').prop('checked', true);
        } else {
            $('#use_experimental_long_range_sensors').prop('checked', false);
        }
    });

    $('#cable_settings').bind('onShow', function () {
        if (!$('#eth_dhcp')[0].checked) {
            $('#page-cable_settings-section-manual_settings').slideDown();
        }
    });

    $('#eth_dhcp').change(function (e) {
        if ($('#eth_dhcp')[0].checked) {
            $('#page-cable_settings-section-manual_settings').slideUp();
        } else {
            $('#page-cable_settings-section-manual_settings').slideDown();
        }
    });

    $('#network-connected').bind('onShow', function () {
        stopCheckStatusInterval();
        stopRefreshAPInterval();
    });

    $("input[name='custom_connection']").change(function (e) {
        on_custom_connection_type_changed();
    });

    $('#settings_custom').bind('onShow', function () {
        on_custom_connection_type_changed();
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

    $('#settings_lan_auth_type').bind('onShow', function () {
        on_lan_auth_type_changed();
    });

    $("input[name='lan_auth_type']").change(function (e) {
        g_flag_lan_auth_pass_changed = true;
        $("#lan_auth-pass").removeAttr('placeholder');
        on_lan_auth_type_changed();
    });

    $('#wifi-overlay-show-password').click(function (e) {
        if ($('#pwd').prop("type") === "password") {
            $("#pwd").prop("type", "text");
        } else {
            $("#pwd").prop("type", "password");
        }
    });

    $('#use-manual-wifi').click(function (e) {
        e.preventDefault();
        showWiFiOverlay(null, true);
    });

    $("#wifi-overlay-button-cancel").click(function () {
        selectedSSID = "";
        $('#wifi-overlay').fadeOut();
    });

    $("#wifi-overlay-connecting-button-cancel").click(function () {
        selectedSSID = "";
        $('#wifi-overlay').fadeOut();
        $.ajax({
            url: '/connect.json',
            dataType: 'json',
            method: 'DELETE',
            cache: false,
            data: {'timestamp': Date.now()}
        });
        startCheckStatusInterval();
        change_url('connection_type');
    });

    $("#eth-overlay-connecting-button-cancel").click(function () {
        selectedSSID = "";
        $('#wifi-overlay').fadeOut();
        $.ajax({
            url: '/connect.json',
            dataType: 'json',
            method: 'DELETE',
            cache: false,
            data: {'timestamp': Date.now()}
        });
        startCheckStatusInterval();
        change_url('connection_type');
    });

    $("#wifi-overlay-button-connect").click(function () {
        let ssid = $('#manual_ssid').val();
        let password = $("#pwd").val();
        saveConfigAndPerformConnect(ssid, password);
    });

    $("#wifi-overlay-connection-failed-button-ok").click(function () {
        $("#wifi-overlay-connection-failed").hide();
        $('#wifi-overlay').fadeOut();
    })

    $('#firmware_updating').bind('onShow', function () {
        on_show_firmware_updating();
    });

    $('#firmware_updating-set-url-manually').change(function (e) {
        if ($('#firmware_updating-set-url-manually')[0].checked) {
            $('#firmware_updating-url-manual').slideDown();
            $("#firmware_updating-button-upgrade").removeClass("disable-click");
        } else {
            $('#firmware_updating-url-manual').slideUp();
            if (!flagLatestFirmwareVersionSupported) {
                $("#firmware_updating-button-upgrade").addClass("disable-click");
            }
        }
    });

    $('#firmware_updating_progress').bind('onShow', function () {
        on_show_firmware_updating_progress();
    });

    $("#checking-latest-available-version-button-cancel").click(function () {
        $('#checking-latest-available-version').hide();
        $("#page-firmware_updating-button-back").removeClass("disable-click");
        $("#page-firmware_updating-button-continue").removeClass("disable-click");
    });

    //first time the page loads: attempt get the connection status and start the wifi scan
    refreshAP();
    startCheckStatusInterval();
    startRefreshAPInterval();

});

function checkSSIDAndPassword() {
    let ssid = $('#manual_ssid').val();
    let password = $("#pwd").val();
    if (ssid === '' || password.length < 8) {
        $('#wifi-overlay-button-connect').attr('disabled', 'disabled');
    } else {
        $('#wifi-overlay-button-connect').removeAttr('disabled');
    }
}

/**
 * @brief Show WiFi overlay with SSID and password
 * @param ssid - SSID name or null if it must be entered by the user
 * @param isAuthNeeded - true if a password is required
 */
function showWiFiOverlay(ssid, isAuthNeeded) {
    let inputSSID = $('#manual_ssid');
    let inputPassword = $('#pwd');
    inputSSID.val(ssid);
    inputPassword.val('');
    if (isAuthNeeded) {
        $("#wifi-overlay-enter-ssid").show();
        if (ssid) {
            $('#wifi-overlay-enter-ssid-title-manual').hide();
            $('#wifi-overlay-enter-ssid-title-auto').show();
        } else {
            $('#wifi-overlay-enter-ssid-title-manual').show();
            $('#wifi-overlay-enter-ssid-title-auto').hide();
        }

        $('#wifi-overlay-button-connect').attr('disabled', 'disabled');

        inputSSID.keyup(checkSSIDAndPassword);
        inputPassword.keyup(checkSSIDAndPassword);
        inputPassword.focus();
    } else {
        $("#wifi-overlay-enter-ssid").hide();
    }

    $("#wifi-overlay-connecting").hide();
    $("#wifi-overlay-connection-failed").hide();

    $('#wifi-overlay').fadeIn();
}

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

// Init function needed as click events are lost everytime list is updated
function initWifiList() {
    $('.wifi-list a').click(function (e) {
        e.preventDefault();
        let ssid = $(this).text();
        let isAuthNeeded = selected_wifi_auth_required(ssid);
        $(".wifi-network-name").text(ssid);
        showWiFiOverlay(ssid, isAuthNeeded);
        if (!isAuthNeeded) {
            saveConfigAndPerformConnect(ssid, null);
        }
    });
}

function performConnect(ssid, password) {
    //stop the status refresh. This prevents a race condition where a status
    //request would be refreshed with wrong ip info from a previous connection
    //and the request would automatically shows as successful.
    stopCheckStatusInterval();

    //stop refreshing wifi list
    stopRefreshAPInterval();

    selectedSSID = ssid;
    $(".wifi-network-name").text(ssid);

    $('#manual_ssid').onkeyup = null;
    $('#pwd').onkeyup = null;

    let req_connect_header = null;
    if (ssid) {
        $("#wifi-overlay-enter-ssid").hide();
        $("#wifi-overlay-connecting").show();
        req_connect_header = {'X-Custom-ssid': ssid, 'X-Custom-pwd': password};
    } else {
        $("#eth-overlay-connecting").show();
    }

    $.ajax({
            method: 'POST',
            url: '/connect.json',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            cache: false,
            headers: req_connect_header,
            data: JSON.stringify({'timestamp': Date.now()}),
            success: function (data, text) {
                connectionState = CONNECTION_STATE.CONNECTING;
            },
            error: function (request, status, error) {
                if (ssid) {
                    $("#wifi-overlay-connecting").hide();
                } else {
                    $("#eth-overlay-connecting").hide();
                }
                $('#wifi-overlay-connection-failed-description').text('HTTP error: ' + status + ', ' + 'Status: ' + request.status + '(' + request.statusText + ')' + ', ' + request.responseText);
                $("#wifi-overlay-connection-failed").show();
            }
        }
    );

    //now we can re-set the intervals regardless of result
    startCheckStatusInterval();
    startRefreshAPInterval();
}

function saveConfigAndPerformConnect(ssid, password) {
    flagNeedToCheckFirmwareUpdates = true;
    save_config();
    performConnect(ssid, password);
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
    $.getJSON("ap.json", function (data) {
        if (data.length > 0) {
            //sort by signal strength
            data.sort(function (a, b) {
                var x = a["rssi"];
                var y = b["rssi"];
                return ((x < y) ? 1 : ((x > y) ? -1 : 0));
            });

            apList = data;

            refreshAPHTML(apList);
        }
    });
}

// Refresh wifi selection list
function refreshAPHTML(data) {
    var h = "";
    data.forEach(function (e, idx, array) {
        //h += '<div class="ape{0}"><div class="{1}"><div class="{2}">{3}</div></div></div>'.format(idx === array.length - 1?'':' brdb', rssiToIcon(e.rssi), e.auth==0?'':'pw',e.ssid);
        h += '<li><a href="" class="{0}">{3}<span class="{2}"></span></a></li>'.format(idx === array.length - 1 ? '' : ' brdb', rssiToIcon(e.rssi), e.auth == 0 ? '' : 'pw', e.ssid);
        h += "\n";
    });

    $("#ssid-list").html(h);

    initWifiList();
}

function onGetStatusJson(data) {
    if (data.hasOwnProperty('extra')) {
        let data_extra = data['extra'];
        let fw_updating_stage = data_extra['fw_updating'];
        let fw_updating_percentage = data_extra['percentage'];
        if (fw_updating_stage > 0) {
            if (!$('#firmware_updating_progress').is(':visible')) {
                change_url_firmware_updating_progress();
            }
            let progressbar_stage1 = $('#firmware_updating_progress-stage1');
            let progressbar_stage2 = $('#firmware_updating_progress-stage2');
            let progressbar_stage3 = $('#firmware_updating_progress-stage3');
            let progressbar_stage4 = $('#firmware_updating_progress-stage4');
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
                    $("#firmware_updating_progress-status-completed_successfully").removeClass("hidden");
                    $("#page-firmware_updating_progress-button-refresh").removeClass("disable-click");
                    break;
                case 6: // completed unsuccessfully
                    $("#firmware_updating_progress-status-completed_unsuccessfully").removeClass("hidden");
                    $('#firmware_updating_progress-status-completed_unsuccessfully-message').text(data_extra['message']);
                    $("#page-firmware_updating_progress-button-back").removeClass("disable-click");
                    break;
            }
            return;
        }
    }
    if (data.hasOwnProperty('ssid') && !!data['ssid'] && data['ssid'] !== "") {
        let fw_updating_stage = data['fw_updating'];
        let fw_updating_percentage = data['percentage'];
        if (data["ssid"] === selectedSSID) {
            //that's a connection attempt
            if (data["urc"] === URC_CODE.CONNECTED) {
                $("#ip").text(data["ip"]);
                $("#netmask").text(data["netmask"]);
                $("#gw").text(data["gw"]);

                switch (connectionState) {
                    case CONNECTION_STATE.NOT_CONNECTED:
                        break;
                    case CONNECTION_STATE.CONNECTING:
                        $("#wifi-overlay-connecting").hide();
                        $('#wifi-overlay').fadeOut();
                        on_network_connected_wifi();
                        change_url_network_connected();
                        break;
                    case CONNECTION_STATE.CONNECTED:
                        break;
                    case CONNECTION_STATE.FAILED:
                        break;
                }
                connectionState = CONNECTION_STATE.CONNECTED
            } else if (data["urc"] === URC_CODE.FAILED) {
                //failed attempt
                $("#connect-details h1").text('');
                $("#ip").text('0.0.0.0');
                $("#netmask").text('0.0.0.0');
                $("#gw").text('0.0.0.0');

                switch (connectionState) {
                    case CONNECTION_STATE.NOT_CONNECTED:
                        break;
                    case CONNECTION_STATE.CONNECTING:
                        $("#wifi-overlay-connecting").hide();
                        $("#wifi-overlay-connection-failed").show();
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
            switch (connectionState) {
                case CONNECTION_STATE.NOT_CONNECTED:
                case CONNECTION_STATE.CONNECTING:
                    $("#eth-overlay-connecting").hide();
                    on_network_connected_wifi();
                    change_url_network_connected();
                    break;
                case CONNECTION_STATE.CONNECTED:
                    break;
                case CONNECTION_STATE.FAILED:
                    break;
            }
            connectionState = CONNECTION_STATE.CONNECTED;
        }
    } else if (data.hasOwnProperty('urc')) {
        if (data["urc"] === URC_CODE.CONNECTED) {
            // connected to Ethernet
            $(".wifi-network-name").text("");
            $("#ip").text(data["ip"]);
            $("#netmask").text(data["netmask"]);
            $("#gw").text(data["gw"]);

            switch (connectionState) {
                case CONNECTION_STATE.NOT_CONNECTED:
                case CONNECTION_STATE.CONNECTING:
                    $("#eth-overlay-connecting").hide();
                    on_network_connected_eth();
                    change_url_network_connected();
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

function checkStatus() {
    $.ajax({
        dataType: "json",
        url: "/status.json",
        success: function (data, text) {
            onGetStatusJson(data);
        },
        error: function (request, status, error) {
            console.log("ajax: checkStatus: error, status=" + status + ", error=" + error);
        }
    });
}

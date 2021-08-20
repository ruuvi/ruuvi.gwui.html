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

// The popstate event is fired each time when the current history entry changes.
window.addEventListener('popstate', function (event) {
    var url = window.location.hash.substring(1);

    $('section').hide();

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
    flagNetworkConnected = true;
    $("#connected-eth").hide()
    $("#connected-wifi").show()
}

function on_network_connected_eth(url) {
    $("#connected-wifi").hide()
    $("#connected-eth").show()
}

function change_url_update_schedule() {
    change_url('page-update_schedule');
}

function change_url_software_update_progress() {
    change_url('software_update_progress');
}

function on_show_software_update() {
    $("#software_update-button-upgrade").addClass("disable-click");
    $("#checking-latest-available-version").show();
    $("#page-software_update-button-back").addClass("disable-click");
    $("#page-software_update-button-continue").addClass("disable-click");

    $("#software_update-status-ok-already_latest").addClass('hidden');
    $("#software_update-status-ok-latest_not_supported").addClass('hidden');
    $("#software_update-status-ok-update_available").addClass('hidden');
    $("#software_update-status-error").addClass('hidden');

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

        $("#software_update-version-latest").text(latest_release_version);
        let software_update_url = firmwareUpdatingBaseURL + latest_release_version;
        $("#software_update-url").val(software_update_url);

        $("#checking-latest-available-version").hide();
        $("#page-software_update-button-back").removeClass("disable-click");
        $("#page-software_update-button-continue").removeClass("disable-click");

        let current_version = $("#software_update-version-current").text();
        $("#software_update-status-error").addClass('hidden');

        if (!flagLatestFirmwareVersionSupported) {
            $("#software_update-status-ok-latest_not_supported").removeClass("hidden");
        } else {
            if (current_version === latest_release_version) {
                $("#software_update-status-ok-already_latest").removeClass("hidden");
            } else {
                $("#software_update-status-ok-update_available").removeClass("hidden");
                $("#software_update-button-upgrade").removeClass("disable-click");
            }
        }
    }).fail(function ($xhr) {
        $("#checking-latest-available-version").hide();
        $("#page-software_update-button-back").removeClass("disable-click");
        $("#page-software_update-button-continue").removeClass("disable-click");
        let data = $xhr.responseJSON;
        $("#software_update-status-error").removeClass('hidden');
        $("#software_update-status-ok-already_latest").addClass('hidden');
        $("#software_update-status-ok-update_available").addClass('hidden');
    });
}

function on_show_software_update_progress() {
    $("#page-software_update_progress-button-back").addClass("disable-click");
    $("#page-software_update_progress-button-refresh").addClass("disable-click");
}

function on_custom_connection_type_changed() {
    let custom_connection_type = $("input[name='custom_connection']:checked").val();
    if (custom_connection_type === undefined) {
        $(`input:radio[name='custom_connection'][value='use_http']`).prop('checked', true);
        custom_connection_type = $("input[name='custom_connection']:checked").val();
    }
    if (custom_connection_type === 'use_http') {
        $('#conf-settings-http').slideDown();
        $('#conf-settings-mqtt').slideUp();
    }
    if (custom_connection_type === 'use_mqtt') {
        $('#conf-settings-mqtt').slideDown();
        $('#conf-settings-http').slideUp();
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
    let filtering = $("input[name='filtering']:checked").val();
    if (filtering === "0") {
        $('#page-scanning-all_nearby_beacons-scanning_options').slideDown();
    } else if (filtering === "1") {
        $('#page-scanning-all_nearby_beacons-scanning_options').slideUp();
        $("#use_coded_phy")[0].checked = false;
        $("#use_1mbit_phy")[0].checked = true;
        $("#use_extended_payload")[0].checked = true;
        $("#use_channel_37")[0].checked = true;
        $("#use_channel_38")[0].checked = true;
        $("#use_channel_39")[0].checked = true;
    } else if (filtering === "2") {
        $('#page-scanning-all_nearby_beacons-scanning_options').slideUp();
        $("#use_coded_phy")[0].checked = true;
        $("#use_1mbit_phy")[0].checked = true;
        $("#use_extended_payload")[0].checked = true;
        $("#use_channel_37")[0].checked = true;
        $("#use_channel_38")[0].checked = true;
        $("#use_channel_39")[0].checked = true;
    }
}

$(document).ready(function () {
    // Set initial hash to help back button navigation
    window.location.hash = 'page-welcome';

    window.onpopstate = function (event) {
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

    $('.btn-dropdown').click(function (e) {
        let id = $(this).attr('id');
        let base_id = id.substring(0, id.lastIndexOf('-'));
        let dropdown_id = '#' + base_id + '-dropdown';
        if ($(this).children('div.btn-dropdown-arrow-down').is(":hidden")) {
            $(this).children('div.btn-dropdown-arrow-up').hide();
            $(this).children('div.btn-dropdown-arrow-down').show();
            $(dropdown_id).fadeOut();
        } else {
            $(this).children('div.btn-dropdown-arrow-down').hide();
            $(this).children('div.btn-dropdown-arrow-up').show();
            $(dropdown_id).fadeIn();
        }
    });

    $('#page-cloud_options-advanced-button').click(function (e) {
        let id = $(this).attr('id');
        let base_id = id.substring(0, id.lastIndexOf('-'));
        let arrow_up_id = '#' + base_id + '-button div.btn-dropdown-arrow-up';
        if ($(arrow_up_id).is(":hidden")) {
            $("#use_ruuvi")[0].checked = true;
        }
    });

    $('.btn-back').click(function (e) {
        e.preventDefault();
        console.log("on click: .btn-back");
        window.history.back();
    });

    $('#page-welcome-button-get-started').click(function (e) {
        e.preventDefault();
        change_url('page-connection_type');
    });

    $('#page-cloud_options-button-continue').click(function (e) {
        e.preventDefault();
        let connection_type = $("input[name='connection_type']:checked").val();
        if (connection_type === 'ruuvi') {
            save_config();
            change_url('page-finished');
        } else {
            change_url('page-custom_server');
        }
    });

    $('#page-custom_server-button-continue').click(function (e) {
        e.preventDefault();
        change_url('page-scanning');
    });

    $('#page-scanning-button-continue').click(function (e) {
        e.preventDefault();
        change_url('page-settings_lan_auth');
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
        save_config();
        change_url('page-finished');
    });

    $('#page-update_schedule-button-continue').click(function (e) {
        e.preventDefault();
        change_url('page-cloud_options');
    });

    $('#page-connection_type-button-continue').click(function (e) {
        e.preventDefault();
        let network_type = $("input[name='network_type']:checked").val();
        if (network_type === 'wifi')
            change_url('page-wifi_list');
        else
            change_url('cable_settings');
    });

    $('#page-wifi_list-button-back').click(function (e) {
        e.preventDefault();
        console.log("on click: #page-wifi_list-button-back");
        stopRefreshAP();
        selectedSSID = "";
        $.ajax({
            url: '/connect.json',
            dataType: 'json',
            method: 'DELETE',
            cache: false,
            data: {'timestamp': Date.now()}
        });
        startCheckStatus();
    });

    $('#page-wifi_list-button-continue').click(function (e) {
        e.preventDefault();
        let ssid = $('#manual_ssid').val();
        let isAuthNeeded = selected_wifi_auth_required(ssid);
        let password = isAuthNeeded ? $('#pwd').val() : null;
        $('#page-wifi_list-button-continue').addClass('disable-click');
        performConnect(ssid, password);
    });

    $('#page-cable_settings-button-back').click(function (e) {
        e.preventDefault();
        selectedSSID = "";
        $.ajax({
            url: '/connect.json',
            dataType: 'json',
            method: 'DELETE',
            cache: false,
            data: {'timestamp': Date.now()}
        });
        startCheckStatus();
    });

    $('#page-cable_settings-button-continue').click(function (e) {
        e.preventDefault();
        $('#page-cable_settings-ask_user').show();
        $('#page-cable_settings-button-continue').addClass("disable-click");
        performConnect(null, null);
    });

    $('#page-software_update-button-continue').click(function (e) {
        e.preventDefault();
        change_url_update_schedule();
    });

    $('#page-software_update_progress-button-refresh').click(function (e) {
        e.preventDefault();
        location.reload();
    });

    $('#software_update-button-upgrade').click(function (e) {
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

    $('#page-scanning').bind('onShow', function () {
        on_settings_scan_filtering_changed();
    });

    $("input[name='filtering']").change(function (e) {
        on_settings_scan_filtering_changed();
    });

    $('#page-connection_type').bind('onShow', function () {
        console.log("onShow: #page-connection_type");
        stopRefreshAP();
    });

    $('#page-wifi_list').bind('onShow', function () {
        console.log("onShow: #page-wifi_list");
        $('#page-wifi_list-button-continue').removeClass("disable-click");
        startRefreshAP();
    });

    $('#cable_settings').bind('onShow', function () {
        $('#page-cable_settings-ask_user').hide();
        $('#page-cable_settings-button-continue').removeClass("disable-click");
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

    $('#page-finished').bind('onShow', function () {
        console.log("onShow: #page-finished");
        stopCheckStatus();
        stopRefreshAP();
    });

    $("input[name='custom_connection']").change(function (e) {
        on_custom_connection_type_changed();
    });

    $('#page-custom_server').bind('onShow', function () {
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
    $('#mqtt_prefix').on("input", function () {
        on_edit_mqtt_settings();
    });

    $('#show_mqtt_examples').change(function () {
        if (this.checked) {
            $('#mqtt_examples').slideDown();
        } else {
            $('#mqtt_examples').slideUp();
        }
    });

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

    $('#update_schedule').bind('onShow', function () {
        on_auto_update_cycle_changed();
        on_edit_automatic_update_settings();
    });

    $("input[name='auto_update_cycle']").change(function (e) {
        on_auto_update_cycle_changed();
        on_edit_automatic_update_settings();
    });

    $('.checkbox-weekday').change(function () {
        if (this.checked) {
            $(this).parent().removeClass('btn-weekday-disabled');
        } else {
            $(this).parent().addClass('btn-weekday-disabled');
        }
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

    $('#page-settings_lan_auth').bind('onShow', function () {
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

    $('#page-wifi_list-radio-connect_manually').change(function (e) {
        $('.wifi_password').css('height', 0);
        $('#input_ssid_block').show();
        $('#input_password_block').show();
        let div_page_wifi_list_ssid_password = $('#page-wifi_list-ssid_password');
        let div_ssid_password_wrap = $('#page-wifi_list-ssid_password-wrap');
        let wifi_password_position = div_ssid_password_wrap.position();
        div_ssid_password_wrap.css('height', div_page_wifi_list_ssid_password.height());
        div_page_wifi_list_ssid_password.css('top', wifi_password_position.top);
        div_page_wifi_list_ssid_password.show();
        $('#manual_ssid').val("");
        $('#pwd').val("");
    });

    $("#wifi-overlay-button-cancel").click(function () {
        selectedSSID = "";
        $('#wifi-overlay').fadeOut();
        startRefreshAP();
    });

    $("#wifi-overlay-button-connect").click(function () {
        let ssid = $('#manual_ssid').val();
        let password = $("#pwd").val();
        performConnect(ssid, password);
    });

    $("#wifi-overlay-connection-failed-button-ok").click(function () {
        $("#wifi-overlay-connection-failed").hide();
        $('#wifi-overlay').fadeOut();
        startRefreshAP();
    })

    $('#software_update').bind('onShow', function () {
        console.log("onShow: #software_update");
        stopRefreshAP();
        on_show_software_update();
    });

    $('#software_update-set-url-manually').change(function (e) {
        if ($('#software_update-set-url-manually')[0].checked) {
            $('#software_update-url-manual').slideDown();
            $("#software_update-button-upgrade").removeClass("disable-click");
        } else {
            $('#software_update-url-manual').slideUp();
            if (!flagLatestFirmwareVersionSupported) {
                $("#software_update-button-upgrade").addClass("disable-click");
            }
        }
    });

    $('#software_update_progress').bind('onShow', function () {
        on_show_software_update_progress();
    });

    $("#checking-latest-available-version-button-cancel").click(function () {
        $('#checking-latest-available-version').hide();
        $("#page-software_update-button-back").removeClass("disable-click");
        $("#page-software_update-button-continue").removeClass("disable-click");
    });

    // first time the page loads: attempt get the connection status
    startCheckStatus();
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
    $("#page-wifi_list-list_of_ssid label input").change(function() {
        let ssid = $(this).val();
        let isAuthNeeded = selected_wifi_auth_required(ssid);

        $('#manual_ssid').val(ssid);
        $('#pwd').val("");

        $('#input_ssid_block').hide();
        if (isAuthNeeded) {
            $('#input_password_block').show();
        } else {
            $('#input_password_block').hide();
        }

        let div_page_wifi_list_ssid_password = $('#page-wifi_list-ssid_password');
        let div_wifi_password = $(this).parent().parent().children(".wifi_password");

        $('.wifi_password').css('height', 0);
        $('#page-wifi_list-ssid_password-wrap').css('height', 0);
        div_wifi_password.css('height', div_page_wifi_list_ssid_password.height());
        let wifi_password_position = div_wifi_password.position();
        div_page_wifi_list_ssid_password.css('top', wifi_password_position.top);
        div_page_wifi_list_ssid_password.show();
    });
    // $(".wifi_select").change(function () {
    //     console.log('on change: .wifi_select');
    // });

    // $('.wifi-list a').click(function (e) {
    //     e.preventDefault();
    //     let ssid = $(this).text();
    //     let isAuthNeeded = selected_wifi_auth_required(ssid);
    //     $(".wifi-network-name").text(ssid);
    //     showWiFiOverlay(ssid, isAuthNeeded);
    //     if (!isAuthNeeded) {
    //         saveConfigAndPerformConnect(ssid, null);
    //     }
    // });
}

function performConnect(ssid, password) {
    selectedSSID = ssid;
    $(".wifi-network-name").text(ssid);

    $('#manual_ssid').onkeyup = null;
    $('#pwd').onkeyup = null;

    let req_connect_header = null;
    if (ssid) {
        req_connect_header = {'X-Custom-ssid': ssid, 'X-Custom-pwd': password};
    }

    flagWaitingNetworkConnection = true;
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
                //now we can re-set the intervals regardless of result
                startCheckStatus();
            },
            error: function (request, status, error) {
                $('#wifi-overlay-connection-failed-description').text('HTTP error: ' + status + ', ' + 'Status: ' + request.status + '(' + request.statusText + ')' + ', ' + request.responseText);
                $("#wifi-overlay-connection-failed").show();
                //now we can re-set the intervals regardless of result
                startCheckStatus();
            }
        }
    );
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

                apList = data;

                refreshAPHTML(apList);
            }
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

// Refresh wifi selection list
function refreshAPHTML(data) {
    let is_manual_wifi = false;
    let selected_wifi_radio_button = $('input[name="wifi-name"]:checked');
    let selected_wifi_ssid = selected_wifi_radio_button.val();
    if (selected_wifi_radio_button[0] && selected_wifi_radio_button[0].id) {
        is_manual_wifi = true;
    }

    let div_page_wifi_list_ssid_password = $('#page-wifi_list-ssid_password');
    if (selected_wifi_ssid) {
        let isAuthNeeded = selected_wifi_auth_required(selected_wifi_ssid);
        $('#input_ssid_block').hide();
        if (isAuthNeeded) {
            $('#input_password_block').show();
        } else {
            $('#input_password_block').hide();
        }
        div_page_wifi_list_ssid_password.show();
    }

    let h = "";
    h += '<div class="border"></div>';
    h += "\n";
    data.forEach(function (e, idx, array) {
        h += '<div>';
        h += '<label class="control control-radio">';
        h += '    <div style="display: flex">';
        h += '        <div>{0}</div>'.format(e.ssid);
        h += '        <div style="margin-left: auto;" class="{0}"></div>'.format(e.auth === 0 ? '' : 'pw');
        h += '        <div class="{0}"></div>'.format(rssiToIcon(e.rssi));
        h += '    </div>';
        h += '    <input value="{0}" name="wifi-name" type="radio">'.format(e.ssid);
        h += '    <span class="control_indicator"></span>';
        h += '</label>';
        if (selected_wifi_ssid && selected_wifi_ssid === e.ssid) {
            h += '<div style="height: {0}px" class="wifi_password"></div>'.format(div_page_wifi_list_ssid_password.height());
        } else {
            h += '<div class="wifi_password"></div>';
        }
        h += '<div class="border"></div>';
        h += '</div>';
        h += "\n";
    });

    $("#page-wifi_list-list_of_ssid").html(h);

    initWifiList();
    if (!is_manual_wifi) {
        $('input[name="wifi-name"][value="' + selected_wifi_ssid + '"]').prop('checked', true);
    }
}

function onGetStatusJson(data) {
    if (data.hasOwnProperty('extra')) {
        let data_extra = data['extra'];
        let fw_updating_stage = data_extra['fw_updating'];
        let fw_updating_percentage = data_extra['percentage'];
        if (fw_updating_stage > 0) {
            if (!$('#software_update_progress').is(':visible')) {
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
                    $("#page-software_update_progress-button-refresh").removeClass("disable-click");
                    stopCheckStatus();
                    break;
                case 6: // completed unsuccessfully
                    $("#software_update_progress-status-completed_unsuccessfully").removeClass("hidden");
                    $('#software_update_progress-status-completed_unsuccessfully-message').text(data_extra['message']);
                    $("#page-software_update_progress-button-back").removeClass("disable-click");
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
                        if (!flagNetworkConnected)
                        {
                            flagNetworkConnected = true;
                            on_network_connected_wifi();
                        }
                        if (flagWaitingNetworkConnection) {
                            change_url_update_schedule();
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
                $("#connect-details h1").text('');
                $("#ip").text('0.0.0.0');
                $("#netmask").text('0.0.0.0');
                $("#gw").text('0.0.0.0');

                switch (connectionState) {
                    case CONNECTION_STATE.NOT_CONNECTED:
                        break;
                    case CONNECTION_STATE.CONNECTING:
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
                    if (!flagNetworkConnected)
                    {
                        flagNetworkConnected = true;
                        on_network_connected_wifi();
                    }
                    if (flagWaitingNetworkConnection) {
                        change_url_update_schedule();
                    }
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
                    if (!flagNetworkConnected)
                    {
                        flagNetworkConnected = true;
                        on_network_connected_eth();
                    }
                    if (flagWaitingNetworkConnection) {
                        change_url_update_schedule();
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

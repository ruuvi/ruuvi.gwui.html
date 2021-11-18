let gw_mac = "";
let g_flag_lan_auth_pass_changed = false;
const MQTT_PREFIX_MAX_LENGTH = 256;

const LAN_AUTH_TYPE = Object.freeze({
    'DENY': 'lan_auth_deny',
    'RUUVI': 'lan_auth_ruuvi',
    'DIGEST': 'lan_auth_digest',
    'BASIC': 'lan_auth_basic',
    'ALLOW': 'lan_auth_allow'
});

const MQTT_TRANSPORT_TYPE = Object.freeze({
    'TCP': 'TCP',
    'SSL': 'SSL',
    'WS': 'WS',
    'WSS': 'WSS',
});

const AUTO_UPDATE_CYCLE_TYPE = Object.freeze({
    'REGULAR': 'regular',
    'BETA_TESTER': 'beta',
    'MANUAL': 'manual',
});

function get_mqtt_topic_prefix() {
    let mqtt_topic = "";
    if ($('#use_mqtt_prefix_ruuvi').prop('checked')) {
        mqtt_topic += 'ruuvi';
    }
    if ($('#use_mqtt_prefix_gw_mac').prop('checked')) {
        if (mqtt_topic.length > 0) {
            mqtt_topic += '/';
        }
        mqtt_topic += gw_mac;
    }
    let flag_add_trailing_slash = mqtt_topic.length > 0;
    if ($('#use_mqtt_prefix_custom').prop('checked')) {
        let mqtt_prefix_custom = $("#mqtt_prefix_custom").val();
        if (mqtt_prefix_custom.length > 0) {
            flag_add_trailing_slash = /[a-zA-Z0-9]/.test(mqtt_prefix_custom.slice(-1));
            if (mqtt_topic.length > 0) {
                mqtt_topic += '/';
            }
            let suffix_len = flag_add_trailing_slash ? 1 : 0;
            if ((mqtt_topic.length + mqtt_prefix_custom.length + suffix_len) >= MQTT_PREFIX_MAX_LENGTH) {
                if (mqtt_topic.length >= MQTT_PREFIX_MAX_LENGTH) {
                    mqtt_prefix_custom = "";
                } else {
                    mqtt_prefix_custom = mqtt_prefix_custom.substring(0, MQTT_PREFIX_MAX_LENGTH - mqtt_topic.length - suffix_len);
                }
                $("#mqtt_prefix_custom").val(mqtt_prefix_custom);
            }
            mqtt_topic += mqtt_prefix_custom;
        }
    }
    if (flag_add_trailing_slash) {
        mqtt_topic += '/';
    }
    return mqtt_topic;
}

function save_config_internal(flag_save_network_cfg, cb_on_success, cb_on_error) {
    //stop the status refresh. This prevents a race condition where a status
    //request would be refreshed with wrong ip info from a previous connection
    //and the request would automatically shows as successful.
    stopCheckStatus();

    //stop refreshing wifi list
    stopRefreshAP();

    if (g_checkStatusInProgress || g_refreshAPInProgress) {
        // postpone sending the ajax requests until "GET /status.json" and "GET /ap.json" are completed
        setTimeout(save_config_internal, 500, flag_save_network_cfg, cb_on_success, cb_on_error);
        return;
    }

    console.log("save_config");
    let network_type = $("input[name='network_type']:checked").val();
    let auto_update_cycle = $("input[name='auto_update_cycle']:checked").val();

    let data = {};

    if (flag_save_network_cfg) {
        data.use_eth = !(network_type === 'wifi');
        if (data.use_eth) {
            data.eth_dhcp = $("#eth_dhcp")[0].checked;
            if (!data.eth_dhcp) {
                data.eth_static_ip = $("#eth_static_ip").val()
                data.eth_netmask = $("#eth_netmask").val()
                data.eth_gw = $("#eth_gw").val()
                data.eth_dns1 = $("#eth_dns1").val()
                data.eth_dns2 = $("#eth_dns2").val()
            }
        }
    } else {
        data.use_mqtt = $("#use_mqtt")[0].checked;

        let mqtt_transport = $("input[name='mqtt_transport']:checked").val();
        if (mqtt_transport === "mqtt_transport_TCP") {
            data.mqtt_transport = MQTT_TRANSPORT_TYPE.TCP;
        } else if (mqtt_transport === "mqtt_transport_SSL") {
            data.mqtt_transport = MQTT_TRANSPORT_TYPE.SSL;
        } else if (mqtt_transport === "mqtt_transport_WS") {
            data.mqtt_transport = MQTT_TRANSPORT_TYPE.WS;
        } else if (mqtt_transport === "mqtt_transport_WSS") {
            data.mqtt_transport = MQTT_TRANSPORT_TYPE.WSS;
        } else {
            data.mqtt_transport = MQTT_TRANSPORT_TYPE.TCP;
        }

        data.mqtt_server = $("#mqtt_server").val();
        let mqtt_port = parseInt($("#mqtt_port").val())
        if (Number.isNaN(mqtt_port)) {
            mqtt_port = 0;
        }
        data.mqtt_port = mqtt_port;
        data.mqtt_prefix = get_mqtt_topic_prefix();
        data.mqtt_client_id = $("#mqtt_client_id").val();
        if (!data.mqtt_client_id) {
            data.mqtt_client_id = gw_mac;
        }
        data.mqtt_user = $("#mqtt_user").val();
        if (!flagUseSavedMQTTPassword) {
            data.mqtt_pass = $("#mqtt_pass").val();
        }

        data.use_http = $("#use_http")[0].checked;
        data.http_url = $("#http_url").val();
        data.http_user = $("#http_user").val();
        if (!flagUseSavedHTTPPassword) {
            data.http_pass = $("#http_pass").val();
        }

        data.use_http_stat = $("#use_http_stat")[0].checked;
        data.http_stat_url = $("#http_stat_url").val();
        data.http_stat_user = $("#http_stat_user").val();
        if (!flagUseSavedHTTPStatPassword) {
            data.http_stat_pass = $("#http_stat_pass").val();
        }

        if (g_flag_lan_auth_pass_changed) {
            data.lan_auth_type = $("input[name='lan_auth_type']:checked").val();
            let lan_auth_user = $("#lan_auth-user").val();
            let lan_auth_pass = $("#lan_auth-pass").val();
            let realm = 'RuuviGateway' + gw_mac.substr(12, 2) + gw_mac.substr(15, 2);
            if (data.lan_auth_type === 'lan_auth_deny') {
                data.lan_auth_user = null;
                data.lan_auth_pass = null;
            } else if (data.lan_auth_type === 'lan_auth_ruuvi') {
                data.lan_auth_user = lan_auth_user;
                data.lan_auth_pass = CryptoJS.MD5(lan_auth_user + ':' + realm + ':' + lan_auth_pass).toString();
            } else if (data.lan_auth_type === 'lan_auth_digest') {
                data.lan_auth_user = lan_auth_user;
                let raw_str = lan_auth_user + ':' + realm + ':' + lan_auth_pass;
                let auth_path_md5 = CryptoJS.MD5(raw_str);
                data.lan_auth_pass = auth_path_md5.toString();
            } else if (data.lan_auth_type === 'lan_auth_basic') {
                data.lan_auth_user = lan_auth_user;
                data.lan_auth_pass = btoa(lan_auth_user + ':' + lan_auth_pass);
            } else {
                data.lan_auth_type = 'lan_auth_allow';
                data.lan_auth_user = null;
                data.lan_auth_pass = null;
            }
        }

        data.use_filtering = ($("input[name='filtering']:checked").val() !== "0");

        data.use_coded_phy = $("#use_coded_phy")[0].checked;
        data.use_1mbit_phy = $("#use_1mbit_phy")[0].checked;
        data.use_extended_payload = $("#use_extended_payload")[0].checked;
        data.use_channel_37 = $("#use_channel_37")[0].checked;
        data.use_channel_38 = $("#use_channel_38")[0].checked;
        data.use_channel_39 = $("#use_channel_39")[0].checked;

        if (auto_update_cycle === "auto_update_cycle-regular") {
            data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.REGULAR;
        } else if (auto_update_cycle === "auto_update_cycle-beta") {
            data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.BETA_TESTER;
        } else if (auto_update_cycle === "auto_update_cycle-manual") {
            data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.MANUAL;
        } else {
            console.log("Unknown auto_update_cycle: " + auto_update_cycle);
            data.auto_update_cycle = AUTO_UPDATE_CYCLE_TYPE.REGULAR;
        }
        data.auto_update_weekdays_bitmask = 0;
        if ($('#conf-auto_update_schedule-button-sunday').is(":checked")) {
            data.auto_update_weekdays_bitmask |= 0x01;
        }
        if ($('#conf-auto_update_schedule-button-monday').is(":checked")) {
            data.auto_update_weekdays_bitmask |= 0x02;
        }
        if ($('#conf-auto_update_schedule-button-tuesday').is(":checked")) {
            data.auto_update_weekdays_bitmask |= 0x04;
        }
        if ($('#conf-auto_update_schedule-button-wednesday').is(":checked")) {
            data.auto_update_weekdays_bitmask |= 0x08;
        }
        if ($('#conf-auto_update_schedule-button-thursday').is(":checked")) {
            data.auto_update_weekdays_bitmask |= 0x10;
        }
        if ($('#conf-auto_update_schedule-button-friday').is(":checked")) {
            data.auto_update_weekdays_bitmask |= 0x20;
        }
        if ($('#conf-auto_update_schedule-button-saturday').is(":checked")) {
            data.auto_update_weekdays_bitmask |= 0x40;
        }
        data.auto_update_interval_from = parseInt($("#conf-auto_update_schedule-period_from").val());
        data.auto_update_interval_to = parseInt($("#conf-auto_update_schedule-period_to").val());
        data.auto_update_tz_offset_hours = parseInt($("#conf-auto_update_schedule-tz").val());
    }

    console.log(data);

    $.ajax({
        url: '/ruuvi.json',
        dataType: 'json',
        contentType: 'application/json',
        method: 'POST',
        cache: false,
        data: JSON.stringify(data),
        success: function (data, text) {
            let tmp = data;
            startCheckStatus();
            if (cb_on_success) {
                cb_on_success();
            }
        },
        error: function (request, status, error) {
            let request_status = request.status;
            let statusText = request.statusText;
            let responseText = request.responseText;
            startCheckStatus();
            if (cb_on_error) {
                cb_on_error();
            }
        }
    });
}

function save_config(cb_on_success, cb_on_error) {
    save_config_internal(false, cb_on_success, cb_on_error);
}

function save_network_config(cb_on_success, cb_on_error) {
    save_config_internal(true, cb_on_success, cb_on_error);
}

function on_edit_mqtt_settings() {
    let mqtt_use_prefix_ruuvi = $('#use_mqtt_prefix_ruuvi').prop('checked');
    let mqtt_use_prefix_gw_mac = $('#use_mqtt_prefix_gw_mac').prop('checked');
    let mqtt_use_prefix_custom = $('#use_mqtt_prefix_custom').prop('checked');
    let mqtt_prefix_custom = $("#mqtt_prefix_custom").val();

    let mqtt_prefix = get_mqtt_topic_prefix();
    mqtt_prefix += '<SENSOR_MAC_ADDRESS>';

    let mqtt_host = $('#mqtt_server').val();
    let mqtt_port = $('#mqtt_port').val();
    let mqtt_user = $('#mqtt_user').val();
    let mqtt_pass = $('#mqtt_pass').val();
    $("#mqtt_prefix").text(mqtt_prefix);


    let mosquitto_sub_cmd = `mosquitto_sub -h ${mqtt_host} -p ${mqtt_port}`;
    if (mqtt_user) {
        mosquitto_sub_cmd += ` -u ${mqtt_user}`;
    }
    if (mqtt_pass) {
        mosquitto_sub_cmd += ` -P ${mqtt_pass}`;
    }

    let prefix_ruuvi = mqtt_use_prefix_ruuvi ? "ruuvi" : "";

    {
        let mqtt_example1 = `${prefix_ruuvi}`;
        if (mqtt_use_prefix_gw_mac) {
            if (mqtt_example1) {
                mqtt_example1 += '/';
            }
            mqtt_example1 += gw_mac;
        }
        if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
            if (mqtt_example1) {
                mqtt_example1 += '/';
            }
            mqtt_example1 += mqtt_prefix_custom;
        }
        mqtt_example1 += '/gw_status';
        mqtt_example1 = `"${mqtt_example1}"`;
        $('#mqtt_example1').text(`${mosquitto_sub_cmd} -t ${mqtt_example1} -v`);
    }

    {
        let mqtt_example2 = `${prefix_ruuvi}`;
        if (mqtt_use_prefix_gw_mac) {
            if (mqtt_example2) {
                mqtt_example2 += '/';
            }
            mqtt_example2 += '+';
        }
        if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
            if (mqtt_example2) {
                mqtt_example2 += '/';
            }
            mqtt_example2 += '+';
        }
        mqtt_example2 += '/gw_status';
        mqtt_example2 = `"${mqtt_example2}"`;
        $('#mqtt_example2').text(`${mosquitto_sub_cmd} -t ${mqtt_example2} -v`);
    }

    {
        let mqtt_example3 = `${prefix_ruuvi}`;
        if (mqtt_use_prefix_gw_mac) {
            if (mqtt_example3) {
                mqtt_example3 += '/';
            }
            mqtt_example3 += '+';
        }
        if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
            if (mqtt_example3) {
                mqtt_example3 += '/';
            }
            mqtt_example3 += '+';
        }
        mqtt_example3 += '/<TAG_MAC>/#';
        mqtt_example3 = `"${mqtt_example3}"`;
        $('#mqtt_example3').text(`${mosquitto_sub_cmd} -t ${mqtt_example3} -v`);
    }

    {
        let mqtt_example4 = `${prefix_ruuvi}`;
        if (mqtt_use_prefix_gw_mac) {
            if (mqtt_example4) {
                mqtt_example4 += '/';
            }
            mqtt_example4 += `${gw_mac}`;
        }
        if (mqtt_use_prefix_custom && mqtt_prefix_custom) {
            if (mqtt_example4) {
                mqtt_example4 += '/';
            }
            mqtt_example4 += `${mqtt_prefix_custom}`;
        }
        mqtt_example4 += '/#';
        mqtt_example4 = `"${mqtt_example4}"`;
        $('#mqtt_example4').text(`${mosquitto_sub_cmd} -t ${mqtt_example4} -v`);
    }

    {
        let mqtt_example5 = `${prefix_ruuvi}`;
        if (mqtt_example5) {
            mqtt_example5 += '/';
        }
        mqtt_example5 += '#';
        mqtt_example5 = `"${mqtt_example5}"`;
        $('#mqtt_example5').text(`${mosquitto_sub_cmd} -t ${mqtt_example5} -v`);
    }
}

function get_config() {
    $.getJSON("/ruuvi.json", function (data) {
        if (data != null) {
            let use_eth = false;
            let use_http = false;
            let http_url = "";
            let http_user = "";
            let http_stat_user = "";
            let use_http_stat = false;
            let http_stat_url = "";
            let use_mqtt = false;
            let mqtt_user = "";
            let mqtt_prefix = "";
            let mqtt_client_id = "";
            let use_filtering = false;
            let use_coded_phy = false;
            const keys = Object.keys(data);
            for (let idx in keys) {
                let key = keys[idx];
                let key_value = data[key];
                switch (key) {
                    case "fw_ver":
                        $("#software_update-version-current").text(key_value);
                        break;
                    case "nrf52_fw_ver":
                        break;
                    case "use_eth":
                        use_eth = key_value
                        break;
                    case "eth_dhcp":
                        $("#eth_dhcp").prop('checked', key_value);
                        break;
                    case "eth_static_ip":
                        $("#eth_static_ip").val(key_value);
                        break;
                    case "eth_netmask":
                        $("#eth_netmask").val(key_value);
                        break;
                    case "eth_gw":
                        $("#eth_gw").val(key_value);
                        break;
                    case "eth_dns1":
                        $("#eth_dns1").val(key_value);
                        break;
                    case "eth_dns2":
                        $("#eth_dns2").val(key_value);
                        break;
                    case "use_http":
                        $("#use_http").prop('checked', key_value);
                        use_http = key_value;
                        break;
                    case "http_url":
                        $("#http_url").val(key_value);
                        http_url = key_value;
                        break;
                    case "http_user":
                        $("#http_user").val(key_value);
                        http_user = key_value;
                        break;
                    case "use_http_stat":
                        $("#use_http_stat").prop('checked', key_value);
                        use_http_stat = key_value;
                        break;
                    case "http_stat_url":
                        $("#http_stat_url").val(key_value);
                        http_stat_url = key_value;
                        break;
                    case "http_stat_user":
                        $("#http_stat_user").val(key_value);
                        http_stat_user = key_value;
                        break;
                    case "use_mqtt":
                        $("#use_mqtt").prop('checked', key_value);
                        use_mqtt = key_value
                        break;
                    case "mqtt_transport":
                        if (key_value === MQTT_TRANSPORT_TYPE.TCP) {
                            $("#mqtt_transport_TCP").prop('checked', true);
                        } else if (key_value === MQTT_TRANSPORT_TYPE.SSL) {
                            $("#mqtt_transport_SSL").prop('checked', true);
                        } else if (key_value === MQTT_TRANSPORT_TYPE.WS) {
                            $("#mqtt_transport_WS").prop('checked', true);
                        } else if (key_value === MQTT_TRANSPORT_TYPE.WSS) {
                            $("#mqtt_transport_WSS").prop('checked', true);
                        }
                        break;
                    case "mqtt_server":
                        if (key_value) {
                            $("#mqtt_server").val(key_value);
                        }
                        break;
                    case "mqtt_port":
                        if (key_value) {
                            $("#mqtt_port").val(key_value);
                        }
                        break;
                    case "mqtt_user":
                        $("#mqtt_user").val(key_value);
                        mqtt_user = key_value;
                        break;
                    case "mqtt_prefix":
                        mqtt_prefix = key_value;
                        break;
                    case "mqtt_client_id":
                        mqtt_client_id = key_value;
                        break;
                    case "lan_auth_type":
                        if (key_value === LAN_AUTH_TYPE.DENY) {
                            $("#lan_auth_type_deny").prop('checked', true);
                        } else if (key_value === LAN_AUTH_TYPE.RUUVI) {
                            $("#lan_auth_type_ruuvi").prop('checked', true);
                        } else if (key_value === LAN_AUTH_TYPE.DIGEST) {
                            $("#lan_auth_type_digest").prop('checked', true);
                        } else if (key_value === LAN_AUTH_TYPE.BASIC) {
                            $("#lan_auth_type_basic").prop('checked', true);
                        } else {
                            $("#lan_auth_type_allow").prop('checked', true);
                        }
                        break;
                    case "lan_auth_user": {
                        let lan_auth_user = $("#lan_auth-user");
                        let lan_auth_pass = $("#lan_auth-pass");
                        if (key_value) {
                            lan_auth_user.val(key_value);
                            lan_auth_pass.val('');
                            lan_auth_pass.attr('placeholder', '********');
                            g_flag_lan_auth_pass_changed = false;
                        } else {
                            lan_auth_user.val('');
                            lan_auth_pass.val('');
                            lan_auth_pass.removeAttr('placeholder');
                            g_flag_lan_auth_pass_changed = true;
                        }
                        break;
                    }
                    case "lan_auth_default": {
                        if (key_value) {
                            $('input#lan_auth-pass').attr('placeholder', "XX:XX:XX:XX:XX:XX:XX:XX");
                        } else {
                            $('input#lan_auth-pass').attr('placeholder', "********");
                        }
                        break;
                    }
                    case "auto_update_cycle": {
                        if (key_value === AUTO_UPDATE_CYCLE_TYPE.REGULAR) {
                            $("#auto_update_cycle-regular").prop('checked', true);
                        } else if (key_value === AUTO_UPDATE_CYCLE_TYPE.BETA_TESTER) {
                            $("#auto_update_cycle-beta").prop('checked', true);
                        } else if (key_value === AUTO_UPDATE_CYCLE_TYPE.MANUAL) {
                            $("#auto_update_cycle-manual").prop('checked', true);
                        } else {
                            $("#auto_update_cycle-regular").prop('checked', true);
                        }
                        break;
                    }
                    case "auto_update_weekdays_bitmask": {
                        let weekdays_bitmask = parseInt(key_value);
                        $("#conf-auto_update_schedule-button-sunday").prop('checked', (weekdays_bitmask & 0x01) !== 0).change();
                        $("#conf-auto_update_schedule-button-monday").prop('checked', (weekdays_bitmask & 0x02) !== 0).change();
                        $("#conf-auto_update_schedule-button-tuesday").prop('checked', (weekdays_bitmask & 0x04) !== 0).change();
                        $("#conf-auto_update_schedule-button-wednesday").prop('checked', (weekdays_bitmask & 0x08) !== 0).change();
                        $("#conf-auto_update_schedule-button-thursday").prop('checked', (weekdays_bitmask & 0x10) !== 0).change();
                        $("#conf-auto_update_schedule-button-friday").prop('checked', (weekdays_bitmask & 0x20) !== 0).change();
                        $("#conf-auto_update_schedule-button-saturday").prop('checked', (weekdays_bitmask & 0x40) !== 0).change();
                        break;
                    }
                    case "auto_update_interval_from": {
                        $('#conf-auto_update_schedule-period_from option[value=' + key_value + ']').prop('selected', true);
                        break;
                    }
                    case "auto_update_interval_to": {
                        $('#conf-auto_update_schedule-period_to option[value=' + key_value + ']').prop('selected', true);
                        break;
                    }
                    case "auto_update_tz_offset_hours": {
                        $('#conf-auto_update_schedule-tz option[value=' + key_value + ']').prop('selected', true);
                        break;
                    }
                    case "coordinates":
                        $("#coordinates").val(key_value);
                        break;
                    case "use_filtering": {
                        use_filtering = key_value;
                        break;
                    }
                    case "company_id":
                        break;
                    case "gw_mac":
                        gw_mac = key_value;
                        break;
                    case "use_coded_phy":
                        use_coded_phy = key_value;
                        break;
                    case "use_1mbit_phy":
                        $("#use_1mbit_phy").prop('checked', key_value);
                        break;
                    case "use_extended_payload":
                        $("#use_extended_payload").prop('checked', key_value);
                        break;
                    case "use_channel_37":
                        $("#use_channel_37").prop('checked', key_value);
                        break;
                    case "use_channel_38":
                        $("#use_channel_38").prop('checked', key_value);
                        break;
                    case "use_channel_39":
                        $("#use_channel_39").prop('checked', key_value);
                        break;
                    default:
                        alert('get_config: unhandled key: ' + key);
                        break;
                }
            }
            if (use_eth) {
                $("#network_type_wifi").prop('checked', false);
                $("#network_type_cable").prop('checked', true);
            } else {
                $("#network_type_cable").prop('checked', false);
                $("#network_type_wifi").prop('checked', true);
            }
            let flag_use_ruuvi_cloud_with_default_options = !use_mqtt &&
                (use_http && (http_url === "https://network.ruuvi.com/record") && (http_user === "")) &&
                (use_http_stat && (http_stat_url === "https://network.ruuvi.com/status") && (http_stat_user === "")) &&
                (use_filtering && !use_coded_phy);
            if (flag_use_ruuvi_cloud_with_default_options) {
                $("#use_custom").prop('checked', false);
                $("#use_ruuvi").prop('checked', true);
            } else {
                $("#use_ruuvi").prop('checked', false);
                $("#use_custom").prop('checked', true);
            }
            if (http_user) {
                flagUseSavedHTTPPassword = true;
                $("#http_pass").val("********");
            }
            if (http_stat_user) {
                flagUseSavedHTTPStatPassword = true;
                $("#http_stat_pass").val("********");
            }
            if (mqtt_user) {
                flagUseSavedMQTTPassword = true;
                $("#mqtt_pass").val("********");
            }

            $("#use_coded_phy").prop('checked', use_coded_phy);
            if (!use_filtering) {
                $(`input:radio[name='filtering'][value='0']`).prop('checked', true);
            } else {
                if (use_coded_phy) {
                    $(`input:radio[name='filtering'][value='2']`).prop('checked', true);
                } else {
                    $(`input:radio[name='filtering'][value='1']`).prop('checked', true);
                }
                $("#use_1mbit_phy").prop('checked', true);
                $("#use_extended_payload").prop('checked', true);
                $("#use_channel_37").prop('checked', true);
                $("#use_channel_38").prop('checked', true);
                $("#use_channel_39").prop('checked', true);
            }
            if (!mqtt_prefix) {
                $('#use_mqtt_prefix_ruuvi').prop('checked', false);
                $('#use_mqtt_prefix_gw_mac').prop('checked', false);
                $('#use_mqtt_prefix_custom').prop('checked', false);
            } else {
                let start_idx = 0;
                let prefix_ruuvi = 'ruuvi';
                let mqtt_topic = mqtt_prefix;
                if ((mqtt_topic === prefix_ruuvi) || mqtt_topic.startsWith(prefix_ruuvi + '/')) {
                    $('#use_mqtt_prefix_ruuvi').prop('checked', true);
                    start_idx = prefix_ruuvi.length;
                    if (mqtt_topic[start_idx] === '/') {
                        start_idx += 1;
                    }
                } else {
                    $('#use_mqtt_prefix_ruuvi').prop('checked', false);
                }
                mqtt_topic = mqtt_topic.substr(start_idx);
                start_idx = 0;
                if ((mqtt_topic === gw_mac) || mqtt_topic.startsWith(gw_mac + '/')) {
                    $('#use_mqtt_prefix_gw_mac').prop('checked', true);
                    start_idx = gw_mac.length;
                    if (mqtt_topic[start_idx] === '/') {
                        start_idx += 1;
                    }
                } else {
                    $('#use_mqtt_prefix_gw_mac').prop('checked', false);
                }
                mqtt_topic = mqtt_topic.substr(start_idx);
                if (mqtt_topic.length > 0) {
                    if (mqtt_topic.slice(-1) === '/') {
                        if (mqtt_topic.length > 1) {
                            if (/[a-zA-Z0-9]/.test(mqtt_topic.slice(-2, -1))) {
                                mqtt_topic = mqtt_topic.slice(0, -1);
                            }
                        }
                    }
                }
                $("#mqtt_prefix_custom").val(mqtt_topic);
                if (mqtt_topic.length > 0) {
                    $('#use_mqtt_prefix_custom').prop('checked', true);
                } else {
                    $('#use_mqtt_prefix_custom').prop('checked', false);
                }
            }
            if (!mqtt_client_id) {
                mqtt_client_id = gw_mac;
            }
            $("#mqtt_client_id").val(mqtt_client_id);
            on_edit_mqtt_settings();
        }
    });
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            msg = "Error: Geolocation not allowed."
            console.log(msg)
            alert(msg)
            break;
        case error.POSITION_UNAVAILABLE:
            msg = "Location information is unavailable."
            console.log(msg)
            alert(msg)
            break;
        case error.TIMEOUT:
            msg = "The request to get user location timed out."
            console.log(msg)
            alert(msg)
            break;
        case error.UNKNOWN_ERROR:
            msg = "An unknown error occurred."
            console.log(msg)
            alert(msg)
            break;
    }
}


$(document).ready(function () {
    //get configuration from flash and fill the web page
    get_config();
});
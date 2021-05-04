let mqtt_pass_changed = false;
let gw_mac = "";
let g_flag_lan_auth_pass_changed = false;

const LAN_AUTH_TYPE = Object.freeze({
    'RUUVI': 'lan_auth_ruuvi',
    'DIGEST': 'lan_auth_digest',
    'BASIC': 'lan_auth_basic',
    'NONE': 'lan_auth_none'
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
    if ($('#use_mqtt_prefix_custom').prop('checked')) {
        if (mqtt_topic.length > 0) {
            mqtt_topic += '/';
        }
        mqtt_topic += $("#mqtt_prefix_custom").val();
    }
    return mqtt_topic;
}

function save_config() {
    console.log("save_config");
    let custom_conn = $("input[name='custom_connection']:checked").val();

    let network_type = $("input[name='network_type']:checked").val();

    console.log(custom_conn);

    let data = {};
    data.use_eth = !(network_type === 'wifi');
    if (data.use_eth) {
        data.eth_dhcp = $("#eth_dhcp")[0].checked;
        if (!data.eth_dhcp)
        {
            data.eth_static_ip = $("#eth_static_ip").val()
            data.eth_netmask = $("#eth_netmask").val()
            data.eth_gw = $("#eth_gw").val()
            data.eth_dns1 = $("#eth_dns1").val()
            data.eth_dns2 = $("#eth_dns2").val()
        }
    }

    data.use_mqtt = (custom_conn === 'use_mqtt');
    data.mqtt_server = $("#mqtt_server").val();
    let mqtt_port = parseInt($("#mqtt_port").val())
    if (Number.isNaN(mqtt_port)) {
        mqtt_port = 0;
    }
    data.mqtt_port = mqtt_port;
    data.mqtt_prefix = get_mqtt_topic_prefix();
    data.mqtt_user = $("#mqtt_user").val();
    data.mqtt_pass = $("#mqtt_pass").val();

    data.use_http = (custom_conn === 'use_http');
    data.http_url = $("#http_url").val();
    data.http_user = $("#http_user").val();
    data.http_pass = $("#http_pass").val();

    if (g_flag_lan_auth_pass_changed) {
        data.lan_auth_type = $("input[name='lan_auth_type']:checked").val();
        let lan_auth_user = $("#lan_auth-user").val();
        let lan_auth_pass = $("#lan_auth-pass").val();
        let realm = 'RuuviGateway' + gw_mac.substr(12, 2) + gw_mac.substr(15, 2);
        if (data.lan_auth_type === 'lan_auth_ruuvi') {
            data.lan_auth_user = lan_auth_user;
            data.lan_auth_pass = CryptoJS.MD5(lan_auth_user + ':' + realm + ':' + lan_auth_pass).toString();
        } else if (data.lan_auth_type === 'lan_auth_digest') {
            data.lan_auth_user = lan_auth_user;
            data.lan_auth_pass = CryptoJS.MD5(lan_auth_user + ':' + realm + ':' + lan_auth_pass).toString();
        } else if (data.lan_auth_type === 'lan_auth_basic') {
            data.lan_auth_user = lan_auth_user;
            data.lan_auth_pass = btoa(lan_auth_user + ':' + lan_auth_pass);
        } else {
            data.lan_auth_type = 'lan_auth_none';
            data.lan_auth_user = null;
            data.lan_auth_pass = null;
        }
    }

    data.use_filtering = ($("input[name='filtering']:checked").val() === "1");

    //data.coordinates = $("#coordinates").val();  // Removed from v1

    data.use_coded_phy = $("#use_coded_phy")[0].checked;
    data.use_1mbit_phy = $("#use_1mbit_phy")[0].checked;
    data.use_extended_payload = $("#use_extended_payload")[0].checked;
    data.use_channel_37 = $("#use_channel_37")[0].checked;
    data.use_channel_38 = $("#use_channel_38")[0].checked;
    data.use_channel_39 = $("#use_channel_39")[0].checked;

    console.log(data);

    $.ajax({
        url: '/ruuvi.json',
        dataType: 'json',
        contentType: 'application/json',
        method: 'POST',
        cache: false,
        data: JSON.stringify(data)
    });
}

function on_edit_mqtt_settings() {
    let mqtt_topic = get_mqtt_topic_prefix();
    if (mqtt_topic.length > 0) {
        mqtt_topic += '/';
    } else {
        $('#use_mqtt_prefix_ruuvi').prop('checked', true);
        mqtt_topic = get_mqtt_topic_prefix();
        mqtt_topic += '/';
    }
    mqtt_topic += '<TAG_MAC>';
    $("#mqtt_prefix").text(mqtt_topic);

    let mqtt_use_prefix_ruuvi = $('#use_mqtt_prefix_ruuvi').prop('checked');
    let mqtt_use_prefix_gw_mac = $('#use_mqtt_prefix_gw_mac').prop('checked');
    let mqtt_use_prefix_custom = $('#use_mqtt_prefix_custom').prop('checked');

    if (mqtt_use_prefix_custom) {
        $('#mqtt_prefix_custom_tr').slideDown("fast", function () {
        });
    } else {
        $('#mqtt_prefix_custom_tr').slideUp("fast", function () {
        });
    }

    let mqtt_host = $('#mqtt_server').val();
    let mqtt_port = $('#mqtt_port').val();
    let mqtt_user = $('#mqtt_user').val();
    let mqtt_pass = $('#mqtt_pass').val();
    let mqtt_prefix_custom = $("#mqtt_prefix_custom").val();

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
        if (mqtt_use_prefix_custom) {
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
        if (mqtt_use_prefix_custom) {
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
        if (mqtt_use_prefix_custom) {
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
        if (mqtt_use_prefix_custom) {
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
            let use_mqtt = false;
            let http_url = "";
            let mqtt_prefix = "";
            const keys = Object.keys(data);
            for (let idx in keys) {
                let key = keys[idx];
                let key_value = data[key];
                switch (key) {
                    case "use_eth":
                        use_eth = key_value
                        break;
                    case "eth_dhcp":
                        $("#eth_dhcp")[0].checked = key_value;
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
                        $("#use_http")[0].checked = key_value;
                        use_http = key_value;
                        break;
                    case "http_url":
                        $("#http_url").val(key_value);
                        http_url = key_value;
                        break;
                    case "http_user":
                        $("#http_user").val(key_value);
                        break;
                    case "use_mqtt":
                        $("#use_mqtt")[0].checked = key_value;
                        use_mqtt = key_value
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
                        break;
                    case "mqtt_prefix":
                        mqtt_prefix = key_value;
                        break;
                    case "lan_auth_type":
                        if (key_value === LAN_AUTH_TYPE.RUUVI) {
                            $("#lan_auth_type_ruuvi")[0].checked = true;
                        } else if (key_value === LAN_AUTH_TYPE.DIGEST) {
                            $("#lan_auth_type_digest")[0].checked = true;
                        } else if (key_value === LAN_AUTH_TYPE.BASIC) {
                            $("#lan_auth_type_basic")[0].checked = true;
                        } else {
                            $("#lan_auth_type_none")[0].checked = true;
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
                    case "coordinates":
                        $("#coordinates").val(key_value);
                        break;
                    case "use_filtering": {
                        let value = key_value ? "1" : "0";
                        $(`input:radio[name='filtering'][value='${value}']`).prop('checked', true);
                        break;
                    }
                    case "company_id":
                        break;
                    case "gw_mac":
                        gw_mac = key_value;
                        break;
                    case "use_coded_phy":
                        $("#use_coded_phy")[0].checked = key_value;
                        $("#use_experimental_long_range_sensors")[0].checked = key_value;
                        break;
                    case "use_1mbit_phy":
                        $("#use_1mbit_phy")[0].checked = key_value;
                        break;
                    case "use_extended_payload":
                        $("#use_extended_payload")[0].checked = key_value;
                        break;
                    case "use_channel_37":
                        $("#use_channel_37")[0].checked = key_value;
                        break;
                    case "use_channel_38":
                        $("#use_channel_38")[0].checked = key_value;
                        break;
                    case "use_channel_39":
                        $("#use_channel_39")[0].checked = key_value;
                        break;
                    default:
                        alert('get_config: unhandled key: ' + key);
                        break;
                }
            }
            if (use_eth) {
                $("#network_type_wifi")[0].checked = false;
                $("#network_type_cable")[0].checked = true;
            } else {
                $("#network_type_cable")[0].checked = false;
                $("#network_type_wifi")[0].checked = true;
            }
            let flag_use_ruuvi_server = !use_mqtt && (!use_http || (use_http && (http_url === "https://network.ruuvi.com/record")));
            if (flag_use_ruuvi_server) {
                $("#use_custom")[0].checked = false;
                $("#use_ruuvi")[0].checked = true;
            } else {
                $("#use_ruuvi")[0].checked = false;
                $("#use_custom")[0].checked = true;
            }
            if (!mqtt_prefix) {
                $('#use_mqtt_prefix_ruuvi').prop('checked', true);
                $('#use_mqtt_prefix_gw_mac').prop('checked', true);
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
                $("#mqtt_prefix_custom").val(mqtt_topic);
                if (mqtt_topic.length > 0) {
                    $('#use_mqtt_prefix_custom').prop('checked', true);
                } else {
                    $('#use_mqtt_prefix_custom').prop('checked', false);
                }
            }
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
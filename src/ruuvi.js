var mqtt_pass_changed = false;


function save_config() 
{
    console.log("save_config");
    $custom_conn = $("input[name='custom_connection']:checked").val();
    
    console.log( $custom_conn );

    let data = {};
    data.use_mqtt = ($custom_conn === 'use_mqtt');
    data.mqtt_server = $("#mqtt_server").val();
    data.mqtt_prefix = $("#mqtt_prefix").val();
    data.mqtt_user = $("#mqtt_user").val();
    
    if (mqtt_pass_changed) 
    {
        data.mqtt_pass = $("#mqtt_pass").val();
    }

    data.use_http = ($custom_conn === 'use_http');
    data.http_url = $("#http_url").val();
    data.http_user = $("#http_user").val();
    data.http_pass = $("#http_pass").val();

    mqtt_port = parseInt($("#mqtt_port").val())
    if (mqtt_port == NaN)
    {
        mqtt_port = 0;
    }

    data.mqtt_port = mqtt_port;
    data.use_filtering = $("input[name='filtering']:checked").val();

    //data.coordinates = $("#coordinates").val();  // Removed from v1

    console.log( data );

    $.ajax({
        url: '/ruuvi.json',
        dataType: 'json',
        contentType: 'application/json',
        method: 'POST',
        cache: false,
        data: JSON.stringify(data)
    });
}

function get_config()
{
    $.getJSON("/ruuvi.json", function(data) {
        if (data != null) 
        {
            const keys = Object.keys(data);
            for (let idx in keys)
            {
                let key = keys[idx];
                let key_value = data[key];
                switch (key) {
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
                        break;
                    case "http_url":
                        $("#http_url").val(key_value);
                        break;
                    case "http_user":
                        $("#http_user").val(key_value);
                        break;
                    case "use_mqtt":
                        $("#use_mqtt")[0].checked = key_value;
                        break;
                    case "mqtt_server":
                        if (data[key]) {
                            $("#mqtt_server").val(key_value);
                        }
                        break;
                    case "mqtt_port":
                        if (data[key]) {
                            $("#mqtt_port").val(key_value);
                        }
                        break;
                    case "mqtt_user":
                        $("#mqtt_user").val(key_value);
                        break;
                    case "mqtt_prefix":
                        $("#mqtt_prefix").val(key_value);
                        break;
                    case "coordinates":
                        $("#coordinates").val(key_value);
                        break;
                    case "use_filtering": {
                        let value = key_value ? "1" : "0";
                        $(`input:radio[name='filtering'][value='${value}']`).attr('checked', 'checked');
                        break;
                    }
                    case "company_id":
                        break;
                    default:
                        alert('get_config: unhandled key: ' + key);
                        break;
                }
            }
        }
    });
}

function showError(error) 
{
    switch (error.code) 
    {
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


$(document).ready(function() 
{
    //get configuration from flash and fill the web page
    get_config();

    $("#save_config").on("click", function() {
        save_config();
    });

    $("#mqtt_pass").on("change", function() {
        mqtt_pass_changed = true;
    });
});
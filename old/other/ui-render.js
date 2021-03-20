const ipcRenderer = require('electron').ipcRenderer;

function sendForm(event, populate) {
    event.preventDefault() 
    console.log("Send form event...");
    let uiConfig = {};
    uiConfig.schema = document.getElementById("schema").value;
    uiConfig.log_path = document.getElementById("log_path").value;
    uiConfig.verbose = document.getElementById("verbose").value;
    uiConfig.log_to_console = document.getElementById("log_to_console").value;
    uiConfig.honey_ip = document.getElementById("honey_ip").value;
    uiConfig.honey_port = document.getElementById("honey_port").value;
    uiConfig.production_ip = document.getElementById("production_ip").value;
    uiConfig.production_port = document.getElementById("production_port").value;
    uiConfig.listen_on = document.getElementById("listen_on").value;
    uiConfig.config_path = document.getElementById("config_path").value;
    uiConfig.populate = populate;
    uiConfig.proxy_behavior = document.getElementById("config").value;;

    ipcRenderer.send('form-submission', uiConfig)
}
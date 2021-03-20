const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require("child_process");

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('ui.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})


ipcMain.on('form-submission', function (event, uiConfig) {
  console.log("Creating command...");
  let args = ["index.js"];
  if (uiConfig.config_path) {args.push(" --config " + uiConfig.config_path)}
  if (uiConfig.listen_on) {args.push("-l " + uiConfig.listen_on)}
  if (uiConfig.schema) {args.push("-s " + uiConfig.schema)}
  if (uiConfig.verbose === "on") {args.push("-v ")}
  if (uiConfig.log_path) {args.push("-o " + uiConfig.log_path)}
  if (uiConfig.log_to_console === "on") {args.push("-c ")}
  if (uiConfig.honey_ip) {args.push("--h_addr " + uiConfig.honey_ip)}
  if (uiConfig.honey_port) {args.push("--h_port " + uiConfig.honey_port)}
  if (uiConfig.production_ip) {args.push("--p_addr " + uiConfig.production_ip)}
  if (uiConfig.production_port) {args.push("--p_port " + uiConfig.production_port)}
  if (uiConfig.populate) {args.push("-p")}
  if (uiConfig.proxy_behavior) {args.push("-b " + uiConfig.proxy_behavior)}

  console.log(args);

  const command = spawn("node", args)

  command.stdout.on("data", data => {
    console.log(`${data}`);
  });

  command.stderr.on("data", data => {
      console.log(`stderr: ${data}`);
  });

  command.on('error', (error) => {
      console.log(`error: ${error.message}`);
  });

  command.on("close", code => {
      console.log(`child process exited with code ${code}`);
  });

});
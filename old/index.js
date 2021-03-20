console.log("Running index.js");

const populate = require('./populate.js');
const parse = require('./parse.js');
const filter = require('./filter.js');

const fs = require('fs');
const net = require('net');

const parseArgs = require('minimist');

const mongo = require('mongodb');
const { stderr, process_config } = require('process');
const MongoClient = mongo.MongoClient;

var settings = {};

function commandHelp() {
  console.log("==== HELP ====");
  console.log("(default settings are in \"config\.json\")");
  console.log("-p, --populate   populate the honeypot instance with fake data");
  console.log("    (this does not start the proxy; fake data");
  console.log("     can be configured in schema template file)");
  console.log("-s, --schema     path to schema template file for populating honeypot");
  console.log("-o, --out        path of the log file");
  console.log("-v, --verbose    make the logs verbose");
  console.log("-c, --console    log to the console as well");
  console.log("-l, --listen     port to listen on");
  console.log("--h_addr         ip of the honeypot");
  console.log("--h_port         port of the honeypot");
  console.log("--p_addr         ip of the production mongodb server");
  console.log("--p_port         port of the production mongodb server");
  console.log("--config         path to the config file (\"config.json\" by default");
  console.log("-h, --help       show this message and exit");
  process.exit();
}


function writeToLog(message) {
  const currentTime = new Date();
  const entry = "[" + currentTime.toISOString() + "] " + message + "\n";
  if (settings.log_to_console) {
    console.log(entry);
  }
  fs.appendFile(settings.log_path, entry,  (error) => {
    if (error) {
      throw new Error("Failed to write to log!");
    }
  });
}

function startProxy() {

  var proxyToHoneypot = false;

  if (!filter.validateProxyBehavior(settings.proxy_behavior)) {
    console.error("WARNING: Proxy behavior not set correctly. All connections will be proxied to honeypot.");
    proxyToHoneypot = true;
  }

  const proxy = net.createServer(function (socket) {
    const clientId = socket.remoteAddress + ":" + socket.remotePort;

    const honeySocket = new net.Socket();
    honeySocket.connect(settings.honey_port, settings.honey_ip, function() {});
    const productionSocket = new net.Socket();
    productionSocket.connect(settings.production_port, settings.production_ip, function() {});

    socket.on('connect', function () {
      writeToLog("New connection from " + clientId);
    });

    socket.on('data', function (req) {     
      try {
        var [message, shortMsg] = parse.parseMessage(req);
        if (settings.verbose) {
          const messageText = "[" + clientId + " -> proxy] " + JSON.stringify(message);
          writeToLog(messageText);
        }
        else {
          const messageText =  "[" + clientId + " -> proxy] " + shortMsg;
          writeToLog(messageText);
        }
      }
      catch(error) {
        writeToLog("[" + clientId + " -> proxy] ERROR: " + error.stack);
      }

      if (!proxyToHoneypot) {
        if (filter.filterMsg(socket.remoteAddress, socket.remotePort, message, settings.proxy_behavior)) {
          proxyToHoneypot = true;
          honeySocket.write(req);
        }
        else {
          productionSocket.write(req);
        }
      }
      else {
        honeySocket.write(req);
      }    
    });

    honeySocket.on("data", function (res) {
      try {
        var [resMessage, resShortMsg] = parse.parseMessage(res);
        if (settings.verbose === true) {
          const messageText = "[honeypot -> " + clientId + "] " + JSON.stringify(resMessage);
          writeToLog(messageText);
        }
        else {
          const messageText = "[honeypot -> " + clientId + "] " + resShortMsg;
          writeToLog(messageText);
        }
        
      }
      catch(error) {
        writeToLog("[honeypot -> " + clientId + "] ERROR: " + error.stack);
      }
      
      socket.write(res);
    });

    productionSocket.on("data", function (res) {
      try {
        var [resMessage, resShortMsg] = parse.parseMessage(res);
        if (settings.verbose === true) {
          const messageText = "[production -> " + clientId + "] " + JSON.stringify(resMessage);
          writeToLog(messageText);
        }
        else {
          const messageText = "[production -> " + clientId + "] " + resShortMsg;
          writeToLog(messageText);
        }
        
      }
      catch(error) {
        writeToLog("[production -> " + clientId + "] ERROR: " + error.stack);
      }
      
      socket.write(res);
    });

    honeySocket.on('close', function (hadError) {
      writeToLog("Honeypot disconnected from " + clientId + (hadError ? " due to transmission error" : " (no error)"));
    });

    honeySocket.on('error', function() {
      writeToLog("ERROR: failed to proxy " + clientId + " to honeypot");
    });

    productionSocket.on('close', function (hadError) {
      writeToLog("Production server disconnected from " + clientId + (hadError ? " due to transmission error" : " (no error)"));
    });

    productionSocket.on('error', function() {
      writeToLog("ERROR: failed to proxy " + clientId + " to production server");
    });

    socket.on('close', function (hadError) {
      writeToLog(clientId + " disconnected " + (hadError ? "due to transmission error" : "(no error)"));
    });

    socket.on('error', function() {
      writeToLog("ERROR: could not connect to " + clientId);
    });

  });

  proxy.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log('ERROR: Address in use, try another port');
    }
  });

  writeToLog("Proxy listening on " + settings.listen_on + "...");
  proxy.listen(settings.listen_on);
  

}

function main() {

  const args = parseArgs(process.argv);
  var config_path;

  if (args.config) {
    config_path = args.config;
  }
  else {
    config_path = "config.json";
  }

  var config;

  try {
    config = JSON.parse(fs.readFileSync(config_path).toString());
  }
  catch(error) {
    console.error("Could not read config file " + config_path);
    process.exit();
  }

  settings.do_populate               = args.p || args.populate;
  settings.schema                    = args.s || args.schema || config.schema_file || "schema.json";
  settings.log_path                  = args.o || args.out || config.log_path || "safehouse.log";
  settings.verbose                   = args.v || args.verbose || config.verbose || false;
  settings.log_to_console            = args.c || args.console || config.log_to_console || false;
  settings.listen_on                 = args.l || args.listen || config.listen_on || 27016;
  settings.honey_ip                  = args.h_addr || config.honeypot.ip || "127.0.0.1";
  settings.honey_port                = args.h_port || config.honeypot.port || 27017;
  settings.production_ip             = args.p_addr || config.production.ip || "127.0.0.1";;
  settings.production_port           = args.p_port || config.production.port || 27018;
  settings.help                      = args.h || args.help;

  try {
    settings.proxy_behavior = JSON.parse(args.b);
  }
  catch(error) {
    settings.proxy_behavior = config.proxy_behavior;
  }

  const honeypot_url = "mongodb://" + settings.honey_ip + ":" + settings.honey_port;

  console.log("Finished setup");

  if (settings.help) {
    commandHelp();
  }
  else if (settings.do_populate) {
    console.log("Connecting to mongodb...")
    MongoClient.connect(honeypot_url, { useNewUrlParser: true , useUnifiedTopology: true}, function (err, client) {
      if (err) {
        console.error("ERROR: could not connect to Mongodb client at " + honeypot_url);
        throw err;
      }
      populate.populateInstance(client, settings.schema)
      .then(result => client.close())
      .catch(error => {
        console.error("ERROR: could not populate Mongodb instance.")
        console.log(error.stack);
        client.close();
      })

    });
  }
  else {
    console.log("Starting proxy...");
    console.log("Honeypot address: " + settings.honey_ip + ":" + settings.honey_port);
    console.log("Production address: " + settings.production_ip + ":" + settings.production_port);
    startProxy();
  }

}

main();

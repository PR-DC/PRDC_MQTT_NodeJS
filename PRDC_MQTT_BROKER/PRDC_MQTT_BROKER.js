/**
 * PRDC_MQTT_BROKER - PR-DC MQTT NodeJS Broker
 * Author: Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * 
 * --------------------
 * Copyright (C) 2021 PR-DC <info@pr-dc.com>
 *
 * This file is part of PRDC_MQTT_NodeJS.
 *
 * PRDC_MQTT_NodeJS is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * PRDC_MQTT_NodeJS is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with PRDC_MQTT_NodeJS.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

// Configuration
// --------------------
const broker_id = 'PR-DC_MQTT_BROKER'
const port = 1883;
const http_port = 8888;
const client_username = 'prdc';
const client_password = 'some_password';
const publish_username = 'publisher';
const publish_password = 'some_pw_for_publisher';

// Get IP adresses
// --------------------
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const results = {}; // Or just '{}', an empty object
const publicIp = require('public-ip');
var local_ip = '0.0.0.0';
var public_ip = '0.0.0.0';

(async () => {
  public_ip = await publicIp.v4()
  showMessage('Server public IP adress: ' + public_ip);
})();

for(const name of Object.keys(nets)) {
  for(const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    if(net.family === 'IPv4' && !net.internal) {
      if(!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
      if(name === 'Ethernet' || name === 'en0') {
        local_ip = net.address;
      }
    }
  }
}
showMessage('Server local IP adress: ' + local_ip);

// Logs
const fs = require('fs');

// Modules 
// --------------------
const MQTT = require('aedes')({
  id: broker_id,
  authenticate: function (client, username, password, callback) {
    if((username === client_username && 
        password.toString() === client_password) ||
        username === publish_username && 
        password.toString() === publish_password) {
      client.username = username;
      client.password = password;
      callback(null, true);
    } else {
      var err = new Error('Wrong username or password.');
      err.returnCode = 4;
      callback(err, false);
    }
  },
  authorizePublish: function (client, packet, callback) {
    if(client.username !== publish_username) {
      return callback(new Error('Unauthorized publish.'));
    }
    client.publish_topics = [];
    client.publish_log = true;
    callback(null);
  },
  authorizeSubscribe: function (client, sub, callback) {
    callback(null, sub);
  }
});

const ws = require('websocket-stream');
const net = require('net');
const http = require('http');

// Create servers
// --------------------
const server = net.createServer(MQTT.handle);
const httpServer = http.createServer();
ws.createServer({server: httpServer}, MQTT.handle);

// Run servers
// --------------------
server.listen(port, function() {
   showMessage('Server started and listening on port ' + port);
  
  MQTT.publish({ 
    topic: 'PR-DC/hello', 
    payload: 'I am PR-DC MQTT broker ' + MQTT.id 
  });
});

httpServer.listen(http_port, function() {
   showMessage('WebSocket server listening on port ' + http_port);
  
  MQTT.publish({ 
    topic: 'PR-DC/hello', 
    payload: 'I am PR-DC WebSocket MQTT broker ' + MQTT.id 
  });
});

/* MQTT.subscribe('PR-DC/hello', function(packet, cb) {
   showMessage('Published' + packet.payload.toString());

  MQTT.publish({
    topic: 'PR-DC/hello',
    payload: 'Thank you!'
  });
});
 */

// Server events
// --------------------
// Client connects
MQTT.on('client', function(client) {
  showMessage('Client \x1b[33m' + (client ? client.id : client) + 
    '\x1b[0m connected to broker ' + MQTT.id)
})

// Client disconnects
MQTT.on('clientDisconnect', function(client) {
  showMessage('Client \x1b[31m' + (client ? client.id : client) + 
    '\x1b[0m disconnected from broker ' + MQTT.id)
})

// On subscribe
MQTT.on('subscribe', function(subscriptions, client) {
  showMessage('Client \x1b[32m' + (client ? client.id : client) +
    '\x1b[0m subscribed to topics: ' + 
    subscriptions.map(s => s.topic).join('\n'))
})

// On unsubscribe
MQTT.on('unsubscribe', function(subscriptions, client) {
   showMessage('Client \x1b[32m' + (client ? client.id : client) +
    '\x1b[0m unsubscribed from topics: ' + subscriptions.join('\n'))
})

// Message is published
MQTT.on('publish', async function(packet, client) {
  showMessage('Client \x1b[31m' + (client ? client.id : MQTT.id) + 
    '\x1b[0m has published: ' + packet.payload.toString() + 
    ' | Topic: ' + packet.topic)
  if(client && client.publish_log) {
    if(packet.topic in client.publish_topics.includes) {
      var fid = client.publish_topics[packet.topic];
    } else {
      var fid = fs.createWriteStream('logs/' + client.id + '_' + packet.topic + '.log', {
        flags: 'a'
      })
      client.publish_topics[packet.topic] = fid;
    }
    fid.write(packet.payload);
  }
})

// Functions
// --------------------

// getTimestamp() function
// Returns current timestamp in format HH:mm:SS.ms
// --------------------
function getTimestamp() {
  var date = new Date();
  var pad = function(num, size) { 
    return ('000' + num).slice(size * -1); 
  };
  var time = parseFloat(date.getTime()/1000).toFixed(3);
  var hours = date.getHours();
  var minutes = Math.floor(time / 60) % 60;
  var seconds = Math.floor(time - minutes * 60);
  var milliseconds = time.slice(-3);

  return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + 
    pad(seconds, 2) + '.' + pad(milliseconds, 3);
}

// showMessage() function
// Show message
// --------------------
function showMessage(msg) {
  console.log('\x1b[36m['+getTimestamp()+']\x1b[0m ' + msg);
}

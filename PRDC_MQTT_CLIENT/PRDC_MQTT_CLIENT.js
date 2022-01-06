/**
 * PRDC_MQTT_CLIENT - PR-DC MQTT NodeJS Client
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
const broker_host = 'localhost'; // enter broker host address
const broker_port = 1883;
var username = 'publisher'; // [-] MQTT Client username
var password = 'some_pw_for_publisher'; // [-] MQTT Client password
var topic = 'some_topic'; // [-] MQTT topic
var qos = 0; // [-] MQTT quality of service 
var retain = true; // [-] retain MQTT message
var connection_timeout = 3000; // [s] time for connection timeout
var keep_alive = 60; // [s] time for keep alive signal
var client_id = 'PRDC_MQTT_Client' + parseInt(Math.random() * 100000);
var publish_dt = 3000;
var i = 0;
var pause = false;

// Modules 
// --------------------
var MQTT = require('mqtt');

// Connect to broker 
// --------------------
var mqttClient = MQTT.connect({
  host: broker_host,
  port: broker_port,
  clientId: client_id,
  username: username,
  password: password,
  connectTimeout: connection_timeout,
  keepalive: keep_alive
});

// On keypress
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (str, key) => {
  if (key.ctrl && key.name === 'p') {
    if(pause) {
      pause = false;
      console.log('Execution resumed...');
    } else {
      pause = true;
      console.log('Execution paused, press [CTRL+P] to resume...');
    }
  }
});

// Connect and subscribe
mqttClient.on('connect', function(message) {
  showMessage('Connected to ' + broker_host + ':' + broker_port);
  setInterval(publishMessage, publish_dt);
  
  mqttClient.subscribe(topic, function(e) {
    if(!e) {
     showMessage('Subscribed to topic: ' +topic);
    }
  });
});


// Message arrived
mqttClient.on('message', function (topic, message, packet) {
  showMessage('Client published: ' + message.toString() + 
    ' | Topic: ' + topic);
})

// Publish new message
function publishMessage() {
  if(!pause) {
    var msg = 'Sending packet ' + i;
    i += 1;
    
    mqttClient.publish(topic, msg);
    showMessage('Publishing: ' + msg + ' | Topic: ' + topic);
    console.log('Press [CTRL+P] to pause execution...');
  }
}

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

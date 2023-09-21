const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const mqtt = require('mqtt');

const app = express();
const port = 3000;

let lastSentTemperature = null;
let lastSentTime = null;
// MQTT setup
const mqttClient = mqtt.connect('mqtt://test.mosquitto.org');

mqttClient.on('connect', function () {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('pico/temperature', { qos: 1 });
});

mqttClient.on('message', function (topic, message) {
  const temperature = parseFloat(message.toString());
  console.log(`Received temperature: ${temperature} C`);
  const currentTime = new Date().getTime();

  if (lastSentTemperature !== temperature || (lastSentTime && currentTime - lastSentTime >= 60000)) {
    if (temperature > maxTemperature) {
      twilioClient.messages.create({
        body: `Warning: Temperature exceeded ${maxTemperature} C`,
        to: phoneNumber,
        from: 'phone-here'
      });
    } else if (temperature < minTemperature) {
      twilioClient.messages.create({
        body: `Warning: Temperature dropped below ${minTemperature} C`,
        to: phoneNumber,
        from: 'phone-here'
      });
    }
    lastSentTemperature = temperature;
    lastSentTime = currentTime;
  }
});

// Twilio setup
const accountSid = 'insert here';
const authToken = 'insert here';
const twilioClient = new twilio(accountSid, authToken);

// User-defined settings
let maxTemperature = 35;
let minTemperature = -5;
let phoneNumber = 'insert here';

app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
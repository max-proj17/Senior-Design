const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const mqtt = require('mqtt');
const app = express();

let lastAlertTime = null;

// User-defined settings
const maxTemperature = 35;
const minTemperature = -5;
const phoneNumber = '';
const port = 3000;  // Define the port here

// Twilio setup
const accountSid = '';
const authToken = '';
const twilioClient = new twilio(accountSid, authToken);

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

    if ((temperature > maxTemperature || temperature < minTemperature) && 
        (!lastAlertTime || currentTime - lastAlertTime >= 60000)) {
        const alertMessage = temperature > maxTemperature 
            ? `Warning: Temperature exceeded ${maxTemperature} C`
            : `Warning: Temperature dropped below ${minTemperature} C`;

        twilioClient.messages.create({
            body: alertMessage,
            to: phoneNumber,
            from: ''
        }, function(error, message) {
            if (error) {
                console.error("Error sending SMS:", error.message);
            } else {
                console.log("SMS sent with ID:", message.sid);
            }
        });

        lastAlertTime = currentTime;
    }
});



app.use(bodyParser.json());

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

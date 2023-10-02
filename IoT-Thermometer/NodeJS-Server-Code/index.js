const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const mqtt = require('mqtt');
const cors = require('cors'); // Import the cors package
const app = express();
//const mqttPublisher = require('./mqttPublisher');  // Import the MQTT publisher function
let lastProcessedTime = null;
let lastAlertTime = null;
let currentTemperature = null; // Initialize currentTemperature variable
let lastUpdateTime = null; // Track the last time the temperature was updated
const temperatureTimeout = 2000; // 5 seconds timeout for temperature data

//max def
let sensor_unplugged = false;

// User-defined settings
let maxTemperature = 35;
let minTemperature = 20;
let phoneNumber = 'Your_Phone_Number_Here';
let maxTempMessage = "Warning: Temperature exceeded {maxTemperature} C";
let minTempMessage = "Warning: Temperature dropped below {minTemperature} C";
const port = 3000;  // Define the port here

// Twilio setup
const accountSid = 'Account_ID';
const authToken = 'API_Key_Here';
const twilioClient = new twilio(accountSid, authToken);

// MQTT setup
const mqttClient = mqtt.connect('mqtt://test.mosquitto.org');
const display_client = mqtt.connect('mqtt://test.mosquitto.org');

display_client.on('connect', function () {
    console.log('Connected to DisplayMQTT broker');
});

function publishDisplayMessage(state) {
    display_client.publish('pico/display', state, { qos: 1 }, function () {
        console.log('Display message published:', state);
    });
}


mqttClient.on('connect', function () {
    console.log('Connected to TempMQTT broker');
    mqttClient.subscribe('pico/temperature', { qos: 1 });
});

mqttClient.on('message', function (topic, message) {
    const currentTime = Date.now();
    // Check if enough time has elapsed since the last processed message
    if (lastProcessedTime && currentTime - lastProcessedTime < 1000) {
        // Skip processing this message as it's within 1 second of the last processed message
        return;
    }
     // Update the lastProcessedTime
    lastProcessedTime = currentTime;
    const messageStr = message.toString();
    if (messageStr === 'SENSOR_UNPLUGGED') {
        console.log('Sensor Unplugged');
        currentTemperature = null;
        sensor_unplugged = true;
        lastUpdateTime = Date.now();
    } else {
        const temperature = parseFloat(messageStr);
        console.log(`Received temperature: ${temperature} C`);
        currentTemperature = temperature;
        sensor_unplugged = false;
        lastUpdateTime = Date.now();
        const currentTime = new Date().getTime();

        if ((temperature > maxTemperature || temperature < minTemperature) && 
        (!lastAlertTime || currentTime - lastAlertTime >= 60000)) {
        const alertMessage = temperature > maxTemperature 
            ? maxTempMessage.replace('{maxTemperature}', maxTemperature)
            : minTempMessage.replace('{minTemperature}', minTemperature);

        twilioClient.messages.create({
            body: alertMessage,
            to: phoneNumber,
            from: 'Twilio_Phone_Number_Here'
        }, function(error, message) {
            if (error) {
                console.error("Error sending SMS:", error.message);
            } else {
                console.log("SMS sent with ID:", message.sid);
            }
        });

        lastAlertTime = currentTime;
        }
    }
    

    
});

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());

app.post('/display/press', (req, res) => {
    console.log("Received press request");
    publishDisplayMessage('ON');
    res.sendStatus(200);
});

app.post('/display/release', (req, res) => {
    console.log("Received release request");
    publishDisplayMessage('OFF');
    res.sendStatus(200);
});
app.post('/updateSmsMessage', (req, res) => {
    const { maxTempMessage: newMaxTempMessage, minTempMessage: newMinTempMessage, phoneNumber: newPhoneNumber } = req.body;
    if (newMaxTempMessage) maxTempMessage = newMaxTempMessage;
    if (newMinTempMessage) minTempMessage = newMinTempMessage;
    if (newPhoneNumber) phoneNumber = newPhoneNumber;
    res.sendStatus(200);
});

// Define the /temperature API endpoint
app.get('/temperature', (req, res) => {
    const currentTime = Date.now();
    if (currentTemperature === null || (lastUpdateTime !== null && (currentTime - lastUpdateTime) > temperatureTimeout)) {
        if (sensor_unplugged) {
            res.status(404).json({ error: 'Sensor Unplugged' });
        } else {
            res.status(404).json({ error: 'No Temperature Data Available' });
        }
    } else {
        res.json({ temperature: currentTemperature });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const request = require('request');
var Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory(
    'homebridge-bearer-token-expiration-notification',
    'Motion Switch',
    MotionSwitchAccessory
  );
};

function MotionSwitchAccessory(log, config) {
  this.log = log;
  this.motionSensorName = config['motion_sensor_name'];
  this.switchName = config['switch_name'];
  this.homebridgeCustomPort = config['homebridge_custom_port'] || 8581;
  this.bearerToken = config['bearerToken'];
  this.switchState = false;
  this.motionSensorState = false;
  this.debug = config['debug'] || false;

  this.motionSensorService = new Service.MotionSensor(this.motionSensorName);
  this.motionSensorService
    .getCharacteristic(Characteristic.MotionDetected)
    .on('get', this.getMotionSensorState.bind(this));

  this.switchService = new Service.Switch(this.switchName);
  this.switchService
    .getCharacteristic(Characteristic.On)
    .on('get', this.getSwitchState.bind(this))
    .on('set', this.setSwitchState.bind(this));
}

MotionSwitchAccessory.prototype = {
  identify: function (callback) {
    this.log('Identify requested!');
    callback();
  },

  getMotionSensorState: function (callback) {
    callback(null, this.motionSensorState);
  },

  getSwitchState: function (callback) {
    callback(null, this.switchState);
    this.checkChanges();
  },

  debugLog(message) {
    if (this.debug) {
      this.log.warn(`[DEBUG] ${message}`);
    }
  },

  checkChanges: function () {
    this.log('Checking for changes');

    this.motionSensorService.setCharacteristic(
      Characteristic.MotionDetected,
      Boolean(false)
    );
    this.switchService.setCharacteristic(Characteristic.On, Boolean(false));

    new Promise((resolve, reject) => {
      request(
        {
          url: `http://localhost:${this.homebridgeCustomPort}/api/auth/check`,
          method: 'GET',
          headers: {
            accept: '*/*',
            Authorization: `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
          json: {
            characteristicType: 'On',
            value: true,
          },
        },
        (error, response, body) => {
          if (error) {
            this.log(error);
            reject(error);
          } else {
            this.log(body);
            resolve(response);
          }
        }
      );
    }).then((resolve) => {
      this.debugLog(`Response Status Code: ${resolve.statusCode}`);
      if (resolve.statusCode === 200) {
        this.log(`Token is still valid. Will check again in 5 minutes`);
        setTimeout(this.checkChanges.bind(this), 300000, this);
      }
      if (resolve.statusCode === 400 || resolve.statusCode === 401) {
        this.motionSensorService.setCharacteristic(
          Characteristic.MotionDetected,
          Boolean(true)
        );
        this.debugLog(
          `Motion sensor state: ${
            this.motionSensorService.getCharacteristic(
              Characteristic.MotionDetected
            ).value
          }`
        );
        this.switchService.setCharacteristic(Characteristic.On, Boolean(true));
        this.debugLog(
          `Switch sensor state: ${
            this.switchService.getCharacteristic(Characteristic.On).value
          }`
        );

        this.log(
          'Token expired. Please update your token in config.json and restart Homebridge'
        );
        this.log(`Remind again in 12 hours`);
        setTimeout(this.checkChanges.bind(this), 43200000, this);
        // setTimeout(this.checkChanges.bind(this), 10000, this);
      }
    });
  },

  setSwitchState: function (state, callback) {
    callback(null);
  },

  resetSensors: function (self) {
    // self.switchState = 0;

    self.motionSensorState = 0;
    // self.switchService.setCharacteristic(
    //   Characteristic.On,
    //   Boolean(self.switchState)
    // );
    self.motionSensorService.setCharacteristic(
      Characteristic.MotionDetected,
      Boolean(self.motionSensorState)
    );
  },

  getServices: function () {
    return [this.motionSensorService, this.switchService];
  },
};

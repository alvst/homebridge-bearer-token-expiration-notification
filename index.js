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
  this.checkInterval = config['check_interval'] || 300000;
  this.checkIntervalFailed = config['check_interval_failed'] || 43200000;
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
            // this.log(body);
            resolve(response);
          }
        }
      );
    }).then((resolve) => {
      this.debugLog(`Response Status Code: ${resolve.statusCode}`);
      if (resolve.statusCode === 200) {
        this.debugLog(
          `Token is still valid. Will check again in ${msToTime(
            this.checkInterval
          )}`
        );
        setTimeout(this.checkChanges.bind(this), this.checkInterval, this);
        return;
      }
      if (resolve.statusCode === 400 || resolve.statusCode === 401) {
        this.debugLog(`Token expired. ${resolve.statusCode} returned`);
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

        this.log.error(
          'Token expired. Please update your token in config.json and restart Homebridge'
        );
        this.log.error(
          'Please make sure to update the config.json for this plugin and any other plugins that require it. You can use the same token for all plugins requiring one.'
        );
        this.log.error(
          `Next reminder in ${msToTime(this.checkIntervalFailed)}`
        );

        setTimeout(
          this.checkChanges.bind(this),
          this.checkIntervalFailed,
          this
        );
        return;
      }
      this.log.error('Token is expired or invalid. Please update your token.');
      setTimeout(this.checkChanges.bind(this), this.checkIntervalFailed, this);
      return;
    });

    function msToTime(duration) {
      var seconds = (duration / 1000).toFixed(0);
      var minutes = Math.floor(seconds / 60);
      var hours = '';
      if (minutes > 59) {
        hours = Math.floor(minutes / 60);
        hours = hours >= 10 ? hours : '0' + hours;
        minutes = minutes - hours * 60;
        minutes = minutes >= 10 ? minutes : '0' + minutes;
      }

      seconds = Math.floor(seconds % 60);
      seconds = seconds >= 10 ? seconds : '0' + seconds;
      if (hours != '') {
        return hours + ':' + minutes + ':' + seconds;
      }
      return minutes + ':' + seconds;
    }
  },

  setSwitchState: function (state, callback) {
    callback(null);
  },

  getServices: function () {
    return [this.motionSensorService, this.switchService];
  },
};

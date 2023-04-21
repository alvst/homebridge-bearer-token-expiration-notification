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
  this.motionSensorState = false;
  this.debug = config['debug'] || false;
  this.allowReset = config['allow_time_reset'] || true;
  this.processRunning = null;

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

MotionSwitchAccessory.prototype.getMotionSensorState = function (callback) {
  callback(null, this.motionSensorState);
};

MotionSwitchAccessory.prototype.getSwitchState = function (callback) {
  callback(null, false);

  setTimeout(() => {
    this.motionSensorState = false;
    this.motionSensorService.setCharacteristic(
      Characteristic.MotionDetected,
      false
    );
  }, 1000);

  if (this.processRunning === null) {
    this.checkToken();
  }
};

MotionSwitchAccessory.prototype.setSwitchState = function (state, callback) {
  clearTimeout(this.processRunning);

  if (this.allowReset) {
    clearTimeout(this.processRunning);
  }

  this.checkToken();
  callback(null);
};

MotionSwitchAccessory.prototype.checkToken = function () {
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
      this.scheduleCheckChanges();
    } else if (resolve.statusCode === 400 || resolve.statusCode === 401) {
      this.motionSensorState = true;
      this.motionSensorService.setCharacteristic(
        Characteristic.MotionDetected,
        true
      );

      this.handleTokenExpired();
    } else {
      this.unknownStatusReturned(resolve);
    }
  });
};

MotionSwitchAccessory.prototype.unknownStatusReturned = function (resolve) {
  this.errorLog(`Unknown Status Code Returned: ${resolve.statusCode}`);
  this.handleTokenExpired();
};

MotionSwitchAccessory.prototype.scheduleCheckChanges = function () {
  this.debugLog(
    `Token Valid. Will check again in ${this.msToTime(this.checkInterval)}`
  );
  this.processRunning = setTimeout(this.resetSensors, this.checkInterval, this);
};

MotionSwitchAccessory.prototype.handleTokenExpired = function () {
  this.errorLog(
    `Token has expired. Will check again in ${this.msToTime(
      this.checkIntervalFailed
    )}`
  );
  this.processRunning = setTimeout(
    this.resetSensors,
    this.checkIntervalFailed,
    this
  );
};

MotionSwitchAccessory.prototype.resetSensors = function (self) {
  // Used to ensure Homebridge sees the state change and thus sends the notification
  setTimeout(() => {
    self.motionSensorState = false;
    self.motionSensorService.setCharacteristic(
      Characteristic.MotionDetected,
      false
    );
  }, 1000);

  self.switchState = 0;

  self.motionSensorState = 0;
  self.switchService.setCharacteristic(
    Characteristic.On,
    Boolean(self.switchState)
  );
  self.motionSensorService.setCharacteristic(
    Characteristic.MotionDetected,
    Boolean(self.motionSensorState)
  );

  self.checkToken();
};

MotionSwitchAccessory.prototype.msToTime = function (duration) {
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
};

MotionSwitchAccessory.prototype.debugLog = function (message) {
  if (this.debug) {
    this.log.warn(`[DEBUG] ${message}`);
  }
};

MotionSwitchAccessory.prototype.errorLog = function (message) {
  this.log.error(`[ERROR] ${message}`);
};

MotionSwitchAccessory.prototype.getServices = function () {
  return [this.motionSensorService, this.switchService];
};

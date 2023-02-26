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
  callback(null, this.switchState);
  // once the callback is sent, start checking for changes
  // When change is seen, setSwitchState is called
  this.checkChanges();
};

MotionSwitchAccessory.prototype.checkChanges = function (state, callback) {
  // setTimeout(this.server, 10000, this);
  console.log('Checking for changes');
  console.log(this.bearerToken);
  console.log(this.homebridgeCustomPort);
  new Promise((resolve, reject) => {
    request(
      {
        url: `http://localhost:8581/api/auth/check`,
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
          console.log(error);
          reject(error);
        } else {
          console.log(body);
          resolve(response);
        }
      }
    );
  }).then((resolve) => {
    // console.log(resolve);
    console.log(resolve.statusCode);
    if (resolve.statusCode === 200) {
      setTimeout(this.checkChanges(), 10000, this);
    }
    if (resolve.statusCode === 401) {
      // TBD
    }
  });
};

MotionSwitchAccessory.prototype.setSwitchState = function (state, callback) {
  this.server();

  this.switchState = state;
  console.log('Switch state: ' + this.switchState);
  // When we turn this on, we also want to turn on the motion sensor
  this.trigger();
  callback(null);
};

MotionSwitchAccessory.prototype.trigger = function () {
  if (this.switchState) {
    this.motionSensorState = 1;
    this.motionSensorService.setCharacteristic(
      Characteristic.MotionDetected,
      Boolean(this.motionSensorState)
    );
    // setTimeout(this.resetSensors, 1000, this);
  } else {
    console.log('Switch state: ' + this.switchState);
    // this.resetSensors;
    setTimeout(this.resetSensors, 1000, this);
  }
};

MotionSwitchAccessory.prototype.server = async function () {
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
          console.log(error);
          reject(error);
        } else {
          console.log(body);
          resolve(response);
        }
      }
    );
  }).then((resolve) => {
    console.log(resolve);
    console.log(resolve.statusCode);
  });
};

MotionSwitchAccessory.prototype.resetSensors = function (self) {
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
};

MotionSwitchAccessory.prototype.getServices = function () {
  return [this.motionSensorService, this.switchService];
};

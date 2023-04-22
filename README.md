## Homebridge Motion Switch

#### Setup

`npm install -g alvst/homebridge-bearer-token-expiration-notification`

And add the following to the accessories list in your Homebridge config. I recommend the name "!! \"Your Bearer Token Has expired\" !!" As the notification will then read Motion detected !! \"Your Bearer Token Has expired\" !!.

```json
    "accessories": [
      {
          "accessory": "Motion Switch",
          "motion_sensor_name": "Motion Sensor",
          "switch_name": "Motion Switch",
          "name": "!! \"Your Bearer Token Has expired\" !!",
          "bearerToken": "",
      }
    ]
```

Then add it to HomeKit, once added, you will need to turn on Notifications for the sensor (Home.app → Home Settings → Sensors → [Sensor Name] → Activity notifications). Once the Bearer Token Expires, you will be notified the token has expired with a notification.

## Required fields

| Key           | Description                                   | Required |
| ------------- | --------------------------------------------- | -------- |
| `bearerToken` | Bearer authentication token you want to check | `Yes`    |

## Optional Fields

| Key                     | Description                                                                                                                                                                                | Default    | Units        | Other Info              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------ | ----------------------- |
| `check_interval`        | When the the token is valid, this is the interval at which it will check again (I recommend this be more often than the 'check_interval_failed')                                           | `300000`   | Milliseconds | Equivalent to 5 minutes |
| `check_interval_failed` | When the the token is Invalid, this is the interval at which it will check again. I recommend making this longer as the notification will be repeated until you update your token          | `43200000` | Milliseconds | Equivalent to 12 hours  |
| `allow_time_reset`      | When you activate the motion sensor within Home.app, a check is initiated and the timer is reset. This is most useful for when your token has expired and you want to delay the next check | `true`     | `Boolean`    |                         |
| `debug`                 | Add additional logs useful for debugging to your homebridge console                                                                                                                        | `false`    | Boolean      | Useful for debugging    |

## Acknowledgements

This repo was originally a fork from [aaronpearce/homebridge-motion-switch](https://github.com/aaronpearce/homebridge-motion-switch).

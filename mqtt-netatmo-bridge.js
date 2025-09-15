// Requirements
require('dotenv').config()
const mqtt = require('mqtt')
const netatmo = require('netatmo')
const interval = require('interval-promise')
const _ = require('lodash')
const logging = require('homeautomation-js-lib/logging.js')
const mqtt_helpers = require('homeautomation-js-lib/mqtt_helpers.js')
const health = require('homeautomation-js-lib/health.js')
const { writeFile, existsSync, readFile } = require('fs');

// Initial variables
const topicPrefix = process.env.TOPIC_PREFIX
const netatmo_client_id = process.env.NETATMO_CLIENT_ID
const netatmo_client_secret = process.env.NETATMO_CLIENT_SECRET
const netatmo_refresh_token = process.env.NETATMO_REFRESH_TOKEN
const topic_as_json = process.env.TOPIC_AS_JSON
const auth_file = 'config/auth_file.json'
var api = null
var env_auth_data = {
    'client_id': netatmo_client_id,
    'client_secret': netatmo_client_secret,
    'refresh_token': netatmo_refresh_token,
    'inital_refresh_token': netatmo_refresh_token
}

// Setup MQTT
const client = mqtt_helpers.setupClient(null, null)

const isInterestingDataPoint = function(inName) {
    const dataPointName = inName.toLowerCase()
    if (dataPointName === 'rain') {
        return dataPointName
    }
    if (dataPointName === 'temperature') {
        return dataPointName
    }
    if (dataPointName === 'humidity') {
        return dataPointName
    }
    if (dataPointName === 'windangle') {
        return 'wind_angle'
    }
    if (dataPointName === 'windstrength') {
        return 'wind_strength'
    }
    if (dataPointName === 'gustangle') {
        return 'gust_angle'
    }
    if (dataPointName === 'guststrength') {
        return 'gust_strength'
    }
    if (dataPointName === 'co2') {
        return dataPointName
    }
    if (dataPointName === 'temp_trend') {
        return dataPointName
    }
    if (dataPointName === 'pressure') {
        return dataPointName
    }
    if (dataPointName === 'pressure_trend') {
        return dataPointName
    }
    if (dataPointName === 'noise') {
        return dataPointName
    }
    if (dataPointName === 'absolutepressure') {
        return 'absolute_pressure'
    }

    return null
}

const writeAuthFile = function()
{
    writeFile(auth_file, JSON.stringify(env_auth_data), (err) => {
        if (err) {
            logging.error("Netatmo auth file error: " + err);
            exit
        }
        logging.info("Generated new auth file");
    })  
}

const initalAuth = function() {
    if (existsSync(auth_file)) {
        logging.info("Auth file exists");
        readFile(auth_file, "utf8", (err, file_auth_data) => {
            if (err) {
                logging.error("Netatmo auth file error: " + err);
            } else if (file_auth_data) {
                if (file_auth_data = JSON.parse(file_auth_data)) {
                    if (env_auth_data.client_id != file_auth_data.client_id || env_auth_data.client_secret != file_auth_data.client_secret || env_auth_data.refresh_token != file_auth_data.inital_refresh_token) {
                        logging.info("Environment auth data has been changed")
                        writeAuthFile()
                    } else {
                        logging.info("Use existing auth file")
                    }
                } else {
                    logging.info("Netatmo auth file invalid JSON")
                    writeAuthFile()
                }
            } else {
                logging.info("Netatmo auth file invalid JSON")
                writeAuthFile()
            }
        })
    } else {
        writeAuthFile()
    }
}

const reconnect = function() {
    logging.info('connecting')
    api = new netatmo(auth_file)
}

initalAuth()
reconnect()

api.on('error', function(error) {
    // When the "error" event is emitted, this is called
    logging.error('Netatmo threw an error: ' + error)
    health.unhealthyEvent()
    reconnect()
})

api.on('warning', function(error) {
    // When the "warning" event is emitted, this is called
    logging.log('Netatmo threw a warning: ' + error)
    health.unhealthyEvent()
    reconnect()
})

var getStationsData = function(err, devices) {
    if (_.isNil(err)) {
        health.healthyEvent()
        logging.info('loaded station data')
    } else {
        health.unhealthyEvent()
        logging.error('unable to get stations data: ' + err)
        return
    }

    logging.debug(devices)
    const station = devices[0]
    const foundModules = station.modules

    processModule(station)

    if (_.isNil(foundModules)) {
        logging.error('no modules found: ' + stations)
        return
    }

    foundModules.forEach(function(module) {
        processModule(module)
    }, this)
}

var getMeasure = function(err, measure) {
    console.log(measure.length)
    console.log(measure[0])
}

var getThermostatsData = function(err, devices) {
    console.log(devices)
}

var setSyncSchedule = function(err, status) {
    console.log(status)
}

var setThermpoint = function(err, status) {
    console.log(status)
}

var getHomeData = function(err, data) {
    console.log(data)
}

var handleEvents = function(err, data) {
    console.log(data.events_list)
}

// Get Home Data
// https://dev.netatmo.com/dev/resources/technical/reference/cameras/gethomedata
api.getHomeData()

// // Get Next Events
// // See docs: https://dev.netatmo.com/dev/resources/technical/reference/cameras/getnextevents
// var options = {
//     home_id: '5a1a38b9b26ddfafc58bf1df',
//     event_id: ''
// };

// api.getNextEvents(options);

// // Get Last Event Of
// // See docs: https://dev.netatmo.com/dev/resources/technical/reference/cameras/getlasteventof
// var options = {
//     home_id: '5a1a38b9b26ddfafc58bf1df',
//     person_id: ''
// };

// api.getLastEventOf(options);

// // Get Events Until
// // See docs: https://dev.netatmo.com/dev/resources/technical/reference/cameras/geteventsuntil
// var options = {
//     home_id: '5a1a38b9b26ddfafc58bf1df',
//     event_id: '',
// };

// api.getEventsUntil(options);

// // Get Camera Picture
// // See docs: https://dev.netatmo.com/dev/resources/technical/reference/cameras/getcamerapicture
// var options = {
//     image_id: '',
//     key: ''
// };

// api.getCameraPicture(options);


// Event Listeners
api.on('get-stationsdata', getStationsData)
api.on('get-measure', getMeasure)
api.on('get-thermostatsdata', getThermostatsData)
api.on('set-syncschedule', setSyncSchedule)
api.on('set-thermpoint', setThermpoint)
api.on('get-homedata', getHomeData)
api.on('get-nextevents', handleEvents)
api.on('get-lasteventof', handleEvents)
api.on('get-eventsuntil', handleEvents)

const processModule = function(module) {
    const name = module.module_name
    const data = module.dashboard_data

    logging.info('Looking at module: ' + name)

    if (!_.isUndefined(data)) {
        health.healthyEvent()

        logging.info('   data: ' + JSON.stringify(data))
        
        if (!_.isEmpty(module.battery_percent)) {
            data.battery = module.battery_percent
        }

        mqttdata = new Object()
        if (data?.time_utc != undefined) {
            mqttdata.Time = new Date(data.time_utc * 1000)
        }
        mqttdata.SENSOR = data

        logging.info('starting smart publish')
        if (topic_as_json == "true") {
            client.smartPublish(mqtt_helpers.generateTopic(topicPrefix, name + '/SENSOR'), JSON.stringify(mqttdata), [], { retain: true })
        } else {
            client.smartPublishCollection(mqtt_helpers.generateTopic(topicPrefix, name), mqttdata, [], { retain: true })
        }

        logging.info('done')
    } else {
        logging.error('Data from the module ' + name + ' cannot be retrieved')
    }
}

const pollData = function() {
    logging.info('Polling for new info')

    api.getStationsData(getStationsData)
}

const startMonitoring = function() {
    logging.info('Starting netatmo <-> MQTT')

    pollData()
    interval(async() => {
        pollData()
    }, 120 * 1000)
}

startMonitoring()
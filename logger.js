"use strict"

const logger = require('winston');
const strftime = require('strftime');
const fs = require('fs');

const tsFormat = () => strftime('%b %d, %Y %H:%M:%S.%L');
logger.remove(logger.transports.Console);  
logger.add(logger.transports.Console, {
	timestamp : tsFormat,
	colorize : true,
	level : 'verbose'
});
logger.add(logger.transports.File, {
	filename : 'logs/activity.log',
	timestamp : tsFormat,
	level : 'verbose',
	json : false,
	datePattern: '.yyyy-MM-dd',
	maxsize : 12500000	// 100 Mb
});

if (!fs.existsSync('logs')){
	logger.info('Created logs dir.')
    fs.mkdirSync('logs');
}

module.exports = logger;
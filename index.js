"use strict"

const logger = require('./logger.js');
const db = require("./dbHandler.js");
const checkWikiPage = require("./pageProcessor.js").checkWikiPage;
const Promise = require('bluebird');
const Queue = require('promise-queue')

let hardLimit = 3;

const queue = new Queue(3, Infinity);
const addToQueue = function(URL) {
	hardLimit--;
	if (hardLimit<=0) {
		return;
	}

	queue.add(checkWikiPage(URL)
	.then(function(result){
		logger.debug(result.links);
		for(let i = 0; i < result.links.length; i++) {
			addToQueue(result.links[i]);
		}
	}))
}

logger.info('adding main page to queue');

addToQueue('https://sco.wikipedia.org/wiki/Main_Page')
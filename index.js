"use strict"

const logger = require('./logger.js');
const db = require("./dbHandler.js");
const checkWikiPage = require("./pageProcessor.js").checkWikiPage;
const Promise = require('bluebird');
const Queue = require('promise-queue')

let hardLimit = 5;

const queue = new Queue(3, Infinity);

const addToQueue = function(URL) {
	hardLimit--;
	if (hardLimit<=0) {
		return; // TODO 
	}

	return queue.add(function() {
		return checkWikiPage(URL);
	})
	.then(function(result) {
		return processLinks(result.links);
	})
	.then(function(result) {
		logger.warn('test' + URL);
	});
};

const processLinks = function(links) {
	return new Promise(function(resolve, reject) {  //TODO if only links are needed, checkWikiPage can just return links
		logger.debug(links);
		for(let i = 0; i < links.length; i++) {
			addToQueue(links[i]);
		}
		resolve();
	});
};

logger.info('adding main page to queue');

addToQueue('https://sco.wikipedia.org/wiki/Main_Page')

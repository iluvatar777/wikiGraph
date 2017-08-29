"use strict"

const logger = require('./logger.js');
const db = require("./dbHandler.js");
const checkWikiPage = require("./pageProcessor.js").checkWikiPage;
const Promise = require('bluebird');
const Queue = require('promise-queue')

let hardLimit = 5000;

const queue = new Queue(3, Infinity);

const addToQueue = function(URL) {
	if (hardLimit<=0) {
		return;
	}
	hardLimit--;

	return queue.add(function() {
		return checkWikiPage(URL);
	})
	.then(function(processedWikiPage) {
		return processLinks(processedWikiPage);
	})
	.then(function(processedWikiPage) {
		return db.processedPageInsert(processedWikiPage);	
	})
	.catch(function(err) {
		logger.warn(JSON.stringify(err))
	})
	.then(function(result) {
		//logger.warn(result)
	});
};

const processLinks = function(processedWikiPage) {
	const links = processedWikiPage.links;
	return new Promise(function(resolve, reject) { 
		logger.silly(links);
		for(let i = 0; i < links.length; i++) {
			addToQueue(links[i]);
		}
		resolve(processedWikiPage);
	});
};

logger.info('adding main page to queue');
addToQueue('https://sco.wikipedia.org/wiki/Main_Page')
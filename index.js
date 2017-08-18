"use strict"

const logger = require('./logger.js');
const processor = require("./pageProcessor.js");
const checkWikiPage = require("./pageProcessor.js").checkWikiPage;
const Promise = require('bluebird');
const Queue = require('promise-queue')
//Queue.configure(Promise);

let hardLimit = 15;

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


addToQueue('https://sco.wikipedia.org/wiki/Main_Page');

/*queue.add(checkWikiPage('https://sco.wikipedia.org/wiki/Main_Page')
	.then(function(result){
		logger.debug(result.links);

	})
)*/
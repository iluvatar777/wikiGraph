"use strict"

const logger = require('./logger.js');
const db = require("./dbHandler.js");
const checkWikiPage = require("./pageProcessor.js").checkWikiPage;
const linksFromList = require("./pageProcessor.js").linksFromList;
const Promise = require('bluebird');
const Queue = require('promise-queue')

const TimeoutError = Promise.TimeoutError

let hardLimit = 1000;

const queue = new Queue(3, Infinity);

const monitor = function(domain, interval) {
	interval = Math.min((typeof interval !== 'undefined') ?  interval : queue.getQueueLength() * 1000, 60000);

	const currQueued = queue.getQueueLength()
	const pending = queue.getPendingLength()
	const queueSize = currQueued + pending;
	
	if (interval == 0) {
		logger.info('Monitor finished.')
		return;
	}

	logger.verbose('Monitor. curently queued: ' + currQueued + '. pending: ' + pending + '. next check: ' + (interval / 1000) + 's.');

	if (queueSize <= 1) {
		logger.info('Monitor loading pages from db for processing');
		db.query('CALL getUnprocessed(?,?,?,@unprocessed); SELECT @unprocessed;', [domain, 0, '0000-00-00 00:00:00'], 'monitor')
		.then(function(result){
			const links = linksFromList(result.rows[result.rows.length-1][0]['@unprocessed'], domain);
			for(let i = 0; i < links.length; i++) {
				addToQueue(links[i]);
			}
			logger.info('Monitor added ' + links.length + ' pages to queue.');
			setTimeout(monitor, interval);
		});
	}
	else {
		setTimeout(monitor, interval);
	}
}

const addToQueue = function(URL) {
	if (hardLimit <= 0) {
		if (hardLimit == 0) {
			logger.info('Queue hardlimit has been reached. No more pages will be added to queue.')
			hardLimit--;
		}
		return;
	}
	hardLimit--;
	logger.silly('addToQueue: ' + URL);

	// TODO check if currently in queue first
	return queue.add(function() {
		return checkWikiPage(URL).timeout(30000)
		.catch(function(err) {
			logger.warn('Queue timed out on ' + URL)
			throw err;
		});  
	})
	.then(function(processedWikiPage) {
		return processLinks(processedWikiPage);
	})
	.then(function(processedWikiPage) {
		return db.processedPageInsert(processedWikiPage);	
	})
	.catch(function(err) {
		logger.warn('Queue error for ' + URL + ' ' + JSON.stringify(err))
	})
	.then(function(result) {
		logger.verbose('Completed ' + URL);
	});
};

const processLinks = function(processedWikiPage) {
	const links = processedWikiPage.links;
	return new Promise(function(resolve, reject) { 
		for(let i = 0; i < links.length; i++) {
			addToQueue(links[i]);
		}
		resolve(processedWikiPage);
	});
};

logger.info('adding main page to queue');
addToQueue('https://sco.wikipedia.org/wiki/Main_Page')

monitor('sco', 1000);
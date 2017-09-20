"use strict"

const logger = require('./logger.js');
const db = require("./dbHandler.js");
const checkWikiPage = require("./pageProcessor.js").checkWikiPage;
const linksFromList = require("./pageProcessor.js").linksFromList;
const Promise = require('bluebird');
const Queue = require('promise-queue')

const TimeoutError = Promise.TimeoutError
Promise.config({
    cancellation: true,
});

//let hardLimit = 100000;

const maxConcurrent = 10;
const queue = new Queue(maxConcurrent, Infinity);

const monitor = function(domain, interval) {
	interval = Math.max(Math.min((typeof interval !== 'undefined') ?  interval : queue.getQueueLength() / maxConcurrent * 1000, 60000), 1000);

	const currQueued = queue.getQueueLength()
	const pending = queue.getPendingLength()
	const queueSize = currQueued + pending;
	
	logger.verbose('Monitor. curently queued: ' + currQueued + '. pending: ' + pending + '. next check: ' + (interval / 1000) + 's.');

	if (queueSize + 2 < maxConcurrent) {
		logger.info('Monitor loading pages from db for processing');
		db.query('CALL getUnprocessed(?,?,?,@unprocessed); SELECT @unprocessed;', [domain, 50, '0000-00-00 00:00:00'], 'monitor')
		.then(function(result){
			const rawLinks = result.rows[result.rows.length-1][0]['@unprocessed'];
			const links = linksFromList(rawLinks, domain);
			logger.debug('Monitor adding unprocessed for ' + domain + ': ' + JSON.stringify(rawLinks));
			for(let i = 0; i < links.length; i++) {
				addToQueue(links[i]);
			}
			logger.info('Monitor added ' + links.length + ' pages to queue.');
			if (interval == 0 && links.length == 0) {
				logger.info('Monitor going to sleep. Waking in 30 minutes')
				interval = 30 * 60 * 1000;
			}
			setTimeout(monitor, interval, domain);
		});
	}
	else {
		setTimeout(monitor, interval, domain);
	}
}

const addToQueue = function(URL) {
	/*if (hardLimit <= 0) {
		if (hardLimit == 0) {
			logger.info('Queue hardlimit has been reached. No more pages will be added to queue.')
			hardLimit--;
		}
		return;
	}
	hardLimit--;*/
	logger.silly('addToQueue: ' + URL);

	// TODO check if currently in queue first
	return queue.add(function() {
		return checkWikiPage(URL).timeout(5000) //30000
		.catch(TimeoutError, function(err) {
			logger.warn('Queue timed out on ' + URL)
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
addToQueue('https://sco.wikipedia.org/wiki/Louis_Gaucher,_Duke_o_Châtillon')

monitor('sco', 1000);
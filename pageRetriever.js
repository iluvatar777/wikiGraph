"use strict"

const Promise = require('bluebird');
const request = require('request');
const cheerio = require('cheerio');
const logger = require('winston');

const getPage = function(url, retries) {
	retries = (typeof retries !== 'undefined') ?  retries : 2;

	return new Promise(function(resolve, reject) { 
		logger.debug('GetPage attempt for ' + url);
		const t0 = process.hrtime();
		request.get({
			    //url: encodeURI(url)
			    url: url
			}, 
			function(err, response, body) {
				const diff = process.hrtime(t0);
				const code = !!response ? response.statusCode : 'No response.';

				if (!err && code == 200) {
					const O = cheerio.load(body);					// this could be confusing with timouts in the main promise chain
					O.requestURL = url;
					logger.debug('getPage Success for ' + url + '. in ' + (diff[0]+diff[1]/1e9) + 's.');
					resolve(O);
				} 
				else if (!err && code == 404 && response.body.includes('<!DOCTYPE')) {
					const O = cheerio.load(body);
					O.requestURL = url;
					O.exists = 0;
					logger.debug('getPage Success for non-existent wiki page ' + url + '. in ' + (diff[0]+diff[1]/1e9) + 's.');
					resolve(O);
				}
				else {
					if (retries > 0) {
						logger.debug('getPage Retry for ' + url + '. current status: ' + code + '. remaining: ' + (retries - 1) + ' ' + (diff[0]+diff[1]/1e9) + 's.');
						return new Promise(function(resolve, reject) { 
							return getPage(url, retries - 1);
						})
					}
					else {
						logger.warn('getPage Failure (' + code + ')  + for ' +  url + '. ' + (diff[0]+diff[1]/1e9) + 's.');
						reject(response);
					}
				}
			}
		);
	})
};

exports.getPage = getPage;
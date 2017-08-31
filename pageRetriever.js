"use strict"

const Promise = require('bluebird');
const request = require('request');
const cheerio = require('cheerio');
const logger = require('winston');

const getPage = function(url, retries) {
	retries = (typeof retries !== 'undefined') ?  retries : 2;

	return new Promise(function(resolve, reject) { 
		logger.debug('GetPage attempt for ' + url);
		request.get({
			    url: url
			}, 
			function(err, response, body) {
				if (!err && response.statusCode == 200) {
					const O = cheerio.load(body);					// this could be confusing with timouts in the main promise chain
					O.requestURL = url;
					logger.debug('getPage Success for ' + url);
					resolve(O);
				} else {
					if (retries > 0) {
						logger.debug('getPage Retry for ' + url + '. remaining: ' + (retries - 1));
						return new Promise(function(resolve, reject) { 
							return getPage(url, retries - 1);
						})
					}
					else {
						logger.warn('getPage Failure (' + response.statusCode + ')  + for ' +  url);
						reject(response);
					}
				}
			}
		);
	})
};

exports.getPage = getPage;
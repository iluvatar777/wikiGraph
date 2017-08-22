"use strict"

const Promise = require('bluebird');
const request = require('request');
const cheerio = require('cheerio');
const logger = require('winston');

const getPage = function(url) {
	return new Promise(function(resolve, reject) { 
		logger.debug("getPage attempt for " + url);
		request.get({
			    url: url
			}, 
			function(err, response, body) {
				if (!err && response.statusCode == 200) {
					const O = cheerio.load(body);					// this could be confusing with timouts in the main promise chain
					O.requestURL = url;
					logger.debug("getPage Success for " + url);
					resolve(O);
				} else {
					logger.warn('getPage Failure (' + err + ')  + for ' +  url);
					reject(err);
				}
			}
		);
	})
};

exports.getPage = getPage;
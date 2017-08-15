"use strict"

const Promise = require('bluebird');

const processWikiPage = function($) {
	return new Promise(function(resolve, reject) { 
		let results = {links: []};
		$('a').each(function (i, elem) {
			results.links[i] = $(this).attr('href');
		});
		resolve(results);
	});
};


exports.processWikiPage = processWikiPage;
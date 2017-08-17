"use strict"

const Promise = require('bluebird');
const logger = require('winston');
const getPage = require("./pageRetriever.js").getPage;


const checkWikiPage = function(pageURL, domain) {
	domain = (typeof domain !== 'undefined') ?  domain : getWikiDomain(pageURL);
	//TODO clean URL, check if in DB, or if DB update needed.

	return getPage(pageURL)
	.then(function(result){
		return processWikiPage(result, domain)
	});
	//.then(function(result){
	//	logger.debug(result.links);
	//});
};

const processWikiPage = function($, domain) {
	domain = (typeof domain !== 'undefined') ?  domain : getWikiDomain($('[rel="canonical"]').first().attr('href'));
	return new Promise(function(resolve, reject) { 
		let results = {links: [], specialLinks: [], nonDomainLinks: []};
		$('a').each(function (i, elem) {
			const URL = $(this).attr('href');
			if (isDomainLink(URL, domain)) {
				if (isSpecialLink(URL, domain)) {
					results.specialLinks.push(getFullWikiLink(URL, domain));
				}
				else {
					results.links.push(getFullWikiLink(URL, domain));
				}
			}
			results.nonDomainLinks.push(URL);
		});
		resolve(results);
	});
};

const getWikiDomain = function(URL) {
	if ((''+URL.split('/')[2]).includes('wikipedia.org')) {
		return URL.split('/')[2].split('.')[0];
    }
	if ((''+URL.split('/')[0]).includes('wikipedia.org')) {
		return URL.split('/')[0].split('.')[0];
    }
};

const getFullWikiLink = function(URL, domain) {
	if ((''+URL.split('/')[1]) == 'wiki') {
		return 'https://' + domain + '.wikipedia.org' + URL;
    }
	if ((''+URL.split('/')[0]).includes('wikipedia.org')) {
		return 'https://' + URL;
    }
    return URL;
};

const isDomainLink = function(URL, domain) {
	try {
		if (URL.split('/')[1] == 'wiki') {
			return true;
		}
		if (URL.split('/')[2].split('.')[0] == domain.split('.')[0]){
			return true;
		}
	}
	catch(ex){}

	return false;
};

const isSpecialLink = function(URL, domain) {
	return getFullWikiLink(URL, domain).split('/')[4].includes(':');
};

exports.checkWikiPage = checkWikiPage;
exports.processWikiPage = processWikiPage;
exports.isDomainLink = isDomainLink;
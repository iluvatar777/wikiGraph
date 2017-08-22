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
};

const processWikiPage = function($, domain) {
	return new Promise(function(resolve, reject) { 
		const isRedirect = $('ul .redirectText');
		const pageName = getShortName($.requestURL);
		let processedWikiPage = {	links: [], 
									specialLinks: [], 
									nonDomainLinks: [], 
									domain: domain,
									isRedirect: isRedirect,
									URL: $.requestURL,
									pageName: pageName
								};

		if (isRedirect) {
			logger.info('redirect found: ' + processedWikiPage.URL);
		}

		$('a').each(function (i, elem) {
			const URL = $(this).attr('href');

			//logger.debug(''+isFollowLink(URL, domain)+'|'+isDomainLink(URL, domain)+'|'+isSpecialLink(URL, domain)+'|'+isDiscardLink(URL, domain)+'|'+URL)
			if (isFollowLink(URL, domain)) {
				processedWikiPage.links.push(getFullWikiLink(URL, domain)); //TODO handle redirects
			} else if (isSpecialLink(URL, domain)) {
				//processedWikiPage.specialLinks.push(getFullWikiLink(URL, domain));
			}
		});
		resolve(processedWikiPage);
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
	URL = encodeURI(URL);
	if (!URL.includes('/')) {
		return 'https://' + domain + '.wikipedia.org/wiki/' + URL;
    }
	if ((''+URL.split('/')[1]) == 'wiki') {
		return 'https://' + domain + '.wikipedia.org' + URL;
    }
	if ((''+URL.split('/')[0]).includes('wikipedia.org')) {
		return 'https://' + URL;
    }
    return URL;
};

const getShortName = function(URL) {
	const spl = URL.split('/');
    return decodeURI(spl[spl.length - 1]);
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
	try {
		return getFullWikiLink(URL, domain).split('/')[4].includes(':');
	}
	catch(ex) {
		return false;
	}
};

// mobile links, /w/ links
const isDiscardLink = function(URL, domain) {
	try {
		return (URL.includes('/w/')||getFullWikiLink(URL, domain).split('/')[4].includes('.m.'));
	}
	catch(ex) {
		return true;
	}
};

// only links in the domain that are not special or mobile should be followed
const isFollowLink = function(URL, domain) { 
	try {
		return (isDomainLink(URL, domain) && !isSpecialLink(URL, domain) && !isDiscardLink(URL, domain));
	}
	catch(ex) {
		return false;
	}
};

exports.checkWikiPage = checkWikiPage;
exports.processWikiPage = processWikiPage;
exports.isDomainLink = isDomainLink;
exports.isFollowLink = isFollowLink;
exports.getFullWikiLink = getFullWikiLink;
exports.isDomainLink = getShortName;
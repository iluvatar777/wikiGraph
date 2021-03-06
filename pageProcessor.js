"use strict"

const Promise = require('bluebird');
const logger = require('winston');
const getPage = require("./pageRetriever.js").getPage;
const db = require("./dbHandler.js");

Promise.config({
    cancellation: true,
});

const checkWikiPage = function(pageURL, domain) {
	domain = (typeof domain !== 'undefined') ?  domain : getWikiDomain(pageURL);
	const sql = "CALL recentlyProcessed(?,?,'0000-00-00 00:00:00', @recent); SELECT @recent"

	return db.query(sql, [domain, getShortName(pageURL)], 'checkWikiPage')
	.then(function(result){
		// reduce http requests with a quick db check
		const recent = result.rows[result.rows.length-1][0]['@recent'];
		if (recent == 1) { 
			logger.verbose('Canceling ' + pageURL + ', recently processed.')
			checkWikiPage.cancel();
		}

		return getPage(pageURL)
		.catch(function(ex) {
			logger.warn('checkWikiPage could not retrieve ' + pageURL);
		})
		.then(function(result){
			return processWikiPage(result, domain)
		})
	})
};

const processWikiPage = function($, domain) {
	return new Promise(function(resolve, reject) { 
		const isRedirect = $('#contentSub > span.mw-redirectedfrom').length > 0;

		// TODO only relevent for redlinks, currently not loading these. <a href="/w/index.php?title=Nuclear_force&amp;action=edit&amp;redlink=1" class="new" title="Nuclear force (page disna exeest)">nuclear force</a>
		const exists = (typeof $.exists !== 'number' && $.exists !== 0);

		const pageName = getShortName($.requestURL);
		let processedWikiPage = {	links: [], 
									//specialLinks: [], 
									//nonDomainLinks: [], 
									domain: domain,
									exists: exists,
									isRedirect: isRedirect,
									URL: $.requestURL,
									pageName: pageName
								};

		if (isRedirect) {
			logger.debug('redirect found: ' + processedWikiPage.URL);
		}

		if (exists) { // Don't add any links (Main_Page) for DNE pages
			$('a').each(function (i, elem) {
				const URL = $(this).attr('href');

				//logger.silly(''+isFollowLink(URL, domain)+'|'+isDomainLink(URL, domain)+'|'+isSpecialLink(URL, domain)+'|'+isDiscardLink(URL, domain)+'|'+URL)
				if (isFollowLink(URL, domain)) {
					processedWikiPage.links.push(getFullWikiLink(URL, domain)); //TODO handle redirects
				} else if (isSpecialLink(URL, domain)) {
					//processedWikiPage.specialLinks.push(getFullWikiLink(URL, domain));
				}
			});
		}
		processedWikiPage.links = processedWikiPage.links.filter(function(value, index, self) {return (self.indexOf(value) === index && value !== processedWikiPage.URL);})
		resolve(processedWikiPage);
	})
	.then(function(processedWikiPage){ // now, check the database to see which links are still unprocessed.
		const condUnescape = function(val){if (val.includes('%') && !val.includes('%25')){return decodeURIComponent(val);} return val; }
		const links = processedWikiPage.links.map(function(link){
													return condUnescape(getShortName(link))
												}).join(';')


		const sql = "CALL filterByProcessed(?,?,?,@unprocessed,@processed); SELECT @unprocessed, @processed;"

		return db.query(sql, [processedWikiPage.domain, links, '1970-01-01 01:00:00', 'a', 'b'], 'processWikiPage') // TODO replace with 0000-00-00 00:00:00 and adjust default in proc
		.then(function(result){
			return new Promise(function(resolve, reject) { 
				try {
					processedWikiPage.links = linksFromList(result.rows[result.rows.length-1][0]['@unprocessed'], domain).filter(function(link){return link !== 'https://sco.wikipedia.org/wiki/';});;
					processedWikiPage.processedLinks = result.rows[result.rows.length-1][0]['@processed'].split(';').map(function(val) {return getFullWikiLink(val, processedWikiPage.domain)});
					logger.debug('Processed page ' + processedWikiPage.URL + '. Found unprocessed links: ' + JSON.stringify(processedWikiPage.links));
					logger.silly('  links already processed: ' + processedWikiPage.processedLinks);
					resolve(processedWikiPage);
				}
				catch(ex) {
					reject(ex);
				}
			});
		})
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
	const spl = URL.split('/')
	if (!URL.includes('/')) {
		return 'https://' + domain + '.wikipedia.org/wiki/' + URL;
    }
	if ((''+spl[1]) == 'wiki') {
		return 'https://' + domain + '.wikipedia.org' + URL;
    }
	if ((''+spl[0]).includes('wikipedia.org')) {
		return 'https://' + URL;
    }
    return URL;
};

const getShortName = function(URL) {
	const spl = URL.split('/');
    return spl[spl.length - 1].split('#')[0];
};

const isDomainLink = function(URL, domain) {
	try {
		if (URL.split('/')[1] == 'wiki') {
			return true;
		}
		if (URL.split('/')[2].split('.')[0] == domain.split('.')[0] && URL.split('/')[2].split('.')[1] == 'wikipedia'){
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
		return (URL.includes('/w/')||getFullWikiLink(URL, domain).split('/')[4].includes('.m.')||URL=='');
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

//takes delimited string of shortnames, returns array of full URLs
const linksFromList = function(list, domain, del) {
	del = (typeof del !== 'undefined') ?  del : ';';
	try {
		return list.split(del).map(function(val) {return getFullWikiLink(val, domain)});
	}
	catch(ex) {
		logger.debug('Failed to parse link list(' + domain + '): ' + list);
		return [];
	}

};

exports.checkWikiPage = checkWikiPage;
exports.processWikiPage = processWikiPage;
exports.isDomainLink = isDomainLink;
exports.isDiscardLink = isDiscardLink;
exports.isFollowLink = isFollowLink;
exports.isSpecialLink = isSpecialLink;
exports.getFullWikiLink = getFullWikiLink;
exports.getShortName = getShortName;
exports.linksFromList = linksFromList;
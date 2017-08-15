"use strict"

const logger = require('./logger.js');
const processor = require("./pageProcessor.js");
const getPage = require("./pageRetriever.js").getPage;
const processPage = require("./pageProcessor.js").processWikiPage;

getPage('https://sco.wikipedia.org/wiki/Main_Page')
.then(function(result){
	return processPage(result)
})
.then(function(result){
	logger.debug(result);
});
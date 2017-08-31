"use strict"

const mysql = require('mysql');
const logger = require('winston');
const Promise = require('bluebird');
const getShortName = require("./pageProcessor.js").getShortName;
const delay = Promise.delay;

const processedPageInsert = function(processedWikiPage) {
	const domain = processedWikiPage.domain;
	const shortName = getShortName(processedWikiPage.pageName);
	const isRedirect = processedWikiPage.isRedirect;
	const links = processedWikiPage.links.map(function(link){return getShortName(link)}).join(';')
	logger.debug(domain + '|' + shortName + '|' + isRedirect + '|' + links)

	const sql = "CALL pageInsert(?,?,?,?)"
	return query(sql, [domain, shortName, isRedirect, links], 'test')
	.catch(function(ex){
		if (ex.code = 'ER_LOCK_DEADLOCK') {
			logger.debug("ER_LOCK_DEADLOCK detected for " + shortName + '. will retry in 1500ms.');
			return delay(1500).then(function(res){
				logger.debug("Retry insert for " + shortName);
				return query(sql, [domain, shortName, isRedirect, links], 'processedPageInsert');
			});
		}
		logger.info("not ER_LOCK_DEADLOCK " + shorName)
		throw ex;
	});
};

let pool = '';

const initConnectionPool = function() {
	if (pool !== '') {
		logger.warn('Db connection pool already initialized');
		return;
	};

	logger.info('Creating db connection pool');
	pool = mysql.createPool({
		connectionLimit : 10,
		host : 'localhost',
		user : 'root',
		multipleStatements: true
		//password : 'datasoft123'
	});

	pool.on('connection', function (connection) {
		connection.query('USE wikiGraph')
	});
};

const closeConnectionPool = function() {					// TODO not clean
	if (pool === '') {
		logger.info('Db connection pool not initialized for closing');
		return;
	};
	logger.info('Closing db connection');
	pool.end();

	pool = '';
};

const query = function(sql, params, handle) {
	return new Promise(function(resolve, reject) {
		try {
			if (pool === '') {
				reject(new Error('Query error - Db connection pool not initialized')); 
			};


			logger.debug("Query: " + sql + " Params: " + JSON.stringify(params));
			pool.query(sql, params, function(err, rows, fields) {
					if (err) { 
						err.handle = handle;
						reject(err);
					}
					resolve({rows: rows, fields: fields, handle: handle});
				});
		}
		catch(ex){
			reject(ex);
		}
	});
};

const test = function() {
	return new Promise(function(resolve, reject) {
		initConnectionPool();

		query('SELECT ? + ? AS solution', [4,5])
		.then(function(rows, fields) {
			logger.info('test succeeded. rows:' + JSON.stringify(rows));
		})
		.catch(function(err) {
			logger.error('test failed:' + err);
			reject();
		})
		.finally(function() {
			resolve();
		});
	});
};

initConnectionPool();	// TODO move this elsewhere

exports.processedPageInsert = processedPageInsert;
exports.initConnectionPool = initConnectionPool;
exports.closeConnectionPool = closeConnectionPool;
exports.query = query;
exports.test = test;
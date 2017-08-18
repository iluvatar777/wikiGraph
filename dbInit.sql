CREATE DATABASE IF NOT EXISTS wikiGraph;

USE wikiGraph;

CREATE TABLE IF NOT EXISTS page (
    id int NOT NULL AUTO_INCREMENT,
    wiki varchar(4) NOT NULL,
	fullname varchar(255) NOT NULL,	
	processed boolean DEFAULT 0,	
	PRIMARY KEY (id),
	CONSTRAINT PK_post (wiki, fullname)
);

CREATE TABLE IF NOT EXISTS link (
	source int NOT NULL,
	destination int NOT NULL,										
	CONSTRAINT id PRIMARY KEY (source, destination),
	CREATE UNIQUE INDEX on (destination, source),
	FOREIGN KEY (source) REFERENCES page(id),
	FOREIGN KEY (destination) REFERENCES page(id)
);
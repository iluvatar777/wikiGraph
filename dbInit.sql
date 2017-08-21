CREATE DATABASE IF NOT EXISTS wikiGraph;

USE wikiGraph;

DROP TABLE link;
DROP TABLE redirect;
DROP TABLE page;


CREATE TABLE IF NOT EXISTS page (
    id int NOT NULL AUTO_INCREMENT,
    wiki varchar(4) NOT NULL,
	fullname varchar(255) NOT NULL,	
	processed boolean DEFAULT 0,
	processTime timestamp DEFAULT CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,	
	PRIMARY KEY (id),
	UNIQUE (wiki, fullname)
);

CREATE TABLE IF NOT EXISTS link (
	source int NOT NULL,
	destination int NOT NULL,			
	processTime timestamp DEFAULT CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,							
	CONSTRAINT id PRIMARY KEY (source, destination),
	UNIQUE (destination, source),
	FOREIGN KEY (source) REFERENCES page(id),
	FOREIGN KEY (destination) REFERENCES page(id)
);

CREATE TABLE IF NOT EXISTS redirect (
	source int NOT NULL,
	destination int NOT NULL,
	processTime timestamp DEFAULT CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
	FOREIGN KEY (source) REFERENCES page(id),
	FOREIGN KEY (destination) REFERENCES page(id)
);
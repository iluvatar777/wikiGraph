CREATE DATABASE IF NOT EXISTS wikiGraph;

USE wikiGraph;

DROP PROCEDURE pageInsert;
DROP TABLE link;
DROP TABLE redirect;
DROP TABLE page;



--DROP TABLE scratch;
--CREATE TABLE scratch (
--		val varchar(65535)
--);
		--INSERT INTO scratch(val) VALUES(CONCAT(wiki, ' ', fullname, ' ', @sourceId));

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



DELIMITER //
CREATE PROCEDURE pageInsert (
	    wiki varchar(4),
		fullname varchar(255),	
		linkList varchar(65535)
	)
	BEGIN
		DECLARE strLen    INT DEFAULT 0;
		DECLARE SubStrLen INT DEFAULT 0;
		DECLARE linkStr   varchar(255) DEFAULT NULL;

		INSERT INTO page(wiki, fullname, processed) VALUES(wiki,fullname,1) 
			ON DUPLICATE KEY UPDATE processed = 1, processTime = CURRENT_TIMESTAMP;
		SELECT id INTO @sourceId FROM page p WHERE p.wiki = wiki AND p.fullname = fullname;

		  IF linkList IS NULL THEN
		    SET linkList = '';
		  END IF;

		link_loop:
		  LOOP
		    SET strLen = LENGTH(linkList);
		    SET SubStrLen = LENGTH(SUBSTRING_INDEX(linkList, ',', 1));
		    SET linkStr = MID(linkList, 1, SubStrLen);

		    INSERT IGNORE INTO page(wiki, fullname) VALUES (wiki, linkStr);
		    INSERT IGNORE INTO link(source, destination) 
		    	SELECT @sourceId, p.id
		    	FROM page p WHERE fullname = linkStr;
		    
		    SET linkList = MID(linkList, SubStrLen + 2, strLen);

		    IF linkList = '' THEN
		      LEAVE link_loop;
		    END IF;
		  END LOOP link_loop;

	END //
DELIMITER ;
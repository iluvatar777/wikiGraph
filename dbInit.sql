CREATE DATABASE IF NOT EXISTS wikiGraph;

USE wikiGraph;

DROP PROCEDURE pageInsert;
DROP PROCEDURE filterByProcessed;
DROP PROCEDURE getUnprocessed;
DROP TABLE link;
DROP TABLE redirect;
DROP TABLE page;

--DROP TABLE scratch;
--CREATE TABLE scratch (
--		val varchar(65535)
--);
--		INSERT INTO scratch(val) VALUES(CONCAT(wiki, ' ', fullname, ' ', @sourceId, '  ', linkList));
--		INSERT INTO scratch(val) VALUES(CONCAT(linkStr, ': ', @pages, '  ', @pagesTEMP));
--		IF linkStr LIKE '%,%' THEN
--			INSERT INTO scratch(val) VALUES(CONCAT(wiki, ' ', fullname, ' ', @sourceId, '  ', linkStr, '  ', linkList));
--		END IF;




CREATE TABLE IF NOT EXISTS page (
    id int NOT NULL AUTO_INCREMENT,
    wiki varchar(4) NOT NULL,
	fullname varchar(255) NOT NULL,	
	processed boolean DEFAULT 0,
	isRedirect boolean DEFAULT 0,
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
		isRedirect boolean,
		linkList varchar(65535)
	)
	BEGIN
		DECLARE strLen    INT DEFAULT 0;
		DECLARE SubStrLen INT DEFAULT 0;
		DECLARE linkStr   varchar(255) DEFAULT NULL;

		INSERT INTO page(wiki, fullname, isRedirect, processed) VALUES(wiki, fullname, isRedirect, 1) 
			ON DUPLICATE KEY UPDATE processed = 1, processTime = CURRENT_TIMESTAMP, isRedirect = isRedirect;
		SELECT id INTO @sourceId FROM page p WHERE p.wiki = wiki AND p.fullname = fullname;

		IF linkList IS NULL THEN
		  SET linkList = '';
		END IF;
		
		link_loop:
		  LOOP
		    SET strLen = CHAR_LENGTH(linkList);
		    SET SubStrLen = CHAR_LENGTH(SUBSTRING_INDEX(linkList, ';', 1));
		    SET linkStr = SUBSTRING_INDEX(linkList, ';', 1);
			
			INSERT IGNORE INTO page(wiki, fullname) VALUES (wiki, linkStr);

		    INSERT IGNORE INTO link(source, destination) 
		    	SELECT @sourceId, p.id
		    	FROM page p WHERE p.wiki = wiki AND p.fullname = linkStr;
		    
		    SET linkList = MID(linkList, SubStrLen + 2, strLen);

		    IF linkList = '' THEN
		      LEAVE link_loop;
		    END IF;
		  END LOOP link_loop;
	END //

CREATE PROCEDURE filterByProcessed (
	    wiki varchar(4),
		linkList varchar(65535),
		staleTime timestamp,
		OUT unprocessed varchar(65535),
		OUT processed varchar(65535)
	)
	BEGIN
		DECLARE strLen    INT DEFAULT 0;
		DECLARE SubStrLen INT DEFAULT 0;
		DECLARE linkStr   varchar(255) DEFAULT NULL;
		DECLARE pages    INT DEFAULT 0;

		IF staleTime IS NULL THEN
			SET staleTime = CURRENT_TIMESTAMP - INTERVAL 1 WEEK;
		END IF;

		SET unprocessed = '';
		SET processed = '';

		link_loop:
		  LOOP
		    SET strLen = CHAR_LENGTH(linkList);
		    SET SubStrLen = CHAR_LENGTH(SUBSTRING_INDEX(linkList, ';', 1));
		    SET linkStr = SUBSTRING_INDEX(linkList, ';', 1);

			SELECT @pages := COUNT(*) FROM page p
				WHERE p.wiki = wiki AND p.fullname = linkStr 
				AND (p.processed = 1 OR p.processTime < staleTime);

			IF @pages = 0 THEN
				SET unprocessed = CONCAT(unprocessed, ';', linkStr);
			ELSE
				SET processed = CONCAT(processed, ';', linkStr);
			END IF;

		    SET linkList = MID(linkList, SubStrLen + 2, strLen);

		    IF linkList = '' THEN
		      LEAVE link_loop;
		    END IF;
		  END LOOP link_loop;

		  SET unprocessed = MID(unprocessed, 2, LENGTH(unprocessed));
		  SET processed = MID(processed, 2, LENGTH(processed));
	END //

CREATE PROCEDURE getUnprocessed (
	    wiki varchar(4),
	    maxRows int,
		staleTime timestamp,
		OUT unprocessed varchar(65535)
	)
	BEGIN
		SET unprocessed = '';
		
		IF maxRows IS NULL OR maxRows = 0 THEN
			SET maxRows = 10;
		END IF;

		IF staleTime IS NULL OR staleTime = '0000-00-00 00:00:00' THEN
			SET staleTime = CURRENT_TIMESTAMP - INTERVAL 1 DAY;
		END IF;

		SET unprocessed = CONCAT('', (SELECT GROUP_CONCAT(limiter.fullname SEPARATOR ';') FROM (
			SELECT p.fullname FROM page p
				WHERE p.wiki = wiki
			    AND p.processed = 0 OR (p.processTime < staleTime)
			    ORDER BY p.processTime DESC 
			    LIMIT maxRows) limiter));
	END //
DELIMITER ;
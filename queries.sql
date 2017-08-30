USE wikiGraph;
		  
SELECT COUNT(*), processed FROM page 
	GROUP BY processed;
							 
SELECT COUNT(*) AS 'COUNT(*) of link' FROM link;

SELECT * FROM page p;

SELECT l.source, l.destination, l.processTime, s.fullname, s.processed, d.fullname, d.processed 
	FROM link l JOIN page s JOIN page d 
	ON l.source = s.id AND l.destination = d.id;

SELECT l.source, l.destination, l.processTime, s.fullname, d.fullname, d.processed 
	FROM link l JOIN page s JOIN page d 
	ON l.source = s.id AND l.destination = d.id
    WHERE s.fullname = 'Electron' OR d.fullname = 'Electron';

SELECT COUNT(*), p.fullname FROM link l JOIN page p ON l.source = p.id
	GROUP BY p.fullname
    ORDER BY COUNT(*) DESC;

SET @binSize = 10;
SELECT (numLinks DIV @binSize) * @binSize + 1 AS 'Bin', 
		CONCAT(MIN(numLinks),' to ', MAX(numLinks)) AS 'Range', 
		COUNT(*) AS 'Source count'
	FROM (SELECT COUNT(*) AS numLinks FROM link GROUP BY source) linkCounts
	GROUP BY (numLinks - 1) DIV @binSize
	ORDER BY numLinks DESC;
    
SELECT (numLinks DIV @binSize) * @binSize + 1 AS 'Bin', 
		CONCAT(MIN(numLinks),' to ', MAX(numLinks)) AS 'Range', 
		COUNT(*) AS 'Destination count'
	FROM (SELECT COUNT(*) AS numLinks FROM link GROUP BY destination) linkCounts
	GROUP BY (numLinks - 1) DIV @binSize
	ORDER BY numLinks DESC;
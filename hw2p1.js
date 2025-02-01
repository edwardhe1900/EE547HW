const http = require('http');
const url = require('url');
const fs = require('fs').promises;

const PORT = 8088;
let numRequests = 0;
let numErrors = 0;

// tool1
const factorial = (num) => {
    let result = BigInt(1);
    for (let i = BigInt(2); i <= BigInt(num); i++) {
        result *= i;
    }
    return result;
};

// tool2 calcutechar
const countCharacters = (str) => {
    const charMap = new Map();
    for (const char of str.toLowerCase()) {
        charMap.set(char, (charMap.get(char) || 0) + 1);
    }
    return charMap;
};

// tool2 calculate anagram
const calculateAnagrams = (str) => {
    const charCount = countCharacters(str);
    const numerator = factorial(str.length);
    const denominator = [...charCount.values()].reduce((acc, count) => acc * factorial(count), BigInt(1));
    return numerator / denominator;
};

// tool3 json response
const sendJsonResponse = (res, statusCode, data) => {
    const responseBody = JSON.stringify(data);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(responseBody);
};

// ping204
const handlePing = (res) => {
    res.writeHead(204);
    res.end();
};

//  /anagram request
const handleAnagram = (query, res) => {
    const alphaRegex = /^[a-zA-Z]+$/;
    if (!query.p || !alphaRegex.test(query.p)) {
        numErrors++;
        res.writeHead(400);
        res.end();
        return;
    }

    const numAnagrams = calculateAnagrams(query.p);
    sendJsonResponse(res, 200, { p: query.p, total: numAnagrams.toString() });
};

//  /secret request
const handleSecret = async (res) => {
    try {
        const data = await fs.readFile('/tmp/secret.key', 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(data);
    } catch (err) {
        numErrors++;
        res.writeHead(404);
        res.end();
    }
};

//  /status request
const handleStatus = (res) => {
    const time = new Date().toISOString().split('.')[0] + 'Z';
    sendJsonResponse(res, 200, { time, req: numRequests, err: numErrors });
};

// router distribute
const router = {
    '/ping': handlePing,
    '/anagram': handleAnagram,
    '/secret': handleSecret,
    '/status': handleStatus,
};

// creat http
const server = http.createServer(async (req, res) => {
    numRequests++;
    const parsedUrl = url.parse(req.url, true);
    const handler = router[parsedUrl.pathname] || (() => {
        numErrors++;
        res.writeHead(404);
        res.end();
    });

    try {
        await handler(parsedUrl.query, res);
    } catch (err) {
        console.error('Error handling request:', err);
        numErrors++;
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error: ${err.message}`);
    }
});

// initialserver
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
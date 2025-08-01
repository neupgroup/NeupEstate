// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

console.log('--- Starting Node.js server script ---');

const dev = process.env.NODE_ENV !== 'production';
// cPanel/Passenger will supply a PORT environment variable.
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Environment: ${dev ? 'development' : 'production'}`);
console.log(`Attempting to use port: ${port}`);

const app = next({ dev });
const handle = app.getRequestHandler();

console.log('--- Preparing Next.js application ---');
app.prepare().then(() => {
  console.log('--- Next.js application prepared successfully ---');
  createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) {
        console.error('--- FAILED TO START SERVER ---');
        console.error(err);
        throw err;
    }
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`
    );
  });
}).catch((ex) => {
    console.error('--- ERROR DURING APP PREPARATION ---');
    console.error(ex.stack);
    process.exit(1);
});

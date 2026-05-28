// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const ERROR_LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'errors.log');

function appendErrorLog(entry) {
  try {
    fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
    fs.appendFileSync(ERROR_LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('[CRITICAL] Failed to append to logs/errors.log', error);
  }
}

process.on('uncaughtException', (error) => {
  appendErrorLog({
    timestamp: new Date().toISOString(),
    context: 'process.uncaughtException',
    message: error?.message || 'Uncaught exception',
    stack: error?.stack || 'No stack trace available.',
    source: 'server',
  });
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  appendErrorLog({
    timestamp: new Date().toISOString(),
    context: 'process.unhandledRejection',
    message: error.message || 'Unhandled rejection',
    stack: error.stack || 'No stack trace available.',
    source: 'server',
  });
});

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
      const normalized = err instanceof Error ? err : new Error(String(err));
      appendErrorLog({
        timestamp: new Date().toISOString(),
        context: `server.request ${req.url}`,
        message: normalized.message || 'Error occurred handling request',
        stack: normalized.stack || 'No stack trace available.',
        source: 'server',
      });
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

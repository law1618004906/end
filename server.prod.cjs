// server.prod.cjs - Next.js Standalone + Socket.IO (production, no TSX)
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

// Make dotenv optional in production images
try {
  require('dotenv/config');
} catch (_) {
  // no-op
}

// Global error handlers for better diagnostics
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// Inline Socket.IO setup (CommonJS) to avoid importing TS files in production
function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('message', (msg) => {
      try {
        socket.emit('message', {
          text: `Echo: ${msg?.text}`,
          senderId: 'system',
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('socket message handler error', e);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    socket.emit('message', {
      text: 'Welcome to WebSocket Echo Server!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });
  });
}

const dev = process.env.NODE_ENV !== 'production';
const currentPort = Number(process.env.PORT) || 3000;
const hostname = '0.0.0.0';

async function createCustomServer() {
  try {
    console.log(`[server] NODE_ENV=${process.env.NODE_ENV} PORT=${currentPort}`);
    const nextApp = next({
      dev,
      dir: process.cwd(),
      conf: dev ? undefined : { distDir: './.next' },
    });

    await nextApp.prepare();
    console.log('[server] Next.js prepared');
    const handle = nextApp.getRequestHandler();

    const server = createServer((req, res) => {
      if (req.url && req.url.startsWith('/api/socketio')) {
        return; // handled by socket.io below
      }
      handle(req, res);
    });

    const io = new Server(server, {
      path: '/api/socketio',
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    setupSocket(io);

    server.listen(currentPort, hostname, () => {
      console.log(`> Ready on http://${hostname}:${currentPort}`);
      console.log(`> Socket.IO server running at ws://${hostname}:${currentPort}/api/socketio`);
    });
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

createCustomServer();

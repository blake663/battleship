import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import next, { NextApiRequest } from 'next';
import http from 'http';
import { parse } from 'url';

// create custom server
const nextApp = next({ dev: process.env.NODE_ENV !== 'production' });
const handler = nextApp.getRequestHandler();
// Store connected clients
const clients = new Set<WebSocket>();

nextApp.prepare().then(() => {
  // forward http requests to nextjs
  const server: http.Server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    handler(req, res, parse(req.url || '', true));
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    clients.add(ws);
    console.log('Clients:', clients.size)
  
    ws.on('message', (message: string, isBinary: boolean) => {
      console.log('Received:', isBinary ? message : message.toString());
      // Echo the message back
      ws.send(`Echo: ${message}`);
    });
  
    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
    });
  });

  server.on('upgrade', (req: http.IncomingMessage, socket: http.Socket, head: Buffer) => {
    
    console.log('Upgrade request received');
    
    const { pathname } = parse(req.url || '', true);
    if (pathname === '/_next/webpack-hmr') {
      nextApp.getUpgradeHandler()(req, socket, head);
    }

    if (pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  server.listen(3000, () => {
    console.log('Server started on port 3000');
  });
});

// server.js
// Backend Node.js para DenaisTV: señalización WebRTC y chat en tiempo real
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.get('/', (req, res) => res.send('DenaisTV backend running.'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let streamerSocket = null;
let viewers = {};

io.on('connection', socket => {
  // Login para identificar streamer/viewer
  socket.on('login', username => {
    if (username.toLowerCase() === 'denizze') {
      streamerSocket = socket;
      socket.isStreamer = true;
    } else {
      socket.isStreamer = false;
    }
  });

  // Viewer quiere ver el stream
  socket.on('watcher', () => {
    if (streamerSocket) {
      viewers[socket.id] = socket;
      streamerSocket.emit('watcher', socket.id);
    }
  });

  // WebRTC signaling
  socket.on('offer', (id, message) => {
    io.to(id).emit('offer', socket.id, message);
  });
  socket.on('answer', (id, message) => {
    io.to(id).emit('answer', socket.id, message);
  });
  socket.on('candidate', (id, message) => {
    io.to(id).emit('candidate', socket.id, message);
  });

  // Chat
  socket.on('chat', msg => {
    const user = socket.isStreamer ? 'denizze' : (socket.handshake.query.username || 'viewer');
    io.emit('chat', { user, msg });
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (socket.isStreamer) {
      // Notifica a todos los viewers que el stream terminó
      Object.values(viewers).forEach(v => v.emit('disconnectPeer'));
      streamerSocket = null;
      viewers = {};
    } else {
      if (streamerSocket) streamerSocket.emit('disconnectPeer', socket.id);
      delete viewers[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('DenaisTV backend running on port', PORT);
});

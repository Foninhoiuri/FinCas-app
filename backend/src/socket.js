import { Server } from 'socket.io';

let io = null;

export function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/ws',
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);

    // O cliente envia qual user_id está logado
    socket.on('join', (userId) => {
      socket.join('global'); // sala global para todos
      if (userId) socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} entrou`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emite evento para todos os clientes conectados
 * @param {string} event - Nome do evento (ex: 'transaction:created')
 * @param {object} data - Dados do evento
 */
export function emit(event, data) {
  if (io) {
    io.to('global').emit(event, data);
  }
}

/**
 * Emite evento só para um usuário específico
 */
export function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function getIO() {
  return io;
}

import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? false 
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/api/socketio'
  });

  io.on('connection', (socket) => {
    console.log('🔌 عميل متصل:', socket.id);

    // رد على ping للتأكد من الاتصال
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // معالج قطع الاتصال
    socket.on('disconnect', (reason) => {
      console.log('❌ عميل منقطع:', socket.id, 'السبب:', reason);
    });

    // يمكن إضافة أحداث أخرى هنا حسب الحاجة
    socket.on('join-room', (room: string) => {
      socket.join(room);
      console.log(`👥 العميل ${socket.id} انضم للغرفة: ${room}`);
    });

    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      console.log(`👋 العميل ${socket.id} غادر الغرفة: ${room}`);
    });
  });

  // إرجاع مثيل Socket.IO للاستخدام في أماكن أخرى
  return io;
}

export type SocketIOServer = ReturnType<typeof setupSocket>;

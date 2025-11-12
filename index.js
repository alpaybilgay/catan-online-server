// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// rooms[roomKey] = { players: [socketId, ...] }
const rooms = {};

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  // Odaya katıl
  socket.on("join_room", (room) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    const roomData = rooms[room];

    if (!roomData.players.includes(socket.id)) {
      roomData.players.push(socket.id);
    }

    // Sadece ID listesi gönderiyoruz
    io.to(room).emit("update_players", roomData.players);
  });

  // Yol olayı (şimdilik sadece örnek)
  socket.on("build_road", ({ room, edgeId, playerId }) => {
    console.log(`${playerId} oyuncusu ${edgeId} yolunu yaptı`);
    io.to(room).emit("road_built", { edgeId, playerId });
  });

  // İSİM GÜNCELLEME
  // Client: socket.emit("set_name", { room, playerId, name })
  socket.on("set_name", ({ room, playerId, name }) => {
    // Hiç state tutmuyoruz, sadece broadcast
    io.to(room).emit("name_update", { playerId, name });
  });

  // HAZIRLIK GÜNCELLEME
  // Client: socket.emit("set_ready", { room, playerId, ready })
  socket.on("set_ready", ({ room, playerId, ready }) => {
    io.to(room).emit("ready_update", { playerId, ready: !!ready });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);

    for (const room in rooms) {
      const roomData = rooms[room];
      if (!roomData) continue;

      const before = roomData.players.length;
      roomData.players = roomData.players.filter((id) => id !== socket.id);

      if (roomData.players.length !== before) {
        io.to(room).emit("update_players", roomData.players);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
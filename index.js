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

// rooms[roomKey] = { players: [ { id, name, ready } ] }
const rooms = {};

function emitPlayers(room) {
  const roomData = rooms[room];
  if (!roomData) return;
  io.to(room).emit("update_players", roomData.players);
}

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  // Odaya katıl
  socket.on("join_room", (room) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    const roomData = rooms[room];

    // Zaten ekliysek tekrar ekleme
    const already = roomData.players.find((p) => p.id === socket.id);
    if (!already) {
      roomData.players.push({
        id: socket.id,
        name: `Oyuncu-${socket.id.slice(0, 5)}`,
        ready: false,
      });
    }

    emitPlayers(room);
  });

  // Yol olayı (şimdilik sadece örnek)
  socket.on("build_road", ({ room, edgeId, playerId }) => {
    console.log(`${playerId} oyuncusu ${edgeId} yolunu yaptı`);
    io.to(room).emit("road_built", { edgeId, playerId });
  });

  // İSİM GÜNCELLEME
  // Client'tan: socket.emit("set_name", { room, name })
  socket.on("set_name", ({ room, name }) => {
    const roomData = rooms[room];
    if (!roomData) return;

    const player = roomData.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.name = name;
    emitPlayers(room);
  });

  // HAZIR DURUM GÜNCELLEME
  // Client'tan: socket.emit("set_ready", { room, ready })
  socket.on("set_ready", ({ room, ready }) => {
    const roomData = rooms[room];
    if (!roomData) return;

    const player = roomData.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.ready = !!ready;
    emitPlayers(room);
  });

  // Bağlantı koptu
  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);

    for (const room in rooms) {
      const roomData = rooms[room];
      if (!roomData) continue;

      const before = roomData.players.length;
      roomData.players = roomData.players.filter(
        (p) => p.id !== socket.id
      );

      if (roomData.players.length !== before) {
        emitPlayers(room);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
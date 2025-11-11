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

// rooms[roomKey] = {
//   players: [socketId, ...],
//   names: { [socketId]: string },
//   ready: { [socketId]: boolean },
// }
const rooms = {};

// Odaya ait son durumu herkese gönder
function emitRoomState(room) {
  const data = rooms[room];
  if (!data) return;

  const payload = data.players.map((id) => ({
    id,
    name: data.names[id] || null,
    ready: !!data.ready[id],
  }));

  io.to(room).emit("update_players", payload);
}

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  // Odaya katıl
  socket.on("join_room", (room) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        names: {},
        ready: {},
      };
    }

    const roomData = rooms[room];

    if (!roomData.players.includes(socket.id)) {
      roomData.players.push(socket.id);
    }

    // İstersen burada default isim verebilirsin
    if (!roomData.names[socket.id]) {
      roomData.names[socket.id] = `Oyuncu-${socket.id.slice(0, 5)}`;
    }

    emitRoomState(room);
  });

  // Yol örneği (şimdilik sadece log + broadcast)
  socket.on("build_road", ({ room, edgeId, playerId }) => {
    console.log(`${playerId} oyuncusu ${edgeId} yolunu yaptı`);
    io.to(room).emit("road_built", { edgeId, playerId });
  });

  // İSİM GÜNCELLEME
  socket.on("set_name", ({ room, playerId, name }) => {
    const roomData = rooms[room];
    if (!roomData) return;

    roomData.names[playerId] = name;
    emitRoomState(room);
  });

  // HAZIRLIK GÜNCELLEME
  socket.on("set_ready", ({ room, playerId, ready }) => {
    const roomData = rooms[room];
    if (!roomData) return;

    roomData.ready[playerId] = !!ready;
    emitRoomState(room);
  });

  // Bağlantı koptu
  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);

    for (const room in rooms) {
      const roomData = rooms[room];
      if (!roomData) continue;

      const beforeCount = roomData.players.length;
      roomData.players = roomData.players.filter((id) => id !== socket.id);

      if (beforeCount !== roomData.players.length) {
        delete roomData.names[socket.id];
        delete roomData.ready[socket.id];
        emitRoomState(room);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
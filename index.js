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

    // Her join olduğunda, client tarafındaki eski mantığı bozmamak için
    // sadece ID listesini gönderiyoruz.
    io.to(room).emit("update_players", roomData.players);
  });

  // Yol olayı (şimdilik sadece örnek)
  socket.on("build_road", ({ room, edgeId, playerId }) => {
    console.log(`${playerId} oyuncusu ${edgeId} yolunu yaptı`);
    io.to(room).emit("road_built", { edgeId, playerId });
  });

  // İSİM GÜNCELLEME
  socket.on("set_name", ({ room, playerId, name }) => {
    const roomData = rooms[room];
    if (!roomData) return;

    roomData.names[playerId] = name;

    // Odaya broadcast
    io.to(room).emit("name_updated", { playerId, name });
  });

  // HAZIRLIK GÜNCELLEME
  socket.on("set_ready", ({ room, playerId, ready }) => {
    const roomData = rooms[room];
    if (!roomData) return;

    roomData.ready[playerId] = !!ready;

    // Odaya broadcast
    io.to(room).emit("ready_updated", { playerId, ready: !!ready });
  });

  // Bağlantı koptu
  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);

    for (const room in rooms) {
      const roomData = rooms[room];
      if (!roomData) continue;

      const before = roomData.players.length;

      roomData.players = roomData.players.filter((id) => id !== socket.id);
      delete roomData.names[socket.id];
      delete roomData.ready[socket.id];

      // O odadan gerçekten biri çıktıysa listeyi güncelle
      if (roomData.players.length !== before) {
        io.to(room).emit("update_players", roomData.players);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
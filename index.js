import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

console.log("### Catan server BUILD 4.1.0 ###");
const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// rooms = { [roomId]: { players: [socketId, ...] } }
const rooms = {};

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  // Odaya katıl (id listesi tutuyoruz)
  socket.on("join_room", (room) => {
    console.log("join_room:", room, "->", socket.id);

    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    if (!rooms[room].players.includes(socket.id)) {
      rooms[room].players.push(socket.id);
    }

    io.to(room).emit("update_players", rooms[room].players);
  });

  // İsim güncelleme (server state tutmuyor; sadece broadcast)
  socket.on("set_name", ({ room, playerId, name }) => {
    console.log("SERVER set_name:", { room, playerId, name });
    io.to(room).emit("name_update", { playerId, name });
  });

  // Hazır durumu güncelleme (broadcast)
  socket.on("set_ready", ({ room, playerId, ready }) => {
    console.log("SERVER set_ready:", { room, playerId, ready });
    io.to(room).emit("ready_update", { playerId, ready: !!ready });
  });

  // Yol örneği (mevcut)
  socket.on("build_road", ({ room, edgeId, playerId }) => {
    io.to(room).emit("road_built", { edgeId, playerId });
  });

  // ✅ YENİ: Faz değişimini odadaki herkese yayınla
  socket.on("change_phase", ({ room, phase }) => {
    console.log("SERVER change_phase:", { room, phase });
    io.to(room).emit("phase_update", { phase });
  });

  // Bağlantı kopunca oyuncuyu odalardan düşür
  socket.on("disconnect", () => {
    console.log("Bağlantı koptu:", socket.id);

    for (const room in rooms) {
      if (!rooms[room]) continue;

      const before = rooms[room].players.length;
      rooms[room].players = rooms[room].players.filter(
        (id) => id !== socket.id
      );
      const after = rooms[room].players.length;

      if (before !== after) {
        io.to(room).emit("update_players", rooms[room].players);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
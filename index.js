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

const rooms = {};

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = { players: [] };
    rooms[room].players.push(socket.id);
    io.to(room).emit("update_players", rooms[room].players);
  });

  socket.on("build_road", ({ room, edgeId, playerId }) => {
    io.to(room).emit("road_built", { edgeId, playerId });
  });

  socket.on("disconnect", () => {
    for (const room in rooms) {
      rooms[room].players = rooms[room].players.filter((id) => id !== socket.id);
      io.to(room).emit("update_players", rooms[room].players);
    }
    console.log("Bağlantı koptu:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT} portunda çalışıyor`));
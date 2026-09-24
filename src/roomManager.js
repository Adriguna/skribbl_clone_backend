const Room = require("./classes/Room");

const rooms = new Map();

function generateRoomId() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let roomId = "";

  for (let i = 0; i < 6; i++) {
    roomId += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return roomId;
}

function createRoom(host) {
  let roomId;

  do {
    roomId = generateRoomId();
  } while (rooms.has(roomId));

  const room = new Room(roomId, host);

  rooms.set(roomId, room);

  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function deleteRoom(roomId) {
  rooms.delete(roomId);
}

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
};
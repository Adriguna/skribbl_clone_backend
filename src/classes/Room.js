class Room {
  constructor(roomId, host) {
    this.roomId = roomId;
    this.hostId = host.id;

    this.players = [
      {
        id: host.id,
        name: host.name,
        score: 0,
        ready: false,
      },
    ];

    this.settings = {
      maxPlayers: 8,
      rounds: 3,
      drawTime: 60,
      wordCount: 3,
      hints: true,
    };

    this.game = null;
  }

  addPlayer(player) {
    if (this.players.length >= this.settings.maxPlayers) {
      return false;
    }

    this.players.push({
      id: player.id,
      name: player.name,
      score: 0,
      ready: false,
    });

    return true;
  }

  removePlayer(playerId) {
    this.players = this.players.filter(
      (player) => player.id !== playerId
    );
  }

  getPlayers() {
    return this.players;
  }
}

module.exports = Room;
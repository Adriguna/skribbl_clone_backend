const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const Game = require("./classes/Game");

const {
  createRoom,
  getRoom,
  deleteRoom,
} = require("./roomManager");

const app = express();

app.use(cors());
app.use(express.json());

const server =
  http.createServer(app);

const io =
  new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://skribbl-clone-by-riteshpathak.netlify.app"
      ],
      methods: [
        "GET",
        "POST",
      ],
    },
  });

// ==========================================
// BASIC ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message:
      "Skribbl Clone Server is running",
  });
});

// ==========================================
// BROADCAST PLAYERS
// ==========================================

function broadcastPlayers(
  roomId,
  room
) {
  io.to(roomId).emit(
    "players_update",
    {
      players:
        room.getPlayers(),
    }
  );
}

// ==========================================
// BROADCAST SCORES
// ==========================================

function broadcastScores(
  roomId,
  room
) {
  io.to(roomId).emit(
    "score_update",
    {
      players:
        room.getPlayers(),
    }
  );
}

// ==========================================
// START ROUND TIMER
// ==========================================

function startRoundTimer(
  room,
  roomId
) {
  // Clear previous timer
  if (room.roundTimer) {
    clearInterval(
      room.roundTimer
    );

    room.roundTimer = null;
  }

  const drawTime =
    Number(
      room.settings?.drawTime
    ) || 60;

  let timeLeft =
    drawTime;

  // Initial timer
  io.to(roomId).emit(
    "timer_tick",
    {
      timeLeft,
    }
  );

  room.roundTimer =
    setInterval(() => {
      if (
        !room.game ||
        room.game.phase !==
          "drawing"
      ) {
        clearInterval(
          room.roundTimer
        );

        room.roundTimer =
          null;

        return;
      }

      timeLeft--;

      if (
        timeLeft < 0
      ) {
        timeLeft = 0;
      }

      // ==========================================
      // UPDATE GAME ELAPSED TIME
      // ==========================================

      const elapsedSeconds =
        room.game.updateElapsedTime();

      // ==========================================
      // TIMER
      // ==========================================

      io.to(roomId).emit(
        "timer_tick",
        {
          timeLeft,
        }
      );

      // ==========================================
      // HINT SYSTEM
      // ==========================================

      while (
        room.game.shouldRevealHint(
          elapsedSeconds
        )
      ) {
        const hint =
          room.game.revealNextHint();

        if (!hint) {
          break;
        }

        console.log(
          `Hint ${hint.hintNumber}/${hint.totalHints} revealed in room ${roomId}: ${hint.letter}`
        );

        // Send hint to all players except drawer
        room.players.forEach(
          (player) => {
            if (
              player.id ===
              room.game.drawerId
            ) {
              return;
            }

            io.to(
              player.id
            ).emit(
              "hint_revealed",
              {
                index:
                  hint.index,

                letter:
                  hint.letter,

                maskedWord:
                  hint.maskedWord,

                hintNumber:
                  hint.hintNumber,

                totalHints:
                  hint.totalHints,

                wordLength:
                  hint.wordLength,
              }
            );
          }
        );
      }

      // ==========================================
      // TIME UP
      // ==========================================

      if (
        timeLeft <= 0
      ) {
        clearInterval(
          room.roundTimer
        );

        room.roundTimer =
          null;

        endRound(
          room,
          roomId,
          room.game.currentWord,
          "time_up"
        );
      }
    }, 1000);
}

// ==========================================
// AWARD DRAWER POINTS
// ==========================================

function awardDrawerPoints(
  room
) {
  if (
    !room.game ||
    room.game.drawerPointsAwarded
  ) {
    return 0;
  }

  const drawer =
    room.players.find(
      (player) =>
        player.id ===
        room.game.drawerId
    );

  if (!drawer) {
    return 0;
  }

  const drawerPoints =
    room.game.calculateDrawerPoints();

  drawer.score =
    (drawer.score || 0) +
    drawerPoints;

  room.game.drawerPointsAwarded =
    true;

  return drawerPoints;
}

// ==========================================
// END ROUND
// ==========================================

function endRound(
  room,
  roomId,
  word,
  reason = "time_up"
) {
  if (!room.game) {
    return;
  }

  if (
    room.game.phase ===
    "round_ended"
  ) {
    return;
  }

  if (
    room.game.phase ===
    "game_over"
  ) {
    return;
  }

  // ==========================================
  // STOP GAME TIMER
  // ==========================================

  if (room.roundTimer) {
    clearInterval(
      room.roundTimer
    );

    room.roundTimer =
      null;
  }

  // ==========================================
  // CHANGE PHASE
  // ==========================================

  room.game.phase =
    "round_ended";

  // ==========================================
  // DRAWER SCORE
  // ==========================================

  const drawerPoints =
    awardDrawerPoints(
      room
    );

  // ==========================================
  // FINAL ROUND DATA
  // ==========================================

  const finalPlayers =
    room.getPlayers();

  console.log(
    `Round ${room.game.round} ended in room ${roomId}`
  );

  console.log(
    `Reason: ${reason}`
  );

  console.log(
    `Drawer received ${drawerPoints} points`
  );

  // ==========================================
  // ROUND ENDED EVENT
  // ==========================================

  io.to(roomId).emit(
    "round_ended",
    {
      reason,

      word,

      round:
        room.game.round,

      players:
        finalPlayers,

      drawerPoints,
    }
  );

  // ==========================================
  // UPDATE SCORES
  // ==========================================

  broadcastScores(
    roomId,
    room
  );

  // ==========================================
  // CHECK GAME OVER
  // ==========================================

  const totalRounds =
    Number(
      room.settings?.rounds
    ) || 2;

  if (
    room.game.round >=
    totalRounds
  ) {
    setTimeout(() => {
      if (!room.game) {
        return;
      }

      room.game.phase =
        "game_over";

      const players =
        room
          .getPlayers()
          .sort(
            (a, b) =>
              (b.score || 0) -
              (a.score || 0)
          );

      io.to(roomId).emit(
        "game_over",
        {
          players,
        }
      );

      console.log(
        `Game over in room ${roomId}`
      );
    }, 3000);

    return;
  }

  // ==========================================
  // START NEXT ROUND
  // ==========================================

  setTimeout(() => {
    if (!room.game) {
      return;
    }

    if (
      room.game.phase !==
      "round_ended"
    ) {
      return;
    }

    const nextRoundData =
      room.game.nextRound();

    if (!nextRoundData) {
      return;
    }

    console.log(
      `Starting round ${nextRoundData.round} in ${roomId}`
    );

    // ==========================================
    // SEND NEW ROUND DATA
    // ==========================================

    room.players.forEach(
      (player) => {
        const isDrawer =
          player.id ===
          nextRoundData.drawerId;

        io.to(
          player.id
        ).emit(
          "game_started",
          {
            roomId,

            round:
              nextRoundData.round,

            drawerId:
              nextRoundData.drawerId,

            drawTime:
              nextRoundData.drawTime,

            wordOptions:
              isDrawer
                ? nextRoundData.wordOptions
                : [],

            players:
              room.getPlayers(),

            settings:
              room.settings,
          }
        );
      }
    );

    console.log(
      `Round ${nextRoundData.round} started`
    );
  }, 3000);
}

// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on(
  "connection",
  (socket) => {
    console.log(
      "Player connected:",
      socket.id
    );

    // ========================================
    // CREATE ROOM
    // ========================================

    socket.on(
      "create_room",
      ({
        playerName,
        settings,
      }) => {
        const host = {
          id: socket.id,

          name: playerName,

          score: 0,
        };

        const room =
          createRoom(host);

        // ======================================
        // ROOM SETTINGS
        // ======================================

        if (settings) {
          room.settings = {
            ...room.settings,

            maxPlayers:
              Number(
                settings.maxPlayers
              ) ||
              room.settings
                ?.maxPlayers ||
              8,

            rounds:
              Number(
                settings.rounds
              ) ||
              room.settings
                ?.rounds ||
              3,

            drawTime:
              Number(
                settings.drawTime
              ) ||
              room.settings
                ?.drawTime ||
              60,

            language:
              settings.language ||
              room.settings
                ?.language ||
              "English",

            gameMode:
              settings.gameMode ||
              room.settings
                ?.gameMode ||
              "Normal",

            wordCount:
              Number(
                settings.wordCount
              ) ||
              room.settings
                ?.wordCount ||
              3,

            hints:
              settings.hints !==
              undefined
                ? Number(
                    settings.hints
                  )
                : room.settings
                    ?.hints ??
                  2,

            customWords:
              Array.isArray(
                settings.customWords
              )
                ? settings.customWords
                : room.settings
                    ?.customWords ||
                  [],

            useCustomWords:
              Boolean(
                settings.useCustomWords
              ),
          };
        }

        socket.join(
          room.roomId
        );

        socket.currentRoomId =
          room.roomId;

        // ======================================
        // ROOM CREATED
        // ======================================

        socket.emit(
          "room_created",
          {
            roomId:
              room.roomId,

            players:
              room.getPlayers(),

            settings:
              room.settings,
          }
        );

        console.log(
          `${playerName} created room ${room.roomId}`
        );

        console.log(
          "Room settings:",
          room.settings
        );
      }
    );

    // ========================================
    // JOIN ROOM
    // ========================================

    socket.on(
      "join_room",
      ({
        roomId,
        playerName,
      }) => {
        const room =
          getRoom(roomId);

        if (!room) {
          socket.emit(
            "room_error",
            {
              message:
                "Room not found",
            }
          );

          return;
        }

        if (room.game) {
          socket.emit(
            "room_error",
            {
              message:
                "Game has already started.",
            }
          );

          return;
        }

        const maxPlayers =
          room.settings
            ?.maxPlayers ||
          8;

        if (
          room.players.length >=
          maxPlayers
        ) {
          socket.emit(
            "room_error",
            {
              message:
                "Room is full",
            }
          );

          return;
        }

        const player = {
          id: socket.id,

          name: playerName,

          score: 0,
        };

        const added =
          room.addPlayer(
            player
          );

        if (!added) {
          socket.emit(
            "room_error",
            {
              message:
                "Unable to join room",
            }
          );

          return;
        }

        socket.join(
          room.roomId
        );

        socket.currentRoomId =
          room.roomId;

        // ======================================
        // ROOM JOINED
        // ======================================

        socket.emit(
          "room_joined",
          {
            roomId:
              room.roomId,

            players:
              room.getPlayers(),

            settings:
              room.settings,
          }
        );

        // ======================================
        // INFORM OTHER PLAYERS
        // ======================================

        socket
          .to(room.roomId)
          .emit(
            "player_joined",
            {
              player,

              players:
                room.getPlayers(),
            }
          );

        broadcastPlayers(
          room.roomId,
          room
        );

        console.log(
          `${playerName} joined room ${room.roomId}`
        );
      }
    );

    // ========================================
    // START GAME
    // ========================================

    socket.on(
      "start_game",
      () => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (!room) {
          return;
        }

        // ======================================
        // ONLY HOST
        // ======================================

        if (
          socket.id !==
          room.hostId
        ) {
          socket.emit(
            "room_error",
            {
              message:
                "Only the host can start the game",
            }
          );

          return;
        }

        // ======================================
        // MINIMUM 2 PLAYERS
        // ======================================

        if (
          room.players.length <
          2
        ) {
          socket.emit(
            "room_error",
            {
              message:
                "At least 2 players are required",
            }
          );

          return;
        }

        // ======================================
        // RESET SCORES
        // ======================================

        room.players.forEach(
          (player) => {
            player.score = 0;
          }
        );

        // ======================================
        // CREATE GAME
        // ======================================

        room.game =
          new Game(room);

        const roundData =
          room.game.startGame();

        if (!roundData) {
          socket.emit(
            "room_error",
            {
              message:
                "Unable to start game",
            }
          );

          return;
        }

        // ======================================
        // SEND GAME STARTED
        // ======================================

        room.players.forEach(
          (player) => {
            const isDrawer =
              player.id ===
              roundData.drawerId;

            io.to(
              player.id
            ).emit(
              "game_started",
              {
                roomId,

                round:
                  roundData.round,

                drawerId:
                  roundData.drawerId,

                drawTime:
                  roundData.drawTime,

                wordOptions:
                  isDrawer
                    ? roundData.wordOptions
                    : [],

                players:
                  room.getPlayers(),

                settings:
                  room.settings,
              }
            );
          }
        );

        console.log(
          `Game started in room ${roomId}`
        );
      }
    );

    // ========================================
    // WORD CHOSEN
    // ========================================

    socket.on(
      "word_chosen",
      ({ word }) => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (
          !room ||
          !room.game
        ) {
          return;
        }

        // Only drawer
        if (
          socket.id !==
          room.game.drawerId
        ) {
          return;
        }

        if (
          room.game.phase !==
          "word_selection"
        ) {
          return;
        }

        const selected =
          room.game.chooseWord(
            word
          );

        if (!selected) {
          socket.emit(
            "room_error",
            {
              message:
                "Invalid word selection",
            }
          );

          return;
        }

        console.log(
          `Word selected in ${roomId}: ${word}`
        );

        // ======================================
        // DRAWER GETS ACTUAL WORD
        // ======================================

        io.to(
          room.game.drawerId
        ).emit(
          "word_chosen",
          {
            word,

            drawerId:
              room.game.drawerId,
          }
        );

        // ======================================
        // GUESSERS GET MASKED WORD
        // ======================================

        room.players.forEach(
          (player) => {
            if (
              player.id ===
              room.game.drawerId
            ) {
              return;
            }

            io.to(
              player.id
            ).emit(
              "word_chosen",
              {
                drawerId:
                  room.game.drawerId,

                wordLength:
                  word.length,

                maskedWord:
                  room.game.getMaskedWord(),
              }
            );
          }
        );

        // ======================================
        // START TIMER
        // ======================================

        startRoundTimer(
          room,
          roomId
        );
      }
    );

    // ========================================
    // DRAW START
    // ========================================

    socket.on(
      "draw_start",
      (data) => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (
          !room ||
          !room.game
        ) {
          return;
        }

        if (
          socket.id !==
          room.game.drawerId
        ) {
          return;
        }

        if (
          room.game.phase !==
          "drawing"
        ) {
          return;
        }

        socket
          .to(roomId)
          .emit(
            "draw_start",
            {
              x: data.x,

              y: data.y,

              color:
                data.color ||
                "#000000",

              brushSize:
                data.brushSize ||
                4,
            }
          );
      }
    );

    // ========================================
    // DRAW MOVE
    // ========================================

    socket.on(
      "draw_move",
      (data) => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (
          !room ||
          !room.game
        ) {
          return;
        }

        if (
          socket.id !==
          room.game.drawerId
        ) {
          return;
        }

        if (
          room.game.phase !==
          "drawing"
        ) {
          return;
        }

        socket
          .to(roomId)
          .emit(
            "draw_move",
            {
              x: data.x,

              y: data.y,

              previousX:
                data.previousX,

              previousY:
                data.previousY,

              color:
                data.color ||
                "#000000",

              brushSize:
                data.brushSize ||
                4,
            }
          );
      }
    );

    // ========================================
    // DRAW END
    // ========================================

    socket.on(
      "draw_end",
      () => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (
          !room ||
          !room.game
        ) {
          return;
        }

        if (
          socket.id !==
          room.game.drawerId
        ) {
          return;
        }

        socket
          .to(roomId)
          .emit(
            "draw_end"
          );
      }
    );

    // ========================================
    // CLEAR DRAWING
    // ========================================

    socket.on(
      "clear_drawing",
      () => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (
          !room ||
          !room.game
        ) {
          return;
        }

        if (
          socket.id !==
          room.game.drawerId
        ) {
          return;
        }

        if (
          room.game.phase !==
          "drawing"
        ) {
          return;
        }

        socket
          .to(roomId)
          .emit(
            "clear_drawing"
          );
      }
    );

    // ========================================
    // UNDO DRAWING
    // ========================================

    socket.on(
      "undo_drawing",
      () => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (
          !room ||
          !room.game
        ) {
          return;
        }

        if (
          socket.id !==
          room.game.drawerId
        ) {
          return;
        }

        socket
          .to(roomId)
          .emit(
            "undo_drawing"
          );
      }
    );

    // ========================================
    // GUESS
    // ========================================

    socket.on(
      "guess",
      ({ guess }) => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (
          !room ||
          !room.game
        ) {
          return;
        }

        if (
          room.game.phase !==
          "drawing"
        ) {
          return;
        }

        if (
          !guess ||
          !guess.trim()
        ) {
          return;
        }

        // ======================================
        // CHECK GUESS
        // ======================================

        const result =
          room.game.checkGuess(
            socket.id,
            guess
          );

        const player =
          room.players.find(
            (p) =>
              p.id ===
              socket.id
          );

        // ======================================
        // CORRECT GUESS
        // ======================================

        if (result.correct) {
          const points =
            Number(
              result.points
            ) || 0;

          if (player) {
            player.score =
              (player.score || 0) +
              points;
          }

          // ====================================
          // PLAYER GETS RESULT
          // ====================================

          io.to(
            socket.id
          ).emit(
            "guess_result",
            {
              correct: true,

              message:
                `Correct! 🎉 +${points} points`,

              word:
                result.word,

              points,

              basePoints:
                result.basePoints,

              positionBonus:
                result.positionBonus,

              guessPosition:
                result.guessPosition,

              timeLeft:
                result.timeLeft,
            }
          );

          // ====================================
          // BROADCAST CORRECT GUESS
          // ====================================

          io.to(
            roomId
          ).emit(
            "chat_message",
            {
              playerName:
                player?.name ||
                "Player",

              message:
                `guessed the word! 🎉 +${points} pts`,

              type:
                "correct",
            }
          );

          // ====================================
          // UPDATE ALL SCORES
          // ====================================

          broadcastScores(
            roomId,
            room
          );

          console.log(
            `${player?.name} guessed correctly in ${result.timeLeft}s remaining and received ${points} points`
          );

          // ====================================
          // IMPORTANT:
          // DO NOT END ROUND AFTER FIRST GUESS
          // ====================================

          const allGuessed =
            room.game.allGuessersGuessed();

          // ====================================
          // ONLY END IF EVERY GUESSER GUESSED
          // ====================================

          if (allGuessed) {
            endRound(
              room,
              roomId,
              room.game.currentWord,
              "all_players_guessed"
            );
          }

          return;
        }

        // ======================================
        // ALREADY GUESSED
        // ======================================

        if (
          result.message ===
          "You already guessed correctly."
        ) {
          io.to(
            socket.id
          ).emit(
            "guess_result",
            {
              correct: false,

              message:
                result.message,
            }
          );

          return;
        }

        // ======================================
        // DRAWER CANNOT GUESS
        // ======================================

        if (
          result.message ===
          "The drawer cannot guess."
        ) {
          io.to(
            socket.id
          ).emit(
            "guess_result",
            {
              correct: false,

              message:
                result.message,
            }
          );

          return;
        }

        // ======================================
        // WRONG GUESS
        // ======================================

        io.to(
          roomId
        ).emit(
          "chat_message",
          {
            playerName:
              player?.name ||
              "Player",

            message:
              guess.trim(),

            type:
              "guess",
          }
        );
      }
    );

    // ========================================
    // CHAT
    // ========================================

    socket.on(
      "chat",
      ({ message }) => {
        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (!room) {
          return;
        }

        const player =
          room.players.find(
            (p) =>
              p.id ===
              socket.id
          );

        if (!player) {
          return;
        }

        if (
          !message ||
          !message.trim()
        ) {
          return;
        }

        io.to(
          roomId
        ).emit(
          "chat_message",
          {
            playerName:
              player.name,

            message:
              message.trim(),

            type:
              "chat",
          }
        );
      }
    );

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Player disconnected:",
          socket.id
        );

        const roomId =
          socket.currentRoomId;

        if (!roomId) {
          return;
        }

        const room =
          getRoom(roomId);

        if (!room) {
          return;
        }

        // Stop timer
        if (room.roundTimer) {
          clearInterval(
            room.roundTimer
          );

          room.roundTimer =
            null;
        }

        room.removePlayer(
          socket.id
        );

        io.to(
          roomId
        ).emit(
          "player_left",
          {
            playerId:
              socket.id,

            players:
              room.getPlayers(),
          }
        );

        broadcastPlayers(
          roomId,
          room
        );

        // Delete empty room
        if (
          room.players.length ===
          0
        ) {
          deleteRoom(
            roomId
          );

          console.log(
            `Room ${roomId} deleted`
          );
        }
      }
    );
  }
);

// ==========================================
// SERVER
// ==========================================

//const PORT = 5000;
//
//server.listen(
//  PORT,
//  () => {
//    console.log(
//      `Server running on http://localhost:${PORT}`
//    );
//  }
//);

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
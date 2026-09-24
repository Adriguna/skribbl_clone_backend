# 🎨 Skribbl Clone — Backend

Backend server for a real-time multiplayer drawing and guessing game inspired by **skribbl.io**.

The backend is responsible for room management, multiplayer communication, game state, turn rotation, word selection, drawing synchronization, guessing, scoring, hints, chat, and game completion.

---

## 🚀 Live Backend

**Backend URL:**
https://skribbl-clone-backend-m4du.onrender.com

**Frontend Application:**
https://skribbl-clone-by-riteshpathak.netlify.app

---

## 📌 Project Overview

This project is an end-to-end multiplayer drawing and guessing game.

Players can:

* Create a room
* Join a room using a room code
* Configure game settings
* Wait in a multiplayer lobby
* Start a game as the host
* Take turns drawing
* Select a word
* Guess the drawing
* Receive points based on guessing speed
* See hints revealed progressively
* Chat with other players
* Continue through multiple rounds
* See the final leaderboard and game result

The backend uses **Socket.IO** to provide real-time communication between all connected players.

---

## 🛠️ Tech Stack

### Backend

* Node.js
* Express.js
* Socket.IO
* JavaScript
* CORS

### Architecture

The backend uses an object-oriented structure for the main game entities:

```text
server/
│
├── src/
│   ├── classes/
│   │   ├── Game.js
│   │   └── Room.js
│   │
│   ├── roomManager.js
│   └── server.js
│
├── package.json
├── package-lock.json
└── .gitignore
```

---

## 📂 Project Structure

### `src/server.js`

Main backend entry point.

Responsibilities include:

* Starting the Express server
* Creating the Socket.IO server
* Configuring CORS
* Handling client connections
* Creating and joining rooms
* Starting games
* Handling word selection
* Synchronizing drawings
* Processing guesses
* Managing chat
* Managing timers
* Broadcasting game state
* Handling player disconnections

### `src/classes/Room.js`

Represents a multiplayer room.

It manages information such as:

* Room ID
* Host
* Players
* Room settings
* Game state

### `src/classes/Game.js`

Contains the main game logic.

It manages:

* Rounds
* Current drawer
* Word selection
* Turn rotation
* Timer
* Hints
* Scoring
* Guessing
* Round completion
* Game completion

### `src/roomManager.js`

Responsible for managing active rooms.

It provides functionality for:

* Creating rooms
* Finding rooms
* Removing rooms
* Managing room lifecycle

---

# 🔌 WebSocket Communication

The application uses **Socket.IO** for real-time communication.

The client connects to the deployed backend:

```text
https://skribbl-clone-backend-m4du.onrender.com
```

Socket.IO allows all players in the same room to receive game updates immediately.

---

## 🏠 Room & Lobby Events

### `create_room`

Client → Server

Creates a new multiplayer room.

Example payload:

```js
{
  hostName,
  settings
}
```

The server creates the room and returns the generated room information to the host.

---

### `join_room`

Client → Server

Allows a player to join an existing room.

```js
{
  roomId,
  playerName
}
```

---

### `player_joined`

Server → Clients

Broadcasts updated player information when a new player joins.

---

### `player_left`

Server → Clients

Broadcasts updated player information when a player disconnects.

---

### `start_game`

Client → Server

The host starts the game.

The server then initializes the game and starts the first round.

---

# 🎮 Game Flow

The general game flow is:

```text
Create Room
     ↓
Join Room
     ↓
Lobby
     ↓
Host Starts Game
     ↓
Select Drawer
     ↓
Drawer Selects Word
     ↓
Drawing Starts
     ↓
Players Guess
     ↓
Points Calculated
     ↓
Round Ends
     ↓
Next Drawer
     ↓
Next Round
     ↓
All Rounds Complete
     ↓
Final Leaderboard
     ↓
Game Over
```

---

# ✏️ Drawing Synchronization

The drawer draws on the HTML5 Canvas on the frontend.

Drawing information is sent to the backend through Socket.IO.

The backend broadcasts drawing data to the other players in the same room.

This allows all players to see the drawing in real time.

Important drawing events include:

```text
draw_start
draw_move
draw_end
draw_data
canvas_clear
draw_undo
```

The backend ensures that drawing events are only accepted from the appropriate drawer during a round.

---

# 📝 Word Selection & Guessing

At the beginning of a round, the current drawer receives multiple word options.

The drawer selects one word.

The selected word is stored in the server-side game state.

Other players do not receive the actual word. They see the masked word and available hints.

Players submit guesses through Socket.IO.

The backend compares the submitted guess with the selected word.

The comparison handles the relevant input normalization before determining whether the guess is correct.

---

# 💡 Hints

The game supports progressive hints.

As the round timer decreases, letters can be revealed to the guessing players.

The revealed letters appear at different positions in the masked word.

The drawer can see the actual word while other players receive the progressive hints.

---

# 🏆 Scoring System

Players receive points when they correctly guess the word.

The scoring system rewards players based on how quickly they guess.

Therefore:

```text
Faster correct guess
        ↓
More points

Later correct guess
        ↓
Fewer points
```

The scores are maintained by the game state and synchronized with all players.

At the end of the game, players are displayed on the final leaderboard.

---

# 💬 Chat

Players can communicate through the in-game chat.

Chat messages are sent to the server through Socket.IO and broadcast to players in the room.

Main events:

```text
chat
chat_message
```

Guess messages are also processed by the backend to determine whether the player has correctly identified the word.

---

# ⏱️ Timer & Rounds

Each round has a configurable drawing time.

The backend controls the round timer so that the game state remains synchronized between clients.

A round can end when:

* The timer reaches zero
* The word is correctly guessed

After a round ends:

1. The selected word is revealed
2. Scores are updated
3. The next drawer is selected
4. The next round begins

When all configured rounds are completed, the game ends and the final leaderboard is displayed.

---

# 🌐 CORS & Deployment

The backend is deployed on **Render**.

The frontend is deployed separately on **Netlify**.

Architecture:

```text
┌─────────────────────────────┐
│       Netlify Frontend      │
│        React + Vite         │
└──────────────┬──────────────┘
               │
               │ Socket.IO
               │
               ▼
┌─────────────────────────────┐
│       Render Backend        │
│      Node + Express         │
│         Socket.IO           │
└─────────────────────────────┘
```

The frontend connects to:

```text
https://skribbl-clone-backend-m4du.onrender.com
```

---

# 💻 Running Locally

## 1. Clone the repository

```bash
git clone https://github.com/Adriguna/skribbl_clone_backend.git
```

Go into the project:

```bash
cd skribbl_clone_backend
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Start the backend

```bash
npm start
```

The server will start on the configured port.

For local development, the backend can be accessed at:

```text
http://localhost:5000
```

---

## 4. Development Mode

If the project contains the development script using Nodemon:

```bash
npm run dev
```

This automatically restarts the server when source files are changed.

---

# 🔗 Frontend Connection

The frontend Socket.IO client connects to the backend using:

```js
import { io } from "socket.io-client";

const SOCKET_URL =
  "https://skribbl-clone-backend-m4du.onrender.com";

export const socket = io(SOCKET_URL);
```

For local development, the frontend can connect to:

```text
http://localhost:5000
```

---

# 📡 Main Socket Events

The backend handles real-time events including:

### Room

```text
create_room
join_room
player_joined
player_left
start_game
```

### Game

```text
game_state
round_start
word_chosen
round_end
game_over
```

### Drawing

```text
draw_start
draw_move
draw_end
draw_data
canvas_clear
draw_undo
```

### Guessing & Chat

```text
guess
guess_result
chat
chat_message
```

### Hints

```text
hint_revealed
```

---

# 🔐 Environment & Security

Sensitive environment variables should not be committed to Git.

The repository uses `.gitignore` to exclude:

```text
node_modules/
.env
.env.*
```

Dependencies are installed using:

```bash
npm install
```

from `package.json` and `package-lock.json`.

---

# 📚 Backend Responsibilities

The backend acts as the central authority for the multiplayer game.

It is responsible for:

* Room creation
* Room joining
* Player management
* Host management
* Game initialization
* Turn management
* Word selection
* Timer management
* Hint management
* Guess validation
* Score calculation
* Leaderboard updates
* Drawing synchronization
* Chat broadcasting
* Round transitions
* Game completion
* Player disconnection handling

---

# 🎯 Assignment Requirements Covered

The backend supports the major requirements of the assignment:

* Multiplayer rooms
* Turn-based drawing
* Real-time drawing synchronization
* Word selection
* Guessing
* Scoring
* Leaderboard
* Game end
* WebSocket communication
* Hints
* Chat
* Configurable game settings

The assignment specifically requires the deployed application to support the core production flow of **create room → draw → guess → score**, and requires the live URL to be included in the README.

---

# 👨‍💻 Author

**Ritesh Pathak**

B.Tech Computer Science Engineering

GitHub:
https://github.com/RiteshPathak-12

---

## 📄 Related Repository

Frontend repository:

```text
Skribbl Clone Frontend
```

Live application:

https://skribbl-clone-by-riteshpathak.netlify.app

---

## ⭐ Project

A real-time multiplayer drawing and guessing game built with:

**React + Vite + Node.js + Express + Socket.IO + HTML5 Canvas**

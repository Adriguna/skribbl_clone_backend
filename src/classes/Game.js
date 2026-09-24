class Game {
  constructor(room) {
    this.room = room;

    // ==========================================
    // BASIC GAME STATE
    // ==========================================

    this.round = 0;
    this.currentDrawerIndex = 0;

    this.drawerId = null;
    this.currentWord = null;
    this.wordOptions = [];

    this.phase = "lobby";

    // Players who already guessed correctly
    this.guessedPlayers = new Set();

    // Order in which players guessed correctly
    this.correctGuessOrder = [];

    // ==========================================
    // ROUND TIME
    // ==========================================

    this.roundStartedAt = null;

    // ==========================================
    // HINT SYSTEM
    // ==========================================

    this.revealedHintIndexes = new Set();

    this.hintsRevealed = 0;

    this.totalHints = 0;

    this.hintSchedule = [];

    this.elapsedSeconds = 0;

    // ==========================================
    // DRAWER SCORE
    // ==========================================

    this.drawerPointsAwarded = false;
  }

  // ==========================================
  // START GAME
  // ==========================================

  startGame() {
    this.round = 1;

    this.currentDrawerIndex = 0;

    this.phase = "word_selection";

    this.guessedPlayers.clear();

    this.correctGuessOrder = [];

    return this.startRound();
  }

  // ==========================================
  // START ROUND
  // ==========================================

  startRound() {
    const players = this.room.players;

    if (!players || players.length === 0) {
      return null;
    }

    // Make sure drawer index is valid
    if (this.currentDrawerIndex >= players.length) {
      this.currentDrawerIndex = 0;
    }

    const drawer =
      players[this.currentDrawerIndex];

    if (!drawer) {
      return null;
    }

    // ==========================================
    // DRAWER
    // ==========================================

    this.drawerId = drawer.id;

    // ==========================================
    // RESET WORD
    // ==========================================

    this.currentWord = null;

    // ==========================================
    // WORD OPTIONS
    // ==========================================

    const wordCount =
      Number(
        this.room.settings?.wordCount
      ) || 3;

    this.wordOptions =
      this.getRandomWords(wordCount);

    // ==========================================
    // RESET GUESSES
    // ==========================================

    this.guessedPlayers.clear();

    this.correctGuessOrder = [];

    // ==========================================
    // RESET ROUND TIME
    // ==========================================

    this.roundStartedAt = null;

    this.elapsedSeconds = 0;

    // ==========================================
    // RESET DRAWER SCORE FLAG
    // ==========================================

    this.drawerPointsAwarded = false;

    // ==========================================
    // RESET HINT SYSTEM
    // ==========================================

    this.resetHintSystem();

    // ==========================================
    // GAME PHASE
    // ==========================================

    this.phase = "word_selection";

    // ==========================================
    // RETURN ROUND DATA
    // ==========================================

    return {
      drawerId: this.drawerId,

      wordOptions: this.wordOptions,

      round: this.round,

      drawTime:
        Number(
          this.room.settings?.drawTime
        ) || 60,
    };
  }

  // ==========================================
  // RESET HINT SYSTEM
  // ==========================================

  resetHintSystem() {
    this.revealedHintIndexes =
      new Set();

    this.hintsRevealed = 0;

    this.elapsedSeconds = 0;

    this.totalHints =
      Number(
        this.room.settings?.hints
      );

    if (
      !Number.isFinite(
        this.totalHints
      ) ||
      this.totalHints < 0
    ) {
      this.totalHints = 2;
    }

    this.hintSchedule = [];
  }

  // ==========================================
  // CHOOSE WORD
  // ==========================================

  chooseWord(word) {
    if (
      !word ||
      typeof word !== "string"
    ) {
      return false;
    }

    if (
      !this.wordOptions.includes(word)
    ) {
      return false;
    }

    this.currentWord = word;

    this.phase = "drawing";

    // ==========================================
    // START ACTUAL DRAWING TIMER
    // ==========================================

    this.roundStartedAt = Date.now();

    this.elapsedSeconds = 0;

    // ==========================================
    // RESET HINT SYSTEM
    // ==========================================

    this.resetHintSystem();

    this.createHintSchedule();

    return true;
  }

  // ==========================================
  // GET ELAPSED SECONDS
  // ==========================================

  getElapsedSeconds() {
    if (!this.roundStartedAt) {
      return 0;
    }

    const elapsed =
      Math.floor(
        (Date.now() -
          this.roundStartedAt) /
          1000
      );

    const drawTime =
      Number(
        this.room.settings?.drawTime
      ) || 60;

    return Math.max(
      0,
      Math.min(
        elapsed,
        drawTime
      )
    );
  }

  // ==========================================
  // UPDATE ELAPSED TIME
  // ==========================================

  updateElapsedTime() {
    this.elapsedSeconds =
      this.getElapsedSeconds();

    return this.elapsedSeconds;
  }

  // ==========================================
  // CREATE HINT SCHEDULE
  // ==========================================

  createHintSchedule() {
    this.hintSchedule = [];

    if (!this.currentWord) {
      return;
    }

    if (this.totalHints <= 0) {
      return;
    }

    const drawTime =
      Number(
        this.room.settings?.drawTime
      ) || 60;

    /*
     * Example:
     *
     * drawTime = 60
     * hints = 2
     *
     * Hint 1 -> 20 sec
     * Hint 2 -> 40 sec
     *
     * hints = 3
     *
     * Hint 1 -> 15 sec
     * Hint 2 -> 30 sec
     * Hint 3 -> 45 sec
     */

    for (
      let i = 1;
      i <= this.totalHints;
      i++
    ) {
      let hintTime =
        Math.floor(
          (drawTime /
            (this.totalHints + 1)) *
            i
        );

      // Never reveal at second 0
      if (hintTime < 1) {
        hintTime = 1;
      }

      // Never schedule after round ends
      if (hintTime >= drawTime) {
        hintTime =
          Math.max(
            1,
            drawTime - 1
          );
      }

      this.hintSchedule.push(
        hintTime
      );
    }
  }

  // ==========================================
  // SHOULD REVEAL HINT
  // ==========================================

  shouldRevealHint(
    elapsedSeconds
  ) {
    if (!this.currentWord) {
      return false;
    }

    if (
      this.phase !==
      "drawing"
    ) {
      return false;
    }

    if (
      this.hintsRevealed >=
      this.totalHints
    ) {
      return false;
    }

    const nextHintTime =
      this.hintSchedule[
        this.hintsRevealed
      ];

    if (
      nextHintTime ===
      undefined
    ) {
      return false;
    }

    return (
      elapsedSeconds >=
      nextHintTime
    );
  }

  // ==========================================
  // REVEAL NEXT HINT
  // ==========================================

  revealNextHint() {
    if (!this.currentWord) {
      return null;
    }

    if (
      this.phase !==
      "drawing"
    ) {
      return null;
    }

    if (
      this.hintsRevealed >=
      this.totalHints
    ) {
      return null;
    }

    const characters =
      Array.from(
        this.currentWord
      );

    // Find letters which are still hidden
    const availableIndexes =
      characters
        .map(
          (
            character,
            index
          ) => {
            // Ignore spaces
            if (
              character === " "
            ) {
              return null;
            }

            // Already revealed
            if (
              this.revealedHintIndexes.has(
                index
              )
            ) {
              return null;
            }

            return index;
          }
        )
        .filter(
          (index) =>
            index !== null
        );

    // No hidden letters left
    if (
      availableIndexes.length ===
      0
    ) {
      return null;
    }

    // Select RANDOM hidden letter
    const randomPosition =
      Math.floor(
        Math.random() *
          availableIndexes.length
      );

    const selectedIndex =
      availableIndexes[
        randomPosition
      ];

    // Store revealed index
    this.revealedHintIndexes.add(
      selectedIndex
    );

    this.hintsRevealed++;

    const maskedWord =
      this.getMaskedWord();

    return {
      index: selectedIndex,

      letter:
        characters[
          selectedIndex
        ],

      maskedWord,

      hintNumber:
        this.hintsRevealed,

      totalHints:
        this.totalHints,

      wordLength:
        characters.length,
    };
  }

  // ==========================================
  // GET MASKED WORD
  // ==========================================

  getMaskedWord() {
    if (!this.currentWord) {
      return "";
    }

    const characters =
      Array.from(
        this.currentWord
      );

    return characters
      .map(
        (
          character,
          index
        ) => {
          // Always show spaces
          if (
            character === " "
          ) {
            return " ";
          }

          // Show revealed letter
          if (
            this.revealedHintIndexes.has(
              index
            )
          ) {
            return character;
          }

          // Hide letter
          return "_";
        }
      )
      .join(" ");
  }

  // ==========================================
  // CALCULATE GUESS POINTS
  // ==========================================

  calculateGuessPoints() {
    const drawTime =
      Number(
        this.room.settings?.drawTime
      ) || 60;

    const elapsed =
      this.getElapsedSeconds();

    const timeLeft =
      Math.max(
        0,
        drawTime - elapsed
      );

    /*
     * Base score:
     *
     * At beginning:
     * 200 points
     *
     * At end:
     * 100 points
     *
     * Therefore:
     * Faster guess = more points
     */

    const timeRatio =
      timeLeft / drawTime;

    const basePoints =
      100 +
      Math.floor(
        100 * timeRatio
      );

    /*
     * Position bonus
     *
     * 1st correct guess = +25
     * 2nd correct guess = +10
     * Others = +0
     */

    const guessPosition =
      this.correctGuessOrder.length + 1;

    let positionBonus = 0;

    if (
      guessPosition === 1
    ) {
      positionBonus = 25;
    } else if (
      guessPosition === 2
    ) {
      positionBonus = 10;
    }

    const totalPoints =
      basePoints +
      positionBonus;

    return {
      points: totalPoints,

      basePoints,

      positionBonus,

      guessPosition,

      elapsedSeconds: elapsed,

      timeLeft,
    };
  }

  // ==========================================
  // CHECK GUESS
  // ==========================================

  checkGuess(
    playerId,
    guess
  ) {
    if (!this.currentWord) {
      return {
        correct: false,

        message:
          "The word has not been selected yet.",
      };
    }

    // Drawer cannot guess
    if (
      playerId ===
      this.drawerId
    ) {
      return {
        correct: false,

        message:
          "The drawer cannot guess.",
      };
    }

    // Player already guessed correctly
    if (
      this.guessedPlayers.has(
        playerId
      )
    ) {
      return {
        correct: false,

        message:
          "You already guessed correctly.",
      };
    }

    if (
      !guess ||
      typeof guess !==
        "string"
    ) {
      return {
        correct: false,
      };
    }

    const normalizedGuess =
      guess
        .trim()
        .toLowerCase();

    const normalizedWord =
      this.currentWord
        .trim()
        .toLowerCase();

    // ==========================================
    // CORRECT ANSWER
    // ==========================================

    if (
      normalizedGuess ===
      normalizedWord
    ) {
      // Calculate points BEFORE adding player
      const scoreData =
        this.calculateGuessPoints();

      this.guessedPlayers.add(
        playerId
      );

      this.correctGuessOrder.push(
        playerId
      );

      return {
        correct: true,

        word:
          this.currentWord,

        points:
          scoreData.points,

        basePoints:
          scoreData.basePoints,

        positionBonus:
          scoreData.positionBonus,

        guessPosition:
          scoreData.guessPosition,

        elapsedSeconds:
          scoreData.elapsedSeconds,

        timeLeft:
          scoreData.timeLeft,
      };
    }

    // ==========================================
    // WRONG ANSWER
    // ==========================================

    return {
      correct: false,
    };
  }

  // ==========================================
  // GET CORRECT GUESS COUNT
  // ==========================================

  getCorrectGuessCount() {
    return this.correctGuessOrder.length;
  }

  // ==========================================
  // GET GUESSERS COUNT
  // ==========================================

  getTotalGuessers() {
    return Math.max(
      0,
      this.room.players.length - 1
    );
  }

  // ==========================================
  // CHECK IF ALL GUESSERS HAVE GUESSED
  // ==========================================

  allGuessersGuessed() {
    return (
      this.getCorrectGuessCount() >=
      this.getTotalGuessers()
    );
  }

  // ==========================================
  // CALCULATE DRAWER POINTS
  // ==========================================

  calculateDrawerPoints() {
    /*
     * Drawer gets 25 points
     * for every player who
     * successfully guessed.
     *
     * Example:
     *
     * 3 players guessed
     * 3 × 25 = 75 points
     */

    const correctGuessers =
      this.getCorrectGuessCount();

    return correctGuessers * 25;
  }

  // ==========================================
  // NEXT ROUND
  // ==========================================

  nextRound() {
    this.round += 1;

    this.currentDrawerIndex += 1;

    // Rotate drawer
    if (
      this.currentDrawerIndex >=
      this.room.players.length
    ) {
      this.currentDrawerIndex = 0;
    }

    return this.startRound();
  }

  // ==========================================
  // CHECK GAME OVER
  // ==========================================

  isGameOver() {
    const totalRounds =
      Number(
        this.room.settings?.rounds
      ) || 2;

    return (
      this.round >
      totalRounds
    );
  }

  // ==========================================
  // GET RANDOM WORDS
  // ==========================================

  getRandomWords(
    count
  ) {
    // ==========================================
    // CUSTOM WORDS
    // ==========================================

    const useCustomWords =
      Boolean(
        this.room.settings
          ?.useCustomWords
      );

    const customWords =
      Array.isArray(
        this.room.settings
          ?.customWords
      )
        ? this.room.settings
            .customWords
        : [];

    // ==========================================
    // DEFAULT WORDS
    // ==========================================

    const defaultWords = [
      "Apple",
      "Elephant",
      "Car",
      "House",
      "Pizza",
      "Dog",
      "Cat",
      "Rocket",
      "Guitar",
      "Mountain",
      "Computer",
      "Football",
      "Tree",
      "Robot",
      "Sun",
      "Phone",
      "Bicycle",
      "Flower",
      "Beach",
      "Rainbow",
      "Laptop",
      "Camera",
      "Book",
      "Lion",
      "Tiger",
      "Cake",
      "Ice Cream",
      "Airplane",
      "Train",
      "Ship",
      "Doctor",
      "Hospital",
      "School",
      "Mobile",
      "Clock",
      "Chair",
      "Table",
      "House",
      "Bridge",
      "River",
      "Ocean",
      "Cloud",
      "Star",
      "Moon",
      "Key",
      "Bottle",
      "Pizza",
      "Burger",
      "Chocolate",
    ];

    let words =
      defaultWords;

    // ==========================================
    // USE CUSTOM WORDS
    // ==========================================

    if (
      useCustomWords &&
      customWords.length > 0
    ) {
      words =
        customWords
          .filter(
            (word) =>
              typeof word ===
                "string" &&
              word.trim()
                .length > 0
          )
          .map(
            (word) =>
              word.trim()
          );
    }

    // ==========================================
    // SHUFFLE
    // ==========================================

    const shuffled =
      [...words].sort(
        () =>
          Math.random() -
          0.5
      );

    // ==========================================
    // VALIDATE COUNT
    // ==========================================

    const requestedCount =
      Number(count) || 3;

    // ==========================================
    // RETURN WORDS
    // ==========================================

    return shuffled.slice(
      0,
      Math.min(
        requestedCount,
        shuffled.length
      )
    );
  }
}

module.exports = Game;
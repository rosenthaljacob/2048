// Config
const BOARD_HEIGHT = 10;
const BOARD_WIDTH = 5;

const blocks = [2, 4, 8, 16, 32, 64, 128];

// Game logic
function getRandomBlock() {
  return blocks[Math.floor(Math.random() * blocks.length)];
}

class Game {
  constructor() {
    this.board = Array(BOARD_WIDTH)
      .fill(null)
      .map(() => Array(BOARD_HEIGHT).fill(null));
    this.currentBlock = getRandomBlock();
    this.nextBlock = getRandomBlock();
    this.iterationSpeed = 300;
    this.nextIterationScheduled = Date.now() + this.iterationSpeed;
    this.currentBlockPosition = { x: 0, y: 0 };
    this.gameOver = false;
  }
  frame() {
    const currentTime = Date.now();

    if (currentTime < this.nextIterationScheduled) {
      return;
    }

    if (this.gameOver) {
      return;
    }

    const dropYPosition = this.getDropYPosition(this.currentBlockPosition.x);

    if (dropYPosition === this.currentBlockPosition.y) {
      // Block can't move down
      this.dropBlock();
      return;
    }

    // Move block down
    this.nextIterationScheduled =
      this.nextIterationScheduled + this.iterationSpeed;
    this.currentBlockPosition.y++;
  }

  moveTo(moveTo) {
    const currentCol = this.currentBlockPosition.x;
    const currentRow = this.currentBlockPosition.y;

    const canMove = this.board.every((col, colIndex) => {
      const isInWay =
        colIndex > moveTo ? colIndex < currentCol : colIndex > currentCol;

      if (isInWay && col[currentRow] !== null) {
        return false;
      }

      return true;
    });

    if (!canMove) {
      return;
    }

    this.currentBlockPosition.x = moveTo;

    this.currentBlockPosition.y = this.getDropYPosition(
      this.currentBlockPosition.x
    );

    this.dropBlock();
  }

  getDropYPosition(row) {
    const rowNumber = this.board[row].findIndex((block) => block !== null);

    if (rowNumber === -1) {
      return BOARD_HEIGHT - 1;
    }

    return rowNumber - 1;
  }

  dropBlock(x = this.currentBlockPosition.x) {
    const lowestBlockIndex = this.board[x].findIndex((row) => row !== null);

    const y = lowestBlockIndex === -1 ? BOARD_HEIGHT - 1 : lowestBlockIndex - 1;

    this.board[x][y] = this.currentBlock;

    this.explodeBlocks({ x, y });

    // Check if the game is over
    if (this.board.some((col) => col[1] !== null)) {
      // Game over
      this.gameOver = true;
      return;
    }

    this.currentBlockPosition.y = 0;
    this.currentBlock = this.nextBlock;
    this.nextBlock = getRandomBlock();
  }

  explodeBlocks(startWith) {
    let isExploded = false;

    function processBlock(x, y) {
      const block = this.board[x][y];

      if (block === null) {
        return;
      }

      const bottomBlock = this.board[x]?.[y + 1];
      const leftBlock = this.board[x - 1]?.[y];
      const rightBlock = this.board[x + 1]?.[y];

      const numberOfTouchingBlocks = [
        bottomBlock,
        leftBlock,
        rightBlock,
      ].filter((b) => b === block).length;

      if (!numberOfTouchingBlocks) {
        return;
      }

      // const prevValue = this.board[x][y];
      for (let i = 0; i < numberOfTouchingBlocks; i++) {
        this.board[x][y] = this.board[x][y] + this.board[x][y];
      }

      if (bottomBlock === block) {
        this.board[x][y + 1] = null;
      }
      if (leftBlock === block) {
        this.board[x - 1][y] = null;
      }
      if (rightBlock === block) {
        this.board[x + 1][y] = null;
      }

      isExploded = true;
      // Trim the board
      this.shiftBlocks({ x, y });
    }

    if (startWith) {
      processBlock.call(this, startWith.x, startWith.y);
    }

    for (let x = 0; x < this.board.length && !isExploded; x++) {
      for (let y = 0; y < this.board[x].length && !isExploded; y++) {
        processBlock.call(this, x, y);
      }
    }
  }

  shiftBlocks(startWith) {
    const newBoard = Array(BOARD_WIDTH)
      .fill(null)
      .map(() => Array(BOARD_HEIGHT).fill(null));

    this.board.forEach((col, x) => {
      [...col]
        .reverse()
        .filter((block) => block !== null)
        .forEach((block, y) => {
          newBoard[x][y] = block;
        });
    });

    newBoard.forEach((col, x) => col.reverse());

    this.board = newBoard;
    this.explodeBlocks(startWith);
  }
}

// UI paint
function createTable() {
  const container = document.getElementById("game-container");

  container.innerHTML = "";

  // Create columns
  const columns = Array(BOARD_WIDTH)
    .fill(null)
    .map((_, index) => {
      const column = document.createElement("div");
      column.classList.add("column", index % 2 === 0 ? "even" : "odd");
      container.appendChild(column);

      return column;
    });

  // Create rows
  const columnsWithRows = columns.map((column) => ({
    column,
    rows: Array(BOARD_HEIGHT)
      .fill(null)
      .map((_, index) => {
        const row = document.createElement("div");
        row.classList.add("row");
        column.appendChild(row);

        return row;
      }),
  }));

  return columnsWithRows;
}

function paintFrame(game, columnsAndRows) {
  columnsAndRows.forEach(({ column, rows }, x) => {
    rows.forEach((row, y) => {
      const value = game.board[x][y];
      paintCell(row, value);
    });
  });

  paintCurrentBlock(game, columnsAndRows);
  paintScore(game);
}

function paintCell(cell, value) {
  const block = cell.querySelector(".block.landed");

  // If no change, do nothing
  if (!block && value === null) {
    return;
  }
  if (
    block !== null &&
    block.getAttribute("data-value") === value?.toString()
  ) {
    return;
  }

  // Paint the block
  if (value === null) {
    cell.innerHTML = "";
    return;
  }

  if (block) {
    block.setAttribute("data-value", value);
    block.innerText = value;
    return;
  }

  const blockElement = document.createElement("div");
  blockElement.classList.add("block", "landed");
  blockElement.setAttribute("data-value", value);
  blockElement.innerText = value;
  cell.appendChild(blockElement);
}

function paintScore(game) {
  const scoreElement = document.getElementById("score");

  const score = game.board.flat().reduce((acc, block) => {
    if (block === null) {
      return acc;
    }
    return acc + block;
  }, 0);

  scoreElement.innerText = score;
}

function paintCurrentBlock(game, columnsAndRows) {
  const { x, y } = game.currentBlockPosition;

  const cell = columnsAndRows[x].rows[y];
  const value = game.currentBlock;

  const blockQuery = cell.querySelector(".block.current");

  if (game.gameOver) {
    blockQuery?.remove();
    return;
  }

  const passedTime =
    game.iterationSpeed - (game.nextIterationScheduled - Date.now());
  const transformPercent = Math.round((passedTime / game.iterationSpeed) * 100);

  // If no change, adjust the position and do nothing
  if (
    blockQuery !== null &&
    blockQuery.getAttribute("data-value") === value?.toString()
  ) {
    blockQuery.style.transform = `translateY(-${100 - transformPercent}%)`;
    return;
  }

  // Paint the block
  document.querySelector(".block.current")?.remove();

  const blockElement = document.createElement("div");
  blockElement.classList.add("block", "current");
  blockElement.setAttribute("data-value", value);
  blockElement.innerText = value;
  blockElement.style.transform = `translateY(-${100 - transformPercent}%)`;
  cell.appendChild(blockElement);
}

// Main
let currentGame;

async function startGame() {
  currentGame = new Game();
  const columnsOfRows = createTable();

  function dropBlock(x) {
    currentGame.moveTo(x);
  }

  columnsOfRows.forEach((row, x) => {
    row.column.addEventListener("mousedown", () => {
      dropBlock(x);
    });
  });

  do {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    currentGame.frame();
    paintFrame(currentGame, columnsOfRows);
  } while (!currentGame.gameOver);
}

startGame();

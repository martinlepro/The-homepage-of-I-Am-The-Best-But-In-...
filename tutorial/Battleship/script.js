const BOARD_SIZE = 10;

const STATE = {
  UNKNOWN: "unknown",
  MISS: "miss",
  HIT: "hit",
  SUNK: "sunk"
};

const SHIPS = {
  carrier: {
    id: "carrier",
    names: {
      fr: "Porte-avions",
      en: "Carrier",
      es: "Portaaviones",
      de: "Flugzeugträger",
      it: "Portaerei",
      pt: "Porta-aviões"
    },
    size: 5,
    image: "assets/ships/carrier.png",
    active: true
  },
  battleship: {
    id: "battleship",
    names: {
      fr: "Cuirassé",
      en: "Battleship",
      es: "Acorazado",
      de: "Schlachtschiff",
      it: "Corazzata",
      pt: "Encouraçado"
    },
    size: 4,
    image: "assets/ships/battleship.png",
    active: true
  },
  cruiser: {
    id: "cruiser",
    names: {
      fr: "Croiseur",
      en: "Cruiser",
      es: "Crucero",
      de: "Kreuzer",
      it: "Incrociatore",
      pt: "Cruzador"
    },
    size: 3,
    image: "assets/ships/cruiser.png",
    active: true
  },
  submarine: {
    id: "submarine",
    names: {
      fr: "Sous-marin",
      en: "Submarine",
      es: "Submarino",
      de: "U-Boot",
      it: "Sottomarino",
      pt: "Submarino"
    },
    size: 3,
    image: "assets/ships/submarine.png",
    active: true
  },
  destroyer: {
    id: "destroyer",
    names: {
      fr: "Destroyer",
      en: "Destroyer",
      es: "Destructor",
      de: "Zerstörer",
      it: "Cacciatorpediniere",
      pt: "Contratorpedeiro"
    },
    size: 2,
    image: "assets/ships/destroyer.png",
    active: true
  }
};

const I18N = {
  fr: {
    title: "🚢 Tutoriel & Solveur Battleship",
    subtitle: "Analyse toutes les positions possibles des bateaux restants et trouve les meilleurs tirs.",
    gridTitle: "Grille",
    shipsTitle: "Bateaux restants",
    analysisTitle: "Analyse",
    tutorialTitle: "Tutoriel complet"
  },
  en: {
    title: "🚢 Battleship Tutorial & Solver",
    subtitle: "Analyze every possible position for remaining ships and find the best shots.",
    gridTitle: "Board",
    shipsTitle: "Remaining ships",
    analysisTitle: "Analysis",
    tutorialTitle: "Complete tutorial"
  },
  es: {
    title: "🚢 Tutorial y solucionador de Battleship",
    subtitle: "Analiza todas las posiciones posibles de los barcos restantes y encuentra los mejores disparos.",
    gridTitle: "Tablero",
    shipsTitle: "Barcos restantes",
    analysisTitle: "Análisis",
    tutorialTitle: "Tutorial completo"
  },
  de: {
    title: "🚢 Battleship Tutorial & Solver",
    subtitle: "Analysiert alle möglichen Positionen der verbleibenden Schiffe.",
    gridTitle: "Spielfeld",
    shipsTitle: "Verbleibende Schiffe",
    analysisTitle: "Analyse",
    tutorialTitle: "Vollständiges Tutorial"
  },
  it: {
    title: "🚢 Tutorial e Solver Battleship",
    subtitle: "Analizza tutte le posizioni possibili delle navi rimanenti.",
    gridTitle: "Griglia",
    shipsTitle: "Navi rimanenti",
    analysisTitle: "Analisi",
    tutorialTitle: "Tutorial completo"
  },
  pt: {
    title: "🚢 Tutorial e Solver de Battleship",
    subtitle: "Analisa todas as posições possíveis dos navios restantes.",
    gridTitle: "Grade",
    shipsTitle: "Navios restantes",
    analysisTitle: "Análise",
    tutorialTitle: "Tutorial completo"
  }
};

let currentLanguage = "fr";
let currentMode = STATE.MISS;

let board = Array.from({ length: 100 }, () => STATE.UNKNOWN);

const boardElement = document.getElementById("board");
const shipsListElement = document.getElementById("shipsList");
const totalPlacementsElement = document.getElementById("totalPlacements");
const bestShotElement = document.getElementById("bestShot");
const bestScoreElement = document.getElementById("bestScore");
const jsonBox = document.getElementById("jsonBox");
const imageInput = document.getElementById("imageInput");
const ocrOutput = document.getElementById("ocrOutput");

init();

function init() {
  createBoard();
  renderShips();
  bindEvents();
  recalculate();
}

function bindEvents() {
  document.getElementById("modeUnknown").addEventListener("click", () => currentMode = STATE.UNKNOWN);
  document.getElementById("modeMiss").addEventListener("click", () => currentMode = STATE.MISS);
  document.getElementById("modeHit").addEventListener("click", () => currentMode = STATE.HIT);
  document.getElementById("modeSunk").addEventListener("click", () => currentMode = STATE.SUNK);

  document.getElementById("recalculateBtn").addEventListener("click", recalculate);

  document.getElementById("resetBtn").addEventListener("click", () => {
    board = Array.from({ length: 100 }, () => STATE.UNKNOWN);

    Object.values(SHIPS).forEach(ship => {
      ship.active = true;
    });

    renderShips();
    renderBoard();
    recalculate();
  });

  document.getElementById("exportBtn").addEventListener("click", exportJSON);
  document.getElementById("importBtn").addEventListener("click", importJSON);

  document.getElementById("ocrBtn").addEventListener("click", readImageWithOCR);
  document.getElementById("mockAiBtn").addEventListener("click", mockAiImageAnalysis);

  document.getElementById("languageSelect").addEventListener("change", event => {
    currentLanguage = event.target.value;
    applyLanguage();
    renderShips();
  });
}

function createBoard() {
  boardElement.innerHTML = "";

  for (let index = 0; index < 100; index++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.index = index;
    cell.title = indexToCoordinate(index);

    cell.addEventListener("click", () => {
      board[index] = currentMode;
      renderBoard();
      recalculate();
    });

    cell.addEventListener("contextmenu", event => {
      event.preventDefault();
      cycleCell(index);
      renderBoard();
      recalculate();
    });

    boardElement.appendChild(cell);
  }

  renderBoard();
}

function renderBoard(probabilities = null, bestIndex = null) {
  const cells = boardElement.querySelectorAll(".cell");
  const maxProbability = probabilities ? Math.max(...probabilities) : 0;

  cells.forEach((cell, index) => {
    const state = board[index];

    cell.className = "cell";
    cell.classList.add(state);

    cell.innerHTML = "";

    if (probabilities && probabilities[index] > 0 && state === STATE.UNKNOWN) {
      const opacity = maxProbability > 0 ? probabilities[index] / maxProbability * 0.75 : 0;
      cell.style.setProperty("--opacity", opacity.toFixed(2));
      cell.dataset.probability = probabilities[index];

      const score = document.createElement("span");
      score.className = "score";
      score.textContent = probabilities[index];
      cell.appendChild(score);
    } else {
      cell.style.removeProperty("--opacity");
      delete cell.dataset.probability;
    }

    if (index === bestIndex) {
      cell.classList.add("best");
    }

    const mark = document.createElement("span");
    mark.className = "mark";

    if (state === STATE.MISS) mark.textContent = "🌊";
    if (state === STATE.HIT) mark.textContent = "🔥";
    if (state === STATE.SUNK) mark.textContent = "💀";

    cell.appendChild(mark);
  });
}

function cycleCell(index) {
  const current = board[index];

  if (current === STATE.UNKNOWN) board[index] = STATE.MISS;
  else if (current === STATE.MISS) board[index] = STATE.HIT;
  else if (current === STATE.HIT) board[index] = STATE.SUNK;
  else board[index] = STATE.UNKNOWN;
}

function renderShips() {
  shipsListElement.innerHTML = "";

  Object.values(SHIPS).forEach(ship => {
    const item = document.createElement("div");
    item.className = "ship-item";

    item.innerHTML = `
      <div class="ship-left">
        <img src="${ship.image}" alt="${ship.names[currentLanguage]}" onerror="this.style.display='none'">
        <div>
          <div class="ship-name">${ship.names[currentLanguage]}</div>
          <div class="ship-size">${ship.size} cases</div>
        </div>
      </div>

      <label>
        <input type="checkbox" ${ship.active ? "checked" : ""} data-ship="${ship.id}">
        En jeu
      </label>
    `;

    shipsListElement.appendChild(item);
  });

  shipsListElement.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", event => {
      const shipId = event.target.dataset.ship;
      SHIPS[shipId].active = event.target.checked;
      recalculate();
    });
  });
}

function applyLanguage() {
  const lang = I18N[currentLanguage];

  document.getElementById("pageTitle").textContent = lang.title;
  document.getElementById("subtitle").textContent = lang.subtitle;
  document.getElementById("gridTitle").textContent = lang.gridTitle;
  document.getElementById("shipsTitle").textContent = lang.shipsTitle;
  document.getElementById("analysisTitle").textContent = lang.analysisTitle;
  document.getElementById("tutorialTitle").textContent = lang.tutorialTitle;
}

function recalculate() {
  const result = calculateAllPossibilities();

  totalPlacementsElement.textContent = result.totalPlacements;
  bestShotElement.textContent = result.bestIndex !== null ? indexToCoordinate(result.bestIndex) : "Aucun";
  bestScoreElement.textContent = result.bestScore;

  renderBoard(result.probabilities, result.bestIndex);
}

/**
 * Calcule toutes les positions possibles de tous les bateaux actifs.
 * Chaque placement valide ajoute +1 aux cases concernées.
 */
function calculateAllPossibilities() {
  const probabilities = Array.from({ length: 100 }, () => 0);
  let totalPlacements = 0;

  const activeShips = Object.values(SHIPS).filter(ship => ship.active);

  for (const ship of activeShips) {
    const placements = getValidPlacementsForShip(ship.size);

    totalPlacements += placements.length;

    for (const placement of placements) {
      for (const index of placement.cells) {
        if (board[index] === STATE.UNKNOWN || board[index] === STATE.HIT) {
          probabilities[index]++;
        }
      }
    }
  }

  /*
    Bonus stratégique :
    Si des cases sont déjà touchées, on favorise les placements qui passent dessus.
  */
  const hitIndexes = board
    .map((state, index) => state === STATE.HIT ? index : null)
    .filter(index => index !== null);

  if (hitIndexes.length > 0) {
    const weightedProbabilities = Array.from({ length: 100 }, () => 0);

    for (const ship of activeShips) {
      const placements = getValidPlacementsForShip(ship.size);

      for (const placement of placements) {
        const hitCount = placement.cells.filter(index => hitIndexes.includes(index)).length;

        if (hitCount > 0) {
          for (const index of placement.cells) {
            if (board[index] === STATE.UNKNOWN || board[index] === STATE.HIT) {
              weightedProbabilities[index] += 5 * hitCount;
            }
          }
        }
      }
    }

    for (let i = 0; i < 100; i++) {
      probabilities[i] += weightedProbabilities[i];
    }
  }

  let bestIndex = null;
  let bestScore = -1;

  probabilities.forEach((score, index) => {
    if (board[index] === STATE.UNKNOWN && score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestScore < 0) {
    bestScore = 0;
  }

  return {
    probabilities,
    totalPlacements,
    bestIndex,
    bestScore
  };
}

/**
 * Retourne tous les placements valides pour un bateau d'une certaine taille.
 */
function getValidPlacementsForShip(size) {
  const placements = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const horizontalCells = [];
      const verticalCells = [];

      for (let offset = 0; offset < size; offset++) {
        horizontalCells.push(rowColToIndex(row, col + offset));
        verticalCells.push(rowColToIndex(row + offset, col));
      }

      if (col + size <= BOARD_SIZE && isPlacementValid(horizontalCells)) {
        placements.push({
          orientation: "horizontal",
          cells: horizontalCells
        });
      }

      if (row + size <= BOARD_SIZE && isPlacementValid(verticalCells)) {
        placements.push({
          orientation: "vertical",
          cells: verticalCells
        });
      }
    }
  }

  return placements;
}

/**
 * Règle de validité :
 * - un bateau ne peut pas passer sur de l'eau
 * - un bateau ne peut pas passer sur une case coulée
 * - un bateau peut passer sur une case touchée
 * - un bateau peut passer sur une case inconnue
 */
function isPlacementValid(cells) {
  for (const index of cells) {
    if (index < 0 || index >= 100) return false;

    const state = board[index];

    if (state === STATE.MISS) return false;
    if (state === STATE.SUNK) return false;
  }

  return true;
}

function rowColToIndex(row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return -9999;
  }

  return row * BOARD_SIZE + col;
}

function indexToCoordinate(index) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;

  const letter = String.fromCharCode(65 + col);
  return `${letter}${row + 1}`;
}

function coordinateToIndex(coordinate) {
  const clean = coordinate.trim().toUpperCase();

  const letter = clean[0];
  const number = parseInt(clean.slice(1), 10);

  const col = letter.charCodeAt(0) - 65;
  const row = number - 1;

  if (row < 0 || row >= 10 || col < 0 || col >= 10) {
    return null;
  }

  return rowColToIndex(row, col);
}

function exportJSON() {
  const data = {
    version: 1,
    date: new Date().toISOString(),
    board,
    ships: Object.fromEntries(
      Object.values(SHIPS).map(ship => [
        ship.id,
        {
          active: ship.active,
          size: ship.size
        }
      ])
    )
  };

  jsonBox.value = JSON.stringify(data, null, 2);
}

function importJSON() {
  try {
    const data = JSON.parse(jsonBox.value);

    if (!Array.isArray(data.board) || data.board.length !== 100) {
      alert("JSON invalide : board doit contenir 100 cases.");
      return;
    }

    board = data.board;

    if (data.ships) {
      Object.keys(data.ships).forEach(shipId => {
        if (SHIPS[shipId]) {
          SHIPS[shipId].active = Boolean(data.ships[shipId].active);
        }
      });
    }

    renderShips();
    renderBoard();
    recalculate();

    alert("Import réussi !");
  } catch (error) {
    alert("Erreur d'import JSON : " + error.message);
  }
}

/**
 * OCR gratuit avec Tesseract.js.
 * Important :
 * Tesseract lit surtout du texte.
 * Pour une capture Battleship purement graphique,
 * il faudra soit :
 * - demander à l'utilisateur une capture avec lettres/chiffres visibles,
 * - soit brancher une IA vision,
 * - soit créer un modèle de détection personnalisé.
 */
async function readImageWithOCR() {
  const file = imageInput.files[0];

  if (!file) {
    alert("Choisis d'abord une image.");
    return;
  }

  ocrOutput.value = "Analyse OCR en cours...";

  try {
    const result = await Tesseract.recognize(file, "eng+fra", {
      logger: message => {
        if (message.status) {
          ocrOutput.value = `${message.status} ${Math.round((message.progress || 0) * 100)}%`;
        }
      }
    });

    ocrOutput.value = result.data.text;

    /*
      Ici tu peux parser le texte.
      Exemple si l'image contient :
      MISS A1
      HIT B4
      SUNK C7
    */
    parseOcrText(result.data.text);

  } catch (error) {
    ocrOutput.value = "Erreur OCR : " + error.message;
  }
}

/**
 * Exemple de parser simple.
 * Il peut détecter :
 * MISS A1
 * WATER A1
 * EAU A1
 * HIT B3
 * TOUCHE B3
 * SUNK C4
 * COULE C4
 */
function parseOcrText(text) {
  const lines = text.split(/\n+/);

  for (const line of lines) {
    const upper = line.toUpperCase();

    const coordinateMatch = upper.match(/[A-J]\s?10|[A-J]\s?[1-9]/);

    if (!coordinateMatch) continue;

    const coordinate = coordinateMatch[0].replace(/\s+/g, "");
    const index = coordinateToIndex(coordinate);

    if (index === null) continue;

    if (upper.includes("MISS") || upper.includes("WATER") || upper.includes("EAU")) {
      board[index] = STATE.MISS;
    }

    if (upper.includes("HIT") || upper.includes("TOUCHE") || upper.includes("TOUCHÉ")) {
      board[index] = STATE.HIT;
    }

    if (upper.includes("SUNK") || upper.includes("COULE") || upper.includes("COULÉ")) {
      board[index] = STATE.SUNK;
    }
  }

  renderBoard();
  recalculate();
}

/**
 * Simulation d'une IA vision.
 * Pour brancher Mistral, OpenAI, Gemini, etc.,
 * il faut généralement utiliser un backend, car il ne faut jamais mettre la clé API dans le JS public.
 */
function mockAiImageAnalysis() {
  const example = {
    boardUpdates: [
      { coordinate: "A1", state: "miss" },
      { coordinate: "B4", state: "hit" },
      { coordinate: "C4", state: "hit" },
      { coordinate: "H8", state: "miss" }
    ]
  };

  for (const update of example.boardUpdates) {
    const index = coordinateToIndex(update.coordinate);

    if (index !== null && STATE[update.state?.toUpperCase()] !== undefined) {
      board[index] = update.state;
    } else if (index !== null) {
      board[index] = update.state;
    }
  }

  ocrOutput.value = JSON.stringify(example, null, 2);

  renderBoard();
  recalculate();
}

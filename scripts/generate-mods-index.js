const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const MODS_DIR = path.join(ROOT_DIR, "mods");
const OUTPUT_FILE = path.join(ROOT_DIR, "data", "mods-index.json");

function createFileEntry(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  const stats = fs.statSync(filePath);

  return {
    type: "file",
    name: path.basename(filePath),
    path: relativePath,
    size: stats.size,
    extension: path.extname(filePath).toLowerCase(),
  };
}

function scanDirectory(directory, relativeDirectory = "") {
  const entries = fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  return entries.map((entry) => {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path
      .join(relativeDirectory, entry.name)
      .replace(/\\/g, "/");

    if (entry.isDirectory()) {
      return {
        type: "folder",
        name: entry.name,
        path: `mods/${relativePath}`,
        children: scanDirectory(fullPath, relativePath),
      };
    }

    if (entry.isFile()) {
      return createFileEntry(fullPath);
    }

    return null;
  }).filter(Boolean);
}

if (!fs.existsSync(MODS_DIR)) {
  console.warn("⚠️ Dossier /mods absent. Index vide généré.");

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        games: [],
        files: [],
      },
      null,
      2
    ),
    "utf8"
  );

  process.exit(0);
}

const tree = scanDirectory(MODS_DIR);

const files = [];

function collectFiles(nodes, currentGame = null) {
  for (const node of nodes) {
    if (node.type === "folder") {
      const game = currentGame || node.name;
      collectFiles(node.children, game);
    }

    if (node.type === "file") {
      files.push({
        ...node,
        game: currentGame,
      });
    }
  }
}

collectFiles(tree);

const index = {
  generatedAt: new Date().toISOString(),

  // Les premiers dossiers dans /mods deviennent automatiquement les jeux
  games: tree.filter((item) => item.type === "folder"),

  // Liste complète de tous les fichiers trouvés
  files,
};

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(index, null, 2),
  "utf8"
);

console.log(`✅ Index généré : ${files.length} fichier(s) trouvé(s).`);
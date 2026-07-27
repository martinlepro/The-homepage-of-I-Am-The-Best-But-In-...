/**
 * generate-mods-index.js
 * 
 * Parcourt le dossier /mods, traite les sous-dossiers comme catégories
 * et les sous-dossiers de niveau 2 comme noms de mods. Discover les ZIP
 * récursivement, parse les marqueurs de version "vX" à la fin du nom
 * de fichier, et génère data/mods-index.json.
 * 
 * Structure attendue:
 *   /mods/<catégorie>/<nom du mod>/<fichier>.zip
 * 
 * Exemple:
 *   /mods/nsmbw/The Ultimate Mod For Personnalisation/Omnibox v1.zip
 *   → catégorie  : "nsmbw"
 *   → nom        : "The Ultimate Mod For Personnalisation"
 *   → fichier    : "Omnibox v1.zip" → version = "1"
 * 
 * Usage: node scripts/generate-mods-index.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Chemins ────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");           // racine du dépôt
const MODS_DIR = path.join(ROOT, "mods");
const OUTPUT_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "mods-index.json");

// ── Utilitaires ──────────────────────────────────────────────────────────────
async function exists(p) {
    try { await fs.access(p); return true; }
    catch { return false; }
}

/** Extrait le numéro de version d'un nom de fichier ZIP.
 *  Exemples:
 *    "MyMod v1.zip"       → "1"
 *    "Toolkit v2.3.zip"   → "2.3"
 *    "Omnibox v10.zip"    → "10"
 *    "Something.zip"      → null
 */
function parseVersion(filename) {
    const m = filename.match(/\bv(\d+(?:\.\d+)?)\.zip$/i);
    return m ? m[1] : null;
}

/** Lecture optionnelle d'un project.json dans un dossier de mod */
async function readMetadata(modDir) {
    const metaPath = path.join(modDir, "project.json");
    if (!(await exists(metaPath))) return {};
    try { return JSON.parse(await fs.readFile(metaPath, "utf8")); }
    catch { return {}; }
}

/** Construit l'URL publique d'un chemin (gestion des espaces) */
function publicPath(category, folder, filename) {
    return `mods/${encodeURIComponent(category)}/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
}

// ── Génération de l'index ───────────────────────────────────────────────────
async function generateIndex() {
    if (!(await exists(MODS_DIR))) {
        console.error(`❌  Dossier /mods introuvable à ${MODS_DIR}`);
        process.exitCode = 1;
        return;
    }

    const categoryNames = await fs.readdir(MODS_DIR, { withFileTypes: true });
    const categories = [];

    for (const catEntry of categoryNames) {
        if (!catEntry.isDirectory()) continue;

        const catName = catEntry.name;                           // ex: "nsmbw"
        const catDir = path.join(MODS_DIR, catName);
        const projectEntries = await fs.readdir(catDir, { withFileTypes: true });
        const projects = [];

        for (const projEntry of projectEntries) {
            if (!projEntry.isDirectory()) continue;

            const projName = projEntry.name;                     // ex: "The Ultimate Mod For Personnalisation"
            const projDir = path.join(catDir, projName);
            const metadata = await readMetadata(projDir);

            // Découverte récursive des fichiers ZIP
            const allFiles = await walkDir(projDir);
            const zipFiles = allFiles
                .filter(f => f.toLowerCase().endsWith(".zip"))
                .map(f => path.relative(projDir, f));

            // Regroupement par version
            const byVersion = {};
            for (const zip of zipFiles) {
                const ver = parseVersion(zip);
                const key = ver ?? "other";
                if (!byVersion[key]) byVersion[key] = [];
                byVersion[key].push({
                    filename: zip,
                    url: publicPath(catName, projName, zip)
                });
            }

            // Référencer aussi le fichier project.json s'il existe
            const extraFiles = (metadata.includeFiles || []).map(f => ({
                filename: f,
                url: publicPath(catName, projName, f)
            }));

            projects.push({
                id: `${catName}/${projName}`,
                category: catName,
                folder: projName,
                name: metadata.name ?? projName,
                description: metadata.description ?? null,
                tags: Array.isArray(metadata.tags) ? metadata.tags : [],
                links: metadata.links ?? {},
                image: metadata.image ? publicPath(catName, projName, metadata.image) : null,
                versions: byVersion,
                extraFiles
            });
        }

        categories.push({
            id: catName,
            name: catName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
            projects
        });
    }

    const result = {
        generatedAt: new Date().toISOString(),
        categoryCount: categories.length,
        projectCount: categories.reduce((t, c) => t + c.projects.length, 0),
        categories
    };

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 4), "utf8");

    console.log(`✅  ${result.projectCount} mod(s) dans ${result.categoryCount} catégorie(s)`);
    console.log(`📄  Écrit → ${OUTPUT_FILE}`);
}

// ── Parcours récursif ────────────────────────────────────────────────────────
async function walkDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            files.push(...await walkDir(p));
        } else if (e.isFile()) {
            files.push(p);
        }
    }
    return files;
}

generateIndex().catch(err => {
    console.error("Erreur fatale:", err);
    process.exitCode = 1;
});

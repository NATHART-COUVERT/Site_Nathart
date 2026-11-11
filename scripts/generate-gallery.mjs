// Génère, pour chaque galerie, media/photos/<galerie>/photos.json : la liste de toutes les photos du dossier.
// Exécuté automatiquement par Vercel à chaque déploiement (voir "buildCommand" dans vercel.json).
// Aucune dépendance : uniquement des modules Node intégrés.
//
// Galeries : "toiles" (carrousel, avec fiches d'œuvre), "cube" (cube 3D), "anneau" (anneau 3D).
// - Titre d'une photo : valeur de titres.json si elle existe, sinon déduite du nom de fichier
//   ("coucher-de-soleil.jpg" -> "Coucher de soleil").
// - Un titre se terminant par "(…)" définit une vue : "Rose (ouverte)" -> titre "Rose", vue "ouverte".
//   Les photos de même titre forment une seule œuvre (le carrousel les garde côte à côte).
// - Fiche d'une œuvre (dimensions, matière, peinture, prix) : details.json, uniquement pour "toiles".
// En cas de problème, le script n'échoue jamais : la liste déjà présente dans le dépôt est conservée.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';

// Numéro de version d'une image = empreinte de son contenu : l'adresse (?v=…) change dès que l'image
// change, donc aucun navigateur ne garde une ancienne version en mémoire (ex. avant/après filigrane).
function empreinte(chemin) {
  return createHash('md5').update(readFileSync(chemin)).digest('hex').slice(0, 10);
}

const galeries = ['toiles', 'cube', 'anneau'];
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const champs = ['dimensions', 'matiere', 'peinture', 'prix'];

function titreDepuisNom(fichier) {
  let t = basename(fichier, extname(fichier));
  t = t.replace(/^\d+\s*[-_.]\s*/, '').replace(/[-_]+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Toile';
}

function lireJson(dossier, nom) {
  const chemin = join(dossier, nom);
  return existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf8')) : {};
}

for (const galerie of galeries) {
  const dossier = `media/photos/${galerie}`;
  try {
    if (!existsSync(dossier)) continue;
    const titres = lireJson(dossier, 'titres.json');
    const details = galerie === 'toiles' ? lireJson(dossier, 'details.json') : {};

    const photos = readdirSync(dossier)
      .filter((f) => extensions.has(extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map((f) => {
        const t = titres[f];
        const brut = typeof t === 'string' ? t : (t && t.titre) || titreDepuisNom(f);
        const m = brut.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        const photo = { src: `/${dossier}/${encodeURIComponent(f)}?v=${empreinte(join(dossier, f))}`, titre: m ? m[1].trim() : brut };
        if (m) photo.vue = m[2].trim();
        if (t && typeof t === 'object' && t.alt) photo.alt = t.alt;
        const fiche = details[photo.titre] || {};
        for (const c of champs) if (typeof fiche[c] === 'string' && fiche[c].trim()) photo[c] = fiche[c].trim();
        return photo;
      });

    writeFileSync(join(dossier, 'photos.json'), JSON.stringify({ generated: 'vercel-build', photos }, null, 2) + '\n');
    console.log(`generate-gallery : ${galerie} : ${photos.length} photo(s) listée(s) dans ${dossier}/photos.json`);
  } catch (erreur) {
    console.error(`generate-gallery : ${galerie} : ${erreur.message} (la liste existante est conservée)`);
  }
}
process.exit(0);

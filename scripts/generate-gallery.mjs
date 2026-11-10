// Génère media/photos/toiles/photos.json : la liste de toutes les photos du dossier.
// Exécuté automatiquement par Vercel à chaque déploiement (voir "buildCommand" dans vercel.json).
// Aucune dépendance : uniquement des modules Node intégrés.
//
// Titre d'une photo : valeur de titres.json si elle existe, sinon déduite du nom de fichier
// ("coucher-de-soleil.jpg" -> "Coucher de soleil"). En cas de problème, le script n'échoue jamais :
// la liste déjà présente dans le dépôt est conservée.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const dossier = 'media/photos/toiles';
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function titreDepuisNom(fichier) {
  let t = basename(fichier, extname(fichier));
  t = t.replace(/^\d+\s*[-_.]\s*/, '').replace(/[-_]+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Toile';
}

try {
  const fichierTitres = join(dossier, 'titres.json');
  const titres = existsSync(fichierTitres) ? JSON.parse(readFileSync(fichierTitres, 'utf8')) : {};

  const photos = readdirSync(dossier)
    .filter((f) => extensions.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((f) => {
      const t = titres[f];
      const titre = typeof t === 'string' ? t : (t && t.titre) || titreDepuisNom(f);
      const photo = { src: `/${dossier}/${encodeURIComponent(f)}`, titre };
      if (t && typeof t === 'object' && t.alt) photo.alt = t.alt;
      return photo;
    });

  writeFileSync(join(dossier, 'photos.json'), JSON.stringify({ generated: 'vercel-build', photos }, null, 2) + '\n');
  console.log(`generate-gallery : ${photos.length} photo(s) listée(s) dans ${dossier}/photos.json`);
} catch (erreur) {
  console.error(`generate-gallery : ${erreur.message} (la liste existante est conservée)`);
}
process.exit(0);

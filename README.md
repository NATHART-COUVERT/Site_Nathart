# Nathart — site statique

Site vitrine de Nathart (artiste peintre), en **HTML / CSS / JavaScript pur** — sans WordPress, sans base de données, sans outil de build. Il se déploie tel quel sur Vercel.

## Structure

```
index.html                    Accueil
art/ neurosciences/ creation-symboles/ spiritualite-sciences/ art-transpersonnel/   Les cinq univers
epigenetique/ evenements/ contact/                                                   Autres pages
mentions-legales/ confidentialite/                                                   Pages légales
404.html                      Page d'erreur
assets/css/style.css          Toute la mise en forme
assets/js/main.js             Menu mobile + formulaire de contact
assets/img/                   Images optimisées
assets/fonts/                 Polices hébergées (voir ci-dessous)
`vercel.json`                   URLs propres, en-têtes de sécurité, cache
sitemap.xml  robots.txt       Référencement
```

## À faire avant la mise en ligne

1. **Polices** — placer dans `assets/fonts/` ces 4 fichiers (format `.woff2`, sous-ensemble latin) :
   `pinyon-script-400.woff2`, `cormorant-garamond-500.woff2`, `cormorant-garamond-500-italic.woff2`, `cormorant-garamond-700.woff2`.
   Les héberger sur le site évite d'envoyer l'adresse IP des visiteurs à Google (RGPD). Sans ces fichiers, le site s'affiche avec des polices de secours.
2. **Nom de domaine** — remplacer `https://VOTRE-DOMAINE.fr` par l'adresse réelle du site dans toutes les pages, dans `sitemap.xml` et `robots.txt`. Commande PowerShell :
   ```powershell
   Get-ChildItem -Recurse -Include *.html,*.xml,*.txt | ForEach-Object {
     (Get-Content $_.FullName -Raw -Encoding UTF8).Replace('https://VOTRE-DOMAINE.fr','https://www.nathart.fr') |
       Set-Content $_.FullName -Encoding UTF8 -NoNewline
   }
   ```
3. **Formulaire de contact** — créer un formulaire gratuit sur [formspree.io](https://formspree.io), puis remplacer `REMPLACER-PAR-VOTRE-IDENTIFIANT` dans `contact/index.html` par l'identifiant reçu (`https://formspree.io/f/xxxxxxxx`). C'est Formspree qui envoie les messages sur l'adresse e-mail choisie dans son tableau de bord.
4. **Pages légales** — compléter les mentions surlignées `[À COMPLÉTER …]` dans `mentions-legales/` et `confidentialite/` (adresse, durée de conservation, date), puis les faire relire.

## Publier : GitHub puis Vercel

1. Créer un dépôt vide sur GitHub, puis y envoyer ce dossier (`git init`, `git add .`, `git commit`, `git remote add origin …`, `git push -u origin main`).
2. Sur [vercel.com](https://vercel.com) : *Add New → Project*, importer le dépôt GitHub. Aucun réglage à changer : *Framework Preset* « Other », pas de commande de build, pas de dossier de sortie.
3. Chaque `git push` sur `main` redéploie automatiquement le site.
4. Dans *Settings → Domains* du projet Vercel, ajouter le nom de domaine.

## Modifier le site

- **Textes** : éditer directement le fichier HTML de la page concernée.
- **Couleurs et polices** : variables en tête de `assets/css/style.css` (`--or`, `--fond`, …).
- **En-tête, menu et pied de page** sont répétés dans chaque page : une modification du menu doit être reportée dans tous les fichiers `index.html`.
- Prévisualiser en local : **double-cliquer sur `Apercu-local.bat`** (Windows, rien à installer) : le site s'ouvre sur `http://localhost:8123/`. Ne pas ouvrir `index.html` directement : les liens sont absolus (`/art/`), le rendu serait cassé hors d'un serveur. Alternatives : extension *Live Server* de VS Code, ou `npx vercel dev`.

## Mode « site privé » (en cours)

`vercel.json` envoie l'en-tête `X-Robots-Tag: noindex, nofollow, noai, noimageai` : Google et les autres moteurs n'indexent pas le site tant qu'il n'est pas terminé, et `noai, noimageai` demande aux outils d'IA de ne pas utiliser les textes et les images. **Au lancement, remplacer la valeur par `noai, noimageai`** (c'est-à-dire retirer `noindex, nofollow`, puis pousser sur GitHub), sinon le site restera invisible dans les recherches.

## Photos et vidéos (dossier `media/`)

### Ajouter une toile au carrousel
1. **Glisser-déposer** les photos (ou leur dossier) sur **`Optimiser-photos.bat`**. L'outil redimensionne (1800 px maximum), compresse, nettoie le nom de fichier, copie dans `media/photos/toiles/` et ajoute le titre dans `titres.json`.
2. Envoyer sur GitHub (GitHub Desktop : *Commit* puis *Push*). Vercel redéploie et **la photo apparaît toute seule** dans le carrousel de la page Galerie (ordre aléatoire à chaque visite).

- **Une œuvre en plusieurs vues** : nommer les fichiers `Titre (ouverte).jpg` et `Titre (fermée).jpg`. Les photos de même titre sont toujours affichées l'une après l'autre dans le carrousel (le mélange aléatoire se fait par œuvre), et la vue apparaît dans la légende.
- **Fiche d'une œuvre (survol)** : `media/photos/toiles/details.json` contient une fiche par œuvre (clé = titre) avec `dimensions`, `matiere` (matière), `peinture` et `prix`. Remplir les champs à la main ; seuls les champs renseignés s'affichent, et une œuvre sans aucune info n'a pas de fiche. La fiche s'affiche au survol à la souris, au clavier, ou en touchant le bouton rond `i` sur téléphone et tablette. L'outil `Optimiser-photos.bat` ajoute une fiche vide pour chaque nouvelle œuvre et ne touche jamais aux valeurs déjà saisies.
- **Titre affiché** : modifiable dans `media/photos/toiles/titres.json` (`"nom-du-fichier.jpg": "Titre de la toile"`). Pour une description détaillée pour les malvoyants : `"nom.jpg": { "titre": "...", "alt": "Description..." }`.
- **Supprimer une toile** : supprimer le fichier `.jpg` (et sa ligne dans `titres.json`), puis envoyer sur GitHub.
- **Comment ça marche** : à chaque déploiement, Vercel exécute `scripts/generate-gallery.mjs`, qui lit le dossier et écrit `photos.json` ; le navigateur lit cette liste (`assets/js/carrousel.js`). Si une photo est déposée sans passer par l'outil, elle apparaît quand même, mais non optimisée.

### Vidéos
- `media/videos/` : vidéos au format **MP4 (H.264 + son AAC)**, 720p, quelques minutes au plus. GitHub refuse les fichiers de plus de 100 Mo : pour des vidéos plus longues, passer par un hébergeur vidéo.
- Noms de fichiers sans accents ni espaces (`presentation-galerie.mp4`).
- Une vidéo s'ajoute en copiant le bloc `<figure class="media-video">` de `galerie/index.html`.

## Cube et anneau 3D (œuvres hors vente)

Deux volumes 3D sous le carrousel de la page Galerie, dans la section « Œuvres non disponibles à la vente » :

- **Le cube** (`media/photos/cube/`) : toujours 6 faces. Avec plus de 6 photos, 6 sont tirées au hasard à chaque visite ; avec moins de 6, les photos sont répétées. Il tourne tout seul d'une face à l'autre (avant, droite, arrière, gauche, dessus, dessous), s'arrête au survol, se fait tourner à la souris ou au doigt (horizontalement sur mobile, pour garder le défilement de la page), ou avec les boutons et les flèches du clavier.
- **L'anneau** (`media/photos/anneau/`) : un panneau par photo, quel que soit leur nombre (3 à 24 conseillé). Rotation lente continue, pause au survol, glisser à la souris ou au doigt avec inertie, boutons et flèches du clavier.
- Pour ajouter des œuvres : glisser les photos sur **`Optimiser-cube.bat`** ou **`Optimiser-anneau.bat`**, puis envoyer sur GitHub. Les titres se modifient dans `titres.json` du dossier concerné. Pas de fiche prix pour ces deux volumes.
- Si le visiteur a demandé « moins de mouvement » dans son système, la rotation automatique est coupée (les boutons restent).

## Protection du contenu (dissuasion)

Mesures en place (aucune ne peut être absolue : tout ce qu'un navigateur affiche peut être capturé) :

- **Texte** : sélection et copie bloquées (`assets/css/style.css` + `assets/js/protection.js`). Un copier-coller produit un message de droits d'auteur. Les champs du formulaire et les éléments `class="copiable"` (l'e-mail des mentions légales) restent utilisables.
- **Images et vidéos** : clic droit, appui long, glisser-déposer et bouton « Télécharger » du lecteur vidéo bloqués ; images masquées à l'impression.
- **Robots d'IA** : `robots.txt` interdit les principaux robots d'entraînement et de collecte (GPTBot, ClaudeBot, CCBot, Google-Extended, PerplexityBot, etc.) et l'en-tête `noai, noimageai` demande de ne pas utiliser images et textes.
- **Qualité des images** : 1800 px maximum pour les toiles, 1000 px pour le cube et l'anneau, jamais les originaux.
- **Filigrane** : « © Nathart » est incrusté en diagonale au centre de chaque image (blanc à environ 40 % d'opacité, avec un fin contour sombre pour rester lisible sur fond clair comme sombre). Il est ajouté automatiquement par les trois outils `Optimiser-…bat` : les images déposées directement dans les dossiers `media/photos/…` sans passer par l'outil n'en ont pas. Réglages dans `outils/optimiser-photos.ps1` : `$FiligraneOpacite` (0 à 255) et `$FiligraneLargeur` (part de la diagonale de l'image). Pour une image sans filigrane : option `-SansFiligrane`. Les originaux ne sont jamais modifiés. La vidéo n'a pas de filigrane (à ajouter dans Shotcut).
- **Mentions** : © Nathart et clause de propriété intellectuelle dans les mentions légales.

Limites : une capture d'écran, les outils de développement du navigateur ou la désactivation de JavaScript contournent les blocages du texte et des clics. Le filigrane est la seule protection qui suive l'image une fois copiée.
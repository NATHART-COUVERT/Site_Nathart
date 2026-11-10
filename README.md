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
vercel.json                   URLs propres, en-têtes de sécurité, cache
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

ercel.json envoie l'en-tête `X-Robots-Tag: noindex, nofollow` : Google et les autres moteurs n'indexent pas le site tant qu'il n'est pas terminé. **Au lancement, supprimer cette ligne de ercel.json** (puis pousser sur GitHub), sinon le site restera invisible dans les recherches.

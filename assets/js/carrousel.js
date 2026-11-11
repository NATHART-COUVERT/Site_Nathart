/* Nathart — carrousel des toiles.
   Lit /media/photos/toiles/photos.json (toutes les photos du dossier), les mélange à chaque visite
   (les vues d'une même œuvre restent côte à côte) et les affiche dans un carrousel : balayage au doigt,
   glisser à la souris, boutons, flèches du clavier. Fiche de l'œuvre au survol (souris), au clavier
   ou au toucher du bouton « i ». */
(function () {
  "use strict";

  var racine = document.querySelector("[data-carrousel]");
  if (!racine) return;

  var piste = racine.querySelector(".carrousel__piste");
  var btnPrec = racine.querySelector(".carrousel__bouton--prec");
  var btnSuiv = racine.querySelector(".carrousel__bouton--suiv");
  var legende = racine.querySelector(".carrousel__legende");
  var compteur = racine.querySelector(".carrousel__compteur");
  var diapos = [];
  var photos = [];
  var dernierIndex = -1;
  var mouvementReduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* libellés de la fiche de l'œuvre (ordre d'affichage) */
  var CHAMPS = [
    ["dimensions", "Dimensions"],
    ["matiere", "Matière"],
    ["peinture", "Peinture"],
    ["prix", "Prix"]
  ];

  function melanger(liste) { /* Fisher-Yates */
    for (var i = liste.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = liste[i]; liste[i] = liste[j]; liste[j] = t;
    }
    return liste;
  }

  /* mélange par œuvre : les photos de même titre restent ensemble, dans l'ordre de la liste */
  function ordonner(liste) {
    var groupes = [], index = {};
    liste.forEach(function (p) {
      if (!(p.titre in index)) { index[p.titre] = groupes.length; groupes.push([]); }
      groupes[index[p.titre]].push(p);
    });
    return melanger(groupes).reduce(function (a, g) { return a.concat(g); }, []);
  }

  function titreComplet(p) { return p.vue ? p.titre + " (" + p.vue + ")" : p.titre; }

  function indexCourant() {
    var l = piste.clientWidth || 1;
    return Math.max(0, Math.min(diapos.length - 1, Math.round(piste.scrollLeft / l)));
  }

  function fermerInfos() {
    for (var k = 0; k < diapos.length; k++) {
      diapos[k].classList.remove("est-info");
      var b = diapos[k].querySelector(".carrousel__info-bouton");
      if (b) b.setAttribute("aria-expanded", "false");
    }
  }

  function majEtat() {
    var i = indexCourant();
    if (i !== dernierIndex) { fermerInfos(); dernierIndex = i; }
    if (legende && photos[i]) legende.textContent = titreComplet(photos[i]);
    if (compteur) compteur.textContent = (i + 1) + " / " + photos.length;
    for (var k = 0; k < diapos.length; k++) {
      diapos[k].setAttribute("aria-hidden", k === i ? "false" : "true");
    }
  }

  function aller(i, doux) {
    var n = diapos.length;
    if (!n) return;
    i = (i + n) % n; /* boucle : après la dernière, retour à la première */
    piste.scrollTo({ left: i * piste.clientWidth, behavior: doux === false || mouvementReduit ? "auto" : "smooth" });
  }

  /* fiche de l'œuvre : seuls les champs renseignés sont affichés ; pas de fiche = pas de bouton « i » */
  function construireFiche(li, p, i) {
    var lignes = CHAMPS.filter(function (c) { return p[c[0]]; });
    if (!lignes.length) return;
    var id = "fiche-" + i;
    var fiche = document.createElement("div");
    fiche.className = "carrousel__fiche";
    fiche.id = id;
    var titre = document.createElement("p");
    titre.className = "carrousel__fiche-titre";
    titre.textContent = p.titre;
    var dl = document.createElement("dl");
    lignes.forEach(function (c) {
      var ligne = document.createElement("div");
      var dt = document.createElement("dt"); dt.textContent = c[1];
      var dd = document.createElement("dd"); dd.textContent = p[c[0]];
      ligne.appendChild(dt); ligne.appendChild(dd); dl.appendChild(ligne);
    });
    fiche.appendChild(titre); fiche.appendChild(dl);

    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "carrousel__info-bouton";
    bouton.setAttribute("aria-label", "Informations sur la toile « " + p.titre + " »");
    bouton.setAttribute("aria-controls", id);
    bouton.setAttribute("aria-expanded", "false");
    bouton.addEventListener("click", function () {
      var ouvert = li.classList.toggle("est-info");
      bouton.setAttribute("aria-expanded", String(ouvert));
    });
    li.appendChild(bouton); /* le bouton précède la fiche : le CSS affiche la fiche quand il a le focus clavier */
    li.appendChild(fiche);
  }

  function construire() {
    piste.textContent = "";
    photos.forEach(function (p, i) {
      var li = document.createElement("li");
      li.className = "carrousel__diapo";
      li.setAttribute("role", "group");
      li.setAttribute("aria-roledescription", "diapositive");
      li.setAttribute("aria-label", (i + 1) + " sur " + photos.length + " : " + titreComplet(p));
      var img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt || "Toile de Nathart : " + titreComplet(p);
      img.decoding = "async";
      img.draggable = false;
      if (i > 0) img.loading = "lazy";
      li.appendChild(img);
      construireFiche(li, p, i);
      piste.appendChild(li);
      diapos.push(li);
    });
    racine.classList.add("est-pret");
    if (photos.length < 2) { btnPrec.hidden = true; btnSuiv.hidden = true; }
    majEtat();
  }

  /* --- défilement (doigt / trackpad : natif ; souris : glisser-déposer ci-dessous) --- */
  var ticking = false;
  piste.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; majEtat(); });
  }, { passive: true });

  btnPrec.addEventListener("click", function () { aller(indexCourant() - 1); });
  btnSuiv.addEventListener("click", function () { aller(indexCourant() + 1); });

  piste.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); aller(indexCourant() - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); aller(indexCourant() + 1); }
    else if (e.key === "Home") { e.preventDefault(); aller(0); }
    else if (e.key === "End") { e.preventDefault(); aller(diapos.length - 1); }
    else if (e.key === "Escape") { fermerInfos(); }
  });

  var depart = null;
  piste.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target.closest && e.target.closest("button")) return; /* le bouton « i » reste cliquable */
    depart = { x: e.clientX, gauche: piste.scrollLeft };
    piste.classList.add("est-glisse");
    piste.setPointerCapture(e.pointerId);
  });
  piste.addEventListener("pointermove", function (e) {
    if (!depart) return;
    piste.scrollLeft = depart.gauche - (e.clientX - depart.x);
  });
  function fin(e) {
    if (!depart) return;
    var deplacement = e.clientX - depart.x;
    var base = Math.round(depart.gauche / (piste.clientWidth || 1));
    depart = null;
    piste.classList.remove("est-glisse");
    /* un glissé d'au moins 60 px passe à la photo voisine, sinon on revient à la photo courante */
    aller(Math.abs(deplacement) > 60 ? base + (deplacement < 0 ? 1 : -1) : base);
  }
  piste.addEventListener("pointerup", fin);
  piste.addEventListener("pointercancel", fin);

  /* à la rotation de l'écran / au redimensionnement : rester sur la photo affichée */
  var courant = 0;
  piste.addEventListener("scroll", function () { courant = indexCourant(); }, { passive: true });
  window.addEventListener("resize", function () { aller(courant, false); });

  /* --- chargement de la liste des photos --- */
  fetch(racine.getAttribute("data-source"), { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    })
    .then(function (data) {
      photos = ordonner((data.photos || []).slice());
      if (!photos.length) {
        if (legende) legende.textContent = "Les toiles arrivent bientôt.";
        btnPrec.hidden = true; btnSuiv.hidden = true;
        return;
      }
      construire();
    })
    .catch(function () {
      if (legende) legende.textContent = "Les toiles n'ont pas pu être chargées. Merci de réessayer plus tard.";
      btnPrec.hidden = true; btnSuiv.hidden = true;
    });
})();

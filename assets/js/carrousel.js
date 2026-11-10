/* Nathart — carrousel des toiles.
   Lit /media/photos/toiles/photos.json (toutes les photos du dossier), les mélange à chaque visite
   et les affiche dans un carrousel : balayage au doigt, glisser à la souris, boutons, flèches du clavier. */
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
  var mouvementReduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function melanger(liste) { /* Fisher-Yates */
    for (var i = liste.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = liste[i]; liste[i] = liste[j]; liste[j] = t;
    }
    return liste;
  }

  function indexCourant() {
    var l = piste.clientWidth || 1;
    return Math.max(0, Math.min(diapos.length - 1, Math.round(piste.scrollLeft / l)));
  }

  function majEtat() {
    var i = indexCourant();
    if (legende && photos[i]) legende.textContent = photos[i].titre;
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

  function construire() {
    piste.textContent = "";
    photos.forEach(function (p, i) {
      var li = document.createElement("li");
      li.className = "carrousel__diapo";
      li.setAttribute("role", "group");
      li.setAttribute("aria-roledescription", "diapositive");
      li.setAttribute("aria-label", (i + 1) + " sur " + photos.length + " : " + p.titre);
      var img = document.createElement("img");
      img.src = p.src;
      img.alt = p.alt || "Toile de Nathart : " + p.titre;
      img.decoding = "async";
      img.draggable = false;
      if (i > 0) img.loading = "lazy";
      li.appendChild(img);
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
  });

  var depart = null;
  piste.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
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
      photos = melanger((data.photos || []).slice());
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

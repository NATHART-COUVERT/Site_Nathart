/* Nathart — l'album : un livre dont on tourne les pages.
   Données : /media/album/album.json (titre, couverture, œuvres avec texte et photos) et la liste
   /media/photos/album/photos.json (adresses versionnées des images). Écran large : double page ;
   téléphone : une page à la fois. Pages tournées au doigt, à la souris (glisser), par clic sur un bord,
   avec les boutons ou les flèches du clavier. Aucune dépendance. */
(function () {
  "use strict";

  var racine = document.querySelector("[data-livre]");
  if (!racine) return;

  var livre = racine.querySelector(".livre");
  var prec = racine.querySelector(".volume__bouton--prec");
  var suiv = racine.querySelector(".volume__bouton--suiv");
  var legende = racine.querySelector(".volume__legende");
  var compteur = racine.querySelector(".livre__compteur");
  var large = window.matchMedia("(min-width: 700px)");
  var reduit = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var faces = [];       /* toutes les pages dans l'ordre : couverture, (texte, photos)×n, papier, quatrième */
  var feuilles = [];    /* éléments .feuille */
  var double = true;    /* mode double page ou page seule */
  var t = 0;            /* nombre de feuilles tournées (double) ou numéro de page (seule) */
  var fond = null;      /* page fixe de droite (double page) */
  var drag = null;

  function el(nom, classe, texte) {
    var e = document.createElement(nom);
    if (classe) e.className = classe;
    if (texte) e.textContent = texte;
    return e;
  }

  /* ---------- contenu d'une page ---------- */
  function pageImage(f) {
    var p = el("div", "page page--couverture");
    var img = el("img");
    img.src = f.img; img.alt = f.alt || ""; img.decoding = "async"; img.draggable = false;
    p.appendChild(img);
    return p;
  }
  function pageTexte(f, numero) {
    var p = el("div", "page page--texte");
    var o = f.oeuvre;
    if (o.titre) p.appendChild(el("h3", "page__titre", o.titre));
    var corps = el("div", "page__texte");
    if (o.texte && o.texte.length) {
      o.texte.forEach(function (ligne) { corps.appendChild(el("p", "", ligne)); });
    } else {
      corps.appendChild(el("p", "page__vide", "Le texte de cette page arrive bientôt."));
    }
    p.appendChild(corps);
    p.appendChild(el("span", "page__numero", String(numero)));
    return p;
  }
  function pagePhotos(f, numero) {
    var p = el("div", "page page--photos page--photos-" + Math.min(f.oeuvre.photos.length, 4));
    f.oeuvre.photos.slice(0, 4).forEach(function (ph) {
      var fig = el("figure", "page__photo");
      var img = el("img");
      img.src = ph.src; img.alt = ph.alt || ("Photo : " + f.oeuvre.titre); img.decoding = "async"; img.draggable = false;
      fig.appendChild(img);
      p.appendChild(fig);
    });
    if (f.oeuvre.date) p.appendChild(el("span", "page__date", f.oeuvre.date));
    p.appendChild(el("span", "page__numero", String(numero)));
    return p;
  }
  function pagePapier() {
    var p = el("div", "page page--papier");
    p.appendChild(el("span", "page__ornement", "❦"));
    return p;
  }
  function creerPage(i) {
    var f = faces[i];
    var page = f.type === "couverture" || f.type === "quatrieme" ? pageImage(f)
      : f.type === "texte" ? pageTexte(f, i)
      : f.type === "photos" ? pagePhotos(f, i)
      : pagePapier();
    return page;
  }

  /* ---------- construction ---------- */
  function construire() {
    livre.textContent = "";
    feuilles = []; fond = null;
    double = large.matches;
    livre.classList.toggle("livre--double", double);
    livre.classList.toggle("livre--seule", !double);
    var n = faces.length;
    var nb = double ? (n - 1) / 2 : n;
    if (double) {
      fond = el("div", "livre__fond");
      fond.appendChild(creerPage(n - 1));
      livre.appendChild(fond);
    }
    for (var j = 0; j < (double ? nb : n); j++) {
      var f = el("div", "feuille");
      var avant = el("div", "face face--avant");
      avant.appendChild(creerPage(double ? 2 * j : j));
      avant.appendChild(el("span", "face__ombre"));
      f.appendChild(avant);
      if (double) {
        var arriere = el("div", "face face--arriere");
        arriere.appendChild(creerPage(2 * j + 1));
        arriere.appendChild(el("span", "face__ombre"));
        f.appendChild(arriere);
      }
      livre.appendChild(f);
      feuilles.push(f);
    }
    afficher(false);
    ajuster();
  }

  /* réduit la taille du texte jusqu'à ce qu'il tienne dans la page */
  function ajuster() {
    livre.querySelectorAll(".page__texte").forEach(function (c) {
      var taille = 1.2;
      c.style.fontSize = taille + "rem";
      while (c.scrollHeight > c.clientHeight + 1 && taille > 0.72) { taille -= 0.04; c.style.fontSize = taille + "rem"; }
    });
  }

  /* ---------- affichage de l'état ---------- */
  function maxT() { return double ? feuilles.length : faces.length - 1; }

  /* classes (feuilles tournées ou non), ordre d'empilement, position du livre */
  function majFeuilles() {
    var L = feuilles.length;
    feuilles.forEach(function (f, j) {
      var tournee = j < t;
      f.classList.toggle("est-tournee", tournee);
      f.style.transform = "";
      f.style.zIndex = tournee ? String(j + 1) : String(L - j + 1);
    });
  }

  function afficher() {
    majFeuilles();
    majInfos();
  }

  /* boutons, légende et compteur */
  function majInfos() {
    livre.classList.toggle("est-ferme-avant", double && t === 0);
    prec.disabled = t <= 0;
    suiv.disabled = t >= maxT();
    var gauche, droite, num;
    if (double) {
      gauche = t > 0 ? 2 * t - 1 : -1; droite = 2 * t;
      num = gauche >= 0 ? "Pages " + gauche + " – " + droite : "Couverture";
      if (droite >= faces.length - 1) num = "Quatrième de couverture";
    } else {
      droite = t; num = t === 0 ? "Couverture" : (t >= faces.length - 1 ? "Quatrième de couverture" : "Page " + t + " / " + (faces.length - 2));
    }
    var f = faces[Math.min(droite, faces.length - 1)], g = gauche >= 0 ? faces[gauche] : null;
    var oeuvre = (f && f.oeuvre) || (g && g.oeuvre);
    legende.textContent = oeuvre ? oeuvre.titre : (t === 0 ? (racine.getAttribute("data-titre") || "Carnet de bord") : "");
    if (compteur) compteur.textContent = num;
  }

  function aller(nouveau) {
    nouveau = Math.max(0, Math.min(maxT(), nouveau));
    if (nouveau === t) return;
    var L = feuilles.length;
    /* la feuille qui bouge passe au premier plan pendant son mouvement */
    var bouge = nouveau > t ? t : t - 1;
    t = nouveau;
    majFeuilles();
    majInfos();
    if (feuilles[bouge]) feuilles[bouge].style.zIndex = String(L + 5);
    window.setTimeout(majFeuilles, reduit ? 0 : 950);
  }

  /* ---------- commandes ---------- */
  prec.addEventListener("click", function () { aller(t - 1); });
  suiv.addEventListener("click", function () { aller(t + 1); });
  livre.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); aller(t + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); aller(t - 1); }
    else if (e.key === "Home") { e.preventDefault(); aller(0); }
    else if (e.key === "End") { e.preventDefault(); aller(maxT()); }
  });

  /* glisser : la feuille suit le doigt ; clic/tap sur un bord : tourne la page */
  livre.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    var r = livre.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, r: r, bouge: -1, sens: 0, p: 0, id: e.pointerId };
  });
  livre.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (drag.sens === 0) {
      if (Math.abs(dx) < 8) return;
      var sens = dx < 0 ? 1 : -1; /* vers la gauche : page suivante */
      var cible = sens > 0 ? t : t - 1;
      if ((sens > 0 && t >= maxT()) || (sens < 0 && t <= 0) || !feuilles[cible]) { drag = null; return; }
      drag.sens = sens; drag.bouge = cible;
      livre.classList.add("est-glisse");
      feuilles[cible].style.zIndex = String(feuilles.length + 5);
      try { livre.setPointerCapture(drag.id); } catch (x) { /* ignoré */ }
    }
    var largeur = (double ? drag.r.width / 2 : drag.r.width) * 0.9;
    var p = Math.max(0, Math.min(1, Math.abs(dx) / largeur));
    if (drag.sens < 0) p = 1 - Math.max(0, Math.min(1, dx / largeur));
    drag.p = drag.sens > 0 ? p : p;
    var angle = -180 * (drag.sens > 0 ? p : p);
    var f = feuilles[drag.bouge];
    f.style.transform = "rotateY(" + angle + "deg)";
    f.style.setProperty("--ombre", String(Math.sin(Math.PI * (angle / -180)) * 0.55));
  });
  function fin(e) {
    if (!drag) return;
    var d = drag; drag = null;
    livre.classList.remove("est-glisse");
    if (d.sens === 0) { /* simple clic : bord gauche / droit */
      if (e.type === "pointerup") {
        var x = e.clientX - d.r.left, part = x / d.r.width;
        if (part > 0.55) aller(t + 1); else if (part < 0.45) aller(t - 1);
      }
      return;
    }
    var avance = d.sens > 0 ? d.p > 0.3 : d.p < 0.7;
    var f = feuilles[d.bouge];
    var cible = d.sens > 0 ? (avance ? -180 : 0) : (avance ? 0 : -180);
    f.style.removeProperty("--ombre");
    f.style.transform = "rotateY(" + cible + "deg)"; /* la page termine son mouvement depuis l'endroit où on l'a lâchée */
    if (avance) { t += d.sens; majInfos(); }
    window.setTimeout(majFeuilles, reduit ? 0 : 950);
  }
  livre.addEventListener("pointerup", fin);
  livre.addEventListener("pointercancel", fin);

  /* changement d'écran (rotation, redimensionnement) : on garde la page courante */
  function changerMode() {
    if (!faces.length || large.matches === double) return;
    var visible = double ? (t === 0 ? 0 : 2 * t) : t;
    t = large.matches ? Math.ceil(visible / 2) : visible;
    construire();
  }
  if (large.addEventListener) large.addEventListener("change", changerMode); else large.addListener(changerMode);
  window.addEventListener("resize", function () { if (faces.length) ajuster(); });

  /* ---------- chargement ---------- */
  function charger(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }
  function initialiser(donnees, liste) {
    var adresses = {};
    (liste.photos || []).forEach(function (p) {
      var nom = decodeURIComponent(p.src.split("?")[0].split("/").pop());
      adresses[nom] = p.src;
    });
    function url(nom) { return adresses[nom] || ("/media/photos/album/" + nom); }
    racine.setAttribute("data-titre", donnees.titre || "Carnet de bord");
    faces.push({ type: "couverture", img: url(donnees.couverture), alt: donnees.couvertureAlt });
    (donnees.oeuvres || []).forEach(function (o) {
      var photos = (o.photos || []).map(function (p) {
        return typeof p === "string" ? { src: url(p) } : { src: url(p.fichier), alt: p.alt };
      });
      var oeuvre = { titre: o.titre || "", date: o.date || "", texte: o.texte || [], photos: photos };
      faces.push({ type: "texte", oeuvre: oeuvre });
      faces.push({ type: "photos", oeuvre: oeuvre });
    });
    faces.push({ type: "papier" });
    faces.push({ type: "quatrieme", img: url(donnees.quatrieme), alt: donnees.quatriemeAlt });
    racine.classList.add("est-pret");
    construire();
  }

  var demarre = false;
  function demarrer() {
    if (demarre) return; demarre = true;
    Promise.all([charger(racine.getAttribute("data-album")), charger(racine.getAttribute("data-source"))])
      .then(function (r) { initialiser(r[0], r[1]); })
      .catch(function () {
        legende.textContent = "L'album n'a pas pu être chargé. Merci de réessayer plus tard.";
        prec.hidden = true; suiv.hidden = true;
      });
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entrees) { if (entrees[0].isIntersecting) demarrer(); }, { rootMargin: "300px 0px" }).observe(racine);
  } else { demarrer(); }
})();

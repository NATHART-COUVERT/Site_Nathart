/* Nathart — volumes 3D de la galerie : un cube (6 faces) et un anneau (autant de panneaux que de photos).
   Les images viennent de /media/photos/cube/photos.json et /media/photos/anneau/photos.json,
   mélangées à chaque visite. Rotation automatique (coupée si le visiteur préfère moins de mouvement),
   glisser à la souris ou au doigt, boutons, flèches du clavier. Aucune dépendance. */
(function () {
  "use strict";

  var cubes = document.querySelectorAll("[data-cube]");
  var anneaux = document.querySelectorAll("[data-anneau]");
  if (!cubes.length && !anneaux.length) return;

  var reduit = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- utilitaires ---------- */
  function melanger(l) {
    for (var i = l.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = l[i]; l[i] = l[j]; l[j] = t;
    }
    return l;
  }
  function modulo(a, n) { return ((a % n) + n) % n; }
  function aimanter(courant, pose) { return pose + 360 * Math.round((courant - pose) / 360); }
  function facile(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function titreComplet(p) { return p.vue ? p.titre + " (" + p.vue + ")" : p.titre; }

  function charger(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (d) { return melanger((d.photos || []).slice()); });
  }

  /* anime des valeurs numériques de `depart` vers `arrivee` ; renvoie un objet avec stop() */
  function animer(depart, arrivee, duree, maj, fin) {
    if (reduit || duree <= 0) { maj(arrivee); if (fin) fin(); return { stop: function () {} }; }
    var debut = null, actif = true;
    function pas(t) {
      if (!actif) return;
      if (debut === null) debut = t;
      var k = Math.min(1, (t - debut) / duree), e = facile(k);
      maj(depart.map(function (d, i) { return d + (arrivee[i] - d) * e; }));
      if (k < 1) window.requestAnimationFrame(pas); else if (fin) fin();
    }
    window.requestAnimationFrame(pas);
    return { stop: function () { actif = false; } };
  }

  /* n'initialise un volume que lorsqu'il approche de l'écran ; prévient quand il entre/sort de l'écran */
  function surveiller(el, aEntree, aSortie) {
    if (!("IntersectionObserver" in window)) { aEntree(); return; }
    new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { if (e.isIntersecting) aEntree(); else aSortie(); });
    }, { rootMargin: "300px 0px" }).observe(el);
  }

  function message(racine, texte) {
    var l = racine.querySelector(".volume__legende");
    if (l) l.textContent = texte;
    racine.querySelectorAll(".volume__bouton").forEach(function (b) { b.hidden = true; });
  }

  /* ======================= CUBE ======================= */
  function initCube(racine) {
    var scene = racine.querySelector(".volume__scene");
    var cube = racine.querySelector(".cube");
    var legende = racine.querySelector(".volume__legende");
    var prec = racine.querySelector(".volume__bouton--prec");
    var suiv = racine.querySelector(".volume__bouton--suiv");

    /* face i vient devant avec la rotation POSES[i] ; NORMALES[i] sert à trouver la face de devant */
    var NOMS = ["avant", "droite", "arriere", "gauche", "haut", "bas"];
    var POSES = [[0, 0], [0, -90], [0, -180], [0, -270], [-90, 0], [90, 0]];
    var NORMALES = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, -1, 0], [0, 1, 0]];

    var photos = [], faces = [];
    var rx = 0, ry = 0, courante = -1, anim = null, minuteur = null, drag = null;
    var survol = false, focus = false, hors = true, demarre = false;

    function appliquer() {
      cube.style.transform = "translateZ(calc(var(--cote) / -2)) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    }
    function faceDevant() {
      var a = rx * Math.PI / 180, b = ry * Math.PI / 180, meilleure = 0, zmax = -2;
      NORMALES.forEach(function (n, i) {
        var z1 = -n[0] * Math.sin(b) + n[2] * Math.cos(b);
        var z2 = n[1] * Math.sin(a) + z1 * Math.cos(a);
        if (z2 > zmax) { zmax = z2; meilleure = i; }
      });
      return meilleure;
    }
    function majFace() {
      var f = faceDevant();
      if (f === courante) return;
      courante = f;
      var p = photos[f % photos.length];
      legende.textContent = titreComplet(p);
      faces.forEach(function (el, i) { el.setAttribute("aria-hidden", i === f ? "false" : "true"); });
    }
    function arreter() { if (anim) { anim.stop(); anim = null; } }
    function aller(f) {
      arreter();
      var pose = POSES[f];
      var cible = [aimanter(rx, pose[0]), aimanter(ry, pose[1])];
      anim = animer([rx, ry], cible, 1200, function (v) { rx = v[0]; ry = v[1]; appliquer(); majFace(); },
        function () { anim = null; majFace(); programmer(); });
    }
    function programmer() {
      window.clearTimeout(minuteur);
      if (reduit || survol || focus || hors || drag) return;
      minuteur = window.setTimeout(function () { aller(modulo(courante + 1, 6)); }, 4800);
    }

    function construire() {
      cube.textContent = "";
      for (var i = 0; i < 6; i++) {
        var p = photos[i % photos.length];
        var face = document.createElement("div");
        face.className = "cube__face cube__face--" + NOMS[i];
        var img = document.createElement("img");
        img.src = p.src; img.alt = p.alt || "Œuvre de Nathart : " + titreComplet(p);
        img.decoding = "async"; img.draggable = false;
        face.appendChild(img); cube.appendChild(face); faces.push(face);
      }
      racine.classList.add("est-pret");
      appliquer(); majFace();
    }

    /* commandes */
    prec.addEventListener("click", function () { aller(modulo(courante - 1, 6)); });
    suiv.addEventListener("click", function () { aller(modulo(courante + 1, 6)); });
    scene.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); aller(modulo(courante - 1, 6)); }
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); aller(modulo(courante + 1, 6)); }
    });
    scene.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest && e.target.closest("button")) return;
      arreter(); window.clearTimeout(minuteur);
      drag = { x: e.clientX, y: e.clientY, rx: rx, ry: ry, tactile: e.pointerType !== "mouse" };
      scene.classList.add("est-glisse");
      try { scene.setPointerCapture(e.pointerId); } catch (x) { /* ignoré */ }
    });
    scene.addEventListener("pointermove", function (e) {
      if (!drag) return;
      ry = drag.ry + (e.clientX - drag.x) * 0.45;
      if (!drag.tactile) rx = drag.rx - (e.clientY - drag.y) * 0.45; /* au doigt : le vertical fait défiler la page */
      appliquer(); majFace();
    });
    function lacher() {
      if (!drag) return;
      drag = null; scene.classList.remove("est-glisse");
      aller(faceDevant()); /* se cale sur la face la plus proche */
    }
    scene.addEventListener("pointerup", lacher);
    scene.addEventListener("pointercancel", lacher);
    racine.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { survol = true; window.clearTimeout(minuteur); } });
    racine.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { survol = false; programmer(); } });
    racine.addEventListener("focusin", function () { focus = true; window.clearTimeout(minuteur); });
    racine.addEventListener("focusout", function () { focus = false; programmer(); });

    surveiller(racine, function () {
      hors = false;
      if (!demarre) {
        demarre = true;
        charger(racine.getAttribute("data-source")).then(function (l) {
          photos = l;
          if (!photos.length) { message(racine, "Les créations arrivent bientôt."); return; }
          construire(); programmer();
        }).catch(function () { message(racine, "Le cube n'a pas pu être chargé. Merci de réessayer plus tard."); });
      } else { programmer(); }
    }, function () { hors = true; window.clearTimeout(minuteur); });
  }

  /* ======================= ANNEAU ======================= */
  function initAnneau(racine) {
    var scene = racine.querySelector(".volume__scene");
    var anneau = racine.querySelector(".anneau");
    var legende = racine.querySelector(".volume__legende");
    var prec = racine.querySelector(".volume__bouton--prec");
    var suiv = racine.querySelector(".volume__bouton--suiv");

    var VITESSE = 7; /* degrés par seconde (≈ 4 s par œuvre pour 12 panneaux) */
    var photos = [], panneaux = [], N = 0, pas = 0;
    var angle = 0, courante = -1, anim = null, drag = null, inertie = 0, reprise = 0;
    var survol = false, focus = false, hors = true, demarre = false, boucle = false, dernier = 0;

    function appliquer() {
      anneau.style.transform = "translateZ(calc(var(--larg) * var(--facteur) * -1)) rotateY(" + angle + "deg)";
    }
    function majFace() {
      var f = modulo(Math.round(-angle / pas), N);
      if (f === courante) return;
      courante = f;
      legende.textContent = titreComplet(photos[f]);
      panneaux.forEach(function (el, i) { el.setAttribute("aria-hidden", i === f ? "false" : "true"); });
    }
    function arreter() { if (anim) { anim.stop(); anim = null; } }
    function pause() { return survol || focus || drag || anim || performance.now() < reprise; }

    function image(t) {
      if (!boucle) return;
      var dt = Math.min(0.1, (t - dernier) / 1000); dernier = t;
      if (!drag && !anim) {
        if (Math.abs(inertie) > 0.5) { angle += inertie * dt; inertie *= Math.pow(0.04, dt); }
        else if (!reduit && !pause()) angle -= VITESSE * dt;
        appliquer(); majFace();
      }
      window.requestAnimationFrame(image);
    }
    function demarrerBoucle() { if (boucle || !N) return; boucle = true; dernier = performance.now(); window.requestAnimationFrame(image); }
    function arreterBoucle() { boucle = false; }

    function pasDe(sens) { /* sens = +1 : panneau suivant, -1 : précédent */
      arreter(); inertie = 0;
      var cible = (Math.round(angle / pas) - sens) * pas;
      anim = animer([angle], [cible], 900, function (v) { angle = v[0]; appliquer(); majFace(); },
        function () { anim = null; reprise = performance.now() + 3000; });
    }

    function construire() {
      N = photos.length; pas = 360 / N;
      /* rayon = moitié de la largeur d'un panneau / tan(180°/N), avec un petit jeu entre les panneaux */
      racine.style.setProperty("--facteur", (1.08 / (2 * Math.tan(Math.PI / Math.max(N, 3)))).toFixed(4));
      anneau.textContent = "";
      photos.forEach(function (p, i) {
        var el = document.createElement("div");
        el.className = "anneau__panneau";
        el.style.setProperty("--angle-p", (i * pas) + "deg");
        var img = document.createElement("img");
        img.src = p.src; img.alt = p.alt || "Œuvre de Nathart : " + titreComplet(p);
        img.decoding = "async"; img.draggable = false;
        el.appendChild(img); anneau.appendChild(el); panneaux.push(el);
      });
      racine.classList.add("est-pret");
      if (N < 2) { prec.hidden = true; suiv.hidden = true; }
      appliquer(); majFace();
    }

    prec.addEventListener("click", function () { pasDe(-1); });
    suiv.addEventListener("click", function () { pasDe(1); });
    scene.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); pasDe(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); pasDe(1); }
    });
    var dernierX = 0, dernierT = 0, vitesseDrag = 0;
    scene.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest && e.target.closest("button")) return;
      arreter(); inertie = 0;
      drag = { x: e.clientX, angle: angle };
      dernierX = e.clientX; dernierT = performance.now(); vitesseDrag = 0;
      scene.classList.add("est-glisse");
      try { scene.setPointerCapture(e.pointerId); } catch (x) { /* ignoré */ }
    });
    scene.addEventListener("pointermove", function (e) {
      if (!drag) return;
      angle = drag.angle + (e.clientX - drag.x) * 0.3;
      var t = performance.now();
      if (t > dernierT) vitesseDrag = ((e.clientX - dernierX) * 0.3) / ((t - dernierT) / 1000);
      dernierX = e.clientX; dernierT = t;
      appliquer(); majFace();
    });
    function lacher() {
      if (!drag) return;
      drag = null; scene.classList.remove("est-glisse");
      inertie = Math.max(-240, Math.min(240, vitesseDrag));
      reprise = performance.now() + 2500;
    }
    scene.addEventListener("pointerup", lacher);
    scene.addEventListener("pointercancel", lacher);
    racine.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") survol = true; });
    racine.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { survol = false; reprise = performance.now() + 800; } });
    racine.addEventListener("focusin", function () { focus = true; });
    racine.addEventListener("focusout", function () { focus = false; reprise = performance.now() + 800; });

    surveiller(racine, function () {
      hors = false;
      if (!demarre) {
        demarre = true;
        charger(racine.getAttribute("data-source")).then(function (l) {
          photos = l;
          if (!photos.length) { message(racine, "Les créations arrivent bientôt."); return; }
          construire(); demarrerBoucle();
        }).catch(function () { message(racine, "L'anneau n'a pas pu être chargé. Merci de réessayer plus tard."); });
      } else { demarrerBoucle(); }
    }, function () { hors = true; arreterBoucle(); });
  }

  cubes.forEach(initCube);
  anneaux.forEach(initAnneau);
})();

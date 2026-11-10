/* Nathart — menu mobile, sous-menu et formulaire de contact. Aucune dépendance. */
(function () {
  "use strict";

  /* ----- Menu mobile ----- */
  var nav = document.querySelector(".nav");
  var bouton = document.querySelector(".nav__bouton");
  if (nav && bouton) {
    bouton.addEventListener("click", function () {
      var ouvert = nav.classList.toggle("est-ouvert");
      bouton.setAttribute("aria-expanded", String(ouvert));
    });
  }

  /* ----- Sous-menu « Mes Univers » (clavier, tactile) ----- */
  document.querySelectorAll(".nav__item--sous").forEach(function (item) {
    var b = item.querySelector(".nav__sous-bouton");
    if (!b) return;
    b.addEventListener("click", function () {
      var ouvert = item.classList.toggle("est-ouvert");
      b.setAttribute("aria-expanded", String(ouvert));
    });
    item.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && item.classList.contains("est-ouvert")) {
        item.classList.remove("est-ouvert");
        b.setAttribute("aria-expanded", "false");
        b.focus();
      }
    });
  });

  /* ----- Formulaire de contact (envoi en JSON vers le service de formulaire) ----- */
  var form = document.querySelector("form[data-formulaire]");
  if (form && window.fetch) {
    var etat = form.querySelector(".formulaire__etat");
    var envoyer = form.querySelector("button[type=submit]");
    var dire = function (texte, classe) {
      etat.textContent = texte;
      etat.className = "formulaire__etat " + (classe || "");
    };
    form.addEventListener("submit", function (e) {
      if (/REMPLACER/.test(form.action)) {
        e.preventDefault();
        dire("Le formulaire n'est pas encore relié à un service d'envoi.", "formulaire__etat--erreur");
        return;
      }
      e.preventDefault();
      envoyer.disabled = true;
      dire("Envoi en cours…");
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          form.reset();
          dire("Merci, votre message a bien été envoyé. Je vous réponds au plus vite.", "formulaire__etat--ok");
        })
        .catch(function () {
          dire("L'envoi a échoué. Merci de réessayer dans un instant.", "formulaire__etat--erreur");
        })
        .then(function () { envoyer.disabled = false; });
    });
  }
})();

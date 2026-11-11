/* Nathart — protection dissuasive du contenu.
   Bloque le menu clic droit sur les images et vidéos, le glisser-déposer des images et la copie de texte.
   Ce n'est qu'un frein : voir le README (« Protection du contenu »). Les champs de saisie et les éléments
   marqués .copiable (adresse e-mail des mentions légales) restent utilisables normalement. */
(function () {
  "use strict";

  var MESSAGE = "© Nathart — Ce contenu est protégé. Pour toute demande de reproduction, merci de me contacter via le formulaire du site.";

  function saisie(el) {
    return !!(el && el.closest && el.closest("input, textarea, select, [contenteditable], .copiable"));
  }

  /* clic droit / appui long : bloqué sur les images et les vidéos (le clic droit reste possible sur les liens et le texte) */
  document.addEventListener("contextmenu", function (e) {
    var t = e.target;
    if (saisie(t)) return;
    if (t && t.closest && t.closest("img, video, picture, .carrousel, .volume, .cube, .anneau")) e.preventDefault();
  });

  /* glisser une image vers le bureau ou un autre onglet */
  document.addEventListener("dragstart", function (e) {
    if (e.target && (e.target.tagName === "IMG" || e.target.tagName === "VIDEO")) e.preventDefault();
  });

  /* copier / couper : rien n'est copié (sauf dans les champs de saisie) ; un message de droits est mis à la place */
  ["copy", "cut"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (saisie(e.target) || saisie(document.activeElement)) return;
      e.preventDefault();
      if (e.clipboardData) e.clipboardData.setData("text/plain", MESSAGE);
    });
  });
})();

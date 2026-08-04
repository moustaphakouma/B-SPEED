/* =========================================================
   B-SPEED — Script principal
   ========================================================= */

/* ---- Configuration centrale : à modifier ici uniquement ---- */
const BSPEED = {
  telephone: '+242 06 961 91 81',
  telephone2: '+242 05 049 03 37',
  whatsapp: '242050490337',        // numéro WhatsApp au format international sans "+"
  email: 'contact@bspeed.cg',      // À CONFIRMER avec le client
  ville: 'Brazzaville, Congo',
  tarifs: {
    standard: { nom: 'Standard', prix: 750 },
    express:  { nom: 'Express',  prix: 1000 },
    turbo:    { nom: 'Turbo',    prix: 1500 }
  }
};

/* ---- Échappement : protection contre l'injection HTML (XSS) ---- */
function securiser(txt){
  return String(txt)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ---- Menu mobile ---- */
(function menuMobile(){
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if(!burger || !nav) return;
  burger.addEventListener('click', () => {
    const ouvert = nav.classList.toggle('ouvert');
    burger.setAttribute('aria-expanded', ouvert);
    burger.innerHTML = ouvert ? '&times;' : '&#9776;';
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('ouvert');
    burger.innerHTML = '&#9776;';
    burger.setAttribute('aria-expanded','false');
  }));
})();

/* ---- Header opaque au défilement ---- */
(function headerScroll(){
  const header = document.querySelector('.site-header');
  if(!header || document.body.classList.contains('page-interne')) return;
  const maj = () => header.classList.toggle('solide', window.scrollY > 60);
  maj();
  addEventListener('scroll', maj, { passive:true });
})();

/* ---- Apparition au défilement ---- */
(function reveal(){
  const els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  if(!('IntersectionObserver' in window)){
    els.forEach(e => e.classList.add('vu')); return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('vu'); io.unobserve(e.target); }
    });
  }, { threshold:.12, rootMargin:'0px 0px -40px 0px' });
  els.forEach(e => io.observe(e));
})();

/* ---- Année automatique dans le pied de page ---- */
document.querySelectorAll('[data-annee]').forEach(el => {
  el.textContent = new Date().getFullYear();
});

/* =========================================================
   FORMULAIRE DE COMMANDE
   Le formulaire construit un message structuré et l'envoie
   directement sur le WhatsApp de B-SPEED.
   → Aucun serveur nécessaire, fonctionne immédiatement.
   → Pour recevoir aussi par e-mail plus tard : voir la note
     "FORMSPREE" en bas de ce fichier.
   ========================================================= */
(function formulaireCommande(){
  const form = document.getElementById('form-commande');
  if(!form) return;

  const message = document.getElementById('form-message');
  const champsObligatoires = ['nom','prenom','telephone','depart','arrivee','colis'];

  /* Validation d'un champ */
  function validerChamp(input){
    const bloc = input.closest('.champ');
    const err = bloc ? bloc.querySelector('.erreur-msg') : null;
    let ok = true, msg = '';

    if(input.required && !input.value.trim()){
      ok = false; msg = 'Ce champ est obligatoire.';
    } else if(input.id === 'telephone' && input.value.trim()){
      // Numéro congolais : 9 chiffres, éventuellement avec +242
      const chiffres = input.value.replace(/[^\d]/g,'');
      if(chiffres.length < 9){ ok = false; msg = 'Entrez un numéro valide (ex. 06 961 91 81).'; }
    }

    input.classList.toggle('invalide', !ok);
    if(err){ err.textContent = msg; err.classList.toggle('visible', !ok); }
    return ok;
  }

  form.querySelectorAll('input,select,textarea').forEach(input => {
    input.addEventListener('blur', () => validerChamp(input));
    input.addEventListener('input', () => {
      if(input.classList.contains('invalide')) validerChamp(input);
    });
  });

  /* Envoi */
  const bouton = document.getElementById('btn-envoyer');
  bouton.addEventListener('click', () => {
    let valide = true;
    champsObligatoires.forEach(id => {
      const el = document.getElementById(id);
      if(el && !validerChamp(el)) valide = false;
    });

    if(!valide){
      message.className = 'form-message ko';
      message.textContent = 'Merci de corriger les champs indiqués en rouge avant d\'envoyer.';
      message.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    const v = id => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };
    const vitesseChoisie = form.querySelector('input[name="vitesse"]:checked');
    const cle = vitesseChoisie ? vitesseChoisie.value : 'standard';
    const t = BSPEED.tarifs[cle];

    /* Numéro de référence simple, lisible par le client et l'équipe */
    const d = new Date();
    const ref = 'BS-' + d.getFullYear().toString().slice(2)
      + String(d.getMonth()+1).padStart(2,'0')
      + String(d.getDate()).padStart(2,'0') + '-'
      + String(Math.floor(Math.random()*900)+100);

    const lignes = [
      '*NOUVELLE COMMANDE B-SPEED*',
      'Réf. ' + ref,
      '',
      '*Client*',
      '• Nom : ' + v('prenom') + ' ' + v('nom'),
      '• Téléphone : ' + v('telephone'),
      '',
      '*Trajet*',
      '• Récupération : ' + v('depart'),
      '• Livraison : ' + v('arrivee'),
      '',
      '*Colis*',
      '• Description : ' + v('colis'),
      '• Poids estimé : ' + (v('poids') || 'non précisé'),
      '',
      '*Formule*',
      '• ' + t.nom + ' — à partir de ' + t.prix.toLocaleString('fr-FR') + ' FCFA',
      '• Date souhaitée : ' + (v('date') || 'dès que possible'),
      '• Heure souhaitée : ' + (v('heure') || 'à convenir')
    ];

    if(v('instructions')){
      lignes.push('', '*Instructions*', v('instructions'));
    }

    const url = 'https://wa.me/' + BSPEED.whatsapp
      + '?text=' + encodeURIComponent(lignes.join('\n'));

    window.open(url, '_blank', 'noopener');

    message.className = 'form-message ok';
    message.innerHTML = '<strong>Commande prête à être envoyée.</strong><br>'
      + 'WhatsApp s\'est ouvert avec votre commande (réf. <strong>' + securiser(ref) + '</strong>). '
      + 'Appuyez sur envoyer pour la transmettre à notre équipe. '
      + 'Nous vous rappelons pour confirmer sous quelques minutes.';
    message.scrollIntoView({ behavior:'smooth', block:'center' });
  });

  /* Récapitulatif en direct */
  const recapPrix = document.getElementById('recap-prix');
  const recapFormule = document.getElementById('recap-formule');
  form.querySelectorAll('input[name="vitesse"]').forEach(r => {
    r.addEventListener('change', () => {
      const t = BSPEED.tarifs[r.value];
      if(recapFormule) recapFormule.textContent = t.nom;
      if(recapPrix) recapPrix.textContent = 'à partir de ' + t.prix.toLocaleString('fr-FR') + ' FCFA';
    });
  });
})();

/* =========================================================
   FORMULAIRE DE CONTACT (page contact)
   ========================================================= */
(function formulaireContact(){
  const form = document.getElementById('form-contact');
  if(!form) return;
  const message = document.getElementById('contact-message');

  document.getElementById('btn-contact').addEventListener('click', () => {
    const nom = document.getElementById('c-nom');
    const tel = document.getElementById('c-tel');
    const txt = document.getElementById('c-message');
    let ok = true;

    [nom, tel, txt].forEach(el => {
      const vide = !el.value.trim();
      el.classList.toggle('invalide', vide);
      const err = el.closest('.champ').querySelector('.erreur-msg');
      if(err){ err.classList.toggle('visible', vide); }
      if(vide) ok = false;
    });

    if(!ok){
      message.className = 'form-message ko';
      message.textContent = 'Merci de remplir les champs obligatoires.';
      return;
    }

    const corps = [
      '*Message depuis le site B-SPEED*',
      '',
      '• Nom : ' + nom.value.trim(),
      '• Téléphone : ' + tel.value.trim(),
      '• Sujet : ' + (document.getElementById('c-sujet').value || 'Non précisé'),
      '',
      txt.value.trim()
    ].join('\n');

    window.open('https://wa.me/' + BSPEED.whatsapp + '?text=' + encodeURIComponent(corps),
      '_blank', 'noopener');

    message.className = 'form-message ok';
    message.textContent = 'WhatsApp s\'est ouvert avec votre message. Appuyez sur envoyer, nous vous répondons rapidement.';
  });
})();

/* =========================================================
   NOTE POUR PLUS TARD — recevoir aussi les commandes par e-mail
   ---------------------------------------------------------
   Créer un formulaire gratuit sur https://formspree.io
   puis ajouter dans le HTML du formulaire :
       action="https://formspree.io/f/VOTRE_ID" method="POST"
   et remplacer le bouton par un <button type="submit">.
   L'architecture actuelle permet de le brancher sans refaire le site.

   ÉVOLUTIONS PRÉVUES (phase 2, nécessite un serveur) :
   suivi des colis, espace client, espace livreur, tableau de bord
   administrateur, notifications SMS, calcul automatique des frais.
   ========================================================= */

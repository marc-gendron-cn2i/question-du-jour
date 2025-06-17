// app.js
// Chargement initial, DOMContentLoaded, etc.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('pollForm');
  const siteEl = document.getElementById('site');
  const dateDebutEl = document.getElementById('dateDebut');
  const heureDebutEl = document.getElementById('heureDebut');
  const dateFinEl = document.getElementById('dateFin');
  const heureFinEl = document.getElementById('heureFin');
  const questionEl = document.getElementById('question');
  const optsCont = document.getElementById('optionsContainer');
  const addOptBtn = document.getElementById('addOption');
  const successMsg = document.getElementById('successMessage');

  // Fonction pour ajouter une option
  function addOption(value = '') {
    if (optsCont.children.length >= 8) return;
    const wrapper = document.createElement('div');
    wrapper.classList.add('option-item');
    wrapper.innerHTML = `
      <span class="drag-handle" title="Glisser pour réordonner">☰</span>
      <input type="text" class="option-input" required value="${value}" placeholder="Option">
      <button type="button" class="remove-option">✕</button>
    `;
    optsCont.appendChild(wrapper);
  }

  // Supprimer option
  optsCont.addEventListener('click', e => {
    if (e.target.matches('.remove-option')) {
      if (optsCont.children.length > 2) {
        e.target.closest('.option-item').remove();
      }
    }
  });

  // Ajouter option
  addOptBtn.addEventListener('click', () => addOption());

  // Initialiser toujours 2 options au minimum
  addOption();
  addOption();

  // --- Drag & Drop via SortableJS (global) ---
  new Sortable(optsCont, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'drag-ghost'
  });

  // Fonction de chargement automatique du sondage existant
  async function loadPoll() {
    const site = siteEl.value;
    const date = dateDebutEl.value;
    if (!site || !date) return;
    const pollId = `${site}_${date}`;

    try {
      const res = await fetch(`https://.../poll/${pollId}`, { credentials: 'omit' });
      if (res.status === 404) {
        // pas de sondage: réinitialiser form
        form.reset();
        // dates : dateDebut=demain, dateFin=demain ; garder modifiable dateDebut
      } else if (res.ok) {
        const data = await res.json();
        // si sondage terminé : activer dateDebut seulement
        const now = new Date();
        const end = new Date(data.endDateTime);
        // remplir form
        siteEl.value = data.site;
        dateDebutEl.value = data.pollId.split('_')[1];
        heureDebutEl.value = new Date(data.startDateTime).toISOString().substr(11,5);
        dateFinEl.value = data.pollId.split('_')[1];
        heureFinEl.value = new Date(data.endDateTime).toISOString().substr(11,5);
        questionEl.value = data.question;
        // options
        optsCont.innerHTML = '';
        data.options.forEach(opt => addOption(opt));
        // si sondage terminé, lock tous sauf dateDebut
        if (now > end) {
          [heureDebutEl, dateFinEl, heureFinEl, questionEl, addOptBtn].forEach(el => el.disabled = true);
          optsCont.querySelectorAll('.option-input').forEach(i => i.disabled = true);
        } else {
          // sondage en cours ou futur : tout modifiable
          [heureDebutEl, dateFinEl, heureFinEl, questionEl, addOptBtn].forEach(el => el.disabled = false);
          optsCont.querySelectorAll('.option-input').forEach(i => i.disabled = false);
        }
      }
    } catch (err) {
      console.error('Erreur loadPoll', err);
    }
  }

  // Charger à l'ouverture
  loadPoll();

  // Si on change la dateDebut, recharger immédiatement
  dateDebutEl.addEventListener('change', loadPoll);

  // Soumission du form (createOrUpdate)
  form.addEventListener('submit', async e => {
    e.preventDefault();
    // Validation du nombre d’options
    const opts = Array.from(optsCont.querySelectorAll('.option-input')).map(i => i.value.trim()).filter(v => v);
    if (opts.length < 2) {
      successMsg.textContent = 'Il faut au moins 2 options.';
      return;
    }
    // Construire le payload
    const payload = {
      site: siteEl.value,
      startDateTime: new Date(`${dateDebutEl.value}T${heureDebutEl.value}:00Z`).toISOString(),
      endDateTime: new Date(`${dateFinEl.value}T${heureFinEl.value}:00Z`).toISOString(),
      question: questionEl.value.trim(),
      options: opts
    };
    // Envoi
    try {
      const resp = await fetch(`https://.../poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'omit'
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      successMsg.textContent = 'Sondage créé/mis à jour !';
      setTimeout(() => successMsg.textContent = '', 3000);
      loadPoll();
    } catch (err) {
      successMsg.textContent = `Erreur : ${err.message}`;
    }
  });
});

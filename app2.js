// app.js
const API_BASE = 'https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod';

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

  // Ajout d’une option
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

  // Suppression d’une option (si ≥ 3 restants)
  optsCont.addEventListener('click', e => {
    if (e.target.matches('.remove-option') && optsCont.children.length > 2) {
      e.target.closest('.option-item').remove();
    }
  });

  // Bouton Ajouter
  addOptBtn.addEventListener('click', () => addOption());

  // Au moins 2 options au démarrage
  addOption(); addOption();

  // Drag & Drop
  new Sortable(optsCont, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'drag-ghost'
  });

  // Charge un sondage existant
  async function loadPoll() {
    const site = siteEl.value;
    const date = dateDebutEl.value;
    if (!site || !date) return;
    const pollId = `${site}_${date}`;

    try {
      const res = await fetch(`${API_BASE}/poll/${pollId}`, { credentials: 'omit' });
      if (res.status === 404) {
        // Pas trouvé : formulaire vierge (date de début modifiable)
        form.reset();
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      // Remplissage des champs
      siteEl.value = data.site;
      dateDebutEl.value = data.pollId.split('_')[1];
      heureDebutEl.value = data.startDateTime.substr(11,5);
      dateFinEl.value = data.pollId.split('_')[1];
      heureFinEl.value = data.endDateTime.substr(11,5);
      questionEl.value = data.question;
      optsCont.innerHTML = '';
      data.options.forEach(opt => addOption(opt));

      // Si sondage terminé, lock tout sauf dateDebut
      const now = new Date(), end = new Date(data.endDateTime);
      const toDisable = [heureDebutEl, dateFinEl, heureFinEl, questionEl, addOptBtn];
      optsCont.querySelectorAll('.option-input').forEach(i => toDisable.push(i));
      if (now > end) toDisable.forEach(el => el.disabled = true);
      else          toDisable.forEach(el => el.disabled = false);

    } catch (err) {
      console.error('Erreur loadPoll', err);
    }
  }

  // Chargement initial + à chaque changement de dateDebut
  loadPoll();
  dateDebutEl.addEventListener('change', loadPoll);

  // Soumission du formulaire
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const opts = Array.from(optsCont.querySelectorAll('.option-input'))
                      .map(i => i.value.trim()).filter(v => v);
    if (opts.length < 2) {
      successMsg.textContent = 'Il faut au moins 2 options.';
      return;
    }

    const payload = {
      site: siteEl.value,
      startDateTime: new Date(`${dateDebutEl.value}T${heureDebutEl.value}:00Z`).toISOString(),
      endDateTime:   new Date(`${dateFinEl.value}T${heureFinEl.value}:00Z`).toISOString(),
      question:      questionEl.value.trim(),
      options:       opts
    };

    try {
      const resp = await fetch(`${API_BASE}/poll`, {
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

// app.js
// Assurez-vous d’avoir inclus SortableJS dans votre HTML :
// <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

const form           = document.getElementById('pollForm');
const siteEl         = document.getElementById('site');
const dateDebutEl    = document.getElementById('dateDebut');
const heureDebutEl   = document.getElementById('heureDebut');
const dateFinEl      = document.getElementById('dateFin');
const heureFinEl     = document.getElementById('heureFin');
const questionEl     = document.getElementById('question');
const optionsContainer = document.getElementById('optionsContainer');
const addOptionBtn   = document.getElementById('addOption');
const successMessage = document.getElementById('successMessage');

// Crée une rangée d’option avec poignée de drag et bouton de suppression
function createOptionElement(value = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'option-row';
  wrapper.innerHTML = `
    <span class="drag-handle" title="Réordonner">≡</span>
    <input type="text" class="option-input" value="${value}" placeholder="Option" required>
    <button type="button" class="remove-option" title="Supprimer">✕</button>
  `;
  wrapper.querySelector('.remove-option').addEventListener('click', () => {
    const count = optionsContainer.querySelectorAll('.option-row').length;
    if (count > 2) {
      wrapper.remove();
      updateAddOptionButton();
    }
  });
  return wrapper;
}

function updateAddOptionButton() {
  addOptionBtn.disabled = optionsContainer.children.length >= 8;
}

// Activation du drag & drop
Sortable.create(optionsContainer, {
  handle: '.drag-handle',
  animation: 150
});

addOptionBtn.addEventListener('click', () => {
  if (optionsContainer.children.length < 8) {
    optionsContainer.appendChild(createOptionElement());
    updateAddOptionButton();
  }
});

async function loadExistingPoll() {
  const site = siteEl.value;
  const d    = dateDebutEl.value;
  if (!site || !d) return;
  const pollId = `${site}_${d}`;

  try {
    const resp = await fetch(
      `https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod/poll/${pollId}`,
      { credentials: 'omit' }
    );
    if (resp.status === 404) {
      prepareNewPoll();
      return;
    }
    if (!resp.ok) throw new Error(resp.status);
    const data = await resp.json();

    // Remplissage des champs
    heureDebutEl.value = data.startDateTime.slice(11,16);
    dateFinEl.value    = data.endDateTime.slice(0,10);
    heureFinEl.value   = data.endDateTime.slice(11,16);
    questionEl.value   = data.question;

    // Options
    optionsContainer.innerHTML = '';
    data.options.forEach(opt => {
      optionsContainer.appendChild(createOptionElement(opt));
    });
    updateAddOptionButton();

    // Si sondage terminé → désactive tout sauf dateDebut
    const now = new Date();
    const ended = new Date(data.endDateTime) <= now;
    heureDebutEl.disabled = ended;
    dateFinEl.disabled    = ended;
    heureFinEl.disabled   = ended;
    questionEl.disabled   = ended;
    optionsContainer.querySelectorAll('.option-input')
      .forEach(input => input.disabled = ended);
    addOptionBtn.disabled = ended;

    successMessage.textContent = '';
  } catch (err) {
    console.error('Erreur loadExistingPoll', err);
    prepareNewPoll();
  }
}

function prepareNewPoll() {
  // Vide ou initialise à 2 options
  optionsContainer.innerHTML = '';
  optionsContainer.appendChild(createOptionElement());
  optionsContainer.appendChild(createOptionElement());
  updateAddOptionButton();

  // Tous les champs éditables
  heureDebutEl.disabled = false;
  dateFinEl.disabled    = false;
  heureFinEl.disabled   = false;
  questionEl.disabled   = false;
  questionEl.value      = '';
  successMessage.textContent = '';
}

// Soumission avec prise en compte du pop-up
form.addEventListener('submit', async ev => {
  ev.preventDefault();
  const site    = siteEl.value;
  const dDeb    = dateDebutEl.value;
  const dFin    = dateFinEl.value;
  const hDeb    = heureDebutEl.value;
  const hFin    = heureFinEl.value;
  const question = questionEl.value.trim();
  const options  = Array.from(optionsContainer.querySelectorAll('.option-input'))
                    .map(i => i.value.trim())
                    .filter(v => v);

  if (options.length < 2) {
    successMessage.textContent = 'Veuillez fournir au moins deux options.';
    return;
  }

  const pollId = `${site}_${dDeb}`;
  let votes = new Array(options.length).fill(0);

  // Vérifier s’il existe déjà et si c’est en cours
  try {
    const check = await fetch(
      `https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod/poll/${pollId}`,
      { credentials: 'omit' }
    );
    if (check.ok) {
      const existing = await check.json();
      const now = new Date();
      const end = new Date(existing.endDateTime);
      // Si sondage en cours ET même nombre d’options
      if (now < end && existing.options.length === options.length) {
        const keep = confirm(
          'Ce sondage est encore en cours.\n' +
          'Voulez-vous conserver les votes actuels ? (OK) ou les réinitialiser ? (Annuler)'
        );
        if (keep) {
          votes = existing.votes;
        }
      }
    }
  } catch (_) {
    // pas de sondage existant ou erreur → on part sur votes à zéro
  }

  const payload = {
    pollId,
    site,
    question,
    startDateTime: `${dDeb}T${hDeb}:00Z`,
    endDateTime:   `${dFin}T${hFin}:00Z`,
    options,
    votes
  };

  try {
    const resp = await fetch(
      'https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod/poll',
      {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        credentials: 'omit',
        body: JSON.stringify(payload)
      }
    );
    if (!resp.ok) throw new Error(resp.status);
    successMessage.textContent = 'Sondage créé / mis à jour !';
    setTimeout(loadExistingPoll, 500);
  } catch (err) {
    console.error('Erreur save poll', err);
    successMessage.textContent = `Erreur : ${err.message}`;
  }
});

// Initialisation au démarrage
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const toISO = d => d.toISOString().split('T')[0];

  dateDebutEl.value = toISO(tomorrow);
  dateFinEl.value   = toISO(tomorrow);
  heureDebutEl.value = '06:00';
  heureFinEl.value   = '05:59';

  prepareNewPoll();
  loadExistingPoll();
  dateDebutEl.addEventListener('change', loadExistingPoll);
});

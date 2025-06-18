// app.js
// Assurez-vous d'avoir inclus SortableJS via <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

const form = document.getElementById('pollForm');
const siteEl = document.getElementById('site');
const dateDebutEl = document.getElementById('dateDebut');
const heureDebutEl = document.getElementById('heureDebut');
const dateFinEl = document.getElementById('dateFin');
const heureFinEl = document.getElementById('heureFin');
const questionEl = document.getElementById('question');
const optionsContainer = document.getElementById('optionsContainer');
const addOptionBtn = document.getElementById('addOption');
const successMessage = document.getElementById('successMessage');

// --- Helpers pour création d'une ligne d'option ---
function createOptionElement(value = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'option-row';
  wrapper.innerHTML = `
    <span class="drag-handle" title="Déplacer">≡</span>
    <input type="text" class="option-input" value="${value}" placeholder="Option" required>
    <button type="button" class="remove-option" title="Supprimer">✕</button>
  `;
  // suppression
  wrapper.querySelector('.remove-option').addEventListener('click', () => {
    if (optionsContainer.querySelectorAll('.option-row').length > 2) {
      wrapper.remove();
      updateAddOptionButton();
    }
  });
  return wrapper;
}

// --- Mise à jour de l'état du bouton d'ajout ---
function updateAddOptionButton() {
  const count = optionsContainer.querySelectorAll('.option-row').length;
  addOptionBtn.disabled = count >= 8;
}

// --- Initialisation de SortableJS pour drag & drop ---
Sortable.create(optionsContainer, {
  handle: '.drag-handle',
  animation: 150,
  onEnd: () => {
    // rien de particulier à faire ici ; l'ordre DOM suffit
  }
});

// --- Ajouter une option vierge ---
addOptionBtn.addEventListener('click', () => {
  if (optionsContainer.children.length < 8) {
    optionsContainer.appendChild(createOptionElement());
    updateAddOptionButton();
  }
});

// --- Lecture d'un sondage existant ---
async function loadExistingPoll() {
  const site = siteEl.value;
  const d = dateDebutEl.value;
  if (!site || !d) return;
  const pollId = `${site}_${d}`;
  try {
    const resp = await fetch(`https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod/poll/${pollId}`, {
      credentials: 'omit'
    });
    if (resp.status === 404) {
      prepareNewPoll();
      return;
    }
    if (!resp.ok) throw new Error(`${resp.status}`);
    const data = await resp.json();
    // Charger les champs
    heureDebutEl.value = data.startDateTime.slice(11,16);
    dateFinEl.value   = data.endDateTime.slice(0,10);
    heureFinEl.value  = data.endDateTime.slice(11,16);
    questionEl.value  = data.question;
    // Options
    optionsContainer.innerHTML = '';
    data.options.forEach(opt => {
      optionsContainer.appendChild(createOptionElement(opt));
    });
    updateAddOptionButton();
    // Si sondage terminé, on désactive tout sauf dateDebut
    const now = new Date();
    if (new Date(data.endDateTime) <= now) {
      heureDebutEl.disabled = true;
      dateFinEl.disabled   = true;
      heureFinEl.disabled  = true;
      questionEl.disabled  = true;
      Array.from(optionsContainer.querySelectorAll('.option-input')).forEach(i => i.disabled = true);
      addOptionBtn.disabled = true;
    } else {
      heureDebutEl.disabled = false;
      dateFinEl.disabled   = false;
      heureFinEl.disabled  = false;
      questionEl.disabled  = false;
      Array.from(optionsContainer.querySelectorAll('.option-input')).forEach(i => i.disabled = false);
      updateAddOptionButton();
    }
    successMessage.textContent = '';
  } catch (err) {
    console.error('Erreur loadExistingPoll', err);
    prepareNewPoll();
  }
}

// --- Prépare un nouveau sondage (form vide) ---
function prepareNewPoll() {
  heureDebutEl.disabled = false;
  dateFinEl.disabled   = false;
  heureFinEl.disabled  = false;
  questionEl.disabled  = false;
  questionEl.value     = '';
  // Réinit options à 2 vides
  optionsContainer.innerHTML = '';
  optionsContainer.appendChild(createOptionElement());
  optionsContainer.appendChild(createOptionElement());
  updateAddOptionButton();
  successMessage.textContent = '';
  // garder dateDebut éditable
}

// --- Soumission du formulaire ---
form.addEventListener('submit', async ev => {
  ev.preventDefault();
  const site = siteEl.value;
  const dateDeb = dateDebutEl.value;
  const dateF    = dateFinEl.value;
  const hDeb     = heureDebutEl.value;
  const hFin     = heureFinEl.value;
  const question = questionEl.value.trim();
  const options  = Array.from(optionsContainer.querySelectorAll('.option-input'))
                      .map(i => i.value.trim())
                      .filter(v => v);
  if (options.length < 2) {
    successMessage.textContent = 'Deux options au minimum sont requises.';
    return;
  }
  const payload = {
    pollId: `${site}_${dateDeb}`,
    site,
    question,
    startDateTime: `${dateDeb}T${hDeb}:00Z`,
    endDateTime:   `${dateF}T${hFin}:00Z`,
    options
  };
  try {
    const resp = await fetch('https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod/poll', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload),
      credentials: 'omit'
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    successMessage.textContent = 'Sondage créé / mis à jour !';
    // recharger pour refléter l'état si terminé
    setTimeout(loadExistingPoll, 500);
  } catch (err) {
    console.error('Erreur save poll', err);
    successMessage.textContent = `Erreur: ${err.message}`;
  }
});

// --- Initialisation au chargement de la page ---
window.addEventListener('DOMContentLoaded', () => {
  // date de demain au format YYYY-MM-DD
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const toISO = d => d.toISOString().split('T')[0];
  dateDebutEl.value = toISO(tomorrow);
  dateFinEl.value   = toISO(tomorrow);
  // heures par défaut
  heureDebutEl.value = '06:00';
  heureFinEl.value   = '05:59';
  // deux options vides
  prepareNewPoll();
  // charger s'il existe déjà un sondage pour la date par défaut
  loadExistingPoll();
  // déclencher à chaque changement de dateDebut
  dateDebutEl.addEventListener('change', loadExistingPoll);
});

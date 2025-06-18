// app.js

const API_BASE = 'https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod';

// DOM
const form           = document.getElementById('pollForm');
const siteEl         = document.getElementById('site');
const dateDebutEl    = document.getElementById('dateDebut');
const heureDebutEl   = document.getElementById('heureDebut');
const dateFinEl      = document.getElementById('dateFin');
const heureFinEl     = document.getElementById('heureFin');
const questionEl     = document.getElementById('question');
const optionsContainer = document.getElementById('optionsContainer');
const addOptionBtn   = document.getElementById('addOption');
const messageEl      = document.getElementById('successMessage');

// Messages
function showMessage(txt, type = 'success') {
  messageEl.textContent = txt;
  messageEl.className = type; // success / error / info
}
function clearMessage() {
  showMessage('', '');
}

// Option management
function addOption(value = '') {
  if (optionsContainer.children.length >= 8) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'option-row';
  wrapper.innerHTML = `
    <span class="drag-handle">☰</span>
    <input type="text" name="option" class="option-input" value="${value}" required placeholder="Option ${optionsContainer.children.length + 1}" />
    <button type="button" class="remove-option" title="Supprimer">&times;</button>
  `;
  optionsContainer.appendChild(wrapper);

  // remove
  wrapper.querySelector('.remove-option')
    .addEventListener('click', () => {
      if (optionsContainer.children.length <= 2) return;
      wrapper.remove();
    });

  // enforce min 2
  updateOptionControls();
}

function getOptions() {
  return Array.from(
    optionsContainer.querySelectorAll('input[name="option"]'),
    inp => inp.value.trim()
  ).filter(v => v);
}

// Enable drag&drop
Sortable.create(optionsContainer, {
  handle: '.drag-handle',
  animation: 150
});

// Control buttons enabling/disabling
function updateOptionControls() {
  const rows = optionsContainer.children;
  for (let r of rows) {
    const btn = r.querySelector('.remove-option');
    btn.disabled = (rows.length <= 2);
  }
  addOptionBtn.disabled = (rows.length >= 8);
}

// Clear form for a brand new poll
function clearFormForNewPoll() {
  // dateDebut stays
  heureDebutEl.value = '';
  dateFinEl.value    = dateDebutEl.value;
  heureFinEl.value   = '';
  questionEl.value   = '';
  optionsContainer.innerHTML = '';
  // add 2 blanks
  addOption();
  addOption();
  showMessage('Pas de sondage pour cette date', 'info');
}

// Load existing poll if any
async function loadExistingPoll() {
  clearMessage();
  const site = siteEl.value;
  const date = dateDebutEl.value;
  if (!site || !date) return;

  const pollId = `${site}_${date}`;
  try {
    const resp = await fetch(`${API_BASE}/poll/${pollId}`);
    if (resp.status === 404) {
      clearFormForNewPoll();
      return;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // parse times
    const [sDate, sTimeFull] = data.startDateTime.split('T');
    const [eDate, eTimeFull] = data.endDateTime.split('T');
    dateDebutEl.value  = sDate;
    heureDebutEl.value = sTimeFull.slice(0,5);
    dateFinEl.value    = eDate;
    heureFinEl.value   = eTimeFull.slice(0,5);
    questionEl.value   = data.question;

    optionsContainer.innerHTML = '';
    data.options.forEach(opt => addOption(opt));

    showMessage(`Sondage chargé (${data.options.length} options)`, 'info');

    // disable everything if poll ended
    const now = new Date();
    if (now >= new Date(data.endDateTime)) {
      for (let ctrl of [heureDebutEl, dateFinEl, heureFinEl, questionEl]) {
        ctrl.disabled = true;
      }
      addOptionBtn.disabled = true;
      Array.from(optionsContainer.querySelectorAll('input')).forEach(i => i.disabled = true);
    } else {
      // ensure enabled
      for (let ctrl of [heureDebutEl, dateFinEl, heureFinEl, questionEl]) {
        ctrl.disabled = false;
      }
      addOptionBtn.disabled = false;
      Array.from(optionsContainer.querySelectorAll('input')).forEach(i => i.disabled = false);
    }

    updateOptionControls();
  } catch (err) {
    console.error('loadExistingPoll:', err);
    showMessage('Erreur de chargement du sondage', 'error');
  }
}

// Submit handler
async function handleSubmit(evt) {
  evt.preventDefault();
  clearMessage();

  const site = siteEl.value;
  const dateDeb = dateDebutEl.value;
  const timeDeb = heureDebutEl.value;
  const dateFin = dateFinEl.value;
  const timeFin = heureFinEl.value;
  const question = questionEl.value.trim();
  const options = getOptions();

  if (!site || !dateDeb || !timeDeb || !dateFin || !timeFin || !question || options.length < 2) {
    showMessage('Veuillez remplir tous les champs et au moins 2 options.', 'error');
    return;
  }

  const startISO = new Date(`${dateDeb}T${timeDeb}:00Z`).toISOString();
  const endISO   = new Date(`${dateFin}T${timeFin}:00Z`).toISOString();

  const payload = {
    pollId: `${site}_${dateDeb}`,
    site,
    question,
    options,
    votes: Array(options.length).fill(0),
    startDateTime: startISO,
    endDateTime: endISO
  };

  try {
    const resp = await fetch(`${API_BASE}/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    showMessage('Sondage créé / mis à jour avec succès', 'success');
    loadExistingPoll();
  } catch (err) {
    console.error('handleSubmit:', err);
    showMessage('Erreur lors de l’enregistrement', 'error');
  }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  // dateDebut = demain
  const t = new Date();
  t.setDate(t.getDate()+1);
  const str = t.toISOString().split('T')[0];
  dateDebutEl.value = str;
  dateFinEl.value    = str;

  // start
  clearFormForNewPoll();
  loadExistingPoll();

  // events
  siteEl.addEventListener('change',     loadExistingPoll);
  dateDebutEl.addEventListener('change',loadExistingPoll);
  addOptionBtn.addEventListener('click',()=> addOption());
  form.addEventListener('submit',       handleSubmit);
});

// app.js

// --- Réglages de l'API ---
const API_BASE = 'https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod';

// --- Récupération des éléments du DOM ---
const form            = document.getElementById('pollForm');
const siteEl          = document.getElementById('site');
const dateDebutEl     = document.getElementById('dateDebut');
const heureDebutEl    = document.getElementById('heureDebut');
const dateFinEl       = document.getElementById('dateFin');
const heureFinEl      = document.getElementById('heureFin');
const questionEl      = document.getElementById('question');
const optionsContainer= document.getElementById('optionsContainer');
const addOptionBtn    = document.getElementById('addOption');
const successMessage  = document.getElementById('successMessage');

// --- Utilitaires UI ---
function showMessage(txt, type='success') {
  successMessage.textContent = txt;
  successMessage.className = type; // 'success', 'error' ou 'info'
}
function clearMessage() {
  showMessage('', '');
}

// --- Gestion des options de réponse ---
function addOption(value = '') {
  const idx = optionsContainer.children.length;
  const wrapper = document.createElement('div');
  wrapper.className = 'option-row';
  wrapper.innerHTML = `
    <input type="text" name="option" value="${value}" required placeholder="Option ${idx+1}" />
    <button type="button" class="remove-option" title="Supprimer">×</button>
  `;
  optionsContainer.appendChild(wrapper);
  wrapper.querySelector('.remove-option')
    .addEventListener('click', () => {
      optionsContainer.removeChild(wrapper);
    });
}
function getOptions() {
  return Array.from(
    optionsContainer.querySelectorAll('input[name="option"]'),
    inp => inp.value.trim()
  ).filter(v => v);
}

// --- Réinitialiser le formulaire pour un nouveau sondage ---
function clearFormForNewPoll() {
  // Ne PAS réinitialiser dateDebutEl !
  heureDebutEl.value = '';
  dateFinEl.value    = '';
  heureFinEl.value   = '';
  questionEl.value   = '';
  optionsContainer.innerHTML = '';
  showMessage(`Pas de sondage pour cette date`, 'info');
}

// --- Charger un sondage existant ---
async function loadExistingPoll() {
  clearMessage();
  const site = siteEl.value;
  const date = dateDebutEl.value;
  if (!site || !date) return;

  const pollId = `${site}_${date}`;
  try {
    const resp = await fetch(`${API_BASE}/poll/${pollId}`, { method: 'GET' });
    if (resp.status === 404) {
      clearFormForNewPoll();
      return;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Remplir le formulaire avec les données reçues
    // startDateTime / endDateTime = "2025-06-17T02:00:00Z"
    const [ sDate, sTime ] = data.startDateTime.split('T');
    const [ eDate, eTime ] = data.endDateTime.split('T');
    dateDebutEl.value = sDate;
    heureDebutEl.value = sTime.slice(0,5);
    dateFinEl.value   = eDate;
    heureFinEl.value  = eTime.slice(0,5);
    questionEl.value  = data.question;
    optionsContainer.innerHTML = '';
    data.options.forEach(opt => addOption(opt));

    showMessage(`Sondage chargé (${data.options.length} options)`, 'info');

  } catch (err) {
    console.error('loadExistingPoll:', err);
    showMessage(`Erreur de chargement du sondage`, 'error');
  }
}

// --- Soumettre le formulaire (création ou mise à jour) ---
async function handleSubmit(evt) {
  evt.preventDefault();
  clearMessage();

  const site = siteEl.value;
  const dateDebut = dateDebutEl.value;
  const heureDeb = heureDebutEl.value;
  const dateFin  = dateFinEl.value;
  const heureFin = heureFinEl.value;
  const question= questionEl.value.trim();
  const options = getOptions();

  // Validation basique
  if (!site || !dateDebut || !heureDeb || !dateFin || !heureFin || !question || options.length < 2) {
    showMessage('Veuillez compléter tous les champs et au moins 2 options.', 'error');
    return;
  }

  // Construire le payload
  const payload = {
    pollId: `${site}_${dateDebut}`,
    site,
    question,
    options,
    votes: Array(options.length).fill(0),
    startDateTime: new Date(`${dateDebut}T${heureDeb}:00Z`).toISOString(),
    endDateTime:   new Date(`${dateFin}T${heureFin}:00Z`).toISOString()
  };

  try {
    const resp = await fetch(`${API_BASE}/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    showMessage('Sondage créé / mis à jour avec succès', 'success');
    // On recharge pour refléter l’état
    loadExistingPoll();

  } catch (err) {
    console.error('handleSubmit:', err);
    showMessage(`Erreur lors de l’enregistrement`, 'error');
  }
}

// --- Initialisation au chargement de la page ---
window.addEventListener('DOMContentLoaded', () => {
  // Par défaut, date de début = demain
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateDebutEl.value = tomorrow.toISOString().split('T')[0];
  dateFinEl.value   = dateDebutEl.value;

  // 1) lancer la vérification pour la date par défaut
  loadExistingPoll();
});

// --- Événements utilisateur ---
siteEl.addEventListener('change',    loadExistingPoll);
dateDebutEl.addEventListener('change',loadExistingPoll);
addOptionBtn.addEventListener('click', () => addOption());
form.addEventListener('submit',       handleSubmit);

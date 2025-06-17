// app.js
const form       = document.getElementById('pollForm');
const siteEl     = document.getElementById('site');
const dateDebut  = document.getElementById('dateDebut');
const heureDebut = document.getElementById('heureDebut');
const dateFin    = document.getElementById('dateFin');
const heureFin   = document.getElementById('heureFin');
const questionEl = document.getElementById('question');
const optsCont   = document.getElementById('optionsContainer');
const addOptBtn  = document.getElementById('addOption');
const msgEl      = document.getElementById('successMessage');

let currentPollId = null;

// --- Helpers pour options ---
function createOptionRow(value = '') {
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML = `
    <span class="drag-handle" title="Glisser pour déplacer">☰</span>
    <input type="text" name="option" value="${value}" required placeholder="Option" />
    <button type="button" class="remove-option" title="Supprimer">×</button>
  `;
  // suppression
  row.querySelector('.remove-option').onclick = () => {
    if (optsCont.children.length > 2) {
      row.remove();
      updateRemoveState();
    }
  };
  return row;
}

function updateRemoveState() {
  // empêcher de supprimer si on est à 2 options
  const canRemove = optsCont.children.length > 2;
  optsCont.querySelectorAll('.remove-option')
    .forEach(btn => btn.disabled = !canRemove);
}

// initial add 2 options
function ensureMinOptions() {
  while (optsCont.children.length < 2) {
    optsCont.appendChild(createOptionRow());
  }
  updateRemoveState();
}

// --- Drag & Drop avec SortableJS ---
import Sortable from 'sortablejs';
new Sortable(optsCont, {
  handle: '.drag-handle',
  animation: 150,
  ghostClass: 'drag-ghost'
});

// --- Gestion de l’interface ---
addOptBtn.onclick = () => {
  if (optsCont.children.length < 8) {
    optsCont.appendChild(createOptionRow());
    updateRemoveState();
  }
};

form.addEventListener('submit', async e => {
  e.preventDefault();
  msgEl.textContent = '';
  // Construire payload
  const payload = {
    site: siteEl.value,
    startDateTime: dateDebut.value + 'T' + heureDebut.value + ':00Z',
    endDateTime:   dateFin.value   + 'T' + heureFin.value   + ':00Z',
    question: questionEl.value.trim(),
    options: [...optsCont.querySelectorAll('input[name="option"]')]
      .map(i => i.value.trim())
  };
  // POST ou PUT vers createOrUpdatePoll
  const method = currentPollId ? 'PUT' : 'POST';
  const url    = currentPollId
    ? `/poll/${currentPollId}`
    : '/poll';
  try {
    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (!resp.ok) throw new Error(resp.statusText);
    const data = await resp.json();
    currentPollId = data.pollId;
    msgEl.textContent = '✔️ Enregistré avec succès';
    // Après création, verrouiller dateDebut
    dateDebut.readOnly = true;
  } catch (err) {
    msgEl.textContent = '❌ Erreur: ' + err.message;
  }
});

// --- Chargement automatique si sondage existe à la date par défaut ---
async function loadExisting() {
  msgEl.textContent = '';
  currentPollId = `${siteEl.value}_${dateDebut.value}`;
  try {
    const resp = await fetch(`/poll/${currentPollId}`, {
      credentials: 'include'
    });
    if (resp.status === 404) {
      // pas d’existant → nouvelle création
      form.reset();
      ensureMinOptions();
      dateDebut.readOnly = false;
      return;
    }
    if (!resp.ok) throw new Error(resp.statusText);
    const poll = await resp.json();
    // remplir form
    siteEl.value      = poll.site;
    const [sDate, sTime] = poll.startDateTime.split('T');
    dateDebut.value    = sDate;
    heureDebut.value   = sTime.slice(0,5);
    const [eDate, eTime] = poll.endDateTime.split('T');
    dateFin.value      = eDate;
    heureFin.value     = eTime.slice(0,5);
    questionEl.value   = poll.question;
    // options
    optsCont.innerHTML = '';
    poll.options.forEach(opt => {
      optsCont.appendChild(createOptionRow(opt));
    });
    ensureMinOptions();
    // verrouiller dateDebut si terminé
    const now = new Date();
    const ended = now >= new Date(poll.endDateTime);
    if (ended) {
      dateDebut.readOnly = false;   // on veut toujours pouvoir corriger dateDebut
      // mais on verrouille tout le reste (si souhaité, sinon commenter)
      dateFin.readOnly    = true;
      heureDebut.readOnly = true;
      heureFin.readOnly   = true;
      questionEl.readOnly = true;
      optsCont.querySelectorAll('input').forEach(i => i.readOnly = true);
      addOptBtn.disabled = true;
    }
  } catch (err) {
    console.error('loadExisting:', err);
  }
}

// --- Initialisation des dates ---
window.addEventListener('DOMContentLoaded', () => {
  // date par défaut = demain
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const isoDate = today.toISOString().split('T')[0];
  dateDebut.value = isoDate;
  dateFin.value   = isoDate;
  ensureMinOptions();
  loadExisting();
  // quand on change la dateDebut, re-charger
  dateDebut.addEventListener('change', loadExisting);
  siteEl.addEventListener('change', loadExisting);
});

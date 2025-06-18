// app.js
// Assurez-vous d’avoir inclus SortableJS dans votre HTML :
// <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

const form             = document.getElementById('pollForm');
const siteEl           = document.getElementById('site');
const dateDebutEl      = document.getElementById('dateDebut');
const heureDebutEl     = document.getElementById('heureDebut');
const dateFinEl        = document.getElementById('dateFin');
const heureFinEl       = document.getElementById('heureFin');
const questionEl       = document.getElementById('question');
const optionsContainer = document.getElementById('optionsContainer');
const addOptionBtn     = document.getElementById('addOption');
const successMessage   = document.getElementById('successMessage');

// --- BOÎTE DE DIALOGUE EN SURIMPRESSION ---
const overlayHtml = `
<div id="confirmOverlay" style="
  position:fixed;top:0;left:0;width:100%;height:100%;
  background:rgba(0,0,0,0.5);display:flex;align-items:center;
  justify-content:center;z-index:1000;visibility:hidden;
">
  <div style="
    background:white;padding:1.5rem;border-radius:8px;
    max-width:90%;text-align:center;
  ">
    <p>Ce sondage est encore en cours.<br>
       Voulez-vous <b>conserver</b> les votes actuels ? (Conserver)  
       ou <b>réinitialiser</b> les votes ? (Réinitialiser)
    </p>
    <button id="confirmKeep" style="margin:0 .5rem;padding:.5rem 1rem;">Conserver</button>
    <button id="confirmReset" style="margin:0 .5rem;padding:.5rem 1rem;">Réinitialiser</button>
  </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', overlayHtml);
const overlay = document.getElementById('confirmOverlay');
const keepBtn = document.getElementById('confirmKeep');
const resetBtn = document.getElementById('confirmReset');
function showConfirmModal() {
  return new Promise(resolve => {
    overlay.style.visibility = 'visible';
    keepBtn.onclick = () => { overlay.style.visibility = 'hidden'; resolve(true); };
    resetBtn.onclick = () => { overlay.style.visibility = 'hidden'; resolve(false); };
  });
}

// Crée une rangée d’option avec poignée de drag et bouton de suppression
function createOptionElement(value = '') {
  const wrapper = document.createElement('div');
  wrapper.className = 'option-row';
  wrapper.innerHTML = `
    <span class="drag-handle" title="Réordonner">≡</span>
    <input type="text" class="option-input" value="${value}" placeholder="Option" required>
    <button type="button" class="remove-option" title="Supprimer">✕</button>
  `;
  const removeBtn = wrapper.querySelector('.remove-option');
  removeBtn.addEventListener('click', () => {
    const count = optionsContainer.querySelectorAll('.option-row').length;
    if (count > 2) {
      wrapper.remove();
      refreshRemoveButtons();
      updateAddOptionButton();
    }
  });
  return wrapper;
}

// Masque les “✕” pour les deux premières options
function refreshRemoveButtons() {
  const rows = optionsContainer.querySelectorAll('.option-row');
  rows.forEach((row, idx) => {
    const btn = row.querySelector('.remove-option');
    btn.style.visibility = (idx < 2) ? 'hidden' : 'visible';
  });
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
    refreshRemoveButtons();
    updateAddOptionButton();
  }
});

// Réinitialise tout pour un nouveau sondage à la dateDebut donnée
function prepareNewPoll() {
  // Options par défaut
  optionsContainer.innerHTML = '';
  optionsContainer.appendChild(createOptionElement());
  optionsContainer.appendChild(createOptionElement());
  refreshRemoveButtons();
  updateAddOptionButton();

  // Remettre dateFin = lendemain de dateDebut, heures par défaut
  const dDeb = new Date(dateDebutEl.value);
  const next = new Date(dDeb);
  next.setDate(next.getDate() + 1);
  const toISO = d => d.toISOString().split('T')[0];
  dateFinEl.value    = toISO(next);
  heureDebutEl.value = '06:00';
  heureFinEl.value   = '05:59';

  // Tous les champs éditables
  heureDebutEl.disabled = false;
  dateFinEl.disabled    = false;
  heureFinEl.disabled   = false;
  questionEl.disabled   = false;
  questionEl.value      = '';
  successMessage.textContent = '';
}

// Charge un sondage existant ou prépare un nouveau
async function loadExistingPoll() {
  const site = siteEl.value;
  const dDeb = dateDebutEl.value;
  if (!site || !dDeb) return;
  const pollId = `${site}_${dDeb}`;

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

    // Remplissage des champs existants
    heureDebutEl.value = data.startDateTime.slice(11,16);
    dateFinEl.value    = data.endDateTime.slice(0,10);
    heureFinEl.value   = data.endDateTime.slice(11,16);
    questionEl.value   = data.question;

    // Options
    optionsContainer.innerHTML = '';
    data.options.forEach(opt =>
      optionsContainer.appendChild(createOptionElement(opt))
    );
    refreshRemoveButtons();
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

// Soumission de formulaire avec rappel de votes si sondage en cours
form.addEventListener('submit', async ev => {
  ev.preventDefault();

  const site     = siteEl.value;
  const dDeb     = dateDebutEl.value;
  const dFin     = dateFinEl.value;
  const hDeb     = heureDebutEl.value;
  const hFin     = heureFinEl.value;
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

  // Si sondage existant en cours, demander si on conserve
  try {
    const check = await fetch(
      `https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod/poll/${pollId}`,
      { credentials: 'omit' }
    );
    if (check.ok) {
      const existing = await check.json();
      const now = new Date();
      const end = new Date(existing.endDateTime);
      if (now < end && existing.options.length === options.length) {
        const keep = await showConfirmModal();
        if (keep) votes = existing.votes;
      }
    }
  } catch (_) {
    // pas de sondage existant ou erreur → votes à zéro
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

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  // Par défaut : sondage pour demain 06:00 → lendemain 05:59
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const toISO = d => d.toISOString().split('T')[0];

  dateDebutEl.value  = toISO(tomorrow);
  heureDebutEl.value = '06:00';
  dateFinEl.value    = toISO(tomorrow);
  heureFinEl.value   = '05:59';

  prepareNewPoll();
  loadExistingPoll();
  dateDebutEl.addEventListener('change', loadExistingPoll);
});

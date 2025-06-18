// Récupérations d’éléments
const form = document.getElementById('pollForm');
const optionsContainer = document.getElementById('optionsContainer');
const addOptionBtn = document.getElementById('addOption');
const successMessage = document.getElementById('successMessage');

// Crée un champ option
function createOption(value = '') {
  const div = document.createElement('div');
  div.className = 'option-item';
  div.innerHTML = `
    <input 
      type="text" 
      class="option-input" 
      placeholder="Option" 
      required 
      value="${value}"
    />
    <button type="button" class="remove-option">✕</button>
  `;
  // suppression
  div.querySelector('.remove-option').onclick = () => {
    if (optionsContainer.children.length > 2) {
      div.remove();
    } else {
      alert('Il faut au moins 2 options.');
    }
  };
  return div;
}

// Au démarrage, deux options vides
optionsContainer.append(createOption(), createOption());

// Ajouter une option
addOptionBtn.onclick = () => {
  if (optionsContainer.children.length < 8) {
    optionsContainer.append(createOption());
  } else {
    alert('Maximum 8 options.');
  }
};

// Soumission du formulaire
form.onsubmit = async e => {
  e.preventDefault();
  successMessage.textContent = '';
  
  // Collecte form data
  const site = form.site.value;
  const startDate = form.dateDebut.value;
  const startTime = form.heureDebut.value;
  const endDate = form.dateFin.value;
  const endTime = form.heureFin.value;
  const question = form.question.value.trim();
  const options = Array.from(
    optionsContainer.querySelectorAll('.option-input')
  ).map(i => i.value.trim()).filter(v => v);

  if (options.length < 2) {
    alert('Veuillez entrer au moins 2 options.');
    return;
  }

  // Construire payload
  const payload = {
    site,
    startDateTime: `${startDate}T${startTime}:00Z`,
    endDateTime: `${endDate}T${endTime}:00Z`,
    question,
    options
  };

  try {
    const res = await fetch(
      'https://hx9jzqon0l.execute-api.us-east-1.amazonaws.com/prod/poll',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) throw new Error(res.status);
    successMessage.textContent = 'Sondage créé/mis à jour !';
  } catch (err) {
    successMessage.textContent = `Erreur : ${err.message}`;
  }
};

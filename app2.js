// *** Ne plus importer sortablejs ! ***
// import Sortable from 'sortablejs';

document.addEventListener('DOMContentLoaded', () => {
  const optionsContainer = document.getElementById('optionsContainer');
  const addOptionBtn = document.getElementById('addOption');
  const minOptions = 2, maxOptions = 8;

  // Fonction pour créer un champ option
  function makeOption(value = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'option-item';

    // Poignée de drag
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.innerHTML = '&#x2630;'; // icône ≡
    wrapper.appendChild(handle);

    // Input texte
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = 'Option';
    wrapper.appendChild(input);

    // Bouton supprimer
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-remove';
    btn.innerHTML = '&times;';
    btn.title = 'Supprimer cette option';
    btn.onclick = () => {
      if (optionsContainer.children.length > minOptions) {
        wrapper.remove();
      }
    };
    wrapper.appendChild(btn);

    return wrapper;
  }

  // Initialisation : toujours deux champs
  optionsContainer.appendChild(makeOption());
  optionsContainer.appendChild(makeOption());

  // Ajouter une option
  addOptionBtn.addEventListener('click', () => {
    if (optionsContainer.children.length < maxOptions) {
      optionsContainer.appendChild(makeOption());
    }
  });

  // Instancier Sortable en se basant sur la poignée .drag-handle
  new Sortable(optionsContainer, {
    handle: '.drag-handle',
    animation: 150
  });

  // ... le reste de votre code (chargement, soumission du formulaire, etc.) ...

});

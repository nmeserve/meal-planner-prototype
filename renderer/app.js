// Renderer entry for the Weekly Meal Planner Prototype.
// This file is responsible for:
// - Reading configuration form inputs.
// - Storing the current weekly framework in memory.
// - Rendering a simple 7-day calendar based on user-defined themes.
//
// Future layers (recipe generation, ingredient aggregation, shopping list export)
// can build on top of the `state` object and the render functions defined here.

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Minimal state holder for this prototype.
 * Later, additional fields can be added (recipes, ingredients, etc.).
 */
const state = {
  portionSize: 4,
  themes: {
    Monday: '',
    Tuesday: '',
    Wednesday: '',
    Thursday: '',
    Friday: '',
    Saturday: '',
    Sunday: '',
  },
};

/**
 * Reads the configuration form inputs and updates in-memory state.
 * This keeps all planner data in one place for future expansion.
 */
function readFormIntoState() {
  const portionInput = document.getElementById('portion-size');
  const portionValue = parseInt(portionInput.value, 10);
  state.portionSize = Number.isNaN(portionValue) || portionValue <= 0 ? 1 : portionValue;

  const themeInputs = {
    Monday: document.getElementById('theme-monday'),
    Tuesday: document.getElementById('theme-tuesday'),
    Wednesday: document.getElementById('theme-wednesday'),
    Thursday: document.getElementById('theme-thursday'),
    Friday: document.getElementById('theme-friday'),
    Saturday: document.getElementById('theme-saturday'),
    Sunday: document.getElementById('theme-sunday'),
  };

  DAYS_OF_WEEK.forEach((dayName) => {
    const input = themeInputs[dayName];
    state.themes[dayName] = input ? input.value.trim() : '';
  });
}

/**
 * Renders a simple weekly calendar grid based on the current state.
 * Each column corresponds to a weekday and shows the chosen theme.
 * Cells are clickable to open the recipe modal for that day.
 */
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  grid.innerHTML = '';

  DAYS_OF_WEEK.forEach((dayName) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell calendar-cell-clickable';
    cell.dataset.day = dayName;

    const dayLabel = document.createElement('div');
    dayLabel.className = 'calendar-day-label';
    dayLabel.textContent = dayName;

    const themeLabel = document.createElement('div');
    themeLabel.className = 'calendar-theme-label';
    const theme = state.themes[dayName];
    themeLabel.textContent = theme ? `Theme: ${theme}` : 'Theme: (none)';

    cell.appendChild(dayLabel);
    cell.appendChild(themeLabel);
    grid.appendChild(cell);
  });
}

/**
 * Returns true if every day of the week has a non-empty theme in state.
 */
function allThemesFilled() {
  return DAYS_OF_WEEK.every((day) => (state.themes[day] || '').trim() !== '');
}

/**
 * Opens the recipe modal for a given day. Reads the category from the form (user data).
 * Only opens if the user has filled themes for all 7 days and clicked Generate.
 * Shows that day's category and 3 random recipes.
 */
function openRecipeModal(dayName) {
  readFormIntoState();

  if (!allThemesFilled()) {
    alert('Please fill in a theme for every day of the week and click "Generate Weekly Framework" first.');
    return;
  }

  const category = (state.themes[dayName] || '').trim();
  const recipes = window.RecipeEngine && typeof window.RecipeEngine.getRandomRecipes === 'function'
    ? window.RecipeEngine.getRandomRecipes(category)
    : [];

  const modal = document.getElementById('recipe-modal');
  const titleEl = document.getElementById('recipe-modal-title');
  const listEl = document.getElementById('recipe-modal-list');

  if (!modal || !titleEl || !listEl) return;

  titleEl.textContent = `${dayName.toUpperCase()} – ${(category || '(no category)').toUpperCase()}`;

  listEl.innerHTML = '';
  if (recipes.length === 0) {
    const li = document.createElement('li');
    li.textContent = category ? 'No recipes for this category.' : 'No category for this day.';
    li.className = 'recipe-modal-empty';
    listEl.appendChild(li);
  } else {
    recipes.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      listEl.appendChild(li);
    });
  }

  modal.classList.add('recipe-modal-open');
  modal.dataset.day = dayName;
  modal.dataset.category = category;
}

/**
 * Refreshes the recipe list in the open modal with 3 new random recipes (Roll Again).
 */
function rollAgainInModal() {
  const modal = document.getElementById('recipe-modal');
  if (!modal || !modal.classList.contains('recipe-modal-open')) return;
  const category = (modal.dataset.category || '').trim();
  const recipes = window.RecipeEngine && typeof window.RecipeEngine.getRandomRecipes === 'function'
    ? window.RecipeEngine.getRandomRecipes(category)
    : [];

  const listEl = document.getElementById('recipe-modal-list');
  if (!listEl) return;

  listEl.innerHTML = '';
  if (recipes.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No recipes for this category.';
    li.className = 'recipe-modal-empty';
    listEl.appendChild(li);
  } else {
    recipes.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      listEl.appendChild(li);
    });
  }
}

/**
 * Closes the recipe modal.
 */
function closeRecipeModal() {
  const modal = document.getElementById('recipe-modal');
  if (modal) modal.classList.remove('recipe-modal-open');
}

/**
 * Sets up DOM event handlers for the configuration UI and recipe modal.
 */
function attachEventHandlers() {
  const generateButton = document.getElementById('generate-btn');
  if (generateButton) {
    generateButton.addEventListener('click', () => {
      readFormIntoState();
      renderCalendar();
    });
  }

  // Click on a calendar day cell -> open recipe modal for that day (only if all themes filled)
  const grid = document.getElementById('calendar-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const cell = e.target.closest('.calendar-cell-clickable');
      if (!cell || !cell.dataset.day) return;
      openRecipeModal(cell.dataset.day);
    });
  }

  // Single delegated handler on the modal: close on backdrop/close button, Roll Again on button
  const modal = document.getElementById('recipe-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'recipe-modal-close' || e.target.id === 'recipe-modal-backdrop') {
        closeRecipeModal();
      } else if (e.target.id === 'recipe-modal-roll') {
        e.preventDefault();
        rollAgainInModal();
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  attachEventHandlers();
  // Initial empty calendar render to indicate layout before user clicks.
  renderCalendar();
});


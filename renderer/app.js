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
  /** Locked-in recipe per day: { name, ingredients, instructions } or null */
  selectedRecipes: {
    Monday: null,
    Tuesday: null,
    Wednesday: null,
    Thursday: null,
    Friday: null,
    Saturday: null,
    Sunday: null,
  },
};

/** Full recipe objects for the current pick modal (so we can store the one the user selects). */
let currentModalRecipes = [];

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
 * Cells are clickable: no recipe → pick modal; has recipe → detail modal.
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
 * Renders the row below the calendar: one cell per day showing the selected recipe name (or blank).
 * Clicking a cell opens the pick modal (no recipe) or detail modal (has recipe).
 */
function renderSelectedRecipesRow() {
  const grid = document.getElementById('selected-recipes-grid');
  if (!grid) return;

  grid.innerHTML = '';

  DAYS_OF_WEEK.forEach((dayName) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell calendar-cell-clickable selected-recipe-cell';
    cell.dataset.day = dayName;

    const recipe = state.selectedRecipes[dayName];
    const label = document.createElement('div');
    label.className = 'selected-recipe-label';
    label.textContent = recipe ? recipe.name : '—';
    const sub = document.createElement('div');
    sub.className = 'calendar-theme-label';
    sub.textContent = recipe ? 'Click to view details' : 'No recipe selected';

    cell.appendChild(label);
    cell.appendChild(sub);
    grid.appendChild(cell);
  });
}

/**
 * Returns true if every day of the week has a non-empty theme in state.
 */
function allThemesFilled() {
  return DAYS_OF_WEEK.every((day) => (state.themes[day] || '').trim() !== '');
}

/** Emojis used for each recipe line in the pick modal (rotates if more than 3). */
const RECIPE_EMOJIS = ['🍝', '🥗', '🍕'];

/**
 * Opens the recipe modal for a day. If that day already has a selected recipe, shows
 * the detail view (ingredients + instructions). Otherwise shows the pick view (3 options).
 */
function openRecipeModal(dayName) {
  readFormIntoState();

  if (!allThemesFilled()) {
    alert('Please fill in a theme for every day of the week and click "Generate Weekly Framework" first.');
    return;
  }

  if (state.selectedRecipes[dayName]) {
    openRecipeDetailView(dayName);
  } else {
    openRecipePicker(dayName);
  }
}

/**
 * Opens the modal in detail view: ingredients and instructions for the locked-in recipe.
 */
function openRecipeDetailView(dayName) {
  const recipe = state.selectedRecipes[dayName];
  if (!recipe) return;

  const modal = document.getElementById('recipe-modal');
  const titleEl = document.getElementById('recipe-modal-title');
  const pickView = document.getElementById('recipe-modal-pick-view');
  const detailView = document.getElementById('recipe-modal-detail-view');
  const actionsPick = document.getElementById('recipe-modal-actions-pick');
  const actionsDetail = document.getElementById('recipe-modal-actions-detail');
  const ingredientsEl = document.getElementById('recipe-modal-ingredients');
  const instructionsEl = document.getElementById('recipe-modal-instructions');

  if (!modal || !titleEl || !detailView || !ingredientsEl || !instructionsEl) return;

  modal.dataset.day = dayName;
  titleEl.textContent = recipe.name;

  ingredientsEl.innerHTML = '';
  (recipe.ingredients || []).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ingredientsEl.appendChild(li);
  });

  instructionsEl.innerHTML = '';
  (recipe.instructions || []).forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    instructionsEl.appendChild(li);
  });

  pickView.hidden = true;
  detailView.hidden = false;
  if (actionsPick) actionsPick.hidden = true;
  if (actionsDetail) actionsDetail.hidden = false;
  modal.classList.add('recipe-modal-open');
}

/**
 * Opens the modal in pick view: fetches 3 AI recipes and lets the user select one to lock in.
 */
async function openRecipePicker(dayName) {
  const category = (state.themes[dayName] || '').trim();
  const modal = document.getElementById('recipe-modal');
  const titleEl = document.getElementById('recipe-modal-title');
  const pickView = document.getElementById('recipe-modal-pick-view');
  const detailView = document.getElementById('recipe-modal-detail-view');
  const actionsPick = document.getElementById('recipe-modal-actions-pick');
  const actionsDetail = document.getElementById('recipe-modal-actions-detail');
  const loadingEl = document.getElementById('recipe-modal-loading');
  const errorEl = document.getElementById('recipe-modal-error');
  const listEl = document.getElementById('recipe-modal-list');

  if (!modal || !titleEl || !loadingEl || !errorEl || !listEl) return;

  titleEl.textContent = `${dayName.toUpperCase()} – ${(category || '(no category)').toUpperCase()}`;
  modal.dataset.day = dayName;
  modal.dataset.category = category;

  pickView.hidden = false;
  detailView.hidden = true;
  if (actionsPick) actionsPick.hidden = false;
  if (actionsDetail) actionsDetail.hidden = true;

  loadingEl.hidden = false;
  errorEl.hidden = true;
  listEl.hidden = true;
  modal.classList.add('recipe-modal-open');

  const result = await (window.mealAPI && typeof window.mealAPI.generateRecipes === 'function'
    ? window.mealAPI.generateRecipes(category)
    : Promise.resolve({ ok: false, error: 'API not available' }));

  if (result.ok && Array.isArray(result.recipes) && result.recipes.length > 0) {
    currentModalRecipes = result.recipes;
    showModalRecipesSelectable(listEl, result.recipes, dayName);
    hideModalLoading(loadingEl, errorEl, listEl);
  } else {
    showModalError(loadingEl, errorEl, listEl);
  }
}

/**
 * Shows loading state in the modal body (only the loading message visible).
 */
function showModalLoading(loadingEl, errorEl, listEl) {
  if (loadingEl) loadingEl.hidden = false;
  if (errorEl) errorEl.hidden = true;
  if (listEl) listEl.hidden = true;
}

/**
 * Hides loading and shows the recipe list.
 */
function hideModalLoading(loadingEl, errorEl, listEl) {
  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = true;
  if (listEl) listEl.hidden = false;
}

/**
 * Shows error state in the modal body.
 */
function showModalError(loadingEl, errorEl, listEl) {
  if (loadingEl) loadingEl.hidden = true;
  if (errorEl) errorEl.hidden = false;
  if (listEl) listEl.hidden = true;
}

/**
 * Renders the recipe list as clickable options. Each item has data-recipe-index.
 * Clicking one locks that recipe in for the day and closes the modal.
 */
function showModalRecipesSelectable(listEl, recipes, dayName) {
  if (!listEl) return;
  listEl.innerHTML = '';
  recipes.forEach((recipe, i) => {
    const li = document.createElement('li');
    li.className = 'recipe-modal-list-item';
    li.dataset.recipeIndex = String(i);
    const emoji = RECIPE_EMOJIS[i % RECIPE_EMOJIS.length];
    const name = typeof recipe === 'object' && recipe && recipe.name ? recipe.name : String(recipe);
    li.textContent = `${emoji} ${name}`;
    li.title = 'Click to select this recipe for ' + dayName;
    listEl.appendChild(li);
  });
}

/**
 * Refreshes the recipe list in the open modal with new AI-generated recipes (Roll Again).
 */
async function rollAgainInModal() {
  const modal = document.getElementById('recipe-modal');
  if (!modal || !modal.classList.contains('recipe-modal-open')) return;
  const dayName = modal.dataset.day;
  const category = (modal.dataset.category || '').trim();

  const loadingEl = document.getElementById('recipe-modal-loading');
  const errorEl = document.getElementById('recipe-modal-error');
  const listEl = document.getElementById('recipe-modal-list');
  if (!loadingEl || !errorEl || !listEl || !dayName) return;

  showModalLoading(loadingEl, errorEl, listEl);

  const result = await (window.mealAPI && typeof window.mealAPI.generateRecipes === 'function'
    ? window.mealAPI.generateRecipes(category)
    : Promise.resolve({ ok: false, error: 'API not available' }));

  if (result.ok && Array.isArray(result.recipes) && result.recipes.length > 0) {
    currentModalRecipes = result.recipes;
    showModalRecipesSelectable(listEl, result.recipes, dayName);
    hideModalLoading(loadingEl, errorEl, listEl);
  } else {
    showModalError(loadingEl, errorEl, listEl);
  }
}

/**
 * When user clicks one of the 3 recipe options, lock it in for that day and close the modal.
 */
function selectRecipeForDay(dayName, recipeIndex) {
  const recipe = currentModalRecipes[recipeIndex];
  if (!recipe || typeof recipe !== 'object') return;
  state.selectedRecipes[dayName] = {
    name: recipe.name || 'Recipe',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.slice() : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions.slice() : [],
  };
  closeRecipeModal();
  renderSelectedRecipesRow();
}

/**
 * Closes the recipe modal.
 */
function closeRecipeModal() {
  const modal = document.getElementById('recipe-modal');
  if (modal) modal.classList.remove('recipe-modal-open');
}

/**
 * Re-opens the pick view for the current day (e.g. after "Pick different recipe").
 */
function openRecipePickerFromDetail() {
  const modal = document.getElementById('recipe-modal');
  const dayName = modal?.dataset.day;
  if (dayName) openRecipePicker(dayName);
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
      renderSelectedRecipesRow();
    });
  }

  // Click on a calendar day cell -> open recipe modal (pick or detail depending on whether day has a recipe)
  const grid = document.getElementById('calendar-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const cell = e.target.closest('.calendar-cell-clickable');
      if (!cell || !cell.dataset.day) return;
      openRecipeModal(cell.dataset.day);
    });
  }

  // Click on the selected-recipe cell for a day -> same as clicking the day (pick or detail)
  const selectedGrid = document.getElementById('selected-recipes-grid');
  if (selectedGrid) {
    selectedGrid.addEventListener('click', (e) => {
      const cell = e.target.closest('.selected-recipe-cell');
      if (!cell || !cell.dataset.day) return;
      openRecipeModal(cell.dataset.day);
    });
  }

  // Modal: close, Roll Again, Pick different recipe, or click a recipe option to select it
  const modal = document.getElementById('recipe-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (
        e.target.id === 'recipe-modal-close' ||
        e.target.id === 'recipe-modal-backdrop' ||
        e.target.id === 'recipe-modal-close-btn' ||
        e.target.id === 'recipe-modal-close-btn-detail'
      ) {
        closeRecipeModal();
      } else if (e.target.id === 'recipe-modal-roll') {
        e.preventDefault();
        rollAgainInModal();
      } else if (e.target.id === 'recipe-modal-pick-different') {
        e.preventDefault();
        openRecipePickerFromDetail();
      } else {
        const listItem = e.target.closest('.recipe-modal-list-item');
        if (listItem && listItem.dataset.recipeIndex != null && modal.dataset.day) {
          e.preventDefault();
          selectRecipeForDay(modal.dataset.day, parseInt(listItem.dataset.recipeIndex, 10));
        }
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  attachEventHandlers();
  renderCalendar();
  renderSelectedRecipesRow();
});


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
 */
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  grid.innerHTML = '';

  DAYS_OF_WEEK.forEach((dayName) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

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
 * Sets up DOM event handlers for the configuration UI.
 */
function attachEventHandlers() {
  const generateButton = document.getElementById('generate-btn');
  if (!generateButton) return;

  generateButton.addEventListener('click', () => {
    readFormIntoState();
    renderCalendar();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  attachEventHandlers();
  // Initial empty calendar render to indicate layout before user clicks.
  renderCalendar();
});


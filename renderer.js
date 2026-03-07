const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_PLAN = [
  { meals: 3, calories: 2050, macroLabel: 'Balanced' },
  { meals: 2, calories: 1750, macroLabel: 'Light' },
  { meals: 3, calories: 2200, macroLabel: 'High Protein' },
  { meals: 3, calories: 1950, macroLabel: 'Balanced' },
  { meals: 2, calories: 1800, macroLabel: 'Lunch-heavy' },
  { meals: 3, calories: 2100, macroLabel: 'Weekend Treat' },
  { meals: 2, calories: 1650, macroLabel: 'Recovery' },
];

let selectedIndex = null;

function formatDate(offset) {
  const date = new Date();
  const day = date.getDate() + offset;
  const base = new Date(date.getFullYear(), date.getMonth(), day);
  return base.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
  grid.innerHTML = '';

  DAYS.forEach((dayName, index) => {
    const plan = MOCK_PLAN[index];
    const card = document.createElement('button');
    card.className = 'day-card';
    card.type = 'button';
    card.dataset.index = index.toString();

    card.innerHTML = `
      <div class="day-card-header">
        <div>
          <div class="day-name">${dayName}</div>
          <div class="day-date">${formatDate(index)}</div>
        </div>
        <div class="meal-count">${plan.meals} meals</div>
      </div>
      <div class="macro-strip">
        <div class="macro-pill"><strong>${plan.calories}</strong> kcal</div>
        <div class="macro-pill">${plan.macroLabel}</div>
        <div class="macro-pill">Macros: mock</div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectDay(index);
    });

    grid.appendChild(card);
  });
}

function selectDay(index) {
  selectedIndex = index;
  const cards = document.querySelectorAll('.day-card');
  cards.forEach((card, cardIndex) => {
    card.classList.toggle('active', cardIndex === index);
  });

  const label = document.getElementById('selected-day-label');
  label.textContent = `${DAYS[index]} • ${formatDate(index)}`;

  const details = document.getElementById('day-details');
  const plan = MOCK_PLAN[index];

  details.innerHTML = `
    <div class="meals-list">
      <div class="meal-row">
        <div class="meal-tag">Breakfast</div>
        <div class="meal-name">Greek yogurt parfait with berries</div>
        <div class="calories-chip">420 kcal</div>
      </div>
      <div class="meal-row">
        <div class="meal-tag">Lunch</div>
        <div class="meal-name">Grilled chicken bowl with quinoa & veggies</div>
        <div class="calories-chip">680 kcal</div>
      </div>
      <div class="meal-row">
        <div class="meal-tag">Dinner</div>
        <div class="meal-name">Salmon, roasted potatoes & greens</div>
        <div class="calories-chip">720 kcal</div>
      </div>
    </div>
    <p class="subtle-text">
      Total for this prototype day: approximately ${plan.calories} kcal.
      In the real app, this panel will show editable meals, macros, and shopping list links.
    </p>
  `;
}

function attachEvents() {
  const newPlanButton = document.getElementById('new-plan-btn');
  newPlanButton.addEventListener('click', () => {
    // For now this just re-renders the mock plan.
    renderWeekGrid();
    selectedIndex = null;
    document.getElementById('selected-day-label').textContent = 'Nothing selected yet';
    document.getElementById('day-details').innerHTML = `
      <p class="empty-state">
        A fresh prototype plan has been generated. Click a day to explore meals.
      </p>
    `;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  renderWeekGrid();
  attachEvents();
});


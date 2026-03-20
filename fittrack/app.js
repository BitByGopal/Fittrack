// ===== STATE & STORAGE =====
const STATE = {
  water: 0,
  meals: [],
  weights: [],
  fast: { active: false, startTime: null },
  filterMeal: 'all'
};

function save(key, val) { localStorage.setItem('pt_' + key, JSON.stringify(val)); }
function load(key, def) { try { const v = localStorage.getItem('pt_' + key); return v ? JSON.parse(v) : def; } catch { return def; } }

function loadAll() {
  STATE.water   = load('water', 0);
  STATE.meals   = load('meals', []);
  STATE.weights = load('weights', []);
  STATE.fast    = load('fast', { active: false, startTime: null });
}

// ===== NAVIGATION =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
    if (btn.dataset.page === 'dashboard') renderDashboard();
    if (btn.dataset.page === 'food') renderFoodGuide('lunch');
    if (btn.dataset.page === 'weight') renderWeightHistory();
  });
});

// ===== DATE =====
function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ===== DASHBOARD =====
function renderDashboard() {
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

  // Weight stats
  const weights = STATE.weights;
  if (weights.length > 0) {
    const latest = weights[weights.length - 1].kg;
    document.getElementById('dash-weight').textContent = latest + ' kg';
    const lost = (91 - latest).toFixed(1);
    document.getElementById('dash-lost').textContent = lost > 0 ? lost + ' kg' : '0 kg';
    // Progress: 91 start, 71 target — 20kg total
    const pct = Math.min(100, Math.max(0, ((91 - latest) / 20) * 100));
    document.getElementById('progress-bar').style.width = pct.toFixed(1) + '%';
    document.getElementById('prog-current').textContent = latest + ' kg';
    document.getElementById('progress-label').textContent = pct.toFixed(1) + '% towards goal — ' + (latest - 71).toFixed(1) + ' kg remaining';
  }

  // Water
  document.getElementById('dash-water').textContent = STATE.water + ' / 12';

  // Fast status
  if (STATE.fast.active && STATE.fast.startTime) {
    const elapsed = (Date.now() - STATE.fast.startTime) / 3600000;
    document.getElementById('dash-fast-status').textContent = elapsed.toFixed(1) + ' hrs';
    document.getElementById('dash-fast-sub').textContent = 'Fasting in progress';
  }

  // Today meals
  const today = todayStr();
  const todayMeals = STATE.meals.filter(m => m.date === today);
  const summaryEl = document.getElementById('dash-meals-summary');
  if (todayMeals.length === 0) {
    summaryEl.innerHTML = '<div class="empty-state">No meals logged today</div>';
  } else {
    summaryEl.innerHTML = todayMeals.map(m => `
      <div class="meal-summary-row">
        <span class="ms-type ${m.type}">${m.type}</span>
        <span class="ms-items">${m.items}</span>
        <span class="ms-time">${formatTime(m.ts)}</span>
      </div>`).join('');
  }
}

// ===== FASTING TIMER =====
let fastInterval = null;
const FAST_DURATION = 16 * 3600 * 1000;

function toggleFast() {
  if (STATE.fast.active) {
    STATE.fast.active = false;
    STATE.fast.startTime = null;
    clearInterval(fastInterval);
    fastInterval = null;
    document.getElementById('fast-btn').textContent = 'Start Fast';
    document.querySelector('.ring-fill').style.stroke = 'var(--green)';
    updateRing(0, 'NOT FASTING', '00:00:00', 'Press start to begin', 0);
    document.getElementById('fast-start-time').textContent = '—';
  } else {
    STATE.fast.active = true;
    STATE.fast.startTime = Date.now();
    document.getElementById('fast-btn').textContent = 'End Fast';
    document.getElementById('fast-start-time').textContent = formatTime(STATE.fast.startTime);
    startFastTick();
  }
  save('fast', STATE.fast);
}

function startFastTick() {
  clearInterval(fastInterval);
  fastInterval = setInterval(tickFast, 1000);
  tickFast();
}

function tickFast() {
  if (!STATE.fast.active || !STATE.fast.startTime) return;
  const elapsed = Date.now() - STATE.fast.startTime;
  const pct = Math.min(elapsed / FAST_DURATION, 1);
  const hrs = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const timeStr = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const label = pct >= 1 ? 'COMPLETE!' : 'FASTING';
  const sub = pct >= 1 ? 'You did it! Break your fast.' : `${(16 - hrs)}h ${60 - mins}m remaining`;
  updateRing(pct, label, timeStr, sub, pct * 100);
  document.getElementById('fast-pct').textContent = (pct * 100).toFixed(1) + '%';
}

function updateRing(pct, label, time, sub, pctNum) {
  const circ = 2 * Math.PI * 96;
  const offset = circ * (1 - pct);
  document.getElementById('ring-fill').style.strokeDashoffset = offset;
  document.getElementById('ring-label').textContent = label;
  document.getElementById('ring-time').textContent = time;
  document.getElementById('ring-sub').textContent = sub;
  if (pct >= 1) document.querySelector('.ring-fill').style.stroke = 'var(--green)';
}

function resetFast() {
  STATE.fast = { active: false, startTime: null };
  save('fast', STATE.fast);
  clearInterval(fastInterval);
  fastInterval = null;
  document.getElementById('fast-btn').textContent = 'Start Fast';
  document.getElementById('fast-start-time').textContent = '—';
  document.getElementById('fast-pct').textContent = '0%';
  updateRing(0, 'NOT FASTING', '00:00:00', 'Press start to begin', 0);
}

// ===== MEALS =====
function openMealModal() { document.getElementById('meal-modal').classList.add('open'); }
function closeMealModal() { document.getElementById('meal-modal').classList.remove('open'); }

function saveMeal() {
  const type = document.getElementById('meal-type').value;
  const items = document.getElementById('meal-items').value.trim();
  const notes = document.getElementById('meal-notes').value.trim();
  if (!items) { alert('Please enter food items!'); return; }
  const meal = { id: Date.now(), type, items, notes, date: todayStr(), ts: Date.now() };
  STATE.meals.push(meal);
  save('meals', STATE.meals);
  closeMealModal();
  document.getElementById('meal-items').value = '';
  document.getElementById('meal-notes').value = '';
  renderMeals();
}

function filterMeals(type, el) {
  STATE.filterMeal = type;
  document.querySelectorAll('.mtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderMeals();
}

function renderMeals() {
  const list = document.getElementById('meals-list');
  let meals = [...STATE.meals].reverse();
  if (STATE.filterMeal !== 'all') meals = meals.filter(m => m.type === STATE.filterMeal);
  if (meals.length === 0) {
    list.innerHTML = '<div class="empty-state">No meals logged yet — add your first meal!</div>';
    return;
  }
  list.innerHTML = meals.map(m => `
    <div class="meal-entry">
      <div class="me-left">
        <span class="me-type ${m.type}">${m.type}</span>
        <span class="me-time">${formatTime(m.ts)}</span>
        <span class="me-time">${formatDate(m.date)}</span>
      </div>
      <div class="me-right">
        <div class="me-items">${m.items}</div>
        ${m.notes ? `<div class="me-notes">${m.notes}</div>` : ''}
      </div>
      <button class="me-delete" onclick="deleteMeal(${m.id})">✕</button>
    </div>`).join('');
}

function deleteMeal(id) {
  STATE.meals = STATE.meals.filter(m => m.id !== id);
  save('meals', STATE.meals);
  renderMeals();
}

// ===== WATER =====
function renderWater() {
  const pct = (STATE.water / 12) * 100;
  document.getElementById('water-fill').style.height = pct + '%';
  document.getElementById('water-overlay').textContent = STATE.water + ' / 12';
  document.getElementById('water-liters').textContent = (STATE.water * 0.25).toFixed(2) + ' L';

  const grid = document.getElementById('glasses-grid');
  grid.innerHTML = Array.from({ length: 12 }, (_, i) =>
    `<div class="glass-icon ${i < STATE.water ? 'filled' : ''}">🥛</div>`
  ).join('');

  document.getElementById('dash-water').textContent = STATE.water + ' / 12';
}

function addGlass() {
  if (STATE.water >= 12) return;
  STATE.water++;
  save('water', STATE.water);
  renderWater();
}
function removeGlass() {
  if (STATE.water <= 0) return;
  STATE.water--;
  save('water', STATE.water);
  renderWater();
}
function resetWater() {
  STATE.water = 0;
  save('water', STATE.water);
  renderWater();
}

// ===== WEIGHT =====
function saveWeight() {
  const val = parseFloat(document.getElementById('weight-input').value);
  if (!val || val < 40 || val > 200) { alert('Enter a valid weight (40–200 kg)'); return; }
  STATE.weights.push({ kg: val, date: todayStr(), ts: Date.now() });
  save('weights', STATE.weights);
  document.getElementById('weight-input').value = '';
  renderWeightHistory();
  renderDashboard();
}

function renderWeightHistory() {
  const el = document.getElementById('weight-history');
  if (STATE.weights.length === 0) {
    el.innerHTML = '<div class="empty-state">No weight logged yet</div>';
    renderWeightChart([]);
    return;
  }
  const sorted = [...STATE.weights].reverse();
  el.innerHTML = sorted.map((w, i, arr) => {
    const prev = arr[i + 1];
    let diffHtml = '';
    if (prev) {
      const diff = (w.kg - prev.kg).toFixed(1);
      const cls = diff <= 0 ? 'down' : 'up';
      const sign = diff <= 0 ? '▼' : '▲';
      diffHtml = `<span class="wh-diff ${cls}">${sign} ${Math.abs(diff)} kg</span>`;
    }
    return `
      <div class="wh-row">
        <span class="wh-date">${formatDate(w.date)}</span>
        <span class="wh-weight">${w.kg} kg</span>
        ${diffHtml}
        <button class="wh-delete" onclick="deleteWeight(${w.ts})">✕</button>
      </div>`;
  }).join('');
  renderWeightChart(STATE.weights);
}

function deleteWeight(ts) {
  STATE.weights = STATE.weights.filter(w => w.ts !== ts);
  save('weights', STATE.weights);
  renderWeightHistory();
  renderDashboard();
}

function renderWeightChart(data) {
  const canvas = document.getElementById('weight-chart');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 600;
  canvas.height = 160;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (data.length < 2) {
    ctx.fillStyle = '#9E8B74';
    ctx.font = '13px DM Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Log at least 2 weights to see chart', canvas.width / 2, 80);
    return;
  }

  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, bottom: 30, left: 40, right: 20 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const vals = data.map(d => d.kg);
  const minV = Math.min(...vals, 71) - 1;
  const maxV = Math.max(...vals, 91) + 1;

  const xOf = (i) => pad.left + (i / (data.length - 1)) * cW;
  const yOf = (v) => pad.top + cH - ((v - minV) / (maxV - minV)) * cH;

  // Target line
  ctx.strokeStyle = 'rgba(99,85,63,0.35)';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, yOf(71));
  ctx.lineTo(W - pad.right, yOf(71));
  ctx.stroke();
  ctx.fillStyle = '#63553F';
  ctx.font = '10px DM Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('71 kg', pad.left + 4, yOf(71) - 4);
  ctx.setLineDash([]);

  // Line
  ctx.strokeStyle = '#63553F';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((d, i) => {
    if (i === 0) ctx.moveTo(xOf(i), yOf(d.kg));
    else ctx.lineTo(xOf(i), yOf(d.kg));
  });
  ctx.stroke();

  // Dots
  data.forEach((d, i) => {
    ctx.beginPath();
    ctx.arc(xOf(i), yOf(d.kg), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#63553F';
    ctx.fill();
    ctx.fillStyle = '#2A2118';
    ctx.font = '10px DM Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d.kg, xOf(i), yOf(d.kg) - 8);
  });
}

// ===== FOOD GUIDE DATA =====
const FOOD_DATA = {
  lunch: [
    { name: 'Wheat Roti', qty: '2 rotis (60g each)', cals: 150, protein: '5g', fiber: '4g', carbs: '30g', tags: ['fiber','healthy'], note: 'Prefer over rice' },
    { name: 'Dal (any)', qty: '1 katori (150g)', cals: 120, protein: '8g', fiber: '6g', carbs: '18g', tags: ['fiber','protein'], note: 'Moong/masoor best' },
    { name: 'Sabzi (bhindi/lauki)', qty: '100g cooked', cals: 50, protein: '2g', fiber: '3g', carbs: '8g', tags: ['fiber','healthy'], note: 'No extra oil' },
    { name: 'Carrot (raw)', qty: '1 medium (80g)', cals: 33, protein: '0.7g', fiber: '2.5g', carbs: '8g', tags: ['fiber'], note: 'Eat raw for max fiber' },
    { name: 'Cucumber', qty: '1 cup sliced (120g)', cals: 16, protein: '0.7g', fiber: '0.5g', carbs: '4g', tags: ['fiber','healthy'], note: 'Great for hydration' },
    { name: 'Buttermilk (chaas)', qty: '200ml (no sugar)', cals: 40, protein: '3g', fiber: '0g', carbs: '5g', tags: ['protein'], note: 'Better than lassi' },
    { name: 'Chana / Rajma', qty: '1 katori (150g)', cals: 135, protein: '9g', fiber: '7g', carbs: '22g', tags: ['fiber','protein'], note: 'When mess serves it' },
  ],
  dinner: [
    { name: 'Wheat Roti', qty: '2 rotis (60g each)', cals: 150, protein: '5g', fiber: '4g', carbs: '30g', tags: ['fiber','healthy'], note: 'Last meal by 9 PM' },
    { name: 'Dal Makhani', qty: '1 katori (150g)', cals: 145, protein: '8g', fiber: '5g', carbs: '20g', tags: ['fiber','protein'], note: 'Skip extra butter' },
    { name: 'Any Sabzi', qty: '100g cooked', cals: 60, protein: '2g', fiber: '3g', carbs: '10g', tags: ['fiber'], note: 'Avoid fried versions' },
    { name: 'Carrot + Cucumber Salad', qty: '80g + 100g', cals: 45, protein: '1.5g', fiber: '3g', carbs: '10g', tags: ['fiber'], note: 'Add lemon + chat masala' },
    { name: 'Rajma / Chole', qty: '1 katori (150g)', cals: 140, protein: '9g', fiber: '8g', carbs: '23g', tags: ['fiber','protein'], note: 'Best dinner protein' },
  ],
  snack: [
    { name: 'Apple', qty: '1 medium (180g)', cals: 95, protein: '0.5g', fiber: '4.5g', carbs: '25g', tags: ['fiber'], note: 'Best 4 PM snack' },
    { name: 'Roasted Chana', qty: '30g (small handful)', cals: 100, protein: '6g', fiber: '3g', carbs: '14g', tags: ['fiber','protein'], note: 'Carry in pocket!' },
    { name: 'Banana', qty: '1 medium (120g)', cals: 105, protein: '1.3g', fiber: '3.1g', carbs: '27g', tags: ['fiber'], note: 'Pre-workout snack' },
    { name: 'Peanuts (unsalted)', qty: '25g', cals: 142, protein: '6.5g', fiber: '2.5g', carbs: '4g', tags: ['protein'], note: 'Keep within 25g' },
    { name: 'Milk (whole)', qty: '200ml', cals: 122, protein: '6g', fiber: '0g', carbs: '10g', tags: ['protein'], note: 'No sugar, no Horlicks' },
    { name: 'Oats (cooked)', qty: '40g dry → 200g cooked', cals: 150, protein: '5g', fiber: '4g', carbs: '27g', tags: ['fiber','healthy'], note: 'Weekend power snack' },
  ],
  cook: [
    { name: 'Poha', qty: '1.5 cups (90g dry)', cals: 250, protein: '5g', fiber: '3g', carbs: '52g', tags: ['healthy'], note: 'Add grated carrot + peas' },
    { name: 'Upma', qty: '1 cup suji (80g dry)', cals: 240, protein: '6g', fiber: '3.5g', carbs: '46g', tags: ['healthy'], note: 'Add carrot + beans + peas' },
    { name: 'Paneer Bhurji', qty: '100g paneer', cals: 265, protein: '18g', fiber: '2g', carbs: '6g', tags: ['protein'], note: 'Best weekend protein' },
    { name: 'Moong Dal Chilla', qty: '2 chillas (60g dal)', cals: 190, protein: '12g', fiber: '5g', carbs: '28g', tags: ['fiber','protein'], note: 'Dinner champion!' },
    { name: 'Oats Bowl', qty: '40g oats + 150ml milk', cals: 230, protein: '9g', fiber: '4.5g', carbs: '36g', tags: ['fiber','protein'], note: 'Add banana + flaxseeds' },
    { name: 'Flaxseeds', qty: '1 tsp (5g) — add to anything', cals: 27, protein: '1g', fiber: '2g', carbs: '1.5g', tags: ['fiber'], note: 'Daily add-on, must have' },
  ]
};

function showFoodCat(cat, el) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderFoodGuide(cat);
}

function renderFoodGuide(cat) {
  const data = FOOD_DATA[cat] || [];
  document.getElementById('food-list').innerHTML = data.map(f => `
    <div class="food-card">
      <div class="fc-name">${f.name}</div>
      <div class="fc-qty">${f.qty}</div>
      <div class="fc-details">
        <div class="fc-row"><span class="fc-key">Calories</span><span class="fc-val">${f.cals} kcal</span></div>
        <div class="fc-row"><span class="fc-key">Protein</span><span class="fc-val">${f.protein}</span></div>
        <div class="fc-row"><span class="fc-key">Fiber</span><span class="fc-val">${f.fiber}</span></div>
        <div class="fc-row"><span class="fc-key">Carbs</span><span class="fc-val">${f.carbs}</span></div>
        <div class="fc-row"><span class="fc-key">Tip</span><span class="fc-val">${f.note}</span></div>
      </div>
      <div class="fc-tags">
        ${f.tags.map(t => `<span class="fc-tag ${t}">${t}</span>`).join('')}
      </div>
    </div>`).join('');
}

// Reset water daily
function checkDailyReset() {
  const lastDate = load('last_date', '');
  const today = todayStr();
  if (lastDate !== today) {
    STATE.water = 0;
    save('water', 0);
    save('last_date', today);
  }
}

// ===== INIT =====
function init() {
  loadAll();
  checkDailyReset();
  renderDashboard();
  renderMeals();
  renderWater();
  renderWeightHistory();
  renderFoodGuide('lunch');

  // Resume fast if active
  if (STATE.fast.active && STATE.fast.startTime) {
    document.getElementById('fast-btn').textContent = 'End Fast';
    document.getElementById('fast-start-time').textContent = formatTime(STATE.fast.startTime);
    startFastTick();
  }
}

init();

// ===== COOK GUIDE =====
const RECIPES = {

  poha: {
    title: 'Poha',
    desc: 'Flattened rice — light, filling, fiber-rich. Best lunch for weight loss. Easy 15-min cook.',
    time: '15 min', serves: '1 serving', cal: '~250 kcal', oilFree: false,
    oil: { amount: '1 tsp (4–5ml)', type: 'Mustard oil or any oil', tip: 'Just 1 tsp is enough. Use non-stick pan to reduce to ½ tsp. Never deep fry — just a light temper.' },
    ingredients: [
      { name: 'Thick poha (flattened rice)', qty: '90g (1.5 cups)', note: 'Rinse in water for 2 min' },
      { name: 'Onion', qty: '1 small (50g)', note: 'Finely chopped' },
      { name: 'Green peas', qty: '2 tbsp (30g)', note: 'Fresh or frozen' },
      { name: 'Carrot (grated)', qty: '½ small (40g)', note: 'Adds fiber' },
      { name: 'Green chilli', qty: '1 small', note: 'Slit — skip if sensitive' },
      { name: 'Mustard seeds', qty: '¼ tsp', note: 'For tempering' },
      { name: 'Turmeric', qty: '¼ tsp', note: '' },
      { name: 'Salt', qty: 'To taste', note: '' },
      { name: 'Lemon juice', qty: '½ lemon', note: 'Squeeze at end' },
      { name: 'Coriander leaves', qty: 'Handful', note: 'For garnish' },
      { name: 'Oil', qty: '1 tsp (4ml)', note: 'Non-stick reduces to ½ tsp' },
    ],
    steps: [
      { action: 'Rinse the poha', detail: 'Put poha in a strainer, rinse under water for 2 minutes. Shake off excess water. Let it sit 5 minutes — it softens automatically. Do NOT soak in bowl.', tip: 'Poha should be soft but not mushy — it should hold shape' },
      { action: 'Heat pan', detail: 'Use a non-stick pan on medium flame. Add 1 tsp oil. Wait 30 seconds till hot.', tip: 'Non-stick = less oil needed. Cast iron also works well.' },
      { action: 'Tempering', detail: 'Add mustard seeds. Wait till they splutter (10–15 sec). Then add green chilli and onion. Cook 2–3 minutes till onion turns soft and slightly golden.', tip: 'Medium flame only — high flame burns mustard seeds' },
      { action: 'Add veggies', detail: 'Add peas and grated carrot. Mix well. Cook 2 minutes. Add turmeric and salt. Mix.', tip: 'Carrot gives crunch + fiber — do not skip it' },
      { action: 'Add poha', detail: 'Add the softened poha. Mix gently with the veggies. Cook on low flame for 2–3 minutes. Keep folding, do not press hard.', tip: 'Low flame is key — high flame makes poha dry and sticky' },
      { action: 'Finish & serve', detail: 'Turn off flame. Squeeze lemon juice. Add coriander leaves. Mix once. Eat immediately.', tip: 'Lemon adds vitamin C — helps with iron absorption' },
    ],
    tips: [
      'Never cover with lid while cooking — poha becomes soggy',
      'Thick poha works better than thin for weight loss (more fiber)',
      'Add 1 tsp flaxseeds after cooking for extra fiber',
      'Leftover poha turns dry — always make fresh',
      'No sugar! Some recipes add it — skip completely',
    ]
  },

  upma: {
    title: 'Upma',
    desc: 'Semolina (suji) cooked with veggies. High carb but filling — add lots of veggies to balance.',
    time: '20 min', serves: '1 serving', cal: '~240 kcal', oilFree: false,
    oil: { amount: '1 tsp (4–5ml)', type: 'Any cooking oil or ghee (½ tsp ghee = better flavor)', tip: 'Roasting suji in dry pan first (no oil) reduces oil needed later. Use 1 tsp max.' },
    ingredients: [
      { name: 'Semolina (suji/rava)', qty: '80g (½ cup)', note: 'Coarse suji preferred' },
      { name: 'Water', qty: '1.5 cups (360ml)', note: 'For 1:2 ratio' },
      { name: 'Onion', qty: '1 small (50g)', note: 'Chopped' },
      { name: 'Carrot', qty: '1 small (80g)', note: 'Diced small' },
      { name: 'Beans / peas', qty: '3 tbsp (40g)', note: 'Mixed veggies' },
      { name: 'Ginger', qty: '½ inch piece', note: 'Grated or fine chopped' },
      { name: 'Green chilli', qty: '1–2', note: 'Slit' },
      { name: 'Mustard seeds', qty: '½ tsp', note: '' },
      { name: 'Curry leaves', qty: '6–8 leaves', note: 'If available' },
      { name: 'Urad dal', qty: '½ tsp', note: 'Optional — adds texture' },
      { name: 'Salt', qty: 'To taste', note: '' },
      { name: 'Lemon juice', qty: '½ lemon', note: '' },
      { name: 'Oil', qty: '1 tsp (4ml)', note: '' },
    ],
    steps: [
      { action: 'Dry roast suji', detail: 'On medium flame, add raw suji to pan (NO oil). Roast while stirring continuously for 3–4 minutes till it turns light golden and smells nutty.', tip: 'This is the most important step — under-roasted suji = lumpy upma' },
      { action: 'Remove suji, heat oil', detail: 'Take roasted suji out in a plate. In same pan, heat 1 tsp oil. Add mustard seeds, wait to splutter. Add urad dal (30 sec), then curry leaves and chilli.', tip: 'Keep flame on medium the whole time' },
      { action: 'Cook onion & veggies', detail: 'Add onion and ginger. Cook 2–3 minutes till soft. Add carrot, beans, peas. Cook 3 minutes. Add salt. Mix well.', tip: 'Veggies should be slightly tender but not fully cooked yet' },
      { action: 'Add water', detail: 'Pour 1.5 cups water into the pan. Increase flame. Bring to a rolling boil. Add extra salt now if needed.', tip: 'Water must be fully boiling before adding suji — this prevents lumps' },
      { action: 'Add suji slowly', detail: 'Reduce flame to low. Add roasted suji slowly with one hand while stirring constantly with other hand. Mix quickly — no breaks.', tip: 'Slow addition + constant stirring = no lumps. This step takes only 60 seconds.' },
      { action: 'Cook & rest', detail: 'Mix well, cover with lid. Cook on lowest flame for 3 minutes. Turn off flame. Let it rest covered for 2 minutes.', tip: 'Do not open lid during these 3 minutes' },
      { action: 'Finish', detail: 'Open lid, squeeze lemon, add coriander. Fluff with spoon. Serve hot.', tip: 'Add a teaspoon of grated coconut if available — tastes great' },
    ],
    tips: [
      'Suji ratio: 1 part suji : 2 parts water — always follow this',
      'Dry roasting suji is non-negotiable — never skip',
      'More veggies = more fiber = more filling. Use what is available',
      'No need to add ghee if using oil — pick one',
      'Eat within 20 minutes — upma hardens as it cools',
    ]
  },

  chapathi: {
    title: 'Wheat Chapathi',
    desc: 'Whole wheat flatbread — no oil needed inside. Just water, flour, and technique. 2 chapathis = 1 serving.',
    time: '25 min', serves: '2 chapathis', cal: '~150 kcal', oilFree: true,
    oil: { amount: 'ZERO oil in dough or cooking', type: 'Oil-free', tip: 'True chapathi needs no oil. If pan sticks, wipe with dry cloth. A good iron tawa = no oil needed. You can apply a tiny smear of ghee (¼ tsp) after cooking on top — this is traditional and the right way.' },
    ingredients: [
      { name: 'Whole wheat flour (atta)', qty: '80g (2 chapathis)', note: 'Use fresh chakki atta if possible' },
      { name: 'Water', qty: '40–45ml (warm)', note: 'Warm water = softer dough' },
      { name: 'Salt', qty: 'Pinch', note: 'Optional but helps taste' },
    ],
    steps: [
      { action: 'Make dough', detail: 'Take flour in a bowl. Add salt. Add warm water slowly — a little at a time. Mix with fingers. Knead for 5–7 minutes until dough is smooth, soft, and not sticky. It should be softer than playdough.', tip: 'If dough tears when rolled, it is too dry. Add a few drops of water. If it sticks to board, it is too wet.' },
      { action: 'Rest the dough', detail: 'Cover dough with a plate or damp cloth. Rest for 10–15 minutes minimum. This is called "resting" — gluten relaxes, chapathi rolls out thinner.', tip: 'Longer rest = softer chapathi. 15 min minimum, 30 min is ideal.' },
      { action: 'Divide & ball', detail: 'Divide dough into 2 equal portions. Roll each into a smooth ball between your palms. No cracks on surface.', tip: 'Both balls must be same size for even cooking' },
      { action: 'Roll out', detail: 'Dust board lightly with dry flour. Place ball, press slightly. Roll with rolling pin in all directions — rotate dough 90° every few rolls. Target: 2–3mm thickness, 20–22cm diameter circle.', tip: 'Apply even pressure. Thick middle = uneven cooking. Practice makes perfect!' },
      { action: 'Heat tawa', detail: 'Place iron tawa (or non-stick) on high flame. Heat for 1–2 minutes till very hot. Tawa must be HOT before chapathi goes on.', tip: 'Test: sprinkle few drops of water — they should evaporate instantly.' },
      { action: 'First side cook', detail: 'Place chapathi on hot tawa. Cook on medium-high for 30–45 seconds. You will see small bubbles forming on top. When bottom has light brown spots — flip.', tip: 'Do not press or move. One flip only on tawa.' },
      { action: 'Second side cook', detail: 'Cook second side for 30 seconds. Small brown spots appear. Now move to direct flame (gas burner) using tongs.', tip: 'If using induction, press gently with folded cloth — it puffs up.' },
      { action: 'Puff on flame', detail: 'Place chapathi directly on gas flame (medium). It puffs up like a balloon in 5–10 seconds. Flip once. Both sides 5 seconds each. Done!', tip: 'Puffing means steam inside = soft chapathi. No puff = still edible but denser.' },
      { action: 'Store properly', detail: 'Place in a closed container or wrap in cloth. Stack them — they stay soft. Eat within 2 hours. Reheat on tawa 30 seconds each side.', tip: 'Never refrigerate fresh chapathi — it hardens' },
    ],
    tips: [
      'Soft dough = soft chapathi. Spend 7 minutes kneading properly',
      'Resting dough is not optional — 15 min minimum',
      'Tawa must be very hot when chapathi hits it',
      'The direct flame puff step is what makes restaurant-quality chapathi',
      'Make 4–6 at a time — dough keeps in fridge for 2 days (wrap in cling film)',
      'No oil in cooking = saves 40 kcal per chapathi vs paratha',
    ]
  },

  dal: {
    title: 'Dal Curry',
    desc: 'High protein, high fiber. The most important part of your meal. Moong/masoor dal = best for weight loss.',
    time: '25 min', serves: '2 servings', cal: '~120 kcal per serving', oilFree: false,
    oil: { amount: '1 tsp (4–5ml) for tadka', type: 'Any oil — mustard or sunflower', tip: 'Tadka (tempering) is just 1 tsp. You can make zero-oil dal by skipping tadka entirely and just boiling with spices. Tastes slightly different but 100% healthy.' },
    ingredients: [
      { name: 'Moong / Masoor / Toor dal', qty: '80g (⅓ cup dry)', note: 'Rinse 3–4 times till water is clear' },
      { name: 'Water', qty: '2 cups (480ml)', note: 'For pressure cooking' },
      { name: 'Tomato', qty: '1 medium (100g)', note: 'Chopped' },
      { name: 'Onion', qty: '½ medium (40g)', note: 'Chopped' },
      { name: 'Ginger-garlic paste', qty: '½ tsp', note: 'Or fresh grated' },
      { name: 'Turmeric', qty: '¼ tsp', note: '' },
      { name: 'Cumin seeds', qty: '½ tsp', note: 'For tadka' },
      { name: 'Red chilli powder', qty: '¼ tsp', note: 'Adjust to taste' },
      { name: 'Garam masala', qty: 'Pinch', note: 'At the end' },
      { name: 'Salt', qty: 'To taste', note: '' },
      { name: 'Coriander leaves', qty: 'Handful', note: 'Garnish' },
      { name: 'Oil', qty: '1 tsp (4ml)', note: 'For tadka only' },
      { name: 'Lemon juice', qty: '½ lemon', note: 'At the end' },
    ],
    steps: [
      { action: 'Wash dal', detail: 'Rinse dal 3–4 times in water till water runs mostly clear. Soak for 20 minutes if time allows (optional but helps cook faster).', tip: 'Rinsing removes excess starch and any dust' },
      { action: 'Pressure cook dal', detail: 'Add rinsed dal + 2 cups water + turmeric + salt to pressure cooker. Cook on high till 2 whistles. Then low flame 5 minutes. Turn off, wait for pressure to release naturally.', tip: 'No pressure cooker? Use a pot — boil 20–25 minutes till dal is fully soft and mashable.' },
      { action: 'Check consistency', detail: 'Open cooker. Dal should be soft and slightly mushy. Mash half of it with a spoon — this thickens the dal naturally without adding anything.', tip: 'If too thick, add ½ cup hot water. If too thin, cook open 5 more minutes.' },
      { action: 'Make tadka', detail: 'In a small pan, heat 1 tsp oil on high flame. Add cumin seeds — wait 10 seconds till they sizzle. Add onion, cook 2 min. Add ginger-garlic paste, 1 min. Add tomato + chilli powder. Cook 3–4 min till tomato is fully mushy.', tip: 'Tadka must be cooked completely — raw tomato smell = not done yet' },
      { action: 'Combine', detail: 'Pour the tadka into the cooked dal. Mix well. Taste for salt. Add a pinch of garam masala. Boil together for 2 minutes on medium flame.', tip: 'Dal and tadka must boil together — this marries the flavors' },
      { action: 'Finish', detail: 'Turn off flame. Add lemon juice and coriander leaves. Stir and serve hot with chapathi or rice.', tip: 'Lemon at the end preserves Vitamin C — heat destroys it if added early' },
    ],
    tips: [
      'Moong dal = lightest, easiest to digest, best for weight loss',
      'Masoor dal = higher protein than moong, slightly heavier',
      'Never overcook — dal should be soft but not paste-like',
      'Zero-oil version: skip tadka, just add raw spices while pressure cooking',
      'Dal keeps well for 2 days in fridge — make a big batch',
      'Eat dal daily — it is your most important protein source (veg)',
    ]
  },

  sabzi: {
    title: 'Sabzi (Dry Vegetable Curry)',
    desc: 'Bhindi, lauki, gobi, aloo — any sabzi. Low oil cooking method that keeps veggies nutritious.',
    time: '20 min', serves: '2 servings', cal: '~60–80 kcal per serving', oilFree: false,
    oil: { amount: '1 tsp (4–5ml) maximum', type: 'Any oil', tip: 'Use non-stick pan — reduces oil to ½ tsp. Dry-roast spices before adding veggies to get full flavor without extra oil. Never deep fry sabzi.' },
    ingredients: [
      { name: 'Vegetable of choice', qty: '200g', note: 'Bhindi/lauki/gobi/aloo' },
      { name: 'Onion', qty: '1 small (50g)', note: 'Sliced thin' },
      { name: 'Tomato', qty: '1 small (80g)', note: 'Chopped — optional' },
      { name: 'Cumin seeds', qty: '½ tsp', note: '' },
      { name: 'Turmeric', qty: '¼ tsp', note: '' },
      { name: 'Coriander powder', qty: '½ tsp', note: '' },
      { name: 'Red chilli powder', qty: '¼ tsp', note: 'Adjust' },
      { name: 'Amchur / Lemon juice', qty: '½ tsp / ½ lemon', note: 'For sourness' },
      { name: 'Salt', qty: 'To taste', note: '' },
      { name: 'Oil', qty: '1 tsp (4ml)', note: 'Non-stick = ½ tsp' },
    ],
    steps: [
      { action: 'Prep vegetables', detail: 'Wash and chop vegetables into even pieces. For bhindi — dry completely before cutting (wet bhindi = slimy). For aloo — cut small. For gobi — break into small florets.', tip: 'Even cuts = even cooking. Do not mix sizes.' },
      { action: 'Heat pan', detail: 'Heat non-stick pan on medium. Add 1 tsp oil. When hot (20 sec), add cumin seeds. Wait till they sizzle.', tip: 'Cumin seeds should sizzle — if not, pan is not hot enough' },
      { action: 'Add onion', detail: 'Add sliced onion. Cook on medium for 3–4 minutes till onion turns golden. Stir occasionally — do not burn.', tip: 'Properly cooked onion = sweet base flavor. Undercooking = sharp raw taste.' },
      { action: 'Add dry spices', detail: 'Reduce to low flame. Add turmeric, coriander powder, chilli powder. Mix with onion. Cook 30 seconds — raw spice smell will turn nutty.', tip: 'Always add spices on low flame — high flame burns spices and makes them bitter' },
      { action: 'Add vegetables', detail: 'Add the chopped vegetables. Increase to medium flame. Mix everything well. Add salt. Cover with lid on low flame. Cook 8–12 minutes (depends on vegetable).', tip: 'Check every 3 min. Stir gently. Add 2 tbsp water if sticking.' },
      { action: 'Dry it out', detail: 'Remove lid. Cook on medium for 2 minutes to remove extra moisture. Sabzi should be dry, not watery.', tip: 'Dry sabzi lasts longer and tastes better with chapathi' },
      { action: 'Finish', detail: 'Add tomato (if using) last 2 minutes. Add amchur or lemon juice. Add coriander. Mix. Done.', tip: 'Amchur > lemon for dry sabzi — it does not make sabzi wet' },
    ],
    tips: [
      'Bhindi tip: dry bhindi completely before cutting — this removes the sliminess',
      'Do not add water to bhindi — it becomes slimy',
      'Lauki (bottle gourd) is best for weight loss — 90% water, very low cal',
      'Palak (spinach) needs zero oil — just steam with spices and tadka',
      'Mix 2 veggies (bhindi + onion, gobi + aloo) for better flavor',
      'Non-stick pan is your best investment for low-oil cooking',
    ]
  },

  paneer: {
    title: 'Paneer Bhurji',
    desc: 'Scrambled paneer with spices. Highest protein veg dish. Best weekend dinner or lunch.',
    time: '15 min', serves: '1 serving', cal: '~265 kcal', oilFree: false,
    oil: { amount: '1 tsp (4–5ml)', type: 'Any oil', tip: 'Paneer itself has fat — so no need for extra oil. 1 tsp is maximum. Some people use ½ tsp and rely on the onion-tomato moisture. Try that first.' },
    ingredients: [
      { name: 'Paneer (low-fat preferred)', qty: '100g', note: 'Crumble by hand' },
      { name: 'Onion', qty: '1 small (50g)', note: 'Finely chopped' },
      { name: 'Tomato', qty: '1 medium (100g)', note: 'Finely chopped' },
      { name: 'Capsicum', qty: '½ (50g)', note: 'Diced — adds fiber' },
      { name: 'Green chilli', qty: '1', note: 'Finely chopped' },
      { name: 'Ginger', qty: '½ inch', note: 'Grated' },
      { name: 'Turmeric', qty: '¼ tsp', note: '' },
      { name: 'Cumin powder', qty: '¼ tsp', note: '' },
      { name: 'Red chilli powder', qty: '¼ tsp', note: '' },
      { name: 'Garam masala', qty: 'Pinch', note: '' },
      { name: 'Salt', qty: 'To taste', note: '' },
      { name: 'Coriander leaves', qty: 'Handful', note: '' },
      { name: 'Oil', qty: '1 tsp (4ml)', note: '' },
    ],
    steps: [
      { action: 'Crumble paneer', detail: 'Break paneer into small crumbles with your fingers or a fork. Size should be like scrambled egg crumbles — not too fine, not too chunky. Keep aside.', tip: 'Do not grate paneer — you lose the scrambled texture' },
      { action: 'Heat oil', detail: 'Heat pan on medium. Add 1 tsp oil. Add ginger and green chilli. Sauté 30 seconds.', tip: 'Medium flame throughout — paneer burns quickly on high heat' },
      { action: 'Cook onion', detail: 'Add chopped onion. Cook 3–4 minutes till translucent and slightly golden. Do not rush this step.', tip: 'Well-cooked onion makes the bhurji sweeter and more flavorful' },
      { action: 'Add spices + tomato', detail: 'Add turmeric, cumin powder, chilli powder. Mix 30 seconds. Add chopped tomato and capsicum. Cook 4–5 minutes till tomato is fully cooked and oil separates from edges.', tip: '"Oil separating from edges" is how you know tomato-masala is done. Do not skip this.' },
      { action: 'Add paneer', detail: 'Add crumbled paneer. Mix gently. Cook on medium for 3 minutes. Fold — do not stir aggressively or paneer breaks down too much.', tip: 'Keep some texture — small pieces visible. Over-mixing = paste.' },
      { action: 'Finish', detail: 'Add salt to taste. Add garam masala. Add coriander leaves. Mix once. Turn off. Serve hot.', tip: 'Eat with 2 chapathis and raw cucumber on side — perfect macro meal' },
    ],
    tips: [
      'Buy low-fat paneer (toned milk paneer) — saves ~40 kcal per 100g',
      'Paneer must be at room temperature — cold paneer crumbles differently',
      'Add capsicum — it adds fiber + Vitamin C without calories',
      'No cream, no butter — the base recipe is complete without them',
      '100g paneer = ~18g protein — your best veg protein source',
      'Pairs best with 2 chapathi + raw carrot-cucumber salad',
    ]
  },

  chilla: {
    title: 'Moong Dal Chilla',
    desc: 'Protein-rich lentil pancakes. High fiber, filling, healthy. Like a dosa but easier and more nutritious.',
    time: '20 min + 4hr soak', serves: '2 chillas', cal: '~190 kcal', oilFree: false,
    oil: { amount: '½ tsp (2ml) per chilla', type: 'Oil spray or brush — not pour', tip: 'Use a brush or oil spray — never pour oil directly. Non-stick pan means you need just a light wipe of oil. Total: ½ tsp for 2 chillas.' },
    ingredients: [
      { name: 'Yellow moong dal', qty: '60g dry (soaked = ~120g)', note: 'Soak 4–6 hours minimum' },
      { name: 'Water', qty: '4–5 tbsp', note: 'For grinding — add slowly' },
      { name: 'Ginger', qty: '½ inch', note: '' },
      { name: 'Green chilli', qty: '1', note: '' },
      { name: 'Onion', qty: '2 tbsp chopped', note: 'Add to batter' },
      { name: 'Coriander leaves', qty: '2 tbsp', note: '' },
      { name: 'Cumin seeds', qty: '¼ tsp', note: '' },
      { name: 'Turmeric', qty: '¼ tsp', note: '' },
      { name: 'Salt', qty: 'To taste', note: '' },
      { name: 'Oil', qty: '½ tsp per chilla', note: 'Apply with brush' },
    ],
    steps: [
      { action: 'Soak dal', detail: 'Rinse moong dal 3 times. Soak in water for 4–6 hours (or overnight). It doubles in volume. Drain before grinding.', tip: 'Plan ahead — soak before sleeping for morning chilla, or morning for evening cook' },
      { action: 'Grind to batter', detail: 'Add soaked dal to blender. Add ginger, green chilli, turmeric, cumin, salt. Add 3 tbsp water. Blend to smooth thick batter. Should be like dosa batter — thick but pourable.', tip: 'Do not add too much water — thick batter = thick chilla that holds shape. Watery = breaks.' },
      { action: 'Add veggies to batter', detail: 'Add finely chopped onion and coriander to batter. Mix well. Let batter rest 5 minutes.', tip: 'You can also add grated carrot, capsicum, or spinach — boosts fiber' },
      { action: 'Heat pan', detail: 'Heat non-stick pan on medium-high for 2 minutes. Reduce to medium. Wipe pan with oil-soaked cloth or use ¼ tsp oil spread with brush.', tip: 'Pan must be at medium heat — too hot burns the outside, too cool sticks' },
      { action: 'Pour & spread', detail: 'Pour 1 ladle of batter in center. Quickly spread in circular motion from center outward — like making a dosa. Make it thin (3–4mm). Let it cook undisturbed.', tip: 'Spread fast — batter sets quickly. Do not press after spreading.' },
      { action: 'Cook first side', detail: 'Cook on medium for 2–3 minutes. You will see edges turning slightly dry and golden. Bubbles appear on top. When it easily lifts from pan — it is ready to flip.', tip: 'Do not flip too early — it will break. Wait for edges to look cooked.' },
      { action: 'Flip & finish', detail: 'Flip once. Cook other side 1–2 minutes till golden spots appear. Slide onto plate. Repeat for second chilla.', tip: 'Second side takes less time than first — watch it closely' },
      { action: 'Serve', detail: 'Eat hot with mint chutney or plain curd (no sugar). Add raw cucumber on side.', tip: 'Moong chilla + curd = complete protein + probiotic meal' },
    ],
    tips: [
      'Soaking is the only slow part — everything else is 15 min',
      'Batter must be thick — if too thin, add 1 tbsp soaked dal and re-blend',
      'Non-stick pan is mandatory — steel pan will stick badly',
      'Store leftover batter in fridge for up to 2 days',
      'Each chilla = ~6g protein. Two chillas = ~12g protein — good dinner',
      'Add grated paneer on top while cooking for extra protein',
    ]
  },

  oats: {
    title: 'Oats Bowl',
    desc: 'Highest fiber breakfast/snack. Keeps you full for 3–4 hours. Zero cooking skill needed.',
    time: '8 min', serves: '1 bowl', cal: '~230 kcal', oilFree: true,
    oil: { amount: 'ZERO oil', type: 'Completely oil-free', tip: 'Oats bowl needs zero oil. Cook in milk or water. All nutrition comes from oats, milk, and fruit. This is your cleanest meal.' },
    ingredients: [
      { name: 'Rolled oats (not instant)', qty: '40g (½ cup dry)', note: 'Old-fashioned rolled oats preferred' },
      { name: 'Milk (low-fat)', qty: '150ml', note: 'Or mix 75ml milk + 75ml water' },
      { name: 'Banana', qty: '½ medium (60g)', note: 'Sliced — add after cooking' },
      { name: 'Flaxseeds', qty: '1 tsp (5g)', note: 'Add after cooking' },
      { name: 'Cinnamon powder', qty: 'Pinch', note: 'Natural blood sugar control' },
      { name: 'Salt', qty: 'Tiny pinch', note: 'Balances the flavor' },
      { name: 'Honey / Jaggery', qty: '½ tsp max', note: 'Optional — only if needed' },
    ],
    steps: [
      { action: 'Measure oats', detail: 'Take 40g (½ cup) rolled oats in a small pot or saucepan. Do not use instant oats — they have less fiber and process faster (worse for blood sugar).', tip: 'Rolled oats > instant oats for weight loss always' },
      { action: 'Add liquid', detail: 'Add 150ml milk (or water+milk mix). Add a tiny pinch of salt. Mix.', tip: 'More liquid = creamier oats. Less = thicker. Start with 150ml and adjust.' },
      { action: 'Cook on low flame', detail: 'Turn flame to low-medium. Cook while stirring slowly. Takes 5–6 minutes. Oats absorb liquid and become thick and creamy. When it looks like porridge — done.', tip: 'Never leave unattended — milk boils over quickly. Stir every 30 seconds.' },
      { action: 'Turn off flame', detail: 'When oats are soft and creamy, turn off flame. Add cinnamon. Mix. Let sit 1 minute — it thickens a bit more as it sits.', tip: 'If too thick, add 2 tbsp warm milk and stir' },
      { action: 'Add toppings', detail: 'Pour into bowl. Add sliced banana on top. Sprinkle flaxseeds. Add ½ tsp honey if you need sweetness.', tip: 'Add toppings AFTER cooking — banana gets mushy if cooked. Flaxseeds lose omega-3 if heated.' },
    ],
    tips: [
      'Rolled oats = best. Instant oats = okay. Steel cut oats = best but takes 20 min',
      'Add 1 tsp chia seeds with flaxseeds — double the fiber',
      'Cinnamon controls blood sugar spikes — use it daily',
      'No sugar! Banana provides all the sweetness needed',
      'Oats keep you full till next meal — best pre-fast meal before 9 PM',
      'Save time: overnight oats — mix oats + milk in jar, fridge overnight, eat cold next day',
    ]
  }
};

function showCookRecipe(id, el) {
  document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderCookRecipe(id);
}

function renderCookRecipe(id) {
  const r = RECIPES[id];
  if (!r) return;

  const oilBadge = r.oilFree
    ? `<span class="rbadge oil-free">Zero Oil</span>`
    : `<span class="rbadge cal">Oil: ${r.oil.amount}</span>`;

  const stepsHtml = r.steps.map((s, i) => `
    <div class="step-item">
      <div class="step-num">${i + 1}</div>
      <div class="step-body">
        <div class="step-action">${s.action}</div>
        <div class="step-detail">${s.detail}</div>
        ${s.tip ? `<div class="step-tip">Tip: ${s.tip}</div>` : ''}
      </div>
    </div>`).join('');

  const ingHtml = r.ingredients.map(ing => `
    <div class="ing-row">
      <div>
        <div class="ing-name">${ing.name}</div>
        ${ing.note ? `<div class="ing-note">${ing.note}</div>` : ''}
      </div>
      <div class="ing-qty">${ing.qty}</div>
    </div>`).join('');

  const tipsHtml = r.tips.map(t => `<div class="tip-item">${t}</div>`).join('');

  document.getElementById('cook-recipe').innerHTML = `
    <div class="recipe-hero">
      <div class="recipe-hero-left">
        <div class="recipe-title">${r.title}</div>
        <div class="recipe-desc">${r.desc}</div>
        <div class="recipe-badges">
          <span class="rbadge time">⏱ ${r.time}</span>
          <span class="rbadge serves">Serves: ${r.serves}</span>
          <span class="rbadge cal">${r.cal}</span>
          ${oilBadge}
        </div>
      </div>
    </div>

    <div class="oil-box">
      <div class="oil-icon">${r.oilFree ? '🚫' : '🫙'}</div>
      <div class="oil-text">
        <strong>Oil: ${r.oil.amount}</strong> — ${r.oil.type}<br/>
        ${r.oil.tip}
      </div>
    </div>

    <div class="recipe-cols">
      <div class="ing-card">
        <div class="ing-title">Ingredients</div>
        <div class="ing-list">${ingHtml}</div>
      </div>
      <div class="steps-card">
        <div class="steps-title">Step-by-step</div>
        ${stepsHtml}
      </div>
    </div>

    <div class="recipe-tips">
      <div class="tips-title">Pro Tips</div>
      <div class="tips-grid">${tipsHtml}</div>
    </div>`;
}

// Init cook page
document.querySelector('[data-page="cook"]')?.addEventListener('click', () => {
  renderCookRecipe('poha');
});

// ===== PWA — SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW failed:', err));
  });
}

// ===== PWA — INSTALL PROMPT =====
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show banner after 3 seconds
  setTimeout(() => {
    const banner = document.getElementById('install-banner');
    if (banner && !localStorage.getItem('pwa_dismissed')) {
      banner.classList.add('show');
    }
  }, 3000);
});

document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('install-banner').classList.remove('show');
  }
  deferredPrompt = null;
});

function dismissInstall() {
  document.getElementById('install-banner').classList.remove('show');
  localStorage.setItem('pwa_dismissed', '1');
}

// Hide banner if already installed
window.addEventListener('appinstalled', () => {
  document.getElementById('install-banner')?.classList.remove('show');
  console.log('FitTrack installed!');
});

// ===== BOTTOM NAV =====
document.querySelectorAll('.bnav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    if (page === 'more') {
      openMore();
      return;
    }
    navigateTo(page);
    document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function openMore() {
  document.getElementById('more-overlay').classList.add('open');
  document.getElementById('more-sheet').classList.add('open');
}
function closeMore() {
  document.getElementById('more-overlay').classList.remove('open');
  document.getElementById('more-sheet').classList.remove('open');
}

function gotoPage(page) {
  closeMore();
  navigateTo(page);
  // deactivate all bottom nav
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
}

function navigateTo(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');
  // Trigger renders
  if (page === 'dashboard') renderDashboard();
  if (page === 'food') renderFoodGuide('lunch');
  if (page === 'weight') renderWeightHistory();
  if (page === 'cook') renderCookRecipe('poha');
  window.scrollTo(0, 0);
}

// Handle URL hash on load (shortcuts from manifest)
window.addEventListener('load', () => {
  const hash = window.location.hash?.replace('#','');
  if (hash && document.getElementById('page-' + hash)) {
    navigateTo(hash);
  }
});

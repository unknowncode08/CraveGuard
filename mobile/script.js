// ========== helpers ==========
const $ = sel => document.querySelector(sel);
const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => JSON.parse(localStorage.getItem(k)) ?? d;

const CAL = {
    apple: 95, banana: 105, egg: 78, breadstick: 150,
    chips: 160, cookies: 150, chocolate: 200, soda: 140,
    'ice cream': 250, fries: 300
};
const JUNK = ['chips', 'cookies', 'chocolate', 'soda', 'ice cream', 'fries'];

import { analyzeFoods } from './gemini.js';

// ========== view system ==========
const screens = {};
const title = $('#title');
const view = $('#view');
const tabs = document.querySelectorAll('.tab');

tabs.forEach(btn =>
    btn.addEventListener('click', () => {
        tabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        screens[btn.dataset.screen]();
    })
);

// ========== Check‑In ==========
screens.checkin = () => {
    title.textContent = 'Check‑In';
    view.innerHTML = `
    <form id="checkForm">
      <label>What are you about to eat?</label>
      <input id="foodInput" required placeholder="e.g. chips">
      <button>Submit</button>
      <div id="result" class="card" style="display:none"></div>
    </form>`;
    /* inside screens.checkin() – after you render #result */

    result.insertAdjacentHTML("beforeend",
        `<button id="tipBtn" class="secondary">Ask Gemini for a tip 🤖</button>`);

    document.getElementById("tipBtn").onclick = async () => {
        tipBtn.disabled = true;
        tipBtn.textContent = "Thinking…";
        try {
            const tip = await askGemini(
                `Give a single practical tip (max 2 sentences) to help
         someone resist eating ${item}. Keep it friendly and actionable.`
            );
            result.insertAdjacentHTML(
                "beforeend",
                `<p class="card" style="margin-top:.7rem"><em>${tip}</em></p>`
            );
        } catch (err) {
            alert("Gemini error, try again later.");
        }
        tipBtn.remove();
    };
    $('#checkForm').onsubmit = e => {
        e.preventDefault();
        const item = $('#foodInput').value.trim().toLowerCase();
        const cal = CAL[item] ?? 150;
        const isJunk = JUNK.some(j => item.includes(j));
        let html = `<h3>${item}</h3><p>≈ ${cal} cal</p>`;
        if (isJunk) {
            html += `<p>~${Math.round(cal / 10)} min jogging</p>
               <p><strong>Swap:</strong> fruit, yogurt, or water first</p>`;
        } else {
            html += '<p>Looks healthy — enjoy!</p>';
        }
        const box = $('#result');
        box.innerHTML = html;
        box.style.display = 'block';
        $('#foodInput').value = '';
    };
};

// ========== Meal Log ==========
screens.logger = () => {
    title.textContent = 'Meal Log';
    const meals = load('meals', []);
    const total = meals.reduce((t, m) => t + m.cal, 0);

    const macros = meals.reduce((o, m) => ({
        p: o.p + m.protein, c: o.c + m.carbs, f: o.f + m.fat
    }), { p: 0, c: 0, f: 0 });

    view.innerHTML = `
    <div class="card"><strong>Today:</strong> ${total} cal</div>
    <div class="card">
    <strong>Today:</strong> ${total} cal<br/>
    P ${macros.p} g | C ${macros.c} g | F ${macros.f} g
    </div>
    <form id="logForm">
      <label>Enter food(s)</label>
      <textarea id="logText" rows="2"
        placeholder="e.g. 1 egg, 1 breadstick"></textarea>
      <button>Add</button>
    </form>
    <div id="mealList"></div>`;

    const render = () =>
        $('#mealList').innerHTML =
        meals.map(m => `<div class="card">${m.desc} (${m.cal} cal)</div>`).join('');
    render();

    mealList.insertAdjacentHTML('afterend',
        `<button id="aiSuggest" class="secondary">What should I eat next? 🤖</button>`);

    document.getElementById('aiSuggest').onclick = async () => {
        aiSuggest.disabled = true; aiSuggest.textContent = "Thinking…";
        const tip = await analyzeFoods(
            `Based on what I've eaten so far today (${total} cal: P${macros.p} C${macros.c} F${macros.f}),
           suggest one meal or snack to hit 40 % protein, 30 % carbs, 30 % fat.`
        );
        mealList.insertAdjacentHTML('beforeend',
            `<p class="card" style="margin-top:.8rem"><em>${tip}</em></p>`);
        aiSuggest.remove();
    };

    logForm.onsubmit = async e => {
        e.preventDefault();
        const desc = logText.value.trim();
        if (!desc) return;

        addBtn.disabled = true;          // UX feedback
        addBtn.textContent = "Analyzing…";

        let entry = { desc, calories: 0, protein: 0, carbs: 0, fat: 0 };

        try {
            const ai = await analyzeFoods(desc);
            entry = {
                desc,
                calories: ai.calories ?? 0,
                protein: ai.protein ?? 0,
                carbs: ai.carbs ?? 0,
                fat: ai.fat ?? 0
            };
        } catch (err) {
            /* fallback: your old quick‑estimate function */
            entry.calories = estimateCalories(desc);
        }

        meals.push(entry);
        store('meals', meals);
        screens.logger();
    };
};

// ========== Junk‑Food Locker ==========
screens.locker = () => {
    title.textContent = 'Junk Food Locker';
    const locker = load('locker', []);
    const streak = load('streak', 0);

    view.innerHTML = `
    <div class="card">Streak: <span class="streak">${streak}</span> days</div>
    <form id="lockForm">
      <label>Add junk food in the house</label>
      <input id="lockInput">
      <button>Add</button>
    </form>
    <div id="lockList"></div>`;

    const render = () =>
        $('#lockList').innerHTML =
        locker.map((item, i) => `
        <div class="card">${item}
          <button class="resist" data-i="${i}">Resisted!</button>
        </div>`).join('');
    render();

    $('#lockList').addEventListener('click', e => {
        if (e.target.classList.contains('resist')) {
            locker.splice(e.target.dataset.i, 1);
            store('locker', locker);
            store('streak', streak + 1);
            screens.locker();
        }
    });

    $('#lockForm').onsubmit = e => {
        e.preventDefault();
        const val = $('#lockInput').value.trim();
        if (val) locker.push(val);
        store('locker', locker);
        screens.locker();
    };
};

// ========== Progress ==========
screens.progress = () => {
    title.textContent = 'Progress';
    const weights = load('weights', []);
    view.innerHTML = `
    <form id="wForm">
      <label>Weight (lbs)</label>
      <input type="number" step="0.1" id="wInput">
      <button>Save</button>
    </form>
    <canvas id="chart" height="300"></canvas>`;

    $('#wForm').onsubmit = e => {
        e.preventDefault();
        const w = parseFloat($('#wInput').value);
        if (w) {
            weights.push([new Date().toLocaleDateString(), w]);
            store('weights', weights);
            screens.progress();
        }
    };

    if (weights.length) {
        new Chart($('#chart'), {
            type: 'line',
            data: {
                labels: weights.map(x => x[0]),
                datasets: [{ label: 'Weight', data: weights.map(x => x[1]) }]
            },
            options: { scales: { y: { beginAtZero: false } }, responsive: true }
        });
    }
};

// ========== Plan ==========
screens.plan = () => {
    title.textContent = 'Today’s Plan';
    view.innerHTML = `
    <form id="pForm">
      <label>Food you have on hand</label>
      <textarea id="pText" rows="2"
        placeholder="e.g. eggs, chicken, rice"></textarea>
      <button>Generate</button>
    </form>
    <div id="pOut"></div>`;

    $('#pForm').onsubmit = e => {
        e.preventDefault();
        const foods = $('#pText').value.toLowerCase()
            .split(/[,;]/).map(s => s.trim()).filter(Boolean);
        const meals = ['Breakfast', 'Lunch', 'Dinner'];
        const workouts = ['15 min HIIT', '20 min brisk walk',
            '10 min jump‑rope', '30 push‑ups + 30 s plank'];

        $('#pOut').innerHTML =
            meals.map(m => `
        <div class="card"><h3>${m}</h3>
        <p>${foods[Math.floor(Math.random() * foods.length)] ?? 'oats & fruit'}</p></div>`
            ).join('') +
            `<div class="card"><h3>Mini‑Workout</h3>
        <p>${workouts[Math.floor(Math.random() * workouts.length)]}</p></div>`;
    };
};

// ---------- init ----------
screens.checkin();

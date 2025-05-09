// Initialize Firebase
firebaseConfig = {
    apiKey: "AIzaSyA9OshCFN-q6g2hRtWstRaVMNP6JZROXfQ",
    authDomain: "craveguard-e5d95.firebaseapp.com",
    projectId: "craveguard-e5d95",
    storageBucket: "craveguard-e5d95.firebasestorage.app",
    messagingSenderId: "804689712535",
    appId: "1:804689712535:web:bbb0c9d3540e274d16a0d2"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

function showSetupForm() {
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("userSetup").classList.remove("hidden");
}

async function signUp() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const age = parseInt(document.getElementById("setupAge").value);
    const weight = parseFloat(document.getElementById("setupWeight").value);
    const height = parseFloat(document.getElementById("setupHeight").value);
    const sex = document.getElementById("setupSex").value;
    const activity = parseFloat(document.getElementById("setupActivity").value);
    const goal = document.getElementById("setupGoal").value;

    if (!email || !password || !age || !weight || !height || !sex || !activity || !goal) {
        alert("Please fill in all fields before signing up.");
        return;
    }

    const baseData = { age, weight, height, sex, activity, goal };
    const userData = calculateGoals(baseData);

    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCred.user.uid;
        await db.collection("users").doc(uid).set(userData);
        enterApp(userData, email.split("@")[0]);
    } catch (err) {
        alert(err.message);
    }
}

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // e.g. 2025-05-07
}

function enterApp(userData, name = "User") {
    localStorage.setItem("craveguard_user", JSON.stringify(userData));
    updateCalorieProgress();

    const today = getLocalDateString();
    console.log(today);
    loadLogForDate(today);

    document.getElementById("authScreen")?.remove();
    document.getElementById("userSetup")?.remove();
    document.getElementById("loginScreen")?.remove();

    document.getElementById("userGreeting").classList.remove("hidden");
    document.getElementById("username").textContent = name;

    displayGoalSummary(userData);
    loadFiveDayTrend();
}

function signOut() {
    auth.signOut().then(() => location.reload());
}

function calculateGoals(user) {
    const { weight, height, age, sex, activity, goal } = user;
    const weightKg = weight * 0.453592;
    const heightCm = height * 2.54;
    const BMR = sex === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    let TDEE = BMR * activity;
    if (goal === "lose") TDEE -= 500;
    if (goal === "gain") TDEE += 250;
    const protein = weight;
    const fat = weight * 0.35;
    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const carbs = (TDEE - proteinCals - fatCals) / 4;

    return {
        ...user,
        calories: Math.round(TDEE),
        protein: Math.round(protein),
        fat: Math.round(fat),
        carbs: Math.round(carbs)
    };
}

async function signInWithEmail() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, password);
        const doc = await db.collection("users").doc(userCred.user.uid).get();
        enterApp(doc.data(), userCred.user.displayName || email.split("@")[0]);
    } catch (err) {
        alert(err.message);
    }
}

function loginPrompt() {
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const uid = result.user.uid;

        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            enterApp(doc.data(), result.user.displayName);
        } else {
            alert("Account found but no profile data. Please sign up again.");
            auth.signOut();
        }
    } catch (err) {
        alert(err.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) {
                enterApp(doc.data(), user.displayName || user.email.split("@")[0]);
            } else {
                document.getElementById("authScreen").classList.remove("hidden");
            }
        } else {
            document.getElementById("authScreen").classList.remove("hidden");
        }
    });

    const buttons = document.querySelectorAll('.tab-btn');
    const tabs = document.querySelectorAll('.tab-content');

    function switchTab(button) {
        const selectedTab = button.getAttribute('data-tab');

        tabs.forEach(tab => tab.classList.add('hidden'));
        document.getElementById(selectedTab).classList.remove('hidden');

        buttons.forEach(btn => btn.classList.remove('text-blue-600'));
        button.classList.add('text-blue-600');
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => switchTab(button), { passive: true });
        button.addEventListener('touchend', () => switchTab(button), { passive: true });
    });

    switchTab(document.querySelector('[data-tab="home"]'));
});


const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
let foodLog = [];

function renderMeals() {
    const container = document.getElementById("meal-sections");
    container.innerHTML = "";

    const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];
    meals.forEach(meal => {
        const entries = foodLog.filter(f => f.meal === meal);
        if (entries.length === 0) return;

        const section = document.createElement("div");
        section.className = "mb-4";

        const heading = document.createElement("h3");
        heading.textContent = meal;
        heading.className = "font-semibold text-gray-700 mb-2";
        section.appendChild(heading);

        entries.forEach((item, index) => {
            const realIndex = foodLog.indexOf(item);
            const entry = document.createElement("div");
            entry.className = "flex justify-between items-center p-2 border-b";

            entry.innerHTML = `
          <div>
            <div class="font-medium">${item.name}</div>
            <div class="text-sm text-gray-500">${item.calories} kcal</div>
          </div>
          <div class="flex gap-2">
            <button onclick="openEditModal(${realIndex})" class="text-blue-600 text-xs underline">Edit</button>
            <button onclick="deleteFood(${realIndex})" class="text-red-600 text-xs underline">Delete</button>
          </div>
        `;
            section.appendChild(entry);
        });

        container.appendChild(section);
    });
}


function openEditModal(entryIndex) {
    const item = foodLog[entryIndex];
    document.getElementById("editModal").classList.remove("hidden");

    document.getElementById("editName").value = item.name;
    document.getElementById("editCalories").value = item.calories || "";
    document.getElementById("editProtein").value = item.protein || "";
    document.getElementById("editCarbs").value = item.carbs || "";
    document.getElementById("editFat").value = item.fat || "";
    document.getElementById("editFiber").value = item.fiber || "";
    document.getElementById("editMeal").value = item.meal;

    document.getElementById("editSaveBtn").onclick = async () => {
        const updated = {
            name: document.getElementById("editName").value.trim(),
            calories: parseFloat(document.getElementById("editCalories").value),
            protein: parseFloat(document.getElementById("editProtein").value || 0),
            carbs: parseFloat(document.getElementById("editCarbs").value || 0),
            fat: parseFloat(document.getElementById("editFat").value || 0),
            fiber: parseFloat(document.getElementById("editFiber").value || 0),
            meal: document.getElementById("editMeal").value,
            timestamp: new Date().toISOString()
        };

        foodLog[entryIndex] = updated;

        const user = auth.currentUser;
        const date = document.getElementById("logDate").value;

        await db.collection("users")
            .doc(user.uid)
            .collection("foodLogs")
            .doc(date)
            .set({ entries: foodLog, date });

        closeEditModal();
        renderMeals();
        updateCalorieProgress();
        loadFiveDayTrend();
    };
}

function closeEditModal() {
    document.getElementById("editModal").classList.add("hidden");
}

async function deleteFood(index) {
    const user = auth.currentUser;
    const date = document.getElementById("logDate").value;

    if (!user || !date) return;

    foodLog.splice(index, 1);

    await db.collection("users")
        .doc(user.uid)
        .collection("foodLogs")
        .doc(date)
        .set({ entries: foodLog, date });

    renderMeals();
    updateCalorieProgress();
}

function editFood(index) {
    const item = foodLog[index];

    // Open modal with item data pre-filled
    document.getElementById("foodName").value = item.name;
    document.getElementById("foodCalories").value = item.calories;
    document.getElementById("foodProtein").value = item.protein || "";
    document.getElementById("foodCarbs").value = item.carbs || "";
    document.getElementById("foodFat").value = item.fat || "";
    document.getElementById("foodFiber").value = item.fiber || "";
    document.getElementById("mealSelect").value = item.meal;

    openFoodModal();

    // On save, replace the original entry
    document.getElementById("saveFoodBtn").onclick = async () => {
        const updated = {
            name: document.getElementById("foodName").value.trim(),
            calories: parseFloat(document.getElementById("foodCalories").value),
            protein: parseFloat(document.getElementById("foodProtein").value || 0),
            carbs: parseFloat(document.getElementById("foodCarbs").value || 0),
            fat: parseFloat(document.getElementById("foodFat").value || 0),
            fiber: parseFloat(document.getElementById("foodFiber").value || 0),
            meal: document.getElementById("mealSelect").value,
            timestamp: new Date().toISOString()
        };

        foodLog[index] = updated;

        const user = auth.currentUser;
        const date = document.getElementById("logDate").value;

        await db.collection("users")
            .doc(user.uid)
            .collection("foodLogs")
            .doc(date)
            .set({ entries: foodLog, date });

        closeFoodModal();
        renderMeals();
        updateCalorieProgress();
    };
}

function addFood() {
    const name = prompt("Food name:");
    if (!name) return;

    const calories = parseInt(prompt("Calories:"), 10);
    if (isNaN(calories)) return alert("Invalid calorie input.");

    const meal = prompt("Which meal? (Breakfast, Lunch, Dinner, Snacks)").trim();
    if (!meals.includes(meal)) return alert("Invalid meal.");

    foodLog.push({ name, calories, meal });
    renderMeals();
}

function openFoodModal() {
    document.getElementById("foodModal").classList.remove("hidden");
    document.getElementById("nutritionFields").classList.add("hidden");
    document.getElementById("foodError").textContent = "";
    document.getElementById("foodSearch").value = "";
    document.getElementById("foodCalories").value = "";
    document.getElementById("foodProtein").value = "";
    document.getElementById("foodCarbs").value = "";
    document.getElementById("foodFat").value = "";
}
function closeFoodModal() {
    document.getElementById("foodModal").classList.add("hidden");
}

async function getNutrition() {
    const desc = document.getElementById("foodSearch").value.trim();
    const output = document.getElementById("foodError");
    if (!desc) {
        output.textContent = "Please enter a food description.";
        return;
    }

    output.textContent = "CraveGuard AI is thinking...";
    document.getElementById("nutritionFields").classList.remove("hidden");

    try {
        const prompt = `
  Estimate nutrition info for this food: "${desc}". 
  Respond in this exact format:
  
  Food: [name]
  Calories: [number only]
  Protein: [grams only]
  Carbs: [grams only]
  Fat: [grams only]
  Fiber: [grams only]
  `;

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC1wlM7BygYivPTog2Qa7tzkmx-aijUPlY", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const lines = text.split("\n");

        const getVal = (label) => {
            const line = lines.find(l => l.toLowerCase().includes(label));
            return line ? line.split(":")[1]?.trim() : '';
        };

        document.getElementById("foodName").value = getVal("food") || desc;
        document.getElementById("foodCalories").value = parseInt(getVal("calories")) || '';
        document.getElementById("foodProtein").value = parseFloat(getVal("protein")) || '';
        document.getElementById("foodCarbs").value = parseFloat(getVal("carbs")) || '';
        document.getElementById("foodFat").value = parseFloat(getVal("fat")) || '';
        document.getElementById("foodFiber").value = parseFloat(getVal("fiber")) || '';

        output.textContent = "";
    } catch (err) {
        console.error("Gemini AI error:", err);
        output.textContent = "Failed to get nutrition. Try again.";
    }
}

async function saveFood() {
    const name = document.getElementById("foodName").value.trim();
    const calories = parseInt(document.getElementById("foodCalories").value, 10);
    const meal = document.getElementById("mealSelect").value;
    const user = auth.currentUser;

    if (!user || !name || isNaN(calories)) {
        document.getElementById("foodError").textContent = "Please fill in the required fields.";
        return;
    }

    const dateKey = getLocalDateString();    // 'YYYY-MM-DD'
    const entry = {
        name,
        meal,
        calories: parseFloat(document.getElementById("foodCalories").value),
        protein: parseFloat(document.getElementById("foodProtein").value),
        carbs: parseFloat(document.getElementById("foodCarbs").value),
        fat: parseFloat(document.getElementById("foodFat").value),
        fiber: parseFloat(document.getElementById("foodFiber")?.value || 0),
        timestamp: getLocalDateString()
    };

    // Update local log
    foodLog.push(entry);

    // Update Firestore
    const logRef = db.collection("users").doc(user.uid).collection("foodLogs").doc(dateKey);
    const docSnap = await logRef.get();
    const existing = docSnap.exists ? docSnap.data().entries || [] : [];

    await logRef.set({
        date: dateKey,
        entries: [...existing, entry]
    });

    renderMeals();
    updateCalorieProgress();
    closeFoodModal();
}

function saveUserInfo() {
    const age = parseInt(document.getElementById("userAge").value);
    const weight = parseFloat(document.getElementById("userWeight").value); // in lbs
    const height = parseFloat(document.getElementById("userHeight").value); // in inches
    const sex = document.getElementById("userSex").value;
    const activity = parseFloat(document.getElementById("userActivity").value);
    const goal = document.getElementById("userGoal").value;

    if (!age || !weight || !height || !sex || !activity || !goal) {
        alert("Please fill out all fields.");
        return;
    }

    // Convert to metric
    const weightKg = weight * 0.453592;
    const heightCm = height * 2.54;

    // Mifflin-St Jeor Equation
    const BMR = sex === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    let TDEE = BMR * activity;

    // Adjust for goal
    if (goal === "lose") TDEE -= 500;
    if (goal === "gain") TDEE += 250;

    const protein = weight; // 1g/lb (estimated)
    const fat = weight * 0.35; // g
    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const carbs = (TDEE - proteinCals - fatCals) / 4;

    const userData = {
        age, weight, height, sex, activity, goal,
        calories: Math.round(TDEE),
        protein: Math.round(protein),
        fat: Math.round(fat),
        carbs: Math.round(carbs)
    };

    localStorage.setItem("craveguard_user", JSON.stringify(userData));
    displayGoalSummary(userData);
}

function displayGoalSummary(data) {
    const target = document.getElementById("goalDisplay");
    target.innerHTML = `
      <strong>Daily Targets:</strong><br>
      Calories: ${data.calories} kcal<br>
      Protein: ${data.protein}g<br>
      Carbs: ${data.carbs}g<br>
      Fat: ${data.fat}g
    `;
}

async function updateCalorieProgress() {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) return;

    const data = userDoc.data(); // contains user goals
    if (!data) return;

    const total = {
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        fiber: 30 // Recommended daily fiber (can later personalize)
    };

    const todayLog = foodLog.filter(f => isToday(f.timestamp));

    console.log(todayLog);

    const totals = {
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0
    };

    todayLog.forEach(f => {
        totals.calories += f.calories || 0;
        totals.protein += f.protein || 0;
        totals.carbs += f.carbs || 0;
        totals.fat += f.fat || 0;
        totals.fiber += f.fiber || 0;
    });

    updateRing("calories", totals.calories, total.calories);
    updateRing("protein", totals.protein, total.protein);
    updateRing("carb", totals.carbs, total.carbs);
    updateRing("fat", totals.fat, total.fat);
    updateRing("fiber", totals.fiber, total.fiber);
}

const ringConfig = {
    calories: { "unit": "kcal", "color": "#4ade80" },
    protein: { "unit": "g", "color": "#3b82f6" },
    carb: { "unit": "g", "color": "#f59e0b" },
    fat: { "unit": "g", "color": "#ef4444" },
    fiber: { "unit": "g", "color": "#10b981" }
};

function updateRing(id, value, goal) {
    const percent = Math.min(100, (value / goal) * 100);
    const offset = 282.74 - (282.74 * percent) / 100;
    const remaining = Math.round(goal - value);
    const over = remaining < 0;
    const absValue = Math.abs(remaining);

    document.getElementById(id + "Circle").style.strokeDashoffset = offset.toFixed(2);
    document.getElementById(id + "Circle").style.stroke = ringConfig[id].color;

    animateTextCount(id, absValue, ringConfig[id].unit, over);
}

function animateTextCount(id, targetVal, unit, over) {
    const el = document.getElementById(id + "Text");
    let start = 0;
    const duration = 1000;
    const stepTime = 16;
    const steps = Math.floor(duration / stepTime);
    const increment = targetVal / steps;
    let current = 0;

    const interval = setInterval(() => {
        current += increment;
        const rounded = Math.round(current);

        el.textContent = over
            ? `${rounded} ${unit} over`
            : `${targetVal - rounded <= 0 ? 0 : targetVal - rounded} ${unit} left`;

        if (current >= targetVal) {
            el.textContent = over
                ? `${Math.abs(targetVal)} ${unit} over`
                : `${Math.max(0, targetVal)} ${unit} left`;
            clearInterval(interval);
        }
    }, stepTime);
}

async function loadFiveDayTrend() {
    const user = auth.currentUser;
    if (!user) return;

    const labels = [];
    const calories = [];
    const protein = [];
    const carbs = [];
    const fat = [];
    const fiber = [];

    for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = getLocalDateString();
        labels.push(dateStr.slice(5)); // e.g. MM-DD

        const doc = await db.collection("users")
            .doc(user.uid)
            .collection("foodLogs")
            .doc(dateStr)
            .get();

        let daily = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

        if (doc.exists) {
            const entries = doc.data().entries || [];
            for (const e of entries) {
                daily.calories += e.calories || 0;
                daily.protein += e.protein || 0;
                daily.carbs += e.carbs || 0;
                daily.fat += e.fat || 0;
                daily.fiber += e.fiber || 0;
            }
        }

        calories.push(daily.calories);
        protein.push(daily.protein);
        carbs.push(daily.carbs);
        fat.push(daily.fat);
        fiber.push(daily.fiber);
    }

    drawTrendChart(labels, { calories, protein, carbs, fat, fiber });
}

let trendChart;

async function loadFiveDayTrend() {
    const user = auth.currentUser;
    if (!user) return;

    const labels = [];
    const metrics = {
        calories: [],
        protein: [],
        carbs: [],
        fat: [],
        fiber: []
    };

    for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateStringFromDate(d);
        labels.push(dateStr.slice(5)); // MM-DD

        const doc = await db.collection("users")
            .doc(user.uid)
            .collection("foodLogs")
            .doc(dateStr)
            .get();

        let daily = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

        if (doc.exists) {
            const entries = doc.data().entries || [];
            for (const e of entries) {
                daily.calories += e.calories || 0;
                daily.protein += e.protein || 0;
                daily.carbs += e.carbs || 0;
                daily.fat += e.fat || 0;
                daily.fiber += e.fiber || 0;
            }
        }

        for (let key in metrics) {
            metrics[key].push(daily[key]);
        }
    }

    drawSingleLineChart("chartCalories", labels, metrics.calories, "#4ade80", "kcal");
    drawSingleLineChart("chartProtein", labels, metrics.protein, "#3b82f6", "g");
    drawSingleLineChart("chartCarbs", labels, metrics.carbs, "#f59e0b", "g");
    drawSingleLineChart("chartFat", labels, metrics.fat, "#ef4444", "g");
    drawSingleLineChart("chartFiber", labels, metrics.fiber, "#10b981", "g");
}

function drawSingleLineChart(canvasId, labels, data, color, unit) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data,
                borderColor: color,
                backgroundColor: color + "33", // subtle fill
                fill: true,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => `${context.raw} ${unit}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#555', font: { size: 11 } }
                },
                y: {
                    ticks: { color: '#777', font: { size: 10 } },
                    beginAtZero: true
                }
            }
        }
    });
}

function getLocalDateStringFromDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // Format: YYYY-MM-DD
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper: Check if a log is from today
function isToday(timestamp) {
    const now = getLocalDateString();
    return now === timestamp;
}

// Load saved data on page load
document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("craveguard_user");
    if (saved) {
        displayGoalSummary(JSON.parse(saved));
    }
});

async function loadLogForDate(date) {
    const user = auth.currentUser;
    if (!user) return;

    const today = getLocalDateString();
    const status = document.getElementById("logDateStatus");
    const returnBtn = document.getElementById("returnToTodayBtn");

    const logRef = db.collection("users").doc(user.uid).collection("foodLogs").doc(date);
    const docSnap = await logRef.get();

    if (docSnap.exists) {
        foodLog = docSnap.data().entries || [];
    } else {
        foodLog = [];
    }

    if (date === today) {
        status.innerHTML = `<span class="text-green-600 font-semibold">📅 Logging Today’s Meals</span>`;
        document.getElementById("addFoodBtn").disabled = false;
        returnBtn.classList.add("hidden");
    } else {
        status.innerHTML = `<span class="text-gray-500 italic">🔒 Viewing Past Log (${date})</span>`;
        document.getElementById("addFoodBtn").disabled = true;
        returnBtn.classList.remove("hidden");
    }

    renderMeals();
    updateCalorieProgress();
}

document.addEventListener("DOMContentLoaded", () => {
    const today = getLocalDateString();
    const dateInput = document.getElementById("logDate");
    if (dateInput) dateInput.value = today;
});

function returnToToday() {
    const today = getLocalDateString();
    document.getElementById("logDate").value = today;
    loadLogForDate(today);
}  
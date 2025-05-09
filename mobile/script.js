let chartCalories, chartProtein, chartCarbs, chartFat, chartFiber;
const chartRegistry = {};

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
    loadUserProfile();
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
          <div class="flex items-center gap-2">
  ${item.imageData ? `<img src="${item.imageData}" class="w-10 h-10 rounded object-cover">` : ""}
  <span class="font-medium">${item.name}</span>
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

async function deleteWorkout(docId) {
    const user = auth.currentUser;
    if (!user) return;

    await db.collection("users").doc(user.uid).collection("workouts").doc(docId).delete();
    loadWorkoutHistory(); // Refresh list after delete
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

    const caption = document.getElementById("foodName").value.trim();
    const file = document.getElementById("foodImage").files[0];
    const base64Image = file ? await toBase64(file) : null;

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
        document.getElementById("foodCalories").value = parseInt(getVal("calories")) || 0;
        document.getElementById("foodProtein").value = parseFloat(getVal("protein")) || 0;
        document.getElementById("foodCarbs").value = parseFloat(getVal("carbs")) || 0;
        document.getElementById("foodFat").value = parseFloat(getVal("fat")) || 0;
        document.getElementById("foodFiber").value = parseFloat(getVal("fiber")) || 0;

        output.textContent = "";
    } catch (err) {
        console.error("Gemini AI error:", err);
        output.textContent = "Failed to get nutrition. Try again.";
    }
}

async function saveFood() {
    const name = document.getElementById("foodName").value.trim();
    const calories = parseFloat(document.getElementById("foodCalories").value);
    const protein = parseFloat(document.getElementById("foodProtein").value || 0);
    const carbs = parseFloat(document.getElementById("foodCarbs").value || 0);
    const fat = parseFloat(document.getElementById("foodFat").value || 0);
    const fiber = parseFloat(document.getElementById("foodFiber")?.value || 0);
    const meal = document.getElementById("mealSelect").value;
    const fileInput = document.getElementById("foodImage");
    const file = fileInput.files[0];
    const user = auth.currentUser;
    const date = getLocalDateString();

    if (!user || !name || isNaN(calories)) return;

    let imageData = null;

    if (file) {
        imageData = await toBase64(file);
    }

    const entry = {
        name,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        meal,
        imageData,
        timestamp: new Date().toISOString()
    };

    foodLog.push(entry);

    await db.collection("users").doc(user.uid)
        .collection("foodLogs").doc(date)
        .set({ entries: foodLog, date });

    renderMeals();
    updateCalorieProgress();
    loadFiveDayTrend();
    closeFoodModal();
}

async function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxDim = 400; // Resize to max width/height
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) {
                        height *= maxDim / width;
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.8)); // JPEG to compress
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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

async function generateWorkout() {
    const user = auth.currentUser;
    if (!user) return;

    document.getElementById("aiLoading").classList.remove("hidden");

    const duration = parseInt(document.getElementById("workoutDuration").value) || 30;
    const type = document.getElementById("workoutType").value;
    const location = document.getElementById("workoutLocation").value;
    const date = getLocalDateString();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userDoc = await db.collection("users").doc(user.uid).get();
    const goal = userDoc.data()?.goal;

    const foodLogDoc = await db.collection("users").doc(user.uid).collection("foodLogs").doc(date).get();
    const foodLog = foodLogDoc.exists ? foodLogDoc.data().entries : [];

    const summary = foodLog.map(f => `${f.name} - ${f.calories} kcal`).join("\n") || "No meals logged";

    const equipment = document.getElementById("workoutEquipment").value.trim();

    const prompt = `
You are a fitness trainer. Create a ${duration}-minute ${type.toLowerCase()} workout for someone at the ${location} with equipment: ${equipment}, and goal: ${goal}.

Use ONLY this format:
Workout:
- Title: [title of workout]
- Duration: ${duration} minutes
- Location: ${location}
- Type: ${type}
- Equipment: ${equipment}

Exercises:
1. [Exercise name] — [Sets] sets x [Reps/Time] — [Description or tips]
...
Meals today:
${summary}
Current time: ${now}
`;


    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC1wlM7BygYivPTog2Qa7tzkmx-aijUPlY", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "AI failed to respond.";

    const workout = {
        text,
        time: now,
        date,
        type,
        duration,
        location,
        equipment
    };

    document.getElementById("aiLoading").classList.add("hidden");

    await db.collection("users").doc(user.uid).collection("workouts").add(workout);
    loadWorkoutHistory(); // Load & show
}

async function loadWorkoutHistory() {
    const user = auth.currentUser;
    if (!user) return;

    const snapshot = await db.collection("users")
        .doc(user.uid)
        .collection("workouts")
        .orderBy("date", "desc")
        .get();

    const container = document.getElementById("workoutList");
    container.innerHTML = "";

    snapshot.forEach(doc => {
        const w = doc.data();
        const entry = document.createElement("li");
        entry.className = "border p-3 rounded shadow-sm";

        const parsed = parseWorkout(w.text);

        entry.innerHTML = `
  <div class="text-xs text-gray-500">${w.date} • ${w.time}</div>
  <div class="font-semibold text-lg mb-1">${parsed.title}</div>
  <div class="text-sm text-gray-700 mb-1">${parsed.type} • ${parsed.location} • ${parsed.duration} min</div>
  <div class="text-xs text-gray-500 mb-2">Equipment: ${parsed.equipment}</div>
  <ul class="text-sm space-y-1 pl-4 list-decimal mb-2">
    ${parsed.exercises.map(ex => `<li><strong>${ex.name}</strong> — ${ex.sets} × ${ex.reps}<br><span class="text-gray-500">${ex.notes}</span></li>`).join('')}
  </ul>
  <div class="text-right">
    <button onclick="deleteWorkout('${doc.id}')" class="text-red-500 text-xs underline">Delete</button>
  </div>
`;

        container.appendChild(entry);
    });

    document.getElementById("workoutModal").classList.remove("hidden");
}

function parseWorkout(text) {
    const titleMatch = text.match(/- Title:\s*(.*)/i);
    const durationMatch = text.match(/- Duration:\s*(.*)/i);
    const locationMatch = text.match(/- Location:\s*(.*)/i);
    const typeMatch = text.match(/- Type:\s*(.*)/i);
    const equipMatch = text.match(/- Equipment:\s*(.*)/i);

    const exercises = [];
    const lines = text.split("\n");
    let start = lines.findIndex(l => l.trim().toLowerCase().startsWith("1."));
    for (let i = start; i < lines.length; i++) {
        const match = lines[i].match(/^\d+\.\s*(.*?)\s*—\s*(.*?)\s*x\s*(.*?)\s*—\s*(.*)/);
        if (match) {
            exercises.push({
                name: match[1].trim(),
                sets: match[2].trim(),
                reps: match[3].trim(),
                notes: match[4].trim()
            });
        }
    }

    return {
        title: titleMatch?.[1]?.trim() || "Untitled",
        duration: durationMatch?.[1]?.trim() || "?",
        location: locationMatch?.[1]?.trim() || "?",
        type: typeMatch?.[1]?.trim() || "?",
        equipment: equipMatch?.[1]?.trim() || "?",
        exercises
    };
}

function closeWorkoutModal() {
    document.getElementById("workoutModal").classList.add("hidden");
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
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    // Destroy previous chart if exists
    if (chartRegistry[canvasId] && typeof chartRegistry[canvasId].destroy === "function") {
        chartRegistry[canvasId].destroy();
    }

    // Create new chart and save it to registry
    chartRegistry[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data,
                borderColor: color,
                backgroundColor: color + "33",
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

async function loadUserProfile() {
    const user = auth.currentUser;
    if (!user) return;

    document.getElementById("userEmail").textContent = user.email;

    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) return;

    const data = doc.data();

    document.getElementById("profileAge").value = data.age;
    document.getElementById("profileWeight").value = data.weight;
    document.getElementById("profileHeight").value = data.height;
    document.getElementById("profileSex").value = data.sex;
    document.getElementById("profileActivity").value = data.activity;
    document.getElementById("profileGoal").value = data.goal;
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
    return now === timestamp.split('T')[0];
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

async function saveProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const age = parseInt(document.getElementById("profileAge").value);
    const weight = parseFloat(document.getElementById("profileWeight").value);
    const height = parseFloat(document.getElementById("profileHeight").value);
    const sex = document.getElementById("profileSex").value;
    const activity = parseFloat(document.getElementById("profileActivity").value);
    const goal = document.getElementById("profileGoal").value;

    if (!age || !weight || !height || !sex || !activity || !goal) {
        alert("Please complete all fields.");
        return;
    }

    const userData = calculateGoals({ age, weight, height, sex, activity, goal });

    await db.collection("users").doc(user.uid).set(userData);

    alert("Profile updated!");
    updateCalorieProgress();
    loadFiveDayTrend();
}  
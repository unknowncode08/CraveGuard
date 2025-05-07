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
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const userData = {
        age: parseInt(document.getElementById("setupAge").value),
        weight: parseFloat(document.getElementById("setupWeight").value),
        height: parseFloat(document.getElementById("setupHeight").value),
        sex: document.getElementById("setupSex").value,
        activity: parseFloat(document.getElementById("setupActivity").value),
        goal: document.getElementById("setupGoal").value
    };

    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCred.user.uid;
        await db.collection("users").doc(uid).set(userData);
        enterApp(userData);
    } catch (err) {
        alert(err.message);
    }
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const uid = result.user.uid;

        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            enterApp(doc.data());
        } else {
            alert("Account found but no profile data. Please sign up again.");
            auth.signOut();
        }
    } catch (err) {
        alert(err.message);
    }
}

function enterApp(userData) {
    localStorage.setItem("craveguard_user", JSON.stringify(userData));
    document.getElementById("authScreen").remove();
    document.getElementById("userSetup").remove();
    displayGoalSummary(userData);
}

document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists) {
                enterApp(doc.data());
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
    const container = document.getElementById('meal-sections');
    container.innerHTML = '';
    meals.forEach(meal => {
        const entries = foodLog.filter(f => f.meal === meal);
        const mealHTML = `
      <div class="bg-white rounded-xl p-4 shadow">
        <h3 class="text-lg font-bold mb-2">${meal}</h3>
        ${entries.length === 0
                ? `<p class="text-gray-400">No items yet</p>`
                : entries.map(item => `
            <div class="flex justify-between items-center border-b py-1 text-sm">
              <span>${item.name}</span>
              <span class="text-gray-500">${item.calories} kcal</span>
            </div>
          `).join('')}
      </div>
    `;
        container.innerHTML += mealHTML;
    });
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

        output.textContent = "";
    } catch (err) {
        console.error("Gemini AI error:", err);
        output.textContent = "Failed to get nutrition. Try again.";
    }
}

function saveFood() {
    const name = document.getElementById("foodName").value.trim();
    const calories = parseInt(document.getElementById("foodCalories").value, 10);
    const meal = document.getElementById("mealSelect").value;

    if (!name || isNaN(calories)) {
        document.getElementById("foodError").textContent = "Please fill in the required fields.";
        return;
    }

    foodLog.push({
        name,
        calories,
        meal
    });

    renderMeals();
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

// Load saved data on page load
document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("craveguard_user");
    if (saved) {
        displayGoalSummary(JSON.parse(saved));
    }
});

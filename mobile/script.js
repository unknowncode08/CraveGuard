document.addEventListener("DOMContentLoaded", () => {
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
    if (!desc) {
        document.getElementById("foodError").textContent = "Please enter a food description.";
        return;
    }

    document.getElementById("foodError").textContent = "Estimating nutrition...";
    document.getElementById("nutritionFields").classList.remove("hidden");

    try {
        const prompt = `Estimate the nutritional content for: "${desc}". 
  Please respond with:
  
  Food: [name]
  Calories: [number]
  Protein: [grams]
  Carbs: [grams]
  Fat: [grams]`;

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC1wlM7BygYivPTog2Qa7tzkmx-aijUPlY", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const lines = raw.split('\n');

        const getValue = (label) => {
            const line = lines.find(l => l.toLowerCase().includes(label));
            return line ? line.split(':')[1]?.trim() : '';
        };

        const name = getValue("food");
        const calories = getValue("calories");
        const protein = getValue("protein");
        const carbs = getValue("carbs");
        const fat = getValue("fat");

        // Only update if something was returned
        document.getElementById("foodName").value = name || desc;
        document.getElementById("foodCalories").value = parseInt(calories) || '';
        document.getElementById("foodProtein").value = parseFloat(protein) || '';
        document.getElementById("foodCarbs").value = parseFloat(carbs) || '';
        document.getElementById("foodFat").value = parseFloat(fat) || '';

        document.getElementById("foodError").textContent = "";
    } catch (error) {
        console.error("AI Estimation Error:", error);
        document.getElementById("foodError").textContent = "AI failed to estimate nutrition. Try again.";
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

async function searchFood() {
    const query = document.getElementById("foodSearch").value.trim();
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = "";

    if (query.length < 3) {
        return;
    }

    try {
        const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`);
        const data = await response.json();

        if (data.products && data.products.length > 0) {
            data.products.slice(0, 5).forEach(product => {
                const item = document.createElement("div");
                item.className = "p-2 border-b cursor-pointer hover:bg-gray-100";
                item.textContent = product.product_name || "Unnamed Product";
                item.onclick = () => {
                    document.getElementById("foodName").value = product.product_name || "";
                    document.getElementById("foodCalories").value = product.nutriments["energy-kcal_100g"] || "";
                    document.getElementById("foodProtein").value = product.nutriments.proteins_100g || "";
                    document.getElementById("foodCarbs").value = product.nutriments.carbohydrates_100g || "";
                    document.getElementById("foodFat").value = product.nutriments.fat_100g || "";
                    document.getElementById("nutritionFields").classList.remove("hidden");
                    resultsContainer.innerHTML = "";
                };
                resultsContainer.appendChild(item);
            });
        } else {
            resultsContainer.innerHTML = "<div class='p-2 text-gray-500'>No results found.</div>";
        }
    } catch (error) {
        console.error("Error fetching food data:", error);
        resultsContainer.innerHTML = "<div class='p-2 text-red-500'>Error fetching data.</div>";
    }
}

let debounceTimeout;

function debounceSearchFood() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        searchFood();
    }, 500); // 500ms delay after typing stops
}

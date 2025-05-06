document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll('.tab-btn');
    const tabs = document.querySelectorAll('.tab-content');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedTab = button.getAttribute('data-tab');

            // Hide all tabs
            tabs.forEach(tab => {
                tab.classList.add('hidden');
            });

            // Show selected tab
            const activeTab = document.getElementById(selectedTab);
            if (activeTab) {
                activeTab.classList.remove('hidden');
            }

            // Update active tab color
            buttons.forEach(btn => btn.classList.remove('text-blue-600'));
            button.classList.add('text-blue-600');
        });
    });

    // Show the Home tab by default
    document.querySelector('[data-tab="home"]').click();
});

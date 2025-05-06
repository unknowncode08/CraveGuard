const buttons = document.querySelectorAll('.tab-btn');
const tabs = document.querySelectorAll('.tab-content');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Show only the clicked tab
        tabs.forEach(tab => tab.classList.add('hidden'));
        document.getElementById(tabName).classList.remove('hidden');

        // Update button colors
        buttons.forEach(b => b.classList.remove('text-blue-600'));
        btn.classList.add('text-blue-600');
    });
});

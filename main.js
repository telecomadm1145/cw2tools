// Navigation Logic
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');

    function setActiveSection(targetId) {
        // Update Nav
        navItems.forEach(item => {
            if (item.dataset.target === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update View
        sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            if (target) {
                setActiveSection(target);
            }
        });
    });

    // Make navigateTo global for inline onclicks
    window.navigateTo = setActiveSection;

    // File Handling
    const btnOpenRom = document.getElementById('btn-open-rom');
    const fileInput = document.getElementById('file-input');
    const romStatus = document.getElementById('rom-status');

    btnOpenRom.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            romStatus.textContent = `Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            // Here we would read the file content
            // const reader = new FileReader();
            // reader.onload = function(e) { const buffer = e.target.result; ... }
            // reader.readAsArrayBuffer(file);
        }
    });
});

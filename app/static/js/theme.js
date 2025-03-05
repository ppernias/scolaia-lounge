function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    
    if (html.getAttribute('data-bs-theme') === 'light') {
        html.setAttribute('data-bs-theme', 'dark');
        themeIcon.classList.replace('bi-sun-fill', 'bi-moon-fill');
        localStorage.setItem('theme', 'dark');
    } else {
        html.setAttribute('data-bs-theme', 'light');
        themeIcon.classList.replace('bi-moon-fill', 'bi-sun-fill');
        localStorage.setItem('theme', 'light');
    }
}

// Function to load theme colors from settings
async function loadThemeColors() {
    try {
        const response = await fetch('/settings/theme');
        if (response.ok) {
            const themeSettings = await response.json();
            const root = document.documentElement;
            
            themeSettings.forEach(setting => {
                switch(setting.key) {
                    case 'titles_color':
                        root.style.setProperty('--titles-color', setting.value);
                        break;
                    case 'card_bg':
                        root.style.setProperty('--card-bg', setting.value);
                        break;
                    case 'logo_color':
                        root.style.setProperty('--logo-color', setting.value);
                        break;
                }
            });
        }
    } catch (error) {
        console.error('Error loading theme colors:', error);
    }
}

// Function to update theme colors
async function updateThemeColor(settingId, color) {
    try {
        const response = await fetch(`/settings/${settingId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: color
            })
        });
        
        if (response.ok) {
            // Update CSS variable based on the setting key
            const setting = await response.json();
            const root = document.documentElement;
            
            switch(setting.key) {
                case 'titles_color':
                    root.style.setProperty('--titles-color', color);
                    break;
                case 'card_bg':
                    root.style.setProperty('--card-bg', color);
                    break;
                case 'logo_color':
                    root.style.setProperty('--logo-color', color);
                    break;
            }
        }
    } catch (error) {
        console.error('Error updating theme:', error);
    }
}

// Load saved theme preference and colors
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    const themeIcon = document.getElementById('theme-icon');
    themeIcon.classList.add(savedTheme === 'light' ? 'bi-sun-fill' : 'bi-moon-fill');
    
    // Load theme colors
    loadThemeColors();
    
    // Initialize color pickers if they exist
    const colorPickers = document.querySelectorAll('.theme-color-picker');
    colorPickers.forEach(picker => {
        picker.addEventListener('change', (e) => {
            const settingId = picker.getAttribute('data-setting-id');
            updateThemeColor(settingId, e.target.value);
        });
    });
});
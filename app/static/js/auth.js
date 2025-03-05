// Función para manejar errores esperados vs. inesperados
function handleAuthError(error, context = 'operation') {
    if (error instanceof TypeError || error.name === 'TypeError') {
        console.error('Network or system error:', error);
        toast.error(`A system error occurred during ${context}. Please try again later.`);
    } else {
        // Los errores esperados no necesitan ser logueados en la consola
        toast.error(error.message || `An error occurred during ${context}`);
    }
}

// Función para deshabilitar temporalmente el formulario
function temporarilyDisableForm(form, duration) {
    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input');
    
    // Deshabilitar todos los inputs y el botón
    submitButton.disabled = true;
    inputs.forEach(input => input.disabled = true);
    
    // Cambiar el estilo del botón para indicar que está deshabilitado
    submitButton.classList.add('disabled');
    
    // Reactivar después del tiempo especificado
    setTimeout(() => {
        submitButton.disabled = false;
        inputs.forEach(input => input.disabled = false);
        submitButton.classList.remove('disabled');
    }, duration);
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    let response;
    try {
        response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        }).then(async res => {
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Login successful!');
                window.location.href = '/';
            } else {
                // Credenciales inválidas - deshabilitar el formulario por 3 segundos
                temporarilyDisableForm(form, 3000);
                toast.error(data.detail || 'Invalid credentials', {
                    duration: 3000 // Duración de 3 segundos para la notificación
                });
            }
            return res;
        });
    } catch (error) {
        // Solo errores reales de red o del sistema
        console.error('System error during login:', error);
        toast.error('A system error occurred. Please try again later.', {
            duration: 3000
        });
    }
}

async function handleRegistration(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    let response;
    try {
        response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        }).then(async res => {
            const data = await res.json();
            if (res.ok) {
                toast.success('Registration successful! Please log in.', {
                    duration: 3000
                });
                window.location.href = '/auth/login';
            } else {
                // Errores de validación - no son errores reales
                temporarilyDisableForm(form, 3000);
                toast.error(data.detail || 'Registration failed', {
                    duration: 3000
                });
            }
            return res;
        });
    } catch (error) {
        // Solo errores reales de sistema
        console.error('System error during registration:', error);
        toast.error('A system error occurred. Please try again later.', {
            duration: 3000
        });
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/auth/logout', { 
            method: 'POST' 
        }).then(async res => {
            if (res.ok) {
                window.location.href = '/';
            } else {
                const data = await res.json();
                toast.error(data.detail || 'Logout failed', {
                    duration: 3000
                });
            }
            return res;
        });
    } catch (error) {
        // Solo errores reales de sistema
        console.error('System error during logout:', error);
        toast.error('A system error occurred during logout.', {
            duration: 3000
        });
    }
}

// Add event listeners when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('registrationForm');
    const logoutButton = document.getElementById('logoutButton');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
});
async function handleProfileUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/profile/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });
        
        if (response.ok) {
            toast.success('Profile updated successfully!');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            const error = await response.json();
            toast.error(error.detail);
        }
    } catch (error) {
        console.error('Error:', error);
        toast.error('An error occurred while updating profile');
    }
}

let isPasswordUpdateInProgress = false;

async function handlePasswordUpdate(event) {
    event.preventDefault();
    
    // Evitar múltiples envíos
    if (isPasswordUpdateInProgress) {
        return;
    }
    
    const form = event.target;
    const formData = new FormData(form);
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('password_confirm');
    
    // Validación del lado del cliente
    if (newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        document.getElementById('password_confirm').classList.add('is-invalid');
        return;
    }
    
    let response;
    try {
        isPasswordUpdateInProgress = true;
        
        response = await fetch('/profile/update-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Deshabilitar el formulario
            const inputs = form.getElementsByTagName('input');
            for (let input of inputs) {
                input.disabled = true;
            }
            
            toast.success('Password updated successfully! You will be logged out in 5 seconds...');
            
            // Esperar 5 segundos y luego hacer logout
            setTimeout(async () => {
                try {
                    await fetch('/auth/logout', { method: 'POST' });
                    window.location.href = '/auth/login';
                } catch (error) {
                    console.error('Logout error:', error);
                    toast.error('Error during logout. Please try logging out manually.');
                }
            }, 5000);
        } else {
            toast.error(data.detail || 'Failed to update password');
        }
    } catch (error) {
        console.error('Error:', error);
        toast.error('An error occurred while updating password');
    } finally {
        if (!response?.ok) {
            isPasswordUpdateInProgress = false;
        }
    }
}

async function proceedAccountDeletion() {
    const confirmUsername = document.getElementById('confirmUsername').value;
    const currentUsername = document.querySelector('[data-username]').dataset.username;
    
    if (confirmUsername !== currentUsername) {
        document.getElementById('username-error').classList.remove('d-none');
        document.getElementById('confirmUsername').value = '';
        document.getElementById('confirmUsername').focus();
        return;
    }
    
    document.getElementById('username-error').classList.add('d-none');
    
    try {
        const response = await fetch('/profile/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            cancelAccountModal.hide();
            
            // Eliminar la cookie de sesión directamente
            document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            // Forzar redirección a la página principal
            window.location.href = '/';
            
            // Si la redirección no funciona, forzar recarga
            setTimeout(() => {
                window.location.replace('/');
            }, 50);
        } else {
            const data = await response.json();
            toast.error(data.detail || 'Error cancelling account');
        }
    } catch (error) {
        toast.error('Error cancelling account');
    }
}

let cancelAccountModal;

document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('cancelAccountModal');
    if (modalElement) {
        cancelAccountModal = new bootstrap.Modal(modalElement);
        
        modalElement.addEventListener('hidden.bs.modal', function () {
            document.getElementById('username-error').classList.add('d-none');
            document.getElementById('confirmUsername').value = '';
        });
    }
});

function showCancelAccountModal() {
    if (cancelAccountModal) {
        document.getElementById('confirmUsername').value = '';
        document.getElementById('username-error').classList.add('d-none');
        cancelAccountModal.show();
    }
}

// Validación en tiempo real de coincidencia de contraseñas
document.addEventListener('DOMContentLoaded', function() {
    const newPasswordInput = document.getElementById('new_password');
    const confirmPasswordInput = document.getElementById('password_confirm');
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value === newPasswordInput.value) {
                this.classList.remove('is-invalid');
            } else {
                this.classList.add('is-invalid');
            }
        });
    }
});

// Add event listeners when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordUpdate);
    }
});
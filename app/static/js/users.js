// Función auxiliar para manejar el estado de los botones
function setButtonLoading(button, loading) {
    if (loading) {
        button.style.opacity = '0.6';
        button.style.cursor = 'wait';
        button.disabled = true;
    } else {
        button.style.opacity = '';
        button.style.cursor = '';
        button.disabled = false;
    }
}

async function editUser(userId) {
    const button = event.currentTarget;
    setButtonLoading(button, true);
    
    try {
        const response = await fetch(`/users/${userId}`);
        if (!response.ok) {
            throw new Error('Error fetching user data');
        }
        const user = await response.json();
        const currentUser = document.querySelector('[data-current-user]').dataset.currentUser;
        
        // Limpiar campos de contraseña
        document.getElementById('userCurrentPassword').value = '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userPasswordConfirm').value = '';
        
        // Si hay una contraseña temporal, mostrarla
        if (user.temp_password) {
            document.getElementById('userTempPassword').value = user.temp_password;
            toast.info('A temporary password has been generated for this user');
        } else {
            document.getElementById('userTempPassword').value = '';
        }
        
        document.getElementById('userId').value = user.id;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userFullName').value = user.full_name;
        document.getElementById('userRole').value = user.role || '';
        document.getElementById('userOrganization').value = user.organization || '';
        document.getElementById('userIsAdmin').checked = user.is_admin;
        
        // Disable admin checkbox if editing current user
        const isAdminCheckbox = document.getElementById('userIsAdmin');
        if (user.id === parseInt(currentUser)) {
            isAdminCheckbox.disabled = true;
        } else {
            isAdminCheckbox.disabled = false;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Error loading user data');
    } finally {
        setButtonLoading(button, false);
    }
}

async function saveUser() {
    const button = event.currentTarget;
    setButtonLoading(button, true);
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('userPassword').value;
    const passwordConfirm = document.getElementById('userPasswordConfirm').value;
    
    if (password && password !== passwordConfirm) {
        toast.error('Passwords do not match');
        setButtonLoading(button, false);
        return;
    }
    
    const userData = {
        email: document.getElementById('userEmail').value,
        full_name: document.getElementById('userFullName').value,
        role: document.getElementById('userRole').value,
        organization: document.getElementById('userOrganization').value,
        is_admin: document.getElementById('userIsAdmin').checked,
        password: password || undefined
    };
    
    try {
        const response = await fetch(`/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            window.location.reload();
        } else {
            const error = await response.json();
            toast.error(error.detail || 'Error updating user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        toast.error('Error saving user data');
    } finally {
        setButtonLoading(button, false);
    }
}

async function deleteUser() {
    const button = event.currentTarget;
    setButtonLoading(button, true);
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        setButtonLoading(button, false);
        return;
    }
    
    const userId = document.getElementById('userId').value;
    
    try {
        const response = await fetch(`/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            window.location.reload();
        } else {
            const error = await response.json();
            toast.error(error.detail || 'Error deleting user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Error deleting user');
    } finally {
        setButtonLoading(button, false);
    }
}

async function sendUserDataEmail(userId) {
    const button = event.currentTarget;
    setButtonLoading(button, true);
    
    try {
        const response = await fetch(`/api/email/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId
            })
        });
        
        if (response.ok) {
            toast.success('User data sent successfully!');
        } else {
            const error = await response.json();
            toast.error(error.detail || 'Error sending user data');
        }
    } catch (error) {
        console.error('Error:', error);
        toast.error('Error sending user data');
    } finally {
        setButtonLoading(button, false);
    }
}

async function generateAndSendNewPassword(userId) {
    const button = event.currentTarget;
    setButtonLoading(button, true);
    
    try {
        const response = await fetch(`/users/${userId}/generate-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            toast.success('New password generated and sent successfully!');
            // Limpiar los campos de contraseña en el formulario
            document.getElementById('userPassword').value = '';
            document.getElementById('userPasswordConfirm').value = '';
        } else {
            const error = await response.json();
            toast.error(error.detail || 'Error generating new password');
        }
    } catch (error) {
        console.error('Error:', error);
        toast.error('Error generating new password');
    } finally {
        setButtonLoading(button, false);
    }
}
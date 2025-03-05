document.addEventListener('DOMContentLoaded', function() {
    // Auto-expand textareas
    function autoExpand(textarea) {
        // Reset height to allow shrinking, but maintain minimum height
        const minHeight = 85; // 3 lines minimum
        textarea.style.height = `${minHeight}px`;
        
        // Set height to scrollHeight to fit content, but not less than minHeight
        const newHeight = Math.max(minHeight, textarea.scrollHeight);
        textarea.style.height = `${newHeight}px`;
    }

    // Initialize all auto-expand textareas
    document.querySelectorAll('textarea.auto-expand').forEach(textarea => {
        // Initial expansion
        autoExpand(textarea);
        
        // Add input event listener for dynamic expansion
        textarea.addEventListener('input', function() {
            autoExpand(this);
        });
    });

    // List management
    document.querySelectorAll('.add-item').forEach(button => {
        button.addEventListener('click', function() {
            const listEditor = this.closest('.list-editor');
            const newItem = document.createElement('div');
            newItem.className = 'input-group mb-2 list-item';
            newItem.innerHTML = `
                <input type="text" class="form-control" value="">
                <button class="btn btn-outline-danger remove-item" type="button">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            
            // Insert before the add button
            this.parentNode.insertBefore(newItem, this);
            
            // Add event listener to the new remove button
            newItem.querySelector('.remove-item').addEventListener('click', function() {
                this.closest('.list-item').remove();
            });
        });
    });

    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.list-item').remove();
        });
    });

    // Defaults management
    document.querySelectorAll('.save-default-btn').forEach(button => {
        button.addEventListener('click', async function() {
            console.log('Save button clicked'); // Debug log
            const key = this.dataset.key;
            const type = this.dataset.type;
            const displayKey = this.closest('.setting-item').querySelector('.font-audiowide').textContent.trim();
            let value;
            
            try {
                if (type === 'list') {
                    const listEditor = document.querySelector(`.list-editor[data-key="${key}"]`);
                    value = Array.from(listEditor.querySelectorAll('.list-item input'))
                                .map(input => input.value)
                                .filter(val => val.trim() !== '');
                } else if (type === 'boolean') {
                    const checkbox = document.querySelector(`.default-value-editor[data-key="${key}"]`);
                    value = checkbox.checked;
                } else {
                    const input = document.querySelector(`.default-value-editor[data-key="${key}"]`);
                    value = type === 'number' ? Number(input.value) : input.value;
                }

                console.log('Sending request with value:', value); // Debug log
                const response = await fetch(`/settings/defaults/${encodeURIComponent(key)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        key: key,
                        value: value
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to update default value');
                }

                console.log('Update successful'); // Debug log
                showToast('success', `Changes saved for "${displayKey}"`);
                
                // Añadir clase de animación al campo actualizado
                const settingItem = this.closest('.setting-item');
                settingItem.classList.add('setting-updated');
                setTimeout(() => settingItem.classList.remove('setting-updated'), 1000);
                
            } catch (error) {
                console.error('Error updating default:', error);
                showToast('error', `Error saving changes for "${displayKey}": ${error.message}`);
            }
        });
    });
});

// Toast notifications
function showToast(type, message) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    document.getElementById('toastContainer').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// Add styles
const style = document.createElement('style');
style.textContent = `
@keyframes highlightUpdate {
    0% { background-color: transparent; }
    50% { background-color: rgba(var(--bs-success-rgb), 0.1); }
    100% { background-color: transparent; }
}

.setting-updated {
    animation: highlightUpdate 1s ease-in-out;
}

.toast-container {
    z-index: 1056;
}
`;
document.head.appendChild(style);

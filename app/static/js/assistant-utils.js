// Función para mostrar notificaciones toast
function showToast(type, message) {
    const toast = document.createElement('div');
    let bgClass = 'bg-danger';
    
    switch(type) {
        case 'success':
            bgClass = 'bg-success';
            break;
        case 'info':
            bgClass = 'bg-info';
            break;
        case 'danger':
            bgClass = 'bg-danger';
            break;
    }
    
    toast.className = `toast align-items-center text-white ${bgClass} border-0`;
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
    
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

// Función para añadir un nivel educativo a la lista
function addEducationalLevel() {
    const select = document.getElementById('educationalLevelInput');
    const value = select.value.trim();
    
    if (!value) {
        showToast('warning', 'Please select an educational level');
        return;
    }
    
    const list = document.getElementById('educationalLevelList');
    const existingLevels = Array.from(list.children).map(li => li.querySelector('span').textContent.trim());
    
    if (existingLevels.includes(value)) {
        showToast('warning', 'This educational level already exists');
        return;
    }
    
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
        <span>${value}</span>
        <button type="button" class="btn btn-danger btn-sm ms-2" onclick="removeListItem(this)">
            <i class="bi bi-trash"></i>
        </button>
    `;
    list.appendChild(li);
    
    // Reset select to default option
    select.selectedIndex = 0;
}

// Función para añadir un caso de uso
function addUseCase() {
    const input = document.getElementById('useCaseInput');
    const value = input.value.trim();
    
    if (!value) {
        showToast('warning', 'Please enter a use case');
        return;
    }
    
    // Usar la función addListItem de yaml-utils.js si está disponible
    if (typeof window.YAMLUtils !== 'undefined' && typeof window.YAMLUtils.addListItem === 'function') {
        window.YAMLUtils.addListItem('useCasesList', value, true);
    } else if (typeof addListItem === 'function') {
        addListItem('useCasesList', value, true);
    } else {
        // Implementación de respaldo si no se encuentra la función
        const list = document.getElementById('useCasesList');
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <span>${value}</span>
            <button type="button" class="btn btn-danger btn-sm ms-2" onclick="removeListItem(this)">
                <i class="bi bi-trash"></i>
            </button>
        `;
        list.appendChild(li);
    }
    
    // Limpiar el campo de entrada
    input.value = '';
    input.focus();
}

// Función para eliminar un elemento de una lista
function removeListItem(button) {
    button.closest('li').remove();
}

// Función para obtener los valores de una lista
function getListValues(listId) {
    return Array.from(document.getElementById(listId).getElementsByTagName('input'))
        .map(input => input.value.trim())
        .filter(value => value !== '');
}

// Función para mejorar el prompt del rol usando IA
async function improveRolePrompt() {
    const currentPrompt = document.getElementById('systemContent').value;
    if (!currentPrompt) {
        window.toast.error('Please enter a prompt first');
        return;
    }

    const improveButton = event.target.closest('button');
    improveButton.disabled = true;
    improveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Improving...';

    let loadingToast = null;
    try {
        // Primero obtenemos el modelo que se está usando
        const modelResponse = await fetch('/settings/get_default_llm');
        if (!modelResponse.ok) {
            throw new Error('Could not determine the model being used');
        }
        const modelData = await modelResponse.json();
        const modelName = modelData.model || 'AI';
        
        // Crear una instancia temporal del sistema de notificaciones sin auto-cierre
        const tempToast = new ToastSystem({ duration: 0 });
        // Mostrar notificación de inicio y guardar su referencia
        loadingToast = tempToast.show(`Requesting prompt improvement from ${modelName}...`, 'info');

        const response = await fetch('/assistants/improve-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: currentPrompt
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data.success) {
            // Cerrar la notificación de carga antes de mostrar el éxito
            if (loadingToast) tempToast.dismiss(loadingToast);
            window.toast.success(`Successfully improved prompt using ${modelName}`);
            
            // Mostrar el modal de confirmación
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmImprovementsModal'));
            document.getElementById('originalPrompt').textContent = currentPrompt;
            document.getElementById('improvedPrompt').textContent = data.improved_prompt;
            confirmModal.show();
        } else {
            // Cerrar la notificación de carga antes de mostrar el error
            if (loadingToast) tempToast.dismiss(loadingToast);
            window.toast.error(data.error || 'Failed to improve prompt');
        }
    } catch (error) {
        console.error('Error:', error);
        // Cerrar la notificación de carga antes de mostrar el error
        if (loadingToast) tempToast.dismiss(loadingToast);
        window.toast.error('Error improving prompt: ' + error.message);
    } finally {
        improveButton.disabled = false;
        improveButton.innerHTML = '<i class="bi bi-magic"></i> Improve';
    }
}

let targetTextarea = null; // Variable global para almacenar el textarea objetivo

// Función para aplicar las mejoras al prompt
function applyImprovements() {
    const improvedPrompt = document.getElementById('improvedPrompt').textContent;
    
    // Si tenemos un textarea específico (para tools), usamos ese
    const textareaToUpdate = targetTextarea || document.getElementById('systemContent');
    
    if (improvedPrompt && textareaToUpdate) {
        textareaToUpdate.value = improvedPrompt;
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmImprovementsModal'));
        if (modal) {
            modal.hide();
            showToast('success', 'Improvements applied successfully!');
            // Reseteamos el textarea objetivo después de aplicar los cambios
            targetTextarea = null;
        }
    } else {
        showToast('danger', 'Error: Could not apply improvements');
    }
}

// Función para establecer el textarea objetivo para las mejoras
function setTargetTextarea(textarea) {
    targetTextarea = textarea;
}

// Función para alternar la visibilidad del resumen
function toggleSummary(button) {
    const container = button.closest('.summary-container');
    const shortText = container.querySelector('.summary-short');
    const fullText = container.querySelector('.summary-full');
    const icon = button.querySelector('.bi');
    
    if (fullText.style.display === 'none') {
        shortText.style.display = 'none';
        fullText.style.display = 'block';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-up');
        button.innerHTML = '<i class="bi bi-chevron-up"></i> Less';
    } else {
        shortText.style.display = 'block';
        fullText.style.display = 'none';
        icon.classList.remove('bi-chevron-up');
        icon.classList.add('bi-chevron-down');
        button.innerHTML = '<i class="bi bi-chevron-down"></i> More';
    }
}

// Función para alternar la visibilidad del propósito
function toggleCoverage(button) {
    const container = button.closest('.coverage-container');
    const shortText = container.querySelector('.coverage-short');
    const fullText = container.querySelector('.coverage-full');
    const icon = button.querySelector('.bi');
    
    if (fullText.style.display === 'none') {
        shortText.style.display = 'none';
        fullText.style.display = 'block';
        icon.classList.remove('bi-chevron-down');
        icon.classList.add('bi-chevron-up');
        button.innerHTML = '<i class="bi bi-chevron-up"></i> Less';
    } else {
        shortText.style.display = 'block';
        fullText.style.display = 'none';
        icon.classList.remove('bi-chevron-up');
        icon.classList.add('bi-chevron-down');
        button.innerHTML = '<i class="bi bi-chevron-down"></i> More';
    }
}

// Variable global para almacenar el ID del asistente a eliminar
let assistantToDelete = null;

// Función para mostrar el modal de confirmación de eliminación
function deleteAssistant(assistantId) {
    // Guardar el ID del asistente a eliminar
    assistantToDelete = assistantId;
    
    // Mostrar el modal de confirmación
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteAssistantModal'));
    deleteModal.show();
}

// Función para confirmar y ejecutar la eliminación del asistente
async function confirmDeleteAssistant() {
    if (!assistantToDelete) {
        showToast('danger', 'Error: No assistant selected for deletion');
        return;
    }
    
    try {
        // Realizar la petición DELETE al servidor
        const response = await fetch(`/assistants/${assistantToDelete}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Cerrar el modal
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteAssistantModal'));
        if (deleteModal) {
            deleteModal.hide();
        }
        
        // Mostrar mensaje de éxito
        showToast('success', result.message || 'Assistant deleted successfully');
        
        // Recargar la página después de un breve retraso
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        console.error('Error deleting assistant:', error);
        showToast('danger', `Error deleting assistant: ${error.message}`);
    } finally {
        // Limpiar el ID del asistente
        assistantToDelete = null;
    }
}

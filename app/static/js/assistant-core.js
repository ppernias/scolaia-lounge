document.addEventListener('DOMContentLoaded', function() {
    // Inicializar todos los tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            delay: { show: 500, hide: 100 }
        });
    });

    // Inicializar eventos de keywords
    const keywordInput = document.getElementById('keywordInput');
    if (keywordInput) {
        keywordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
            }
        });
    }

    // Inicializar el modal de eliminación
    const deleteModalElement = document.getElementById('deleteAssistantModal');
    if (deleteModalElement) {
        deleteModal = new bootstrap.Modal(deleteModalElement);
    }

    // Botón de crear asistente
    const createBtn = document.getElementById('createAssistantBtn');
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('createAssistantModal'));
            modal.show();
        });
    }

    // Botón de importar asistente
    const importBtn = document.getElementById('importAssistantBtn');
    if (importBtn) {
        importBtn.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.yaml,.yml';
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    try {
                        const response = await fetch('/assistants/import', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await response.json();
                        
                        if (data.status === 'success') {
                            showToast('success', data.message);
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        } else {
                            showToast('error', data.message);
                        }
                    } catch (error) {
                        showToast('error', 'Error importing assistant');
                        console.error('Error:', error);
                    }
                }
            };
            input.click();
        });
    }
});

// Variables globales para el modal de eliminación
let currentAssistantId = null;
let deleteModal = null;

// Función para mostrar el modal de eliminación
function deleteAssistant(assistantId) {
    currentAssistantId = assistantId;
    if (deleteModal) {
        deleteModal.show();
    } else {
        console.error('Delete modal not initialized');
    }
}

// Función para confirmar la eliminación
function confirmDeleteAssistant() {
    if (!currentAssistantId) return;
    
    fetch(`/assistants/${currentAssistantId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        deleteModal.hide();
        if (data.status === 'success') {
            showToast('success', data.message);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('error', data.detail || 'Error removing assistant');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        deleteModal.hide();
        showToast('error', 'Error removing assistant');
    });
}

// Función para alternar la visibilidad del resumen
function toggleSummary(button) {
    const summaryElement = button.nextElementSibling;
    const isExpanded = summaryElement.style.maxHeight !== '0px' && summaryElement.style.maxHeight !== '';
    
    if (isExpanded) {
        summaryElement.style.maxHeight = '0px';
        button.textContent = 'Show Summary';
    } else {
        summaryElement.style.maxHeight = summaryElement.scrollHeight + 'px';
        button.textContent = 'Hide Summary';
    }
}

// Función para copiar el YAML al portapapeles
function copyYamlToClipboard() {
    const yamlContent = document.getElementById('yamlContent').textContent;
    navigator.clipboard.writeText(yamlContent)
        .then(() => {
            showToast('success', 'YAML copied to clipboard');
        })
        .catch(err => {
            console.error('Error copying YAML:', err);
            showToast('error', 'Error copying YAML');
        });
}

// Función para descargar el YAML
function downloadYaml() {
    const yamlContent = document.getElementById('yamlContent').textContent;
    
    // Parsear el YAML para obtener el título y la fecha de modificación
    try {
        const yamlData = jsyaml.load(yamlContent);
        const title = yamlData.metadata?.description?.title || 'assistant';
        const lastModified = yamlData.metadata?.lastupdate || new Date().toISOString();
        
        // Formatear la fecha para el nombre del archivo (YYYY-MM-DD-HH-mm)
        const date = new Date(lastModified);
        const formattedDate = date.getFullYear() + 
            '-' + String(date.getMonth() + 1).padStart(2, '0') + 
            '-' + String(date.getDate()).padStart(2, '0') +
            '-' + String(date.getHours()).padStart(2, '0') +
            '-' + String(date.getMinutes()).padStart(2, '0');
        
        // Crear el nombre del archivo
        const fileName = `${title}_${formattedDate}.yaml`;
        
        // Sanitizar el nombre del archivo (eliminar caracteres no válidos)
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9-_\.]/g, '_');
        
        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sanitizedFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error parsing YAML:', error);
        showToast('error', 'Error generating filename');
        
        // Si hay un error, usar un nombre por defecto
        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assistant.yaml';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

// Función para formatear una fecha ISO a un formato más legible
function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Función para guardar un nuevo asistente
function saveNewAssistant() {
    const yamlContent = document.getElementById('yamlEditor').value;

    try {
        // Validar YAML
        jsyaml.load(yamlContent);

        fetch('/assistants/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'yaml_content': yamlContent
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                showToast('success', 'Assistant created successfully');
                const modal = bootstrap.Modal.getInstance(document.getElementById('createAssistantModal'));
                modal.hide();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast('error', data.message || 'Error creating assistant');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error creating assistant');
        });
    } catch (e) {
        showToast('error', 'Invalid YAML format');
        console.error('YAML validation error:', e);
    }
}

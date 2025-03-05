let editingSettingId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar los inputs encriptados
    document.querySelectorAll('input[type="text"]').forEach(input => {
        if (input.dataset.encrypted === 'True') {
            input.value = '<encrypted>';
        }
    });

    // Inicializar los previews de color
    document.querySelectorAll('.color-preview').forEach(preview => {
        const input = preview.closest('.setting-item').querySelector('input[type="color"]');
        if (input) {
            preview.style.backgroundColor = input.value;
        }
    });

    // Inicializar modelos de Ollama si hay un valor guardado
    const ollamaSelect = document.querySelector('select[data-key="ollama_model"]');
    if (ollamaSelect && ollamaSelect.dataset.currentValue) {
        refreshOllamaModels();
    }

    // Inicializar modelos de OpenAI si hay un valor guardado y la API key está configurada
    const openaiSelect = document.querySelector('select[data-key="openapi_model"]');
    const openaiApiKey = document.querySelector('input[data-key="openapi_apikey"]');
    
    if (openaiSelect && openaiSelect.dataset.currentValue && 
        openaiApiKey && 
        openaiApiKey.value !== '<encrypted>' && 
        openaiApiKey.value !== 'enter here your 164 char OpenAI Project API key') {
        refreshOpenAIModels();
    }

    // Activar la primera pestaña por defecto
    const firstTab = document.querySelector('#settingsTabs .nav-link');
    if (firstTab) {
        new bootstrap.Tab(firstTab).show();
    }

    // Manejar el cambio de pestañas
    document.querySelectorAll('#settingsTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            new bootstrap.Tab(tab).show();
        });
    });

    // Añadir listener para cuando se muestra la pestaña de ollama
    document.querySelectorAll('#settingsTabs .nav-link').forEach(tab => {
        if (tab.getAttribute('data-bs-target') === '#content-ollama') {
            tab.addEventListener('shown.bs.tab', refreshOllamaModels);
        }
        // Añadir listener para la pestaña de OpenAI
        if (tab.getAttribute('data-bs-target') === '#content-openapi') {
            tab.addEventListener('shown.bs.tab', refreshOpenAIModels);
        }
    });

    // Añadir listener para la pestaña de defaults solo si existe
    const defaultsTab = document.querySelector('#tab-defaults');
    if (defaultsTab) {
        defaultsTab.addEventListener('shown.bs.tab', function (e) {
            loadDefaultsYaml();
        });
    }
});

function editSetting(id, category, key, value, isEncrypted) {
    editingSettingId = id;
    document.getElementById('settingId').value = id;
    document.getElementById('settingCategory').value = category;
    document.getElementById('settingKey').value = key;
    document.getElementById('settingValue').value = value;
    
    new bootstrap.Modal(document.getElementById('editSettingModal')).show();
}

function toggleEdit(settingId) {
    const input = document.getElementById(`setting_${settingId}`);
    const icon = document.getElementById(`icon_${settingId}`);
    const isEncrypted = input.dataset.encrypted === 'True';
    const isTextarea = input.tagName.toLowerCase() === 'textarea';
    const isSelect = input.tagName.toLowerCase() === 'select';
    
    if (input.readOnly || input.disabled) {
        // Entrar en modo edición
        if (isEncrypted) {
            // Obtener valor desencriptado
            fetch(`/settings/get-value/${settingId}`)
                .then(response => response.json())
                .then(data => {
                    input.value = data.value;
                    input.readOnly = false;
                    input.disabled = false;
                    if (!isTextarea) {
                        input.focus();
                    }
                    icon.classList.replace('bi-pencil-square', 'bi-check-lg');
                });
        } else {
            input.readOnly = false;
            input.disabled = false;
            if (!isSelect && !isTextarea) {
                input.focus();
            }
            icon.classList.replace('bi-pencil-square', 'bi-check-lg');
        }
    } else {
        // Guardar cambios
        saveSetting(settingId, input.value, isEncrypted)
            .then(() => {
                if (isEncrypted) {
                    input.value = '<encrypted>';
                }
                input.readOnly = true;
                input.disabled = true;
                icon.classList.replace('bi-check-lg', 'bi-pencil-square');
            });
    }
}

async function saveSetting(settingId, value, isEncrypted) {
    try {
        const response = await fetch(`/settings/update/${settingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: value,
                is_encrypted: isEncrypted
            })
        });

        if (!response.ok) {
            const error = await response.json();
            showNotification(error.detail || 'Error updating setting', 'error');
            throw new Error(error.detail || 'Network response was not ok');
        }

        // Mostrar notificación de éxito
        showNotification('Setting updated successfully', 'success');
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function handleSettingUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const settingId = formData.get('setting_id');
    
    try {
        const response = await fetch(`/settings/${settingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData)),
        });
        
        if (!response.ok) {
            const error = await response.json();
            showNotification(error.detail || 'Error updating setting', 'error');
            return;
        }
        
        showNotification('Setting updated successfully', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating setting', 'error');
    }
}

async function handleTestEmail(event) {
    event.preventDefault();
    const button = event.target;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending...';
    
    try {
        const response = await fetch('/settings/test-email', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
        } else {
            showNotification('Error sending test email', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error sending test email', 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function updateOllamaModelSelect(models, currentValue) {
    // Buscar el input de ollama_model
    const ollamaModelInput = document.querySelector('select[data-key="ollama_model"]');
    if (!ollamaModelInput) {
        console.error("Ollama model select not found");
        return;
    }

    // Si no hay currentValue, intentar obtenerlo del atributo data
    if (!currentValue && ollamaModelInput.dataset.currentValue) {
        currentValue = ollamaModelInput.dataset.currentValue;
    }

    // Guardar el valor actual
    const wasDisabled = ollamaModelInput.disabled;
    
    // Habilitar temporalmente para modificar
    ollamaModelInput.disabled = false;
    
    // Limpiar opciones actuales
    ollamaModelInput.innerHTML = '';
    
    // Añadir la opción "none" primero
    const noneOption = document.createElement('option');
    noneOption.value = "";
    noneOption.textContent = "none";
    if (!currentValue) {
        noneOption.selected = true;
    }
    ollamaModelInput.appendChild(noneOption);
    
    // Añadir las nuevas opciones
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        if (model === currentValue) {
            option.selected = true;
        }
        ollamaModelInput.appendChild(option);
    });
    
    // Restaurar el estado disabled
    ollamaModelInput.disabled = wasDisabled;
}

async function handleTestOllama() {
    try {
        const response = await fetch('/settings/test-ollama', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            showNotification(data.message, 'success');
            
            // Si hay detalles, mostrar información adicional
            if (data.details) {
                const details = data.details;
                if (details.models_status === "ok" && details.available_models) {
                    console.log("Available Ollama models:", details.available_models);
                    
                    // Actualizar el select de ollama_model
                    const ollamaSelect = document.querySelector('select[data-key="ollama_model"]');
                    if (ollamaSelect) {
                        updateOllamaModelSelect(details.available_models, ollamaSelect.value);
                    } else {
                        console.error("Ollama model select not found");
                    }
                    
                    // Mostrar los modelos disponibles en un toast
                    setTimeout(() => {
                        showNotification(`Available models: ${details.available_models.join(", ")}`, 'info');
                    }, 1000);
                }
            }
        } else {
            let errorMessage = data.detail || data.message || 'Error testing Ollama connection';
            if (data.details) {
                const details = data.details;
                if (details.connection_status === "error") {
                    errorMessage = "Cannot connect to Ollama";
                } else if (details.models_status === "error") {
                    errorMessage = "Connected to Ollama but cannot list models";
                }
            }
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error testing Ollama connection', 'error');
    }
}

function updateOpenAIModelSelect(models, currentValue) {
    // Buscar el input de openapi_model
    const openaiModelInput = document.querySelector('select[data-key="openapi_model"]');
    if (!openaiModelInput) return;

    // Si no hay currentValue, intentar obtenerlo del atributo data
    if (!currentValue && openaiModelInput.dataset.currentValue) {
        currentValue = openaiModelInput.dataset.currentValue;
    }

    // Guardar el valor actual
    const wasDisabled = openaiModelInput.disabled;
    
    // Habilitar temporalmente para modificar
    openaiModelInput.disabled = false;
    
    // Limpiar opciones actuales
    openaiModelInput.innerHTML = '';
    
    // Añadir la opción "none" primero
    const noneOption = document.createElement('option');
    noneOption.value = "";
    noneOption.textContent = "none";
    if (!currentValue) {
        noneOption.selected = true;
    }
    openaiModelInput.appendChild(noneOption);
    
    // Añadir las nuevas opciones
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        if (model === currentValue) {
            option.selected = true;
        }
        openaiModelInput.appendChild(option);
    });
    
    // Restaurar el estado disabled
    openaiModelInput.disabled = wasDisabled;
}

async function handleTestOpenAI() {
    try {
        const response = await fetch('/settings/test-openai', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            // Mostrar el mensaje principal
            showNotification(data.message, 'success');
            
            // Si hay detalles, mostrar información adicional
            if (data.details) {
                const details = data.details;
                if (details.models_status === "ok" && details.available_models) {
                    console.log("Available OpenAI models:", details.available_models);
                    
                    // Actualizar el select de openai_model
                    updateOpenAIModelSelect(details.available_models, document.querySelector('select[data-category="openapi"][data-key="openapi_model"]')?.value);
                    
                    // Mostrar los modelos disponibles en un toast
                    setTimeout(() => {
                        showNotification(`Available models: ${details.available_models.join(", ")}`, 'info');
                    }, 1000);
                }
            }
        } else {
            // Mostrar el error con detalles si están disponibles
            let errorMessage = data.detail || data.message || 'Error testing OpenAI connection';
            if (data.details) {
                const details = data.details;
                if (details.connection_status === "error") {
                    errorMessage = "Cannot connect to OpenAI API";
                } else if (details.models_status === "error") {
                    errorMessage = "Connected to OpenAI but cannot list models";
                }
            }
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error testing OpenAI connection', 'error');
    }
}

async function loadDefaultsYaml() {
    try {
        const response = await fetch('/settings/defaults-yaml');
        if (!response.ok) throw new Error('Failed to load defaults.yaml');
        const data = await response.text();
        document.getElementById('defaultsYamlEditor').value = data;
    } catch (error) {
        console.error('Error loading defaults.yaml:', error);
        showNotification('Error loading defaults.yaml', 'error');
    }
}

async function saveDefaultsYaml() {
    try {
        const yamlContent = document.getElementById('defaultsYamlEditor').value;
        const response = await fetch('/settings/defaults-yaml', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: yamlContent })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save defaults.yaml');
        }

        showNotification('defaults.yaml saved successfully', 'success');
    } catch (error) {
        console.error('Error saving defaults.yaml:', error);
        showNotification(error.message, 'error');
    }
}

async function reloadDefaultsYaml() {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
        await loadDefaultsYaml();
        showNotification('defaults.yaml reloaded', 'info');
    }
}

// Función para refrescar los modelos de Ollama
function refreshOllamaModels() {
    const ollamaSelect = document.querySelector('select[data-key="ollama_model"]');
    if (ollamaSelect) {
        // Hacer una petición para obtener los modelos
        fetch('/settings/test-ollama', {
            method: 'POST'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && data.details?.models_status === "ok") {
                updateOllamaModelSelect(data.details.available_models, ollamaSelect.dataset.currentValue);
            }
        })
        .catch(error => console.error('Error loading Ollama models:', error));
    }
}

// Función para refrescar los modelos de OpenAI
function refreshOpenAIModels() {
    const openaiSelect = document.querySelector('select[data-key="openapi_model"]');
    const openaiApiKey = document.querySelector('input[data-key="openapi_apikey"]');
    
    // Verificar si el select existe y si la API key está configurada (no es el valor por defecto)
    if (openaiSelect && openaiApiKey && 
        openaiApiKey.value !== '<encrypted>' && 
        openaiApiKey.value !== 'enter here your 164 char OpenAI Project API key') {
        
        // Hacer una petición para obtener los modelos
        fetch('/settings/test-openai', {
            method: 'POST'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success' && data.details?.models_status === "ok") {
                updateOpenAIModelSelect(data.details.available_models, openaiSelect.dataset.currentValue);
            }
        })
        .catch(error => console.error('Error loading OpenAI models:', error));
    }
}

// Add event listeners when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    const settingForms = document.querySelectorAll('.setting-form');
    const testEmailButton = document.getElementById('testEmailButton');
    const testOllamaButton = document.getElementById('testOllamaButton');
    const testOpenAIButton = document.getElementById('testOpenAIButton');
    
    settingForms.forEach(form => {
        form.addEventListener('submit', handleSettingUpdate);
    });
    
    if (testEmailButton) {
        testEmailButton.addEventListener('click', handleTestEmail);
    }
    
    if (testOllamaButton) {
        testOllamaButton.addEventListener('click', handleTestOllama);
    }
    
    if (testOpenAIButton) {
        testOpenAIButton.addEventListener('click', handleTestOpenAI);
    }
});

function updateThemeColor(settingId, value) {
    const colorInput = document.getElementById(`setting_${settingId}`);
    const textInput = document.getElementById(`text_${settingId}`);
    
    // Validar que el valor sea un color válido
    if (!isValidColor(value)) {
        showNotification('Invalid color value', 'error');
        // Restaurar valores anteriores
        textInput.value = colorInput.value;
        return;
    }

    // Actualizar ambos inputs
    colorInput.value = value;
    textInput.value = value;

    // Actualizar la variable CSS
    const key = colorInput.dataset.key;
    document.documentElement.style.setProperty(`--${key.replace('_', '-')}`, value);

    // Guardar el cambio
    saveSetting(settingId, value, false)
        .then(() => {
            showNotification(`Theme color "${key}" updated`, 'success');
        })
        .catch(error => {
            showNotification('Error saving color', 'error');
            console.error('Error:', error);
        });
}

function isValidColor(value) {
    // Validar formato hexadecimal (#RRGGBB o #RGB)
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
        return true;
    }
    // Validar formato rgb/rgba
    if (/^(rgb|rgba)\([\d\s,%.]+\)$/.test(value)) {
        return true;
    }
    return false;
}
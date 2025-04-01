// YAML Editor Module - Functions for editing YAML content
//=============================================================================

// Function to initialize YAML editor tabs
function initializeYamlEditorTabs() {
    const tabElements = document.querySelectorAll('#editYamlModal .nav-link');
    tabElements.forEach(tab => {
        tab.addEventListener('click', function(event) {
            event.preventDefault();
            const tabTarget = this.getAttribute('data-bs-target');
            if (tabTarget) {
                const tabInstance = new bootstrap.Tab(this);
                tabInstance.show();
                
                // Actualizar el contador de caracteres después de cambiar de pestaña
                setTimeout(() => {
                    if (typeof updateCharCount === 'function') {
                        updateCharCount();
                    } else if (window.YAMLUtils && typeof window.YAMLUtils.updateCharCount === 'function') {
                        window.YAMLUtils.updateCharCount();
                    }
                }, 100);
            }
        });
    });
}

// Function to convert YAML to JSON
function yamlToJson(yaml) {
    try {
        const json = jsyaml.load(yaml);
        return json;
    } catch (e) {
        console.error('Error parsing YAML:', e);
        return null;
    }
}

// Function to open the YAML editor modal
function editYamlContent(assistantId) {
    console.log('Editing YAML content for assistant:', assistantId);
    
    // Limpiar el formulario
    clearForm();
    
    // Establecer el modo de edición
    document.getElementById('editorMode').value = 'edit';
    document.getElementById('currentAssistantId').value = assistantId;
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('editYamlModal'));
    modal.show();
    
    // Cargar el contenido YAML
    fetch(`/assistants/assistant/${assistantId}/yaml`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('YAML data loaded from server:', data);
            console.log('Raw YAML content:', data.yaml_content);
            
            // Guardar el contenido YAML en el campo oculto
            document.getElementById('yamlContent').value = data.yaml_content;
            
            // Establecer el contenido en el editor raw YAML si existe
            const rawYamlEditor = document.getElementById('rawYaml');
            if (rawYamlEditor) {
                rawYamlEditor.value = data.yaml_content;
                
                // Actualizar el contador de caracteres para el editor raw
                setTimeout(() => {
                    if (typeof updateCharCount === 'function') {
                        updateCharCount();
                    } else if (window.YAMLUtils && typeof window.YAMLUtils.updateCharCount === 'function') {
                        window.YAMLUtils.updateCharCount();
                    }
                }, 200);
            }
            
            // Parsear el YAML
            try {
                const parsedData = jsyaml.load(data.yaml_content);
                console.log('Parsed YAML data (full object):', parsedData);
                
                // Verificar que el YAML tiene la estructura correcta según el esquema
                if (!parsedData.metadata || !parsedData.assistant_instructions) {
                    console.warn('El YAML no tiene la estructura esperada (metadata y assistant_instructions)');
                    // Intentar usar la estructura que tenga
                    loadFormFields(parsedData);
                } else {
                    console.log('YAML con estructura correcta detectada');
                    loadFormFields(parsedData);
                }
                
                // Inicializar los eventos del editor YAML
                if (typeof initializeYamlEditorEvents === 'function') {
                    initializeYamlEditorEvents();
                } else {
                    console.error('initializeYamlEditorEvents function not found');
                }
            } catch (e) {
                console.error('Error parsing YAML:', e);
                if (window.toast) {
                    window.toast.error('Error parsing YAML: ' + e.message);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching YAML content:', error);
            if (window.toast) {
                window.toast.error('Error fetching YAML content: ' + error.message);
            }
        });
}

// Function to save YAML changes
async function saveYamlChanges(shouldFinish = false) {
    console.log('YAML-EDITOR.JS: saveYamlChanges function called with shouldFinish =', shouldFinish);
    
    // Evitar duplicidad si ya se está ejecutando desde otro archivo
    if (window.saveInProgress) {
        console.log('YAML-EDITOR.JS: saveYamlChanges aborted - already in progress');
        return;
    }
    
    window.saveInProgress = true;
    console.log('YAML-EDITOR.JS: Setting saveInProgress flag to true');
    
    try {
        const assistantId = document.getElementById('currentAssistantId')?.value;
        const createNewVersion = document.getElementById('createNewVersion')?.checked || false;
        const minorChangesCheckbox = document.getElementById('minorChanges');
        const editorMode = document.getElementById('editorMode')?.value;
        
        console.log('YAML-EDITOR.JS: Current state:', { 
            assistantId, 
            createNewVersion, 
            minorChanges: minorChangesCheckbox?.checked, 
            editorMode,
            shouldFinish
        });
        
        // Verificar el límite de caracteres antes de guardar
        const saveButton = document.getElementById('saveYamlBtnFooter');
        const charCount = parseInt(document.getElementById('charCount')?.textContent || '0');
        const charLimit = parseInt(document.getElementById('maxChars')?.textContent || '100000');
        
        if (charCount > charLimit) {
            if (window.toast) {
                window.toast.error(`Content exceeds the ${charLimit} character limit. Please reduce the content.`);
            }
            console.error(`Character limit exceeded: ${charCount}/${charLimit}`);
            return;
        }
        
        // Obtener los datos del formulario
        let formData;
        try {
            if (typeof getFormData === 'function') {
                formData = getFormData();
            } else if (typeof window.YAMLUtils !== 'undefined' && typeof window.YAMLUtils.getFormData === 'function') {
                formData = window.YAMLUtils.getFormData();
            } else {
                throw new Error('getFormData function not found');
            }
            
            console.log('YAML-EDITOR.JS: Form data collected:', formData);
        } catch (e) {
            if (window.toast) {
                window.toast.error('Error collecting form data: ' + e.message);
            }
            console.error('YAML-EDITOR.JS: Error collecting form data:', e);
            return;
        }
        
        // Si estamos finalizando, validar los campos requeridos
        if (shouldFinish) {
            console.log('YAML-EDITOR.JS: Validating required fields before finishing');
            
            // Validar campos requeridos
            let validationResult;
            if (typeof window.YAMLValidator !== 'undefined' && typeof window.YAMLValidator.validateRequiredFields === 'function') {
                validationResult = window.YAMLValidator.validateRequiredFields(formData);
            } else {
                console.error('YAML-EDITOR.JS: YAMLValidator not found');
                if (window.toast) {
                    window.toast.error('Error: YAMLValidator not found. Cannot validate required fields.');
                }
                return;
            }
            
            // Si hay campos requeridos faltantes, mostrar error y detener
            if (!validationResult.isValid) {
                console.info('YAML-EDITOR.JS: Validation failed. Missing required fields:', validationResult.missingFields);
                
                // Mostrar errores de validación
                if (typeof window.YAMLValidator.displayValidationErrors === 'function') {
                    window.YAMLValidator.displayValidationErrors(validationResult.missingFields);
                } else {
                    // Fallback si la función de visualización no está disponible
                    let errorMessage = 'Missing required fields: ' + validationResult.missingFields.join(', ');
                    if (window.toast) {
                        window.toast.error(errorMessage);
                    } else {
                        alert(errorMessage);
                    }
                }
                
                return;
            }
            
            console.log('YAML-EDITOR.JS: Validation successful');
        }
        
        // Generar el YAML a partir de los datos del formulario
        let yamlContent;
        try {
            // Convertir los datos a YAML
            yamlContent = jsyaml.dump(formData);
            console.log('YAML-EDITOR.JS: Generated YAML');
            
            // Validar el YAML generado
            const parsedYaml = jsyaml.load(yamlContent);
            if (!parsedYaml || Object.keys(parsedYaml).length === 0) {
                throw new Error('Generated YAML is empty or invalid');
            }
        } catch (e) {
            if (window.toast) {
                window.toast.error('Error generating YAML: ' + e.message);
            }
            console.error('YAML-EDITOR.JS: Error generating YAML:', e);
            return;
        }
        
        // Si no estamos finalizando, solo guardar temporalmente
        if (!shouldFinish) {
            console.log('YAML-EDITOR.JS: Saving temporarily only');
            
            // Actualizar el YAML original para futuras comparaciones
            window.originalYaml = yamlContent;
            
            // Mostrar mensaje de éxito
            if (window.toast) {
                window.toast.success('Changes saved temporarily');
            }
            console.log('YAML-EDITOR.JS: Changes saved temporarily');
            return;
        }
        
        // A partir de aquí, solo se ejecuta si shouldFinish es true
        console.log('YAML-EDITOR.JS: Proceeding with server submission');
        
        // Verificar si el contenido ha cambiado
        if (yamlContent === window.originalYaml && editorMode === 'edit') {
            console.log('YAML-EDITOR.JS: No changes detected');
            if (window.toast) {
                window.toast.info('No changes detected in YAML content');
            }
            const modal = bootstrap.Modal.getInstance(document.getElementById('editYamlModal'));
            if (modal) modal.hide();
            return;
        }
        
        // Deshabilitar el botón de guardar para evitar múltiples envíos
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
        }
        
        // Enviar los datos al servidor
        try {
            let url;
            if (editorMode === 'edit' && assistantId) {
                // La ruta correcta es /{assistant_id} sin 'update_yaml'
                url = `/assistants/${assistantId}`;
            } else {
                // Para crear un nuevo asistente
                url = '/assistants/create';
            }
            
            console.log('YAML-EDITOR.JS: Sending YAML to URL:', url);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    yaml_content: yamlContent,
                    create_new_version: createNewVersion,
                    minor_changes: minorChangesCheckbox ? minorChangesCheckbox.checked : false
                })
            });
            
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('YAML-EDITOR.JS: Server response:', result);
            
            // Verificar si la respuesta contiene un mensaje de éxito
            if (result.success || result.message?.includes('successfully')) {
                if (window.toast) {
                    window.toast.success(result.message || 'YAML saved successfully');
                }
                
                // Cerrar el modal
                console.log('YAML-EDITOR.JS: Closing modal');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editYamlModal'));
                if (modal) modal.hide();
                
                // Redirigir según la respuesta del servidor
                if (result.redirect_url) {
                    console.log('YAML-EDITOR.JS: Redirecting to', result.redirect_url);
                    window.location.href = result.redirect_url;
                } else {
                    console.log('YAML-EDITOR.JS: Redirecting to /assistants');
                    window.location.href = '/assistants';
                }
            } else {
                throw new Error(result.message || 'Error saving YAML');
            }
        } catch (error) {
            if (window.toast) {
                window.toast.error('Error saving YAML: ' + error.message);
            }
            console.error('YAML-EDITOR.JS: Error saving YAML:', error);
        } finally {
            // Restaurar el botón de guardar
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = 'Save';
            }
        }
    } finally {
        // Siempre liberar el flag de progreso
        console.log('YAML-EDITOR.JS: Setting saveInProgress flag to false');
        window.saveInProgress = false;
    }
}

// Export the functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initializeYamlEditorTabs, 
        yamlToJson, 
        editYamlContent, 
        saveYamlChanges 
    };
} else {
    // Make functions available globally when included via script tag
    window.YAMLEditor = { 
        initializeYamlEditorTabs, 
        yamlToJson, 
        editYamlContent, 
        saveYamlChanges 
    };
}

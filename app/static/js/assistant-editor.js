// YAML Management - Core functions for handling YAML content
//=============================================================================

// Function to verify if we are on the assistant editor page
function isAssistantEditorPage() {
    // Check if key elements of the assistant editor exist
    return document.getElementById('editYamlModal') !== null;
}

// Function to show YAML content
function showYamlContent(assistantId) {
    fetch(`/assistants/assistant/${assistantId}/yaml`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const yamlContent = document.getElementById('yamlContent');
            if (yamlContent) {
                yamlContent.textContent = data.yaml_content;
                const modal = new bootstrap.Modal(document.getElementById('yamlModal'));
                modal.show();
            } else {
                if (window.toast) {
                    window.toast.error('Error: YAML content element not found');
                }
                console.error('YAML content element not found');
            }
        })
        .catch(error => {
            if (window.toast) {
                window.toast.error('Error loading YAML content: ' + error.message);
            }
            console.error('Error loading YAML content:', error);
        });
}

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
    console.log('Editing assistant with ID:', assistantId);
    const button = document.querySelector(`button[onclick="editYamlContent('${assistantId}')"]`);
    if (button && button.disabled) {
        console.log('Button is disabled, aborting edit');
        return;
    }

    // Ensure minor changes checkbox is checked by default
    document.getElementById('minorChanges').checked = true;
    // Initialize new version checkbox state
    const newVersionCheckbox = document.getElementById('createNewVersion');
    if (newVersionCheckbox) {
        newVersionCheckbox.checked = false;
        newVersionCheckbox.disabled = true;
    }
    
    // Primero abrir el modal para asegurarnos de que todos los elementos estén en el DOM
    const modalElement = document.getElementById('editYamlModal');
    console.log('Modal element found:', modalElement ? 'Yes' : 'No');
    
    // Inspeccionar el contenido del modal
    if (modalElement) {
        console.log('Modal HTML structure (first 100 chars):', modalElement.innerHTML.substring(0, 100) + '...');
        // Verificar si el contenedor de herramientas está presente en el HTML
        const toolsListPresent = modalElement.innerHTML.includes('toolsList');
        console.log('toolsList ID present in HTML:', toolsListPresent);
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Inicializar las pestañas después de mostrar el modal
    initializeYamlEditorTabs();
    
    // Verificar que el modal se ha abierto correctamente
    setTimeout(() => {
        console.log('Modal should be visible now');
        const modalVisible = document.querySelector('.modal.show') !== null;
        console.log('Modal is visible:', modalVisible);
        
        // Limpiar el contenedor de herramientas inmediatamente
        const toolsList = document.getElementById('toolsList');
        if (toolsList) {
            console.log('toolsList found after opening modal');
            toolsList.innerHTML = '';
        } else {
            console.warn('toolsList element not found in DOM after opening modal');
            // Buscar todos los elementos con ID que contengan 'tool'
            const toolElements = document.querySelectorAll('[id*="tool"]');
            console.log('Elements with "tool" in ID:', Array.from(toolElements).map(el => el.id));
        }
        
        console.log('Fetching YAML data for assistant:', assistantId);
        fetch(`/assistants/${assistantId}/yaml`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(responseText => {
                console.log('YAML data received, length:', responseText.length);
                console.log('YAML data preview:', responseText.substring(0, 200) + '...');
                
                // Intentar parsear la respuesta como JSON primero (podría estar encapsulada)
                let yaml = responseText;
                try {
                    const jsonData = JSON.parse(responseText);
                    console.log('Response parsed as JSON:', Object.keys(jsonData));
                    
                    // Si el JSON contiene una propiedad yaml_content, extraer el contenido YAML
                    if (jsonData.yaml_content) {
                        console.log('Found yaml_content in JSON response, extracting...');
                        yaml = jsonData.yaml_content;
                    }
                } catch (e) {
                    // Si no es JSON, asumir que es directamente YAML
                    console.log('Response is not JSON, assuming direct YAML content');
                }
                
                // Ensure modal is fully shown before setting value
                setTimeout(() => {
                    console.log('Setting up editor with YAML data');
                    const editor = document.getElementById('yamlEditor');
                    if (editor) {
                        // Guardar el YAML original para referencia
                        window.originalYaml = yaml;
                        
                        // Establecer el valor en el editor
                        editor.value = yaml;
                        document.getElementById('currentAssistantId').value = assistantId;
                        document.getElementById('editorMode').value = 'edit'; // Establecer modo de edición
                        
                        console.log('Clearing lists and containers');
                        // Limpiar todas las listas antes de cargar nuevos datos
                        clearAllLists();
                        
                        // Limpiar el contenedor de tags
                        const tagsContainer = document.getElementById('tagsContainer');
                        if (tagsContainer) {
                            tagsContainer.innerHTML = '';
                        }
                        
                        // Verificar nuevamente el contenedor de herramientas
                        const toolsList = document.getElementById('toolsList');
                        if (toolsList) {
                            console.log('toolsList found before loading data');
                        } else {
                            console.warn('toolsList still not found before loading data');
                            // Intentar buscar el contenedor por clase
                            const toolsContainer = document.querySelector('.tools-container');
                            if (toolsContainer) {
                                console.log('Found tools container by class');
                                // Asignar ID si no lo tiene
                                if (!toolsContainer.id) {
                                    toolsContainer.id = 'toolsList';
                                    console.log('Assigned ID to tools container');
                                }
                            }
                        }
                        
                        // Load data into form fields
                        try {
                            console.log('Parsing YAML:', yaml.substring(0, 100) + '...');
                            const data = jsyaml.load(yaml);
                            console.log('Parsed data structure:', Object.keys(data));
                            
                            // Verificar si hay datos en el YAML antes de cargar los campos
                            if (Object.keys(data).length === 0) {
                                console.error('YAML data is empty or invalid');
                                throw new Error('YAML data is empty or invalid');
                            }
                            
                            if (data.schema) {
                                console.log('Schema keys:', Object.keys(data.schema));
                                if (data.schema.tools) {
                                    console.log('Tools found in schema:', data.schema.tools.length);
                                } else {
                                    console.log('No tools found in schema');
                                }
                            }
                            if (data.assistant_instructions?.tools) {
                                console.log('Tools found in assistant_instructions');
                                const toolsObj = data.assistant_instructions.tools;
                                if (toolsObj.commands) {
                                    console.log('Commands found:', Object.keys(toolsObj.commands).length);
                                }
                                if (toolsObj.options) {
                                    console.log('Options found:', Object.keys(toolsObj.options).length);
                                }
                                if (toolsObj.decorators) {
                                    console.log('Decorators found:', Object.keys(toolsObj.decorators).length);
                                }
                            }
                            
                            // Cargar los datos en los campos del formulario
                            console.log('Llamando a loadFormFields con datos:', data);
                            loadFormFields(data);
                            
                            // Ensure character count is updated after loading
                            setTimeout(updateCharCount, 200);
                            
                            // Add event listener for tab changes to update character count
                            const tabElements = document.querySelectorAll('#editYamlModal .nav-link');
                            tabElements.forEach(tab => {
                                tab.addEventListener('shown.bs.tab', function() {
                                    setTimeout(updateCharCount, 100);
                                });
                            });
                        } catch (e) {
                            console.error('Error parsing YAML content:', e);
                            if (window.toast) {
                                window.toast.error('Error parsing YAML content: ' + e.message);
                            } else {
                                console.error('Error parsing YAML content:', e);
                            }
                        }
                    }
                }, 500);
            })
            .catch(error => {
                console.error('Error loading YAML content:', error);
                if (window.toast) {
                    window.toast.error('Error loading YAML content: ' + error.message);
                } else {
                    console.error('Error loading YAML content:', error);
                }
            });
    }, 300);
}

// Function to save YAML changes
async function saveYamlChanges(shouldFinish = false) {
    console.log('ASSISTANT-EDITOR.JS: saveYamlChanges called with shouldFinish =', shouldFinish);
    
    // Evitar duplicidad si ya se está ejecutando desde otro archivo
    if (window.saveInProgress) {
        console.log('ASSISTANT-EDITOR.JS: saveYamlChanges aborted - already in progress');
        return;
    }
    
    window.saveInProgress = true;
    console.log('ASSISTANT-EDITOR.JS: Setting saveInProgress flag to true');
    
    try {
        const assistantId = document.getElementById('currentAssistantId')?.value;
        const createNewVersion = document.getElementById('createNewVersion')?.checked;
        const minorChangesCheckbox = document.getElementById('minorChanges');
        const editorMode = document.getElementById('editorMode')?.value;
        
        console.log('ASSISTANT-EDITOR.JS: Current state:', { 
            assistantId, 
            createNewVersion, 
            minorChanges: minorChangesCheckbox?.checked, 
            editorMode,
            shouldFinish
        });
        
        // Verificar el límite de caracteres antes de guardar
        const saveButton = document.querySelector('#editYamlModal .btn-primary');
        const charCount = parseInt(saveButton?.dataset.charCount || '0');
        const charLimit = parseInt(saveButton?.dataset.charLimit || '100000');
        
        if (charCount > charLimit) {
            if (window.toastr) {
                toastr.error(`El contenido excede el límite de ${charLimit} caracteres. Por favor, reduzca el contenido.`);
            }
            console.error(`Character limit exceeded: ${charCount}/${charLimit}`);
            return;
        }
        
        // Obtener los datos del formulario
        console.log('ASSISTANT-EDITOR.JS: Getting form data');
        const formData = window.YAMLUtils.getFormData();
        console.log('ASSISTANT-EDITOR.JS: Form data:', formData);
        
        // Si estamos finalizando, validar los campos obligatorios
        if (shouldFinish) {
            console.log('ASSISTANT-EDITOR.JS: Validating required fields');
            const validationResult = validateRequiredFields(formData);
            if (!validationResult.isValid) {
                if (window.toastr) {
                    toastr.error('Faltan campos obligatorios: ' + validationResult.missingFields.join(', '));
                }
                console.error('Missing required fields:', validationResult.missingFields);
                return;
            }
        }
        
        // Convertir los datos a YAML
        console.log('ASSISTANT-EDITOR.JS: Generating YAML');
        const yamlContent = generateYaml(formData);
        
        // Verificar si el contenido ha cambiado
        if (yamlContent === window.originalYaml && editorMode === 'edit') {
            console.log('ASSISTANT-EDITOR.JS: No changes detected');
            if (window.toastr) {
                toastr.info('No se detectaron cambios en el contenido');
            }
            
            // Si estamos finalizando, cerrar el modal y redirigir
            if (shouldFinish) {
                console.log('ASSISTANT-EDITOR.JS: Closing modal and redirecting');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editYamlModal'));
                if (modal) modal.hide();
                
                // Redirigir a la página de asistentes
                console.log('ASSISTANT-EDITOR.JS: Redirecting to /assistants');
                window.location.href = '/assistants';
            }
            return;
        }
        
        // Validar el YAML antes de continuar
        try {
            console.log('ASSISTANT-EDITOR.JS: Validating YAML');
            const parsedYaml = jsyaml.load(yamlContent);
            if (!parsedYaml || Object.keys(parsedYaml).length === 0) {
                throw new Error('YAML content is empty or invalid');
            }
        } catch (e) {
            if (window.toastr) {
                toastr.error('Error validating YAML: ' + e.message);
            }
            console.error('Error validating YAML:', e);
            return;
        }
        
        // Si no estamos finalizando, solo guardar temporalmente
        if (!shouldFinish) {
            console.log('ASSISTANT-EDITOR.JS: Saving temporarily only');
            // Actualizar el YAML original para futuras comparaciones
            window.originalYaml = yamlContent;
            
            // Mostrar mensaje de éxito
            if (window.toastr) {
                toastr.success('Cambios guardados temporalmente');
            }
            return;
        }
        
        // A partir de aquí, solo se ejecuta si shouldFinish es true
        console.log('ASSISTANT-EDITOR.JS: Proceeding with server submission');
        
        // Deshabilitar el botón de finalizar para evitar múltiples envíos
        const finishButton = document.getElementById('finishYamlBtn');
        if (finishButton) {
            finishButton.disabled = true;
            finishButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
        }
        
        // Enviar los datos al servidor
        try {
            let url;
            if (editorMode === 'edit' && assistantId) {
                // Usar la misma URL que en yaml-editor.js
                url = `/assistants/${assistantId}`;
            } else {
                // Para crear un nuevo asistente
                url = '/assistants/create';
            }
            
            console.log('ASSISTANT-EDITOR.JS: Sending YAML to URL:', url);
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
            console.log('ASSISTANT-EDITOR.JS: Server response:', result);
            
            // Verificar si la respuesta contiene un mensaje de éxito
            if (result.success || result.message?.includes('successfully')) {
                if (window.toastr) {
                    toastr.success(result.message || 'YAML saved successfully');
                }
                
                // Cerrar el modal
                console.log('ASSISTANT-EDITOR.JS: Closing modal');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editYamlModal'));
                if (modal) modal.hide();
                
                // Redirigir a la página de asistentes
                console.log('ASSISTANT-EDITOR.JS: Redirecting to /assistants');
                window.location.href = '/assistants';
            } else {
                throw new Error(result.message || 'Error saving YAML');
            }
        } catch (error) {
            if (window.toastr) {
                toastr.error('Error saving YAML: ' + error.message);
            }
            console.error('ASSISTANT-EDITOR.JS: Error saving YAML:', error);
        } finally {
            // Restaurar el botón
            if (finishButton) {
                finishButton.disabled = false;
                finishButton.innerHTML = '<i class="bi bi-check-circle"></i> Finish';
            }
        }
    } finally {
        // Siempre liberar el flag de progreso
        console.log('ASSISTANT-EDITOR.JS: Setting saveInProgress flag to false');
        window.saveInProgress = false;
    }
}

// Function to finish YAML changes
function finishYamlChanges() {
    try {
        // Obtener los datos del formulario usando YAMLUtils
        const formData = window.YAMLUtils.getFormData();
        
        // Validar campos obligatorios
        const validation = validateRequiredFields(formData);
        
        if (!validation.isValid) {
            // Mostrar mensaje de error con los campos faltantes
            if (window.toastr) {
                toastr.error('Por favor complete todos los campos obligatorios: ' + validation.missingFields.join(', '));
            } else {
                alert('Por favor complete todos los campos obligatorios: ' + validation.missingFields.join(', '));
            }
            return false;
        }
        
        // Si todos los campos requeridos estuvieron completos, guardar y finalizar
        saveYamlChanges(true);
        return true;
    } catch (error) {
        console.error('Error al finalizar cambios:', error);
        if (window.toastr) {
            toastr.error('Error al finalizar cambios: ' + error.message);
        } else {
            alert('Error al finalizar cambios: ' + error.message);
        }
        return false;
    }
}

// Función para validar los campos obligatorios según el schema
function validateRequiredFields(data) {
    const missingFields = [];
    
    // Validar campos obligatorios a nivel raíz
    if (!data.metadata) {
        missingFields.push('metadata');
    }
    if (!data.assistant_instructions) {
        missingFields.push('assistant_instructions');
    }
    
    // Validar campos obligatorios en metadata
    if (data.metadata) {
        // Validar author
        if (!data.metadata.author) {
            missingFields.push('metadata.author');
        } else if (!data.metadata.author.name) {
            missingFields.push('metadata.author.name');
        }
        
        // Validar description
        if (!data.metadata.description) {
            missingFields.push('metadata.description');
        } else {
            // Validar campos obligatorios en description
            if (!data.metadata.description.title) {
                missingFields.push('metadata.description.title');
            }
            if (!data.metadata.description.summary) {
                missingFields.push('metadata.description.summary');
            }
            if (!data.metadata.description.coverage) {
                missingFields.push('metadata.description.coverage');
            }
            if (!data.metadata.description.educational_level || data.metadata.description.educational_level.length === 0) {
                missingFields.push('metadata.description.educational_level');
            }
            if (!data.metadata.description.use_cases || data.metadata.description.use_cases.length === 0) {
                missingFields.push('metadata.description.use_cases');
            }
            if (!data.metadata.description.keywords || data.metadata.description.keywords.length === 0) {
                missingFields.push('metadata.description.keywords');
            }
        }
        
        // Validar visibility
        if (!data.metadata.visibility) {
            missingFields.push('metadata.visibility');
        }
        
        // Validar rights
        if (!data.metadata.rights) {
            missingFields.push('metadata.rights');
        }
        
        // Validar history
        if (!data.metadata.history || data.metadata.history.length === 0) {
            missingFields.push('metadata.history');
        }
    }
    
    // Validar campos obligatorios en assistant_instructions
    if (data.assistant_instructions) {
        // Validar role
        if (!data.assistant_instructions.role) {
            missingFields.push('assistant_instructions.role');
        }
        
        // Validar context
        if (!data.assistant_instructions.context) {
            missingFields.push('assistant_instructions.context');
        } else {
            // Validar campos obligatorios en context
            if (!data.assistant_instructions.context.context_definition || data.assistant_instructions.context.context_definition.length === 0) {
                missingFields.push('assistant_instructions.context.context_definition');
            }
            if (!data.assistant_instructions.context.integration_strategy || data.assistant_instructions.context.integration_strategy.length === 0) {
                missingFields.push('assistant_instructions.context.integration_strategy');
            }
            if (!data.assistant_instructions.context.user_data_handling || data.assistant_instructions.context.user_data_handling.length === 0) {
                missingFields.push('assistant_instructions.context.user_data_handling');
            }
        }
        
        // Validar behavior
        if (!data.assistant_instructions.behavior) {
            missingFields.push('assistant_instructions.behavior');
        } else {
            // Validar campos obligatorios en behavior
            if (!data.assistant_instructions.behavior.on_tool) {
                missingFields.push('assistant_instructions.behavior.on_tool');
            }
            if (!data.assistant_instructions.behavior.on_greeting) {
                missingFields.push('assistant_instructions.behavior.on_greeting');
            }
            if (!data.assistant_instructions.behavior.on_help_command) {
                missingFields.push('assistant_instructions.behavior.on_help_command');
            }
            if (!data.assistant_instructions.behavior.invalid_command_response) {
                missingFields.push('assistant_instructions.behavior.invalid_command_response');
            }
            if (!data.assistant_instructions.behavior.unrelated_topic_response) {
                missingFields.push('assistant_instructions.behavior.unrelated_topic_response');
            }
            if (!data.assistant_instructions.behavior.prompt_visibility) {
                missingFields.push('assistant_instructions.behavior.prompt_visibility');
            }
        }
        
        // Validar style_guidelines
        if (!data.assistant_instructions.style_guidelines) {
            missingFields.push('assistant_instructions.style_guidelines');
        } else {
            // Validar campos obligatorios en style_guidelines
            if (!data.assistant_instructions.style_guidelines.tone) {
                missingFields.push('assistant_instructions.style_guidelines.tone');
            }
            if (!data.assistant_instructions.style_guidelines.level_of_detail) {
                missingFields.push('assistant_instructions.style_guidelines.level_of_detail');
            }
            if (!data.assistant_instructions.style_guidelines.formatting_rules || 
                data.assistant_instructions.style_guidelines.formatting_rules.length === 0) {
                missingFields.push('assistant_instructions.style_guidelines.formatting_rules');
            }
        }
        
        // Validar help_text
        if (!data.assistant_instructions.help_text) {
            missingFields.push('assistant_instructions.help_text');
        }
        
        // Validar final_notes
        if (!data.assistant_instructions.final_notes || data.assistant_instructions.final_notes.length === 0) {
            missingFields.push('assistant_instructions.final_notes');
        }
        
        // Validar capabilities
        if (!data.assistant_instructions.capabilities || data.assistant_instructions.capabilities.length === 0) {
            missingFields.push('assistant_instructions.capabilities');
        }
        
        // Validar tools
        if (!data.assistant_instructions.tools) {
            missingFields.push('assistant_instructions.tools');
        } else {
            // Validar campos obligatorios en tools
            if (!data.assistant_instructions.tools.commands) {
                missingFields.push('assistant_instructions.tools.commands');
            }
            if (!data.assistant_instructions.tools.options) {
                missingFields.push('assistant_instructions.tools.options');
            }
            if (!data.assistant_instructions.tools.decorators) {
                missingFields.push('assistant_instructions.tools.decorators');
            }
        }
    }
    
    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields
    };
}

// Function to load tools from YAML data
function loadTools(data) {
    // Inicializar variables para rastrear si se han cargado herramientas
    let hasLoadedCommands = false;
    let hasLoadedOptions = false;
    let hasLoadedDecorators = false;
    
    // Verificar si hay herramientas en las instrucciones del asistente
    if (data.assistant_instructions && data.assistant_instructions.tools) {
        const toolsObj = data.assistant_instructions.tools;
        
        // Cargar comandos
        if (toolsObj.commands && typeof toolsObj.commands === 'object') {
            if (Object.keys(toolsObj.commands).length > 0) {
                hasLoadedCommands = true;
                Object.entries(toolsObj.commands).forEach(([name, details]) => {
                    // Extraer el nombre sin el prefijo '/'
                    const commandName = name.startsWith('/') ? name.substring(1) : name;
                    
                    let description = '';
                    if (typeof details === 'object' && details.description) {
                        description = details.description;
                    } else if (typeof details === 'string') {
                        description = details;
                    }
                    addToolItem(commandName, description, 'command');
                });
            }
        }
        
        // Cargar opciones
        if (toolsObj.options && typeof toolsObj.options === 'object') {
            if (Object.keys(toolsObj.options).length > 0) {
                hasLoadedOptions = true;
                Object.entries(toolsObj.options).forEach(([name, details]) => {
                    let description = '';
                    if (typeof details === 'object' && details.description) {
                        description = details.description;
                    } else if (typeof details === 'string') {
                        description = details;
                    }
                    addToolItem(name, description, 'option');
                });
            }
        }
        
        // Cargar decoradores
        if (toolsObj.decorators && typeof toolsObj.decorators === 'object') {
            if (Object.keys(toolsObj.decorators).length > 0) {
                hasLoadedDecorators = true;
                Object.entries(toolsObj.decorators).forEach(([name, details]) => {
                    let description = '';
                    if (typeof details === 'object' && details.description) {
                        description = details.description;
                    } else if (typeof details === 'string') {
                        description = details;
                    }
                    addToolItem(name, description, 'decorator');
                });
            }
        }
    }
    
    // Cargar herramientas predeterminadas si no se cargaron desde assistant_instructions
    if (!hasLoadedCommands || !hasLoadedOptions || !hasLoadedDecorators) {
        // Realizar una solicitud para obtener el schema.yaml
        fetch('/assistants/api/schema')
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudo cargar el esquema');
                }
                return response.json();
            })
            .then(schemaData => {
                try {
                    // Extraer la ruta correcta a las herramientas en el esquema
                    const toolsSchema = schemaData.properties?.assistant_instructions?.properties?.tools;
                    
                    if (!toolsSchema) {
                        return false;
                    }
                    
                    // Extraer commands, options y decorators del esquema
                    const commandsSchema = toolsSchema.properties?.commands;
                    const optionsSchema = toolsSchema.properties?.options;
                    const decoratorsSchema = toolsSchema.properties?.decorators;
                    
                    // Procesar commands si no se han cargado
                    if (!hasLoadedCommands && commandsSchema && commandsSchema.additionalProperties) {
                        const defaultCommandName = commandsSchema.default || '';
                        
                        // Si hay un comando predeterminado, extraer sus propiedades
                        if (defaultCommandName && defaultCommandName.startsWith('/')) {
                            // Extraer el nombre sin el prefijo '/'
                            const commandName = defaultCommandName.substring(1);
                            const description = commandsSchema.additionalProperties.properties?.description?.default || '';
                            addToolItem(commandName, description, 'command');
                        }
                    }
                    
                    // Procesar options si no se han cargado
                    if (!hasLoadedOptions && optionsSchema && optionsSchema.additionalProperties) {
                        const defaultOptionName = optionsSchema.default || '';
                        
                        // Si hay una opción predeterminada, extraer sus propiedades
                        if (defaultOptionName && defaultOptionName.startsWith('/')) {
                            // Extraer el nombre sin el prefijo '/'
                            const optionName = defaultOptionName.substring(1);
                            const description = optionsSchema.additionalProperties.properties?.description?.default || '';
                            addToolItem(optionName, description, 'option');
                        }
                    }
                    
                    // Procesar decorators si no se han cargado
                    if (!hasLoadedDecorators && decoratorsSchema && decoratorsSchema.additionalProperties) {
                        const defaultDecoratorName = decoratorsSchema.default || '';
                        
                        // Si hay un decorador predeterminado, extraer sus propiedades
                        if (defaultDecoratorName && defaultDecoratorName.startsWith('+++')) {
                            // Extraer el nombre sin el prefijo '+++'
                            const decoratorName = defaultDecoratorName.substring(3);
                            const description = decoratorsSchema.additionalProperties.properties?.description?.default || '';
                            addToolItem(decoratorName, description, 'decorator');
                        }
                    }
                    
                    return true;
                } catch (error) {
                    return false;
                }
            })
            .catch(error => {
                return false;
            });
    }
}

// Function to add a tool item to the list
function addToolItem(name, description, type = 'tool') {
    const toolsList = document.getElementById('toolsList');
    if (!toolsList) {
        console.error('toolsList element not found when adding tool:', name);
        return;
    }
    
    const toolItem = document.createElement('div');
    toolItem.className = 'tool-item mb-2 p-2 border rounded';
    toolItem.dataset.name = name;
    toolItem.dataset.type = type;
    
    const toolHeader = document.createElement('div');
    toolHeader.className = 'd-flex justify-content-between align-items-center';
    
    const toolName = document.createElement('strong');
    toolName.textContent = name;
    toolName.className = 'tool-name';
    
    const toolType = document.createElement('span');
    toolType.textContent = type;
    toolType.className = 'badge bg-secondary tool-type';
    
    const toolDesc = document.createElement('div');
    toolDesc.textContent = description;
    toolDesc.className = 'tool-description small text-muted mt-1';
    
    const removeButton = document.createElement('button');
    removeButton.className = 'btn btn-sm btn-danger remove-tool';
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.onclick = function() {
        toolItem.remove();
    };
    
    toolHeader.appendChild(toolName);
    toolHeader.appendChild(toolType);
    toolHeader.appendChild(removeButton);
    
    toolItem.appendChild(toolHeader);
    toolItem.appendChild(toolDesc);
    
    toolsList.appendChild(toolItem);
}

// Function to update character count
function updateCharCount() {
    const yamlEditor = document.getElementById('yamlEditor');
    const saveButton = document.querySelector('#editYamlModal .btn-primary');
    
    if (yamlEditor && saveButton) {
        const charCount = yamlEditor.value.length;
        const charLimit = parseInt(saveButton.dataset.charLimit || '100000');
        
        saveButton.dataset.charCount = charCount.toString();
        
        const countElement = document.getElementById('charCount');
        if (countElement) {
            countElement.textContent = `${charCount} / ${charLimit}`;
            
            // Cambiar el color según el porcentaje de uso
            const percentage = (charCount / charLimit) * 100;
            if (percentage > 90) {
                countElement.className = 'text-danger';
            } else if (percentage > 75) {
                countElement.className = 'text-warning';
            } else {
                countElement.className = 'text-muted';
            }
        }
    }
}

// Function to clear all lists
function clearAllLists() {
    const lists = [
        'educationalLevelList', 'keywordsList', 'useCasesList', 'contextDefinitionList', 
        'capabilitiesList', 'integrationStrategyList', 'userDataHandlingList', 'formattingRulesList', 'finalNotesList'
    ];
    
    lists.forEach(listId => {
        const list = document.getElementById(listId);
        if (list) list.innerHTML = '';
    });
}

// Function to get multiline text from textarea
function getMultilineText(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return [];
    
    return textarea.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
}

// Función para obtener items de una lista
function getListItems(listId) {
    const list = document.getElementById(listId);
    if (!list) return [];
    
    const items = [];
    list.querySelectorAll('li').forEach(li => {
        const value = li.getAttribute('data-value');
        if (value) items.push(value);
    });
    
    return items;
}

// Función auxiliar para establecer valores de forma segura
function setValueSafely(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    } else if (isAssistantEditorPage()) {
        // Solo mostrar warnings si estamos en la página del editor de asistentes
        console.warn(`Elemento con ID '${elementId}' no encontrado en el DOM`);
    }
}

// Función auxiliar para obtener valores de forma segura del objeto data
function safeGetValue(path, defaultValue = '') {
    const parts = path.split('.');
    let current = window.yamlData || {};
    
    for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[part];
    }
    
    return current !== undefined && current !== null ? current : defaultValue;
}

// Limpiar listas existentes
const lists = ['educationalLevelList', 'keywordsList', 'useCasesList', 'contextDefinitionList', 
             'capabilitiesList', 'integrationStrategyList', 'userDataHandlingList', 'formattingRulesList', 'finalNotesList'];

lists.forEach(listId => {
    const list = document.getElementById(listId);
    if (list) list.innerHTML = '';
});

// Activar la pestaña de metadatos primero
const metadataTab = document.getElementById('metadata-tab');
if (metadataTab) {
    const tab = new bootstrap.Tab(metadataTab);
    tab.show();
}

// Campos básicos - Metadata
setValueSafely('title', safeGetValue('title'));
setValueSafely('summary', safeGetValue('summary'));
setValueSafely('visibility', safeGetValue('visibility', 'true'));

// Campos de autor
setValueSafely('authorName', safeGetValue('author.name'));
setValueSafely('authorEmail', safeGetValue('author.email'));
setValueSafely('authorOrganization', safeGetValue('author.organization'));
setValueSafely('authorRole', safeGetValue('author.role'));

// Función para generar YAML a partir de los datos del formulario
function generateYaml(data) {
    try {
        // Utilizamos jsyaml para convertir los datos a formato YAML
        const yamlContent = jsyaml.dump(data, {
            indent: 2,        // Indentación de 2 espacios
            lineWidth: -1,    // Sin límite de ancho de línea
            noRefs: true,     // No usar referencias
            noCompatMode: true // No usar modo compatible
        });
        
        return yamlContent;
    } catch (error) {
        console.error('Error al generar YAML:', error);
        if (window.toastr) {
            toastr.error('Error al generar YAML: ' + error.message);
        }
        return '';
    }
}

// Función para copiar el YAML al portapapeles
function copyYamlToClipboard() {
    const editModeToggle = document.getElementById('editModeToggle');
    const yamlEditor = document.getElementById('yamlEditor');
    const yamlContent = document.getElementById('yamlContent');
    
    if (!editModeToggle || !yamlEditor || !yamlContent) return;
    
    const content = editModeToggle.checked ? 
        yamlEditor.value : 
        yamlContent.textContent;
    
    navigator.clipboard.writeText(content)
        .then(() => {
            if (window.toastr) {
                toastr.success('YAML copied to clipboard');
            }
        })
        .catch(err => {
            console.error('Could not copy text: ', err);
            if (window.toastr) {
                toastr.error('Failed to copy YAML');
            }
        });
}

// Función para descargar el YAML como archivo
function downloadYaml() {
    const editModeToggle = document.getElementById('editModeToggle');
    const yamlEditor = document.getElementById('yamlEditor');
    const yamlContent = document.getElementById('yamlContent');
    
    if (!editModeToggle || !yamlEditor || !yamlContent) return;
    
    const content = editModeToggle.checked ? 
        yamlEditor.value : 
        yamlContent.textContent;
    
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assistant.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Función para guardar el YAML desde el visor
function saveYamlFromViewer() {
    const editModeToggle = document.getElementById('editModeToggle');
    const yamlEditor = document.getElementById('yamlEditor');
    const yamlModal = document.getElementById('yamlModal');
    
    if (!editModeToggle || !yamlEditor || !yamlModal) return;
    
    if (editModeToggle.checked) {
        try {
            const yamlContent = yamlEditor.value;
            const data = jsyaml.load(yamlContent);
            loadDataIntoForm(data);
            if (window.toastr) {
                toastr.success('YAML loaded into form');
            }
            const modal = bootstrap.Modal.getInstance(yamlModal);
            if (modal) modal.hide();
        } catch (e) {
            if (window.toastr) {
                toastr.error('Error parsing YAML: ' + e.message);
            }
            console.error('Error parsing YAML:', e);
        }
    } else {
        if (window.toastr) {
            toastr.info('No changes to save');
        }
        const modal = bootstrap.Modal.getInstance(yamlModal);
        if (modal) modal.hide();
    }
}

// Función para alternar entre modo de visualización y edición
function toggleYamlEditMode() {
    const editModeToggle = document.getElementById('editModeToggle');
    const viewModeContainer = document.getElementById('viewModeContainer');
    const editModeContainer = document.getElementById('editModeContainer');
    const saveYamlBtn = document.getElementById('saveYamlBtn');
    
    if (!editModeToggle || !viewModeContainer || !editModeContainer || !saveYamlBtn) return;
    
    const isEditMode = editModeToggle.checked;
    
    if (isEditMode) {
        viewModeContainer.style.display = 'none';
        editModeContainer.style.display = 'block';
        saveYamlBtn.innerHTML = '<i class="bi bi-save"></i> Apply Changes';
    } else {
        viewModeContainer.style.display = 'block';
        editModeContainer.style.display = 'none';
        saveYamlBtn.innerHTML = '<i class="bi bi-save"></i> Save Changes';
    }
}

// Función para cargar datos desde YAML al formulario
function loadDataIntoForm(data) {
    // Resetear el formulario
    resetForm();
    
    // Verificar si estamos en la página correcta
    if (!isAssistantEditorPage()) {
        console.log('No estamos en la página del editor de asistentes, no se cargan los datos');
        return;
    }
    
    // Cargar datos de metadata
    if (data.metadata) {
        // Descripción
        if (data.metadata.description) {
            // Verificar si estamos en la página de edición de asistentes o en otra página
            // que pueda tener diferentes IDs
            
            // Para el nombre/title, intentamos ambos IDs posibles
            if (document.getElementById('title')) {
                setValueSafely('title', data.metadata.description.name || '');
            } else if (document.getElementById('name')) {
                setValueSafely('name', data.metadata.description.name || '');
            }
            
            // Para la descripción corta, intentamos ambos IDs posibles
            if (document.getElementById('summary')) {
                setValueSafely('summary', data.metadata.description.short_description || '');
            } else if (document.getElementById('shortDescription')) {
                setValueSafely('shortDescription', data.metadata.description.short_description || '');
            }
            
            // Para la descripción larga
            if (document.getElementById('longDescription')) {
                setValueSafely('longDescription', data.metadata.description.long_description || '');
            }
        }
        
        // Autor
        if (data.metadata.author) {
            if (document.getElementById('authorName')) {
                setValueSafely('authorName', data.metadata.author.name || '');
            }
            if (document.getElementById('authorEmail')) {
                setValueSafely('authorEmail', data.metadata.author.email || '');
            }
            if (document.getElementById('authorOrganization')) {
                setValueSafely('authorOrganization', data.metadata.author.organization || '');
            }
            if (document.getElementById('authorRole')) {
                setValueSafely('authorRole', data.metadata.author.role || '');
            }
        }
        
        // Visibilidad
        if (data.metadata.visibility) {
            if (document.getElementById('visibility')) {
                setValueSafely('visibility', data.metadata.visibility.type || 'private');
            }
        }
    }
    
    // Cargar datos de assistant_instructions
    if (data.assistant_instructions) {
        // Estilo
        if (data.assistant_instructions.style) {
            if (document.getElementById('tone')) {
                setValueSafely('tone', data.assistant_instructions.style.tone || '');
            }
            if (document.getElementById('writingStyle')) {
                setValueSafely('writingStyle', data.assistant_instructions.style.writing_style || '');
            }
            if (document.getElementById('audience')) {
                setValueSafely('audience', data.assistant_instructions.style.audience || '');
            }
            
            // Guidelines
            if (data.assistant_instructions.style.guidelines) {
                if (document.getElementById('doGuidelines')) {
                    setValueSafely('doGuidelines', data.assistant_instructions.style.guidelines.do || '');
                }
                if (document.getElementById('dontGuidelines')) {
                    setValueSafely('dontGuidelines', data.assistant_instructions.style.guidelines.dont || '');
                }
            }
        }
        
        // Comportamiento
        if (data.assistant_instructions.behavior) {
            if (document.getElementById('role')) {
                setValueSafely('role', data.assistant_instructions.behavior.role || '');
            }
            if (document.getElementById('helpText')) {
                setValueSafely('helpText', data.assistant_instructions.behavior.help_text || '');
            }
            if (document.getElementById('reasoning')) {
                setValueSafely('reasoning', data.assistant_instructions.behavior.reasoning || '');
            }
        }
        
        // Contexto y capacidades
        if (data.assistant_instructions.context_and_capabilities) {
            if (document.getElementById('capabilities')) {
                setValueSafely('capabilities', data.assistant_instructions.context_and_capabilities.capabilities || '');
            }
            if (document.getElementById('contextAndSources')) {
                setValueSafely('contextAndSources', data.assistant_instructions.context_and_capabilities.context_and_sources || '');
            }
        }
        
        // Herramientas
        if (data.assistant_instructions.tools) {
            // Verificar si existen las listas de herramientas
            const commandsList = document.getElementById('commandsList');
            const optionsList = document.getElementById('optionsList');
            const decoratorsList = document.getElementById('decoratorsList');
            
            // Limpiar las listas de herramientas si existen
            if (commandsList) commandsList.innerHTML = '';
            if (optionsList) optionsList.innerHTML = '';
            if (decoratorsList) decoratorsList.innerHTML = '';
            
            // Cargar comandos
            if (data.assistant_instructions.tools.commands && commandsList) {
                Object.entries(data.assistant_instructions.tools.commands).forEach(([name, details]) => {
                    // Extraer el nombre sin el prefijo '/'
                    const commandName = name.startsWith('/') ? name.substring(1) : name;
                    
                    let description = '';
                    if (typeof details === 'object' && details.description) {
                        description = details.description;
                    } else if (typeof details === 'string') {
                        description = details;
                    }
                    addToolItem(commandName, description, 'command');
                });
            }
            
            // Cargar opciones
            if (data.assistant_instructions.tools.options && optionsList) {
                Object.entries(data.assistant_instructions.tools.options).forEach(([name, details]) => {
                    let description = '';
                    if (typeof details === 'object' && details.description) {
                        description = details.description;
                    } else if (typeof details === 'string') {
                        description = details;
                    }
                    addToolItem(name, description, 'option');
                });
            }
            
            // Cargar decoradores
            if (data.assistant_instructions.tools.decorators && decoratorsList) {
                Object.entries(data.assistant_instructions.tools.decorators).forEach(([name, details]) => {
                    let description = '';
                    if (typeof details === 'object' && details.description) {
                        description = details.description;
                    } else if (typeof details === 'string') {
                        description = details;
                    }
                    addToolItem(name, description, 'decorator');
                });
            }
        }
    }
    
    // Actualizar contadores de caracteres
    updateCharCount('role', 'roleCharCount', 2000);
    updateCharCount('helpText', 'helpTextCharCount', 1000);
    updateCharCount('name', 'nameCharCount', 100);
    updateCharCount('shortDescription', 'shortDescriptionCharCount', 200);
    updateCharCount('longDescription', 'longDescriptionCharCount', 1000);
}

// Función para resetear el formulario
function resetForm() {
    // Resetear campos de texto
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
        input.value = '';
    });
    
    // Resetear selects
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Limpiar listas de herramientas
    document.getElementById('commandsList').innerHTML = '';
    document.getElementById('optionsList').innerHTML = '';
    document.getElementById('decoratorsList').innerHTML = '';
}

// Agregar evento para inicializar los botones cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    if (!isAssistantEditorPage()) {
        console.log('No estamos en la página del editor de asistentes, no se ejecuta el código');
        return;
    }
    
    console.log('DOM loaded, setting up add button events');
    
    // Configurar eventos para los botones +add
    setupAddButtonEvents();
    
    // También configurar cuando se abre el modal (por si acaso)
    const editYamlModal = document.getElementById('editYamlModal');
    if (editYamlModal) {
        editYamlModal.addEventListener('shown.bs.modal', function() {
            console.log('Modal shown, setting up add button events');
            setupAddButtonEvents();
        });
    }
    
    // Configurar evento para el botón de guardar en el footer
    const saveYamlBtnFooter = document.getElementById('saveYamlBtnFooter');
    if (saveYamlBtnFooter) {
        saveYamlBtnFooter.addEventListener('click', function() {
            saveYamlChanges(false); // Pasar explicitamente false para indicar que no debe finalizar
        });
    }
    
    // Configurar evento para el botón de finalizar
    const finishYamlBtn = document.getElementById('finishYamlBtn');
    if (finishYamlBtn) {
        finishYamlBtn.addEventListener('click', finishYamlChanges);
    }
});

// Función auxiliar para configurar los eventos de los botones +add
function setupAddButtonEvents() {
    console.log('setupAddButtonEvents: Starting to configure button events');
    
    // Educational Levels button
    const addEducationalLevelBtn = document.getElementById('addEducationalLevelBtn');
    console.log('setupAddButtonEvents: Educational Level button found?', !!addEducationalLevelBtn);
    
    if (addEducationalLevelBtn && !addEducationalLevelBtn.hasAttribute('onclick')) {
        console.log('setupAddButtonEvents: Setting up Educational Level button event');
        
        // Eliminar eventos anteriores para evitar duplicados
        const newBtn = addEducationalLevelBtn.cloneNode(true);
        addEducationalLevelBtn.parentNode.replaceChild(newBtn, addEducationalLevelBtn);
        
        newBtn.addEventListener('click', function(e) {
            console.log('Educational Level button clicked via addEventListener');
            e.preventDefault(); // Prevenir comportamiento por defecto
            e.stopPropagation(); // Detener propagación del evento
            
            const input = document.getElementById('newEducationalLevel');
            console.log('Input found?', !!input, 'Input value:', input ? input.value : 'N/A');
            
            if (input && input.value.trim() !== '') {
                console.log('Calling addListItem with:', 'educationalLevelList', input.value.trim());
                
                // Intentar llamar a la función de diferentes maneras
                if (typeof window.addListItem === 'function') {
                    console.log('Using global addListItem function');
                    window.addListItem('educationalLevelList', input.value.trim(), true);
                } else if (typeof window.YAMLUtils !== 'undefined' && typeof window.YAMLUtils.addListItem === 'function') {
                    console.log('Using YAMLUtils.addListItem function');
                    window.YAMLUtils.addListItem('educationalLevelList', input.value.trim(), true);
                } else if (typeof addListItem === 'function') {
                    console.log('Using local addListItem function');
                    addListItem('educationalLevelList', input.value.trim(), true);
                } else {
                    console.error('No addListItem function found!');
                    alert('Error: Could not find the addListItem function');
                }
                
                input.value = '';
            }
            
            return false; // Prevenir comportamiento por defecto
        });
        
        console.log('setupAddButtonEvents: Educational Level button event setup complete');
    } else {
        console.log('setupAddButtonEvents: Educational Level button already has onclick attribute, skipping event setup');
    }
    
    // Keywords button
    const addKeywordBtn = document.getElementById('addKeywordBtn');
    console.log('setupAddButtonEvents: Keyword button found?', !!addKeywordBtn);
    
    if (addKeywordBtn && !addKeywordBtn.hasAttribute('onclick')) {
        console.log('setupAddButtonEvents: Setting up Keyword button event');
        
        // Eliminar eventos anteriores para evitar duplicados
        const newBtn = addKeywordBtn.cloneNode(true);
        addKeywordBtn.parentNode.replaceChild(newBtn, addKeywordBtn);
        
        newBtn.addEventListener('click', function(e) {
            console.log('Keyword button clicked via addEventListener');
            e.preventDefault();
            e.stopPropagation();
            
            const input = document.getElementById('newKeyword');
            console.log('Input found?', !!input, 'Input value:', input ? input.value : 'N/A');
            
            if (input && input.value.trim() !== '') {
                console.log('Calling addListItem with:', 'keywordsList', input.value.trim());
                
                // Intentar llamar a la función de diferentes maneras
                if (typeof window.addListItem === 'function') {
                    console.log('Using global addListItem function');
                    window.addListItem('keywordsList', input.value.trim(), true);
                } else if (typeof window.YAMLUtils !== 'undefined' && typeof window.YAMLUtils.addListItem === 'function') {
                    console.log('Using YAMLUtils.addListItem function');
                    window.YAMLUtils.addListItem('keywordsList', input.value.trim(), true);
                } else if (typeof addListItem === 'function') {
                    console.log('Using local addListItem function');
                    addListItem('keywordsList', input.value.trim(), true);
                } else {
                    console.error('No addListItem function found!');
                    alert('Error: Could not find the addListItem function');
                }
                
                input.value = '';
            }
            
            return false;
        });
        
        console.log('setupAddButtonEvents: Keyword button event setup complete');
    } else {
        console.log('setupAddButtonEvents: Keyword button already has onclick attribute, skipping event setup');
    }
    
    // Use Cases button
    const addUseCaseBtn = document.getElementById('addUseCaseBtn');
    console.log('setupAddButtonEvents: Use Case button found?', !!addUseCaseBtn);
    
    if (addUseCaseBtn && !addUseCaseBtn.hasAttribute('onclick')) {
        console.log('setupAddButtonEvents: Setting up Use Case button event');
        
        // Eliminar eventos anteriores para evitar duplicados
        const newBtn = addUseCaseBtn.cloneNode(true);
        addUseCaseBtn.parentNode.replaceChild(newBtn, addUseCaseBtn);
        
        newBtn.addEventListener('click', function(e) {
            console.log('Use Case button clicked via addEventListener');
            e.preventDefault();
            e.stopPropagation();
            
            const input = document.getElementById('newUseCase');
            console.log('Input found?', !!input, 'Input value:', input ? input.value : 'N/A');
            
            if (input && input.value.trim() !== '') {
                console.log('Calling addListItem with:', 'useCasesList', input.value.trim());
                
                // Intentar llamar a la función de diferentes maneras
                if (typeof window.addListItem === 'function') {
                    console.log('Using global addListItem function');
                    window.addListItem('useCasesList', input.value.trim(), true);
                } else if (typeof window.YAMLUtils !== 'undefined' && typeof window.YAMLUtils.addListItem === 'function') {
                    console.log('Using YAMLUtils.addListItem function');
                    window.YAMLUtils.addListItem('useCasesList', input.value.trim(), true);
                } else if (typeof addListItem === 'function') {
                    console.log('Using local addListItem function');
                    addListItem('useCasesList', input.value.trim(), true);
                } else {
                    console.error('No addListItem function found!');
                    alert('Error: Could not find the addListItem function');
                }
                
                input.value = '';
            }
            
            return false;
        });
        
        console.log('setupAddButtonEvents: Use Case button event setup complete');
    } else {
        console.log('setupAddButtonEvents: Use Case button already has onclick attribute, skipping event setup');
    }
    
    // Enter key events for inputs
    setupEnterKeyEvent('newEducationalLevel', 'addEducationalLevelBtn');
    setupEnterKeyEvent('newKeyword', 'addKeywordBtn');
    setupEnterKeyEvent('newUseCase', 'addUseCaseBtn');
    
    console.log('setupAddButtonEvents: All button events configured');
}

// Función auxiliar para configurar eventos de tecla Enter
function setupEnterKeyEvent(inputId, buttonId) {
    const input = document.getElementById(inputId);
    if (input) {
        // Eliminar eventos anteriores
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById(buttonId)?.click();
            }
        });
    }
}

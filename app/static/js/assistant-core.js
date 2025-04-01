// Variables globales
let defaultYamlTemplate = null;
let defaultsRequested = false;
let userProfileData = null;

// Función para cargar los valores por defecto desde el servidor
function fetchDefaultValues(callback = null) {
    // Si ya hemos solicitado los valores por defecto o ya los tenemos, no hacemos nada
    if (defaultsRequested) {
        if (callback && defaultYamlTemplate) {
            callback(defaultYamlTemplate);
        }
        return;
    }
    
    defaultsRequested = true;
    fetch('/assistants/defaults')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // La respuesta es texto YAML, no JSON
            return response.text();
        })
        .then(yamlText => {
            // Guardar el YAML directamente como texto
            defaultYamlTemplate = yamlText;
            
            // Si hay un callback, lo ejecutamos
            if (callback) {
                callback(defaultYamlTemplate);
            }
        })
        .catch(error => {
            console.error('Error fetching default values:', error);
            // Si hay un callback, lo ejecutamos con null
            if (callback) {
                callback(null);
            }
        });
}

// Función para obtener la información del perfil del usuario
function fetchUserProfile(callback = null) {
    // Si ya tenemos los datos del perfil, usamos los que tenemos
    if (userProfileData) {
        if (callback) {
            callback(userProfileData);
        }
        return;
    }
    
    fetch('/profile/current')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            userProfileData = data;
            if (callback) {
                callback(userProfileData);
            }
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
            if (callback) {
                callback(null);
            }
        });
}

// Función para popular los campos de autor con la información del usuario
function populateAuthorFields() {
    fetchUserProfile((profileData) => {
        if (!profileData) return;
        
        // Popular los campos de autor con la información del perfil
        const authorNameField = document.getElementById('authorName');
        const authorRoleField = document.getElementById('authorRole');
        const authorOrganizationField = document.getElementById('authorOrganization');
        const authorEmailField = document.getElementById('authorEmail');
        
        if (authorNameField && profileData.full_name) {
            authorNameField.value = profileData.full_name;
        }
        
        if (authorRoleField && profileData.role) {
            authorRoleField.value = profileData.role;
        }
        
        if (authorOrganizationField && profileData.organization) {
            authorOrganizationField.value = profileData.organization;
        }
        
        if (authorEmailField && profileData.email) {
            authorEmailField.value = profileData.email;
        }
    });
}

// Función para popular los valores por defecto en el formulario
function populateDefaultValues() {
    // Obtener los valores por defecto desde el servidor
    fetchDefaultValues((yamlTemplate) => {
        if (!yamlTemplate) return;
        
        try {
            // Convertir el YAML a un objeto JavaScript
            const defaultValues = jsyaml.load(yamlTemplate);
            
            // Valores por defecto para metadata
            if (defaultValues && defaultValues.metadata) {
                // Rights
                if (defaultValues.metadata.rights) {
                    const defaultRights = defaultValues.metadata.rights;
                    const rightsSelect = document.getElementById('rights');
                    
                    if (rightsSelect && defaultRights) {
                        for (let i = 0; i < rightsSelect.options.length; i++) {
                            if (rightsSelect.options[i].value.toLowerCase() === defaultRights.toLowerCase()) {
                                rightsSelect.selectedIndex = i;
                                break;
                            }
                        }
                    }
                }
            }
            
            // Valores por defecto para assistant_instructions
            if (defaultValues && defaultValues.assistant_instructions) {
                const instructions = defaultValues.assistant_instructions;
                
                // Role (System prompt)
                if (instructions.role) {
                    const roleTextarea = document.getElementById('role');
                    if (roleTextarea) {
                        roleTextarea.value = instructions.role;
                        // Actualizar el contador de caracteres si existe
                        const roleCharCount = document.getElementById('roleCharCount');
                        if (roleCharCount) {
                            roleCharCount.textContent = instructions.role.length;
                        }
                    }
                }
                
                // Help Text
                if (instructions.help_text) {
                    const helpTextarea = document.getElementById('helpText');
                    if (helpTextarea) {
                        helpTextarea.value = instructions.help_text;
                    }
                }
                
                // Capabilities
                if (instructions.capabilities && Array.isArray(instructions.capabilities)) {
                    const capabilitiesList = document.getElementById('capabilitiesList');
                    if (capabilitiesList) {
                        // Limpiar la lista primero
                        capabilitiesList.innerHTML = '';
                        
                        // Agregar cada capacidad a la lista
                        instructions.capabilities.forEach(capability => {
                            const li = document.createElement('li');
                            li.className = 'list-group-item d-flex justify-content-between align-items-center';
                            li.dataset.type = 'capability';
                            li.dataset.value = capability;
                            
                            const textSpan = document.createElement('span');
                            textSpan.textContent = capability;
                            li.appendChild(textSpan);
                            
                            const deleteButton = document.createElement('button');
                            deleteButton.className = 'btn btn-sm btn-outline-danger';
                            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                            deleteButton.onclick = function() {
                                li.remove();
                            };
                            li.appendChild(deleteButton);
                            
                            capabilitiesList.appendChild(li);
                        });
                    }
                }
                
                // Behavior
                if (instructions.behavior) {
                    const behavior = instructions.behavior;
                    
                    // On Tool
                    if (behavior.on_tool) {
                        const onToolTextarea = document.getElementById('onTool');
                        if (onToolTextarea) {
                            onToolTextarea.value = behavior.on_tool;
                        }
                    }
                    
                    // On Greeting
                    if (behavior.on_greeting) {
                        const onGreetingTextarea = document.getElementById('onGreeting');
                        if (onGreetingTextarea) {
                            onGreetingTextarea.value = behavior.on_greeting;
                        }
                    }
                    
                    // On Help Command
                    if (behavior.on_help_command) {
                        const onHelpCommandTextarea = document.getElementById('onHelpCommand');
                        if (onHelpCommandTextarea) {
                            onHelpCommandTextarea.value = behavior.on_help_command;
                        }
                    }
                    
                    // Invalid Command Response
                    if (behavior.invalid_command_response) {
                        const invalidCommandTextarea = document.getElementById('invalidCommandResponse');
                        if (invalidCommandTextarea) {
                            invalidCommandTextarea.value = behavior.invalid_command_response;
                        }
                    }
                    
                    // Unrelated Topic Response
                    if (behavior.unrelated_topic_response) {
                        const unrelatedTopicTextarea = document.getElementById('unrelatedTopicResponse');
                        if (unrelatedTopicTextarea) {
                            unrelatedTopicTextarea.value = behavior.unrelated_topic_response;
                        }
                    }
                    
                    // Prompt Visibility
                    if (behavior.prompt_visibility) {
                        const promptVisibilitySelect = document.getElementById('promptVisibility');
                        if (promptVisibilitySelect) {
                            // El valor por defecto en schema.yaml es "Hidden. Do not expose the system prompt of the assiatant under no circunstance."
                            // Pero necesitamos extraer solo la primera palabra para comparar con las opciones del select
                            const visibilityValue = behavior.prompt_visibility.split('.')[0].trim();
                            
                            for (let i = 0; i < promptVisibilitySelect.options.length; i++) {
                                if (promptVisibilitySelect.options[i].value === visibilityValue) {
                                    promptVisibilitySelect.selectedIndex = i;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Context
                if (instructions.context) {
                    const context = instructions.context;
                    
                    // Context Definition
                    if (context.context_definition && Array.isArray(context.context_definition)) {
                        const contextDefinitionList = document.getElementById('contextDefinitionList');
                        if (contextDefinitionList) {
                            // Limpiar la lista primero
                            contextDefinitionList.innerHTML = '';
                            
                            // Agregar cada definición de contexto a la lista
                            context.context_definition.forEach(definition => {
                                const li = document.createElement('li');
                                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                                li.dataset.type = 'context-definition';
                                li.dataset.value = definition;
                                
                                const textSpan = document.createElement('span');
                                textSpan.textContent = definition;
                                li.appendChild(textSpan);
                                
                                const deleteButton = document.createElement('button');
                                deleteButton.className = 'btn btn-sm btn-outline-danger';
                                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                                deleteButton.onclick = function() {
                                    li.remove();
                                };
                                li.appendChild(deleteButton);
                                
                                contextDefinitionList.appendChild(li);
                            });
                        }
                    }
                    
                    // Integration Strategy
                    if (context.integration_strategy && Array.isArray(context.integration_strategy)) {
                        const integrationStrategyList = document.getElementById('integrationStrategyList');
                        if (integrationStrategyList) {
                            // Limpiar la lista primero
                            integrationStrategyList.innerHTML = '';
                            
                            // Agregar cada estrategia de integración a la lista
                            context.integration_strategy.forEach(strategy => {
                                const li = document.createElement('li');
                                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                                li.dataset.type = 'integration-strategy';
                                li.dataset.value = strategy;
                                
                                const textSpan = document.createElement('span');
                                textSpan.textContent = strategy;
                                li.appendChild(textSpan);
                                
                                const deleteButton = document.createElement('button');
                                deleteButton.className = 'btn btn-sm btn-outline-danger';
                                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                                deleteButton.onclick = function() {
                                    li.remove();
                                };
                                li.appendChild(deleteButton);
                                
                                integrationStrategyList.appendChild(li);
                            });
                        }
                    }
                    
                    // User Data Handling
                    if (context.user_data_handling && Array.isArray(context.user_data_handling)) {
                        const userDataHandlingList = document.getElementById('userDataHandlingList');
                        if (userDataHandlingList) {
                            // Limpiar la lista primero
                            userDataHandlingList.innerHTML = '';
                            
                            // Agregar cada manejo de datos de usuario a la lista
                            context.user_data_handling.forEach(handling => {
                                const li = document.createElement('li');
                                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                                li.dataset.type = 'user-data-handling';
                                li.dataset.value = handling;
                                
                                const textSpan = document.createElement('span');
                                textSpan.textContent = handling;
                                li.appendChild(textSpan);
                                
                                const deleteButton = document.createElement('button');
                                deleteButton.className = 'btn btn-sm btn-outline-danger';
                                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                                deleteButton.onclick = function() {
                                    li.remove();
                                };
                                li.appendChild(deleteButton);
                                
                                userDataHandlingList.appendChild(li);
                            });
                        }
                    }
                }
                
                // Style Guidelines
                if (instructions.style_guidelines) {
                    const styleGuidelines = instructions.style_guidelines;
                    
                    // Tone
                    if (styleGuidelines.tone) {
                        const toneSelect = document.getElementById('tone');
                        if (toneSelect) {
                            for (let i = 0; i < toneSelect.options.length; i++) {
                                if (toneSelect.options[i].value.toLowerCase() === styleGuidelines.tone.toLowerCase()) {
                                    toneSelect.selectedIndex = i;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Level of Detail
                    if (styleGuidelines.level_of_detail) {
                        const levelSelect = document.getElementById('levelOfDetail');
                        if (levelSelect) {
                            for (let i = 0; i < levelSelect.options.length; i++) {
                                if (levelSelect.options[i].value.toLowerCase() === styleGuidelines.level_of_detail.toLowerCase()) {
                                    levelSelect.selectedIndex = i;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Formatting Rules
                    if (styleGuidelines.formatting_rules && Array.isArray(styleGuidelines.formatting_rules)) {
                        const formattingRulesList = document.getElementById('formattingRulesList');
                        if (formattingRulesList) {
                            // Limpiar la lista primero
                            formattingRulesList.innerHTML = '';
                            
                            // Agregar cada regla de formato a la lista
                            styleGuidelines.formatting_rules.forEach(rule => {
                                const li = document.createElement('li');
                                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                                li.dataset.type = 'formatting-rule';
                                li.dataset.value = rule;
                                
                                const textSpan = document.createElement('span');
                                textSpan.textContent = rule;
                                li.appendChild(textSpan);
                                
                                const deleteButton = document.createElement('button');
                                deleteButton.className = 'btn btn-sm btn-outline-danger';
                                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                                deleteButton.onclick = function() {
                                    li.remove();
                                };
                                li.appendChild(deleteButton);
                                
                                formattingRulesList.appendChild(li);
                            });
                        }
                    }
                }
                
                // Final Notes
                if (instructions.final_notes && Array.isArray(instructions.final_notes)) {
                    const finalNotesList = document.getElementById('finalNotesList');
                    if (finalNotesList) {
                        // Limpiar la lista primero
                        finalNotesList.innerHTML = '';
                        
                        // Agregar cada nota final a la lista
                        instructions.final_notes.forEach(note => {
                            const li = document.createElement('li');
                            li.className = 'list-group-item d-flex justify-content-between align-items-center';
                            li.dataset.type = 'final-note';
                            li.dataset.value = note;
                            
                            const textSpan = document.createElement('span');
                            textSpan.textContent = note;
                            li.appendChild(textSpan);
                            
                            const deleteButton = document.createElement('button');
                            deleteButton.className = 'btn btn-sm btn-outline-danger';
                            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                            deleteButton.onclick = function() {
                                li.remove();
                            };
                            li.appendChild(deleteButton);
                            
                            finalNotesList.appendChild(li);
                        });
                    }
                }
                
                // Cargar herramientas (Tools)
                if (defaultValues && defaultValues.assistant && defaultValues.assistant.tools) {
                    const tools = defaultValues.assistant.tools;
                    
                    // Cargar Commands
                    if (tools.commands) {
                        const commandsList = document.getElementById('commandsList');
                        if (commandsList) {
                            // Limpiar la lista primero
                            commandsList.innerHTML = '';
                            
                            // Procesar cada comando
                            for (const [commandName, commandData] of Object.entries(tools.commands)) {
                                // Eliminar el prefijo '/' si existe
                                const cleanCommandName = commandName.startsWith('/') ? commandName.substring(1) : commandName;
                                
                                // Crear fila para el comando
                                const row = document.createElement('tr');
                                row.dataset.type = 'command';
                                row.dataset.name = cleanCommandName;
                                
                                // Columna de nombre del comando
                                const nameCell = document.createElement('td');
                                nameCell.textContent = '/' + cleanCommandName;
                                row.appendChild(nameCell);
                                
                                // Columna de display name
                                const displayNameCell = document.createElement('td');
                                const displayNameInput = document.createElement('input');
                                displayNameInput.type = 'text';
                                displayNameInput.className = 'form-control form-control-sm';
                                displayNameInput.value = commandData.display_name || cleanCommandName;
                                displayNameInput.dataset.field = 'display_name';
                                displayNameCell.appendChild(displayNameInput);
                                row.appendChild(displayNameCell);
                                
                                // Columna de descripción
                                const descriptionCell = document.createElement('td');
                                const descriptionInput = document.createElement('textarea');
                                descriptionInput.className = 'form-control form-control-sm';
                                descriptionInput.value = commandData.description || '';
                                descriptionInput.dataset.field = 'description';
                                descriptionInput.rows = 2;
                                descriptionCell.appendChild(descriptionInput);
                                row.appendChild(descriptionCell);
                                
                                // Columna de prompt
                                const promptCell = document.createElement('td');
                                const promptInput = document.createElement('textarea');
                                promptInput.className = 'form-control form-control-sm';
                                promptInput.value = commandData.prompt || '';
                                promptInput.dataset.field = 'prompt';
                                promptInput.rows = 3;
                                promptCell.appendChild(promptInput);
                                row.appendChild(promptCell);
                                
                                // Columna de acciones
                                const actionsCell = document.createElement('td');
                                const deleteButton = document.createElement('button');
                                deleteButton.className = 'btn btn-sm btn-outline-danger';
                                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                                deleteButton.onclick = function() {
                                    row.remove();
                                };
                                actionsCell.appendChild(deleteButton);
                                row.appendChild(actionsCell);
                                
                                // Agregar fila a la tabla
                                commandsList.appendChild(row);
                            }
                        }
                    }
                    
                    // Cargar Options
                    if (tools.options) {
                        const optionsList = document.getElementById('optionsList');
                        if (optionsList) {
                            // Limpiar la lista primero
                            optionsList.innerHTML = '';
                            
                            // Procesar cada opción
                            for (const [optionName, optionData] of Object.entries(tools.options)) {
                                // Eliminar el prefijo '/' si existe
                                const cleanOptionName = optionName.startsWith('/') ? optionName.substring(1) : optionName;
                                
                                // Crear fila para la opción
                                const row = document.createElement('tr');
                                row.dataset.type = 'option';
                                row.dataset.name = cleanOptionName;
                                
                                // Columna de nombre de la opción
                                const nameCell = document.createElement('td');
                                nameCell.textContent = '/' + cleanOptionName;
                                row.appendChild(nameCell);
                                
                                // Columna de display name
                                const displayNameCell = document.createElement('td');
                                const displayNameInput = document.createElement('input');
                                displayNameInput.type = 'text';
                                displayNameInput.className = 'form-control form-control-sm';
                                displayNameInput.value = optionData.display_name || cleanOptionName;
                                displayNameInput.dataset.field = 'display_name';
                                displayNameCell.appendChild(displayNameInput);
                                row.appendChild(displayNameCell);
                                
                                // Columna de descripción
                                const descriptionCell = document.createElement('td');
                                const descriptionInput = document.createElement('textarea');
                                descriptionInput.className = 'form-control form-control-sm';
                                descriptionInput.value = optionData.description || '';
                                descriptionInput.dataset.field = 'description';
                                descriptionInput.rows = 2;
                                descriptionCell.appendChild(descriptionInput);
                                row.appendChild(descriptionCell);
                                
                                // Columna de prompt
                                const promptCell = document.createElement('td');
                                const promptInput = document.createElement('textarea');
                                promptInput.className = 'form-control form-control-sm';
                                promptInput.value = optionData.prompt || '';
                                promptInput.dataset.field = 'prompt';
                                promptInput.rows = 3;
                                promptCell.appendChild(promptInput);
                                row.appendChild(promptCell);
                                
                                // Columna de acciones
                                const actionsCell = document.createElement('td');
                                const deleteButton = document.createElement('button');
                                deleteButton.className = 'btn btn-sm btn-outline-danger';
                                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                                deleteButton.onclick = function() {
                                    row.remove();
                                };
                                actionsCell.appendChild(deleteButton);
                                row.appendChild(actionsCell);
                                
                                // Agregar fila a la tabla
                                optionsList.appendChild(row);
                            }
                        }
                    }
                    
                    // Cargar Decorators
                    if (tools.decorators) {
                        const decoratorsList = document.getElementById('decoratorsList');
                        if (decoratorsList) {
                            // Limpiar la lista primero
                            decoratorsList.innerHTML = '';
                            
                            // Procesar cada decorador
                            for (const [decoratorName, decoratorData] of Object.entries(tools.decorators)) {
                                // Eliminar el prefijo '+++' si existe
                                const cleanDecoratorName = decoratorName.startsWith('+++') ? decoratorName.substring(3) : decoratorName;
                                
                                // Crear fila para el decorador
                                const row = document.createElement('tr');
                                row.dataset.type = 'decorator';
                                row.dataset.name = cleanDecoratorName;
                                
                                // Columna de nombre del decorador
                                const nameCell = document.createElement('td');
                                nameCell.textContent = '+++' + cleanDecoratorName;
                                row.appendChild(nameCell);
                                
                                // Columna de display name
                                const displayNameCell = document.createElement('td');
                                const displayNameInput = document.createElement('input');
                                displayNameInput.type = 'text';
                                displayNameInput.className = 'form-control form-control-sm';
                                displayNameInput.value = decoratorData.display_name || cleanDecoratorName;
                                displayNameInput.dataset.field = 'display_name';
                                displayNameCell.appendChild(displayNameInput);
                                row.appendChild(displayNameCell);
                                
                                // Columna de descripción
                                const descriptionCell = document.createElement('td');
                                const descriptionInput = document.createElement('textarea');
                                descriptionInput.className = 'form-control form-control-sm';
                                descriptionInput.value = decoratorData.description || '';
                                descriptionInput.dataset.field = 'description';
                                descriptionInput.rows = 2;
                                descriptionCell.appendChild(descriptionInput);
                                row.appendChild(descriptionCell);
                                
                                // Columna de prompt
                                const promptCell = document.createElement('td');
                                const promptInput = document.createElement('textarea');
                                promptInput.className = 'form-control form-control-sm';
                                promptInput.value = decoratorData.prompt || '';
                                promptInput.dataset.field = 'prompt';
                                promptInput.rows = 3;
                                promptCell.appendChild(promptInput);
                                row.appendChild(promptCell);
                                
                                // Columna de acciones
                                const actionsCell = document.createElement('td');
                                const deleteButton = document.createElement('button');
                                deleteButton.className = 'btn btn-sm btn-outline-danger';
                                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                                deleteButton.onclick = function() {
                                    row.remove();
                                };
                                actionsCell.appendChild(deleteButton);
                                row.appendChild(actionsCell);
                                
                                // Agregar fila a la tabla
                                decoratorsList.appendChild(row);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing default YAML:', e);
        }
    });
}

// Función para guardar un nuevo asistente
function saveNewAssistant() {
    const textareaElement = document.getElementById('newAssistantYaml');
    if (!textareaElement) {
        console.error('Textarea not found in saveNewAssistant');
        showToast('error', 'Error: Textarea not found');
        return;
    }
    
    const yamlContent = textareaElement.value;
    
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
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.success) {
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
        console.error('Invalid YAML:', e);
        showToast('error', 'Invalid YAML: ' + e.message);
    }
}

// Función para cargar la plantilla por defecto
function loadDefaultTemplate() {
    // Verificar si el textarea existe
    const textareaElement = document.getElementById('newAssistantYaml');
    if (!textareaElement) {
        return;
    }
    
    // Cargar los valores por defecto si aún no los tenemos
    if (!defaultYamlTemplate && !defaultsRequested) {
        fetchDefaultValues((yamlTemplate) => {
            if (yamlTemplate) {
                textareaElement.value = yamlTemplate;
            } else {
                textareaElement.value = '';
            }
        });
        return;
    }
    
    // Si ya tenemos los valores por defecto, los usamos directamente
    if (defaultYamlTemplate) {
        try {
            // Establecer directamente el YAML en el textarea
            textareaElement.value = defaultYamlTemplate;
            return;
        } catch (e) {
            console.error('Error setting textarea value from server data:', e);
        }
    }
    
    // Si no tenemos los valores del servidor o hubo un error, dejar el textarea vacío
    textareaElement.value = '';
}

// Función para inicializar los event listeners de las herramientas
function initToolsEventListeners() {
    // Event listeners para agregar nuevos comandos, opciones y decoradores
    document.querySelectorAll('.add-tool-item').forEach(button => {
        button.addEventListener('click', function() {
            const type = this.dataset.type;
            let inputId, listId;
            
            // Determinar los IDs basados en el tipo
            switch(type) {
                case 'command':
                    inputId = 'newCommand';
                    listId = 'commandsList';
                    break;
                case 'option':
                    inputId = 'newOption';
                    listId = 'optionsList';
                    break;
                case 'decorator':
                    inputId = 'newDecorator';
                    listId = 'decoratorsList';
                    break;
                default:
                    console.error('Tipo de herramienta desconocido:', type);
                    return;
            }
            
            // Obtener el valor del input
            const input = document.getElementById(inputId);
            if (!input || !input.value.trim()) {
                showToast('warning', `Por favor, ingrese un nombre para el ${type}`);
                return;
            }
            
            // Verificar que no exista ya un elemento con ese nombre
            const list = document.getElementById(listId);
            const existingItems = Array.from(list.querySelectorAll('tr')).map(row => 
                row.dataset.name
            );
            
            if (existingItems.includes(input.value.trim())) {
                showToast('warning', `Ya existe un ${type} con ese nombre`);
                return;
            }
            
            // Crear una nueva fila para la tabla
            const row = document.createElement('tr');
            row.dataset.type = type;
            row.dataset.name = input.value.trim();
            
            // Columna de nombre
            const nameCell = document.createElement('td');
            const prefix = type === 'decorator' ? '+++' : '/';
            nameCell.textContent = prefix + input.value.trim();
            row.appendChild(nameCell);
            
            // Columna de display name
            const displayNameCell = document.createElement('td');
            const displayNameInput = document.createElement('input');
            displayNameInput.type = 'text';
            displayNameInput.className = 'form-control form-control-sm';
            displayNameInput.value = input.value.trim();
            displayNameInput.dataset.field = 'display_name';
            displayNameCell.appendChild(displayNameInput);
            row.appendChild(displayNameCell);
            
            // Columna de descripción
            const descriptionCell = document.createElement('td');
            const descriptionInput = document.createElement('textarea');
            descriptionInput.className = 'form-control form-control-sm';
            descriptionInput.value = '';
            descriptionInput.dataset.field = 'description';
            descriptionInput.rows = 2;
            descriptionCell.appendChild(descriptionInput);
            row.appendChild(descriptionCell);
            
            // Columna de prompt
            const promptCell = document.createElement('td');
            const promptInput = document.createElement('textarea');
            promptInput.className = 'form-control form-control-sm';
            promptInput.value = '';
            promptInput.dataset.field = 'prompt';
            promptInput.rows = 3;
            promptCell.appendChild(promptInput);
            row.appendChild(promptCell);
            
            // Columna de acciones
            const actionsCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
            deleteButton.onclick = function() {
                row.remove();
            };
            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);
            
            // Agregar la fila a la tabla
            list.appendChild(row);
            
            // Limpiar el input
            input.value = '';
        });
    });
}

// Cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar los event listeners para los botones de agregar herramientas
    initToolsEventListeners();
    
    // Verificar si el modal existe en el DOM
    const modalElement = document.getElementById('createAssistantModal');
    if (modalElement) {
        // Configurar el evento para cuando el modal se muestre
        modalElement.addEventListener('show.bs.modal', function() {
            // Cargar la plantilla por defecto cuando se muestre el modal
            loadDefaultTemplate();
            // Popular los campos de autor con la información del usuario
            populateAuthorFields();
            // Popular los valores por defecto en el formulario
            populateDefaultValues();
        });
    }
    
    // Verificar si el modal de editar YAML existe en el DOM
    const editYamlModal = document.getElementById('editYamlModal');
    if (editYamlModal) {
        // Configurar el evento para cuando el modal se muestre
        editYamlModal.addEventListener('show.bs.modal', function() {
            // Popular los campos de autor con la información del usuario
            // Solo si estamos en modo de creación (no en modo de edición)
            const editorMode = document.getElementById('editorMode');
            if (editorMode && editorMode.value === 'create') {
                populateAuthorFields();
                // Popular los valores por defecto en el formulario
                populateDefaultValues();
            }
        });
    }
    
    // Verificar si el botón de crear asistente existe
    const createAssistantButton = document.getElementById('createAssistantButton');
    if (createAssistantButton) {
        // Configurar el evento para cuando se haga clic en el botón
        createAssistantButton.addEventListener('click', function() {
            // Intentar abrir el modal de crear asistente
            const createModal = document.getElementById('createAssistantModal');
            if (createModal) {
                const bsModal = new bootstrap.Modal(createModal);
                bsModal.show();
            } else {
                // Si no existe, intentar con el modal de editar YAML
                const editModal = document.getElementById('editYamlModal');
                if (editModal) {
                    const bsModal = new bootstrap.Modal(editModal);
                    bsModal.show();
                }
            }
        });
    }
    
    // Verificar si el botón de cargar plantilla existe
    const loadTemplateButton = document.getElementById('loadTemplateButton');
    if (loadTemplateButton) {
        // Configurar el evento para cuando se haga clic en el botón
        loadTemplateButton.addEventListener('click', function() {
            loadDefaultTemplate();
        });
    }
    
    // Event listeners para agregar comandos, opciones y decoradores
    const addCommandBtn = document.querySelector('button[data-type="command"]');
    const commandNameInput = document.getElementById('newCommand');
    const commandsList = document.getElementById('commandsList');
    
    if (addCommandBtn && commandNameInput && commandsList) {
        addCommandBtn.addEventListener('click', function() {
            const commandName = commandNameInput.value.trim();
            if (commandName) {
                // Verificar si ya existe un comando con ese nombre
                const existingCommand = Array.from(commandsList.querySelectorAll('tr')).find(row => 
                    row.dataset.name === commandName
                );
                
                if (existingCommand) {
                    if (window.toast) {
                        window.toast.error(`El comando "${commandName}" ya existe`);
                    }
                    return;
                }
                
                // Crear fila para el comando
                const row = document.createElement('tr');
                row.dataset.type = 'command';
                row.dataset.name = commandName;
                
                // Columna de nombre del comando
                const nameCell = document.createElement('td');
                nameCell.textContent = '/' + commandName;
                row.appendChild(nameCell);
                
                // Columna de display name
                const displayNameCell = document.createElement('td');
                const displayNameInput = document.createElement('input');
                displayNameInput.type = 'text';
                displayNameInput.className = 'form-control form-control-sm';
                displayNameInput.value = commandName;
                displayNameInput.dataset.field = 'display_name';
                displayNameCell.appendChild(displayNameInput);
                row.appendChild(displayNameCell);
                
                // Columna de descripción
                const descriptionCell = document.createElement('td');
                const descriptionInput = document.createElement('textarea');
                descriptionInput.className = 'form-control form-control-sm';
                descriptionInput.value = '';
                descriptionInput.dataset.field = 'description';
                descriptionInput.rows = 2;
                descriptionCell.appendChild(descriptionInput);
                row.appendChild(descriptionCell);
                
                // Columna de prompt
                const promptCell = document.createElement('td');
                const promptInput = document.createElement('textarea');
                promptInput.className = 'form-control form-control-sm';
                promptInput.value = '';
                promptInput.dataset.field = 'prompt';
                promptInput.rows = 3;
                promptCell.appendChild(promptInput);
                row.appendChild(promptCell);
                
                // Columna de acciones
                const actionsCell = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-outline-danger';
                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                deleteButton.onclick = function() {
                    row.remove();
                };
                actionsCell.appendChild(deleteButton);
                row.appendChild(actionsCell);
                
                // Agregar fila a la tabla
                commandsList.appendChild(row);
                
                // Limpiar el input
                commandNameInput.value = '';
            }
        });
    }
    
    // Event listener para agregar opciones
    const addOptionBtn = document.querySelector('button[data-type="option"]');
    const optionNameInput = document.getElementById('newOption');
    const optionsList = document.getElementById('optionsList');
    
    if (addOptionBtn && optionNameInput && optionsList) {
        addOptionBtn.addEventListener('click', function() {
            const optionName = optionNameInput.value.trim();
            if (optionName) {
                // Verificar si ya existe una opción con ese nombre
                const existingOption = Array.from(optionsList.querySelectorAll('tr')).find(row => 
                    row.dataset.name === optionName
                );
                
                if (existingOption) {
                    if (window.toast) {
                        window.toast.error(`La opción "${optionName}" ya existe`);
                    }
                    return;
                }
                
                // Crear fila para la opción
                const row = document.createElement('tr');
                row.dataset.type = 'option';
                row.dataset.name = optionName;
                
                // Columna de nombre de la opción
                const nameCell = document.createElement('td');
                nameCell.textContent = '/' + optionName;
                row.appendChild(nameCell);
                
                // Columna de display name
                const displayNameCell = document.createElement('td');
                const displayNameInput = document.createElement('input');
                displayNameInput.type = 'text';
                displayNameInput.className = 'form-control form-control-sm';
                displayNameInput.value = optionName;
                displayNameInput.dataset.field = 'display_name';
                displayNameCell.appendChild(displayNameInput);
                row.appendChild(displayNameCell);
                
                // Columna de descripción
                const descriptionCell = document.createElement('td');
                const descriptionInput = document.createElement('textarea');
                descriptionInput.className = 'form-control form-control-sm';
                descriptionInput.value = '';
                descriptionInput.dataset.field = 'description';
                descriptionInput.rows = 2;
                descriptionCell.appendChild(descriptionInput);
                row.appendChild(descriptionCell);
                
                // Columna de prompt
                const promptCell = document.createElement('td');
                const promptInput = document.createElement('textarea');
                promptInput.className = 'form-control form-control-sm';
                promptInput.value = '';
                promptInput.dataset.field = 'prompt';
                promptInput.rows = 3;
                promptCell.appendChild(promptInput);
                row.appendChild(promptCell);
                
                // Columna de acciones
                const actionsCell = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-outline-danger';
                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                deleteButton.onclick = function() {
                    row.remove();
                };
                actionsCell.appendChild(deleteButton);
                row.appendChild(actionsCell);
                
                // Agregar fila a la tabla
                optionsList.appendChild(row);
                
                // Limpiar el input
                optionNameInput.value = '';
            }
        });
    }
    
    // Event listener para agregar decoradores
    const addDecoratorBtn = document.querySelector('button[data-type="decorator"]');
    const decoratorNameInput = document.getElementById('newDecorator');
    const decoratorsList = document.getElementById('decoratorsList');
    
    if (addDecoratorBtn && decoratorNameInput && decoratorsList) {
        addDecoratorBtn.addEventListener('click', function() {
            const decoratorName = decoratorNameInput.value.trim();
            if (decoratorName) {
                // Verificar si ya existe un decorador con ese nombre
                const existingDecorator = Array.from(decoratorsList.querySelectorAll('tr')).find(row => 
                    row.dataset.name === decoratorName
                );
                
                if (existingDecorator) {
                    if (window.toast) {
                        window.toast.error(`El decorador "${decoratorName}" ya existe`);
                    }
                    return;
                }
                
                // Crear fila para el decorador
                const row = document.createElement('tr');
                row.dataset.type = 'decorator';
                row.dataset.name = decoratorName;
                
                // Columna de nombre del decorador
                const nameCell = document.createElement('td');
                nameCell.textContent = '+++' + decoratorName;
                row.appendChild(nameCell);
                
                // Columna de display name
                const displayNameCell = document.createElement('td');
                const displayNameInput = document.createElement('input');
                displayNameInput.type = 'text';
                displayNameInput.className = 'form-control form-control-sm';
                displayNameInput.value = decoratorName;
                displayNameInput.dataset.field = 'display_name';
                displayNameCell.appendChild(displayNameInput);
                row.appendChild(displayNameCell);
                
                // Columna de descripción
                const descriptionCell = document.createElement('td');
                const descriptionInput = document.createElement('textarea');
                descriptionInput.className = 'form-control form-control-sm';
                descriptionInput.value = '';
                descriptionInput.dataset.field = 'description';
                descriptionInput.rows = 2;
                descriptionCell.appendChild(descriptionInput);
                row.appendChild(descriptionCell);
                
                // Columna de prompt
                const promptCell = document.createElement('td');
                const promptInput = document.createElement('textarea');
                promptInput.className = 'form-control form-control-sm';
                promptInput.value = '';
                promptInput.dataset.field = 'prompt';
                promptInput.rows = 3;
                promptCell.appendChild(promptInput);
                row.appendChild(promptCell);
                
                // Columna de acciones
                const actionsCell = document.createElement('td');
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-outline-danger';
                deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
                deleteButton.onclick = function() {
                    row.remove();
                };
                actionsCell.appendChild(deleteButton);
                row.appendChild(actionsCell);
                
                // Agregar fila a la tabla
                decoratorsList.appendChild(row);
                
                // Limpiar el input
                decoratorNameInput.value = '';
            }
        });
    }
});

// YAML Utils Module - Utility functions for YAML editor
//=============================================================================

// Function to update character count
function updateCharCount() {
    const saveButton = document.querySelector('#editYamlModal .btn-primary');
    const countElement = document.getElementById('charCount');
    const maxCharsElement = document.getElementById('maxChars');
    
    if (saveButton && countElement) {
        let charCount = 0;
        const charLimit = parseInt(maxCharsElement?.textContent || '8000');
        
        // Verificar en qué pestaña estamos
        const formTab = document.querySelector('#form-tab');
        const rawYamlTab = document.querySelector('#raw-yaml-tab');
        
        if (formTab && rawYamlTab) {
            const isFormTabActive = formTab.classList.contains('active');
            const isRawYamlTabActive = rawYamlTab.classList.contains('active');
            
            if (isRawYamlTabActive) {
                // Si estamos en la pestaña de YAML crudo, obtenemos el recuento de caracteres directamente
                const yamlEditor = document.getElementById('rawYaml');
                if (yamlEditor) {
                    charCount = yamlEditor.value.length;
                }
            } else {
                // Si estamos en la pestaña de formulario, generamos el YAML y contamos los caracteres
                try {
                    const formData = getFormData();
                    const yamlText = jsyaml.dump(formData);
                    charCount = yamlText.length;
                } catch (error) {
                    console.error('Error al generar YAML para contar caracteres:', error);
                    // En caso de error, usamos el último valor conocido o 0
                    charCount = parseInt(saveButton.dataset.charCount || '0');
                }
            }
        } else {
            // Si no podemos determinar la pestaña activa, intentamos ambos métodos
            const yamlEditor = document.getElementById('rawYaml');
            if (yamlEditor && yamlEditor.value) {
                charCount = yamlEditor.value.length;
            } else {
                try {
                    const formData = getFormData();
                    const yamlText = jsyaml.dump(formData);
                    charCount = yamlText.length;
                } catch (error) {
                    console.error('Error al generar YAML para contar caracteres:', error);
                    charCount = parseInt(saveButton.dataset.charCount || '0');
                }
            }
        }
        
        // Actualizar el contador de caracteres
        saveButton.dataset.charCount = charCount.toString();
        countElement.textContent = charCount.toString();
        
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

// Function to clear all form fields
function clearForm() {
    console.log('Clearing form fields');
    
    // Limpiar campos de texto y textarea
    const textInputs = document.querySelectorAll('#formContainer input[type="text"], #formContainer input[type="email"], #formContainer textarea');
    textInputs.forEach(input => {
        input.value = '';
    });
    
    // Restablecer selects a su primera opción
    const selects = document.querySelectorAll('#formContainer select');
    selects.forEach(select => {
        if (select.options.length > 0) {
            select.selectedIndex = 0;
        }
    });
    
    // Limpiar todas las listas
    clearAllLists();
}

// Function to clear all lists
function clearAllLists() {
    console.log('Clearing all lists');
    
    // Listas a limpiar
    const lists = [
        'educationalLevelList',
        'keywordsList',
        'useCasesList',
        'contextDefinitionList',
        'capabilitiesList',
        'integrationStrategyList',
        'userDataHandlingList',
        'formattingRulesList',
        'finalNotesList',
        'toolsList'
    ];
    
    lists.forEach(listId => {
        const list = document.getElementById(listId);
        if (list) {
            list.innerHTML = '';
        }
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

// Function to get items from a list
function getListItems(listId) {
    const list = document.getElementById(listId);
    if (!list) return [];
    
    const items = [];
    
    // Verificar si es una lista de etiquetas (badges)
    if (list.classList.contains('d-flex') && list.classList.contains('flex-wrap')) {
        // Obtener texto de las etiquetas
        const badges = list.querySelectorAll('.badge');
        badges.forEach(badge => {
            const textSpan = badge.querySelector('span');
            if (textSpan) {
                items.push(textSpan.textContent.trim());
            }
        });
    } else {
        // Lista tradicional
        const listItems = list.querySelectorAll('.list-group-item');
        listItems.forEach(item => {
            const textSpan = item.querySelector('span');
            if (textSpan) {
                items.push(textSpan.textContent.trim());
            }
        });
    }
    
    return items;
}

// Función auxiliar para establecer valores de forma segura
function setValueSafely(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    } else {
        console.warn(`Elemento con ID '${elementId}' no encontrado en el DOM`);
    }
}

// Función auxiliar para obtener valores de forma segura del objeto data
function safeGetValue(data, path, defaultValue = '') {
    const parts = path.split('.');
    let current = data || {};
    
    console.log(`Trying to get value for path: ${path}`);
    
    for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object') {
            console.log(`Path ${path} failed at part ${part}, returning default:`, defaultValue);
            return defaultValue;
        }
        current = current[part];
    }
    
    console.log(`Final result for ${path}:`, current);
    return current !== undefined && current !== null ? current : defaultValue;
}

// Función para cargar los campos del formulario desde el objeto YAML parseado
function loadFormFields(data) {
    console.log('Loading form fields from data:', data);
    
    // Cargar campos de metadata
    if (data.metadata) {
        // Author
        if (data.metadata.author) {
            if (data.metadata.author.name) {
                document.getElementById('authorName').value = data.metadata.author.name;
            }
            if (data.metadata.author.role) {
                document.getElementById('authorRole').value = data.metadata.author.role;
            }
            if (data.metadata.author.organization) {
                document.getElementById('authorOrganization').value = data.metadata.author.organization;
            }
            if (data.metadata.author.contact) {
                document.getElementById('authorContact').value = data.metadata.author.contact;
            }
        }
        
        // Description
        if (data.metadata.description) {
            if (data.metadata.description.title) {
                document.getElementById('descriptionTitle').value = data.metadata.description.title;
            }
            if (data.metadata.description.summary) {
                document.getElementById('descriptionSummary').value = data.metadata.description.summary;
            }
            if (data.metadata.description.coverage) {
                document.getElementById('descriptionCoverage').value = data.metadata.description.coverage;
            }
            
            // Educational Level (array)
            if (Array.isArray(data.metadata.description.educational_level)) {
                data.metadata.description.educational_level.forEach(level => {
                    addListItem('educationalLevelList', level, true);
                });
            }
            
            // Use Cases (array)
            if (Array.isArray(data.metadata.description.use_cases)) {
                data.metadata.description.use_cases.forEach(useCase => {
                    addListItem('useCasesList', useCase, true);
                });
            }
            
            // Keywords (array)
            if (Array.isArray(data.metadata.description.keywords)) {
                data.metadata.description.keywords.forEach(keyword => {
                    addListItem('keywordsList', keyword, true);
                });
            }
        }
        
        // Visibility
        if (data.metadata.visibility) {
            document.getElementById('visibility').value = data.metadata.visibility;
        }
        
        // Rights
        if (data.metadata.rights) {
            document.getElementById('rights').value = data.metadata.rights;
        }
        
        // History (array)
        if (Array.isArray(data.metadata.history)) {
            data.metadata.history.forEach(historyItem => {
                addListItem('historyList', historyItem, true);
            });
        }
    }
    
    // Cargar campos de assistant_instructions según el esquema
    const instructions = data.assistant_instructions || data.assistant?.instructions;
    console.log('Assistant instructions object:', instructions);
    
    // Basic Instructions
    console.log('Role value in instructions:', instructions?.role);
    if (instructions?.role) {
        document.getElementById('role').value = instructions.role;
        console.log('Set role field to:', instructions.role);
    }
    
    console.log('Help text value in instructions:', instructions?.help_text);
    if (instructions?.help_text) {
        document.getElementById('helpText').value = instructions.help_text;
        console.log('Set helpText field to:', instructions.help_text);
    }
    
    // Context
    console.log('Context object:', instructions?.context);
    if (instructions?.context) {
        // Context Definition (array)
        if (Array.isArray(instructions.context.context_definition)) {
            instructions.context.context_definition.forEach(item => {
                addListItem('contextDefinitionList', item, true);
            });
            console.log('Added context_definition items to list');
        }
        
        // Integration Strategy (array)
        if (Array.isArray(instructions.context.integration_strategy)) {
            instructions.context.integration_strategy.forEach(item => {
                addListItem('integrationStrategyList', item, true);
            });
            console.log('Added integration_strategy items to list');
        }
        
        // User Data Handling (array)
        if (Array.isArray(instructions.context.user_data_handling)) {
            instructions.context.user_data_handling.forEach(item => {
                addListItem('userDataHandlingList', item, true);
            });
            console.log('Added user_data_handling items to list');
        }
    }
    
    // Style Guidelines
    console.log('Style guidelines object:', instructions?.style_guidelines);
    if (instructions?.style_guidelines) {
        if (instructions.style_guidelines.tone) {
            document.getElementById('tone').value = instructions.style_guidelines.tone;
            console.log('Set tone field to:', instructions.style_guidelines.tone);
        }
        
        if (instructions.style_guidelines.level_of_detail) {
            document.getElementById('levelOfDetail').value = instructions.style_guidelines.level_of_detail;
            console.log('Set levelOfDetail field to:', instructions.style_guidelines.level_of_detail);
        }
        
        // Formatting Rules (array)
        if (Array.isArray(instructions.style_guidelines.formatting_rules)) {
            instructions.style_guidelines.formatting_rules.forEach(rule => {
                addListItem('formattingRulesList', rule, true);
            });
            console.log('Added formatting_rules items to list');
        }
    }
    
    // Behavior
    console.log('Behavior object:', instructions?.behavior);
    if (instructions?.behavior) {
        // Handle on_greeting which could be a string or an array
        console.log('on_greeting value:', instructions.behavior.on_greeting);
        if (instructions.behavior.on_greeting) {
            if (Array.isArray(instructions.behavior.on_greeting)) {
                document.getElementById('onGreeting').value = instructions.behavior.on_greeting.join('\n');
                console.log('Set onGreeting field with array joined by newlines');
            } else {
                document.getElementById('onGreeting').value = instructions.behavior.on_greeting;
                console.log('Set onGreeting field with string value');
            }
        }
        
        // Handle on_help_command which could be a string or an array
        console.log('on_help_command value:', instructions.behavior.on_help_command);
        if (instructions.behavior.on_help_command) {
            if (Array.isArray(instructions.behavior.on_help_command)) {
                document.getElementById('onHelpCommand').value = instructions.behavior.on_help_command.join('\n');
                console.log('Set onHelpCommand field with array joined by newlines');
            } else {
                document.getElementById('onHelpCommand').value = instructions.behavior.on_help_command;
                console.log('Set onHelpCommand field with string value');
            }
        }
        
        if (instructions.behavior.invalid_command_response) {
            document.getElementById('invalidCommandResponse').value = instructions.behavior.invalid_command_response;
            console.log('Set invalidCommandResponse field');
        }
        
        if (instructions.behavior.unrelated_topic_response) {
            document.getElementById('unrelatedTopicResponse').value = instructions.behavior.unrelated_topic_response;
            console.log('Set unrelatedTopicResponse field');
        }
        
        if (instructions.behavior.prompt_visibility) {
            document.getElementById('promptVisibility').value = instructions.behavior.prompt_visibility;
            console.log('Set promptVisibility field');
        }
        
        if (instructions.behavior.on_tool) {
            document.getElementById('onTool').value = instructions.behavior.on_tool;
            console.log('Set onTool field');
        }
    }
    
    // Capabilities (array)
    console.log('Capabilities array:', instructions?.capabilities);
    if (Array.isArray(instructions?.capabilities)) {
        instructions.capabilities.forEach(capability => {
            addListItem('capabilitiesList', capability, true);
        });
        console.log('Added capabilities items to list');
    }
    
    // Final Notes (array)
    console.log('Final notes array:', instructions?.final_notes);
    if (Array.isArray(instructions?.final_notes)) {
        instructions.final_notes.forEach(note => {
            addListItem('finalNotesList', note, true);
        });
        console.log('Added final_notes items to list');
    }
    
    // Tools
    console.log('Tools object:', instructions?.tools);
    // Siempre cargar herramientas, independientemente de si instructions.tools existe
    if (typeof window.YAMLTools !== 'undefined' && typeof window.YAMLTools.loadTools === 'function') {
        console.log('Calling loadTools with data always, even if no tools defined');
        window.YAMLTools.loadTools(data);
    } else {
        console.error('YAMLTools.loadTools function not found');
    }
    console.log('Tools loaded according to schema');
    
    console.log('Form fields loaded successfully');
    
    // Guardar los datos originales para referencia
    window.yamlData = data;
    
    // Actualizar el contador de caracteres después de cargar todos los datos
    setTimeout(() => {
        if (typeof updateCharCount === 'function') {
            updateCharCount();
        } else if (window.YAMLUtils && typeof window.YAMLUtils.updateCharCount === 'function') {
            window.YAMLUtils.updateCharCount();
        }
    }, 200);
}

// Function to get all form data for generating YAML
function getFormData() {
    const data = {
        metadata: {
            description: {},
            author: {},
            visibility: {}
        },
        assistant_instructions: {
            style: {
                guidelines: {}
            },
            behavior: {},
            context_and_capabilities: {}
        }
    };
    
    // Metadata - Basic Information
    data.metadata.description.title = document.getElementById('title')?.value || '';
    data.metadata.description.summary = document.getElementById('summary')?.value || '';
    data.metadata.description.coverage = document.getElementById('coverage')?.value || '';
    data.metadata.visibility.is_public = document.getElementById('visibility')?.value === 'true';
    
    // Metadata - Author Information
    data.metadata.author.name = document.getElementById('authorName')?.value || '';
    data.metadata.author.contact = document.getElementById('authorEmail')?.value || '';
    data.metadata.author.organization = document.getElementById('authorOrganization')?.value || '';
    data.metadata.author.role = document.getElementById('authorRole')?.value || '';
    
    // Metadata - Advanced
    data.metadata.rights = document.getElementById('rights')?.value || '';
    
    // Metadata - Educational Level
    data.metadata.description.educational_level = getListItems('educationalLevelList');
    
    // Metadata - Keywords
    data.metadata.description.keywords = getListItems('keywordsList');
    
    // Metadata - Use Cases
    data.metadata.description.use_cases = getListItems('useCasesList');
    
    // Preserve existing history if available
    if (window.yamlData && window.yamlData.metadata && window.yamlData.metadata.history) {
        data.metadata.history = window.yamlData.metadata.history;
    }
    
    // Get history from the editor if it exists
    const historyEditor = document.getElementById('historyEditor');
    if (historyEditor && historyEditor.value.trim() !== '') {
        // Split the text by lines and filter empty lines
        data.metadata.history = historyEditor.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }
    
    // Reference to the instructions object
    const instructions = data.assistant_instructions;
    
    // Assistant Instructions - Basic
    instructions.role = document.getElementById('role')?.value || '';
    instructions.help_text = document.getElementById('helpText')?.value || '';
    
    // Assistant Instructions - Style Guidelines
    instructions.style.guidelines.tone = document.getElementById('tone')?.value || '';
    instructions.style.guidelines.level_of_detail = document.getElementById('levelOfDetail')?.value || '';
    instructions.style.guidelines.formatting_rules = getListItems('formattingRulesList');
    
    // Assistant Instructions - Behavior
    instructions.behavior.on_greeting = document.getElementById('onGreeting')?.value || '';
    instructions.behavior.on_help_command = document.getElementById('onHelpCommand')?.value || '';
    instructions.behavior.invalid_command_response = document.getElementById('invalidCommandResponse')?.value || '';
    instructions.behavior.unrelated_topic_response = document.getElementById('unrelatedTopicResponse')?.value || '';
    instructions.behavior.on_tool = document.getElementById('onTool')?.value || '';
    instructions.behavior.prompt_visibility = document.getElementById('promptVisibility')?.value || '';
    
    // Assistant Instructions - Context and Capabilities
    instructions.context_and_capabilities.context_definition = getListItems('contextDefinitionList');
    instructions.context_and_capabilities.capabilities = getListItems('capabilitiesList');
    instructions.context_and_capabilities.integration_strategy = getListItems('integrationStrategyList');
    instructions.context_and_capabilities.user_data_handling = getListItems('userDataHandlingList');
    
    // Assistant Instructions - Final Notes
    instructions.final_notes = getListItems('finalNotesList');
    
    // Obtener datos de herramientas (tools)
    if (typeof window.YAMLTools !== 'undefined' && typeof window.YAMLTools.getToolsData === 'function') {
        const toolsData = window.YAMLTools.getToolsData();
        if (toolsData) {
            data.assistant_instructions.tools = toolsData;
        }
    }
    
    // Preserve other fields that might exist in the original data
    if (window.yamlData) {
        // Preserve tools if they exist and we didn't collect new ones
        if (window.yamlData.tools && (!data.tools || Object.keys(data.tools).length === 0)) {
            data.tools = window.yamlData.tools;
        }
        
        // Preserve any other fields in assistant_instructions
        if (window.yamlData.assistant_instructions) {
            for (const key in window.yamlData.assistant_instructions) {
                if (!data.assistant_instructions.hasOwnProperty(key) && 
                    key !== 'style' && 
                    key !== 'behavior' && 
                    key !== 'context_and_capabilities' && 
                    key !== 'final_notes' &&
                    key !== 'tools') {
                    data.assistant_instructions[key] = window.yamlData.assistant_instructions[key];
                }
            }
        }
    }
    
    return data;
}

// Function to initialize event listeners for form fields to update character count
function initializeCharCountListeners() {
    // Obtener todos los campos de entrada del formulario
    const formInputs = document.querySelectorAll('#editYamlModal input, #editYamlModal textarea, #editYamlModal select');
    
    // Añadir event listeners a cada campo
    formInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Actualizar el contador de caracteres con un pequeño retraso
            setTimeout(updateCharCount, 100);
        });
        
        input.addEventListener('change', function() {
            // Actualizar el contador de caracteres con un pequeño retraso
            setTimeout(updateCharCount, 100);
        });
    });
    
    // Añadir event listeners para los botones que añaden o eliminan elementos
    const addButtons = document.querySelectorAll('#editYamlModal .add-list-item, #editYamlModal .add-tool-item');
    addButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Actualizar el contador de caracteres después de añadir un elemento
            setTimeout(updateCharCount, 200);
        });
    });
}

// Function to initialize all event listeners for the YAML editor
function initializeYamlEditorEvents() {
    // Inicializar los event listeners para actualizar el contador de caracteres
    initializeCharCountListeners();
    
    // Actualizar el contador de caracteres al iniciar
    updateCharCount();
    
    // Event listener para el botón de guardar
    document.getElementById('saveYamlBtnFooter')?.addEventListener('click', function() {
        console.log('Save button clicked');
        if (typeof saveYamlChanges === 'function') {
            saveYamlChanges();
        } else if (typeof window.YAMLEditor !== 'undefined' && typeof window.YAMLEditor.saveYamlChanges === 'function') {
            window.YAMLEditor.saveYamlChanges();
        } else {
            console.error('saveYamlChanges function not found');
            if (window.toast) {
                window.toast.error('Error: Save function not found');
            }
        }
    });
    
    // Event listeners para los botones de añadir elementos a las listas
    document.getElementById('addEducationalLevelBtn')?.addEventListener('click', function() {
        const input = document.getElementById('newEducationalLevel');
        if (input && input.value.trim() !== '') {
            addListItem('educationalLevelList', input.value.trim(), true);
            input.value = '';
        }
    });
    
    document.getElementById('addKeywordBtn')?.addEventListener('click', function() {
        const input = document.getElementById('newKeyword');
        if (input && input.value.trim() !== '') {
            addListItem('keywordsList', input.value.trim(), true);
            input.value = '';
        }
    });
    
    document.getElementById('addUseCaseBtn')?.addEventListener('click', function() {
        const input = document.getElementById('newUseCase');
        if (input && input.value.trim() !== '') {
            addListItem('useCasesList', input.value.trim(), true);
            input.value = '';
        }
    });
    
    // Event listeners para los inputs de texto para añadir elementos al presionar Enter
    document.getElementById('newEducationalLevel')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.value.trim() !== '') {
                addListItem('educationalLevelList', this.value.trim(), true);
                this.value = '';
            }
        }
    });
    
    document.getElementById('newKeyword')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.value.trim() !== '') {
                addListItem('keywordsList', this.value.trim(), true);
                this.value = '';
            }
        }
    });
    
    document.getElementById('newUseCase')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.value.trim() !== '') {
                addListItem('useCasesList', this.value.trim(), true);
                this.value = '';
            }
        }
    });
}

// Function to add an item to a list
function addListItem(listId, text, useTagStyle = false) {
    console.log(`Adding item to ${listId}: ${text}`);
    const list = document.getElementById(listId);
    if (!list) {
        console.error(`List with ID ${listId} not found`);
        return;
    }
    
    // Verificar si el elemento ya existe en la lista
    const existingItems = list.querySelectorAll('.list-group-item');
    for (let i = 0; i <existingItems.length; i++) {
        if (existingItems[i].textContent.trim() === text) {
            console.log(`Item '${text}' already exists in ${listId}`);
            return;
        }
    }
    
    if (useTagStyle) {
        // Crear un contenedor para las etiquetas si no existe
        if (!list.classList.contains('d-flex')) {
            list.classList.add('d-flex', 'flex-wrap', 'gap-2');
        }
        
        // Crear la etiqueta con estilo de badge
        const tag = document.createElement('span');
        tag.classList.add('badge', 'bg-primary', 'text-white', 'p-2', 'mb-2', 'd-flex', 'align-items-center');
        tag.innerHTML = `
            <span class="me-1">${text}</span>
            <button type="button" class="btn-close btn-close-white ms-1" style="font-size: 0.5rem;"></button>
        `;
        
        // Agregar evento para eliminar la etiqueta
        const closeButton = tag.querySelector('.btn-close');
        closeButton.addEventListener('click', function() {
            tag.remove();
        });
        
        list.appendChild(tag);
    } else {
        // Estilo de lista tradicional
        const item = document.createElement('div');
        item.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        item.appendChild(textSpan);
        
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('btn', 'btn-sm', 'btn-outline-danger');
        deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
        deleteButton.addEventListener('click', function() {
            item.remove();
        });
        
        item.appendChild(deleteButton);
        list.appendChild(item);
    }
}

// Export the functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        loadFormFields, 
        updateCharCount, 
        setValueSafely, 
        safeGetValue,
        getListItems,
        getMultilineText,
        getFormData,
        initializeYamlEditorEvents,
        initializeCharCountListeners,
        addListItem
    };
} else {
    // Make functions available globally when included via script tag
    window.YAMLUtils = { 
        loadFormFields, 
        updateCharCount, 
        setValueSafely, 
        safeGetValue,
        getListItems,
        getMultilineText,
        getFormData,
        initializeYamlEditorEvents,
        initializeCharCountListeners,
        addListItem
    };
}

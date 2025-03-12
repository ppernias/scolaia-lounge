//=============================================================================
// YAML Management - Core functions for handling YAML content
//=============================================================================

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
                console.error('YAML content element not found');
                showToast('error', 'Error displaying YAML content');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error loading YAML content');
        });
}

// Function to format YAML
function formatYaml(yaml) {
    try {
        const obj = jsyaml.load(yaml);
        return jsyaml.dump(obj, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
        });
    } catch (e) {
        console.error('Error formatting YAML:', e);
        return yaml;
    }
}

// Function to open the YAML editor modal
function editYamlContent(assistantId) {
    const button = document.querySelector(`button[onclick="editYamlContent('${assistantId}')"]`);
    if (button && button.disabled) {
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
    
    fetch(`/assistants/${assistantId}/yaml`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(yaml => {
            const modal = new bootstrap.Modal(document.getElementById('editYamlModal'));
            modal.show();
            
            // Ensure modal is fully shown before setting value
            setTimeout(() => {
                const editor = document.getElementById('yamlEditor');
                if (editor) {
                    editor.value = yaml;
                    document.getElementById('currentAssistantId').value = assistantId;
                    
                    // Load data into form fields
                    try {
                        const data = jsyaml.load(yaml);
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
                        console.error('Error parsing YAML:', e);
                        showToast('error', 'Error parsing YAML content');
                    }
                } else {
                    console.error('YAML editor element not found');
                    showToast('error', 'Error initializing YAML editor');
                }
            }, 500);
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error loading YAML content');
        });
}

// Function to save YAML changes
async function saveYamlChanges() {
    const assistantId = document.getElementById('currentAssistantId').value;
    const createNewVersion = document.getElementById('createNewVersion').checked;
    const minorChangesCheckbox = document.getElementById('minorChanges');
    const editorMode = document.getElementById('editorMode').value;
    
    // Verificar el límite de caracteres antes de guardar
    const saveButton = document.querySelector('#editYamlModal .btn-primary');
    const charCount = parseInt(saveButton.dataset.charCount || '0');
    const maxChars = parseInt(saveButton.dataset.maxChars || '8000');
    
    if (charCount > maxChars) {
        showToast('warning', `Content exceeds the ${maxChars} characters limit (${charCount}/${maxChars}). The assistant may not work correctly.`);
    }
    
    try {
        // Get current user info
        const profileResponse = await fetch('/profile/current');
        if (!profileResponse.ok) {
            throw new Error('Failed to fetch profile data');
        }
        const profileData = await profileResponse.json();
        
        // Get and normalize full user name
        let fullName = profileData?.full_name || document.getElementById('currentFullName')?.value;
        if (!fullName) {
            throw new Error('Could not determine current user');
        }
        
        // Normalizar el nombre (primera letra de cada palabra en mayúscula)
        fullName = fullName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        // Get form data
        const formData = getFormData();
        
        // Check for major changes (solo si estamos en modo edición)
        if (editorMode === 'edit') {
            const originalYaml = document.getElementById('yamlEditor').value;
            if (hasMajorChanges(originalYaml, formData)) {
                minorChangesCheckbox.checked = false;
                minorChangesCheckbox.disabled = true;
            }
        }
        
        const yamlData = jsyaml.load(formData);
        
        // Update history only for major changes or new assistants
        if (editorMode === 'create' || !minorChangesCheckbox.checked) {
            const currentDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
            
            if (!yamlData.metadata) yamlData.metadata = {};
            if (!yamlData.metadata.history) yamlData.metadata.history = [];
            
            // Si es una creación, añadir entrada de creación
            let newEntry;
            if (editorMode === 'create') {
                newEntry = `Created by ${fullName} on ${currentDate}`;
            } else {
                newEntry = `Updated by ${fullName} on ${currentDate}`;
            }
            
            // Check if last entry is similar (ignoring case)
            const lastEntry = yamlData.metadata.history[yamlData.metadata.history.length - 1];
            const isSimilarEntry = lastEntry && 
                lastEntry.toLowerCase().replace(/\s+/g, ' ') === 
                newEntry.toLowerCase().replace(/\s+/g, ' ');
            
            if (!isSimilarEntry) {
                yamlData.metadata.history.push(newEntry);
            }
        }
        
        // Convert back to YAML
        const updatedYaml = jsyaml.dump(yamlData);
        
        // Determinar endpoint y método según el modo
        let endpoint, method, requestBody;
        
        if (editorMode === 'create') {
            endpoint = '/assistants/create';
            method = 'POST';
            requestBody = JSON.stringify({
                yaml_content: updatedYaml
            });
        } else {
            endpoint = `/assistants/${assistantId}/yaml`;
            method = 'PUT';
            requestBody = JSON.stringify({
                yaml_content: updatedYaml,
                create_new_version: createNewVersion
            });
        }
        
        // Send to server
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: requestBody
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Network response was not ok');
        }

        const data = await response.json();
        
        // Mostrar mensaje de éxito
        if (editorMode === 'create') {
            showToast('success', 'Assistant created successfully');
        } else {
            showToast('success', data.message || 'Changes saved successfully');
        }
        
        // Cerrar el modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editYamlModal'));
        if (modal) {
            modal.hide();
        }
        
        // Redireccionar según el resultado
        if (editorMode === 'create') {
            // Si es una creación, redirigir a la página principal de asistentes
            setTimeout(() => {
                window.location.href = '/assistants/';
            }, 1000);
        } else if (data.id) {
            // Si es una nueva versión, redirigir a ella
            window.location.href = `/assistants/${data.id}`;
        } else {
            // En otros casos, recargar la página
            window.location.reload();
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', `Error saving changes: ${error.message}`);
    }
}

// Function to create new assistant using editor
async function createNewAssistant() {
    try {
        // Get current user's full name from hidden field
        const fullName = document.getElementById('currentFullName')?.value;
        if (!fullName) {
            showToast('error', 'Could not determine current user');
            return;
        }

        // Fetch defaults
        const response = await fetch('/assistants/defaults');
        if (!response.ok) {
            throw new Error('Failed to fetch default template');
        }
        const defaultTemplate = await response.text();
        
        // Cargar la plantilla en el editor sin crear el asistente todavía
        document.getElementById('yamlEditor').value = defaultTemplate;
        
        // Marcar que estamos en modo creación
        document.getElementById('editorMode').value = 'create';
        
        // Abrir el modal de edición
        const modal = new bootstrap.Modal(document.getElementById('editYamlModal'));
        modal.show();
        
        // Cargar los campos del formulario con los valores predeterminados
        const yamlData = jsyaml.load(defaultTemplate);
        loadFormFields(yamlData);
    } catch (error) {
        console.error('Error:', error);
        showToast('error', `Error creating assistant: ${error.message}`);
    }
}

// Function to load default template
function loadDefaultTemplate() {
    fetch('/assistants/defaults')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const yamlContent = jsyaml.dump(data, {
                indent: 2,
                lineWidth: -1,
                noRefs: true,
                sortKeys: false
            });
            document.getElementById('yamlEditor').value = yamlContent;
        })
        .catch(error => {
            console.error('Error loading template:', error);
            showToast('error', 'Error loading template');
        });
}

//=============================================================================
// Form Management - Functions for handling form fields and data
//=============================================================================

// Function to load form fields with data
async function loadFormFields(data) {
    try {
        // Fetch user profile data
        const profileResponse = await fetch('/profile/current');
        if (!profileResponse.ok) {
            throw new Error('Failed to fetch profile data');
        }
        const profileData = await profileResponse.json();

        // Metadata - Description
        document.getElementById('assistantName').value = data.metadata?.description?.title || '';
        document.getElementById('assistantDescription').value = data.metadata?.description?.summary || '';
        document.getElementById('assistantCoverage').value = data.metadata?.description?.coverage || '';

        // Educational Level
        const educationalLevelList = document.getElementById('educationalLevelList');
        educationalLevelList.innerHTML = '';
        let educationalLevels = data.metadata?.description?.educational_level;
        
        // Ensure educationalLevels is an array and has at least one value
        if (!Array.isArray(educationalLevels) || educationalLevels.length === 0) {
            educationalLevels = ['other'];
        }
        
        educationalLevels.forEach(level => {
            if (level && typeof level === 'string') {
                addListItem('educationalLevelList', 'educational-level', level);
            }
        });

        // Use Cases
        const useCasesList = document.getElementById('useCasesList');
        useCasesList.innerHTML = '';
        data.metadata?.description?.use_cases?.forEach(useCase => {
            addListItem('useCasesList', 'use-case', useCase);
        });

        // Keywords
        const keywordsList = document.getElementById('keywordsList');
        keywordsList.innerHTML = '';
        data.metadata?.description?.keywords?.forEach(keyword => {
            addKeywordElement(keyword);
        });

        // Author - Siempre usar los datos del perfil del usuario actual
        document.getElementById('authorName').value = profileData?.full_name || '';
        document.getElementById('authorRole').value = profileData?.role || data.metadata?.author?.role || '';
        document.getElementById('authorContact').value = profileData?.email || '';
        document.getElementById('authorOrganization').value = profileData?.organization || '';

        // Visibility
        document.getElementById('assistantVisibility').checked = data.metadata?.visibility?.is_public !== false;

        // Metadata
        document.getElementById('assistantRights').textContent = data.metadata?.rights || 'All rights reserved';

        // History
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        data.metadata?.history?.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center gap-2';
            li.innerHTML = `
                <i class="bi bi-clock-history text-muted"></i>
                <span class="text-muted small">${entry}</span>
            `;
            historyList.appendChild(li);
        });

        // Context
        data.assistant_instructions?.context?.context_definition?.forEach(item => {
            addListItem('contextDefinitionList', 'context-definition', item);
        });

        data.assistant_instructions?.context?.integration_strategy?.forEach(item => {
            addListItem('integrationStrategyList', 'integration-strategy', item);
        });

        data.assistant_instructions?.context?.user_data_handling?.forEach(item => {
            addListItem('userDataHandlingList', 'user-data-handling', item);
        });

        // System
        document.getElementById('systemContent').value = data.assistant_instructions?.role || '';

        // Behavior
        document.getElementById('invalidCommandResponse').value = data.assistant_instructions?.behavior?.invalid_command_response || '';
        document.getElementById('onGreeting').value = (data.assistant_instructions?.behavior?.on_greeting || []).join('\n');
        document.getElementById('onHelpCommand').value = (data.assistant_instructions?.behavior?.on_help_command || []).join('\n');
        document.getElementById('unrelatedTopicResponse').value = data.assistant_instructions?.behavior?.unrelated_topic_response || '';
        document.getElementById('promptVisibility').value = data.assistant_instructions?.behavior?.prompt_visibility || '';

        // Capabilities
        document.getElementById('capabilities').value = (data.assistant_instructions?.capabilities || []).join('\n');

        // Style Guidelines
        document.getElementById('styleTone').value = data.assistant_instructions?.style_guidelines?.tone || '';
        document.getElementById('styleLevelOfDetail').value = data.assistant_instructions?.style_guidelines?.level_of_detail || '';
        
        data.assistant_instructions?.style_guidelines?.formatting_rules?.forEach(item => {
            addListItem('formattingRulesList', 'formatting-rule', item);
        });

        // Final Notes
        data.assistant_instructions?.final_notes?.forEach(item => {
            addListItem('finalNotesList', 'final-note', item);
        });

        // Help Text
        document.getElementById('helpText').value = data.assistant_instructions?.help_text || '';

        // Tools
        const toolsList = document.getElementById('toolsList');
        toolsList.innerHTML = '';
        
        // Add commands
        Object.entries(data.assistant_instructions?.tools?.commands || {}).forEach(([name, command], index) => {
            addToolToList({
                type: 'command',
                name: name,
                display_name: command.display_name || name,
                description: command.internal_description || '',
                internal_description: command.description || ''
            }, index);
        });
        
        // Add options
        Object.entries(data.assistant_instructions?.tools?.options || {}).forEach(([name, option], index) => {
            addToolToList({
                type: 'option',
                name: name,
                display_name: option.display_name || name,
                description: option.internal_description || '',
                internal_description: option.description || ''
            }, index + Object.keys(data.assistant_instructions?.tools?.commands || {}).length);
        });
        
        // Add decorators
        Object.entries(data.assistant_instructions?.tools?.decorators || {}).forEach(([name, decorator], index) => {
            addToolToList({
                type: 'decorator',
                name: name,
                display_name: decorator.display_name || name,
                description: decorator.internal_description || '',
                internal_description: decorator.description || ''
            }, index + Object.keys(data.assistant_instructions?.tools?.commands || {}).length + 
                   Object.keys(data.assistant_instructions?.tools?.options || {}).length);
        });

        // Update character count after loading fields
        console.log('Form fields loaded, updating character count');
        setTimeout(updateCharCount, 200);
    } catch (error) {
        console.error('Error loading form fields:', error);
        showToast('error', 'Error loading form fields');
    }
}

// Function to gather all form data and generate YAML
function getFormData() {
    try {
        const yamlData = {
            metadata: {
                author: {
                    name: safeGetValue('authorName'),
                    role: safeGetValue('authorRole'),
                    contact: safeGetValue('authorContact'),
                    organization: safeGetValue('authorOrganization')
                },
                description: {
                    title: safeGetValue('assistantName'),
                    summary: safeGetValue('assistantDescription'),
                    coverage: safeGetValue('assistantCoverage'),
                    educational_level: getListItems('educationalLevelList'),
                    use_cases: getListItems('useCasesList'),
                    keywords: getKeywords()
                },
                visibility: {
                    is_public: safeGetChecked('assistantVisibility', true)
                },
                rights: safeGetTextContent('assistantRights')
            },
            assistant_instructions: {
                context: {
                    context_definition: getListItems('contextDefinitionList'),
                    integration_strategy: getListItems('integrationStrategyList'),
                    user_data_handling: getListItems('userDataHandlingList')
                },
                style_guidelines: {
                    tone: safeGetValue('styleTone'),
                    level_of_detail: safeGetValue('styleLevelOfDetail'),
                    formatting_rules: getListItems('formattingRulesList')
                },
                final_notes: getListItems('finalNotesList'),
                help_text: safeGetValue('helpText'),
                role: safeGetValue('systemContent'),
                behavior: {
                    invalid_command_response: safeGetValue('invalidCommandResponse'),
                    on_greeting: safeGetValue('onGreeting', '').split('\n').filter(line => line.trim()),
                    on_help_command: safeGetValue('onHelpCommand', '').split('\n').filter(line => line.trim()),
                    unrelated_topic_response: safeGetValue('unrelatedTopicResponse'),
                    prompt_visibility: safeGetValue('promptVisibility')
                },
                capabilities: safeGetValue('capabilities', '').split('\n').filter(line => line.trim()),
                tools: {
                    commands: {},
                    options: {},
                    decorators: {}
                }
            }
        };

        // Get tools safely
        const toolsList = document.getElementById('toolsList');
        if (toolsList) {
            toolsList.querySelectorAll('.tool-item').forEach(toolItem => {
                if (!toolItem) return;

                const type = toolItem.querySelector('select[name="type"]')?.value;
                const name = toolItem.querySelector('input[name="name"]')?.value;
                const displayName = toolItem.querySelector('input[name="display_name"]')?.value;
                const description = toolItem.querySelector('textarea[name="description"]')?.value;
                const internalDescription = toolItem.querySelector('input[name="internal_description"]')?.value;

                if (type && name) {
                    if (type === 'command') {
                        const fullName = name.startsWith('/') ? name : '/' + name;
                        yamlData.assistant_instructions.tools.commands[fullName] = {
                            display_name: displayName || name,
                            description: internalDescription || '',
                            internal_description: description || ''
                        };
                    } else if (type === 'option') {
                        const fullName = name.startsWith('/') ? name : '/' + name;
                        yamlData.assistant_instructions.tools.options[fullName] = {
                            display_name: displayName || name,
                            description: internalDescription || '',
                            internal_description: description || ''
                        };
                    } else if (type === 'decorator') {
                        const fullName = name.startsWith('+++') ? name : '+++' + name;
                        yamlData.assistant_instructions.tools.decorators[fullName] = {
                            display_name: displayName || name,
                            description: internalDescription || '',
                            internal_description: description || ''
                        };
                    }
                }
            });
        }

        // Get original YAML to preserve history
        try {
            const yamlEditor = document.getElementById('yamlEditor');
            if (yamlEditor) {
                const originalYaml = jsyaml.load(yamlEditor.value);
                if (originalYaml?.metadata?.history) {
                    yamlData.metadata.history = originalYaml.metadata.history;
                }
            }
        } catch (error) {
            console.error('Error preserving history:', error);
        }

        return jsyaml.dump(yamlData);
    } catch (error) {
        console.error('Error generating YAML:', error);
        return ""; // Return empty string to avoid breaking the character count
    }
}

// Helper function to get value of an element safely
function safeGetValue(elementId, defaultValue = '') {
    const element = document.getElementById(elementId);
    return element ? element.value : defaultValue;
}

// Helper function to get text content of an element safely
function safeGetTextContent(elementId, defaultValue = '') {
    const element = document.getElementById(elementId);
    return element ? element.textContent : defaultValue;
}

// Helper function to get checked state of a checkbox safely
function safeGetChecked(elementId, defaultValue = false) {
    const element = document.getElementById(elementId);
    return element ? element.checked : defaultValue;
}

// Function to get list items
function getListItems(listId) {
    const list = document.getElementById(listId);
    if (!list) return [];
    
    const items = Array.from(list.children).map(item => {
        const span = item.querySelector('span');
        return span ? span.textContent.trim() : item.textContent.trim();
    });

    // For educational level list, ensure at least 'other' is present
    if (listId === 'educationalLevelList' && items.length === 0) {
        return ['other'];
    }

    return items;
}

//=============================================================================
// Character Count Management - Functions for handling YAML character count
//=============================================================================

// Function to update character counter
function updateCharCount() {
    try {
        const yaml = getFormData();
        const charCount = yaml.length;
        const maxChars = 8000;
        const percentage = (charCount / maxChars) * 100;
        
        // Update counter
        const counterElement = document.getElementById('yamlCharCount');
        if (counterElement) {
            counterElement.textContent = charCount;
        }
        
        // Update progress bar
        const progressBar = document.getElementById('yamlCharProgress');
        if (progressBar) {
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
            
            // Change color based on percentage
            if (percentage > 90) {
                progressBar.classList.remove('bg-success', 'bg-warning');
                progressBar.classList.add('bg-danger');
            } else if (percentage > 75) {
                progressBar.classList.remove('bg-success', 'bg-danger');
                progressBar.classList.add('bg-warning');
            } else {
                progressBar.classList.remove('bg-warning', 'bg-danger');
                progressBar.classList.add('bg-success');
            }
        }
        
        // Store the current character count as a data attribute for later use
        const saveButton = document.querySelector('#editYamlModal .btn-primary');
        if (saveButton) {
            saveButton.dataset.charCount = charCount;
            saveButton.dataset.maxChars = maxChars;
        }
        
        console.log(`Character count updated: ${charCount}/${maxChars} (${percentage.toFixed(2)}%)`);
    } catch (error) {
        console.error('Error updating character count:', error);
    }
}

//=============================================================================
// Tools Management - Functions for handling tool items
//=============================================================================

// Function to add tool to list
function addToolToList(tool, index) {
    const toolsList = document.getElementById('toolsList');
    const toolDiv = document.createElement('div');
    toolDiv.className = 'tool-item mb-4 p-3 border rounded';
    
    // Ensure tool has default values
    tool.type = tool.type || 'command';
    tool.name = tool.name || '';
    if (tool.name.startsWith('/')) {
        tool.name = tool.name.substring(1);
    }
    // For decorators, handle the +++ prefix
    if (tool.name.startsWith('+++')) {
        tool.name = tool.name.substring(3);
    }
    tool.display_name = tool.display_name || '';
    tool.description = tool.description || '';
    tool.internal_description = tool.internal_description || '';

    toolDiv.innerHTML = `
        <div class="row mb-2">
            <div class="col-md-4">
                <label class="form-label">Type</label>
                <select class="form-select" name="type" onchange="updateCommandName(this)">
                    <option value="command" ${tool.type === 'command' ? 'selected' : ''}>Command</option>
                    <option value="option" ${tool.type === 'option' ? 'selected' : ''}>Option</option>
                    <option value="decorator" ${tool.type === 'decorator' ? 'selected' : ''}>Decorator</option>
                </select>
            </div>
            <div class="col-md-8">
                <label class="form-label">Name</label>
                <div class="input-group">
                    <span class="input-group-text tool-prefix">${tool.type === 'decorator' ? '+++' : '/'}</span>
                    <input type="text" name="name" class="form-control tool-name" value="${tool.name}" placeholder="Enter a short and descriptive name to refer to the tool">
                </div>
            </div>
        </div>
        <div class="row mb-2">
            <div class="col-md-6">
                <label class="form-label">Display Name</label>
                <input type="text" name="display_name" class="form-control" value="${tool.display_name}" placeholder="Display Name">
            </div>
            <div class="col-md-6">
                <label class="form-label">Description</label>
                <input type="text" name="internal_description" class="form-control" value="${tool.internal_description}" placeholder="Description">
            </div>
        </div>
        <div class="row mb-2">
            <div class="col-12">
                <label class="form-label">Prompt</label>
                <div class="input-group">
                    <textarea name="description" class="form-control" rows="2" placeholder="Enter prompt for this tool">${tool.description}</textarea>
                    <button class="btn btn-outline-primary" type="button" onclick="improveToolPrompt(this)">
                        <i class="bi bi-magic"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="text-end">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeTool(this)">
                <i class="bi bi-trash"></i> Remove
            </button>
        </div>
    `;
    
    toolsList.appendChild(toolDiv);
}

// Function to update command name based on type
function updateCommandName(selectElement) {
    const toolDiv = selectElement.closest('.tool-item');
    const nameInput = toolDiv.querySelector('.tool-name');
    const prefixSpan = toolDiv.querySelector('.tool-prefix');
    
    if (!nameInput || !prefixSpan) return; // Exit if elements not found
    
    // Update prefix based on tool type
    const type = selectElement.value;
    if (type === 'decorator') {
        prefixSpan.textContent = '+++';
    } else {
        prefixSpan.textContent = '/';
    }
}

// Function to add new tool to list
function addNewTool() {
    const toolsList = document.getElementById('toolsList');
    const newTool = {
        type: 'command',
        name: '',
        display_name: '',
        description: '',
        internal_description: ''
    };
    addToolToList(newTool, toolsList.children.length);
}

// Function to remove tool
function removeTool(button) {
    button.closest('.tool-item').remove();
}

// Function to improve tool prompt using AI
async function improveToolPrompt(button) {
    const toolDiv = button.closest('.tool-item');
    const promptTextarea = toolDiv.querySelector('textarea');  
    const currentPrompt = promptTextarea.value;
    const toolName = toolDiv.querySelector('input[name="name"]').value;  
    const toolType = toolDiv.querySelector('select').value;  
    const displayName = toolDiv.querySelector('input[name="display_name"]').value;  

    // Show spinner on button
    const originalContent = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    button.disabled = true;

    let loadingToast = null;
    try {
        // First get the model being used
        const modelResponse = await fetch('/settings/get_default_llm');
        if (!modelResponse.ok) {
            throw new Error('Could not determine the model being used');
        }
        const modelData = await modelResponse.json();
        const modelName = modelData.model || 'AI';
        
        // Create a temporary instance of the notification system without auto-close
        const tempToast = new ToastSystem({ duration: 0 });
        // Show start notification and save its reference
        loadingToast = tempToast.show(`Requesting tool improvement from ${modelName}...`, 'info');

        const response = await fetch('/assistants/improve-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: currentPrompt,
                context: {
                    tool_name: toolName,
                    tool_type: toolType,
                    display_name: displayName
                }
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data.improved_prompt) {
            // Close loading notification before showing success
            if (loadingToast) tempToast.dismiss(loadingToast);
            window.toast.success(`Successfully improved tool prompt using ${modelName}`);
            
            // Set target textarea and show modal
            setTargetTextarea(promptTextarea);
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmImprovementsModal'));
            document.getElementById('originalPrompt').textContent = currentPrompt;
            document.getElementById('improvedPrompt').textContent = data.improved_prompt;
            confirmModal.show();
        } else {
            // Close loading notification before showing error
            if (loadingToast) tempToast.dismiss(loadingToast);
            window.toast.error('Failed to improve prompt');
        }
    } catch (error) {
        console.error('Error:', error);
        // Close loading notification before showing error
        if (loadingToast) tempToast.dismiss(loadingToast);
        window.toast.error('Error improving prompt: ' + error.message);
    } finally {
        // Restore button
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

//=============================================================================
// Keywords Management - Functions for handling keywords
//=============================================================================

// Function to add keyword element
function addKeywordElement(keyword) {
    if (!keyword) return;
    
    const keywordsList = document.getElementById('keywordsList');
    const existingKeywords = Array.from(keywordsList.getElementsByClassName('keyword-item'))
        .map(item => item.textContent.trim());
    
    if (!existingKeywords.includes(keyword)) {
        const keywordDiv = document.createElement('div');
        keywordDiv.className = 'keyword-item badge bg-primary me-2 mb-2';
        keywordDiv.innerHTML = `
            ${keyword}
            <button type="button" class="btn-close btn-close-white" 
                    aria-label="Close" onclick="removeKeyword(this)"></button>
        `;
        keywordsList.appendChild(keywordDiv);
    }
}

// Function to add keyword
function addKeyword() {
    const keywordInput = document.getElementById('keywordInput');
    const keyword = keywordInput.value.trim();
    
    if (keyword) {
        const keywordsList = document.getElementById('keywordsList');
        const existingKeywords = Array.from(keywordsList.getElementsByClassName('keyword-item'))
            .map(item => item.textContent.trim());
        
        if (!existingKeywords.includes(keyword)) {
            const keywordDiv = document.createElement('div');
            keywordDiv.className = 'keyword-item badge bg-primary me-2 mb-2';
            keywordDiv.innerHTML = `
                ${keyword}
                <button type="button" class="btn-close btn-close-white" 
                        aria-label="Close" onclick="removeKeyword(this)"></button>
            `;
            keywordsList.appendChild(keywordDiv);
            keywordInput.value = '';
        }
    }
}

// Function to remove keyword
function removeKeyword(element) {
    element.closest('.keyword-item').remove();
}

// Function to get all keywords
function getKeywords() {
    const keywordsList = document.getElementById('keywordsList');
    if (!keywordsList) return [];
    
    return Array.from(keywordsList.getElementsByClassName('keyword-item'))
        .map(item => {
            // Extraer solo el texto sin incluir el botón de cerrar
            const text = item.textContent.trim();
            // Eliminar espacios en blanco adicionales
            return text.replace(/\s+/g, ' ').trim();
        });
}

//=============================================================================
// Event Handlers - DOM event listeners and handlers
//=============================================================================

// Handle tabulations in editor
document.addEventListener('DOMContentLoaded', function() {
    const yamlEditor = document.getElementById('yamlEditor');
    if (yamlEditor) {
        yamlEditor.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.substring(0, start) + '  ' + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 2;
            }
        });
    }
});

// Event listeners for critical fields
document.addEventListener('DOMContentLoaded', function() {
    const assistantName = document.getElementById('assistantName');
    const authorName = document.getElementById('authorName');
    const minorChangesCheckbox = document.getElementById('minorChanges');
    
    function handleCriticalFieldChange() {
        minorChangesCheckbox.checked = false;
        minorChangesCheckbox.disabled = true;
        showToast('info', 'Changes to title or author name are always considered major changes');
    }
    
    if (assistantName) {
        assistantName.addEventListener('change', handleCriticalFieldChange);
    }
    
    if (authorName) {
        authorName.addEventListener('change', handleCriticalFieldChange);
    }
});

// Function to toggle new version checkbox availability
function toggleNewVersion() {
    const minorChangesCheckbox = document.getElementById('minorChanges');
    const newVersionCheckbox = document.getElementById('createNewVersion');
    
    if (minorChangesCheckbox && newVersionCheckbox) {
        // If minor changes is checked, disable and uncheck new version
        if (minorChangesCheckbox.checked) {
            newVersionCheckbox.checked = false;
            newVersionCheckbox.disabled = true;
        } else {
            // If minor changes is not checked, enable new version
            newVersionCheckbox.disabled = false;
        }
    }
}

// Function to detect major changes
function hasMajorChanges(oldYaml, newYaml) {
    const oldData = jsyaml.load(oldYaml);
    const newData = jsyaml.load(newYaml);

    // Check for changes in title
    const oldTitle = oldData?.metadata?.description?.title;
    const newTitle = newData?.metadata?.description?.title;
    if (oldTitle !== newTitle) {
        return true;
    }

    // Check for changes in author name
    const oldAuthor = oldData?.metadata?.author?.name;
    const newAuthor = newData?.metadata?.author?.name;
    if (oldAuthor !== newAuthor) {
        return true;
    }

    return false;
}

// Function to open new assistant modal
async function openNewAssistantModal() {
    try {
        // Get current user info
        const profileResponse = await fetch('/profile/current');
        if (!profileResponse.ok) {
            throw new Error('Failed to fetch profile data');
        }
        const profileData = await profileResponse.json();
        
        // Get and normalize full user name
        let fullName = profileData?.full_name || document.getElementById('currentFullName')?.value;
        if (!fullName) {
            throw new Error('Could not determine current user');
        }
        
        // Fetch the default template
        const response = await fetch('/assistants/template');
        if (!response.ok) {
            throw new Error('Failed to fetch template');
        }
        const data = await response.json();
        
        // Update form with template data
        updateFormWithData(data);
        
        // Set author information
        document.getElementById('authorName').value = fullName;
        
        // Set creation date for new assistants
        const currentDate = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        
        data.metadata.creation_date = currentDate;
        data.metadata.last_update = currentDate;
        data.metadata.history = [
            `created by ${fullName} on ${currentDate}`
        ];
        
        // Update the form with the new dates
        document.getElementById('assistantCreation').textContent = currentDate;
        document.getElementById('assistantLastUpdate').textContent = currentDate;
        
        // Update history list
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        data.metadata.history.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center gap-2';
            li.innerHTML = `
                <i class="bi bi-clock-history text-muted"></i>
                <span class="text-muted small">${entry}</span>
            `;
            historyList.appendChild(li);
        });
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error opening new assistant modal');
    }
}

// Add listeners to update character counter
document.addEventListener('DOMContentLoaded', function() {
    const formFields = document.querySelectorAll('#editYamlModal textarea, #editYamlModal input[type="text"]');
    formFields.forEach(field => {
        field.addEventListener('input', updateCharCount);
    });
    
    // Add listeners for add/remove buttons
    const addButtons = document.querySelectorAll('[onclick*="add"]');
    addButtons.forEach(button => {
        const originalClick = button.onclick;
        button.onclick = function(e) {
            originalClick.call(this, e);
            setTimeout(updateCharCount, 100);
        };
    });
    
    const removeButtons = document.querySelectorAll('[onclick*="remove"]');
    removeButtons.forEach(button => {
        const originalClick = button.onclick;
        button.onclick = function(e) {
            originalClick.call(this, e);
            setTimeout(updateCharCount, 100);
        };
    });
    
    // Add listeners for tab changes
    const tabButtons = document.querySelectorAll('#editYamlModal .nav-link');
    tabButtons.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function() {
            console.log('Tab changed, updating character count');
            setTimeout(updateCharCount, 100);
        });
    });
    
    // Add listener for modal shown event
    const editYamlModal = document.getElementById('editYamlModal');
    if (editYamlModal) {
        editYamlModal.addEventListener('shown.bs.modal', function() {
            console.log('Modal shown, updating character count');
            setTimeout(updateCharCount, 200);
        });
    }
});

// Function to add item to a list
function addListItem(listId, dataType, text) {
    const list = document.getElementById(listId);
    if (!list || !text) return;
    
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.setAttribute('data-type', dataType);
    li.innerHTML = `
        <span>${text}</span>
        <button type="button" class="btn btn-danger btn-sm ms-2" onclick="removeListItem(this)">
            <i class="bi bi-trash"></i>
        </button>
    `;
    list.appendChild(li);
}

// Function to remove list item
function removeListItem(button) {
    button.closest('li').remove();
}

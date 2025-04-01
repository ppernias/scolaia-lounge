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
async function saveYamlChanges() {
    const assistantId = document.getElementById('currentAssistantId').value;
    const createNewVersion = document.getElementById('createNewVersion').checked;
    const minorChangesCheckbox = document.getElementById('minorChanges');
    const editorMode = document.getElementById('editorMode').value;
    
    // Verificar el límite de caracteres antes de guardar
    const saveButton = document.querySelector('#editYamlModal .btn-primary');
    const charCount = parseInt(saveButton.dataset.charCount || '0');
    const charLimit = parseInt(saveButton.dataset.charLimit || '100000');
    
    if (charCount > charLimit) {
        if (window.toast) {
            window.toast.error(`El contenido excede el límite de ${charLimit} caracteres. Por favor, reduzca el contenido.`);
        }
        console.error(`Character limit exceeded: ${charCount}/${charLimit}`);
        return;
    }
    
    // Obtener el contenido YAML del editor
    const yamlEditor = document.getElementById('yamlEditor');
    if (!yamlEditor) {
        if (window.toast) {
            window.toast.error('Error: Editor not found');
        }
        console.error('YAML editor not found');
        return;
    }
    
    const yamlContent = yamlEditor.value;
    
    // Verificar si el contenido ha cambiado
    if (yamlContent === window.originalYaml && editorMode === 'edit') {
        if (window.toast) {
            window.toast.info('No changes detected in YAML content');
        }
        console.log('No changes detected in YAML content');
        const modal = bootstrap.Modal.getInstance(document.getElementById('editYamlModal'));
        if (modal) modal.hide();
        return;
    }
    
    // Validar el YAML antes de enviar
    try {
        const parsedYaml = jsyaml.load(yamlContent);
        if (!parsedYaml || Object.keys(parsedYaml).length === 0) {
            throw new Error('YAML content is empty or invalid');
        }
    } catch (e) {
        if (window.toast) {
            window.toast.error('Error validating YAML: ' + e.message);
        }
        console.error('Error validating YAML:', e);
        return;
    }
    
    // Deshabilitar el botón de guardar para evitar múltiples envíos
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
    }
    
    // Preparar los datos para enviar
    const formData = new FormData();
    formData.append('yaml_content', yamlContent);
    formData.append('create_new_version', createNewVersion);
    if (minorChangesCheckbox) {
        formData.append('minor_changes', minorChangesCheckbox.checked);
    }
    
    // Enviar los datos al servidor
    try {
        let url = '/assistants/save_yaml';
        if (editorMode === 'edit' && assistantId) {
            url = `/assistants/${assistantId}/update_yaml`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            if (window.toast) {
                window.toast.success(result.message || 'YAML saved successfully');
            }
            console.log('YAML saved successfully:', result);
            
            // Cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editYamlModal'));
            if (modal) modal.hide();
            
            // Recargar la página si se creó un nuevo asistente o se actualizó uno existente
            if (result.redirect_url) {
                window.location.href = result.redirect_url;
            } else if (editorMode === 'edit') {
                // Solo recargar si estamos en modo edición
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } else {
            throw new Error(result.message || 'Error saving YAML');
        }
    } catch (error) {
        if (window.toast) {
            window.toast.error('Error saving YAML: ' + error.message);
        }
        console.error('Error saving YAML:', error);
    } finally {
        // Restaurar el botón de guardar
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = 'Guardar';
        }
    }
}

// Function to load tools from YAML data
function loadTools(data) {
    console.log('Loading tools from data');
    const toolsList = document.getElementById('toolsList');
    if (!toolsList) {
        console.error('toolsList element not found');
        return;
    }
    
    // Limpiar la lista de herramientas
    toolsList.innerHTML = '';
    
    // Verificar si hay herramientas en el esquema
    if (data.schema && data.schema.tools && Array.isArray(data.schema.tools)) {
        console.log('Loading tools from schema:', data.schema.tools.length);
        data.schema.tools.forEach(tool => {
            addToolItem(tool.name, tool.description);
        });
    }
    
    // Verificar si hay herramientas en las instrucciones del asistente
    if (data.assistant_instructions && data.assistant_instructions.tools) {
        const toolsObj = data.assistant_instructions.tools;
        
        // Cargar comandos
        if (toolsObj.commands && typeof toolsObj.commands === 'object') {
            console.log('Loading commands:', Object.keys(toolsObj.commands).length);
            Object.entries(toolsObj.commands).forEach(([name, description]) => {
                addToolItem(name, description, 'command');
            });
        }
        
        // Cargar opciones
        if (toolsObj.options && typeof toolsObj.options === 'object') {
            console.log('Loading options:', Object.keys(toolsObj.options).length);
            Object.entries(toolsObj.options).forEach(([name, description]) => {
                addToolItem(name, description, 'option');
            });
        }
        
        // Cargar decoradores
        if (toolsObj.decorators && typeof toolsObj.decorators === 'object') {
            console.log('Loading decorators:', Object.keys(toolsObj.decorators).length);
            Object.entries(toolsObj.decorators).forEach(([name, description]) => {
                addToolItem(name, description, 'decorator');
            });
        }
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
    } else {
        console.warn(`Elemento con ID '${elementId}' no encontrado en el DOM`);
    }
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

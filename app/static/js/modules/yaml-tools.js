// YAML Tools Module - Functions for managing tools in YAML content
//=============================================================================

// Define el namespace para YAML tools
window.YAMLTools = {};

// Script de autocomprobación que se ejecuta cuando la página carga completamente
document.addEventListener('DOMContentLoaded', function() {
    
    // Verificar si estamos en una página que usa el editor YAML
    // Solo configurar los listeners si estamos en una página que realmente usa el editor
    const isAssistantEditorPage = document.querySelector('#editYamlModal') !== null || 
                                  document.querySelector('#tools-tab') !== null;
    
    if (!isAssistantEditorPage) {
        return;
    }
    
    // Listener para cuando el modal se muestre completamente
    const editYamlModal = document.getElementById('editYamlModal');
    if (editYamlModal) {
        editYamlModal.addEventListener('shown.bs.modal', function() {
            
            // Verificar que los elementos DOM existan
            const commandsList = document.getElementById('commandsList');
            const optionsList = document.getElementById('optionsList');
            const decoratorsList = document.getElementById('decoratorsList');
            
            // Si hay datos YAML cargados, recargar las herramientas
            if (window.yamlData) {
                window.YAMLTools.loadTools(window.yamlData);
            } else {
            }
        });
    }
    
    // También agregar un listener para la pestaña de herramientas
    const toolsTab = document.getElementById('tools-tab');
    if (toolsTab) {
        toolsTab.addEventListener('shown.bs.tab', function() {
            
            // Si hay datos YAML cargados, recargar las herramientas
            if (window.yamlData) {
                window.YAMLTools.loadTools(window.yamlData);
            } else {
            }
        });
    }
});

// Function to load tools from YAML data
window.YAMLTools.loadTools = function(data) {
    
    // Limpiar las listas existentes
    const commandsList = document.getElementById('commandsList');
    const optionsList = document.getElementById('optionsList');
    const decoratorsList = document.getElementById('decoratorsList');
    
    if (commandsList) commandsList.innerHTML = '';
    if (optionsList) optionsList.innerHTML = '';
    if (decoratorsList) decoratorsList.innerHTML = '';
    
    // Verificar que los datos existan
    if (!data) {
        return;
    }
    
    // Obtener el objeto de herramientas desde los datos
    let toolsObj = {
        commands: {},
        options: {},
        decorators: {}
    };
    
    // Intentar obtener herramientas desde diferentes estructuras de datos
    if (data.assistant_instructions && data.assistant_instructions.tools) {
        toolsObj = data.assistant_instructions.tools;
    } else if (data.tools) {
        toolsObj = data.tools;
    }
    
    // Variables para rastrear si se encontraron herramientas
    let hasCommands = false;
    let hasOptions = false;
    let hasDecorators = false;
    
    // Cargar comandos existentes
    if (Object.keys(toolsObj.commands).length > 0) {
        Object.entries(toolsObj.commands).forEach(([name, data]) => {
            hasCommands = true;
            let description = '';
            let displayName = name;
            let prompt = '';
            
            if (typeof data === 'object') {
                description = data.description || '';
                displayName = data.display_name || name;
                prompt = data.prompt || '';
            } else if (typeof data === 'string') {
                description = data;
            }
            
            window.YAMLTools.addToolItem(name, description, 'command', displayName, prompt);
        });
    }
    
    // Cargar opciones existentes
    if (Object.keys(toolsObj.options).length > 0) {
        Object.entries(toolsObj.options).forEach(([name, data]) => {
            hasOptions = true;
            let description = '';
            let displayName = name;
            let prompt = '';
            
            if (typeof data === 'object') {
                description = data.description || '';
                displayName = data.display_name || name;
                prompt = data.prompt || '';
            } else if (typeof data === 'string') {
                description = data;
            }
            
            window.YAMLTools.addToolItem(name, description, 'option', displayName, prompt);
        });
    }
    
    // Cargar decoradores existentes
    if (Object.keys(toolsObj.decorators).length > 0) {
        Object.entries(toolsObj.decorators).forEach(([name, data]) => {
            hasDecorators = true;
            let description = '';
            let displayName = name;
            let prompt = '';
            
            if (typeof data === 'object') {
                description = data.description || '';
                displayName = data.display_name || name;
                prompt = data.prompt || '';
            } else if (typeof data === 'string') {
                description = data;
            }
            
            window.YAMLTools.addToolItem(name, description, 'decorator', displayName, prompt);
        });
    }
    
    // Mostrar mensaje si no se encontraron herramientas
    if (!hasCommands && !hasOptions && !hasDecorators) {
    }
};

// Function to add a tool item to the list
window.YAMLTools.addToolItem = function(name, description, type, displayName, prompt) {
    
    // Determinar a qué lista agregar el elemento
    let targetList;
    if (type === 'command') {
        targetList = document.getElementById('commandsList');
    } else if (type === 'option') {
        targetList = document.getElementById('optionsList');
    } else if (type === 'decorator') {
        targetList = document.getElementById('decoratorsList');
    }
    
    if (!targetList) {
        return;
    }
    
    // Crear un contenedor para las dos filas (principal y prompt)
    const container = document.createElement('div');
    container.className = 'tool-container';
    container.setAttribute('data-name', name);
    
    // Crear la fila principal para los datos básicos
    const mainRow = document.createElement('tr');
    mainRow.className = 'tool-row';
    mainRow.setAttribute('data-name', name);
    
    // Determinar el prefijo según el tipo
    let displayPrefix = '';
    if (type === 'command' || type === 'option') {
        displayPrefix = '/';
    } else if (type === 'decorator') {
        displayPrefix = '+++';
    }
    
    // Crear celdas para la fila principal
    const nameCell = document.createElement('td');
    nameCell.textContent = displayPrefix + name;
    nameCell.className = 'tool-name';
    
    const displayNameCell = document.createElement('td');
    const displayNameInput = document.createElement('input');
    displayNameInput.type = 'text';
    displayNameInput.className = 'form-control';
    displayNameInput.value = displayName || name;
    displayNameInput.setAttribute('data-field', 'display_name');
    displayNameCell.appendChild(displayNameInput);
    
    const descriptionCell = document.createElement('td');
    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.className = 'form-control';
    descriptionInput.value = description || '';
    descriptionInput.setAttribute('data-field', 'description');
    descriptionCell.appendChild(descriptionInput);
    
    // Crear celda para el botón de borrar
    const deleteCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn-danger btn-sm';
    deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
    deleteButton.addEventListener('click', function() {
        if (confirm(`¿Estás seguro de eliminar ${type} "${name}"?`)) {
            // Eliminar la fila principal y la fila del prompt
            mainRow.remove();
            if (promptRow) promptRow.remove();
        }
    });
    deleteCell.appendChild(deleteButton);
    deleteCell.style.textAlign = 'center';
    
    // Agregar celdas a la fila principal
    mainRow.appendChild(nameCell);
    mainRow.appendChild(displayNameCell);
    mainRow.appendChild(descriptionCell);
    mainRow.appendChild(deleteCell);
    
    // Crear una segunda fila para el prompt
    const promptRow = document.createElement('tr');
    promptRow.className = 'tool-row prompt-row';
    
    // Crear celda para el prompt que ocupa todo el ancho
    const promptCell = document.createElement('td');
    promptCell.colSpan = 4; // Ocupar todas las columnas
    
    // Crear contenedor para el prompt
    const promptContainer = document.createElement('div');
    promptContainer.className = 'prompt-container';
    
    // Agregar etiqueta "Prompt"
    const promptLabel = document.createElement('label');
    promptLabel.textContent = 'Prompt';
    promptLabel.className = 'form-label';
    promptContainer.appendChild(promptLabel);
    
    // Crear textarea para el prompt
    const promptTextarea = document.createElement('textarea');
    promptTextarea.className = 'form-control';
    promptTextarea.value = prompt || '';
    promptTextarea.setAttribute('data-field', 'prompt');
    promptTextarea.rows = 3;
    promptContainer.appendChild(promptTextarea);
    
    promptCell.appendChild(promptContainer);
    promptRow.appendChild(promptCell);
    
    // Agregar ambas filas a la tabla
    targetList.appendChild(mainRow);
    targetList.appendChild(promptRow);
    
    // Agregar event listeners para actualizar los datos cuando cambian los inputs
    displayNameInput.addEventListener('input', function() {
        updateToolData(mainRow, type);
    });
    
    descriptionInput.addEventListener('input', function() {
        updateToolData(mainRow, type);
    });
    
    promptTextarea.addEventListener('input', function() {
        updateToolData(mainRow, type);
    });
    
    // Devolver referencia a la fila principal para posibles usos futuros
    return mainRow;
};

// Función para actualizar los datos de una herramienta cuando se modifican los campos
function updateToolData(row, type) {
    // Esta función se llamará cuando se modifiquen los campos de una herramienta
    // No necesitamos implementar la lógica completa aquí porque los datos se recogen
    // al guardar el formulario, pero podríamos usarla para actualizar el YAML en tiempo real
}

// Function to get tools data from the form
window.YAMLTools.getToolsData = function() {
    
    const toolsData = {
        commands: {},
        options: {},
        decorators: {}
    };
    
    // Recopilar comandos
    const commandsList = document.getElementById('commandsList');
    if (commandsList) {
        const commandRows = commandsList.querySelectorAll('tr');
        commandRows.forEach(row => {
            const commandName = row.dataset.name;
            if (commandName) {
                // Obtener los campos de input para este comando
                const displayNameInput = row.querySelector('input[data-field="display_name"]');
                const descriptionInput = row.querySelector('input[data-field="description"]');
                const promptInput = row.querySelector('textarea[data-field="prompt"]');
                
                // Crear objeto para el comando
                toolsData.commands['/' + commandName] = {
                    display_name: displayNameInput ? displayNameInput.value : commandName,
                    description: descriptionInput ? descriptionInput.value : '',
                    prompt: promptInput ? promptInput.value : ''
                };
            }
        });
    }
    
    // Recopilar opciones
    const optionsList = document.getElementById('optionsList');
    if (optionsList) {
        const optionRows = optionsList.querySelectorAll('tr');
        optionRows.forEach(row => {
            const optionName = row.dataset.name;
            if (optionName) {
                // Obtener los campos de input para esta opción
                const displayNameInput = row.querySelector('input[data-field="display_name"]');
                const descriptionInput = row.querySelector('input[data-field="description"]');
                const promptInput = row.querySelector('textarea[data-field="prompt"]');
                
                // Crear objeto para la opción
                toolsData.options['/' + optionName] = {
                    display_name: displayNameInput ? displayNameInput.value : optionName,
                    description: descriptionInput ? descriptionInput.value : '',
                    prompt: promptInput ? promptInput.value : ''
                };
            }
        });
    }
    
    // Recopilar decoradores
    const decoratorsList = document.getElementById('decoratorsList');
    if (decoratorsList) {
        const decoratorRows = decoratorsList.querySelectorAll('tr');
        decoratorRows.forEach(row => {
            const decoratorName = row.dataset.name;
            if (decoratorName) {
                // Obtener los campos de input para este decorador
                const displayNameInput = row.querySelector('input[data-field="display_name"]');
                const descriptionInput = row.querySelector('input[data-field="description"]');
                const promptInput = row.querySelector('textarea[data-field="prompt"]');
                
                // Crear objeto para el decorador
                toolsData.decorators['+++' + decoratorName] = {
                    display_name: displayNameInput ? displayNameInput.value : decoratorName,
                    description: descriptionInput ? descriptionInput.value : '',
                    prompt: promptInput ? promptInput.value : ''
                };
            }
        });
    }
    
    return toolsData;
};

// Export module for compatibility with ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.YAMLTools;
}

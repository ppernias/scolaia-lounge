// YAML Assistant Editor - Main file that coordinates all modules
//=============================================================================

// Global variables
window.originalYaml = null;
window.yamlData = null;

// Initialize the editor when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs if they exist
    if (typeof initializeYamlEditorTabs === 'function') {
        initializeYamlEditorTabs();
    } else if (window.YAMLEditor && typeof window.YAMLEditor.initializeYamlEditorTabs === 'function') {
        window.YAMLEditor.initializeYamlEditorTabs();
    }
    
    // Add event listeners for the editor modal
    const editYamlModal = document.getElementById('editYamlModal');
    if (editYamlModal) {
        // Add event listener for character count updates when typing in the editor
        const yamlEditor = document.getElementById('yamlEditor');
        if (yamlEditor) {
            yamlEditor.addEventListener('input', function() {
                if (typeof updateCharCount === 'function') {
                    updateCharCount();
                } else if (window.YAMLUtils && typeof window.YAMLUtils.updateCharCount === 'function') {
                    window.YAMLUtils.updateCharCount();
                }
            });
        }
        
        // Add event listener for save button
        const saveButton = editYamlModal.querySelector('.btn-primary');
        if (saveButton) {
            saveButton.addEventListener('click', function() {
                if (typeof saveYamlChanges === 'function') {
                    saveYamlChanges(false); // Pasar explicitamente false para indicar que no debe finalizar
                } else if (window.YAMLEditor && typeof window.YAMLEditor.saveYamlChanges === 'function') {
                    window.YAMLEditor.saveYamlChanges(false); // Pasar explicitamente false para indicar que no debe finalizar
                }
            });
        }
        
        // Add event listener for finish button
        const finishButton = document.getElementById('finishYamlBtn');
        if (finishButton) {
            finishButton.addEventListener('click', function() {
                console.log('Finish button clicked');
                if (typeof saveYamlChanges === 'function') {
                    saveYamlChanges(true); // Pasar explicitamente true para indicar que debe finalizar
                } else if (window.YAMLEditor && typeof window.YAMLEditor.saveYamlChanges === 'function') {
                    window.YAMLEditor.saveYamlChanges(true); // Pasar explicitamente true para indicar que debe finalizar
                }
            });
        }
        
        // Add event listener for minor changes checkbox
        const minorChangesCheckbox = document.getElementById('minorChanges');
        const createNewVersionCheckbox = document.getElementById('createNewVersion');
        if (minorChangesCheckbox && createNewVersionCheckbox) {
            minorChangesCheckbox.addEventListener('change', function() {
                createNewVersionCheckbox.disabled = this.checked;
                if (this.checked) {
                    createNewVersionCheckbox.checked = false;
                }
            });
        }
        
        // Listener para cuando el modal de edición YAML se muestre
        editYamlModal.addEventListener('shown.bs.modal', function() {
            // Configurar event listeners para los botones de agregar herramientas
            const addToolButtons = document.querySelectorAll('.add-tool-item');
            addToolButtons.forEach(button => {
                // Remover listeners previos para evitar duplicados
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Agregar nuevo listener
                newButton.addEventListener('click', function() {
                    const type = this.getAttribute('data-type');
                    let inputId = '';
                    
                    // Determinar el ID del input según el tipo de herramienta
                    switch(type) {
                        case 'command':
                            inputId = 'newCommand';
                            break;
                        case 'option':
                            inputId = 'newOption';
                            break;
                        case 'decorator':
                            inputId = 'newDecorator';
                            break;
                    }
                    
                    // Obtener el valor del input
                    const input = document.getElementById(inputId);
                    if (input && input.value.trim() !== '') {
                        // Agregar la herramienta usando el módulo YAMLTools
                        if (window.YAMLTools && typeof window.YAMLTools.addToolItem === 'function') {
                            window.YAMLTools.addToolItem(
                                input.value.trim(),
                                '',  // description
                                type,
                                input.value.trim(),  // displayName
                                ''   // prompt
                            );
                            
                            // Limpiar el input
                            input.value = '';
                        } else {
                            alert('Error: No se pudo agregar la herramienta. La función YAMLTools.addToolItem no está disponible.');
                        }
                    }
                });
            });
        });
    }
});

// Expose global functions for HTML onclick attributes
window.showYamlContent = function(assistantId) {
    // Llamar directamente a la función del módulo para evitar recursión
    if (window.YAMLViewer && typeof window.YAMLViewer.showYamlContent === 'function') {
        window.YAMLViewer.showYamlContent(assistantId);
    }
};

window.editYamlContent = function(assistantId) {
    // Llamar directamente a la función del módulo para evitar recursión
    if (window.YAMLEditor && typeof window.YAMLEditor.editYamlContent === 'function') {
        window.YAMLEditor.editYamlContent(assistantId);
    }
};

window.saveYamlChanges = function(shouldFinish = false) {
    // Llamar directamente a la función del módulo para evitar recursión
    if (window.YAMLEditor && typeof window.YAMLEditor.saveYamlChanges === 'function') {
        window.YAMLEditor.saveYamlChanges(shouldFinish);
    }
};

window.addToolItem = function(name, description, type) {
    // Llamar directamente a la función del módulo para evitar recursión
    if (window.YAMLTools && typeof window.YAMLTools.addToolItem === 'function') {
        window.YAMLTools.addToolItem(name, description, type);
    }
};

// Function to create a new assistant
window.createNewAssistant = function() {
    // Limpiar el editor
    const yamlEditor = document.getElementById('yamlEditor');
    if (yamlEditor) {
        yamlEditor.value = '';
    }
    
    // Establecer modo de creación
    const editorModeInput = document.getElementById('editorMode');
    if (editorModeInput) {
        editorModeInput.value = 'create';
    }
    
    // Limpiar ID de asistente actual
    const currentAssistantIdInput = document.getElementById('currentAssistantId');
    if (currentAssistantIdInput) {
        currentAssistantIdInput.value = '';
    }
    
    // Asegurar que el checkbox de cambios menores esté marcado por defecto
    const minorChangesCheckbox = document.getElementById('minorChanges');
    if (minorChangesCheckbox) {
        minorChangesCheckbox.checked = true;
    }
    
    // Inicializar estado del checkbox de nueva versión
    const newVersionCheckbox = document.getElementById('createNewVersion');
    if (newVersionCheckbox) {
        newVersionCheckbox.checked = false;
        newVersionCheckbox.disabled = true;
    }
    
    // Limpiar todas las listas
    if (typeof clearAllLists === 'function') {
        clearAllLists();
    } else if (window.YAMLUtils && typeof window.YAMLUtils.clearAllLists === 'function') {
        window.YAMLUtils.clearAllLists();
    }
    
    // Abrir el modal
    const modalElement = document.getElementById('editYamlModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Inicializar las pestañas
        if (typeof initializeYamlEditorTabs === 'function') {
            initializeYamlEditorTabs();
        } else if (window.YAMLEditor && typeof window.YAMLEditor.initializeYamlEditorTabs === 'function') {
            window.YAMLEditor.initializeYamlEditorTabs();
        }
        
        // Activar la pestaña de metadatos primero
        const metadataTab = document.getElementById('metadata-tab');
        if (metadataTab) {
            const tab = new bootstrap.Tab(metadataTab);
            tab.show();
        }
    }
};

// Función para cargar herramientas predeterminadas directamente
function loadDefaultTools() {
    const commandsList = document.getElementById('commandsList');
    const optionsList = document.getElementById('optionsList');
    const decoratorsList = document.getElementById('decoratorsList');
    
    if (!commandsList || !optionsList || !decoratorsList) {
        return false;
    }
    
    // Realizar una solicitud para obtener el schema.yaml
    fetch('/assistants/api/schema')
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo cargar el esquema');
            }
            return response.json();
        })
        .then(schemaData => {
            // Limpiar las tablas existentes
            commandsList.innerHTML = '';
            optionsList.innerHTML = '';
            decoratorsList.innerHTML = '';
            
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
                
                // Procesar commands si existen
                if (commandsSchema && commandsSchema.additionalProperties) {
                    const defaultCommandName = commandsSchema.default || '';
                    
                    // Si hay un comando predeterminado, extraer sus propiedades
                    if (defaultCommandName && defaultCommandName.startsWith('/')) {
                        const commandName = defaultCommandName.substring(1); // Quitar el '/' inicial
                        const displayName = commandsSchema.additionalProperties.properties?.display_name?.default || commandName;
                        const description = commandsSchema.additionalProperties.properties?.description?.default || '';
                        const prompt = commandsSchema.additionalProperties.properties?.prompt?.default || '';
                        
                        if (window.YAMLTools && typeof window.YAMLTools.addToolItem === 'function') {
                            window.YAMLTools.addToolItem(
                                commandName,
                                description,
                                'command',
                                displayName,
                                prompt
                            );
                        }
                    }
                }
                
                // Procesar options si existen
                if (optionsSchema && optionsSchema.additionalProperties) {
                    const defaultOptionName = optionsSchema.default || '';
                    
                    // Si hay una opción predeterminada, extraer sus propiedades
                    if (defaultOptionName && defaultOptionName.startsWith('/')) {
                        const optionName = defaultOptionName.substring(1); // Quitar el '/' inicial
                        const displayName = optionsSchema.additionalProperties.properties?.display_name?.default || optionName;
                        const description = optionsSchema.additionalProperties.properties?.description?.default || '';
                        const prompt = optionsSchema.additionalProperties.properties?.prompt?.default || '';
                        
                        if (window.YAMLTools && typeof window.YAMLTools.addToolItem === 'function') {
                            window.YAMLTools.addToolItem(
                                optionName,
                                description,
                                'option',
                                displayName,
                                prompt
                            );
                        }
                    }
                }
                
                // Procesar decorators si existen
                if (decoratorsSchema && decoratorsSchema.additionalProperties) {
                    const defaultDecoratorName = decoratorsSchema.default || '';
                    
                    // Si hay un decorador predeterminado, extraer sus propiedades
                    if (defaultDecoratorName && defaultDecoratorName.startsWith('+++')) {
                        const decoratorName = defaultDecoratorName.substring(3); // Quitar los '+++' iniciales
                        const displayName = decoratorsSchema.additionalProperties.properties?.display_name?.default || decoratorName;
                        const description = decoratorsSchema.additionalProperties.properties?.description?.default || '';
                        const prompt = decoratorsSchema.additionalProperties.properties?.prompt?.default || '';
                        
                        if (window.YAMLTools && typeof window.YAMLTools.addToolItem === 'function') {
                            window.YAMLTools.addToolItem(
                                decoratorName,
                                description,
                                'decorator',
                                displayName,
                                prompt
                            );
                        }
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

// Modificar el listener del modal para llamar a la función de carga directa
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en una página que usa el editor YAML
    const isAssistantEditorPage = document.querySelector('#editYamlModal') !== null || 
                                  document.querySelector('#tools-tab') !== null;
    
    if (!isAssistantEditorPage) {
        return;
    }
    
    const editYamlModal = document.getElementById('editYamlModal');
    if (editYamlModal) {
        // Cuando el modal se muestra completamente
        editYamlModal.addEventListener('shown.bs.modal', function() {
            // Esperar un momento para asegurar que el DOM esté listo
            setTimeout(function() {
                loadDefaultTools();
            }, 200);
        });
    }
    
    // También agregar un listener para la pestaña de herramientas
    const toolsTab = document.getElementById('tools-tab');
    if (toolsTab) {
        toolsTab.addEventListener('shown.bs.tab', function() {
            // Cargar herramientas predeterminadas directamente
            setTimeout(function() {
                loadDefaultTools();
            }, 200);
        });
    }
});

// Export all functions for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Re-export all module functions
        ...window.YAMLViewer,
        ...window.YAMLEditor,
        ...window.YAMLTools,
        ...window.YAMLUtils
    };
}

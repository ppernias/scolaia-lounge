// YAML Validator Module - Validates YAML data against schema requirements
//=============================================================================

/**
 * Validates that all required fields according to schema.yaml are present in the data
 * @param {Object} data - The data object to validate
 * @returns {Object} - Object with isValid flag and array of missing fields
 */
function validateRequiredFields(data) {
    console.log('YAML-VALIDATOR.JS: Validating required fields');
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
        }
    }
    
    console.info('YAML-VALIDATOR.JS: Validation result:', {
        isValid: missingFields.length === 0,
        missingFields: missingFields
    });
    
    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields
    };
}

/**
 * Displays validation errors in a user-friendly way
 * @param {Array} missingFields - Array of missing field paths
 */
function displayValidationErrors(missingFields) {
    if (!missingFields || missingFields.length === 0) return;
    
    console.log('YAML-VALIDATOR.JS: Displaying validation errors');
    
    // Crear mensaje de error
    let errorMessage = '<strong>Missing required fields:</strong><br><ul>';
    missingFields.forEach(field => {
        errorMessage += `<li>${field}</li>`;
    });
    errorMessage += '</ul>';
    
    // Mostrar mensaje de error
    if (window.toast) {
        window.toast.error(errorMessage, { timeOut: 10000, extendedTimeOut: 5000 });
    } else {
        alert('Missing required fields. Please complete all required fields.');
    }
}

// Export the functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        validateRequiredFields,
        displayValidationErrors
    };
} else {
    // Make functions available globally when included via script tag
    window.YAMLValidator = { 
        validateRequiredFields,
        displayValidationErrors
    };
}

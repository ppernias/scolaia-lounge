// Función para alternar la visibilidad del resumen completo
function toggleSummary(buttonElement) {
    const summaryContainer = buttonElement.closest('.summary-container');
    if (!summaryContainer) {
        console.error('No se encontró el contenedor del resumen');
        return;
    }

    const shortSummary = summaryContainer.querySelector('.summary-short');
    const fullSummary = summaryContainer.querySelector('.summary-full');
    
    if (!shortSummary || !fullSummary) {
        console.error('No se encontraron los elementos del resumen');
        return;
    }

    const isExpanded = shortSummary.style.display === 'none';
    
    shortSummary.style.display = isExpanded ? 'block' : 'none';
    fullSummary.style.display = isExpanded ? 'none' : 'block';
    buttonElement.innerHTML = isExpanded ? 
        '<i class="bi bi-chevron-down"></i> More' : 
        '<i class="bi bi-chevron-up"></i> Less';
}

// Modal de detalles del asistente
async function showAssistantDetails(assistantId) {
    try {
        const response = await fetch(`/explore/assistant/${assistantId}/details`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        // Función auxiliar para actualizar elementos de forma segura
        const safeSetText = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value || '';
            }
        };

        const safeSetHTML = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = value || '';
            }
        };
        
        // Actualizar el contenido del modal de forma segura
        safeSetText('modalTitle', data.title);
        safeSetText('modalSummary', data.summary);
        safeSetText('modalCoverage', data.coverage);
        
        // Información del autor
        safeSetText('modalAuthorName', data.author?.name || '');
        safeSetText('modalAuthorRole', data.author?.role || '');
        safeSetText('modalAuthorOrg', data.author?.organization || '');
        
        // Keywords
        const keywordsContainer = document.getElementById('modalKeywords');
        if (keywordsContainer) {
            keywordsContainer.innerHTML = (data.keywords || [])
                .map(keyword => `<span class="badge bg-secondary">${keyword}</span>`)
                .join(' ');
        }
        
        // Use Cases
        const useCasesContainer = document.getElementById('modalUseCases');
        if (useCasesContainer) {
            useCasesContainer.innerHTML = (data.use_cases || [])
                .map(useCase => `<li>• ${useCase}</li>`)
                .join('');
        }

        // History
        const historyContainer = document.getElementById('modalHistory');
        if (historyContainer) {
            historyContainer.innerHTML = (data.history || [])
                .map(item => `<li>• ${item}</li>`)
                .join('');
        }
        
        // Educational Levels
        const educationalLevelsContainer = document.getElementById('modalEducationalLevels');
        if (educationalLevelsContainer) {
            educationalLevelsContainer.innerHTML = (data.educational_levels || [])
                .map(level => `<li>• ${level}</li>`)
                .join('');
        }
        
        // Tools
        const toolsContainer = document.getElementById('modalTools');
        if (toolsContainer) {
            toolsContainer.innerHTML = (data.tools || [])
                .map(tool => `<li>• ${tool}</li>`)
                .join('');
        }

        // Metadata
        safeSetText('modalCreationDate', new Date(data.created_at).toLocaleDateString());
        safeSetText('modalLastUpdate', new Date(data.updated_at).toLocaleDateString());
        safeSetText('modalRights', data.metadata?.rights || 'Not specified');

        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('assistantDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error loading assistant details');
    }
}

async function addAssistantToCollection(assistantId, currentUserId) {
    try {
        // Check if the user is trying to add their own assistant
        const addButton = document.querySelector(`[data-assistant-id="${assistantId}"]`);
        const authorId = addButton.getAttribute('data-author-id');
        
        if (authorId === currentUserId) {
            showNotification("You cannot add your own assistant to your collection", "error");
            return;
        }

        const response = await fetch(`/explore/assistant/${assistantId}/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to add assistant to collection');
        }

        // Update all instances of this assistant's collection counter in the page
        const addButtons = document.querySelectorAll(`[data-assistant-id="${assistantId}"]`);
        addButtons.forEach(button => {
            const card = button.closest('.card');
            const collectionsCounter = card.querySelector('.counter-icon i.bi-bookmark-star').closest('.counter-icon');
            
            if (collectionsCounter) {
                collectionsCounter.innerHTML = `
                    <i class="bi bi-bookmark-star"></i>
                    <span>${data.in_collections}</span>
                `;
            }
        });

        showNotification(data.message || "Assistant added to your collection! You can find it in 'My Collection'", 'success', 5000);
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
}

async function likeAssistant(assistantId) {
    try {
        const response = await fetch(`/explore/like/${assistantId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update like status');
        }
        
        // Update all instances of this assistant's like counter in the page
        const likeButtons = document.querySelectorAll(`[data-assistant-id="${assistantId}"]`);
        likeButtons.forEach(button => {
            const card = button.closest('.card');
            const likesCounter = card.querySelector('.counter-icon i.bi-heart-fill').closest('.counter-icon');
            
            if (likesCounter) {
                likesCounter.innerHTML = `
                    <i class="bi bi-heart-fill heart-icon"></i>
                    <span>${data.likes}</span>
                `;
            }
        });

        // Show success message
        const message = data.action === 'added' ? 'Like added successfully!' : 'Like removed successfully!';
        showNotification(message, 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
}

async function cloneAssistant(assistantId) {
    try {
        const response = await fetch(`/assistants/${assistantId}/clone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        showToast('success', 'Assistant cloned successfully! You can find it in My Assistants.');
        
        // Recargar la página para mostrar el nuevo asistente
        setTimeout(() => {
            window.location.reload();
        }, 3500); // Aumentado de 1500ms a 3500ms para que el mensaje sea más visible
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Error cloning assistant');
    }
}

function scrollSection(button, direction) {
    const scrollArea = button.parentElement.querySelector('.scroll-area');
    const scrollAmount = scrollArea.clientWidth * 0.8; // Scroll 80% del ancho visible
    scrollArea.scrollBy({
        left: scrollAmount * direction,
        behavior: 'smooth'
    });
}

function clearSearch() {
    const searchInput = document.querySelector('input[name="search"]');
    searchInput.value = '';
    document.getElementById('searchForm').submit();
}

// Function to reclassify assistants based on selected field
function reclassifyAssistants() {
    const classificationField = document.getElementById('classificationField').value;
    const assistantsContainer = document.getElementById('assistantsContainer');
    const assistantCards = document.querySelectorAll('.col-md-6.col-lg-4');
    
    // Get all assistants data
    const assistants = Array.from(assistantCards).map(card => {
        const assistant = {
            element: card,
            id: card.querySelector('[data-assistant-id]')?.dataset.assistantId,
            educational_levels: Array.from(card.querySelectorAll('[data-educational-level]')).map(el => el.dataset.educationalLevel),
            coverage: card.querySelector('[data-coverage]')?.dataset.coverage || 'Unspecified',
            organization: card.querySelector('[data-organization]')?.textContent.trim() || 'Unspecified',
            author: card.querySelector('[data-author]')?.textContent.trim() || 'Unknown'
        };
        return assistant;
    });

    // Group assistants by selected field
    const groups = new Map();
    
    assistants.forEach(assistant => {
        let key;
        switch(classificationField) {
            case 'educational_level':
                assistant.educational_levels.forEach(level => {
                    const normalizedLevel = level.toLowerCase();
                    if (!groups.has(normalizedLevel)) {
                        groups.set(normalizedLevel, {
                            displayName: level,
                            assistants: new Map() // Use Map to ensure unique assistants by ID
                        });
                    }
                    // Only add if not already in this category
                    if (!groups.get(normalizedLevel).assistants.has(assistant.id)) {
                        groups.get(normalizedLevel).assistants.set(assistant.id, {
                            ...assistant,
                            multipleCategories: assistant.educational_levels.length > 1
                        });
                    }
                });
                break;
            case 'coverage':
                key = assistant.coverage.toLowerCase();
                if (!groups.has(key)) {
                    groups.set(key, {
                        displayName: assistant.coverage,
                        assistants: new Map()
                    });
                }
                if (!groups.get(key).assistants.has(assistant.id)) {
                    groups.get(key).assistants.set(assistant.id, assistant);
                }
                break;
            case 'organization':
                key = assistant.organization.toLowerCase();
                if (!groups.has(key)) {
                    groups.set(key, {
                        displayName: assistant.organization,
                        assistants: new Map()
                    });
                }
                if (!groups.get(key).assistants.has(assistant.id)) {
                    groups.get(key).assistants.set(assistant.id, assistant);
                }
                break;
            case 'author':
                key = assistant.author.toLowerCase();
                if (!groups.has(key)) {
                    groups.set(key, {
                        displayName: assistant.author,
                        assistants: new Map()
                    });
                }
                if (!groups.get(key).assistants.has(assistant.id)) {
                    groups.get(key).assistants.set(assistant.id, assistant);
                }
                break;
        }
    });

    // Clear current container
    assistantsContainer.innerHTML = '';

    // Create new sections for each group
    for (const [_, groupData] of groups) {
        const section = document.createElement('div');
        section.className = 'mb-4';
        section.innerHTML = `
            <h3 class="mb-3 font-audiowide text-titles fs-2">${groupData.displayName}</h3>
            <div class="scroll-container position-relative">
                <button class="scroll-button scroll-left" onclick="scrollSection(this, -1)">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="row flex-nowrap overflow-auto pb-3 scroll-area">
                </div>
                <button class="scroll-button scroll-right" onclick="scrollSection(this, 1)">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;

        const scrollArea = section.querySelector('.scroll-area');
        // Convert Map values to array before iterating
        Array.from(groupData.assistants.values()).forEach(assistant => {
            const clonedElement = assistant.element.cloneNode(true);
            
            // Add visual indicator for assistants in multiple categories
            if (classificationField === 'educational_level' && assistant.multipleCategories) {
                const cardBody = clonedElement.querySelector('.card-body');
                const badge = document.createElement('div');
                badge.className = 'position-absolute top-0 start-0 p-2';
                badge.innerHTML = '<span class="badge bg-info">Multi-level</span>';
                cardBody.appendChild(badge);
            }
            
            scrollArea.appendChild(clonedElement);
        });

        assistantsContainer.appendChild(section);
    }

    // Reinitialize scroll buttons
    initializeScrollButtons();
}

// Initialize scroll buttons functionality
function initializeScrollButtons() {
    const scrollAreas = document.querySelectorAll('.scroll-area');
    
    scrollAreas.forEach(area => {
        area.addEventListener('scroll', function() {
            const container = this.parentElement;
            const leftButton = container.querySelector('.scroll-left');
            const rightButton = container.querySelector('.scroll-right');
            
            // Show/hide left button
            if (this.scrollLeft <= 0) {
                leftButton.style.opacity = '0.3';
                leftButton.style.pointerEvents = 'none';
            } else {
                leftButton.style.opacity = '0.8';
                leftButton.style.pointerEvents = 'auto';
            }
            
            // Show/hide right button
            if (this.scrollLeft >= (this.scrollWidth - this.clientWidth)) {
                rightButton.style.opacity = '0.3';
                rightButton.style.pointerEvents = 'none';
            } else {
                rightButton.style.opacity = '0.8';
                rightButton.style.pointerEvents = 'auto';
            }
        });
        
        // Initial trigger to set up buttons
        area.dispatchEvent(new Event('scroll'));
    });
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add classification field change listener
    const classificationField = document.getElementById('classificationField');
    if (classificationField) {
        classificationField.addEventListener('change', reclassifyAssistants);
    }
    
    // Initialize scroll buttons
    initializeScrollButtons();
});
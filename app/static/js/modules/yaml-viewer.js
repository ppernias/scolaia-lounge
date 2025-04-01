// YAML Viewer Module - Functions for viewing YAML content
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

// Export the functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showYamlContent };
} else {
    // Make functions available globally when included via script tag
    window.YAMLViewer = { showYamlContent };
}

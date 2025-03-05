/**
 * Unified Toast Notification System
 * A modern, flexible notification system that combines the best of both worlds
 */
class ToastSystem {
    constructor(options = {}) {
        this.options = {
            position: options.position || 'top-right',
            duration: options.duration || 3000,
            containerID: 'toastContainer',
            animation: true,
            maxToasts: options.maxToasts || 3,
            ...options
        };
        this.initialize();
    }

    initialize() {
        let container = document.getElementById(this.options.containerID);
        if (!container) {
            container = document.createElement('div');
            container.id = this.options.containerID;
            this.setPosition(container);
            document.body.appendChild(container);
        }
    }

    setPosition(container) {
        const positions = {
            'top-right': 'top: 20px; right: 20px;',
            'top-left': 'top: 20px; left: 20px;',
            'bottom-right': 'bottom: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;'
        };
        container.style.cssText = `
            position: fixed;
            z-index: 9999;
            pointer-events: none;
            ${positions[this.options.position] || positions['top-right']}
        `;
    }

    show(message, type = 'info') {
        const container = document.getElementById(this.options.containerID);
        this.limitToasts(container);

        const toast = this.createToastElement(message, type);
        container.appendChild(toast);

        // Enable pointer events for this specific toast
        toast.style.pointerEvents = 'auto';

        // Show animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto dismiss
        if (this.options.duration) {
            setTimeout(() => this.dismiss(toast), this.options.duration);
        }

        return toast;
    }

    createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        const icons = {
            success: 'bi-check-circle',
            error: 'bi-x-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <i class="bi ${icons[type] || icons.info}"></i>
                <span class="toast-message">${message}</span>
                <button class="toast-close" aria-label="Close">×</button>
            </div>
        `;

        // Add close button listener
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismiss(toast);
        });

        return toast;
    }

    dismiss(toast) {
        toast.classList.remove('show');
        toast.classList.add('hiding');
        
        // Remove after animation
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    limitToasts(container) {
        const toasts = container.getElementsByClassName('toast-notification');
        while (toasts.length >= this.options.maxToasts) {
            container.removeChild(toasts[0]);
        }
    }

    // Convenience methods
    success(message) { return this.show(message, 'success'); }
    error(message) { return this.show(message, 'error'); }
    warning(message) { return this.show(message, 'warning'); }
    info(message) { return this.show(message, 'info'); }
}

// Create global instance with default settings
const toast = new ToastSystem({
    position: 'top-right',
    duration: 3000,
    maxToasts: 3
});

// Export both the class and the default instance
window.ToastSystem = ToastSystem;
window.toast = toast;

// Backwards compatibility functions
window.showToast = (type, message) => toast.show(message, type);
window.showNotification = (message, type = 'error') => toast.show(message, type);

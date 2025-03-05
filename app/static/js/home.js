document.addEventListener('DOMContentLoaded', function() {
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function() {
            // Comprobamos si el usuario está logueado usando la variable global userIsAuthenticated
            if (typeof userIsAuthenticated !== 'undefined' && userIsAuthenticated) {
                window.location.href = '/assistants';
            } else {
                window.location.href = '/auth/register';
            }
        });
    }
});

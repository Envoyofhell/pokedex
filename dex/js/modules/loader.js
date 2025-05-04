/**
 * @file        dex/js/modules/loader.js
 * @description Simple loader utility to ensure proper styling
 * @version     1.0.0
 */

window.DexApp = window.DexApp || {};
window.DexApp.Loader = {
    showLoader: function(element) {
        if (element) element.classList.remove('hidden');
    },
    
    hideLoader: function(element) {
        if (element) element.classList.add('hidden');
    },
    
    // Forces a reapplication of CSS variables to elements
    refreshStyles: function() {
        // Force reflow to ensure CSS variables apply
        document.body.style.display = 'none';
        document.body.offsetHeight; // This triggers a reflow
        document.body.style.display = '';
        
        // Apply styling to all grid cards
        const cards = document.querySelectorAll('.pokedex-grid-card');
        cards.forEach(card => this.applyCardStyles(card));
    },
    
    // Apply proper styling to an individual card
    applyCardStyles: function(card) {
        const types = Array.from(card.querySelectorAll('.pokemon-card-type'))
            .map(badge => badge.classList[1]?.replace('type-', '') || null)
            .filter(type => type);
            
        if (types.length > 0) {
            const typeName1 = types[0];
            const primaryTypeColor = `var(--type-${typeName1}, var(--color-accent))`;
            const color1 = `var(--type-${typeName1}, var(--color-secondary))`;
            const color2 = types.length > 1 
                ? `var(--type-${types[1]}, var(--color-primary))` 
                : `var(--type-${typeName1}-light, var(--color-primary))`;
            
            card.style.setProperty('--card-gradient-color-1', color1);
            card.style.setProperty('--card-gradient-color-2', color2);
            card.style.setProperty('--dynamic-type-color', primaryTypeColor);
            card.style.setProperty('--breathe-glow-color', primaryTypeColor);
        }
    },
    
    // Show the main app (transition from loading to content)
    showApp: function() {
        const initialLoadingOverlay = document.getElementById('initial-loading-overlay');
        const appContainer = document.getElementById('app-container');
        
        if (initialLoadingOverlay) {
            initialLoadingOverlay.classList.add('loaded');
            
            // Remove after transition
            initialLoadingOverlay.addEventListener('transitionend', () => {
                if (initialLoadingOverlay.parentNode) {
                    initialLoadingOverlay.remove();
                }
            }, { once: true });
            
            // Fallback timeout
            setTimeout(() => {
                if (initialLoadingOverlay.parentNode) {
                    initialLoadingOverlay.remove();
                }
            }, 1000);
        }
        
        if (appContainer) {
            appContainer.classList.remove('hidden');
            // Force a style refresh after app is visible
            setTimeout(() => this.refreshStyles(), 200);
        }
    }
};

// Add a final refresh when window loads
window.addEventListener('load', () => {
    // Final style refresh after everything is loaded
    setTimeout(() => {
        window.DexApp.Loader.refreshStyles();
    }, 500);
});

console.log("Loader utility loaded");
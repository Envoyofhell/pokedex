// dex/js/app.js
// Main entry point for the Pokédex application

// Ensure DexApp namespace exists
window.DexApp = window.DexApp || {};
window.DexApp.App = {};

// --- Main Initialization ---
window.DexApp.App.initialize = function() {
    console.log("Initializing Pokedex App...");
    
    // Setup main search functionality
    this.setupSearch();
    
    // Initialize all modules
    this.initializeModules().then(() => {
        console.log("All modules initialized.");
        
        // Load initial Pokémon grid
        this.loadInitialGrid();
        
        // Hide loading overlay and show the app
        this.showApp();
        
        console.log("Pokedex App Initialized and Ready!");
    }).catch(error => {
        console.error("Error initializing app:", error);
        
        // Still hide the loading overlay even if there's an error
        this.showApp();
        
        // Show an error message
        this.showInitializationError();
    });
};

// --- Module Initialization ---
window.DexApp.App.initializeModules = async function() {
    try {
        const moduleInitPromises = [];
        
        // Initialize modules in the correct order
        // Each module should have an initialize method
        
        // 1. First, initialize utility and API modules
        if (window.DexApp.Utils) {
            console.log("Utils module loaded.");
        } else {
            console.error("Utils module not found!");
        }
        
        if (window.DexApp.API) {
            console.log("API module loaded.");
        } else {
            console.error("API module not found!");
        }
        
        // 2. Initialize Lightbox module (needed by others)
        if (window.DexApp.Lightbox && typeof window.DexApp.Lightbox.initialize === 'function') {
            window.DexApp.Lightbox.initialize();
            console.log("Lightbox module initialized.");
        } else {
            console.warn("Lightbox module not found or no initialize method.");
        }
        
        // 3. Initialize Grid Module
        if (window.DexApp.DexGrid && typeof window.DexApp.DexGrid.initialize === 'function') {
            window.DexApp.DexGrid.initialize();
            console.log("Grid module initialized.");
        } else {
            console.warn("Grid module not found or no initialize method.");
        }
        
        // 4. Initialize Detail View Module
        if (window.DexApp.DetailView && typeof window.DexApp.DetailView.initialize === 'function') {
            window.DexApp.DetailView.initialize();
            console.log("Detail View module initialized.");
        } else {
            console.warn("Detail View module not found or no initialize method.");
        }
        
        // 5. Initialize TCG Module
        if (window.DexApp.TCG && typeof window.DexApp.TCG.initialize === 'function') {
            window.DexApp.TCG.initialize();
            console.log("TCG module initialized.");
        } else {
            console.warn("TCG module not found or no initialize method.");
        }
        
        // 6. Initialize Generator Module (if available)
        if (window.DexApp.Generator && typeof window.DexApp.Generator.initialize === 'function') {
            window.DexApp.Generator.initialize();
            console.log("Generator module initialized.");
        } else {
            console.warn("Generator module not found or no initialize method.");
        }
        
        // 7. Fetch TCG sets for dropdown (can happen in the background)
        if (window.DexApp.API && typeof window.DexApp.API.fetchTcgSets === 'function') {
            window.DexApp.API.fetchTcgSets().catch(e => 
                console.warn('Failed to fetch TCG sets:', e)
            );
        }
        
        // Wait for all initialization promises to resolve
        if (moduleInitPromises.length > 0) {
            await Promise.all(moduleInitPromises);
        }
        
        return true;
    } catch (error) {
        console.error("Error during module initialization:", error);
        throw error;
    }
};

// --- Initial Grid Loading ---
window.DexApp.App.loadInitialGrid = async function() {
    try {
        const dexGridLoader = document.getElementById('dex-grid-loader');
        if (dexGridLoader) dexGridLoader.classList.remove('hidden');
        
        // Get the current generation from the grid module
        const currentGeneration = window.DexApp.DexGrid?.state?.currentGeneration || 1;
        
        // Fetch the Pokémon list and display the grid
        const initialList = await window.DexApp.API.fetchGenerationList(currentGeneration);
        
        if (window.DexApp.DexGrid && typeof window.DexApp.DexGrid.displayDexGrid === 'function') {
            await window.DexApp.DexGrid.displayDexGrid(initialList);
        } else {
            console.error("Grid display function not found!");
        }
    } catch (error) {
        console.error("Error loading initial grid:", error);
        // Show error in the grid
        const gridContainer = document.getElementById('pokedex-grid');
        if (gridContainer) {
            gridContainer.innerHTML = `
                <p class="text-center text-[var(--color-error)] p-4">
                    Failed to load Pokémon. Please try refreshing the page.
                </p>
            `;
        }
    } finally {
        const dexGridLoader = document.getElementById('dex-grid-loader');
        if (dexGridLoader) dexGridLoader.classList.add('hidden');
    }
};

// --- Search Setup ---
window.DexApp.App.setupSearch = function() {
    const mainSearchInput = document.getElementById('pokemon-search-main');
    const mainSearchButton = document.getElementById('search-button-main');
    
    if (mainSearchInput && mainSearchButton) {
        // Search button click handler
        mainSearchButton.addEventListener('click', () => {
            const searchTerm = mainSearchInput.value.trim();
            if (searchTerm) {
                if (window.DexApp.DetailView && typeof window.DexApp.DetailView.fetchAndDisplayDetailData === 'function') {
                    window.DexApp.DetailView.fetchAndDisplayDetailData(searchTerm);
                } else {
                    console.error("Detail view function not found!");
                }
            }
        });
        
        // Enter key press handler
        mainSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = mainSearchInput.value.trim();
                if (searchTerm) {
                    if (window.DexApp.DetailView && typeof window.DexApp.DetailView.fetchAndDisplayDetailData === 'function') {
                        window.DexApp.DetailView.fetchAndDisplayDetailData(searchTerm);
                    } else {
                        console.error("Detail view function not found!");
                    }
                }
            }
        });
    } else {
        console.warn("Search elements not found in the DOM.");
    }
};

// --- UI Helpers ---
window.DexApp.App.showApp = function() {
    const initialLoadingOverlay = document.getElementById('initial-loading-overlay');
    const appContainer = document.getElementById('app-container');
    
    if (initialLoadingOverlay) {
        initialLoadingOverlay.classList.add('loaded');
    }
    
    if (appContainer) {
        appContainer.classList.remove('hidden');
    }
};

window.DexApp.App.showInitializationError = function() {
    const gridContainer = document.getElementById('pokedex-grid');
    if (gridContainer) {
        gridContainer.innerHTML = `
            <p class="text-center text-[var(--color-error)] p-4">
                An error occurred while initializing the app. Please try refreshing the page.
            </p>
        `;
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.DexApp.App.initialize();
});

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    
    // Prevent the error from propagating
    event.preventDefault();
});
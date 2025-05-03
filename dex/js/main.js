// dex/js/main.js
// Main entry point for the Pokédex application

// Ensure DexApp namespace exists
window.DexApp = window.DexApp || {};

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Pokedex App...");
    
    // Setup main search functionality
    setupSearch();
    
    // Initialize all modules
    initializeModules().then(() => {
        console.log("All modules initialized.");
        
        // Load initial Pokémon grid
        loadInitialGrid();
        
        // Hide loading overlay and show the app
        setTimeout(() => {
            document.getElementById('initial-loading-overlay').classList.add('loaded');
            document.getElementById('app-container').classList.remove('hidden');
        }, 500);
        
        console.log("Pokedex App Initialized and Ready!");
    }).catch(error => {
        console.error("Error initializing app:", error);
        
        // Still hide the loading overlay even if there's an error
        document.getElementById('initial-loading-overlay').classList.add('loaded');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Show an error message
        const gridContainer = document.getElementById('pokedex-grid');
        if (gridContainer) {
            gridContainer.innerHTML = `
                <p class="text-center text-[var(--color-error)] p-4">
                    An error occurred while initializing the app. Please try refreshing the page.
                </p>
            `;
        }
    });
});

// --- Module Initialization ---
async function initializeModules() {
    try {
        // Make sure all modules initialize in the correct order
        // Some modules depend on others, so order matters
        
        // 1. Initialize Grid Module
        if (window.DexApp.DexGrid && window.DexApp.DexGrid.initialize) {
            window.DexApp.DexGrid.initialize();
            console.log("Grid module initialized.");
        } else {
            console.warn("Grid module not found or no initialize method.");
        }
        
        // 2. Initialize Detail View Module
        if (window.DexApp.DetailView && window.DexApp.DetailView.initialize) {
            window.DexApp.DetailView.initialize();
            console.log("Detail View module initialized.");
        } else {
            console.warn("Detail View module not found or no initialize method.");
        }
        
        // 3. Initialize TCG Module
        if (window.DexApp.TCG && window.DexApp.TCG.initialize) {
            window.DexApp.TCG.initialize();
            console.log("TCG module initialized.");
        } else {
            console.warn("TCG module not found or no initialize method.");
        }
        
        // 4. Initialize Generator Module (if available)
        if (window.DexApp.Generator && window.DexApp.Generator.initialize) {
            window.DexApp.Generator.initialize();
            console.log("Generator module initialized.");
        } else {
            console.warn("Generator module not found or no initialize method.");
        }
        
        // 5. Fetch TCG sets for dropdown (can happen in the background)
        if (window.DexApp.API && window.DexApp.API.fetchTcgSets) {
            window.DexApp.API.fetchTcgSets().catch(e => 
                console.warn('Failed to fetch TCG sets:', e)
            );
        }
        
        return true;
    } catch (error) {
        console.error("Error during module initialization:", error);
        throw error;
    }
}

// --- Initial Grid Loading ---
async function loadInitialGrid() {
    try {
        const dexGridLoader = document.getElementById('dex-grid-loader');
        if (dexGridLoader) dexGridLoader.classList.remove('hidden');
        
        // Get the current generation from the grid module
        const currentGeneration = window.DexApp.DexGrid?.state?.currentGeneration || 1;
        
        // Fetch the Pokémon list and display the grid
        const initialList = await window.DexApp.API.fetchGenerationList(currentGeneration);
        
        if (window.DexApp.DexGrid && window.DexApp.DexGrid.displayDexGrid) {
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
}

// --- Search Setup ---
function setupSearch() {
    const mainSearchInput = document.getElementById('pokemon-search-main');
    const mainSearchButton = document.getElementById('search-button-main');
    
    if (mainSearchInput && mainSearchButton) {
        // Search button click handler
        mainSearchButton.addEventListener('click', () => {
            const searchTerm = mainSearchInput.value.trim();
            if (searchTerm) {
                window.DexApp.DetailView.fetchAndDisplayDetailData(searchTerm);
            }
        });
        
        // Enter key press handler
        mainSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const searchTerm = mainSearchInput.value.trim();
                if (searchTerm) {
                    window.DexApp.DetailView.fetchAndDisplayDetailData(searchTerm);
                }
            }
        });
    } else {
        console.warn("Search elements not found in the DOM.");
    }
}

// --- Error Handling ---
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    
    // You could implement additional error handling here
    // For example, showing an error toast or notification
    
    // Prevent the error from propagating
    event.preventDefault();
});
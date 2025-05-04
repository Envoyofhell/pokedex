/**
 * @file        dex/js/app.js
 * @description Main application entry point and module initializer.
 * @version     3.1.0
 * @date        2025-05-05
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, api.js, lightbox.js, dexGrid.js, detailView.js, tcgModule.js, generator.js
 * @dependents   index.html
 *
 * @changelog
 * v3.1.0 (2025-05-05): Added dependency checks in init, refined error handling.
 * v3.0.0 (2025-05-04): Corrected initialization order, improved loading flow.
 * v1.0.0 (Initial): Basic app setup.
 */

window.DexApp = window.DexApp || {};
window.DexApp.App = {};

// --- Main Initialization ---
window.DexApp.App.initialize = function() {
    console.log("Initializing Pokedex App (V3.1)...");
    try {
        this.setupSearch(); // Setup basic search listeners
        this.initializeModules() // Initialize all modules in order
            .then(() => {
                console.log("Modules initialized successfully.");
                return this.loadInitialGrid(); // Load initial data after modules are ready
            })
            .then(() => {
                // Runs after successful module init AND initial grid load attempt
                this.showApp(); // Hide loading overlay and show the app
                console.log("Pokedex App Initialized and Ready!");
            })
            .catch(error => {
                // Catch errors from either initializeModules or loadInitialGrid
                console.error("Initialization or Initial Load Error:", error);
                this.showApp(); // Still show app container (or at least hide overlay)
                this.showInitializationError(error.message || "App failed to load.");
            });
    } catch (error) {
        // Catch synchronous errors during setupSearch or early init phase
         console.error("Synchronous Initialization Error:", error);
         this.showInitializationError(error.message || "Critical setup error.");
         this.showApp(); // Ensure loading overlay is hidden even on sync error
    }
};

// --- Module Initialization Sequence ---
window.DexApp.App.initializeModules = async function() {
    console.log("Initializing modules...");
    // Use a Promise to handle potential async init steps if added later
    return new Promise((resolve, reject) => {
        try {
            // --- Dependency Checks ---
            const requiredModules = ['Utils', 'API', 'Lightbox', 'DexGrid', 'DetailView', 'TCG', 'Generator'];
            for (const mod of requiredModules) {
                const moduleObject = window.DexApp[mod];
                const hasInitialize = typeof moduleObject?.initialize === 'function';

                if (!moduleObject && (mod !== 'Utils' && mod !== 'API')) { // Utils/API might not have init
                     throw new Error(`${mod} module is missing!`);
                }
                if (!hasInitialize && (mod !== 'Utils' && mod !== 'API')) {
                    console.warn(`${mod} module loaded but missing initialize method.`);
                    // Make initialization mandatory for core UI modules
                    if (['Lightbox', 'DexGrid', 'DetailView', 'Generator'].includes(mod)) {
                        throw new Error(`${mod} module missing required initialize method!`);
                    }
                }
            }
            console.log("All required modules appear to be loaded.");

            // --- Initialization Order ---
            // 1. Core/Utils (No explicit init needed)
            // 2. Lightbox (Needed by DetailView, Generator)
            console.log("Initializing Lightbox...");
            window.DexApp.Lightbox.initialize();

            // 3. UI Modules
            console.log("Initializing DexGrid...");
            window.DexApp.DexGrid.initialize();

            console.log("Initializing DetailView...");
            window.DexApp.DetailView.initialize();

            console.log("Initializing TCG...");
            window.DexApp.TCG.initialize();

            console.log("Initializing Generator...");
            window.DexApp.Generator.initialize();

            // 4. Background Tasks (Can run after core UI is ready)
            console.log("Starting background tasks (e.g., fetch TCG sets)...");
            window.DexApp.API.fetchTcgSets().catch(e => console.warn('Background TCG Set fetch failed:', e));

            console.log("Module initialization sequence complete.");
            resolve(); // Signal success

        } catch (error) {
            console.error("CRITICAL Error during module initialization:", error);
            reject(error); // Propagate the error
        }
    });
};


// --- Initial Grid Loading ---
window.DexApp.App.loadInitialGrid = async function() {
    const gridContainer = window.DexApp.DexGrid?.elements?.pokedexGrid;
    const dexGridLoader = window.DexApp.DexGrid?.elements?.dexGridLoader;

    if (!gridContainer || !dexGridLoader) {
        console.error("Grid container or loader element reference missing in DexGrid module.");
        // Don't throw here, let the app load but show error in place
        this.showInitializationError("UI Error: Grid components missing.");
        return; // Stop this specific function
    }

    console.log("Loading initial grid data...");
    window.DexApp.Utils.UI.showLoader(dexGridLoader);
    gridContainer.innerHTML = ''; // Clear previous content/errors

    try {
        const currentGeneration = window.DexApp.DexGrid?.state?.currentGeneration || 1;
        const initialList = await window.DexApp.API.fetchGenerationList(currentGeneration);

        if (window.DexApp.DexGrid?.displayDexGrid) {
            await window.DexApp.DexGrid.displayDexGrid(initialList);
            console.log("Initial grid data loaded and displayed.");
        } else {
            throw new Error("DexGrid.displayDexGrid function not found!");
        }
    } catch (error) {
        console.error("Error loading initial grid data:", error);
        window.DexApp.Utils.UI.showError(gridContainer, `Failed to load initial Pokémon list. ${error.message}`);
        // Allow the app to continue loading, showing the error in place
    } finally {
        window.DexApp.Utils.UI.hideLoader(dexGridLoader);
    }
};

// --- Search Setup ---
window.DexApp.App.setupSearch = function() {
    const mainSearchInput = document.getElementById('pokemon-search-main');
    const mainSearchButton = document.getElementById('search-button-main');

    if (mainSearchInput && mainSearchButton) {
        const performSearch = () => {
            const searchTerm = mainSearchInput.value.trim().toLowerCase();
            if (searchTerm) {
                if (window.DexApp.DetailView?.fetchAndDisplayDetailData) {
                    console.log(`Performing search for: ${searchTerm}`);
                    window.DexApp.DexGrid?.stopBreathingEffect(); // Stop effect on search
                    // Open detail view without specific context (clears nav)
                    window.DexApp.DetailView.fetchAndDisplayDetailData(searchTerm, null);
                } else { console.error("DetailView function not found!"); }
            }
        };
        mainSearchButton.addEventListener('click', performSearch);
        mainSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') { event.preventDefault(); performSearch(); }
        });
    } else { console.warn("Main search elements not found."); }
};

// --- UI Helpers ---
window.DexApp.App.showApp = function() {
    const initialLoadingOverlay = document.getElementById('initial-loading-overlay');
    const appContainer = document.getElementById('app-container');

    if (initialLoadingOverlay) {
        initialLoadingOverlay.classList.add('loaded');
        // Remove after transition to clean up DOM
        initialLoadingOverlay.addEventListener('transitionend', () => {
             if (initialLoadingOverlay.parentNode) initialLoadingOverlay.remove();
        }, { once: true });
    } else { console.warn("Initial loading overlay not found."); }

    if (appContainer) {
        appContainer.classList.remove('hidden'); // Show main content
    } else { console.error("App container not found!"); }
};

window.DexApp.App.showInitializationError = function(message = "An error occurred.") {
    const errorMsg = `Initialization Error: ${message}`;
    console.error(errorMsg); // Log the detailed error

    const overlay = document.getElementById('initial-loading-overlay');
    const appContainer = document.getElementById('app-container');
    // Use a more specific class for the error message display
    const errorDisplayHtml = `<div class="pokedex-init-error">${errorMsg} Please refresh.</div>`;

    // Prioritize showing error in the loading overlay if it's still visible
    if (overlay && !overlay.classList.contains('loaded')) {
         overlay.innerHTML = errorDisplayHtml;
    } else if (appContainer) {
         // If app container exists, prepend the error message
         appContainer.insertAdjacentHTML('afterbegin', errorDisplayHtml);
         // Ensure app container is visible if hidden
         if (appContainer.classList.contains('hidden')) {
            appContainer.classList.remove('hidden');
         }
    } else {
        // Absolute fallback: Alert or direct body modification
        alert(errorMsg + " Please refresh.");
        // document.body.innerHTML = errorDisplayHtml; // Avoid replacing entire body if possible
    }
};

// --- Global Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // Defer initialization slightly to ensure all scripts are potentially parsed
    setTimeout(() => {
        if (window.DexApp?.App?.initialize) {
            window.DexApp.App.initialize();
        } else {
            console.error("CRITICAL: DexApp.App.initialize not defined!");
            // Display critical error directly
             const errorDiv = `<div style="position: fixed; inset: 0; background: #0f172a; color: #f87171; display: flex; align-items: center; justify-content: center; padding: 2rem; font-size: 1.2rem; z-index: 10000;">Critical Error: Application failed to load. Check console (F12) and script loading order.</div>`;
             const overlay = document.getElementById('initial-loading-overlay');
             if (overlay) overlay.innerHTML = errorDiv;
             else if (document.body) document.body.innerHTML = errorDiv;
        }
    }, 10); // Small delay
});

// --- Global Error Handlers (Optional but Recommended) ---
window.addEventListener('error', function(event) {
    console.error('Unhandled Global Error:', event.error, 'at', event.filename, ':', event.lineno);
    // Consider a subtle UI indicator instead of calling showInitializationError here
    // Example: document.body.classList.add('has-script-error');
});
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled Promise Rejection:', event.reason);
  // Consider a subtle UI indicator
});

console.log("App script loaded (v3.1.0).");
// --- End of App Script ---
// Note: Ensure all modules are loaded before this script in the HTML file.
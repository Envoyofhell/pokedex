/**
 * @file        dex/js/app.js
 * @description Main application entry point and module initializer.
 * @version     3.2.0
 * @date        2025-05-06
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js, api.js, lightbox.js, dexGrid.js, detailView.js, tcgModule.js, generator.js
 * @dependents   index.html
 *
 * @changelog
 * v3.2.0 (2025-05-06): Improved dependency checks, added safe module loading, enhanced error recovery.
 * v3.1.0 (2025-05-05): Added dependency checks in init, refined error handling.
 * v3.0.0 (2025-05-04): Corrected initialization order, improved loading flow.
 * v1.0.0 (Initial): Basic app setup.
 */

window.DexApp = window.DexApp || {};
window.DexApp.App = {};

// --- Main Initialization ---
window.DexApp.App.initialize = function() {
    console.log("Initializing Pokedex App (V3.2)...");
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
            // Check for Constants first since others depend on it
            if (!window.DexApp.Constants) {
                throw new Error("Constants module is missing! Check script loading order.");
            }

            // Check for other required modules
            if (!window.DexApp.Utils) {
                throw new Error("Utils module is missing! Check script loading order.");
            }

            // With required modules present, do more fine-grained checks
            const requiredModules = ['Utils', 'Constants', 'API', 'Lightbox', 'DexGrid', 'DetailView', 'TCG', 'Generator'];
            
            for (const mod of requiredModules) {
                const moduleObject = window.DexApp[mod];
                if (!moduleObject) {
                    // Utils/API/Constants might not have initialize methods, so only warn if they're missing entirely
                    if (['Utils', 'API', 'Constants'].includes(mod)) {
                        console.warn(`${mod} module is missing!`);
                    } else {
                        throw new Error(`${mod} module is missing!`);
                    }
                }
                
                const hasInitialize = typeof moduleObject?.initialize === 'function';
                
                // Check for initialize method only for modules that should have one
                if (!hasInitialize && !['Utils', 'API', 'Constants'].includes(mod)) {
                    console.warn(`${mod} module loaded but missing initialize method.`);
                    // Make initialization mandatory for core UI modules
                    if (['Lightbox', 'DexGrid', 'DetailView', 'Generator'].includes(mod)) {
                        throw new Error(`${mod} module missing required initialize method!`);
                    }
                }
            }
            
            console.log("All required modules appear to be loaded.");

            // --- TCG Required Constants Check ---
            // Check if specific constants required by the TCG module exist
            if (!window.DexApp.Constants.TCG_TYPES || !window.DexApp.Constants.TCG_RARITIES) {
                console.warn("TCG_TYPES or TCG_RARITIES are missing in Constants! TCG functionality may not work correctly.");
                
                // Provide fallback values if needed
                window.DexApp.Constants.TCG_TYPES = window.DexApp.Constants.TCG_TYPES || [
                    "Colorless", "Darkness", "Dragon", "Fairy", "Fighting", 
                    "Fire", "Grass", "Lightning", "Metal", "Psychic", "Water"
                ];
                
                window.DexApp.Constants.TCG_RARITIES = window.DexApp.Constants.TCG_RARITIES || [
                    "Common", "Uncommon", "Rare", "Rare Holo", "Rare Ultra", 
                    "Rare Secret", "Amazing Rare", "Radiant Rare"
                ];
                
                console.log("Added fallback TCG constants.");
            }

            // --- Initialization Order ---
            // 1. Lightbox (Needed by DetailView, Generator)
            console.log("Initializing Lightbox...");
            if (this.safeInitialize('Lightbox')) {
                // 2. UI Modules (continuing only if Lightbox succeeded)
                console.log("Initializing DexGrid...");
                this.safeInitialize('DexGrid');

                console.log("Initializing DetailView...");
                this.safeInitialize('DetailView');

                console.log("Initializing TCG...");
                this.safeInitialize('TCG');

                console.log("Initializing Generator...");
                this.safeInitialize('Generator');

                // 3. Background Tasks (Can run after core UI is ready)
                console.log("Starting background tasks (e.g., fetch TCG sets)...");
                if (window.DexApp.API && typeof window.DexApp.API.fetchTcgSets === 'function') {
                    window.DexApp.API.fetchTcgSets().catch(e => console.warn('Background TCG Set fetch failed:', e));
                }

                console.log("Module initialization sequence complete.");
                resolve(); // Signal success even if some non-critical modules failed
            } else {
                throw new Error("Lightbox initialization failed - critical dependency");
            }

        } catch (error) {
            console.error("CRITICAL Error during module initialization:", error);
            reject(error); // Propagate the error
        }
    });
};

// Safe initialization helper
window.DexApp.App.safeInitialize = function(moduleName) {
    try {
        const module = window.DexApp[moduleName];
        if (module && typeof module.initialize === 'function') {
            module.initialize();
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error initializing ${moduleName} module:`, error);
        return false;
    }
};

// --- Initial Grid Loading ---
window.DexApp.App.loadInitialGrid = async function() {
    const gridContainer = window.DexApp.DexGrid?.elements?.pokedexGrid;
    const dexGridLoader = window.DexApp.DexGrid?.elements?.dexGridLoader;

    if (!gridContainer) {
        console.error("Grid container reference missing in DexGrid module.");
        // Don't throw here, let the app load but show error in place
        this.showInitializationError("UI Error: Grid components missing.");
        return; // Stop this specific function
    }

    console.log("Loading initial grid data...");
    if (dexGridLoader) {
        window.DexApp.Utils.UI.showLoader(dexGridLoader);
    }
    
    gridContainer.innerHTML = ''; // Clear previous content/errors

    try {
        const currentGeneration = window.DexApp.DexGrid?.state?.currentGeneration || 1;
        const initialList = await window.DexApp.API.fetchGenerationList(currentGeneration);

        if (!initialList || initialList.length === 0) {
            throw new Error("Failed to fetch Pokémon list or list is empty");
        }

        if (window.DexApp.DexGrid?.displayDexGrid) {
            await window.DexApp.DexGrid.displayDexGrid(initialList);
            console.log("Initial grid data loaded and displayed.");
        } else {
            throw new Error("DexGrid.displayDexGrid function not found!");
        }
    } catch (error) {
        console.error("Error loading initial grid data:", error);
        if (gridContainer) {
            window.DexApp.Utils.UI.showError(gridContainer, `Failed to load initial Pokémon list. ${error.message}`);
        }
        // Allow the app to continue loading, showing the error in place
    } finally {
        if (dexGridLoader) {
            window.DexApp.Utils.UI.hideLoader(dexGridLoader);
        }
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
                    if (window.DexApp.DexGrid?.stopBreathingEffect) {
                        window.DexApp.DexGrid.stopBreathingEffect(); // Stop effect on search
                    }
                    // Open detail view without specific context (clears nav)
                    window.DexApp.DetailView.fetchAndDisplayDetailData(searchTerm, null);
                } else { console.error("DetailView function not found!"); }
            }
        };
        
        mainSearchButton.addEventListener('click', performSearch);
        mainSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') { 
                event.preventDefault(); 
                performSearch(); 
            }
        });
    } else { 
        console.warn("Main search elements not found."); 
    }
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
        
        // Fallback timeout in case transition events don't fire
        setTimeout(() => {
            if (initialLoadingOverlay.parentNode) initialLoadingOverlay.remove();
        }, 1000);
    } else { 
        console.warn("Initial loading overlay not found."); 
    }

    if (appContainer) {
        appContainer.classList.remove('hidden'); // Show main content
    } else { 
        console.error("App container not found!"); 
    }
};

window.DexApp.App.showInitializationError = function(message = "An error occurred.") {
    const errorMsg = `Initialization Error: ${message}`;
    console.error(errorMsg); // Log the detailed error

    const overlay = document.getElementById('initial-loading-overlay');
    const appContainer = document.getElementById('app-container');
    
    // Create error message with button to reload the page
    const errorDisplayHtml = `
        <div class="pokedex-init-error" style="text-align: center; color: #f87171; padding: 2rem; max-width: 400px; margin: 0 auto;">
            <h3 style="margin-bottom: 1rem;">${errorMsg}</h3>
            <p style="margin-bottom: 1.5rem;">This might be a temporary issue with loading resources or a browser cache problem.</p>
            <button onclick="location.reload(true)" style="padding: 0.5rem 1rem; background-color: #f87171; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
                Reload Page
            </button>
        </div>
    `;

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
        // Absolute fallback: Create a new error div in the body
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.inset = '0';
        errorDiv.style.display = 'flex';
        errorDiv.style.alignItems = 'center';
        errorDiv.style.justifyContent = 'center';
        errorDiv.style.backgroundColor = 'var(--color-bg-dark, #0f172a)';
        errorDiv.style.zIndex = '10000';
        errorDiv.innerHTML = errorDisplayHtml;
        document.body.appendChild(errorDiv);
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
             const errorDiv = `<div style="position: fixed; inset: 0; background: #0f172a; color: #f87171; display: flex; align-items: center; justify-content: center; padding: 2rem; font-size: 1.2rem; z-index: 10000;">
                Critical Error: Application failed to load. 
                <ul style="margin-left: 1.5rem; margin-top: 1rem;">
                    <li>Check console (F12) for details</li>
                    <li>Verify script loading order</li>
                    <li>Clear browser cache and reload</li>
                </ul>
                <button onclick="location.reload(true)" style="position: absolute; bottom: 2rem; padding: 0.5rem 1rem; background-color: #f87171; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
                    Reload Page
                </button>
             </div>`;
             
             const overlay = document.getElementById('initial-loading-overlay');
             if (overlay) overlay.innerHTML = errorDiv;
             else if (document.body) document.body.innerHTML = errorDiv;
        }
    }, 10); // Small delay
});

// --- Global Error Handlers ---
window.addEventListener('error', function(event) {
    console.error('Unhandled Global Error:', event.error, 'at', event.filename, ':', event.lineno);
    // We avoid showing UI errors for every error, but track them in console
});

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled Promise Rejection:', event.reason);
});

console.log("App script loaded (v3.2.0).");
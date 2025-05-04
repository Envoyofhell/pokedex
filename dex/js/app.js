/**
 * @file        dex/js/app.js
 * @description Main application entry point and module initializer.
 * @version     3.3.0
 * @date        2025-05-06
 * @author      Your Name
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js, api.js, lightbox.js, dexGrid.js, detailView.js, tcgModule.js, generator.js
 * @dependents   index.html
 *
 * @changelog
 * v3.3.0 (2025-05-06): Added module existence verification, fixed initialization sequence, improved error recovery.
 * v3.2.0 (2025-05-05): Improved dependency checks, added safe module loading, enhanced error recovery.
 * v3.1.0 (2025-05-04): Added dependency checks in init, refined error handling.
 * v3.0.0 (2025-05-03): Corrected initialization order, improved loading flow.
 * v1.0.0 (Initial): Basic app setup.
 */

window.DexApp = window.DexApp || {};
window.DexApp.App = window.DexApp.App || {};

// --- Main Initialization ---
window.DexApp.App.initialize = function () {
    console.log("Initializing Pokedex App (V3.3)...");

    try {
        // Check required modules first before trying to initialize
        if (!this.verifyRequiredModules()) {
            console.error(
                "Some required modules are missing. The app might not function correctly."
            );
            this.showInitializationError(
                "App initialization failed: Missing required modules. Check console for details."
            );
            // We'll try to continue anyway with available modules
        }

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
            .catch((error) => {
                // Catch errors from either initializeModules or loadInitialGrid
                console.error("Initialization or Initial Load Error:", error);
                this.showApp(); // Still show app container (or at least hide overlay)
                this.showInitializationError(
                    error.message || "App failed to load."
                );
            });
    } catch (error) {
        // Catch synchronous errors during setupSearch or early init phase
        console.error("Synchronous Initialization Error:", error);
        this.showInitializationError(error.message || "Critical setup error.");
        this.showApp(); // Ensure loading overlay is hidden even on sync error
    }
};

// --- Verify Required Modules ---
window.DexApp.App.verifyRequiredModules = function () {
    console.log("Verifying required modules...");

    // Define required modules with their critical properties or methods
    const requiredModules = [
        { name: "Constants", critical: true },
        { name: "Utils", critical: true, props: ["formatters", "UI"] },
        { name: "API", critical: true, methods: ["fetchGenerationList"] },
        {
            name: "Lightbox",
            critical: false,
            methods: ["openDetailLightbox", "closeDetailLightbox"],
        },
        {
            name: "DexGrid",
            critical: true,
            methods: ["initialize", "displayDexGrid"],
        },
        {
            name: "DetailView",
            critical: false,
            methods: ["initialize", "fetchAndDisplayDetailData"],
        },
        {
            name: "TCG",
            critical: false,
            methods: ["initialize", "fetchAndDisplayTcgData"],
        },
        { name: "Generator", critical: false, methods: ["initialize"] },
    ];

    // Track missing modules
    const missingModules = [];
    const missingProperties = [];

    // Check each required module
    for (const module of requiredModules) {
        const moduleObject = window.DexApp[module.name];

        if (!moduleObject) {
            if (module.critical) {
                missingModules.push(`Critical module missing: ${module.name}`);
            } else {
                console.warn(`Optional module missing: ${module.name}`);
            }
            continue;
        }

        // Check required properties
        if (module.props) {
            for (const prop of module.props) {
                if (!moduleObject[prop]) {
                    if (module.critical) {
                        missingProperties.push(
                            `Critical property missing: ${module.name}.${prop}`
                        );
                    } else {
                        console.warn(
                            `Optional property missing: ${module.name}.${prop}`
                        );
                    }
                }
            }
        }

        // Check required methods
        if (module.methods) {
            for (const method of module.methods) {
                if (typeof moduleObject[method] !== "function") {
                    if (module.critical) {
                        missingProperties.push(
                            `Critical method missing: ${module.name}.${method}`
                        );
                    } else {
                        console.warn(
                            `Optional method missing: ${module.name}.${method}`
                        );
                    }
                }
            }
        }
    }

    // Log and return result
    if (missingModules.length > 0 || missingProperties.length > 0) {
        console.error("Module verification failed:");

        if (missingModules.length > 0) {
            console.error("Missing modules:", missingModules);
        }

        if (missingProperties.length > 0) {
            console.error("Missing properties/methods:", missingProperties);
        }

        return false;
    } else {
        console.log("All required modules and properties verified.");
        return true;
    }
};

// --- Module Initialization Sequence ---
window.DexApp.App.initializeModules = async function () {
    console.log("Initializing modules...");

    // Use a Promise to handle potential async init steps
    return new Promise((resolve, reject) => {
        try {
            // --- Module Initialization Order ---

            // 1. Initialize API (prepare for data fetching)
            console.log("Initializing API...");
            if (this.safeInitialize("API")) {
                console.log("API initialization succeeded.");
            } else {
                console.warn("API initialization failed. Continuing anyway...");
            }

            // 2. Initialize Lightbox (Needed by DetailView, Generator)
            console.log("Initializing Lightbox...");
            if (this.safeInitialize("Lightbox")) {
                console.log("Lightbox initialization succeeded.");
            } else {
                console.warn(
                    "Lightbox initialization failed. Some UI features might not work."
                );
            }

            // 3. Initialize DexGrid (Core grid functionality)
            console.log("Initializing DexGrid...");
            if (this.safeInitialize("DexGrid")) {
                console.log("DexGrid initialization succeeded.");
            } else {
                console.error(
                    "DexGrid initialization failed. This is a critical component."
                );
                throw new Error("Failed to initialize DexGrid module.");
            }

            // 4. Initialize DetailView
            console.log("Initializing DetailView...");
            this.safeInitialize("DetailView");

            // 5. Initialize TCG Module
            console.log("Initializing TCG...");
            this.safeInitialize("TCG");

            // 6. Initialize Generator Module
            console.log("Initializing Generator...");
            this.safeInitialize("Generator");

            // All critical modules initialized
            console.log("Module initialization sequence complete.");
            resolve(); // Signal success
        } catch (error) {
            console.error(
                "CRITICAL Error during module initialization:",
                error
            );
            reject(error); // Propagate the error
        }
    });
};

// Safe initialization helper
window.DexApp.App.safeInitialize = function (moduleName) {
    try {
        const module = window.DexApp[moduleName];
        if (module && typeof module.initialize === "function") {
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
window.DexApp.App.loadInitialGrid = async function () {
    console.log("Loading initial grid data...");

    // Get references to grid elements
    const gridContainer =
        window.DexApp.DexGrid?.elements?.pokedexGrid ||
        document.getElementById("pokedex-grid");

    const dexGridLoader =
        window.DexApp.DexGrid?.elements?.dexGridLoader ||
        document.getElementById("dex-grid-loader");

    if (!gridContainer) {
        console.error("Grid container reference missing in DexGrid module.");
        // Don't throw here, let the app load but show error in place
        this.showInitializationError("UI Error: Grid components missing.");
        return; // Stop this specific function
    }

    if (dexGridLoader) {
        if (window.DexApp.Utils?.UI?.showLoader) {
            window.DexApp.Utils.UI.showLoader(dexGridLoader);
        } else {
            // Fallback if Utils not available
            dexGridLoader.classList.remove("hidden");
        }
    }

    gridContainer.innerHTML = ""; // Clear previous content/errors

    try {
        // Get the current generation from the grid module with fallback to 1
        const currentGeneration =
            window.DexApp.DexGrid?.state?.currentGeneration || 1;

        // Check if API module is available
        if (
            !window.DexApp.API ||
            typeof window.DexApp.API.fetchGenerationList !== "function"
        ) {
            throw new Error(
                "API module or fetchGenerationList function missing"
            );
        }

        const initialList = await window.DexApp.API.fetchGenerationList(
            currentGeneration
        );

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

        // Use UI.showError if available
        if (window.DexApp.Utils?.UI?.showError && gridContainer) {
            window.DexApp.Utils.UI.showError(
                gridContainer,
                `Failed to load initial Pokémon list. ${error.message}`
            );
        } else if (gridContainer) {
            // Basic error display fallback
            gridContainer.innerHTML = `
                <div style="text-align: center; color: red; padding: 2rem;">
                    Failed to load initial Pokémon list. ${error.message}
                </div>
            `;
        }

        // Allow the app to continue loading, showing the error in place
    } finally {
        if (dexGridLoader) {
            if (window.DexApp.Utils?.UI?.hideLoader) {
                window.DexApp.Utils.UI.hideLoader(dexGridLoader);
            } else {
                // Fallback if Utils not available
                dexGridLoader.classList.add("hidden");
            }
        }
    }
};

// --- Search Setup ---
window.DexApp.App.setupSearch = function () {
    console.log("Setting up search functionality...");

    const mainSearchInput = document.getElementById("pokemon-search-main");
    const mainSearchButton = document.getElementById("search-button-main");

    if (mainSearchInput && mainSearchButton) {
        // Define search function to avoid duplication
        const performSearch = () => {
            const searchTerm = mainSearchInput.value.trim().toLowerCase();
            if (!searchTerm) return; // Don't search empty strings

            console.log(`Performing search for: ${searchTerm}`);

            // Stop breathing effect if it's active
            if (window.DexApp.DexGrid?.stopBreathingEffect) {
                window.DexApp.DexGrid.stopBreathingEffect();
            }

            // Check if DetailView is available
            if (window.DexApp.DetailView?.fetchAndDisplayDetailData) {
                // Open detail view without specific context (null will reset navigation)
                window.DexApp.DetailView.fetchAndDisplayDetailData(
                    searchTerm,
                    null
                );
            } else if (
                window.DexApp.API?.fetchDetailedPokemonData &&
                window.DexApp.Lightbox?.openDetailLightbox
            ) {
                // Fallback if DetailView is missing but we have API and Lightbox
                console.warn("DetailView missing, using API+Lightbox fallback");

                // Open the lightbox first
                window.DexApp.Lightbox.openDetailLightbox(null);

                // Then fetch and display data manually
                window.DexApp.API.fetchDetailedPokemonData(searchTerm)
                    .then((data) => {
                        if (!data) {
                            console.error(`No data found for: ${searchTerm}`);
                            alert(`No Pokémon found matching: ${searchTerm}`);
                        } else {
                            console.log(`Found data for: ${data.name}`);
                            // We could try to render data here, but it's safer to just alert
                            alert(
                                `Found ${data.name}, but DetailView module is missing.`
                            );
                        }
                    })
                    .catch((err) => {
                        console.error("Search error:", err);
                        alert(`Error searching for: ${searchTerm}`);
                    });
            } else {
                console.error("Search failed: Required modules missing.");
                alert("Search is not available due to missing components.");
            }
        };

        // Search button click handler
        mainSearchButton.addEventListener("click", performSearch);

        // Enter key press handler
        mainSearchInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault(); // Prevent form submission
                performSearch();
            }
        });

        console.log("Search functionality set up successfully.");
    } else {
        console.warn("Search elements not found in the DOM.");
    }
};

// --- UI Helpers ---
window.DexApp.App.showApp = function () {
    console.log("Showing app, hiding loading overlay...");

    const initialLoadingOverlay = document.getElementById(
        "initial-loading-overlay"
    );
    const appContainer = document.getElementById("app-container");

    if (initialLoadingOverlay) {
        initialLoadingOverlay.classList.add("loaded");

        // Remove overlay after transition to clean up DOM
        initialLoadingOverlay.addEventListener(
            "transitionend",
            () => {
                if (initialLoadingOverlay.parentNode) {
                    initialLoadingOverlay.remove();
                }
            },
            { once: true }
        );

        // Fallback timeout in case transition events don't fire
        setTimeout(() => {
            if (initialLoadingOverlay.parentNode) {
                initialLoadingOverlay.remove();
            }
        }, 1000);
    } else {
        console.warn("Initial loading overlay not found.");
    }

    if (appContainer) {
        appContainer.classList.remove("hidden"); // Show main content
    } else {
        console.error("App container not found!");

        // Fallback: Create a basic container if none exists
        const newContainer = document.createElement("div");
        newContainer.id = "app-container";
        newContainer.style.padding = "2rem";
        newContainer.style.maxWidth = "1200px";
        newContainer.style.margin = "0 auto";
        newContainer.innerHTML =
            "<h1>Interactive Pokédex</h1><p>Warning: App container missing. Limited functionality available.</p>";
        document.body.appendChild(newContainer);
    }
};

window.DexApp.App.showInitializationError = function (
    message = "An error occurred."
) {
    const errorMsg = `Initialization Error: ${message}`;
    console.error(errorMsg); // Log the detailed error

    const overlay = document.getElementById("initial-loading-overlay");
    const appContainer = document.getElementById("app-container");

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
    if (overlay && !overlay.classList.contains("loaded")) {
        overlay.innerHTML = errorDisplayHtml;
    } else if (appContainer) {
        // If app container exists, prepend the error message
        appContainer.insertAdjacentHTML("afterbegin", errorDisplayHtml);
        // Ensure app container is visible if hidden
        if (appContainer.classList.contains("hidden")) {
            appContainer.classList.remove("hidden");
        }
    } else {
        // Absolute fallback: Create a new error div in the body
        const errorDiv = document.createElement("div");
        errorDiv.style.position = "fixed";
        errorDiv.style.inset = "0";
        errorDiv.style.display = "flex";
        errorDiv.style.alignItems = "center";
        errorDiv.style.justifyContent = "center";
        errorDiv.style.backgroundColor = "var(--color-bg-dark, #0f172a)";
        errorDiv.style.zIndex = "10000";
        errorDiv.innerHTML = errorDisplayHtml;
        document.body.appendChild(errorDiv);
    }
};

// --- Global Event Listener ---
document.addEventListener("DOMContentLoaded", () => {
    // Defer initialization slightly to ensure all scripts are potentially parsed
    setTimeout(() => {
        if (window.DexApp?.App?.initialize) {
            window.DexApp.App.initialize();
        } else {
            console.error("CRITICAL: DexApp.App.initialize not defined!");

            // Display critical error directly
            const errorDiv = document.createElement("div");
            errorDiv.style.position = "fixed";
            errorDiv.style.inset = "0";
            errorDiv.style.background = "#0f172a";
            errorDiv.style.color = "#f87171";
            errorDiv.style.display = "flex";
            errorDiv.style.flexDirection = "column";
            errorDiv.style.alignItems = "center";
            errorDiv.style.justifyContent = "center";
            errorDiv.style.padding = "2rem";
            errorDiv.style.fontSize = "1.2rem";
            errorDiv.style.zIndex = "10000";

            errorDiv.innerHTML = `
                <h1 style="color: #f87171; margin-bottom: 2rem;">Critical Error</h1>
                <p>Application failed to load. Check the following:</p>
                <ul style="margin: 1.5rem 0; list-style: disc; padding-left: 2rem;">
                    <li>Check console (F12) for details</li>
                    <li>Verify script loading order</li>
                    <li>Clear browser cache and reload</li>
                </ul>
                <button onclick="location.reload(true)" style="margin-top: 2rem; padding: 0.5rem 1rem; background-color: #f87171; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
                    Reload Page
                </button>
            `;

            // Try to replace loading overlay
            const overlay = document.getElementById("initial-loading-overlay");
            if (overlay) {
                overlay.innerHTML = "";
                overlay.appendChild(errorDiv);
            } else if (document.body) {
                document.body.innerHTML = "";
                document.body.appendChild(errorDiv);
            }
        }
    }, 20); // Small delay
});

// --- Global Error Handlers ---
window.addEventListener("error", function (event) {
    console.error(
        "Unhandled Global Error:",
        event.error,
        "at",
        event.filename,
        ":",
        event.lineno
    );
    // We avoid showing UI errors for every error, but track them in console
});

window.addEventListener("unhandledrejection", function (event) {
    console.error("Unhandled Promise Rejection:", event.reason);
});

// Add tracking for script load if diagnostic script is loaded
if (window.trackScriptLoad) {
    window.trackScriptLoad("app.js");
}

console.log("App script loaded (v3.3.0)");

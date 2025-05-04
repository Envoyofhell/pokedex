/**
 * @file        dex/js/app.js
 * @description Main application entry point. Stable sequential initialization, corrected safeInitialize.
 * @version     4.0.1
 * @date        2025-05-04
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js, api.js, lightbox.js, dexGrid.js, detailView.js, tcgModule.js, generator.js, loading.js
 * @dependents  index.html
 *
 * @changelog
 * v4.0.1 (2025-05-04): Corrected safeInitialize logic for modules without .initialize(). Strict sequential async init. Added pre-call checks.
 * v4.0.0 (2025-05-04): Complete overhaul focusing on stable sequential initialization, robust error handling, and correct loading signal timing. Addresses module init issues and ensures DexGrid is ready.
 */

window.DexApp = window.DexApp || {};
window.DexApp.App = window.DexApp.App || {};

// --- Main Initialization ---
window.DexApp.App.initialize = async function () {
    console.log("Initializing Pokedex App (V4.0.1)...");

    try {
        // --- Step 1: Initialize Loading Manager ---
        console.log("[App Init] Step 1: Initializing Loading Manager...");
        if (!await this.safeInitialize("Loading", true)) return; // Critical

        // --- Step 2: Initialize Core Dependencies (Order Matters) ---
        console.log("[App Init] Step 2: Initializing Core Dependencies...");
        // Modules that MUST exist and potentially initialize
        const coreDeps = ["Constants", "Utils", "API", "Lightbox"];
        for (const moduleName of coreDeps) {
            const isCritical = ["Constants", "Utils", "API"].includes(moduleName); // Define which are absolutely essential
            if (!await this.safeInitialize(moduleName, isCritical)) {
                 if (isCritical) return; // Stop if critical core module failed
            }
        }
        console.log("[App Init] Step 2: Core Dependencies Initialized.");

        // --- Step 3: Initialize Main Feature Modules (Order Matters) ---
        console.log("[App Init] Step 3: Initializing Feature Modules...");
        // DexGrid depends on API, Utils, Constants
        // DetailView depends on API, Utils, Lightbox, Constants
        // TCG depends on API, Utils, Lightbox, Constants
        // Generator depends on Utils, Constants, Lightbox
        const featureModules = ["DexGrid", "DetailView", "TCG", "Generator"];
        for (const moduleName of featureModules) {
            const isCritical = (moduleName === "DexGrid"); // DexGrid is needed for initial view
             if (!await this.safeInitialize(moduleName, isCritical)) {
                 if (isCritical) return; // Stop if DexGrid fails
            }
        }
        console.log("[App Init] Step 3: Feature Modules Initialized.");

        // --- Step 4: Setup UI Interactions ---
        console.log("[App Init] Step 4: Setting up UI Interactions (Search)...");
        // Verify DetailView and Lightbox are ready before setting up interactions that depend on them
        if (!window.DexApp.DetailView || !window.DexApp.Lightbox) {
            console.warn("[App Init] DetailView or Lightbox module not fully ready. Search/Generator buttons might not work correctly.");
        }
        this.setupSearch();
        console.log("[App Init] Step 4: UI Interactions Setup Complete.");

        // --- Step 5: Load Initial Data (Gen 1 Grid) ---
        console.log("[App Init] Step 5: Loading Initial Grid Data (Gen 1)...");
        // Crucially, verify DexGrid.loadGridData exists *just before* calling it
        if (window.DexApp.DexGrid && typeof window.DexApp.DexGrid.loadGridData === 'function') {
            console.log("[App Init] DexGrid.loadGridData verified. Proceeding with initial load.");
            await window.DexApp.DexGrid.loadGridData({ generation: 1 }); // Await completion
            console.log("[App Init] Step 5: Initial Grid Load Request Completed Successfully.");
        } else {
            console.error("[App Init] CRITICAL FAILURE: DexGrid.loadGridData function is missing AFTER DexGrid initialization!", "window.DexApp.DexGrid:", window.DexApp.DexGrid);
            // Check if the object exists but the function doesn't - indicates wrong version loaded
            if (window.DexApp.DexGrid) {
                 throw new Error("DexGrid module loaded, but 'loadGridData' function is missing. Check file version (should be v2.2.3+).");
            } else {
                 throw new Error("DexGrid module itself is missing.");
            }
        }

        // --- Step 6: Signal Loading Complete ---
        console.log("[App Init] Step 6: Dispatching initialLoadComplete event.");
        // This event tells loading.js to hide the overlay
        document.dispatchEvent(new CustomEvent("initialLoadComplete"));

        console.log("--- Pokedex App Initialization Sequence Fully Complete ---");

    } catch (error) {
        // Catch any error during the initialization sequence
        const errorMsg = `Pokedex App Initialization FAILED: ${error.message}`;
        console.error(errorMsg, error.stack); // Log stack trace
        this.showInitializationError(errorMsg, true); // Show critical error UI
        // Also signal error to loading manager if it exists
        console.log("Dispatching initialLoadError event due to failure.");
        document.dispatchEvent(new CustomEvent("initialLoadError", { detail: { message: error.message } }));
    }
};

// --- Safe Initialization Helper ---
// Checks for module existence and calls .initialize() if it exists.
// Handles modules (like Utils, Constants) that don't need explicit initialization.
// Returns a promise resolving to true on success, false on failure/missing.
// Throws error immediately if module is critical and fails.
window.DexApp.App.safeInitialize = async function (moduleName, isCritical = false) {
    console.log(`[Safe Init] Attempting: ${moduleName} ${isCritical ? '(Critical)' : ''}`);
    try {
        const module = window.DexApp[moduleName];

        // 1. Check if the module object exists on the window.DexApp namespace
        if (!module) {
            console.warn(`[Safe Init]   - ${moduleName} module object not found.`);
            if (isCritical) throw new Error(`Critical module ${moduleName} not found.`);
            return false; // Module missing
        }

        // 2. Check if an 'initialize' function exists *and* is actually a function
        if (typeof module.initialize === "function") {
            console.log(`[Safe Init]   - Found initialize function for ${moduleName}. Calling...`);
            const result = module.initialize(); // Call the function

            // 3. If it returns a promise (async function), await its completion
            if (result && typeof result.then === 'function') {
                console.log(`[Safe Init]   - ${moduleName} initialize is async, awaiting...`);
                await result;
                console.log(`[Safe Init]   - ${moduleName} async initialize completed.`);
            }

            // 4. Check if initialize explicitly returned false (synchronous failure)
            if (result === false) {
                 console.warn(`[Safe Init]   - ${moduleName} initialize function returned false.`);
                 if (isCritical) throw new Error(`Critical module ${moduleName} returned false on init.`);
                 return false;
            }

            // 5. If we reached here, initialization (sync or async) succeeded or didn't return false
            console.log(`[Safe Init]   - ${moduleName} initialized successfully (via function).`);
            return true;

        } else {
            // Module exists but has no initialize function (e.g., Constants, Utils)
            console.log(`[Safe Init]   - ${moduleName} module loaded (no initialize function found/needed).`);
            return true; // Assume success if module exists but has no specific init function
        }
    } catch (error) {
        // Catch errors thrown *during* the initialize call or the await
        console.error(`[Safe Init] Error during initialization attempt for ${moduleName}:`, error);
         if (isCritical) {
             // Re-throw error if critical to be caught by the main try/catch
             throw new Error(`Critical module ${moduleName} failed during initialization: ${error.message}`);
         }
        return false; // Failure due to error for non-critical modules
    }
};


// --- Initial Grid Loading Trigger ---
// This function now assumes DexGrid and its method exist, checked in initialize()
window.DexApp.App.loadInitialGrid = async function () {
    console.log("[Load Grid] Calling DexGrid.loadGridData...");
    try {
        // DexGrid.loadGridData handles its own loader and dispatches its own event upon completion
        await window.DexApp.DexGrid.loadGridData({ generation: 1 });
        console.log("[Load Grid] DexGrid.loadGridData call completed successfully.");
    } catch (error) {
        console.error("[Load Grid] Error executing DexGrid.loadGridData:", error);
        // Re-throw the error to be caught by the main initialize catch block
        throw new Error(`Failed to load initial grid data: ${error.message}`);
    }
};


// --- Search Setup ---
window.DexApp.App.setupSearch = function () {
    console.log("[Search Setup] Setting up search functionality...");
    const mainSearchInput = document.getElementById("pokemon-search-main");
    const mainSearchButton = document.getElementById("search-button-main");
    const randomButton = document.getElementById("random-pokemon-button");

    if (mainSearchInput && mainSearchButton) {
        const performSearch = () => {
            const searchTerm = mainSearchInput.value.trim().toLowerCase();
            if (!searchTerm) return;
            console.log(`[Search] Performing search for: ${searchTerm}`);

            // Check dependencies before calling
            if (window.DexApp.DexGrid?.stopBreathingEffect) {
                 window.DexApp.DexGrid.stopBreathingEffect();
            }
            if (window.DexApp.DetailView?.fetchAndDisplayDetailData) {
                window.DexApp.DetailView.fetchAndDisplayDetailData(searchTerm, null);
            } else {
                console.error("[Search] DetailView module or function missing.");
                alert("Cannot display Pokémon details at this time.");
            }
        };
        mainSearchButton.addEventListener("click", performSearch);
        mainSearchInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") { event.preventDefault(); performSearch(); }
        });
        console.log("[Search Setup] Main search listeners added.");
    } else {
        console.warn("[Search Setup] Main search elements not found.");
    }

    if (randomButton) {
        randomButton.addEventListener("click", () => {
            console.log("[Generator] Random generator button clicked.");
            // Check dependencies before calling
            if (window.DexApp.Lightbox?.openGeneratorLightbox) {
                window.DexApp.Lightbox.openGeneratorLightbox();
            } else {
                console.error("[Generator] Lightbox module or function missing.");
                alert("Random generator is not available.");
            }
        });
        console.log("[Search Setup] Random generator button listener added.");
    } else {
        console.warn("[Search Setup] Random generator button not found.");
    }
};

// --- Error Display ---
window.DexApp.App.showInitializationError = function (message, isCritical = false) {
    const errorMsg = `Initialization Error: ${message}`;
    console.error(errorMsg); // Log the raw error

    const overlay = document.getElementById("initial-loading-overlay");
    const appContainer = document.getElementById("app-container");

    const errorDisplayHtml = `
        <div class="pokedex-init-error" style="color: #f87171; padding: 1rem 2rem; max-width: 600px; margin: auto; border: 1px solid #f87171; border-radius: 8px; background-color: rgba(153, 27, 27, 0.3); text-align: center;">
            <h3 style="font-size: 1.2em; margin-bottom: 0.75rem; font-weight: bold;">${isCritical ? "Critical Error" : "Initialization Error"}</h3>
            <p style="margin-bottom: 1rem; font-size: 0.9em; word-wrap: break-word;">${message}</p>
            <p style="font-size: 0.8em; margin-bottom: 1rem;">Please check the console (F12) for more details or try reloading the page.</p>
            <button onclick="location.reload(true)" style="padding: 0.5rem 1rem; background-color: #f87171; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.9em;">Reload Page</button>
        </div>`;

    if (overlay && !overlay.classList.contains("loaded")) {
        overlay.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%;">${errorDisplayHtml}</div>`;
        overlay.classList.remove("loaded");
        overlay.style.opacity = "1";
        overlay.style.visibility = "visible";
        console.log("Displayed init error within the loading overlay.");
    } else if (appContainer) {
        appContainer.innerHTML = errorDisplayHtml; // Replace app content
        appContainer.classList.remove("hidden"); // Ensure visible
        console.log("Displayed init error in the main app container.");
    } else {
        // Absolute fallback if neither container exists
        this.showCriticalError(message);
    }
};

// --- Critical Error Display (Fallback) ---
window.DexApp.App.showCriticalError = function(message) {
     console.error("Displaying critical error overlay:", message);
     const errorDiv = document.createElement("div");
     errorDiv.style.position = "fixed"; errorDiv.style.inset = "0"; errorDiv.style.backgroundColor = "var(--color-bg-dark, #0f172a)";
     errorDiv.style.display = "flex"; errorDiv.style.alignItems = "center"; errorDiv.style.justifyContent = "center";
     errorDiv.style.zIndex = "10000"; errorDiv.style.padding = "2rem"; errorDiv.style.textAlign = "center";
     errorDiv.innerHTML = `
         <div style="color: #f87171; max-width: 500px;">
             <h1 style="font-size: 1.5em; font-weight: bold; margin-bottom: 1rem;">Critical Application Error</h1>
             <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">${message}</p>
             <p style="font-size: 0.9em; margin-bottom: 1.5rem;">The application cannot start. Please check the browser console (F12).</p>
             <button onclick="location.reload(true)" style="padding: 0.6rem 1.2rem; background-color: #f87171; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 1em;">Reload Page</button>
         </div>`;
     try { document.body.innerHTML = ''; document.body.appendChild(errorDiv); document.body.style.backgroundColor = 'var(--color-bg-dark, #0f172a)'; }
     catch (e) { console.error("Failed to display critical error overlay.", e); }
};


// --- Global Event Listener (Entry Point) ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event fired.");
    setTimeout(() => {
        console.log("Running deferred initialization check...");
        if (window.DexApp?.App?.initialize) {
            window.DexApp.App.initialize();
        } else {
            const errorMsg = "CRITICAL: DexApp.App.initialize function not defined! Cannot start application.";
            console.error(errorMsg);
            try { window.DexApp?.App?.showCriticalError?.(errorMsg); }
            catch(e) { alert(errorMsg + " Check console (F12)."); }
        }
    }, 100); // Delay to ensure scripts are parsed
});

// --- Global Error Handlers ---
window.addEventListener("error", function (event) {
    console.error("Unhandled Global Error:", event.error || event.message, "at", event.filename, ":", event.lineno);
});
window.addEventListener("unhandledrejection", function (event) {
    console.error("Unhandled Promise Rejection:", event.reason);
});

// Add tracking for script load
if (window.trackScriptLoad) { window.trackScriptLoad("app.js"); }
console.log("App script loaded (v4.0.1)");

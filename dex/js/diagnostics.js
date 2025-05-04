/**
 * @file        dex/js/diagnostic.js
 * @description Diagnostics tool to check script loading and module initialization
 * @version     1.0.0
 * @date        2025-05-06
 */

// Wrap in IIFE to avoid polluting global scope
(function() {
    // Create diagnostics namespace
    window.DexDiagnostics = {
        scriptLoadOrder: [],
        moduleStatus: {},
        domStatus: {},
        errors: []
    };

    // Track script loading
    function trackScript(scriptName) {
        window.DexDiagnostics.scriptLoadOrder.push({
            name: scriptName,
            time: new Date().toISOString()
        });
        console.log(`[DIAG] Script loaded: ${scriptName}`);
    }

    // Check all DexApp modules
    function checkModules() {
        const modules = [
            "Constants", "Utils", "API", "Lightbox", 
            "DexGrid", "DetailView", "TCG", "Generator", "App"
        ];
        
        for (const mod of modules) {
            const status = {};
            
            // Check if module exists
            status.exists = !!window.DexApp?.[mod];
            
            // Check if initialize method exists
            status.hasInitMethod = typeof window.DexApp?.[mod]?.initialize === 'function';
            
            // Check for state object
            status.hasState = !!window.DexApp?.[mod]?.state;
            
            // Check for elements cache
            status.hasElements = !!window.DexApp?.[mod]?.elements;
            
            // For Constants, check specific required constants
            if (mod === 'Constants' && status.exists) {
                status.specifics = {
                    hasPokemonTypes: !!window.DexApp.Constants.POKEMON_TYPES,
                    hasTcgTypes: !!window.DexApp.Constants.TCG_TYPES,
                    hasTcgRarities: !!window.DexApp.Constants.TCG_RARITIES,
                    hasGenerationRanges: !!window.DexApp.Constants.GENERATION_RANGES
                };
            }
            
            window.DexDiagnostics.moduleStatus[mod] = status;
        }
    }

    // Check critical DOM elements
    function checkDomElements() {
        const criticalElements = [
            "initial-loading-overlay", "app-container", "pokedex-grid",
            "generation-tabs", "type-filter-buttons", "detail-view-lightbox",
            "tcg-lightbox", "generator-overlay", "pokemon-search-main"
        ];
        
        for (const id of criticalElements) {
            const element = document.getElementById(id);
            window.DexDiagnostics.domStatus[id] = {
                exists: !!element,
                hidden: element ? element.classList.contains('hidden') : null,
                tagName: element ? element.tagName : null
            };
        }
    }

    // Log unhandled errors
    function setupErrorLogging() {
        window.addEventListener('error', function(event) {
            window.DexDiagnostics.errors.push({
                type: 'Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                time: new Date().toISOString()
            });
        });
        
        window.addEventListener('unhandledrejection', function(event) {
            window.DexDiagnostics.errors.push({
                type: 'UnhandledPromiseRejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                time: new Date().toISOString()
            });
        });
    }

    // Run diagnostics and display results
    function runAndDisplayDiagnostics() {
        checkModules();
        checkDomElements();
        
        console.group("🔍 DexApp Diagnostics Report");
        
        // Script Loading Order
        console.log("📜 Script Loading Order:");
        console.table(window.DexDiagnostics.scriptLoadOrder);
        
        // Module Status
        console.log("📦 Module Status:");
        for (const [mod, status] of Object.entries(window.DexDiagnostics.moduleStatus)) {
            if (mod === 'Constants' && status.exists && status.specifics) {
                console.log(`${status.exists ? '✅' : '❌'} ${mod}: ${JSON.stringify(status.specifics)}`);
            } else {
                const emoji = status.exists ? '✅' : '❌';
                const details = status.hasInitMethod ? 'has initialize()' : 'no initialize()';
                console.log(`${emoji} ${mod}: ${details}`);
            }
        }
        
        // DOM Status for critical elements
        console.log("🖥️ Critical DOM Elements:");
        for (const [id, status] of Object.entries(window.DexDiagnostics.domStatus)) {
            const emoji = status.exists ? '✅' : '❌';
            console.log(`${emoji} #${id}: ${status.exists ? (status.hidden ? 'Hidden' : 'Visible') : 'Not found'}`);
        }
        
        // Errors
        console.log(`❗ Errors (${window.DexDiagnostics.errors.length}):`);
        if (window.DexDiagnostics.errors.length > 0) {
            console.table(window.DexDiagnostics.errors);
        } else {
            console.log("No errors logged.");
        }
        
        console.groupEnd();
        
        // Create diagnostic button in the UI
        createDiagnosticButton();
    }

    // Create a diagnostic button that shows status and can clear cache
    function createDiagnosticButton() {
        // Only create if body exists
        if (!document.body) return;
        
        const btn = document.createElement('button');
        btn.id = 'dex-diagnostic-button';
        btn.innerText = '🩺 Diagnostics';
        btn.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            padding: 8px 12px;
            background-color: #5a0866;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        
        btn.addEventListener('click', function() {
            // Create a diagnostic panel
            const panel = document.createElement('div');
            panel.id = 'dex-diagnostic-panel';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                background-color: #1f2937;
                color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.5);
                z-index: 10001;
                overflow-y: auto;
            `;
            
            // Create panel content
            let content = `
                <h2 style="margin-top: 0; color: #f87171;">Pokedex Diagnostics</h2>
                <button id="dex-diag-close" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
                <button id="dex-clear-cache" style="background-color: #f87171; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin-bottom: 15px; cursor: pointer;">Clear Cache & Reload</button>
                
                <h3>Module Status</h3>
                <div style="background-color: #374151; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
            `;
            
            // Add module status
            for (const [mod, status] of Object.entries(window.DexDiagnostics.moduleStatus)) {
                const emoji = status.exists ? '✅' : '❌';
                content += `<div>${emoji} <strong>${mod}:</strong> ${status.exists ? 'Loaded' : 'Missing'}</div>`;
                
                // Add Constants details
                if (mod === 'Constants' && status.exists && status.specifics) {
                    for (const [key, value] of Object.entries(status.specifics)) {
                        content += `<div style="margin-left: 20px;">${value ? '✅' : '❌'} ${key}</div>`;
                    }
                }
            }
            
            content += `</div>
                
                <h3>Critical DOM Elements</h3>
                <div style="background-color: #374151; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
            `;
            
            // Add DOM element status
            for (const [id, status] of Object.entries(window.DexDiagnostics.domStatus)) {
                const emoji = status.exists ? '✅' : '❌';
                content += `<div>${emoji} <strong>#${id}:</strong> ${status.exists ? (status.hidden ? 'Hidden' : 'Visible') : 'Not found'}</div>`;
            }
            
            content += `</div>
                
                <h3>Errors (${window.DexDiagnostics.errors.length})</h3>
                <div style="background-color: ${window.DexDiagnostics.errors.length > 0 ? '#7f1d1d' : '#374151'}; padding: 12px; border-radius: 4px; margin-bottom: 15px; max-height: 200px; overflow-y: auto;">
            `;
            
            // Add errors
            if (window.DexDiagnostics.errors.length > 0) {
                for (const err of window.DexDiagnostics.errors) {
                    content += `<div style="margin-bottom: 8px; border-bottom: 1px solid #4b5563; padding-bottom: 8px;">
                        <strong>${err.type}:</strong> ${err.message || 'Unknown error'}
                        ${err.filename ? `<div>File: ${err.filename}:${err.lineno}</div>` : ''}
                        ${err.time ? `<div style="font-size: 12px; color: #9ca3af;">Time: ${err.time}</div>` : ''}
                    </div>`;
                }
            } else {
                content += `<div>No errors logged.</div>`;
            }
            
            content += `</div>
                
                <h3>Script Loading Order</h3>
                <div style="background-color: #374151; padding: 12px; border-radius: 4px; margin-bottom: 15px; max-height: 200px; overflow-y: auto;">
            `;
            
            // Add script loading order
            if (window.DexDiagnostics.scriptLoadOrder.length > 0) {
                for (const script of window.DexDiagnostics.scriptLoadOrder) {
                    content += `<div><strong>${script.name}</strong> - ${script.time}</div>`;
                }
            } else {
                content += `<div>No script loading events recorded.</div>`;
            }
            
            content += `</div>`;
            
            // Add the content to the panel
            panel.innerHTML = content;
            document.body.appendChild(panel);
            
            // Add event listeners for buttons
            document.getElementById('dex-diag-close').addEventListener('click', function() {
                document.body.removeChild(panel);
            });
            
            document.getElementById('dex-clear-cache').addEventListener('click', function() {
                localStorage.clear();
                sessionStorage.clear();
                
                // Try to clear the Cache API if available
                if ('caches' in window) {
                    caches.keys().then(function(cacheNames) {
                        return Promise.all(
                            cacheNames.map(function(cacheName) {
                                return caches.delete(cacheName);
                            })
                        );
                    });
                }
                
                // Force reload from server
                window.location.reload(true);
            });
        });
        
        document.body.appendChild(btn);
    }

    // Setup error logging
    setupErrorLogging();
    
    // Register script loading for this script
    trackScript('diagnostic.js');
    
    // Run diagnostics when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAndDisplayDiagnostics);
    } else {
        // DOM already loaded
        runAndDisplayDiagnostics();
    }
    
    // Expose helper to track other scripts
    window.trackScriptLoad = trackScript;
})();
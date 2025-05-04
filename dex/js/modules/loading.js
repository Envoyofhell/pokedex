/**
 * @file        dex/js/modules/loading.js
 * @description Manages the initial loading sequence, progress, overlay, and final style application.
 * @version     2.0.2
 * @date        2025-05-04
 * @author      Your Name/AI Assistant
 *
 * @dependencies utils.js, constants.js
 * @dependents  app.js
 *
 * @changelog
 * v2.0.2 (2025-05-04): Further simplified, primarily waits for 'initialLoadComplete' event.
 * v2.0.1 (2025-05-04): Simplified readiness checks, relies on 'initialLoadComplete' event from app.js. Added fallback timer.
 * v2.0.0 (2025-05-04): Consolidated loader.js, added readiness checks, improved style refresh.
 */

window.DexApp = window.DexApp || {};
window.DexApp.Loading = {
    state: {
        isComplete: false,          // Flag to prevent multiple completions
        initialLoadSignaled: false, // Flag to track if the main app signaled completion
        cssVarsReady: false,        // Flag for CSS variable check
        minTimeElapsed: false,      // Flag for minimum display time
        loadStartTime: Date.now(),
        minimumDisplayTime: 1200,   // Min ms the loader should show
        cssCheckInterval: null,
        cssCheckTimeout: null,
        minTimeTimeout: null,
        fallbackTimeout: null,
    },

    elements: {
        initialLoadingOverlay: null,
        progressBar: null,
        loadingTextContainer: null,
        appContainer: null,
    },

    // --- Initialize Loading Manager ---
    initialize: function () {
        console.log("[Loading Init] Initializing Loading Manager (v2.0.2)...");
        this.state.loadStartTime = Date.now();
        this.cacheElements();

        if (!this.elements.initialLoadingOverlay) {
            console.error("[Loading Init] CRITICAL: Overlay element not found.");
            return false;
        }

        this.setupLoadingText();
        this.monitorCssVariables();
        this.setupEventListeners();

        // Set timer for minimum display time
        this.state.minTimeTimeout = setTimeout(() => {
            console.log("[Loading Timer] Minimum display time elapsed.");
            this.state.minTimeElapsed = true;
            this.attemptToCompleteLoading("Min time elapsed");
        }, this.state.minimumDisplayTime);

        // Fallback timer
        const MAX_LOADING_TIME = 15000; // Increased fallback to 15s
        this.state.fallbackTimeout = setTimeout(() => {
            if (!this.state.isComplete) { // Only trigger if not already complete
                console.warn(`[Loading Timer] Fallback triggered after ${MAX_LOADING_TIME}ms.`);
                this.attemptToCompleteLoading("Fallback Timeout");
            }
        }, MAX_LOADING_TIME);

        console.log("[Loading Init] Loading Manager initialized.");
        return true;
    },

    // --- Cache Loading Elements ---
    cacheElements: function () {
        this.elements.initialLoadingOverlay = document.getElementById("initial-loading-overlay");
        this.elements.progressBar = this.elements.initialLoadingOverlay?.querySelector(".progressBar");
        this.elements.loadingTextContainer = this.elements.initialLoadingOverlay?.querySelector(".loader-text");
        this.elements.appContainer = document.getElementById("app-container");
    },

    // --- Setup Loading Text Animation ---
    setupLoadingText: function () {
        const container = this.elements.loadingTextContainer;
        if (!container) return;
        container.innerHTML = "";
        const loadingText = "Loading Pokédex...";
        loadingText.split("").forEach((char, i) => {
            const span = document.createElement("span");
            span.className = "element";
            span.style.setProperty("--index", i + 1);
            span.textContent = char === ' ' ? '\u00A0' : char;
            container.appendChild(span);
        });
        if (this.elements.progressBar) {
            this.elements.progressBar.style.animation = "loadingAnimation 2s ease-in-out infinite";
            this.elements.progressBar.style.transform = "translateX(-100%)";
            this.elements.progressBar.style.transition = "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)";
        }
    },

    // --- Monitor CSS Variable Readiness ---
    monitorCssVariables: function () {
        if (this.state.cssCheckInterval) clearInterval(this.state.cssCheckInterval);
        if (this.state.cssCheckTimeout) clearTimeout(this.state.cssCheckTimeout);
        const checkCssVars = () => {
            try {
                 const testVar = getComputedStyle(document.documentElement).getPropertyValue("--type-fire").trim();
                 if (testVar && testVar !== "") {
                     console.log("[Loading CSS] CSS Variables check passed.");
                     if (this.state.cssCheckInterval) clearInterval(this.state.cssCheckInterval);
                     if (this.state.cssCheckTimeout) clearTimeout(this.state.cssCheckTimeout);
                     this.state.cssVarsReady = true;
                     this.updateLoadingProgress(50); // Indicate CSS ready
                     this.attemptToCompleteLoading("CSS Ready");
                     return true;
                 }
            } catch (e) { console.warn("[Loading CSS] Error checking CSS variables:", e); }
            return false;
        };
        if (checkCssVars()) return;
        console.log("[Loading CSS] CSS Variables not ready yet, monitoring...");
        this.state.cssCheckInterval = setInterval(checkCssVars, 150);
        this.state.cssCheckTimeout = setTimeout(() => {
            if (!this.state.cssVarsReady) {
                console.warn("[Loading CSS] CSS Variables check timed out. Assuming ready.");
                if (this.state.cssCheckInterval) clearInterval(this.state.cssCheckInterval);
                this.state.cssVarsReady = true;
                this.updateLoadingProgress(50);
                this.attemptToCompleteLoading("CSS Check Timeout");
            }
        }, 4000); // 4 second timeout for CSS
    },

    // --- Setup Event Listeners for Readiness Signal ---
    setupEventListeners: function () {
        document.addEventListener("initialLoadComplete", () => {
            console.log("[Loading Event] Received 'initialLoadComplete' event.");
            this.state.initialLoadSignaled = true;
            this.updateLoadingProgress(100);
            this.attemptToCompleteLoading("App Signal Received");
        });
         document.addEventListener("initialLoadError", (event) => {
            console.error("[Loading Event] Received 'initialLoadError' event:", event.detail?.message);
            // Force completion immediately to show the error message displayed by app.js
            this.state.initialLoadSignaled = true; // Mark as "signaled" (with error)
             this.updateLoadingProgress(100); // Show full bar even on error before hiding
            this.attemptToCompleteLoading("App Error Signal Received");
        });
    },

    // --- Update Loading Progress Bar ---
    updateLoadingProgress: function (percentage) {
        if (!this.elements.progressBar || this.state.isComplete) return;
         if (percentage > 0) { this.elements.progressBar.style.animation = "none"; }
         const currentTransform = parseFloat(this.elements.progressBar.style.transform?.match(/translateX\(([-.\d]+)%\)/)?.[1] || -100);
        const newTransformValue = Math.max(currentTransform, percentage - 100);
        this.elements.progressBar.style.transform = `translateX(${newTransformValue}%)`;
        console.log(`[Loading Progress] Progress set to: ${percentage}%`);
    },

    // --- Attempt to Complete Loading ---
    attemptToCompleteLoading: function (reason) {
         if (this.state.isComplete) return; // Already completed
        console.log(`[Loading Check] Attempting completion (Reason: ${reason}). Conditions: CSS=${this.state.cssVarsReady}, App=${this.state.initialLoadSignaled}, Time=${this.state.minTimeElapsed}`);

        // Conditions: CSS ready, App signaled (success or error), and min time passed OR fallback timeout
        const canComplete = this.state.cssVarsReady &&
                           this.state.initialLoadSignaled &&
                           this.state.minTimeElapsed;
        const fallbackTriggered = reason === "Fallback Timeout";

        if (canComplete || fallbackTriggered) {
            this.completeLoadingSequence(fallbackTriggered ? "Fallback Timeout" : "All conditions met");
        }
    },

    // --- Complete Loading Process (Actual Hiding) ---
    completeLoadingSequence: function (reason) {
        if (this.state.isComplete) return; // Prevent multiple completions
        this.state.isComplete = true; // Set completion flag
        console.log(`[Loading Complete] Completing sequence (${reason}).`);

        // Clear timers
        if (this.state.cssCheckInterval) clearInterval(this.state.cssCheckInterval);
        if (this.state.cssCheckTimeout) clearTimeout(this.state.cssCheckTimeout);
        if (this.state.minTimeTimeout) clearTimeout(this.state.minTimeTimeout);
        if (this.state.fallbackTimeout) clearTimeout(this.state.fallbackTimeout);

        // Ensure progress bar visually hits 100%
        if (this.elements.progressBar) {
            this.elements.progressBar.style.transition = "transform 0.3s ease-in";
            this.elements.progressBar.style.transform = "translateX(0%)";
        }

        // Hide loading overlay smoothly
        if (this.elements.initialLoadingOverlay) {
            this.elements.initialLoadingOverlay.classList.add("loaded");
            const removeOverlay = () => {
                if (this.elements.initialLoadingOverlay?.parentNode) {
                    this.elements.initialLoadingOverlay.remove();
                    console.log("[Loading Complete] Initial loading overlay removed from DOM.");
                }
            };
            this.elements.initialLoadingOverlay.addEventListener("transitionend", removeOverlay, { once: true });
            setTimeout(removeOverlay, 1000); // Safety removal
        }

        // Show the main app container
        if (this.elements.appContainer) {
            this.elements.appContainer.classList.remove("hidden");
            console.log("[Loading Complete] App container made visible.");
        } else {
            console.error("[Loading Complete] App container element not found!");
        }
    },
};

// Add tracking for script load
if (window.trackScriptLoad) { window.trackScriptLoad("loading.js"); }
console.log("Loading Manager module loaded (v2.0.2)");

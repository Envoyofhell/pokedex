/**
 * @file        dex/js/modules/lightbox.js
 * @description Handles opening/closing of lightboxes (Detail, TCG, Generator).
 * @version     1.2.0
 * @date        2025-05-05
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, generator.js (optional for activate call)
 * @dependents   app.js, detailView.js, tcgModule.js, dexGrid.js
 *
 * @changelog
 * v1.2.0 (2025-05-05): Added detailViewSource tracking for return-to-generator flow. Improved element caching and checks.
 * v1.1.0 (2025-05-05): Added global Escape key listener.
 * v1.0.0 (Initial): Basic open/close functions for all lightboxes.
 */

window.DexApp = window.DexApp || {};
window.DexApp.Lightbox = {};

// --- State variables ---
window.DexApp.Lightbox.state = {
    activeDetailLightbox: false,
    activeTcgLightbox: false,
    activeGeneratorLightbox: false,
    detailViewSource: null // Tracks source: 'grid', 'generator', or null
};

// --- DOM Elements Cache ---
window.DexApp.Lightbox.elements = {
    detailLightbox: null, detailCloseButton: null,
    tcgLightbox: null, tcgLightboxCloseButton: null,
    generatorOverlay: null, generatorCloseButton: null,
    randomGeneratorButton: null
};

// --- Initialize Lightbox ---
window.DexApp.Lightbox.initialize = function() {
    console.log("Initializing Lightbox module...");
    this.cacheElements(); // Cache elements on init
    // Basic check if main containers exist
    if (!this.elements.detailLightbox || !this.elements.tcgLightbox || !this.elements.generatorOverlay) {
        console.error("Lightbox Init Failed: One or more main lightbox containers not found in HTML.");
        return; // Stop if critical elements are missing
    }
    this.setupEventListeners();
    console.log("Lightbox module initialized.");
};

// --- Cache DOM Elements ---
window.DexApp.Lightbox.cacheElements = function() {
    this.elements.detailLightbox = document.getElementById('detail-view-lightbox');
    this.elements.detailCloseButton = document.getElementById('detail-close-button');
    this.elements.tcgLightbox = document.getElementById('tcg-lightbox');
    // Use a common ID pattern or check multiple possibilities for close buttons
    this.elements.tcgLightboxCloseButton = document.getElementById('tcg-lightbox-close') || document.getElementById('lightbox-close');
    this.elements.generatorOverlay = document.getElementById('generator-overlay');
    this.elements.generatorCloseButton = document.getElementById('generator-close-button');
    this.elements.randomGeneratorButton = document.getElementById('random-pokemon-button');
};

// --- Setup Event Listeners ---
window.DexApp.Lightbox.setupEventListeners = function() {
    const elements = this.elements;

    // Detail Lightbox
    if (elements.detailLightbox && elements.detailCloseButton) {
        elements.detailCloseButton.addEventListener('click', () => this.closeDetailLightbox());
        elements.detailLightbox.addEventListener('click', (event) => { if (event.target === elements.detailLightbox) this.closeDetailLightbox(); });
    } else { console.warn("Detail lightbox or close button missing."); }

    // TCG Lightbox
    if (elements.tcgLightbox && elements.tcgLightboxCloseButton) {
        elements.tcgLightboxCloseButton.addEventListener('click', () => this.closeTcgLightbox());
        elements.tcgLightbox.addEventListener('click', (event) => { if (event.target === elements.tcgLightbox) this.closeTcgLightbox(); });
    } else { console.warn("TCG lightbox or close button missing."); }

    // Generator Overlay
    if (elements.generatorOverlay && elements.generatorCloseButton) {
        elements.generatorCloseButton.addEventListener('click', () => this.closeGeneratorLightbox());
        elements.generatorOverlay.addEventListener('click', (event) => { if (event.target === elements.generatorOverlay) this.closeGeneratorLightbox(); });
    } else { console.warn("Generator overlay or close button missing."); }

    // Generator Trigger Button
    if (elements.randomGeneratorButton && elements.generatorOverlay) {
        elements.randomGeneratorButton.addEventListener('click', () => this.openGeneratorLightbox());
    } else { console.warn("Generator trigger button or overlay missing."); }

    // Global Escape Key Listener
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Close the topmost active lightbox/overlay
            if (this.state.activeDetailLightbox) this.closeDetailLightbox();
            else if (this.state.activeTcgLightbox) this.closeTcgLightbox();
            else if (this.state.activeGeneratorLightbox) this.closeGeneratorLightbox();
        }
    });
};

// --- Visibility Toggle Helper ---
/**
 * Handles the common logic for showing/hiding overlays with transitions.
 * @param {HTMLElement | null} element - The overlay element.
 * @param {boolean} show - True to show, false to hide.
 * @param {string} stateFlag - The corresponding state flag name (e.g., 'activeDetailLightbox').
 */
window.DexApp.Lightbox.toggleOverlayVisibility = function(element, show, stateFlag) {
    if (!element) {
        console.warn(`Cannot toggle visibility: Element for ${stateFlag} not found.`);
        return;
    }

    const state = window.DexApp.Lightbox.state;

    if (show) {
        state[stateFlag] = true; // Set state flag immediately
        element.classList.remove('hidden');
        // Use rAF to ensure 'hidden' is removed before adding 'visible'
        requestAnimationFrame(() => {
            element.classList.add('visible'); // Trigger fade-in
        });
        // Prevent body scroll only if this is the *first* overlay being opened
        if (!this.isAnyOverlayActiveExcept(stateFlag)) {
            document.body.style.overflow = 'hidden';
        }
    } else {
        state[stateFlag] = false; // Set state flag immediately
        element.classList.remove('visible'); // Trigger fade-out
        // Add 'hidden' after transition ends
        element.addEventListener('transitionend', () => {
            // Check state flag again in case it was reopened quickly
            if (!state[stateFlag]) {
                element.classList.add('hidden');
            }
        }, { once: true });
        // Fallback timeout
        setTimeout(() => { if (!state[stateFlag]) element.classList.add('hidden'); }, 500);

        // Restore body scroll ONLY if *no other* overlays remain active
        if (!this.isAnyOverlayActive()) {
            document.body.style.overflow = '';
        }
    }
};

/** Checks if any lightbox/overlay is currently active. */
window.DexApp.Lightbox.isAnyOverlayActive = function() {
    return this.state.activeDetailLightbox || this.state.activeTcgLightbox || this.state.activeGeneratorLightbox;
};

/** Checks if any overlay *other than* the specified one is active. */
window.DexApp.Lightbox.isAnyOverlayActiveExcept = function(flagToExclude) {
    for (const flag in this.state) {
        // Check boolean flags only, exclude the one passed in
        if (typeof this.state[flag] === 'boolean' && flag !== flagToExclude && this.state[flag]) {
            return true;
        }
    }
    return false;
};


// --- Detail Lightbox Functions ---
window.DexApp.Lightbox.openDetailLightbox = function(source = null) {
    console.log(`Opening detail lightbox (Source: ${source || 'unknown'})...`);
    this.state.detailViewSource = source; // Store source for close logic
    this.toggleOverlayVisibility(this.elements.detailLightbox, true, 'activeDetailLightbox');
};

window.DexApp.Lightbox.closeDetailLightbox = function() {
    console.log("Closing detail lightbox...");
    const source = this.state.detailViewSource;
    this.state.detailViewSource = null; // Reset source

    // Check if we should return to the generator
    if (source === 'generator' && this.state.activeGeneratorLightbox) {
        console.log("Detail view closed, generator overlay remains active.");
        // Just hide the detail view, don't restore body scroll yet
        this.toggleOverlayVisibility(this.elements.detailLightbox, false, 'activeDetailLightbox');
        // Important: We specifically set the state flag to false here, but don't call the full close logic
        // which might restore body scroll prematurely.
        this.state.activeDetailLightbox = false;
    } else {
        // Normal close: hide overlay and potentially restore body scroll
        this.toggleOverlayVisibility(this.elements.detailLightbox, false, 'activeDetailLightbox');
    }
};

// --- TCG Lightbox Functions ---
window.DexApp.Lightbox.openTcgLightbox = function(cardData) {
    const lightbox = this.elements.tcgLightbox; if (!lightbox || !cardData) return;
    console.log(`Opening TCG lightbox for: ${cardData.name}`);
    // Populate content... (ensure elements exist)
    const nameEl = document.getElementById('lightbox-card-name');
    const imageEl = document.getElementById('lightbox-card-image');
    const detailsEl = document.getElementById('lightbox-card-details');
    if (nameEl) nameEl.textContent = cardData.name || 'Card Details';
    if (imageEl) { /* ... set src, alt, onerror ... */ }
    if (detailsEl && window.DexApp.TCG?.generateCardDetailsHtml) { detailsEl.innerHTML = window.DexApp.TCG.generateCardDetailsHtml(cardData); }
    else if (detailsEl) { detailsEl.innerHTML = '<p>Details unavailable.</p>'; }
    // Show overlay
    this.toggleOverlayVisibility(lightbox, true, 'activeTcgLightbox');
};

window.DexApp.Lightbox.closeTcgLightbox = function() {
    console.log("Closing TCG lightbox...");
    // Reset content
    const imageEl = document.getElementById('lightbox-card-image');
    const detailsEl = document.getElementById('lightbox-card-details');
    if (imageEl) imageEl.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    if (detailsEl) detailsEl.innerHTML = '<p>Loading details...</p>';
    // Hide overlay
    this.toggleOverlayVisibility(this.elements.tcgLightbox, false, 'activeTcgLightbox');
};

// --- Generator Lightbox Functions ---
window.DexApp.Lightbox.openGeneratorLightbox = function() {
    console.log("Opening generator overlay...");
    this.toggleOverlayVisibility(this.elements.generatorOverlay, true, 'activeGeneratorLightbox');
    // Activate generator module logic
    if (window.DexApp.Generator?.activate) window.DexApp.Generator.activate();
};

window.DexApp.Lightbox.closeGeneratorLightbox = function() {
    console.log("Closing generator overlay...");
    this.toggleOverlayVisibility(this.elements.generatorOverlay, false, 'activeGeneratorLightbox');
};

console.log("Lightbox module loaded (v1.2.0)");

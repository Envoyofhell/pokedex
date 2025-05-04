/**
 * @file        dex/js/modules/utils.js
 * @description Utility functions and helpers for the Pokédex application.
 * @version     1.2.1
 * @date        2025-05-03
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies constants.js (for FOSSIL_POKEMON_IDS - ensure constants.js is loaded first)
 * @dependents   api.js, dexGrid.js, detailView.js, generator.js, app.js
 *
 * @changelog
 * v1.2.1 (2025-05-03): Removed redundant Constant definitions. Constants should be defined in constants.js.
 * v1.2.0 (2025-05-05): Added FOSSIL_POKEMON_IDS constant. Improved documentation.
 * v1.1.0 (2025-05-05): Added getRegionNameForGen, updated GENERATION_RANGES.
 * v1.0.0 (Initial): Basic formatters, constants, UI helpers, storage utils.
 */

// Establish the main application namespace if it doesn't exist
window.DexApp = window.DexApp || {};

// Create the Utils namespace
window.DexApp.Utils = {};

// --- Constants defined HERE are REMOVED ---
// All constants (GENERATION_RANGES, POKEMON_TYPES, TCG_TYPES, etc.)
// should now be defined ONLY in constants.js


// --- Formatting Helpers ---
window.DexApp.Utils.formatters = {
    /**
     * Cleans flavor text by removing line breaks, form feeds, and soft hyphens.
     * @param {string | null | undefined} text - The text to clean.
     * @returns {string} - The cleaned text, or an empty string if input is null/undefined.
     */
    cleanFlavorText: (text) => text ? String(text).replace(/[\n\f\u00ad]/g, ' ') : '',

    /**
     * Capitalizes the first letter of a string. Handles null/undefined input.
     * @param {string | null | undefined} s - The string to capitalize.
     * @returns {string} - The capitalized string, or an empty string.
     */
    capitalize: (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '',

    /**
     * Formats a hyphenated name (like version or move names) into title case.
     * Example: "red-blue" -> "Red Blue"
     * @param {string | null | undefined} name - The hyphenated name.
     * @returns {string} - The formatted name, or an empty string.
     */
    formatVersionName: (name) => name ? String(name).split('-').map(window.DexApp.Utils.formatters.capitalize).join(' ') : '',

    /**
     * Formats a hyphenated Pokemon or item name into title case.
     * Example: "charizard-mega-x" -> "Charizard Mega X"
     * @param {string | null | undefined} name - The name to format.
     * @returns {string} - The formatted name, or an empty string.
     */
    formatName: (name) => name ? String(name).split('-').map(window.DexApp.Utils.formatters.capitalize).join(' ') : '',

    /**
     * Extracts the numeric ID from a PokeAPI resource URL.
     * Example: "https://pokeapi.co/api/v2/pokemon-species/25/" -> 25
     * @param {string | null | undefined} url - The PokeAPI URL.
     * @returns {number | null} - The extracted ID or null if URL is invalid or ID is not numeric.
     */
    getPokemonIdFromUrl: (url) => {
        if (!url || typeof url !== 'string') return null;
        try {
            const match = url.match(/\/(\d+)\/?$/);
            if (match && match[1]) {
                const parsedId = parseInt(match[1], 10);
                return !isNaN(parsedId) ? parsedId : null;
            }
            return null;
        } catch (e) {
            console.error(`Error parsing ID from URL: ${url}`, e);
            return null;
        }
    },

    /**
     * Gets the canonical region name for a given generation number.
     * Requires window.DexApp.Constants.GENERATION_RANGES to be defined (in constants.js).
     * @param {string | number} genNum - The generation number (e.g., 1, '2').
     * @returns {string} - The region name (e.g., "Kanto") or a generic "Generation X".
     */
    getRegionNameForGen: (genNum) => {
        const genString = String(genNum);
        // Ensure Constants exists before accessing it
        const regionName = window.DexApp.Constants?.GENERATION_RANGES?.[genString]?.name;
        return regionName || `Generation ${genString}`;
    }
};

// --- Random Utilities ---
window.DexApp.Utils.random = {
    /**
     * Gets a random element from an array. Returns undefined for empty arrays.
     * @template T
     * @param {Array<T>} arr - The array.
     * @returns {T | undefined}
     */
    getRandomElement: (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return undefined;
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * @template T
     * @param {Array<T>} arr - The array to shuffle.
     * @returns {Array<T>} - The original array, now shuffled.
     */
      shuffle: (arr) => {
        if (!Array.isArray(arr)) return [];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]]; // ES6 swap
        }
        return arr;
    },

    /**
     * Removes and returns a random element from an array. Modifies the original array.
     * @template T
     * @param {Array<T>} arr - The array to modify.
     * @returns {T | undefined} - The removed element or undefined if array is empty.
     */
    removeRandomElement: (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return undefined;
        const index = Math.floor(Math.random() * arr.length);
        return arr.splice(index, 1)[0];
    }
};

// --- UI Helper Functions ---
window.DexApp.Utils.UI = {
    /**
     * Displays an error message inside a specified container element.
     * @param {HTMLElement | null} container - The DOM element to display the error in.
     * @param {string} message - The error message text.
     */
    showError: (container, message) => {
        if (container instanceof HTMLElement) {
            container.innerHTML = `<div class="pokedex-error-message">${message || 'An unknown error occurred.'}</div>`;
        } else {
            console.error("UI.showError: Invalid container provided.", message);
        }
    },

    /** Shows a loader element (removes 'hidden' class). */
    showLoader: (loaderElement) => {
        if (loaderElement instanceof HTMLElement) loaderElement.classList.remove('hidden');
    },

    /** Hides a loader element (adds 'hidden' class). */
    hideLoader: (loaderElement) => {
        if (loaderElement instanceof HTMLElement) loaderElement.classList.add('hidden');
    },

    /**
     * Creates a styled span element representing a Pokemon type badge.
     * Relies on CSS classes like `.pokemon-card-type` and `.type-[typename]`.
     * @param {string} type - The Pokemon type name (e.g., 'fire', 'water').
     * @returns {HTMLSpanElement} - The created badge element.
     */
    createTypeIcon: (type) => {
        const typeBadge = document.createElement('span');
        const typeLower = String(type).toLowerCase();
        typeBadge.className = `pokemon-card-type type-${typeLower}`;
        typeBadge.textContent = window.DexApp.Utils.formatters.capitalize(typeLower);
        return typeBadge;
    },

    /**
     * Safely updates the text content of a DOM element identified by its ID.
     * @param {string} elementId - The ID of the target element.
     * @param {string} text - The text to set.
     */
    updateElementText: (elementId, text) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.warn(`UI.updateElementText: Element with ID "${elementId}" not found.`);
        }
    }
};

// --- Storage Utilities ---
window.DexApp.Utils.storage = {
    /** Saves data to localStorage, handling potential errors. */
    saveToLocalStorage: (key, data) => {
        if (typeof key !== 'string' || key === '') { console.error("LocalStorage Error: Invalid key provided."); return false; }
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`LocalStorage Error: Failed to save item with key "${key}".`, e);
            if (e.name === 'QuotaExceededError') { alert('Storage limit exceeded. Could not save data.'); }
            return false;
        }
    },

    /** Retrieves and parses data from localStorage, handling potential errors. */
    getFromLocalStorage: (key, defaultValue = null) => {
        if (typeof key !== 'string' || key === '') { console.error("LocalStorage Error: Invalid key provided for retrieval."); return defaultValue; }
        try {
            const data = localStorage.getItem(key);
            return data !== null ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`LocalStorage Error: Failed to retrieve or parse item with key "${key}".`, e);
            return defaultValue;
        }
    }
};

// --- Pokemon Filtering Utilities (Simplified/Heuristics) ---
// These might still be useful elsewhere, but the generator now uses pre-calculated flags.
// Note: These rely on the structure fetched directly from the API, not the pre-processed JSON.
window.DexApp.Utils.pokemonFilters = {
    isLikelyNFE: (d) => d?.fullSpeciesData ? (d.fullSpeciesData.evolves_from_species !== null && !d.fullSpeciesData.is_baby) : false,
    isLikelyFullyEvolved: (d) => d?.fullSpeciesData ? (d.fullSpeciesData.is_legendary || d.fullSpeciesData.is_mythical || (!d.fullSpeciesData.evolves_from_species && !d.fullSpeciesData.is_baby)) : true,
    getEvolutionStage: (d) => { if (!d?.fullSpeciesData) return 0; const s = d.fullSpeciesData; return s.is_baby ? 0 : (s.evolves_from_species !== null ? 1 : 2); }, // Simplified: 0=baby/base, 1=mid, 2=final(heuristic)
    isAlternateForm: (d) => d?.fullSpeciesData && d?.fullPokemonData ? (d.fullPokemonData.id === d.fullSpeciesData.id && d.name !== d.fullSpeciesData.name && !d.name?.includes('-mega') && !d.name?.includes('-gmax')) : false,
    isMegaEvolution: (d) => d?.name?.includes('-mega'),
    isGigantamax: (d) => d?.name?.includes('-gmax'),
    // isFossil requires Constants to be loaded first
    isFossil: (d) => window.DexApp.Constants?.FOSSIL_POKEMON_IDS?.has(d?.id), // Check if Constants exists
    isBaby: (d) => d?.fullSpeciesData?.is_baby,
    isLegendary: (d) => d?.fullSpeciesData?.is_legendary,
    isMythical: (d) => d?.fullSpeciesData?.is_mythical,
    isUltraBeast: (d) => d?.fullSpeciesData?.genera?.some(g => g.language.name === 'en' && g.genus.toLowerCase().includes('ultra beast')),
    isParadox: (d) => d?.name?.includes('-ancient') || d?.name?.includes('-future') || (d?.id > 1008 && d?.id <= 1025) // ID range is approximate
};

console.log("Utils module loaded (v1.2.1 - Constants removed)");

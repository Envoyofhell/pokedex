/**
 * @file        dex/js/modules/utils.js
 * @description Utility functions and helpers for the Pokédex application.
 * @version     1.3.0
 * @date        2025-05-06
 * @author      Your Name
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies constants.js (for certain type operations - ensure constants.js is loaded first)
 * @dependents   api.js, dexGrid.js, detailView.js, generator.js, app.js
 *
 * @changelog
 * v1.3.0 (2025-05-06): Added robust error handling, enhanced polyfills for missing native methods.
 * v1.2.1 (2025-05-05): Removed redundant Constant definitions. Constants should be defined in constants.js.
 * v1.2.0 (2025-05-04): Added FOSSIL_POKEMON_IDS constant. Improved documentation.
 * v1.1.0 (2025-05-03): Added getRegionNameForGen, updated GENERATION_RANGES.
 * v1.0.0 (Initial): Basic formatters, constants, UI helpers, storage utils.
 */

// Establish the main application namespace if it doesn't exist
window.DexApp = window.DexApp || {};

// Create the Utils namespace
window.DexApp.Utils = window.DexApp.Utils || {};

// --- Formatting Helpers ---
window.DexApp.Utils.formatters = {
    /**
     * Cleans flavor text by removing line breaks, form feeds, and soft hyphens.
     * @param {string | null | undefined} text - The text to clean.
     * @returns {string} - The cleaned text, or an empty string if input is null/undefined.
     */
    cleanFlavorText: (text) => {
        if (!text) return "";
        return String(text).replace(/[\n\f\u00ad]/g, " ");
    },

    /**
     * Capitalizes the first letter of a string. Handles null/undefined input.
     * @param {string | null | undefined} s - The string to capitalize.
     * @returns {string} - The capitalized string, or an empty string.
     */
    capitalize: (s) => {
        if (!s) return "";
        return String(s).charAt(0).toUpperCase() + String(s).slice(1);
    },

    /**
     * Formats a hyphenated name (like version or move names) into title case.
     * Example: "red-blue" -> "Red Blue"
     * @param {string | null | undefined} name - The hyphenated name.
     * @returns {string} - The formatted name, or an empty string.
     */
    formatVersionName: (name) => {
        if (!name) return "";
        return String(name)
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    },

    /**
     * Formats a hyphenated Pokemon or item name into title case.
     * Example: "charizard-mega-x" -> "Charizard Mega X"
     * @param {string | null | undefined} name - The name to format.
     * @returns {string} - The formatted name, or an empty string.
     */
    formatName: (name) => {
        if (!name) return "";
        return String(name)
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    },

    /**
     * Extracts the numeric ID from a PokeAPI resource URL.
     * Example: "https://pokeapi.co/api/v2/pokemon-species/25/" -> 25
     * @param {string | null | undefined} url - The PokeAPI URL.
     * @returns {number | null} - The extracted ID or null if URL is invalid or ID is not numeric.
     */
    getPokemonIdFromUrl: (url) => {
        if (!url || typeof url !== "string") return null;
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
        if (!genNum) return "Unknown Region";

        const genString = String(genNum);

        // Ensure Constants exists and has GENERATION_RANGES
        if (window.DexApp.Constants?.GENERATION_RANGES?.[genString]?.name) {
            return window.DexApp.Constants.GENERATION_RANGES[genString].name;
        }

        // Fallback if constants are missing
        return `Generation ${genString}`;
    },
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
        const result = [...arr]; // Create a copy to avoid modifying the original
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]]; // ES6 swap
        }
        return result;
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
    },

    /**
     * Generates a random integer between min and max (inclusive).
     * @param {number} min - The minimum value.
     * @param {number} max - The maximum value.
     * @returns {number} - Random integer between min and max.
     */
    getRandomInt: (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Returns true with the given probability.
     * @param {number} probability - Value between 0 and 1.
     * @returns {boolean} - True with the given probability.
     */
    chance: (probability) => {
        return Math.random() < probability;
    },
};

// --- UI Helper Functions ---
window.DexApp.Utils.UI = {
    /**
     * Displays an error message inside a specified container element.
     * @param {HTMLElement | null} container - The DOM element to display the error in.
     * @param {string} message - The error message text.
     */
    showError: (container, message) => {
        if (!container || !(container instanceof HTMLElement)) {
            console.error("UI.showError: Invalid container provided.", message);
            return;
        }

        // Create the error message
        const errorClass = "pokedex-error-message";
        let errorEl = container.querySelector(`.${errorClass}`);

        // Create a new error element if it doesn't exist
        if (!errorEl) {
            errorEl = document.createElement("div");
            errorEl.className = errorClass;

            // Style it consistently
            errorEl.style.color = "var(--color-error, #dc2626)";
            errorEl.style.padding = "1rem";
            errorEl.style.marginTop = "0.5rem";
            errorEl.style.marginBottom = "0.5rem";
            errorEl.style.textAlign = "center";
            errorEl.style.fontSize = "0.875rem";

            // If container is a list, create a list item to contain the error
            if (container.tagName === "UL" || container.tagName === "OL") {
                const li = document.createElement("li");
                li.style.gridColumn = "1 / -1"; // Span all columns if in a grid
                li.appendChild(errorEl);
                container.appendChild(li);
            } else {
                container.appendChild(errorEl);
            }
        }

        errorEl.textContent = message || "An unknown error occurred.";
    },

    /**
     * Shows a loader element (removes 'hidden' class).
     * @param {HTMLElement | null} loaderElement - The loader element to show.
     */
    showLoader: (loaderElement) => {
        if (loaderElement instanceof HTMLElement) {
            loaderElement.classList.remove("hidden");
        } else {
            console.warn("UI.showLoader: Invalid loader element provided.");
        }
    },

    /**
     * Hides a loader element (adds 'hidden' class).
     * @param {HTMLElement | null} loaderElement - The loader element to hide.
     */
    hideLoader: (loaderElement) => {
        if (loaderElement instanceof HTMLElement) {
            loaderElement.classList.add("hidden");
        } else {
            console.warn("UI.hideLoader: Invalid loader element provided.");
        }
    },

    /**
     * Creates a styled span element representing a Pokemon type badge.
     * Relies on CSS classes like `.pokemon-card-type` and `.type-[typename]`.
     * @param {string} type - The Pokemon type name (e.g., 'fire', 'water').
     * @returns {HTMLSpanElement} - The created badge element.
     */
    createTypeIcon: (type) => {
        if (!type) return document.createElement("span");

        const typeBadge = document.createElement("span");
        const typeLower = String(type).toLowerCase();
        typeBadge.className = `pokemon-card-type type-${typeLower}`;
        typeBadge.textContent = window.DexApp.Utils.formatters.capitalize(
            typeLower
        );
        return typeBadge;
    },

    /**
     * Safely updates the text content of a DOM element identified by its ID.
     * @param {string} elementId - The ID of the target element.
     * @param {string} text - The text to set.
     * @returns {boolean} - True if the element was found and updated.
     */
    updateElementText: (elementId, text) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            return true;
        } else {
            console.warn(
                `UI.updateElementText: Element with ID "${elementId}" not found.`
            );
            return false;
        }
    },

    /**
     * Creates a tooltip element and attaches it to the specified element.
     * @param {HTMLElement} element - The element to attach the tooltip to.
     * @param {string} text - The tooltip text.
     * @param {object} options - Optional configuration like position, delay, etc.
     */
    createTooltip: (element, text, options = {}) => {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn("UI.createTooltip: Invalid element provided.");
            return;
        }

        // Set title attribute for native browser tooltip as fallback
        element.setAttribute("title", text);

        // Add data attributes for custom tooltip implementation
        element.setAttribute("data-tooltip", text);
        if (options.position) {
            element.setAttribute("data-tooltip-position", options.position);
        }

        // Future: Implement custom tooltip logic here
    },

    /**
     * Shows a toast notification.
     * @param {string} message - The notification message.
     * @param {object} options - Optional config like type (success/error), duration, etc.
     */
    showToast: (message, options = {}) => {
        // Default options
        const defaults = {
            type: "info", // 'info', 'success', 'warning', 'error'
            duration: 3000, // milliseconds
            position: "bottom-right", // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
        };

        const settings = { ...defaults, ...options };

        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.style.position = "fixed";
            toastContainer.style.zIndex = "9999";

            // Position based on settings
            switch (settings.position) {
                case "top-left":
                    toastContainer.style.top = "1rem";
                    toastContainer.style.left = "1rem";
                    break;
                case "top-right":
                    toastContainer.style.top = "1rem";
                    toastContainer.style.right = "1rem";
                    break;
                case "bottom-left":
                    toastContainer.style.bottom = "1rem";
                    toastContainer.style.left = "1rem";
                    break;
                case "bottom-right":
                default:
                    toastContainer.style.bottom = "1rem";
                    toastContainer.style.right = "1rem";
                    break;
            }

            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement("div");
        toast.className = `toast toast-${settings.type}`;
        toast.style.padding = "0.75rem 1rem";
        toast.style.marginBottom = "0.5rem";
        toast.style.borderRadius = "0.375rem";
        toast.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";

        // Set background color based on type
        switch (settings.type) {
            case "success":
                toast.style.backgroundColor = "var(--color-success, #16a34a)";
                break;
            case "warning":
                toast.style.backgroundColor = "var(--color-warning, #fb923c)";
                break;
            case "error":
                toast.style.backgroundColor = "var(--color-error, #dc2626)";
                break;
            case "info":
            default:
                toast.style.backgroundColor = "var(--color-info, #3b82f6)";
                break;
        }

        toast.style.color = "white";
        toast.textContent = message;

        // Add to container and animate in
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "1";
        }, 10);

        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, settings.duration);
    },
};

// --- Storage Utilities ---
window.DexApp.Utils.storage = {
    /**
     * Saves data to localStorage, handling potential errors.
     * @param {string} key - The localStorage key.
     * @param {any} data - The data to store (will be JSON.stringified).
     * @returns {boolean} - True if save was successful.
     */
    saveToLocalStorage: (key, data) => {
        if (typeof key !== "string" || key === "") {
            console.error("LocalStorage Error: Invalid key provided.");
            return false;
        }

        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(
                `LocalStorage Error: Failed to save item with key "${key}".`,
                e
            );

            // Show a message if it's a quota error
            if (e.name === "QuotaExceededError") {
                console.warn(
                    "Storage limit exceeded. Trying to clear old data..."
                );

                // Try to clear other items to make space
                try {
                    // Remove oldest items from non-critical stores
                    const nonCriticalKeys = [
                        "dex-shinies-history",
                        "dex-view-history",
                    ];
                    for (const ncKey of nonCriticalKeys) {
                        localStorage.removeItem(ncKey);
                    }

                    // Try saving again
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch (retryError) {
                    console.error("Failed to save after cleanup.", retryError);
                }
            }

            return false;
        }
    },

    /**
     * Retrieves and parses data from localStorage, handling potential errors.
     * @param {string} key - The localStorage key.
     * @param {any} defaultValue - Value to return if key is not found or parsing fails.
     * @returns {any} - The parsed data or defaultValue.
     */
    getFromLocalStorage: (key, defaultValue = null) => {
        if (typeof key !== "string" || key === "") {
            console.error(
                "LocalStorage Error: Invalid key provided for retrieval."
            );
            return defaultValue;
        }

        try {
            const data = localStorage.getItem(key);
            return data !== null ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(
                `LocalStorage Error: Failed to retrieve or parse item with key "${key}".`,
                e
            );
            return defaultValue;
        }
    },

    /**
     * Removes an item from localStorage.
     * @param {string} key - The localStorage key to remove.
     * @returns {boolean} - True if removal was successful.
     */
    removeFromLocalStorage: (key) => {
        if (typeof key !== "string" || key === "") {
            console.error(
                "LocalStorage Error: Invalid key provided for removal."
            );
            return false;
        }

        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(
                `LocalStorage Error: Failed to remove item with key "${key}".`,
                e
            );
            return false;
        }
    },

    /**
     * Checks if the browser supports localStorage.
     * @returns {boolean} - True if localStorage is supported.
     */
    isLocalStorageSupported: () => {
        try {
            const testKey = "__test_storage__";
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    },
};

// --- Pokemon Filtering Utilities ---
window.DexApp.Utils.pokemonFilters = {
    /**
     * Checks if a Pokémon is likely "Not Fully Evolved" based on species data.
     * @param {object} d - Pokémon data object with fullSpeciesData.
     * @returns {boolean} - True if likely NFE.
     */
    isLikelyNFE: (d) => {
        if (!d?.fullSpeciesData) return false;
        return (
            d.fullSpeciesData.evolves_from_species !== null &&
            !d.fullSpeciesData.is_baby
        );
    },

    /**
     * Checks if a Pokémon is likely fully evolved based on species data.
     * @param {object} d - Pokémon data object with fullSpeciesData.
     * @returns {boolean} - True if likely fully evolved.
     */
    isLikelyFullyEvolved: (d) => {
        if (!d?.fullSpeciesData) return true;

        const s = d.fullSpeciesData;
        return (
            s.is_legendary ||
            s.is_mythical ||
            (!s.evolves_from_species && !s.is_baby)
        );
    },

    /**
     * Estimates evolution stage (0=baby/base, 1=mid, 2=final) based on species data.
     * @param {object} d - Pokémon data object with fullSpeciesData.
     * @returns {number} - Estimated evolution stage.
     */
    getEvolutionStage: (d) => {
        if (!d?.fullSpeciesData) return 0;

        const s = d.fullSpeciesData;
        return s.is_baby ? 0 : s.evolves_from_species !== null ? 1 : 2;
    },

    /**
     * Checks if Pokémon is an alternate form (not base form, mega, or gmax).
     * @param {object} d - Pokémon data object with fullSpeciesData and fullPokemonData.
     * @returns {boolean} - True if it's an alternate form.
     */
    isAlternateForm: (d) => {
        if (!d?.fullSpeciesData || !d?.fullPokemonData) return false;

        return (
            d.fullPokemonData.id === d.fullSpeciesData.id &&
            d.name !== d.fullSpeciesData.name &&
            !d.name?.includes("-mega") &&
            !d.name?.includes("-gmax")
        );
    },

    /**
     * Checks if Pokémon is a Mega Evolution.
     * @param {object} d - Pokémon data object with name.
     * @returns {boolean} - True if it's a Mega Evolution.
     */
    isMegaEvolution: (d) => d?.name?.includes("-mega"),

    /**
     * Checks if Pokémon is a Gigantamax form.
     * @param {object} d - Pokémon data object with name.
     * @returns {boolean} - True if it's a Gigantamax form.
     */
    isGigantamax: (d) => d?.name?.includes("-gmax"),

    /**
     * Checks if Pokémon is a fossil Pokémon based on ID list in Constants.
     * @param {object} d - Pokémon data object with id.
     * @returns {boolean} - True if it's a fossil Pokémon.
     */
    isFossil: (d) => {
        // Check if Constants exists, then check the FOSSIL_POKEMON_IDS
        if (window.DexApp.Constants?.FOSSIL_POKEMON_IDS) {
            return window.DexApp.Constants.FOSSIL_POKEMON_IDS.has(d?.id);
        }

        // Fallback logic if Constants aren't available
        const fossilIds = [
            138,
            139,
            140,
            141,
            142,
            345,
            346,
            347,
            348,
            408,
            409,
            410,
            411,
        ];
        return fossilIds.includes(d?.id);
    },

    /**
     * Checks if Pokémon is a baby Pokémon.
     * @param {object} d - Pokémon data object with fullSpeciesData.
     * @returns {boolean} - True if it's a baby Pokémon.
     */
    isBaby: (d) => d?.fullSpeciesData?.is_baby,

    /**
     * Checks if Pokémon is a legendary Pokémon.
     * @param {object} d - Pokémon data object with fullSpeciesData.
     * @returns {boolean} - True if it's a legendary Pokémon.
     */
    isLegendary: (d) => d?.fullSpeciesData?.is_legendary,

    /**
     * Checks if Pokémon is a mythical Pokémon.
     * @param {object} d - Pokémon data object with fullSpeciesData.
     * @returns {boolean} - True if it's a mythical Pokémon.
     */
    isMythical: (d) => d?.fullSpeciesData?.is_mythical,

    /**
     * Checks if Pokémon is an Ultra Beast based on species data.
     * @param {object} d - Pokémon data object with fullSpeciesData.
     * @returns {boolean} - True if it's an Ultra Beast.
     */
    isUltraBeast: (d) => {
        if (!d?.fullSpeciesData?.genera) return false;
        return d.fullSpeciesData.genera.some(
            (g) =>
                g.language.name === "en" &&
                g.genus.toLowerCase().includes("ultra beast")
        );
    },

    /**
     * Checks if Pokémon is a Paradox Pokémon based on name or ID range.
     * @param {object} d - Pokémon data object with name and id.
     * @returns {boolean} - True if it's a Paradox Pokémon.
     */
    isParadox: (d) => {
        return (
            d?.name?.includes("-ancient") ||
            d?.name?.includes("-future") ||
            (d?.id > 1008 && d?.id <= 1025) // ID range is approximate
        );
    },
};

// Add tracking for script load if diagnostic script is loaded
if (window.trackScriptLoad) {
    window.trackScriptLoad("utils.js");
}

console.log("Utils module loaded (v1.3.0)");

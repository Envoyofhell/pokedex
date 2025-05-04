/**
 * @file        dex/js/modules/api.js
 * @description API request functions (PokeAPI, TCGAPI) and caching layer.
 * @version     1.3.0
 * @date        2025-05-06
 * @author      Your Name
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js
 * @dependents   dexGrid.js, detailView.js, generator.js, app.js
 *
 * @changelog
 * v1.3.0 (2025-05-06): Added proper dependency checks, improved error handling, enhanced cache management.
 * v1.2.0 (2025-05-05): Improved error handling in fetchAPI, refined caching strategy.
 * v1.1.0 (2025-05-04): Added species caching, refined detailed data fetching.
 * v1.0.0 (Initial): Basic fetch functions for PokeAPI and TCGAPI.
 */

window.DexApp = window.DexApp || {};
window.DexApp.API = window.DexApp.API || {};

// --- Cache Objects (Initialized here, managed by functions) ---
window.DexApp.Cache = window.DexApp.Cache || {
    fullPokemonListCache: {}, // Key: genNumber | 'all', Value: [{id, name, url}, ...]
    detailedPokemonCache: {}, // Key: identifier (id or name), Value: combinedDetailedData
    speciesDataCache: {}, // Key: speciesUrl, Value: speciesApiData
    typeDataCache: {}, // Key: typeName, Value: [{id, name, url}, ...]
    tcgSetsCache: null, // Value: [ {setApiData}, ... ]
    allPokemonSpeciesList: null, // Value: [{id, name, url}, ...]
    evolutionChainCache: {}, // Key: chainId, Value: evolutionChainApiData (Optional)
};

// --- API Configuration ---
// Get API base URLs from Constants if available, otherwise use defaults
const POKEAPI_BASE =
    window.DexApp.Constants?.POKEAPI_BASE_URL || "https://pokeapi.co/api/v2";
const TCGAPI_BASE =
    window.DexApp.Constants?.TCGAPI_BASE_URL || "https://api.pokemontcg.io/v2";

// IMPORTANT: Replace with your actual TCG API Key or implement a backend proxy solution.
// Leaving API keys exposed client-side is a security risk.
window.DexApp.API.TCG_API_KEY = "a65acbfc-55e5-4d2c-9278-253872a1bc5a"; // Example Key Only
const REQUEST_TIMEOUT = window.DexApp.Constants?.API_REQUEST_TIMEOUT || 15000; // 15 seconds timeout for API requests

// --- Check if Dependencies Exist ---
window.DexApp.API.checkDependencies = function () {
    const missingDeps = [];

    // Check for Utils module
    if (!window.DexApp.Utils) {
        missingDeps.push("Utils");
    } else {
        // Check for specific Utils functions we need
        if (!window.DexApp.Utils.formatters?.getPokemonIdFromUrl) {
            missingDeps.push("Utils.formatters.getPokemonIdFromUrl");
        }
    }

    // Check for Constants module (optional but recommended)
    if (!window.DexApp.Constants) {
        console.warn(
            "API module: Constants module not found. Using default values."
        );
    }

    if (missingDeps.length > 0) {
        console.error(
            `API module is missing dependencies: ${missingDeps.join(", ")}`
        );
        return false;
    }

    return true;
};

// --- API Fetch Helper with Timeout and Error Handling ---
/**
 * Generic fetch wrapper with timeout and improved error handling.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options (e.g., headers).
 * @param {string} resourceName - Name of the resource for error messages.
 * @returns {Promise<object|null>} - The parsed JSON data or null for empty responses.
 * @throws {Error} - Throws an error if the fetch fails, times out, or response is not ok.
 */
async function fetchAPI(url, options = {}, resourceName = "resource") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal, // Add abort signal
        });
        clearTimeout(timeoutId); // Clear timeout if fetch completes

        if (!response.ok) {
            let errorMsg = `(${response.status}) ${response.statusText}`;
            try {
                const errorData = await response.text();
                if (
                    response.status === 404 &&
                    errorData.toLowerCase() === "not found"
                ) {
                    errorMsg = `Data for "${resourceName}" not found (404).`;
                } else {
                    try {
                        const jsonData = JSON.parse(errorData);
                        errorMsg = `(${response.status}): ${
                            jsonData?.error?.message || errorData
                        }`;
                    } catch (jsonError) {
                        errorMsg = `(${response.status}): ${
                            errorData || response.statusText
                        }`;
                    }
                }
            } catch (e) {
                /* Ignore parsing errors */
            }
            throw new Error(`API Error fetching ${resourceName}: ${errorMsg}`);
        }

        if (response.status === 204) return null; // Handle No Content

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId); // Clear timeout on error too
        if (error.name === "AbortError") {
            console.error(`Fetch timed out for ${url}`);
            throw new Error(
                `Request for ${resourceName} timed out after ${
                    REQUEST_TIMEOUT / 1000
                } seconds.`
            );
        }
        console.error(`Fetch failed for ${url}:`, error);
        throw new Error(
            `Network or fetch error for ${resourceName}: ${error.message}`
        );
    }
}

// --- PokeAPI Requests ---

/**
 * Fetches the list of all Pokemon species (basic info: id, name, url). Caches result.
 * @returns {Promise<Array<object>>} - Array of Pokemon species with id, name, url.
 */
window.DexApp.API.fetchAllPokemonSpecies = async function () {
    if (window.DexApp.Cache.allPokemonSpeciesList) {
        return window.DexApp.Cache.allPokemonSpeciesList;
    }

    console.log("Fetching all Pokémon species list...");

    // Get generation ranges from Constants or use default
    const range = window.DexApp.Constants?.GENERATION_RANGES?.all || {
        limit: 1025,
        offset: 0,
    };

    // Fetch a large limit to try and get all species
    const url = `${POKEAPI_BASE}/pokemon-species?limit=${range.limit}&offset=${range.offset}`;

    try {
        const data = await fetchAPI(url, {}, "all species list");
        if (!data?.results)
            throw new Error("Invalid data format received for species list.");

        // Use Utils if available, otherwise process manually
        if (window.DexApp.Utils?.formatters?.getPokemonIdFromUrl) {
            window.DexApp.Cache.allPokemonSpeciesList = data.results
                .map((species) => {
                    const id = window.DexApp.Utils.formatters.getPokemonIdFromUrl(
                        species.url
                    );
                    // We need the pokemon URL for fetching detailed data later
                    return id
                        ? {
                              id,
                              name: species.name,
                              url: `${POKEAPI_BASE}/pokemon/${id}`,
                          }
                        : null;
                })
                .filter((p) => p !== null && p.id <= range.limit) // Filter nulls and potentially invalid high IDs
                .sort((a, b) => a.id - b.id);
        } else {
            // Manual processing if Utils not available
            window.DexApp.Cache.allPokemonSpeciesList = data.results
                .map((species) => {
                    // Extract ID from URL manually
                    const match = species.url.match(/\/(\d+)\/?$/);
                    const id =
                        match && match[1] ? parseInt(match[1], 10) : null;

                    return id
                        ? {
                              id,
                              name: species.name,
                              url: `${POKEAPI_BASE}/pokemon/${id}`,
                          }
                        : null;
                })
                .filter((p) => p !== null && p.id <= range.limit)
                .sort((a, b) => a.id - b.id);
        }

        console.log(
            `Fetched ${window.DexApp.Cache.allPokemonSpeciesList.length} species.`
        );
        return window.DexApp.Cache.allPokemonSpeciesList;
    } catch (error) {
        console.error("Error fetching all species:", error);

        // Show UI error if Utils is available
        if (window.DexApp.Utils?.UI?.showError) {
            const gridEl = document.getElementById("pokedex-grid");
            if (gridEl) {
                window.DexApp.Utils.UI.showError(
                    gridEl,
                    "Failed to load full Pokémon list."
                );
            }
        }

        return [];
    }
};

/**
 * Fetches the list of Pokemon species for a specific generation. Caches result.
 * @param {string|number} genNumber - Generation number or 'all'.
 * @returns {Promise<Array<object>>} - Array of Pokemon for the generation.
 */
window.DexApp.API.fetchGenerationList = async function (genNumber) {
    if (genNumber === "all" || !genNumber) {
        return await window.DexApp.API.fetchAllPokemonSpecies();
    }

    const cacheKey = String(genNumber);
    if (window.DexApp.Cache.fullPokemonListCache[cacheKey]) {
        return window.DexApp.Cache.fullPokemonListCache[cacheKey];
    }

    console.log(`Fetching list for Gen ${genNumber}`);
    const url = `${POKEAPI_BASE}/generation/${genNumber}`;

    try {
        const data = await fetchAPI(url, {}, `Generation ${genNumber} list`);
        if (!data?.pokemon_species)
            throw new Error("Invalid data format for generation list.");

        // Process pokemon list
        let pokemonList;

        // Use Utils if available
        if (window.DexApp.Utils?.formatters?.getPokemonIdFromUrl) {
            pokemonList = data.pokemon_species
                .map((species) => {
                    const id = window.DexApp.Utils.formatters.getPokemonIdFromUrl(
                        species.url
                    );
                    return id
                        ? {
                              id,
                              name: species.name,
                              url: `${POKEAPI_BASE}/pokemon/${id}`,
                          }
                        : null;
                })
                .filter((p) => p !== null)
                .sort((a, b) => a.id - b.id);
        } else {
            // Manual processing if Utils not available
            pokemonList = data.pokemon_species
                .map((species) => {
                    // Extract ID from URL manually
                    const match = species.url.match(/\/(\d+)\/?$/);
                    const id =
                        match && match[1] ? parseInt(match[1], 10) : null;

                    return id
                        ? {
                              id,
                              name: species.name,
                              url: `${POKEAPI_BASE}/pokemon/${id}`,
                          }
                        : null;
                })
                .filter((p) => p !== null)
                .sort((a, b) => a.id - b.id);
        }

        window.DexApp.Cache.fullPokemonListCache[cacheKey] = pokemonList;
        return pokemonList;
    } catch (error) {
        console.error(`Error fetching Gen ${genNumber} list:`, error);

        // Show UI error if Utils is available
        if (window.DexApp.Utils?.UI?.showError) {
            const gridEl = document.getElementById("pokedex-grid");
            if (gridEl) {
                window.DexApp.Utils.UI.showError(
                    gridEl,
                    `Failed to load Gen ${genNumber}.`
                );
            }
        }

        return [];
    }
};

/**
 * Fetches Pokemon belonging to a specific type. Caches result.
 * @param {string} typeName - The Pokemon type to fetch.
 * @returns {Promise<Array<object>>} - Array of Pokemon of that type.
 */
window.DexApp.API.fetchTypeData = async function (typeName) {
    if (!typeName) return [];

    const cacheKey = typeName.toLowerCase();
    if (window.DexApp.Cache.typeDataCache[cacheKey]) {
        return window.DexApp.Cache.typeDataCache[cacheKey];
    }

    console.log(`Fetching Pokémon for type: ${typeName}`);
    const url = `${POKEAPI_BASE}/type/${cacheKey}`;

    try {
        const data = await fetchAPI(url, {}, `type ${typeName} data`);
        if (!data?.pokemon)
            throw new Error("Invalid data format for type data.");

        let pokemonList;

        // Use Utils if available
        if (window.DexApp.Utils?.formatters?.getPokemonIdFromUrl) {
            pokemonList = data.pokemon
                .map((p) => {
                    const id = window.DexApp.Utils.formatters.getPokemonIdFromUrl(
                        p.pokemon.url
                    );
                    // Filter out forms with very high IDs that might sneak into type lists
                    const maxKnownId =
                        window.DexApp.Constants?.GENERATION_RANGES?.all
                            ?.limit || 1025;
                    return id && id <= maxKnownId
                        ? {
                              id,
                              name: p.pokemon.name,
                              url: p.pokemon.url,
                          }
                        : null;
                })
                .filter((p) => p !== null)
                .sort((a, b) => a.id - b.id);
        } else {
            // Manual processing if Utils not available
            pokemonList = data.pokemon
                .map((p) => {
                    // Extract ID from URL manually
                    const match = p.pokemon.url.match(/\/(\d+)\/?$/);
                    const id =
                        match && match[1] ? parseInt(match[1], 10) : null;

                    // Filter high IDs
                    const maxKnownId =
                        window.DexApp.Constants?.GENERATION_RANGES?.all
                            ?.limit || 1025;
                    return id && id <= maxKnownId
                        ? {
                              id,
                              name: p.pokemon.name,
                              url: p.pokemon.url,
                          }
                        : null;
                })
                .filter((p) => p !== null)
                .sort((a, b) => a.id - b.id);
        }

        window.DexApp.Cache.typeDataCache[cacheKey] = pokemonList;
        return pokemonList;
    } catch (error) {
        console.error(`Error fetching type ${typeName}:`, error);

        // Show UI error if Utils is available
        if (window.DexApp.Utils?.UI?.showError) {
            const gridEl = document.getElementById("pokedex-grid");
            if (gridEl) {
                window.DexApp.Utils.UI.showError(
                    gridEl,
                    `Failed to load type ${typeName}.`
                );
            }
        }

        return [];
    }
};

/**
 * Fetches detailed data (pokemon + species) for a single Pokemon by ID or name.
 * Caches results by identifier, ID, and specific name.
 * @param {string | number} identifier - Pokemon name (lowercase) or National Pokedex ID.
 * @returns {Promise<object|null>} - Combined data object or null on failure.
 */
window.DexApp.API.fetchDetailedPokemonData = async function (identifier) {
    if (!identifier) {
        console.error("Identifier missing for fetchDetailedPokemonData");
        return null;
    }

    const cacheKey = String(identifier).toLowerCase();

    // 1. Check primary cache (identifier used)
    if (window.DexApp.Cache.detailedPokemonCache[cacheKey]) {
        return window.DexApp.Cache.detailedPokemonCache[cacheKey];
    }

    console.log(`Fetching detail for ${identifier}...`);
    const pokemonUrl = `${POKEAPI_BASE}/pokemon/${cacheKey}`;
    let pokemonData = null;
    let speciesData = null;
    let speciesUrl = null;

    try {
        // 2. Fetch Pokemon data
        pokemonData = await fetchAPI(pokemonUrl, {}, `pokemon "${identifier}"`);
        if (!pokemonData?.species?.url) {
            throw new Error(
                `Pokemon data or species URL missing for ${identifier}`
            );
        }

        speciesUrl = pokemonData.species.url;

        // 3. Check/Fetch Species data
        if (window.DexApp.Cache.speciesDataCache[speciesUrl]) {
            speciesData = window.DexApp.Cache.speciesDataCache[speciesUrl];
        } else {
            speciesData = await fetchAPI(
                speciesUrl,
                {},
                `species "${pokemonData.species.name}"`
            );
            if (speciesData) {
                window.DexApp.Cache.speciesDataCache[speciesUrl] = speciesData;
            } else {
                throw new Error(
                    `Species data missing for ${pokemonData.species.name}`
                );
            }
        }

        // 4. Process and Combine Data
        let varieties = [];

        // Process varieties
        if (speciesData.varieties) {
            if (window.DexApp.Utils?.formatters?.formatName) {
                // Use Utils formatName if available
                varieties = speciesData.varieties.map((v) => ({
                    name: window.DexApp.Utils.formatters.formatName(
                        v.pokemon.name
                    ),
                    url: v.pokemon.url,
                    identifier: v.pokemon.name, // Raw identifier for potential fetching
                }));
            } else {
                // Manual formatting if Utils not available
                varieties = speciesData.varieties.map((v) => ({
                    name: v.pokemon.name
                        .split("-")
                        .map(
                            (part) =>
                                part.charAt(0).toUpperCase() + part.slice(1)
                        )
                        .join(" "),
                    url: v.pokemon.url,
                    identifier: v.pokemon.name,
                }));
            }
        }

        // Get reliable sprite URLs for all available image types
        // Note: We are extracting directly from PokeAPI's response for most reliable results
        const officialArtwork =
            pokemonData.sprites?.other?.["official-artwork"]?.front_default;
        const normalSprite = pokemonData.sprites?.front_default;
        const shinySprite = pokemonData.sprites?.front_shiny;
        const femaleSprite = pokemonData.sprites?.front_female;
        const femaleShinySprite = pokemonData.sprites?.front_shiny_female;

        // Fallback URL construction for direct GitHub access if API doesn't provide
        const fallbackOfficialUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`;
        const fallbackNormalUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.id}.png`;

        const combinedData = {
            id: pokemonData.id,
            name: pokemonData.name,
            baseName: speciesData.name,
            // Prioritize artwork, then fallback to direct URLs
            sprite: officialArtwork || fallbackOfficialUrl,
            spriteNormal: normalSprite || fallbackNormalUrl,
            spriteShiny:
                shinySprite ||
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonData.id}.png`,
            spriteFemale: femaleSprite,
            spriteShinyFemale: femaleShinySprite,
            types: pokemonData.types.map((t) => t.type.name),
            fullPokemonData: pokemonData,
            fullSpeciesData: speciesData,
            hasVariants: varieties.length > 1,
            hasGenderSprites: pokemonData.sprites?.front_female !== null,
            varieties: varieties,
            cry: pokemonData.cries?.latest || pokemonData.cries?.legacy || null,
        };

        // 5. Cache results by multiple keys for efficiency
        window.DexApp.Cache.detailedPokemonCache[cacheKey] = combinedData; // Original identifier
        window.DexApp.Cache.detailedPokemonCache[
            String(combinedData.id)
        ] = combinedData; // By ID
        window.DexApp.Cache.detailedPokemonCache[
            combinedData.name
        ] = combinedData; // By specific name

        return combinedData;
    } catch (error) {
        console.error(`Error fetching detailed data for ${identifier}:`, error);
        // Don't cache errors, let subsequent calls retry
        return null; // Return null to indicate failure
    }
};

// --- TCG API Requests ---

/**
 * Fetches TCG card data for a specific Pokemon name, with optional filters.
 * @param {string} pokemonName - The Pokemon name to search for.
 * @param {object} options - Filter options (type, rarity, set).
 * @returns {Promise<Array<object>>} - Array of TCG card data.
 */
window.DexApp.API.fetchTcgData = async function (pokemonName, options = {}) {
    if (!pokemonName) return [];

    // Get loader and error elements
    const tcgLoader = document.getElementById("tcg-loader");
    const tcgErrorDiv = document.getElementById("tcg-error");
    const tcgErrorText = document.getElementById("tcg-error-text");

    // Show loader if Utils is available, otherwise try direct class manipulation
    if (window.DexApp.Utils?.UI?.showLoader && tcgLoader) {
        window.DexApp.Utils.UI.showLoader(tcgLoader);
    } else if (tcgLoader) {
        tcgLoader.classList.remove("hidden");
    }

    // Hide any previous error
    if (tcgErrorDiv) {
        tcgErrorDiv.classList.add("hidden");
    }

    // Verify API key
    if (
        !window.DexApp.API.TCG_API_KEY ||
        window.DexApp.API.TCG_API_KEY === "YOUR_API_KEY"
    ) {
        // Show error if Utils is available
        if (tcgErrorText) {
            tcgErrorText.textContent = "TCG API Key missing or invalid.";
        }

        if (tcgErrorDiv) {
            tcgErrorDiv.classList.remove("hidden");
        }

        // Hide loader
        if (window.DexApp.Utils?.UI?.hideLoader && tcgLoader) {
            window.DexApp.Utils.UI.hideLoader(tcgLoader);
        } else if (tcgLoader) {
            tcgLoader.classList.add("hidden");
        }

        console.warn("TCG API Key missing.");
        return [];
    }

    // Build query: Use exact name match for better accuracy
    let queryParts = [`name:"${pokemonName}"`];
    if (options.type) queryParts.push(`types:"${options.type}"`);
    if (options.rarity) queryParts.push(`rarity:"${options.rarity}"`);
    if (options.set) queryParts.push(`set.id:"${options.set}"`);

    const query = queryParts.join(" ");
    const tcgUrl = `${TCGAPI_BASE}/cards?q=${encodeURIComponent(
        query
    )}&orderBy=-set.releaseDate,number&pageSize=150`;
    console.log("Fetching TCG Data:", tcgUrl);

    try {
        const tcgData = await fetchAPI(
            tcgUrl,
            {
                headers: { "X-Api-Key": window.DexApp.API.TCG_API_KEY },
            },
            `TCG cards for ${pokemonName}`
        );

        const cards = tcgData?.data || [];
        console.log(`Found ${cards.length} TCG cards for ${pokemonName}`);
        return cards;
    } catch (error) {
        console.error("Error fetching TCG data:", error);

        // Show error message
        if (tcgErrorText) {
            tcgErrorText.textContent = `TCG Fetch Error: ${error.message}`;
        }

        if (tcgErrorDiv) {
            tcgErrorDiv.classList.remove("hidden");
        }

        return [];
    } finally {
        // Hide loader
        if (window.DexApp.Utils?.UI?.hideLoader && tcgLoader) {
            window.DexApp.Utils.UI.hideLoader(tcgLoader);
        } else if (tcgLoader) {
            tcgLoader.classList.add("hidden");
        }
    }
};

/**
 * Fetches the list of all TCG sets. Caches result.
 * @returns {Promise<Array<object>>} - Array of TCG set data.
 */
window.DexApp.API.fetchTcgSets = async function () {
    if (window.DexApp.Cache.tcgSetsCache) {
        return window.DexApp.Cache.tcgSetsCache;
    }

    if (
        !window.DexApp.API.TCG_API_KEY ||
        window.DexApp.API.TCG_API_KEY === "YOUR_API_KEY"
    ) {
        console.warn("Cannot fetch TCG sets: API Key missing.");
        return [];
    }

    console.log("Fetching TCG sets...");
    const url = `${TCGAPI_BASE}/sets?orderBy=-releaseDate`;

    try {
        const data = await fetchAPI(
            url,
            {
                headers: { "X-Api-Key": window.DexApp.API.TCG_API_KEY },
            },
            "TCG sets list"
        );

        window.DexApp.Cache.tcgSetsCache = data?.data || [];
        console.log(
            `Fetched ${window.DexApp.Cache.tcgSetsCache.length} TCG sets.`
        );

        // Populate set filter dropdown
        const setFilter = document.getElementById("tcg-set-filter");
        if (setFilter) {
            // Clear current options
            setFilter.innerHTML = '<option value="">All Sets</option>';

            // Add options for each set
            window.DexApp.Cache.tcgSetsCache.forEach((set) => {
                const option = document.createElement("option");
                option.value = set.id;
                option.textContent = `${set.name} (${set.series})`;
                setFilter.appendChild(option);
            });
        } else {
            console.warn("TCG Set filter dropdown element not found.");
        }

        return window.DexApp.Cache.tcgSetsCache;
    } catch (error) {
        console.error("Error fetching TCG sets:", error);
        return [];
    }
};

// --- Cache Management ---
window.DexApp.API.clearCache = function (cacheType = "all") {
    console.log(`Clearing API cache: ${cacheType}`);

    switch (cacheType) {
        case "pokemon":
            window.DexApp.Cache.fullPokemonListCache = {};
            window.DexApp.Cache.detailedPokemonCache = {};
            window.DexApp.Cache.speciesDataCache = {};
            window.DexApp.Cache.allPokemonSpeciesList = null;
            break;
        case "types":
            window.DexApp.Cache.typeDataCache = {};
            break;
        case "tcg":
            window.DexApp.Cache.tcgSetsCache = null;
            break;
        case "evolution":
            window.DexApp.Cache.evolutionChainCache = {};
            break;
        case "all":
        default:
            window.DexApp.Cache = {
                fullPokemonListCache: {},
                detailedPokemonCache: {},
                speciesDataCache: {},
                typeDataCache: {},
                tcgSetsCache: null,
                allPokemonSpeciesList: null,
                evolutionChainCache: {},
            };
            break;
    }
};

// --- Initialization ---
window.DexApp.API.initialize = function () {
    console.log("Initializing API module...");

    // Check for required dependencies
    const depsExist = this.checkDependencies();
    if (!depsExist) {
        console.warn(
            "API module initialized with missing dependencies. Some functions may not work correctly."
        );
    } else {
        console.log("API module dependencies verified.");
    }

    // Early-load the TCG sets if TCG API Key is available
    if (this.TCG_API_KEY && this.TCG_API_KEY !== "YOUR_API_KEY") {
        this.fetchTcgSets().catch((err) => {
            console.warn("Failed to pre-fetch TCG sets:", err);
        });
    }

    console.log("API module initialized.");
    return true;
};

// Add tracking for script load if diagnostic script is loaded
if (window.trackScriptLoad) {
    window.trackScriptLoad("api.js");
}

console.log("API module loaded (v1.3.0)");

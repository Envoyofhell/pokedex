// dex/js/modules/api.js
// API request functions for the Pokédex application

// Create API namespace
window.DexApp = window.DexApp || {};
window.DexApp.API = {};

// --- Cache objects ---
window.DexApp.Cache = {
    fullPokemonListCache: {},
    detailedPokemonCache: {},
    typeDataCache: {},
    tcgSetsCache: null,
    allPokemonSpeciesList: null,
};

// --- API Key ---
window.DexApp.API.TCG_API_KEY = 'a65acbfc-55e5-4d2c-9278-253872a1bc5a'; // <<< --- PUT YOUR POKEMON TCG API KEY HERE --- >>>

// --- API Error Handler ---
window.DexApp.API.handleFetchError = async function(response, resourceName = 'resource') {
    if (response.status === 404) {
        return new Error(`Data for "${resourceName}" not found (404).`);
    }
    try {
        const errorData = await response.json();
        return new Error(`API Error (${response.status}): ${errorData?.error?.message || response.statusText}`);
    } catch (e) {
        return new Error(`API Request Failed (${response.status}): ${response.statusText}`);
    }
};

// --- PokeAPI Requests ---
window.DexApp.API.fetchAllPokemonSpecies = async function() {
    if (window.DexApp.Cache.allPokemonSpeciesList) {
        return window.DexApp.Cache.allPokemonSpeciesList;
    }
    
    console.log("Fetching all Pokémon species list...");
    const range = window.DexApp.Constants.GENERATION_RANGES.all;
    const url = `${window.DexApp.Constants.POKEAPI_BASE_URL}/pokemon-species?limit=${range.limit}&offset=${range.offset}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch all species');
        
        const data = await response.json();
        window.DexApp.Cache.allPokemonSpeciesList = data.results.map(species => ({
            name: species.name,
            id: window.DexApp.Utils.formatters.getPokemonIdFromUrl(species.url),
            url: `${window.DexApp.Constants.POKEAPI_BASE_URL}/pokemon/${window.DexApp.Utils.formatters.getPokemonIdFromUrl(species.url)}`
        })).filter(p => p.id !== null).sort((a, b) => a.id - b.id);
        
        console.log(`Fetched ${window.DexApp.Cache.allPokemonSpeciesList.length} species.`);
        return window.DexApp.Cache.allPokemonSpeciesList;
    } catch (error) {
        console.error("Error fetching all species:", error);
        window.DexApp.Utils.UI.showError(document.getElementById('pokedex-grid'), "Failed to load full Pokémon list.");
        return [];
    }
};

window.DexApp.API.fetchGenerationList = async function(genNumber) {
    if (genNumber === 'all') {
        return await window.DexApp.API.fetchAllPokemonSpecies();
    }
    
    if (window.DexApp.Cache.fullPokemonListCache[genNumber]) {
        return window.DexApp.Cache.fullPokemonListCache[genNumber];
    }
    
    console.log(`Fetching list for Gen ${genNumber}`);
    const url = `${window.DexApp.Constants.POKEAPI_BASE_URL}/generation/${genNumber}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed Gen ${genNumber}`);
        
        const data = await response.json();
        const pokemonList = data.pokemon_species.map(species => ({
            name: species.name,
            id: window.DexApp.Utils.formatters.getPokemonIdFromUrl(species.url),
            url: `${window.DexApp.Constants.POKEAPI_BASE_URL}/pokemon/${window.DexApp.Utils.formatters.getPokemonIdFromUrl(species.url)}`
        })).filter(p => p.id !== null).sort((a, b) => a.id - b.id);
        
        window.DexApp.Cache.fullPokemonListCache[genNumber] = pokemonList;
        return pokemonList;
    } catch (error) {
        console.error(`Error fetching Gen ${genNumber} list:`, error);
        window.DexApp.Utils.UI.showError(document.getElementById('pokedex-grid'), `Failed to load Gen ${genNumber}.`);
        return [];
    }
};

window.DexApp.API.fetchTypeData = async function(typeName) {
    if (window.DexApp.Cache.typeDataCache[typeName]) {
        return window.DexApp.Cache.typeDataCache[typeName];
    }
    
    console.log(`Fetching Pokémon for type: ${typeName}`);
    const url = `${window.DexApp.Constants.POKEAPI_BASE_URL}/type/${typeName}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed type ${typeName}`);
        
        const data = await response.json();
        const pokemonList = data.pokemon.map(p => ({
            name: p.pokemon.name,
            id: window.DexApp.Utils.formatters.getPokemonIdFromUrl(p.pokemon.url),
            url: p.pokemon.url
        })).filter(p => p.id !== null).sort((a, b) => a.id - b.id);
        
        window.DexApp.Cache.typeDataCache[typeName] = pokemonList;
        return pokemonList;
    } catch (error) {
        console.error(`Error fetching type ${typeName}:`, error);
        window.DexApp.Utils.UI.showError(document.getElementById('pokedex-grid'), `Failed to load type ${typeName}.`);
        return [];
    }
};

window.DexApp.API.fetchLocationAreaData = async function(pokemonId) {
    // Fetch location area data for spawn rates
    console.log(`Fetching location data for Pokemon: ${pokemonId}`);
    const url = `${window.DexApp.Constants.POKEAPI_BASE_URL}/pokemon/${pokemonId}/encounters`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch encounter data`);
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching location data:`, error);
        return [];
    }
};

window.DexApp.API.fetchDetailedPokemonData = async function(identifier) {
    const cacheKey = String(identifier).toLowerCase();
    if (window.DexApp.Cache.detailedPokemonCache[cacheKey]) {
        return window.DexApp.Cache.detailedPokemonCache[cacheKey];
    }
    
    console.log(`Fetching detail for ${identifier}`);
    const pokemonUrl = `${window.DexApp.Constants.POKEAPI_BASE_URL}/pokemon/${identifier}`;
    let speciesUrl = null;
    
    try {
        const tempRes = await fetch(pokemonUrl);
        if (!tempRes.ok) throw await window.DexApp.API.handleFetchError(tempRes, identifier);
        
        const tempData = await tempRes.json();
        speciesUrl = tempData.species.url;
    } catch (e) {
        console.warn("Could not determine species URL from name alone for variant fetching", e);
        throw e;
    }
    
    let speciesData = null;
    let varieties = [];
    
    try {
        const [pokemonRes, speciesRes] = await Promise.all([
            fetch(pokemonUrl),
            speciesUrl ? fetch(speciesUrl) : Promise.resolve(null)
        ]);
        
        if (!pokemonRes.ok) throw await window.DexApp.API.handleFetchError(pokemonRes, identifier);
        const pokemonData = await pokemonRes.json();
        
        if (speciesRes && speciesRes.ok) {
            speciesData = await speciesRes.json();
            varieties = speciesData.varieties?.map(v => ({
                name: window.DexApp.Utils.formatters.formatName(v.pokemon.name),
                url: v.pokemon.url,
                identifier: v.pokemon.name
            })) || [];
        } else if (speciesRes) {
            console.warn(`No species data for ${identifier}: ${speciesRes.statusText}`);
        }
        
        // Fetch location data for spawn rates
        const locationData = await window.DexApp.API.fetchLocationAreaData(pokemonData.id);
        
        const hasVariants = varieties.length > 1;
        const hasGenderSprites = pokemonData.sprites.front_female !== null;
        
        const combinedData = {
            id: pokemonData.id,
            name: pokemonData.name,
            baseName: speciesData?.name || pokemonData.name,
            sprite: pokemonData.sprites.other?.home?.front_default || 
                    pokemonData.sprites.other?.['official-artwork']?.front_default || 
                    pokemonData.sprites.front_default || 
                    'https://placehold.co/96x96/cccccc/ffffff?text=?',
            types: pokemonData.types.map(t => t.type.name),
            fullPokemonData: pokemonData,
            fullSpeciesData: speciesData,
            locationData: locationData,
            hasVariants: hasVariants,
            hasGenderSprites: hasGenderSprites,
            varieties: varieties,
            cry: pokemonData.cries?.latest || null
        };
        
        window.DexApp.Cache.detailedPokemonCache[cacheKey] = combinedData;
        return combinedData;
    } catch (error) {
        console.error(`Error fetching detailed data for ${identifier}:`, error);
        throw error;
    }
};

// --- TCG API Requests ---
window.DexApp.API.fetchTcgData = async function(pokemonName, options = {}) {
    const tcgLoader = document.getElementById('tcg-loader');
    const tcgErrorDiv = document.getElementById('tcg-error');
    const tcgErrorText = document.getElementById('tcg-error-text');
    const tcgCardsContainer = document.getElementById('tcg-cards-container');
    
    window.DexApp.Utils.UI.showLoader(tcgLoader);
    if (tcgErrorDiv) tcgErrorDiv.classList.add('hidden');
    if (tcgCardsContainer) tcgCardsContainer.innerHTML = '';
    
    if (window.DexApp.API.TCG_API_KEY === 'YOUR_API_KEY' || !window.DexApp.API.TCG_API_KEY) {
        if (tcgErrorText) tcgErrorText.textContent = "TCG API Key missing or invalid.";
        if (tcgErrorDiv) tcgErrorDiv.classList.remove('hidden');
        window.DexApp.Utils.UI.hideLoader(tcgLoader);
        return [];
    }
    
    // Build query with filters
    let queryParts = [`name:"${pokemonName}"`];
    
    if (options.type) {
        queryParts.push(`types:"${options.type}"`);
    }
    
    if (options.rarity) {
        queryParts.push(`rarity:"${options.rarity}"`);
    }
    
    if (options.set) {
        queryParts.push(`set.id:"${options.set}"`);
    }
    
    const query = queryParts.join(' ');
    const tcgUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate,number&pageSize=150`;
    
    try {
        const response = await fetch(tcgUrl, {
            headers: { 'X-Api-Key': window.DexApp.API.TCG_API_KEY }
        });
        
        if (!response.ok) throw await window.DexApp.API.handleFetchError(response, `TCG cards for ${pokemonName}`);
        
        const tcgData = await response.json();
        const cards = tcgData.data || [];
        
        // Fetch all available TCG sets for filtering if requested
        if (!options.skipSetFetch) {
            await window.DexApp.API.fetchTcgSets();
        }
        
        return cards;
    } catch (error) {
        console.error("Error fetching TCG data:", error);
        if (tcgErrorText) tcgErrorText.textContent = `TCG Fetch Error: ${error.message}`;
        if (tcgErrorDiv) tcgErrorDiv.classList.remove('hidden');
        return [];
    } finally {
        window.DexApp.Utils.UI.hideLoader(tcgLoader);
    }
};

window.DexApp.API.fetchTcgSets = async function() {
    if (window.DexApp.Cache.tcgSetsCache) {
        return window.DexApp.Cache.tcgSetsCache;
    }
    
    try {
        const response = await fetch('https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate', {
            headers: { 'X-Api-Key': window.DexApp.API.TCG_API_KEY }
        });
        
        if (!response.ok) throw new Error('Failed to fetch TCG sets');
        
        const data = await response.json();
        window.DexApp.Cache.tcgSetsCache = data.data || [];
        
        // Populate set filter dropdown
        const setFilter = document.getElementById('tcg-set-filter');
        if (setFilter) {
            setFilter.innerHTML = '<option value="">All Sets</option>';
            window.DexApp.Cache.tcgSetsCache.forEach(set => {
                const option = document.createElement('option');
                option.value = set.id;
                option.textContent = `${set.name} (${set.series})`;
                setFilter.appendChild(option);
            });
        }
        
        return window.DexApp.Cache.tcgSetsCache;
    } catch (error) {
        console.error("Error fetching TCG sets:", error);
        return [];
    }
};
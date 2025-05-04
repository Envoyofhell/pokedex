// scripts/build-pokedex-data.js
import fetch from 'node-fetch'; // Use import for ES Modules
import fs from 'fs/promises'; // Use promises version of file system module
import path from 'path'; // For handling file paths

// --- Configuration ---
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
// Output directory relative to where the script is run (project root typically)
// Adjust this path based on your project structure (e.g., 'public/data')
const OUTPUT_DIR = 'public/data';
const POKEDEX_INDEX_FILE = 'pokedex-index.json';
const MAX_SPECIES = 1025; // Current approximate number of base species in Gen 9
const REQUEST_DELAY_MS = 50; // Delay between API calls to avoid rate limiting

// --- Helper Functions ---

/**
 * Delays execution for a specified duration.
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches data from a URL with basic error handling and delay.
 * @param {string} url - The URL to fetch.
 * @param {number} retries - Number of retries left.
 * @returns {Promise<object|null>} - The fetched JSON data or null on failure.
 */
async function fetchData(url, retries = 3) {
    await delay(REQUEST_DELAY_MS); // Wait before making the request
    try {
        // console.log(`Fetching: ${url}`); // Uncomment for detailed logging
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Warning: Resource not found (404): ${url}`);
                return null; // Treat 404 as non-critical for optional data like evolution chains
            }
            throw new Error(`HTTP error! status: ${response.status} for ${url}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch error for ${url}: ${error.message}`);
        if (retries > 0) {
            console.log(`Retrying (${retries} left)...`);
            await delay(1000 * (4 - retries)); // Exponential backoff delay
            return fetchData(url, retries - 1);
        } else {
            console.error(`Failed to fetch ${url} after multiple retries.`);
            return null; // Return null after final retry fails
        }
    }
}

/**
 * Recursively processes an evolution chain node.
 * @param {object} chainLink - The current node in the evolution chain data.
 * @param {number} currentStage - The current evolution stage (0, 1, 2).
 * @param {Map<string, { stage: number, evolves_to: string[] }>} evolutionMap - Map to store processed evolution data.
 */
function processEvolutionNode(chainLink, currentStage, evolutionMap) {
    if (!chainLink || !chainLink.species) return;

    const speciesName = chainLink.species.name;
    const evolvesToNames = chainLink.evolves_to.map(link => link.species.name);

    // Store the current stage and what it evolves into
    evolutionMap.set(speciesName, { stage: currentStage, evolves_to: evolvesToNames });

    // Recursively process the next links in the chain
    if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
        chainLink.evolves_to.forEach(nextNode => {
            // Only increment stage if it's less than 2
            const nextStage = currentStage < 2 ? currentStage + 1 : currentStage;
            processEvolutionNode(nextNode, nextStage, evolutionMap);
        });
    }
}

/**
 * Fetches and processes all unique evolution chains.
 * @param {Set<string>} chainUrls - A Set of unique evolution chain URLs.
 * @returns {Promise<Map<string, { stage: number, is_fully_evolved: boolean }>>} - Map of species name to evolution details.
 */
async function processAllEvolutionChains(chainUrls) {
    console.log(`Processing ${chainUrls.size} unique evolution chains...`);
    const evolutionDetailsMap = new Map(); // Final map: speciesName -> { stage, is_fully_evolved }
    const intermediateEvolutionMap = new Map(); // Temp map: speciesName -> { stage, evolves_to: [] }

    let count = 0;
    for (const url of chainUrls) {
        count++;
        console.log(`Fetching chain ${count}/${chainUrls.size}: ${url}`);
        const chainData = await fetchData(url);
        if (chainData && chainData.chain) {
            processEvolutionNode(chainData.chain, 0, intermediateEvolutionMap); // Start processing at stage 0
        } else {
            console.warn(`Could not process chain: ${url}`);
        }
    }

    // Second pass: Determine is_fully_evolved based on the intermediate map
    for (const [speciesName, data] of intermediateEvolutionMap.entries()) {
        const isFullyEvolved = data.evolves_to.length === 0; // It's fully evolved if it evolves to nothing
        evolutionDetailsMap.set(speciesName, {
            stage: data.stage,
            is_fully_evolved: isFullyEvolved
        });
    }

    console.log("Finished processing evolution chains.");
    return evolutionDetailsMap;
}

/**
 * Gets the generation number from a generation resource URL.
 * @param {string|null} generationUrl - URL like "https://pokeapi.co/api/v2/generation/1/".
 * @returns {number|null} - The generation number or null.
 */
function getGenerationNumber(generationUrl) {
    if (!generationUrl) return null;
    const match = generationUrl.match(/\/generation\/(\d+)\/?$/);
    return match ? parseInt(match[1], 10) : null;
}


// --- Main Build Function ---
async function buildPokedexData() {
    console.log("Starting Pokédex data build...");
    const allPokemonData = {}; // Store final processed data grouped by generation
    const evolutionChainUrls = new Set(); // Collect unique evolution chain URLs

    // 1. Fetch all species URLs
    console.log("Fetching species list...");
    const speciesListResponse = await fetchData(`${POKEAPI_BASE_URL}/pokemon-species?limit=${MAX_SPECIES}`);
    if (!speciesListResponse || !speciesListResponse.results) {
        throw new Error("Failed to fetch initial species list.");
    }
    const speciesUrls = speciesListResponse.results.map(s => s.url);
    console.log(`Found ${speciesUrls.length} species URLs.`);

    // 2. Fetch details for each species and its varieties
    let speciesCount = 0;
    for (const speciesUrl of speciesUrls) {
        speciesCount++;
        console.log(`Processing species ${speciesCount}/${speciesUrls.length}: ${speciesUrl}`);
        const speciesData = await fetchData(speciesUrl);
        if (!speciesData) continue; // Skip if species fetch failed

        // Collect evolution chain URL
        if (speciesData.evolution_chain?.url) {
            evolutionChainUrls.add(speciesData.evolution_chain.url);
        }

        const generation = getGenerationNumber(speciesData.generation?.url);
        if (!generation) {
            console.warn(`Skipping species ${speciesData.name}: Could not determine generation.`);
            continue;
        }

        // Process each variety (different forms of the species)
        for (const variety of speciesData.varieties) {
            const pokemonUrl = variety.pokemon.url;
            console.log(`  Fetching variety: ${variety.pokemon.name} (${pokemonUrl})`);
            const pokemonData = await fetchData(pokemonUrl);
            if (!pokemonData) continue; // Skip if variety fetch failed

            // Basic structure for this Pokémon variety
            const processedPokemon = {
                id: pokemonData.id,
                name: pokemonData.name,
                speciesName: speciesData.name,
                types: pokemonData.types.map(t => t.type.name),
                sprite: pokemonData.sprites?.other?.home?.front_default || pokemonData.sprites?.other?.['official-artwork']?.front_default || pokemonData.sprites?.front_default || null,
                shinySprite: pokemonData.sprites?.other?.home?.front_shiny || pokemonData.sprites?.other?.['official-artwork']?.front_shiny || pokemonData.sprites?.front_shiny || null,
                femaleSprite: pokemonData.sprites?.other?.home?.front_female || pokemonData.sprites?.other?.['official-artwork']?.front_female || pokemonData.sprites?.front_female || null,
                femaleShinySprite: pokemonData.sprites?.other?.home?.front_shiny_female || pokemonData.sprites?.other?.['official-artwork']?.front_shiny_female || pokemonData.sprites?.front_shiny_female || null,
                generation: generation,
                is_legendary: speciesData.is_legendary || false,
                is_mythical: speciesData.is_mythical || false,
                is_baby: speciesData.is_baby || false,
                gender_rate: speciesData.gender_rate ?? -1,
                // Flags to be calculated/refined later
                is_mega: pokemonData.name.includes('-mega'),
                is_gmax: pokemonData.name.includes('-gmax'),
                is_paradox: pokemonData.name.includes('-ancient') || pokemonData.name.includes('-future'),
                is_primal: pokemonData.name.includes('-primal'), // Added primal check
                is_alternate_form: false, // Will be set below
                is_sublegendary: false, // Requires external definition
                is_ultra_beast: speciesData.genera?.some(g => g.language.name === 'en' && g.genus.toLowerCase().includes('ultra beast')) || false,
                evolution_stage: null, // Will be filled by evolution chain processing
                is_fully_evolved: null // Will be filled by evolution chain processing
            };

            // Refine is_alternate_form flag
            processedPokemon.is_alternate_form = pokemonData.name !== speciesData.name &&
                                                  !processedPokemon.is_mega &&
                                                  !processedPokemon.is_gmax &&
                                                  !processedPokemon.is_primal;


             // Initialize generation array if it doesn't exist
            if (!allPokemonData[generation]) {
                allPokemonData[generation] = [];
            }
            // Add processed data, avoiding duplicates by ID (e.g., if API lists varieties strangely)
            if (!allPokemonData[generation].some(p => p.id === processedPokemon.id)) {
                 allPokemonData[generation].push(processedPokemon);
            } else {
                console.warn(`Duplicate ID detected and skipped: ${processedPokemon.id} (${processedPokemon.name})`)
            }
        }
    }

    // 3. Process Evolution Chains
    const evolutionDetails = await processAllEvolutionChains(evolutionChainUrls);

    // 4. Apply Evolution Data to Pokémon
    console.log("Applying evolution data to Pokémon...");
    for (const gen in allPokemonData) {
        allPokemonData[gen].forEach(pokemon => {
            const evoInfo = evolutionDetails.get(pokemon.speciesName); // Look up by base species name
            if (evoInfo) {
                pokemon.evolution_stage = evoInfo.stage;
                pokemon.is_fully_evolved = evoInfo.is_fully_evolved;
            } else {
                // If not found in map, assume standalone (stage 0, fully evolved)
                // unless it's explicitly a baby from species data
                 pokemon.evolution_stage = pokemon.is_baby ? 0 : 0; // Default stage 0
                 pokemon.is_fully_evolved = pokemon.is_baby ? false : true; // Babies aren't fully evolved
                 // console.warn(`No evolution data found for species: ${pokemon.speciesName}. Assuming standalone.`);
            }
        });
    }

    // 5. Save Data to Files
    console.log("Saving data files...");
    await fs.mkdir(OUTPUT_DIR, { recursive: true }); // Ensure output directory exists

    const indexData = {
        description: "Index mapping Pokémon generations to their data files.",
        generations: {}
    };

    const generationKeys = Object.keys(allPokemonData).sort((a, b) => parseInt(a) - parseInt(b));

    for (const gen of generationKeys) {
        const filename = `gen${gen}.json`;
        const filePath = path.join(OUTPUT_DIR, filename);
        indexData.generations[gen] = `${OUTPUT_DIR.split('/').pop()}/${filename}`; // Relative path for index

        // Sort Pokémon within the generation by ID before saving
        allPokemonData[gen].sort((a, b) => a.id - b.id);

        try {
            await fs.writeFile(filePath, JSON.stringify(allPokemonData[gen], null, 2)); // Pretty print JSON
            console.log(`Successfully saved ${filePath}`);
        } catch (err) {
            console.error(`Error writing file ${filePath}:`, err);
        }
    }

    // Save the index file
    const indexFilePath = path.join(OUTPUT_DIR, POKEDEX_INDEX_FILE);
    try {
        await fs.writeFile(indexFilePath, JSON.stringify(indexData, null, 2));
        console.log(`Successfully saved ${indexFilePath}`);
    } catch (err) {
        console.error(`Error writing index file ${indexFilePath}:`, err);
    }

    console.log("Pokédex data build finished!");
}

// --- Run the Build ---
buildPokedexData().catch(error => {
    console.error("Build script failed:", error);
    process.exit(1); // Exit with error code
});

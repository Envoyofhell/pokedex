/**
 * @file        dex/js/modules/generator.js
 * @description Random generator functionality using pre-processed local JSON data.
 * @version     3.1.3
 * @date        2025-05-03
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js, lightbox.js
 * @dependents   app.js
 *
 * @changelog
 * v3.1.3 (2025-05-03): Fixed filter logic based on exclusion. Ensured dynamic UI population runs correctly. Added comments for future UI grouping.
 * v3.1.2 (2025-05-03): Attempted filter logic fix, ensured dynamic UI population runs, added debug logs.
 * v3.1.1 (2025-05-03): Fixed filterLocalPokemonData logic. Restored dynamic population of Region/Type checkboxes.
 * v3.1.0 (2025-05-03): Rewrote filterLocalPokemonData for clarity and correctness based on local JSON flags.
 * v3.0.2 (2025-05-03): Adjusted fetch paths to include 'public/' assuming server root is project root.
 * v3.0.1 (2025-05-03): Corrected fetch path for pokedex-index.json.
 * v3.0.0 (2025-05-03): Rewritten to use local JSON data.
 */

window.DexApp = window.DexApp || {};
window.DexApp.Generator = {};

// --- State Variables ---
window.DexApp.Generator.state = {
    active: false,
    settingsPanelVisible: true,
    options: { /* Read from form */ },
    pokedexData: [], // Holds the combined data from loaded JSON files
    pokedexIndex: null, // Holds the content of pokedex-index.json
    dataLoading: false,
    dataLoaded: false,
    generatedHistory: [], currentHistoryIndex: -1, shiniesFound: []
};

// --- DOM Elements Cache ---
window.DexApp.Generator.elements = {
    generatorOverlay: null, generatorForm: null, generatorResultsContainer: null,
    generatorLoader: null, generatorCloseButton: null, generatorPrevButton: null,
    generatorNextButton: null, generatorShinyHistory: null, settingsPanel: null,
    settingsToggleButton: null, settingsToggleButtonIcon: null, generatorErrorMessage: null,
    // Form elements (cached later)
    countSelect: null, regionCheckboxes: null, typeCheckboxes: null, advancedCheckboxes: null,
    legendariesCheckbox: null, mythicalsCheckbox: null, sublegendariesCheckbox: null,
    ultraBeastsCheckbox: null, paradoxesCheckbox: null, formsCheckbox: null,
    megasCheckbox: null, gigantamaxCheckbox: null, nfesCheckbox: null,
    fullyEvolvedCheckbox: null, unevolvedCheckbox: null, evolvedOnceCheckbox: null,
    evolvedTwiceCheckbox: null, shinyBoostCheckbox: null,
    regionCheckAll: null, regionUncheckAll: null, typeCheckAll: null, typeUncheckAll: null,
    advancedCheckAll: null, advancedUncheckAll: null
};


// --- Initialize Generator ---
window.DexApp.Generator.initialize = async function() {
    console.log("Initializing Generator module (v3.1.3 - Local JSON)...");
    this.cacheElements(); // Cache base elements

    if (!this.elements.generatorOverlay || !this.elements.generatorForm || !this.elements.generatorResultsContainer || !this.elements.settingsPanel || !this.elements.settingsToggleButton) {
        console.error("Generator Init Failed: Missing essential DOM elements.");
        return;
    }

    // Populate filters that need dynamic creation FIRST
    this.populateDynamicFilters(); // Creates checkboxes AND caches them

    // Cache remaining static form elements AFTER dynamic ones are potentially created/cached
    this.cacheStaticFormElements(); // Caches advanced checkboxes etc.

    // Setup listeners AFTER all elements are cached
    this.setupEventListeners();
    this.setupCheckAllListeners(); // Attaches listeners using cached elements

    this.loadShinyHistory();
    await this.loadPokedexIndex(); // Load index immediately

    console.log("Generator module initialized.");
};

// --- Cache DOM Elements ---
window.DexApp.Generator.cacheElements = function() { /* Unchanged */
    this.elements.generatorOverlay = document.getElementById('generator-overlay');
    this.elements.generatorForm = document.getElementById('generator-form');
    this.elements.generatorResultsContainer = document.getElementById('generator-results');
    this.elements.generatorLoader = document.getElementById('generator-loader');
    this.elements.generatorCloseButton = document.getElementById('generator-close-button');
    this.elements.generatorPrevButton = document.getElementById('generator-prev-button');
    this.elements.generatorNextButton = document.getElementById('generator-next-button');
    this.elements.generatorShinyHistory = document.getElementById('generator-shiny-history');
    this.elements.settingsPanel = document.getElementById('generator-settings-panel');
    this.elements.settingsToggleButton = document.getElementById('settings-toggle-button');
    this.elements.generatorErrorMessage = document.getElementById('generator-error-message');
    if (this.elements.settingsToggleButton) { this.elements.settingsToggleButtonIcon = this.elements.settingsToggleButton.querySelector('i'); }
};

// --- Cache Static Form Elements ---
window.DexApp.Generator.cacheStaticFormElements = function() { /* Unchanged */
     const form = this.elements.generatorForm;
    if (form) {
        this.elements.countSelect = form.querySelector('#generator-count');
        this.elements.legendariesCheckbox = form.querySelector('#generator-legendaries');
        this.elements.mythicalsCheckbox = form.querySelector('#generator-mythicals');
        this.elements.sublegendariesCheckbox = form.querySelector('#generator-sublegendaries');
        this.elements.ultraBeastsCheckbox = form.querySelector('#generator-ultrabeasts');
        this.elements.paradoxesCheckbox = form.querySelector('#generator-paradoxes');
        this.elements.formsCheckbox = form.querySelector('#generator-forms');
        this.elements.megasCheckbox = form.querySelector('#generator-megas');
        this.elements.gigantamaxCheckbox = form.querySelector('#generator-gigantamax');
        this.elements.nfesCheckbox = form.querySelector('#generator-nfes');
        this.elements.fullyEvolvedCheckbox = form.querySelector('#generator-fully-evolved');
        this.elements.unevolvedCheckbox = form.querySelector('#generator-unevolved');
        this.elements.evolvedOnceCheckbox = form.querySelector('#generator-evolved-once');
        this.elements.evolvedTwiceCheckbox = form.querySelector('#generator-evolved-twice');
        this.elements.shinyBoostCheckbox = form.querySelector('#generator-shiny-boost');
        // Cache all advanced checkboxes together
        this.elements.advancedCheckboxes = form.querySelectorAll('#generator-advanced-container input[type="checkbox"]');
    }
};

// --- Setup Event Listeners ---
window.DexApp.Generator.setupEventListeners = function() { /* Unchanged */
    const elements = this.elements;
    const submitButton = document.querySelector('.generator-submit-button.top-button[form="generator-form"]');
     if (submitButton && elements.generatorForm) {
         elements.generatorForm.addEventListener('submit', (event) => {
             event.preventDefault(); this.generateRandomPokemon();
         });
     } else if (!submitButton) { console.warn("Generator submit button not found."); }
       else if (!elements.generatorForm) { console.warn("Generator form element not found for submit listener."); }
    if (elements.generatorPrevButton) elements.generatorPrevButton.addEventListener('click', () => this.showPreviousGeneration());
    if (elements.generatorNextButton) elements.generatorNextButton.addEventListener('click', () => this.showNextGeneration());
    if (elements.settingsToggleButton) elements.settingsToggleButton.addEventListener('click', () => this.toggleSettingsPanel());
};

// --- Populate Dynamic Filter Options (Regions & Types) ---
window.DexApp.Generator.populateDynamicFilters = function() { /* Unchanged */
    const regionsContainer = document.getElementById('generator-regions-container');
    const typesContainer = document.getElementById('generator-types-container');
    // Populate Regions
    if (regionsContainer) {
        regionsContainer.innerHTML = '';
        Object.keys(window.DexApp.Constants.GENERATION_RANGES).forEach(genNum => {
            if (genNum === 'all') return;
            const regionName = window.DexApp.Utils.formatters.getRegionNameForGen(genNum);
            const label = document.createElement('label'); label.className = 'generator-checkbox';
            label.innerHTML = `<input type="checkbox" name="generator-region" value="${genNum}" checked><span class="checkmark"></span> ${regionName} (Gen ${genNum})`;
            regionsContainer.appendChild(label);
        });
        this.elements.regionCheckboxes = regionsContainer.querySelectorAll('input[name="generator-region"]');
        console.log(`Populated ${this.elements.regionCheckboxes?.length || 0} region checkboxes.`);
    } else { console.warn("Generator regions container not found"); }
    // Populate Types
    if (typesContainer) {
        typesContainer.innerHTML = '';
        window.DexApp.Constants.POKEMON_TYPES.forEach(type => {
            const label = document.createElement('label'); label.className = 'generator-checkbox';
            label.innerHTML = `<input type="checkbox" name="generator-type" value="${type}"><span class="checkmark type-${type}"></span> ${window.DexApp.Utils.formatters.capitalize(type)}`;
            typesContainer.appendChild(label);
        });
        this.elements.typeCheckboxes = typesContainer.querySelectorAll('input[name="generator-type"]');
        console.log(`Populated ${this.elements.typeCheckboxes?.length || 0} type checkboxes.`);
    } else { console.warn("Generator types container not found"); }
};

// --- Setup Check All/None Listeners ---
window.DexApp.Generator.setupCheckAllListeners = function() { /* Unchanged */
    const setupListenersForSection = (sectionName, checkboxList) => {
        const containerId = `generator-${sectionName}-container`; const container = document.getElementById(containerId);
        if (!container || !checkboxList || checkboxList.length === 0) { console.warn(`Could not set up check-all listeners for section "${sectionName}". Container or checkbox list missing.`); return; }
        const parentSection = container.closest('.form-section'); const header = parentSection?.querySelector('.section-header'); if (!header) { console.warn(`Could not find header for section "${sectionName}".`); return; }
        const checkAllBtn = header.querySelector(`.check-all-button[data-target="${sectionName}"]`); const uncheckAllBtn = header.querySelector(`.uncheck-all-button[data-target="${sectionName}"]`);
        if (checkAllBtn) { this.elements[`${sectionName}CheckAll`] = checkAllBtn; checkAllBtn.addEventListener('click', () => this.toggleCheckboxes(checkboxList, true)); console.log(`Added check-all listener for ${sectionName}`); }
        else { console.warn(`Check-all button not found for ${sectionName}`); }
        if (uncheckAllBtn) { this.elements[`${sectionName}UncheckAll`] = uncheckAllBtn; uncheckAllBtn.addEventListener('click', () => this.toggleCheckboxes(checkboxList, false)); console.log(`Added uncheck-all listener for ${sectionName}`); }
        else { console.warn(`Uncheck-all button not found for ${sectionName}`); }
    };
    // Ensure checkbox elements are cached before setting up listeners
    if (!this.elements.regionCheckboxes) this.elements.regionCheckboxes = document.querySelectorAll('#generator-regions-container input[name="generator-region"]');
    if (!this.elements.typeCheckboxes) this.elements.typeCheckboxes = document.querySelectorAll('#generator-types-container input[name="generator-type"]');
    if (!this.elements.advancedCheckboxes) this.elements.advancedCheckboxes = document.querySelectorAll('#generator-advanced-container input[name="generator-advanced"]');
    setupListenersForSection('regions', this.elements.regionCheckboxes);
    setupListenersForSection('types', this.elements.typeCheckboxes);
    setupListenersForSection('advanced', this.elements.advancedCheckboxes);
};

// --- Helper to Check/Uncheck All ---
window.DexApp.Generator.toggleCheckboxes = function(checkboxes, checkState) { /* Unchanged */
    if (!checkboxes) return; console.log(`Toggling ${checkboxes.length} checkboxes to ${checkState}`);
    checkboxes.forEach(cb => { cb.checked = checkState; });
};

// --- Toggle Settings Panel Visibility ---
window.DexApp.Generator.toggleSettingsPanel = function() { /* Unchanged */
    const panel = this.elements.settingsPanel; const icon = this.elements.settingsToggleButtonIcon; if (!panel || !icon) return;
    this.state.settingsPanelVisible = !this.state.settingsPanelVisible;
    if (this.state.settingsPanelVisible) { panel.classList.remove('hidden'); icon.classList.remove('fa-chevron-right'); icon.classList.add('fa-chevron-left'); this.elements.settingsToggleButton.title = "Hide Settings Panel"; }
    else { panel.classList.add('hidden'); icon.classList.remove('fa-chevron-left'); icon.classList.add('fa-chevron-right'); this.elements.settingsToggleButton.title = "Show Settings Panel"; }
};

// --- Generator Controls ---
window.DexApp.Generator.activate = function() { /* Unchanged */
    console.log("Activating generator (overlay opened)..."); this.state.active = true;
    if (!this.state.settingsPanelVisible) { this.toggleSettingsPanel(); }
};

// --- Get Options from Form ---
window.DexApp.Generator.getGeneratorOptions = function() { /* Unchanged */
    const elements = this.elements; const options = {};
    if (elements.generatorErrorMessage) elements.generatorErrorMessage.classList.add('hidden');
    options.count = elements.countSelect ? parseInt(elements.countSelect.value, 10) : 6;
    options.regions = Array.from(elements.regionCheckboxes || []).filter(cb => cb.checked).map(cb => cb.value);
    options.types = Array.from(elements.typeCheckboxes || []).filter(cb => cb.checked).map(cb => cb.value);
    options.evolutionCounts = [];
    if (elements.unevolvedCheckbox?.checked) options.evolutionCounts.push(0);
    if (elements.evolvedOnceCheckbox?.checked) options.evolutionCounts.push(1);
    if (elements.evolvedTwiceCheckbox?.checked) options.evolutionCounts.push(2);
    options.legendaries = elements.legendariesCheckbox?.checked ?? true;
    options.mythicals = elements.mythicalsCheckbox?.checked ?? true;
    options.sublegendaries = elements.sublegendariesCheckbox?.checked ?? true;
    options.ultraBeasts = elements.ultraBeastsCheckbox?.checked ?? true;
    options.paradoxes = elements.paradoxesCheckbox?.checked ?? true;
    options.forms = elements.formsCheckbox?.checked ?? true; // This is the 'Alternate Forms' checkbox
    options.megas = elements.megasCheckbox?.checked ?? true;
    options.gigantamaxes = elements.gigantamaxCheckbox?.checked ?? true;
    options.nfes = elements.nfesCheckbox?.checked ?? true; // This is the 'Not Fully Evolved' checkbox
    options.fullyEvolved = elements.fullyEvolvedCheckbox?.checked ?? true;
    options.shinyChance = elements.shinyBoostCheckbox?.checked ? 1 / 100 : 16 / 65536;
    options.sprites = true;
    this.state.options = options; // Update state
    console.log("Generator options gathered:", options);
    return options;
};

// --- Load Pokedex Index ---
window.DexApp.Generator.loadPokedexIndex = async function() { /* Unchanged */
    if (this.state.dataLoaded) return; console.log("Loading pokedex-index.json...");
    try {
        const response = await fetch('public/data/pokedex-index.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        this.state.pokedexIndex = await response.json(); this.state.dataLoaded = true;
        console.log("Pokedex index loaded successfully.");
    } catch (error) {
        console.error("Failed to load pokedex-index.json:", error);
        if (this.elements.generatorErrorMessage) { this.elements.generatorErrorMessage.textContent = "Error: Could not load base Pokémon data index."; this.elements.generatorErrorMessage.classList.remove('hidden'); }
    }
};

// --- Load Generation Data ---
window.DexApp.Generator.loadGenerationData = async function(generationNumbers) { /* Unchanged */
    if (!this.state.pokedexIndex || this.state.dataLoading) return []; this.state.dataLoading = true;
    console.log("Loading data for generations:", generationNumbers);
    const generationFilePaths = generationNumbers.map(genNum => this.state.pokedexIndex.generations[genNum]).filter(filePath => !!filePath);
    if (generationFilePaths.length === 0) { console.warn("No valid generation files found."); this.state.dataLoading = false; return []; }
    let combinedData = [];
    try {
        const promises = generationFilePaths.map(async (relativeFilePath) => {
            try {
                const fullPath = `public/${relativeFilePath}`; const response = await fetch(fullPath);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${fullPath}`);
                return await response.json();
            } catch (fileError) { console.error(`Failed to load ${relativeFilePath}:`, fileError); return []; }
        });
        const results = await Promise.all(promises); combinedData = results.flat();
        console.log(`Loaded data for ${combinedData.length} Pokémon entries.`);
    } catch (error) {
        console.error("Error loading generation data:", error);
        if (this.elements.generatorErrorMessage) { this.elements.generatorErrorMessage.textContent = "Error loading Pokémon data."; this.elements.generatorErrorMessage.classList.remove('hidden'); }
    } finally { this.state.dataLoading = false; }
    return combinedData;
};


// --- Random Generation (Using Local JSON) ---
window.DexApp.Generator.generateRandomPokemon = async function() { /* Unchanged */
    const loader = this.elements.generatorLoader; const resultsContainer = this.elements.generatorResultsContainer; const errorContainer = this.elements.generatorErrorMessage;
    if (!loader || !resultsContainer || !errorContainer || this.state.dataLoading) return;
    window.DexApp.Utils.UI.showLoader(loader); resultsContainer.innerHTML = '<div class="col-span-full text-center p-4 text-gray-400 italic">Processing...</div>'; errorContainer.classList.add('hidden');
    try {
        if (!this.state.dataLoaded) { await this.loadPokedexIndex(); if (!this.state.dataLoaded) throw new Error("Base Pokémon data index failed to load."); }
        const options = this.getGeneratorOptions();
        const generationsToLoad = options.regions.length > 0 ? options.regions : Object.keys(this.state.pokedexIndex.generations);
        const availablePokemonData = await this.loadGenerationData(generationsToLoad);
        if (availablePokemonData.length === 0) { throw new Error("No Pokémon data loaded for the selected regions."); }
        let finalFilteredPokemon = this.filterLocalPokemonData(availablePokemonData, options);
        console.log(`Filtering complete. ${finalFilteredPokemon.length} Pokémon match criteria.`);
        if (finalFilteredPokemon.length === 0) { resultsContainer.innerHTML = '<div class="no-results col-span-full">No Pokémon match the selected criteria. Adjust filters.</div>'; window.DexApp.Utils.UI.hideLoader(loader); return; }
        const countToSelect = Math.min(options.count, finalFilteredPokemon.length);
        if (countToSelect < options.count) console.warn(`Only ${countToSelect} Pokémon match criteria, requested ${options.count}.`);
        let randomSelection = this.chooseRandomPokemon(finalFilteredPokemon, countToSelect);
        this.addToGeneratorHistory(randomSelection); this.displayGeneratorResults(randomSelection);
        console.log("Generation complete using local data.");
    } catch (error) {
        console.error("Error generating random Pokemon:", error); const errorMessage = `Error: ${error.message}. Please try again.`;
        resultsContainer.innerHTML = `<div class="generator-error col-span-full">${errorMessage}</div>`;
        if (errorContainer) { errorContainer.textContent = errorMessage; errorContainer.classList.remove('hidden'); }
    } finally { window.DexApp.Utils.UI.hideLoader(loader); }
};


// --- Helper: Filter Local Pokemon Data (REFINED v3.1.3 - Corrected Logic) ---
window.DexApp.Generator.filterLocalPokemonData = function(pokemonDataList, options) {
    console.log("Filtering local data (v3.1.3) with options:", options);
    // const debugFiltering = true; // Set to true to see detailed logs

    return pokemonDataList.filter(pokemon => {
        // --- Type Filter ---
        // If types are selected, the pokemon MUST have at least one selected type.
        if (options.types.length > 0) {
            const hasSelectedType = options.types.some(type => pokemon.types.includes(type));
            if (!hasSelectedType) {
                // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Type mismatch (has ${pokemon.types.join(',')}, needs one of ${options.types.join(',')})`);
                return false;
            }
        }

        // --- Category Filters ---
        // If the checkbox is UNCHECKED (option is false), EXCLUDE if the pokemon has the flag.
        if (!options.legendaries && pokemon.is_legendary) {
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Legendary filter OFF`);
            return false;
        }
        if (!options.mythicals && pokemon.is_mythical) {
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Mythical filter OFF`);
            return false;
        }
        if (!options.sublegendaries && pokemon.is_sublegendary) { // Requires flag in JSON
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Sublegendary filter OFF`);
            return false;
        }
        if (!options.ultraBeasts && pokemon.is_ultra_beast) { // Requires flag in JSON
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Ultra Beast filter OFF`);
            return false;
        }
        if (!options.paradoxes && pokemon.is_paradox) {
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Paradox filter OFF`);
            return false;
        }

        // --- Form Filters ---
        if (!options.megas && pokemon.is_mega) {
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Mega filter OFF`);
            return false;
        }
        if (!options.gigantamaxes && pokemon.is_gmax) {
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Gmax filter OFF`);
            return false;
        }
        // Exclude non-Mega/Gmax/Primal forms if 'Alternate Forms' is unchecked
        if (!options.forms && pokemon.is_alternate_form) {
            // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Alternate Form filter OFF`);
            return false;
        }

        // --- Evolution Stage Filters ---
        // Only apply if the user hasn't selected all stages (length < 3)
        if (options.evolutionCounts.length < 3) {
            // If the pokemon's stage is NOT in the list of selected stages, exclude it.
            if (!options.evolutionCounts.includes(pokemon.evolution_stage)) {
                // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Stage ${pokemon.evolution_stage} not in [${options.evolutionCounts}]`);
                return false;
            }
        }

        // --- NFE / Fully Evolved Filters ---
        // Only apply if the user hasn't selected both (which means include all)
        if (!(options.nfes && options.fullyEvolved)) {
            // If 'Not Fully Evolved' is unchecked, exclude NFE pokemon
            if (!options.nfes && !pokemon.is_fully_evolved) {
                // if (debugFiltering) console.log(`Excluding ${pokemon.name}: NFE filter OFF`);
                return false;
            }
            // If 'Fully Evolved' is unchecked, exclude fully evolved pokemon
            if (!options.fullyEvolved && pokemon.is_fully_evolved) {
                // if (debugFiltering) console.log(`Excluding ${pokemon.name}: Fully Evolved filter OFF`);
                return false;
            }
        }

        // If we reach here, the Pokémon passes all active filters
        // if (debugFiltering) console.log(`Including ${pokemon.name}`);
        return true;
    });
};


// --- Helper: Choose Random Pokemon (from local data structure) ---
window.DexApp.Generator.chooseRandomPokemon = function(pokemonList, count) { /* Unchanged */
    const availablePokemon = [...pokemonList]; const selected = [];
    while (selected.length < count && availablePokemon.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePokemon.length);
        const chosenPokemonData = availablePokemon.splice(randomIndex, 1)[0];
        const isShiny = Math.random() < this.state.options.shinyChance; let gender = null;
        const genderRate = chosenPokemonData.gender_rate ?? -1;
        if (genderRate > 0 && genderRate < 8) { gender = Math.random() < 0.5 ? 'male' : 'female'; }
        else if (genderRate === 0) { gender = 'male'; } else if (genderRate === 8) { gender = 'female'; }
        selected.push({ pokemon: chosenPokemonData, isShiny: isShiny, gender: gender, nature: window.DexApp.Utils.random.getRandomElement(window.DexApp.Constants.NATURES), resultId: `gen-${Date.now()}-${selected.length}` });
    } return selected;
};

// --- Results Display (Uses Grid) ---
window.DexApp.Generator.displayGeneratorResults = function(pokemonList) { /* Unchanged */
    const container = this.elements.generatorResultsContainer; if (!container) return; container.innerHTML = '';
    if (!pokemonList || pokemonList.length === 0) { container.innerHTML = '<div class="no-results col-span-full">No Pokémon generated. Try different filters.</div>'; this.updateGeneratorHistoryUI(); return; }
    const fragment = document.createDocumentFragment();
    pokemonList.forEach(result => {
        const card = this.createGeneratorResultCard(result); fragment.appendChild(card);
        if (result.isShiny && !this.state.shiniesFound.some(s => s.pokemon.id === result.pokemon.id)) { this.addToShinyHistory(result); }
    });
    container.appendChild(fragment); this.updateGeneratorHistoryUI();
};

// --- Create Generator Result Card ---
window.DexApp.Generator.createGeneratorResultCard = function(result) {
    // Log for debugging
    console.log("Creating generator card for:", result);
    
    const pokemonData = result.pokemon; 
    const card = document.createElement('div');
    card.className = 'generator-pokemon-card'; 
    
    // Make sure we have an ID
    const pokemonId = pokemonData.id;
    if (!pokemonId) {
        console.error("Pokemon ID missing in generator:", pokemonData);
        return card; // Return empty card if no ID
    }
    
    card.dataset.pokemonId = pokemonId; 
    card.dataset.pokemonName = pokemonData.name;
    if (result.isShiny) card.classList.add('shiny');
    
    // ALWAYS use direct URLs to PokeAPI sprites
    const officialArtworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
    const normalSpriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    const shinySpriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`;
    
    // Select the appropriate image based on shiny status
    const imageUrl = result.isShiny ? shinySpriteUrl : officialArtworkUrl;
    
    const displayName = window.DexApp.Utils.formatters.formatName(pokemonData.name);
    const idFormatted = String(pokemonId).padStart(3, '0');
    const types = pokemonData.types || [];
    
    let color1 = 'var(--color-bg-light-panel)', color2 = 'var(--color-bg-panel)';
    let primaryTypeColor = 'var(--color-accent)';
    
    if (types.length > 0) {
        const typeName1 = types[0].toLowerCase();
        primaryTypeColor = `var(--type-${typeName1}, var(--color-accent))`;
        color1 = `var(--type-${typeName1}, var(--color-secondary))`;
        color2 = types.length > 1 ? 
            `var(--type-${types[1].toLowerCase()}, var(--color-primary))` : 
            `var(--type-${typeName1}-light, var(--color-primary))`;
    }
    
    card.style.setProperty('--card-gradient-color-1', color1);
    card.style.setProperty('--card-gradient-color-2', color2);
    card.style.setProperty('--dynamic-type-color', primaryTypeColor);
    
    card.innerHTML = `
        <div class="card-header">
            <span class="card-id">#${idFormatted}</span>
            ${result.isShiny ? '<span class="shiny-star" title="Shiny!">★</span>' : ''}
        </div>
        <div class="card-image-container">
            <img src="${imageUrl}" alt="${displayName}" class="card-image" loading="lazy">
        </div>
        <div class="card-info">
            <h3 class="card-name">${displayName}</h3>
            <div class="card-nature">${result.nature || ''}</div>
            <div class="card-types">
                ${types.map(type => `<span class="card-type type-${type.toLowerCase()}">${type}</span>`).join('')}
            </div>
            ${result.gender ? `<div class="card-gender ${result.gender}" title="${result.gender}">${result.gender === 'male' ? '♂' : '♀'}</div>` : ''}
        </div>
        <button class="view-dex-button" data-identifier="${pokemonData.name}" title="View ${displayName} in Pokédex">View Dex</button>
    `;
    
    // Simple fallback chain for the image
    const imgElement = card.querySelector('.card-image');
    if (imgElement) {
        imgElement.onerror = function() {
            if (this.src === officialArtworkUrl) {
                // If official artwork fails, try normal sprite
                console.log(`Official artwork failed for ${displayName}, trying ${result.isShiny ? 'shiny' : 'normal'} sprite`);
                this.src = result.isShiny ? shinySpriteUrl : normalSpriteUrl;
            } else {
                // If all sprite attempts fail, use placeholder
                console.log(`All sprites failed for ${displayName}, using placeholder`);
                this.src = 'https://placehold.co/96x96/cccccc/333333?text=%3F';
                this.onerror = null; // Stop trying after this
            }
        };
    }
    
    card.querySelector('.view-dex-button').addEventListener('click', (e) => {
        e.stopPropagation();
        const identifier = e.currentTarget.dataset.identifier;
        if (window.DexApp.Lightbox?.closeGeneratorLightbox) window.DexApp.Lightbox.closeGeneratorLightbox();
        if (identifier && window.DexApp.DetailView?.fetchAndDisplayDetailData) {
            setTimeout(() => {
                window.DexApp.DetailView.fetchAndDisplayDetailData(identifier, 'generator');
            }, 150);
        }
        else {
            console.error("Cannot open detail view - function or identifier missing.");
        }
    });
    
    return card;
};
// --- History & Shiny Functions ---
window.DexApp.Generator.addToGeneratorHistory = function(pokemonList) { /* Unchanged */
    if (!pokemonList || pokemonList.length === 0) return; const clonedList = pokemonList.map(item => ({ ...item, pokemon: { ...item.pokemon } }));
    this.state.generatedHistory.unshift(clonedList); if (this.state.generatedHistory.length > 10) { this.state.generatedHistory.pop(); }
    this.state.currentHistoryIndex = 0; this.updateGeneratorHistoryUI();
};
window.DexApp.Generator.updateGeneratorHistoryUI = function() { /* Unchanged */
    const hasHistory = this.state.generatedHistory.length > 0; const canGoPrev = hasHistory && this.state.currentHistoryIndex < this.state.generatedHistory.length - 1; const canGoNext = hasHistory && this.state.currentHistoryIndex > 0;
    if (this.elements.generatorPrevButton) this.elements.generatorPrevButton.disabled = !canGoPrev; if (this.elements.generatorNextButton) this.elements.generatorNextButton.disabled = !canGoNext;
    const shinyCounter = document.getElementById('shiny-count'); if (shinyCounter) shinyCounter.textContent = `(${this.state.shiniesFound.length})`;
};
window.DexApp.Generator.showPreviousGeneration = function() { /* Unchanged */
    if (this.state.currentHistoryIndex < this.state.generatedHistory.length - 1) { this.state.currentHistoryIndex++; this.displayGeneratorResults(this.state.generatedHistory[this.state.currentHistoryIndex]); }
};
window.DexApp.Generator.showNextGeneration = function() { /* Unchanged */
    if (this.state.currentHistoryIndex > 0) { this.state.currentHistoryIndex--; this.displayGeneratorResults(this.state.generatedHistory[this.state.currentHistoryIndex]); }
};
window.DexApp.Generator.addToShinyHistory = function(pokemonResult) { /* Unchanged */
    const pokemonData = pokemonResult.pokemon; const pokemonId = pokemonData.id; if (this.state.shiniesFound.some(s => s.pokemon.id === pokemonId)) { return; }
    const shinyData = { pokemon: { id: pokemonId, name: pokemonData.name, sprite: pokemonData.shinySprite || 'https://placehold.co/40x40/cccccc/ffffff?text=?' }, date: new Date().toISOString() };
    this.state.shiniesFound.unshift(shinyData); window.DexApp.Utils.storage.saveToLocalStorage('dex-shinies', this.state.shiniesFound); this.updateShinyHistoryUI();
};
window.DexApp.Generator.updateShinyHistoryUI = function() { /* Unchanged */
    const container = this.elements.generatorShinyHistory; if (!container) return; container.innerHTML = '';
    if (this.state.shiniesFound.length === 0) { container.innerHTML = '<p class="no-shinies col-span-full">No shiny Pokémon found yet.</p>'; const sc = document.getElementById('shiny-count'); if (sc) sc.textContent = `(0)`; return; }
    const shinyList = document.createElement('div'); shinyList.className = 'shiny-list';
    this.state.shiniesFound.forEach(shiny => {
        const shinyCard = document.createElement('div'); shinyCard.className = 'shiny-card'; const p = shiny.pokemon; const n = window.DexApp.Utils.formatters.formatName(p.name); const d = shiny.date ? new Date(shiny.date).toLocaleDateString() : 'Unknown';
        shinyCard.innerHTML = `<img src="${p.sprite || 'https://placehold.co/40x40/cccccc/ffffff?text=?'}" alt="Shiny ${n}" class="shiny-image" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/40x40/cccccc/ffffff?text=?'"><div class="shiny-info"><div class="shiny-name">${n}</div><div class="shiny-date">Found: ${d}</div></div><button class="view-dex-button" data-identifier="${p.name}" title="View ${n} in Pokédex">View</button>`;
        shinyCard.querySelector('.view-dex-button').addEventListener('click', (e) => {
            e.stopPropagation(); const id = e.currentTarget.dataset.identifier;
            if (window.DexApp.Lightbox?.closeGeneratorLightbox) window.DexApp.Lightbox.closeGeneratorLightbox();
            if (id && window.DexApp.DetailView?.fetchAndDisplayDetailData) { setTimeout(() => { window.DexApp.DetailView.fetchAndDisplayDetailData(id, 'generator'); }, 150); }
        });
        shinyList.appendChild(shinyCard);
    });
    const clearBtnContainer = document.createElement('div'); const clearBtn = document.createElement('button'); clearBtn.className = 'clear-shinies-button'; clearBtn.textContent = 'Clear Shiny History'; clearBtn.addEventListener('click', () => this.clearShinyHistory()); clearBtnContainer.appendChild(clearBtn);
    container.appendChild(shinyList); container.appendChild(clearBtnContainer);
    const shinyCounter = document.getElementById('shiny-count'); if (shinyCounter) shinyCounter.textContent = `(${this.state.shiniesFound.length})`;
};
window.DexApp.Generator.clearShinyHistory = function() { /* Unchanged */
    if (confirm('Are you sure you want to clear the shiny Pokémon history? This cannot be undone.')) { this.state.shiniesFound = []; window.DexApp.Utils.storage.saveToLocalStorage('dex-shinies', []); this.updateShinyHistoryUI(); console.log("Shiny history cleared."); }
};
window.DexApp.Generator.loadShinyHistory = function() { /* Unchanged */
    try { const saved = window.DexApp.Utils.storage.getFromLocalStorage('dex-shinies', []); this.state.shiniesFound = Array.isArray(saved) ? saved : []; this.updateShinyHistoryUI(); } catch (e) { console.error('Error loading shiny history from localStorage:', e); this.state.shiniesFound = []; }
};

console.log("Generator module loaded (v3.1.2 - Local JSON)"); // Updated version number
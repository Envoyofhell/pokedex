/**
 * @file        dex/js/modules/dexGrid.js
 * @description Manages the Pokémon grid display, generation filters, and type filters. Added extra logging for glow color variable.
 * @version     2.2.6b
 * @date        2025-05-04
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js, api.js, lightbox.js, detailView.js
 * @dependents  app.js
 *
 * @changelog
 * v2.2.6b (2025-05-04): Added explicit console log after setting --breathe-glow-color-rgb.
 * v2.2.6 (2025-05-04): Added detailed logging for breathing effect start/apply/stop and color variable setting. Ensured startBreathingEffect is called.
 * v2.2.5 (2025-05-04): Refined styleActiveTab to better reset inactive generation button styles. Added setting --breathe-glow-color-rgb.
 */

// Ensure DexApp namespace exists
window.DexApp = window.DexApp || {};

// Create DexGrid namespace
window.DexApp.DexGrid = window.DexApp.DexGrid || {};

// --- State variables ---
window.DexApp.DexGrid.state = {
    currentGeneration: 1,
    currentTypeFilter: null,
    breathingCardId: null,
    breathingInterval: null,
    currentPokemonList: [],
    fullGenerationList: [],
    isLoading: false,
    isInitialLoad: true,
};

// --- DOM Elements Cache ---
window.DexApp.DexGrid.elements = {
    pokedexGrid: null,
    dexGridLoader: null,
    generationTabs: null,
    typeFilterButtons: null,
};

// --- Initialize DexGrid ---
window.DexApp.DexGrid.initialize = function () {
    console.log("[DexGrid Init] Initializing DexGrid module (v2.2.6b)...");
    this.cacheElements();

    if (!this.elements.pokedexGrid || !this.elements.dexGridLoader) {
        console.error("[DexGrid Init] CRITICAL: Pokédex grid or loader element not found.");
        return false;
    }

    this.setupEventListeners();
    this.setupGenerationTabs();
    this.setupTypeFilterButtons();

    // Start random breathing effect slightly delayed
    console.log("[DexGrid Init] Setting timeout to start breathing effect...");
    // **** ENSURE THIS LINE IS NOT COMMENTED OUT ****
    setTimeout(() => this.startBreathingEffect(), 4000); // 4 second delay

    console.log("[DexGrid Init] DexGrid module initialized successfully.");
    return true;
};

// --- Cache DOM Elements ---
window.DexApp.DexGrid.cacheElements = function () {
    // (Keep existing logic - unchanged)
    console.log("[DexGrid Cache] Caching elements...");
    this.elements.pokedexGrid = document.getElementById("pokedex-grid");
    this.elements.dexGridLoader = document.getElementById("dex-grid-loader");
    this.elements.generationTabs = document.getElementById("generation-tabs");
    this.elements.typeFilterButtons = document.getElementById("type-filter-buttons");
    console.log("[DexGrid Cache] Caching complete.");
     if (!this.elements.dexGridLoader) { console.error("[DexGrid Cache] DexGrid Loader element (#dex-grid-loader) not found!"); }
     if (!this.elements.pokedexGrid) { console.error("[DexGrid Cache] Pokedex Grid element (#pokedex-grid) not found!"); }
};

// --- Setup Event Listeners ---
window.DexApp.DexGrid.setupEventListeners = function () {
    // (Keep existing logic - unchanged)
    console.log("[DexGrid Events] Setting up event listeners...");
    if (this.elements.pokedexGrid) {
        this.elements.pokedexGrid.addEventListener("click", (event) => { const card = event.target.closest(".pokedex-grid-card"); if (card && card.dataset.pokemonId) { this.handleCardClick(card.dataset.pokemonId); } });
        this.elements.pokedexGrid.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { const card = event.target.closest(".pokedex-grid-card"); if (card && card.dataset.pokemonId) { event.preventDefault(); this.handleCardClick(card.dataset.pokemonId); } } });
         console.log("[DexGrid Events] Grid listeners added.");
    } else { console.error("[DexGrid Events] Cannot add grid event listeners: Grid element not found."); }
};

// --- Setup Generation Tabs ---
window.DexApp.DexGrid.setupGenerationTabs = function () {
    // (Keep existing logic - unchanged)
    const tabsContainer = this.elements.generationTabs; if (!tabsContainer) { console.error("Generation tabs container not found!"); return; } tabsContainer.innerHTML = "";
    const generations = window.DexApp.Constants?.GENERATION_RANGES || {}; const generationOrder = Object.keys(generations).sort((a, b) => parseInt(a) - parseInt(b)); let initialActiveButton = null;
    const allTab = this.createTabButton("all", "All Generations", "generation"); tabsContainer.appendChild(allTab); if (String(this.state.currentGeneration) === "all") { initialActiveButton = allTab; }
    generationOrder.forEach((genKey) => { if (genKey === "all") return; const genData = generations[genKey]; const tabText = `Gen ${genKey}${genData.name ? `: ${genData.name}` : ""}`; const tab = this.createTabButton(genKey, tabText, "generation"); tabsContainer.appendChild(tab); if (String(genKey) === String(this.state.currentGeneration)) { initialActiveButton = tab; } });
    if (initialActiveButton) { this.styleActiveTab(initialActiveButton, 'generation', this.state.currentGeneration); } else { const firstGenButton = tabsContainer.querySelector('.gen-tab-button:not([data-generation="all"])'); if (firstGenButton) { this.state.currentGeneration = firstGenButton.dataset.generation; this.styleActiveTab(firstGenButton, 'generation', this.state.currentGeneration); } }
    console.log("[DexGrid Tabs] Generation tabs created.");
};

// --- Setup Type Filter Buttons ---
window.DexApp.DexGrid.setupTypeFilterButtons = function () {
    // (Keep existing logic - unchanged)
    const container = this.elements.typeFilterButtons; if (!container) { console.error("Type filter buttons container not found!"); return; } container.innerHTML = "";
    const pokeTypes = window.DexApp.Constants?.POKEMON_TYPES || []; const allButton = this.createTabButton(null, "All Types", "type"); container.appendChild(allButton); this.styleActiveTab(allButton, 'type', null);
    pokeTypes.forEach((type) => { const button = this.createTabButton(type, window.DexApp.Utils?.formatters?.capitalize(type) || type, "type"); button.classList.add(`type-bg-${type}`); container.appendChild(button); });
    console.log("[DexGrid Tabs] Type filter buttons created.");
};

// --- Helper to Create Tab/Filter Buttons ---
window.DexApp.DexGrid.createTabButton = function (value, text, type) {
    // (Keep existing logic - unchanged)
    const button = document.createElement("button"); button.textContent = text; button.type = "button";
    if (type === "generation") { button.className = "gen-tab-button"; button.dataset.generation = value; button.addEventListener("click", () => this.handleGenerationTabClick(value)); }
    else if (type === "type") { button.className = "type-filter-button"; button.dataset.type = value === null ? "all" : value; button.addEventListener("click", () => this.handleTypeFilterClick(value)); if (value) { button.style.setProperty("--type-color-base", `var(--type-${value})`); button.style.setProperty("--type-color-hover", `var(--type-${value}-dark)`); } }
    return button;
};

// --- Helper to Style Active Tabs/Filters ---
window.DexApp.DexGrid.styleActiveTab = function (activeButton, type, value) {
    const container = (type === 'generation') ? this.elements.generationTabs : this.elements.typeFilterButtons;
    if (!container) return;

    const buttons = container.querySelectorAll(type === 'generation' ? '.gen-tab-button' : '.type-filter-button');
    buttons.forEach(button => {
        const isActive = (button === activeButton);
        button.classList.toggle('active', isActive);

        // Reset styles for inactive buttons
        button.style.backgroundColor = '';
        button.style.color = '';
        button.style.borderColor = '';

        if (isActive) {
            if (type === 'generation') {
                // Ensure the correct generation-specific color is applied
                const genColorVar = `--gen-color-${value}`;
                const computedGenColor = getComputedStyle(document.documentElement).getPropertyValue(genColorVar).trim();

                if (computedGenColor) {
                    console.log(`[DexGrid] Applying generation color: ${computedGenColor} for generation ${value}`);
                    button.style.backgroundColor = computedGenColor;
                    button.style.color = 'white';
                    button.style.borderColor = 'transparent';
                } else {
                    console.warn(`[DexGrid] Generation color variable ${genColorVar} not found.`);
                }
            } else {
                // Apply type-specific colors for active type filters
                const typeColorVar = value ? `var(--type-${value})` : 'var(--color-primary)';
                button.style.backgroundColor = typeColorVar;
                button.style.color = 'white';
                button.style.borderColor = 'transparent';
            }
        }
    });
};

// --- Handle Generation Tab Click ---
window.DexApp.DexGrid.handleGenerationTabClick = function (generation) {
    // (Keep existing logic - unchanged)
    if (this.state.isLoading || String(generation) === String(this.state.currentGeneration)) return;
    this.state.currentGeneration = generation; this.state.currentTypeFilter = null; this.state.isInitialLoad = false;
    console.log(`[DexGrid Action] Generation tab clicked: ${generation}`);
    const clickedButton = this.elements.generationTabs.querySelector(`.gen-tab-button[data-generation="${generation}"]`); if (clickedButton) { this.styleActiveTab(clickedButton, 'generation', generation); }
    const allTypesButton = this.elements.typeFilterButtons.querySelector('.type-filter-button[data-type="all"]'); if (allTypesButton) { this.styleActiveTab(allTypesButton, 'type', null); }
    this.loadGridData({ generation: generation });
};

// --- Handle Type Filter Click ---
window.DexApp.DexGrid.handleTypeFilterClick = function (type) {
    // (Keep existing logic - unchanged)
     if (this.state.isLoading || type === this.state.currentTypeFilter) return;
    this.state.currentTypeFilter = type; this.state.isInitialLoad = false;
    console.log(`[DexGrid Action] Type filter clicked: ${type === null ? "All" : type}`);
    const typeValue = type === null ? "all" : type; const clickedButton = this.elements.typeFilterButtons.querySelector(`.type-filter-button[data-type="${typeValue}"]`); if (clickedButton) { this.styleActiveTab(clickedButton, 'type', type); }
    this.applyLocalTypeFilter();
};

// --- DEBUG LOG ---
console.log("[DexGrid Define] Defining loadGridData function...");

// --- Load Grid Data (Fetches Generation List + Details) ---
window.DexApp.DexGrid.loadGridData = async function (filters = {}) {
    // (Keep existing logic - unchanged)
    if (this.state.isLoading) { console.warn("[DexGrid Load] Grid load request ignored: Already loading."); return; }
    console.log("[DexGrid Load] Starting loadGridData process...");
    this.state.isLoading = true; this.state.currentPokemonList = []; this.state.fullGenerationList = [];
    const { generation = this.state.currentGeneration } = filters; console.log(`[DexGrid Load] Target Generation: ${generation}`);
    this.showLoader(true, `Loading Gen ${generation}...`); if (this.elements.pokedexGrid) this.elements.pokedexGrid.innerHTML = '';
    try {
        console.log(`[DexGrid Load] Step 1: Fetching generation list for Gen ${generation}...`); let generationList;
        if (generation === "all") { generationList = await window.DexApp.API.fetchAllPokemonSpecies(); } else { generationList = await window.DexApp.API.fetchGenerationList(generation); }
        if (!generationList || generationList.length === 0) throw new Error(`No Pokémon list found for Gen ${generation}.`); console.log(`[DexGrid Load] Step 1: Fetched list of ${generationList.length} Pokémon.`);
        console.log(`[DexGrid Load] Step 2: Fetching details for ${generationList.length} Pokémon...`); this.showLoader(true, `Fetching details (0/${generationList.length})...`);
        const detailPromises = generationList.map((p, index) => window.DexApp.API.fetchDetailedPokemonData(p.id || p.name) .then(detail => { if ((index + 1) % 10 === 0 || index === generationList.length - 1) { this.showLoader(true, `Fetching details (${index + 1}/${generationList.length})...`); } return detail; }) .catch(err => { console.warn(`[DexGrid Load] Failed to fetch detail for ${p.id || p.name}:`, err); return null; }));
        const detailedPokemonData = await Promise.all(detailPromises); this.state.fullGenerationList = detailedPokemonData.filter(p => p !== null); console.log(`[DexGrid Load] Step 2: Stored details for ${this.state.fullGenerationList.length} Pokémon in fullGenerationList.`);
        console.log("[DexGrid Load] Step 3: Applying local type filter..."); this.applyLocalTypeFilter();
    } catch (error) {
        console.error(`[DexGrid Load] Error loading data for Gen ${generation}:`, error); this.showGridError(`Failed to load Pokémon data for Gen ${generation}. ${error.message}`); if (this.state.isInitialLoad) { this.dispatchInitialRenderComplete(); }
    } finally {
        this.state.isLoading = false; this.showLoader(false); console.log(`[DexGrid Load] Finished loadGridData process for Gen ${generation}.`);
    }
};

// --- DEBUG LOG ---
console.log("[DexGrid Define] loadGridData function defined.");


// --- Apply Local Type Filter (Uses pre-fetched detailed data FOR THE CURRENT GEN) ---
window.DexApp.DexGrid.applyLocalTypeFilter = function() {
    // (Keep existing logic - unchanged)
    const type = this.state.currentTypeFilter; const baseList = this.state.fullGenerationList;
    console.log(`[DexGrid Filter] Applying local filter for type: ${type || 'All'} on ${baseList.length} Pokémon from current generation.`); let filteredList = baseList;
    if (type && baseList.length > 0) { filteredList = baseList.filter(p => p.types && p.types.some(t => t.toLowerCase() === type.toLowerCase())); console.log(`[DexGrid Filter] ${filteredList.length} Pokémon matched type filter "${type}".`); }
    else { console.log(`[DexGrid Filter] No type filter applied or base list empty. Displaying all ${baseList.length} Pokémon.`); }
    this.state.currentPokemonList = filteredList; console.log("[DexGrid Filter] Calling displayDexGrid after filtering."); this.displayDexGrid(filteredList);
};

// --- Display Dex Grid ---
window.DexApp.DexGrid.displayDexGrid = function (pokemonListToDisplay) {
    // (Keep existing logic - unchanged)
    const gridContainer = this.elements.pokedexGrid; if (!gridContainer) { console.error("[DexGrid Display] Cannot display grid: Container element not found."); return; }
    console.log(`[DexGrid Display] Rendering ${pokemonListToDisplay.length} Pokémon in the grid.`); gridContainer.innerHTML = "";
    if (pokemonListToDisplay.length === 0) { this.showGridMessage("No Pokémon match the current filters."); }
    else { const fragment = document.createDocumentFragment(); pokemonListToDisplay.forEach((pokemonData) => { if (pokemonData) { try { fragment.appendChild(this.createDexGridCard(pokemonData)); } catch (cardError) { console.error(`[DexGrid Display] Error creating card for ${pokemonData?.name}:`, cardError); } } }); gridContainer.appendChild(fragment); requestAnimationFrame(() => { gridContainer.querySelectorAll(".pokedex-grid-card").forEach((card) => { card.classList.add("animated"); }); }); console.log(`[DexGrid Display] Appended ${pokemonListToDisplay.length} cards to the grid.`); }
    if (this.state.isInitialLoad) { this.dispatchInitialRenderComplete(); }
};

// --- Helper to Dispatch Initial Render Complete Event ---
window.DexApp.DexGrid.dispatchInitialRenderComplete = function() {
    // (Keep existing logic - unchanged)
    if (this.state.isInitialLoad) { console.log("[DexGrid Event] Dispatching dexGridInitialRenderComplete event."); document.dispatchEvent(new CustomEvent("dexGridInitialRenderComplete")); this.state.isInitialLoad = false; }
};


// --- Helper function to convert hex color to RGB string ---
window.DexApp.DexGrid.hexToRgbString = function(hex) {
    // (Keep existing logic - unchanged, includes logging)
    if (!hex || typeof hex !== 'string') { console.warn(`[hexToRgbString] Invalid input: ${hex}. Using default blue.`); return '59, 130, 246'; }
    if (hex.startsWith('var(')) {
        const varNameMatch = hex.match(/--[\w-]+/);
        if (varNameMatch && varNameMatch[0]) {
            const varName = varNameMatch[0];
            try {
                const computedColor = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
                hex = computedColor || '#3b82f6';
            } catch (e) { console.warn(`[hexToRgbString] Could not compute style for ${varName}. Using default blue.`); hex = '#3b82f6'; }
        } else { console.warn(`[hexToRgbString] Could not parse CSS variable: ${hex}. Using default blue.`); hex = '#3b82f6'; }
    }
    hex = hex.replace('#', ''); let r, g, b;
    try {
        if (hex.length === 3) { r = parseInt(hex[0] + hex[0], 16); g = parseInt(hex[1] + hex[1], 16); b = parseInt(hex[2] + hex[2], 16); }
        else if (hex.length === 6) { r = parseInt(hex.substring(0, 2), 16); g = parseInt(hex.substring(2, 4), 16); b = parseInt(hex.substring(4, 6), 16); }
        else { throw new Error("Invalid hex length"); }
        if (isNaN(r) || isNaN(g) || isNaN(b)) { throw new Error("Parsed value is NaN"); }
        return `${r}, ${g}, ${b}`;
    } catch (e) { console.warn(`[hexToRgbString] Failed to parse hex '${hex}': ${e.message}. Using default blue.`); return '59, 130, 246'; }
};


// --- Create Dex Grid Card ---
window.DexApp.DexGrid.createDexGridCard = function (pokemonData) {
    const cardElement = document.createElement("li"); cardElement.className = "pokedex-grid-card"; cardElement.dataset.pokemonId = pokemonData.id; cardElement.dataset.pokemonName = pokemonData.name; cardElement.setAttribute("tabindex", "0");
    const name = window.DexApp.Utils.formatters.formatName(pokemonData.name); const id = String(pokemonData.id).padStart(3, "0");
    const image = pokemonData.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonData.id}.png`;
    const fallbackImage = pokemonData.sprite_front || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonData.id}.png`;
    const placeholderImage = `https://placehold.co/96x96/cccccc/333333?text=%23${id}`;
    const types = pokemonData.types || []; const hasVariants = pokemonData.has_variants || false;
    let color1 = "var(--color-bg-light-panel)", color2 = "var(--color-bg-panel)"; let primaryTypeColorVar = "var(--color-accent)";
    let primaryTypeColorHex = '#3b82f6'; // Default fallback hex

    if (types.length > 0) {
        const typeName1 = types[0].toLowerCase();
        primaryTypeColorVar = `var(--type-${typeName1}, var(--color-accent))`;
        // Attempt to get the *actual* computed hex color for conversion
        try {
             primaryTypeColorHex = getComputedStyle(document.documentElement).getPropertyValue(`--type-${typeName1}`).trim() || '#ef4444'; // Default red if lookup fails
        } catch(e) {
             console.warn(`Could not get computed style for --type-${typeName1}, using fallback.`);
             primaryTypeColorHex = '#ef4444'; // Default red
        }
        color1 = `var(--type-${typeName1}, var(--color-secondary))`;
        color2 = types.length > 1 ? `var(--type-${types[1].toLowerCase()}, var(--color-primary))` : `var(--type-${typeName1}-light, var(--color-primary))`;
    }

    cardElement.style.setProperty("--card-gradient-color-1", color1);
    cardElement.style.setProperty("--card-gradient-color-2", color2);
    cardElement.style.setProperty("--dynamic-type-color", primaryTypeColorVar);
    cardElement.style.setProperty("--breathe-glow-color", primaryTypeColorVar);

    // Set the RGB version for the CSS animation
    const rgbString = this.hexToRgbString(primaryTypeColorHex); // Convert the resolved hex color
    cardElement.style.setProperty("--breathe-glow-color-rgb", rgbString);
    console.log(`[DexGrid Card ${id}] Set --breathe-glow-color-rgb to: ${rgbString} (from ${primaryTypeColorHex})`); // ADDED LOG

    const onErrorScript = `this.onerror=null; console.log('Primary sprite failed for ${id}, trying fallback...'); this.src='${fallbackImage}'; this.onerror=()=>{ this.onerror=null; console.log('Fallback sprite failed for ${id}, using placeholder.'); this.src='${placeholderImage}'; };`;
    cardElement.innerHTML = ` <div class="pokemon-card-header">${hasVariants ? '<span class="variant-indicator" title="Has Variants">✨</span>' : ""}<span class="pokemon-card-id">#${id}</span></div> <div class="pokemon-card-img-container"><img src="${image}" alt="${name}" class="pokemon-card-image" loading="lazy" onerror="${onErrorScript.replace(/"/g, '&quot;').replace(/\n/g, '')}"></div> <div class="pokemon-card-info"><h3 class="pokemon-card-name">${name}</h3><div class="pokemon-card-types">${types.map(type => `<span class="pokemon-card-type type-${type.toLowerCase()}">${window.DexApp.Utils.formatters.capitalize(type)}</span>`).join("")}</div></div>`;
    return cardElement;
};

// --- Handle Card Click ---
window.DexApp.DexGrid.handleCardClick = function (identifier) {
    // (Keep existing logic - unchanged)
    if (!identifier) { console.warn("Card click ignored: No identifier found."); return; }
    console.log(`[DexGrid Action] Card clicked: ${identifier}`); this.stopBreathingEffect();
    const currentIndex = this.state.currentPokemonList.findIndex((p) => String(p.id) === String(identifier) || p.name === identifier);
    const navContext = { source: "grid", list: this.state.currentPokemonList.map(p => ({ id: p.id, name: p.name })), currentIndex: currentIndex, };
    if (window.DexApp.DetailView?.fetchAndDisplayDetailData) { window.DexApp.DetailView.fetchAndDisplayDetailData(identifier, navContext); }
    else { console.error("DetailView module or fetchAndDisplayDetailData function not available."); alert("Cannot display Pokémon details at this time."); }
};

// --- Breathing Effect ---
window.DexApp.DexGrid.startBreathingEffect = function () {
    this.stopBreathingEffect(); // Clear any existing interval
    console.log("[DexGrid Breathe] Starting breathing effect...");

    // Apply the breathing effect immediately
    this.applyBreathingEffect();

    // Set an interval to reapply the effect every 5 seconds
    this.state.breathingInterval = setInterval(() => {
        this.applyBreathingEffect();
    }, 5000);
};

window.DexApp.DexGrid.stopBreathingEffect = function () {
    if (this.state.breathingInterval) {
        clearInterval(this.state.breathingInterval);
        this.state.breathingInterval = null;
        console.log("[DexGrid Breathe] Stopped breathing effect.");
    }

    // Remove the breathing class from the currently glowing card
    if (this.state.breathingCardId && this.elements.pokedexGrid) {
        const previousCard = this.elements.pokedexGrid.querySelector(
            `.pokedex-grid-card[data-pokemon-id="${this.state.breathingCardId}"]`
        );
        if (previousCard) {
            previousCard.classList.remove("breathing");
            console.log(`[DexGrid Breathe] Removed breathing class from card ID: ${this.state.breathingCardId}`);
        }
    }

    this.state.breathingCardId = null;
};

window.DexApp.DexGrid.applyBreathingEffect = function () {
    if (!this.elements.pokedexGrid) {
        console.warn("[DexGrid Breathe] Pokédex grid not found.");
        return;
    }

    // Get all cards that are not currently glowing
    const cards = this.elements.pokedexGrid.querySelectorAll(".pokedex-grid-card:not(.breathing)");
    if (cards.length === 0) {
        console.warn("[DexGrid Breathe] No eligible cards found.");
        return;
    }

    // Remove the breathing class from the previous card
    if (this.state.breathingCardId) {
        const previousCard = this.elements.pokedexGrid.querySelector(
            `.pokedex-grid-card[data-pokemon-id="${this.state.breathingCardId}"]`
        );
        if (previousCard) {
            previousCard.classList.remove("breathing");
        }
    }

    // Select a random card and apply the breathing class
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    randomCard.classList.add("breathing");
    this.state.breathingCardId = randomCard.dataset.pokemonId;

    console.log(`[DexGrid Breathe] Applied breathing effect to card ID: ${this.state.breathingCardId}`);
};

// --- Utility Functions ---
window.DexApp.DexGrid.showLoader = function (show, message = "Loading Pokémon...") {
    // (Keep existing logic - unchanged)
    if (this.elements.dexGridLoader) { const textElement = this.elements.dexGridLoader.querySelector('p'); if (textElement) textContent = message; if (show) { console.log(`[DexGrid Loader] Showing loader: ${message}`); this.elements.dexGridLoader.classList.remove('hidden'); } else { console.log("[DexGrid Loader] Hiding loader."); this.elements.dexGridLoader.classList.add('hidden'); } }
    else { console.error("[DexGrid Loader] Loader element not found, cannot show/hide."); }
};
window.DexApp.DexGrid.showGridError = function (message) {
    // (Keep existing logic - unchanged)
    console.log("[DexGrid Error] Displaying grid error message."); if (!this.elements.pokedexGrid) return;
    this.elements.pokedexGrid.innerHTML = `<li class="col-span-full text-center p-6 bg-red-900 bg-opacity-30 rounded border border-red-700"><p class="text-red-400 font-semibold">Error Loading Pokémon</p><p class="text-red-300 text-sm mt-1">${message || "An unexpected error occurred."}</p></li>`; this.showLoader(false);
};
window.DexApp.DexGrid.showGridMessage = function (message) {
    // (Keep existing logic - unchanged)
     console.log("[DexGrid Message] Displaying grid message."); if (!this.elements.pokedexGrid) return;
    if (!this.elements.pokedexGrid.querySelector('.bg-red-900')) { this.elements.pokedexGrid.innerHTML = `<li class="col-span-full text-center p-6 text-gray-400 italic">${message || "No Pokémon to display."}</li>`; } this.showLoader(false);
};

// Add tracking for script load
if (window.trackScriptLoad) { window.trackScriptLoad("dexGrid.js"); }
console.log("DexGrid module loaded (v2.2.6)"); // Update version log

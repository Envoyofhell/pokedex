/**
 * @file        dex/js/modules/dexGrid.js
 * @description Handles main Pokedex grid display, filtering, and interaction.
 * @version     3.0.0
 * @date        2025-05-05
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, api.js, detailView.js, lightbox.js
 * @dependents   app.js
 *
 * @changelog
 * v3.0.0 (2025-05-05): Implemented navigation context passing to DetailView. Added breathing effect logic. Refined tab/filter styling logic to rely on CSS classes. Added error checking for elements.
 * v2.0.0 (2025-05-04): Added dynamic color application for tabs/filters.
 * v1.0.0 (Initial): Basic grid display, generation/type filtering.
 */

window.DexApp = window.DexApp || {};
window.DexApp.DexGrid = {};

// --- State variables ---
window.DexApp.DexGrid.state = {
    currentGeneration: 1,           // Default generation to load
    currentTypeFilter: 'all',       // Default type filter
    currentDisplayedPokemon: [],    // Stores the list currently shown in the grid for context
    activeCardInterval: null,       // Timer ID for breathing effect interval
    currentBreathingCard: null      // Reference to the currently breathing card element
};

// --- DOM Elements Cache ---
window.DexApp.DexGrid.elements = {}; // Populated in initialize

// --- Grid Initialization Functions ---
window.DexApp.DexGrid.initialize = function() {
    console.log("Initializing DexGrid module (V3)...");
    this.cacheElements(); // Cache necessary DOM elements
    // Check if essential elements were found
    if (!this.elements.pokedexGrid || !this.elements.generationTabsContainer || !this.elements.typeFilterButtonsContainer) {
        console.error("DexGrid Initialization Failed: Missing essential DOM elements (grid, gen tabs, or type filters).");
        return; // Stop initialization if elements are missing
    }
    this.populateGenerationTabs();
    this.populateTypeFilters();
    this.setupEventListeners();
    this.startBreathingEffect(); // Start the breathing effect loop
    console.log("DexGrid module initialized (V3).");
};

// --- Cache DOM Elements ---
window.DexApp.DexGrid.cacheElements = function() {
    this.elements.pokedexGrid = document.getElementById('pokedex-grid');
    this.elements.dexGridLoader = document.getElementById('dex-grid-loader');
    this.elements.generationTabsContainer = document.getElementById('generation-tabs');
    this.elements.typeFilterButtonsContainer = document.getElementById('type-filter-buttons');
};

// --- Populate Tabs/Filters (Relies on CSS for coloring via data attributes) ---
window.DexApp.DexGrid.populateGenerationTabs = function() {
    const container = this.elements.generationTabsContainer;
    if (!container) return;
    container.innerHTML = ''; // Clear placeholder/previous buttons

    // Create 'All' button
    const allButton = document.createElement('button');
    allButton.className = 'gen-tab-button'; // Base class from enhanced.css
    allButton.dataset.generation = 'all';   // Data attribute for CSS/JS targeting
    allButton.textContent = `All`;
    container.appendChild(allButton);

    // Create buttons for each generation
    Object.keys(window.DexApp.Constants.GENERATION_RANGES).forEach(genNum => {
        if (genNum === 'all') return;
        const button = document.createElement('button');
        button.className = 'gen-tab-button';
        button.dataset.generation = genNum; // Set data attribute for CSS targeting
        button.textContent = `Gen ${genNum}`;
        container.appendChild(button);
    });

    // Set initial active state (Gen 1 by default, or 'all' if state dictates)
    const initialGen = this.state.currentGeneration === 'all' ? 'all' : String(this.state.currentGeneration);
    const initialActiveButton = container.querySelector(`[data-generation="${initialGen}"]`) || container.querySelector(`[data-generation="1"]`) || allButton;
    if (initialActiveButton) initialActiveButton.classList.add('active'); // Add .active class
};

window.DexApp.DexGrid.populateTypeFilters = function() {
    const container = this.elements.typeFilterButtonsContainer;
    if (!container) return;
    container.innerHTML = ''; // Clear placeholder/previous buttons

    // Create 'All' button
    const allButton = document.createElement('button');
    allButton.className = 'type-filter-button active'; // Active by default
    allButton.dataset.type = 'all';
    allButton.textContent = 'All';
    container.appendChild(allButton); // 'All' is active by default

    // Create buttons for each type
    window.DexApp.Constants.POKEMON_TYPES.forEach(type => {
        const button = document.createElement('button');
        button.className = 'type-filter-button';
        button.dataset.type = type; // Set data attribute for CSS targeting
        button.textContent = window.DexApp.Utils.formatters.capitalize(type);
        container.appendChild(button);
    });
};

// --- Setup Event Listeners ---
window.DexApp.DexGrid.setupEventListeners = function() {
    // Generation tabs click handler
    this.elements.generationTabsContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('.gen-tab-button');
        if (button && !button.classList.contains('active')) {
            // Update active class - CSS handles the styling change
            this.elements.generationTabsContainer.querySelectorAll('.gen-tab-button.active').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            this.state.currentGeneration = button.dataset.generation === 'all' ? 'all' : parseInt(button.dataset.generation, 10);
            this.state.currentTypeFilter = 'all'; // Reset type filter
            this.updateActiveTypeButton(); // Update visual state of type buttons
            await this.applyFiltersAndDisplayGrid();
        }
    });

    // Type filter buttons click handler
    this.elements.typeFilterButtonsContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('.type-filter-button');
        if (button && !button.classList.contains('active')) {
            // Update active class - CSS handles the styling change
            this.elements.typeFilterButtonsContainer.querySelectorAll('.type-filter-button.active').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            this.state.currentTypeFilter = button.dataset.type;
            await this.applyFiltersAndDisplayGrid();
        }
    });

    // --- Grid card click handler (Pass Context) ---
    this.elements.pokedexGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.pokedex-grid-card'); // Use closest
        if (card) {
            const pokemonIdentifier = card.dataset.pokemonName || card.dataset.pokemonId;
            if (pokemonIdentifier) {
                console.log(`Grid card clicked: ${pokemonIdentifier}`);
                if (window.DexApp.DetailView?.fetchAndDisplayDetailData) {
                    // Find the index in the *currently displayed* list
                    const cardId = parseInt(card.dataset.pokemonId, 10);
                    const clickedIndex = this.state.currentDisplayedPokemon.findIndex(p => p.id === cardId);

                    let context = null;
                    if (clickedIndex > -1) {
                        // Create navigation context ONLY if found in the current list
                        context = {
                            source: 'grid', // Indicate source
                            list: this.state.currentDisplayedPokemon, // Pass the list
                            currentIndex: clickedIndex // Pass the index
                        };
                        console.log("Passing grid navigation context:", context);
                    } else {
                        console.warn("Clicked Pokemon not found in current grid list. Opening without nav context.");
                    }

                    this.stopBreathingEffect(); // Stop animation
                    // Pass identifier and context (which might be null)
                    window.DexApp.DetailView.fetchAndDisplayDetailData(pokemonIdentifier, context);
                } else { console.error("DetailView.fetchAndDisplayDetailData function not found!"); }
            } else { console.error("Could not find pokemon identifier on clicked card:", card); }
        }
    });
    // --- End Grid Click ---
};

// --- Filtering and Displaying Grid ---
window.DexApp.DexGrid.applyFiltersAndDisplayGrid = async function() {
    window.DexApp.Utils.UI.showLoader(this.elements.dexGridLoader);
    this.elements.pokedexGrid.innerHTML = '';
    this.stopBreathingEffect();
    this.state.currentDisplayedPokemon = []; // Clear previous list

    try {
        const baseList = await window.DexApp.API.fetchGenerationList(this.state.currentGeneration);
        if (!baseList) throw new Error("Failed to fetch base Pokémon list.");
        let filteredList = baseList;
        if (this.state.currentTypeFilter !== 'all') {
            const typePokemonList = await window.DexApp.API.fetchTypeData(this.state.currentTypeFilter);
            if (!typePokemonList) throw new Error(`Failed type: ${this.state.currentTypeFilter}`);
            const typePokemonIds = new Set(typePokemonList.map(p => p.id));
            filteredList = baseList.filter(p => typePokemonIds.has(p.id));
        }

        // Store the final list for navigation context
        this.state.currentDisplayedPokemon = filteredList;

        if (filteredList.length === 0) {
            const genText = this.state.currentGeneration === 'all' ? 'All Gens' : `Gen ${this.state.currentGeneration}`;
            const typeText = this.state.currentTypeFilter === 'all' ? '' : `${window.DexApp.Utils.formatters.capitalize(this.state.currentTypeFilter)} `;
            window.DexApp.Utils.UI.showError(this.elements.pokedexGrid, `No ${typeText}Pokémon found in ${genText}.`);
        } else {
            await this.displayDexGrid(filteredList); // Display the stored list
        }
    } catch (error) {
        console.error("Error applying filters:", error);
        window.DexApp.Utils.UI.showError(this.elements.pokedexGrid, `Error loading Pokémon: ${error.message}`);
    } finally {
        window.DexApp.Utils.UI.hideLoader(this.elements.dexGridLoader);
        this.startBreathingEffect(); // Restart effect
    }
};

// --- Display Grid ---
window.DexApp.DexGrid.displayDexGrid = async function(pokemonList) {
    this.elements.pokedexGrid.innerHTML = ''; // Clear just before adding
    if (!pokemonList || pokemonList.length === 0) return;

    const fragment = document.createDocumentFragment();
    pokemonList.forEach(pokemon => {
        const card = this.createDexGridCard(pokemon);
        fragment.appendChild(card);
    });
    this.elements.pokedexGrid.appendChild(fragment); // Append all at once
    this.startBreathingEffect(); // Ensure effect runs on the new grid
};

// --- Create Grid Card Element ---
window.DexApp.DexGrid.createDexGridCard = function(pokemon) {
    const cardElement = document.createElement('li'); // Use li if grid is ul
    cardElement.className = 'pokedex-grid-card';
    cardElement.dataset.pokemonId = pokemon.id;
    cardElement.dataset.pokemonName = pokemon.name;
    cardElement.setAttribute('tabindex', '0'); // Accessibility

    const cachedData = window.DexApp.Cache.detailedPokemonCache[String(pokemon.id)] || window.DexApp.Cache.detailedPokemonCache[pokemon.name];
    const name = cachedData?.name ? window.DexApp.Utils.formatters.capitalize(cachedData.name) : window.DexApp.Utils.formatters.capitalize(pokemon.name);
    const id = cachedData?.id ? String(cachedData.id).padStart(3, '0') : String(pokemon.id).padStart(3, '0');
    const image = cachedData?.sprite || 'https://placehold.co/96x96/cccccc/ffffff?text=?';
    const types = cachedData?.types || [];
    const hasVariants = cachedData?.hasVariants || false;

    // Set dynamic CSS variables for styling
    let color1 = 'var(--color-bg-light-panel)', color2 = 'var(--color-bg-panel)';
    let primaryTypeColor = 'var(--color-accent)';
    if (types.length > 0) { const typeName1 = types[0].toLowerCase(); primaryTypeColor = `var(--type-${typeName1}, var(--color-accent))`; color1 = `var(--type-${typeName1}, var(--color-secondary))`; color2 = types.length > 1 ? `var(--type-${types[1].toLowerCase()}, var(--color-primary))` : `var(--type-${typeName1}-light, var(--color-primary))`; }
    cardElement.style.setProperty('--card-gradient-color-1', color1);
    cardElement.style.setProperty('--card-gradient-color-2', color2);
    cardElement.style.setProperty('--dynamic-type-color', primaryTypeColor);
    cardElement.style.setProperty('--breathe-glow-color', primaryTypeColor); // Set glow color

    cardElement.innerHTML = `
        <div class="pokemon-card-header">
            ${hasVariants ? '<span class="variant-indicator" title="Has Variants">✨</span>' : ''}
            <span class="pokemon-card-id">#${id}</span>
        </div>
        <div class="pokemon-card-img-container">
            <img src="${image}" alt="${name}" class="pokemon-card-image" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/96x96/cccccc/ffffff?text=?'">
        </div>
        <div class="pokemon-card-info">
            <h3 class="pokemon-card-name">${name}</h3>
            <div class="pokemon-card-types">
                ${types.map(type => `<span class="pokemon-card-type type-${type.toLowerCase()}">${window.DexApp.Utils.formatters.capitalize(type)}</span>`).join('')}
            </div>
        </div>
    `;

    // Lazy load full data if not cached (optional but good practice)
    if (!cachedData) {
        window.DexApp.API.fetchDetailedPokemonData(pokemon.id).then(data => {
            if (data && cardElement.isConnected) { /* Update card content/styles if needed */ }
        }).catch(error => { console.warn(`Lazy-load failed for ${pokemon.name}:`, error); });
    }
    return cardElement;
};


// --- Update Active Button Styles ---
window.DexApp.DexGrid.updateActiveTypeButton = function() {
    this.elements.typeFilterButtonsContainer.querySelectorAll('.type-filter-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === this.state.currentTypeFilter);
    });
};

// --- Breathing Effect Logic ---
window.DexApp.DexGrid.startBreathingEffect = function(interval = 4000) {
    this.stopBreathingEffect(); // Clear existing
    this.applyBreathingToRandomCard(); // Apply once immediately
    this.state.activeCardInterval = setInterval(() => { this.applyBreathingToRandomCard(); }, interval);
    // console.log("Breathing effect started.");
};

window.DexApp.DexGrid.stopBreathingEffect = function() {
     if (this.state.activeCardInterval) { clearInterval(this.state.activeCardInterval); this.state.activeCardInterval = null; }
    if (this.state.currentBreathingCard) { this.state.currentBreathingCard.classList.remove('breathing'); this.state.currentBreathingCard = null; }
    // console.log("Breathing effect stopped.");
};

window.DexApp.DexGrid.applyBreathingToRandomCard = function() {
    if (!this.elements.pokedexGrid) return;
    const cards = this.elements.pokedexGrid.querySelectorAll('.pokedex-grid-card:not(.breathing)'); // Select only non-breathing cards
    if (cards.length === 0) { // If all cards are somehow breathing (or grid is empty), clear the old one
         if (this.state.currentBreathingCard) { this.state.currentBreathingCard.classList.remove('breathing'); this.state.currentBreathingCard = null;}
         return;
    }

    // Remove from previous card
    if (this.state.currentBreathingCard) { this.state.currentBreathingCard.classList.remove('breathing'); }

    // Select a new random card from the non-breathing ones
    const randomIndex = Math.floor(Math.random() * cards.length);
    const randomCard = cards[randomIndex];

    // Add class and store reference
    if (randomCard) {
        randomCard.classList.add('breathing');
        this.state.currentBreathingCard = randomCard;
    }
};

console.log("DexGrid module loaded (V3.0.0)");

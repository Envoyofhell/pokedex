/**
 * @file        dex/js/modules/dexGrid.js
 * @description Manages the Pokémon grid display, generation filters, and type filters.
 * @version     2.1.0
 * @date        2025-05-06
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js, api.js, lightbox.js
 * @dependents   app.js
 *
 * @changelog
 * v2.1.0 (2025-05-06): Added consistent error handling, improved element caching, enhanced type filtering.
 * v2.0.1 (2025-05-05): Fixed breathingEffect not applying correctly to some cards.
 * v2.0.0 (2025-05-04): Complete rewrite with proper module structure and initialization.
 * v1.0.0 (Previous): Initial implementation with basic grid functionality.
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
    isLoading: false
};

// --- DOM Elements Cache ---
window.DexApp.DexGrid.elements = {
    pokedexGrid: null,
    dexGridLoader: null,
    generationTabs: null,
    typeFilterButtons: null
};

// --- Initialize DexGrid ---
window.DexApp.DexGrid.initialize = function() {
    console.log("Initializing DexGrid module...");
    this.cacheElements();
    
    // Check if critical elements exist
    if (!this.elements.pokedexGrid) {
        console.error("DexGrid Init Failed: Pokédex grid element not found.");
        return false;
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup generation tabs
    this.setupGenerationTabs();
    
    // Setup type filter buttons
    this.setupTypeFilterButtons();
    
    // Start random breathing effect
    this.startBreathingEffect();
    
    console.log("DexGrid module initialized.");
    return true;
};

// --- Cache DOM Elements ---
window.DexApp.DexGrid.cacheElements = function() {
    this.elements.pokedexGrid = document.getElementById('pokedex-grid');
    this.elements.dexGridLoader = document.getElementById('dex-grid-loader');
    this.elements.generationTabs = document.getElementById('generation-tabs');
    this.elements.typeFilterButtons = document.getElementById('type-filter-buttons');
};

// --- Setup Event Listeners ---
window.DexApp.DexGrid.setupEventListeners = function() {
    // Global click handler for grid cards (event delegation)
    if (this.elements.pokedexGrid) {
        this.elements.pokedexGrid.addEventListener('click', (event) => {
            const card = event.target.closest('.pokedex-grid-card');
            if (card) {
                const pokemonId = card.dataset.pokemonId;
                const pokemonName = card.dataset.pokemonName;
                this.handleCardClick(pokemonId || pokemonName);
            }
        });
    }
    
    // Handle window resize event
    window.addEventListener('resize', this.handleResize.bind(this));
};

// --- Setup Generation Tabs ---
window.DexApp.DexGrid.setupGenerationTabs = function() {
    const tabsContainer = this.elements.generationTabs;
    if (!tabsContainer) return;
    
    // Clear existing tabs
    tabsContainer.innerHTML = '';
    
    // Add "All" generation tab
    const allTab = document.createElement('button');
    allTab.className = 'gen-tab-button';
    allTab.dataset.generation = 'all';
    allTab.textContent = 'All Generations';
    allTab.addEventListener('click', () => this.handleGenerationTabClick('all'));
    tabsContainer.appendChild(allTab);
    
    // Check if Constants is available
    if (!window.DexApp.Constants?.GENERATION_RANGES) {
        console.warn("Constants missing! Using fallback generation values.");
        
        // Add tabs for each generation (default 1-9)
        for (let i = 1; i <= 9; i++) {
            const tab = document.createElement('button');
            tab.className = 'gen-tab-button';
            tab.dataset.generation = i;
            tab.textContent = `Gen ${i}`;
            if (i === this.state.currentGeneration) tab.classList.add('active');
            tab.addEventListener('click', () => this.handleGenerationTabClick(i));
            tabsContainer.appendChild(tab);
        }
    } else {
        // Use generation data from Constants
        Object.keys(window.DexApp.Constants.GENERATION_RANGES).forEach(genKey => {
            if (genKey === 'all') return; // Skip 'all' as we already added it
            
            const genData = window.DexApp.Constants.GENERATION_RANGES[genKey];
            const tab = document.createElement('button');
            tab.className = 'gen-tab-button';
            tab.dataset.generation = genKey;
            tab.textContent = `Gen ${genKey}: ${genData.name || ''}`;
            if (genKey === String(this.state.currentGeneration)) tab.classList.add('active');
            tab.addEventListener('click', () => this.handleGenerationTabClick(genKey));
            tabsContainer.appendChild(tab);
        });
    }
};

// --- Setup Type Filter Buttons ---
window.DexApp.DexGrid.setupTypeFilterButtons = function() {
    const container = this.elements.typeFilterButtons;
    if (!container) return;
    
    // Clear existing buttons
    container.innerHTML = '';
    
    // Add "All" type filter button
    const allButton = document.createElement('button');
    allButton.className = 'type-filter-button active';
    allButton.dataset.type = 'all';
    allButton.textContent = 'All Types';
    allButton.addEventListener('click', () => this.handleTypeFilterClick(null));
    container.appendChild(allButton);
    
    // Check if Constants is available
    const pokeTypes = window.DexApp.Constants?.POKEMON_TYPES || [
        "normal", "fire", "water", "electric", "grass", "ice",
        "fighting", "poison", "ground", "flying", "psychic", "bug",
        "rock", "ghost", "dragon", "dark", "steel", "fairy"
    ];
    
    // Add type filter buttons
    pokeTypes.forEach(type => {
        const button = document.createElement('button');
        button.className = 'type-filter-button';
        button.dataset.type = type;
        button.textContent = this.capitalizeFirstLetter(type);
        button.addEventListener('click', () => this.handleTypeFilterClick(type));
        container.appendChild(button);
    });
};

// --- Handle Generation Tab Click ---
window.DexApp.DexGrid.handleGenerationTabClick = function(generation) {
    // Don't reload if the generation is already active
    if (generation === this.state.currentGeneration) return;
    
    // Update active tab
    if (this.elements.generationTabs) {
        const tabs = this.elements.generationTabs.querySelectorAll('.gen-tab-button');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.generation === String(generation));
        });
    }
    
    // Reset type filter when changing generation
    this.handleTypeFilterClick(null);
    
    // Update current generation
    this.state.currentGeneration = generation;
    
    // Fetch and display Pokémon for this generation
    this.loadGenerationData(generation);
};

// --- Handle Type Filter Click ---
window.DexApp.DexGrid.handleTypeFilterClick = function(type) {
    // Update active button
    if (this.elements.typeFilterButtons) {
        const buttons = this.elements.typeFilterButtons.querySelectorAll('.type-filter-button');
        buttons.forEach(button => {
            button.classList.toggle('active', 
                (type === null && button.dataset.type === 'all') || 
                button.dataset.type === type
            );
        });
    }
    
    // Update current type filter
    this.state.currentTypeFilter = type;
    
    // Either filter the existing list or fetch type-specific data
    if (type === null) {
        // If clearing filter, just reload the current generation
        if (this.state.currentPokemonList.length > 0) {
            this.displayDexGrid(this.state.currentPokemonList);
        } else {
            this.loadGenerationData(this.state.currentGeneration);
        }
    } else {
        // Fetch Pokémon of this type
        this.loadTypeData(type);
    }
};

// --- Load Generation Data ---
window.DexApp.DexGrid.loadGenerationData = async function(generation) {
    if (this.state.isLoading) return;
    this.state.isLoading = true;
    
    if (this.elements.dexGridLoader) {
        if (window.DexApp.Utils?.UI?.showLoader) {
            window.DexApp.Utils.UI.showLoader(this.elements.dexGridLoader);
        } else {
            this.elements.dexGridLoader.classList.remove('hidden');
        }
    }
    
    try {
        // Check if API module is available
        if (!window.DexApp.API || typeof window.DexApp.API.fetchGenerationList !== 'function') {
            throw new Error("API module missing or fetchGenerationList function not found");
        }
        
        const pokemonList = await window.DexApp.API.fetchGenerationList(generation);
        this.state.currentPokemonList = pokemonList;
        this.displayDexGrid(pokemonList);
    } catch (error) {
        console.error(`Error loading Generation ${generation}:`, error);
        this.showGridError(`Failed to load Generation ${generation}. ${error.message}`);
    } finally {
        this.state.isLoading = false;
        if (this.elements.dexGridLoader) {
            if (window.DexApp.Utils?.UI?.hideLoader) {
                window.DexApp.Utils.UI.hideLoader(this.elements.dexGridLoader);
            } else {
                this.elements.dexGridLoader.classList.add('hidden');
            }
        }
    }
};

// --- Load Type Data ---
window.DexApp.DexGrid.loadTypeData = async function(type) {
    if (this.state.isLoading) return;
    this.state.isLoading = true;
    
    if (this.elements.dexGridLoader) {
        if (window.DexApp.Utils?.UI?.showLoader) {
            window.DexApp.Utils.UI.showLoader(this.elements.dexGridLoader);
        } else {
            this.elements.dexGridLoader.classList.remove('hidden');
        }
    }
    
    try {
        // Check if API module is available
        if (!window.DexApp.API || typeof window.DexApp.API.fetchTypeData !== 'function') {
            throw new Error("API module missing or fetchTypeData function not found");
        }
        
        const pokemonList = await window.DexApp.API.fetchTypeData(type);
        this.displayDexGrid(pokemonList);
    } catch (error) {
        console.error(`Error loading Type ${type}:`, error);
        this.showGridError(`Failed to load Type ${type}. ${error.message}`);
    } finally {
        this.state.isLoading = false;
        if (this.elements.dexGridLoader) {
            if (window.DexApp.Utils?.UI?.hideLoader) {
                window.DexApp.Utils.UI.hideLoader(this.elements.dexGridLoader);
            } else {
                this.elements.dexGridLoader.classList.add('hidden');
            }
        }
    }
};

// --- Display Dex Grid ---
window.DexApp.DexGrid.displayDexGrid = function(pokemonList) {
    const grid = this.elements.pokedexGrid;
    if (!grid) return;
    
    // Clear existing grid
    grid.innerHTML = '';
    
    if (!pokemonList || pokemonList.length === 0) {
        this.showGridError("No Pokémon found for the current filters.");
        return;
    }
    
    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Add each Pokémon card to the fragment
    pokemonList.forEach(pokemon => {
        const card = this.createDexGridCard(pokemon);
        fragment.appendChild(card);
    });
    
    // Add the fragment to the grid
    grid.appendChild(fragment);
    
    // Apply breathing effect to the new cards
    this.applyBreathingEffect();
    
    return pokemonList;
};

// --- Create Grid Card Element ---
window.DexApp.DexGrid.createDexGridCard = function(pokemon) {
    const cardElement = document.createElement('li'); // Use li if grid is ul
    cardElement.className = 'pokedex-grid-card';
    cardElement.dataset.pokemonId = pokemon.id;
    cardElement.dataset.pokemonName = pokemon.name;
    cardElement.setAttribute('tabindex', '0'); // Accessibility

    const cachedData = window.DexApp.Cache?.detailedPokemonCache?.[String(pokemon.id)] || 
                      window.DexApp.Cache?.detailedPokemonCache?.[pokemon.name];
                      
    const name = cachedData?.name ? this.formatName(cachedData.name) : this.formatName(pokemon.name);
    const id = cachedData?.id ? String(cachedData.id).padStart(3, '0') : String(pokemon.id).padStart(3, '0');
    
    // Get sprite URL with fallbacks
    const spriteUrl = this.getPokemonSpriteUrl(pokemon, cachedData);
    
    // Get types with fallback
    const types = cachedData?.types || pokemon.types || [];
    const hasVariants = cachedData?.hasVariants || false;

    // Set dynamic CSS variables for styling
    let color1 = 'var(--color-bg-light-panel)', color2 = 'var(--color-bg-panel)';
    let primaryTypeColor = 'var(--color-accent)';
    
    if (types.length > 0) { 
        const typeName1 = Array.isArray(types[0]) ? types[0].toLowerCase() : 
            (typeof types[0] === 'string' ? types[0].toLowerCase() : 
            (types[0]?.type?.name || 'normal').toLowerCase());
            
        primaryTypeColor = `var(--type-${typeName1}, var(--color-accent))`; 
        color1 = `var(--type-${typeName1}, var(--color-secondary))`; 
        
        if (types.length > 1) {
            const typeName2 = Array.isArray(types[1]) ? types[1].toLowerCase() : 
                (typeof types[1] === 'string' ? types[1].toLowerCase() : 
                (types[1]?.type?.name || 'normal').toLowerCase());
                
            color2 = `var(--type-${typeName2}, var(--color-primary))`;
        } else {
            color2 = `var(--type-${typeName1}-light, var(--color-primary))`;
        }
    }
    
    cardElement.style.setProperty('--card-gradient-color-1', color1);
    cardElement.style.setProperty('--card-gradient-color-2', color2);
    cardElement.style.setProperty('--dynamic-type-color', primaryTypeColor);
    cardElement.style.setProperty('--breathe-glow-color', primaryTypeColor); // Set glow color

    // Prepare type badges HTML
    let typesBadgesHtml = '';
    if (Array.isArray(types)) {
        typesBadgesHtml = types.map(type => {
            // Handle different type data structures
            const typeName = typeof type === 'string' ? type : 
                           (type?.type?.name || type?.name || 'normal');
            
            return `<span class="pokemon-card-type type-${typeName.toLowerCase()}">${this.capitalizeFirstLetter(typeName)}</span>`;
        }).join('');
    }

    // Build the card HTML
    cardElement.innerHTML = `
        <div class="pokemon-card-header">
            ${hasVariants ? '<span class="variant-indicator" title="Has Variants">✨</span>' : ''}
            <span class="pokemon-card-id">#${id}</span>
        </div>
        <div class="pokemon-card-img-container">
            <img src="${spriteUrl}" alt="${name}" class="pokemon-card-image" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/96x96/cccccc/ffffff?text=?'">
        </div>
        <div class="pokemon-card-info">
            <h3 class="pokemon-card-name">${name}</h3>
            <div class="pokemon-card-types">
                ${typesBadgesHtml}
            </div>
        </div>
    `;

    // Optional: Lazy load full data if not cached
    if (!cachedData && window.DexApp.API?.fetchDetailedPokemonData) {
        window.DexApp.API.fetchDetailedPokemonData(pokemon.id).catch(error => { 
            console.warn(`Lazy-load failed for ${pokemon.name}:`, error); 
        });
    }
    
    return cardElement;
};

// --- Handle Card Click ---
window.DexApp.DexGrid.handleCardClick = function(identifier) {
    if (!identifier) return;
    
    this.stopBreathingEffect(); // Stop any current breathing effect
    
    // Create navigation context for the detail view
    const navContext = {
        source: 'grid',
        list: this.state.currentPokemonList,
        currentIndex: this.state.currentPokemonList.findIndex(p => 
            p.id === Number(identifier) || p.name === identifier
        )
    };
    
    // Check if DetailView module is available
    if (window.DexApp.DetailView?.fetchAndDisplayDetailData) {
        window.DexApp.DetailView.fetchAndDisplayDetailData(identifier, navContext);
    } else if (window.DexApp.Lightbox?.openDetailLightbox) {
        // Fallback to just opening the lightbox if DetailView is not available
        console.warn("DetailView module not found, using Lightbox fallback");
        window.DexApp.Lightbox.openDetailLightbox('grid');
    } else {
        console.error("Cannot open detail view - required modules missing");
    }
};

// --- Breathing Effect ---
window.DexApp.DexGrid.startBreathingEffect = function() {
    // Clear any existing interval
    this.stopBreathingEffect();
    
    // Set interval to apply breathing effect to a random card every 8 seconds
    this.state.breathingInterval = setInterval(() => {
        this.applyBreathingEffect();
    }, 8000);
    
    // Apply initial breathing effect
    this.applyBreathingEffect();
};

window.DexApp.DexGrid.stopBreathingEffect = function() {
    if (this.state.breathingInterval) {
        clearInterval(this.state.breathingInterval);
        this.state.breathingInterval = null;
    }
    
    // Remove breathing class from any card that has it
    if (this.elements.pokedexGrid) {
        const breathingCard = this.elements.pokedexGrid.querySelector('.pokedex-grid-card.breathing');
        if (breathingCard) {
            breathingCard.classList.remove('breathing');
        }
    }
    
    this.state.breathingCardId = null;
};

window.DexApp.DexGrid.applyBreathingEffect = function() {
    if (!this.elements.pokedexGrid) return;
    
    // Remove breathing from current card
    const currentBreathingCard = this.elements.pokedexGrid.querySelector('.pokedex-grid-card.breathing');
    if (currentBreathingCard) {
        currentBreathingCard.classList.remove('breathing');
    }
    
    // Get all cards
    const cards = this.elements.pokedexGrid.querySelectorAll('.pokedex-grid-card');
    if (cards.length === 0) return;
    
    // Select a random card
    const randomIndex = Math.floor(Math.random() * cards.length);
    const randomCard = cards[randomIndex];
    
    // Apply breathing effect
    randomCard.classList.add('breathing');
    this.state.breathingCardId = randomCard.dataset.pokemonId;
};

// --- Utility Functions ---
window.DexApp.DexGrid.handleResize = function() {
    // Handle any grid adjustments needed on resize
    // Currently no-op, but provided for future expansion
};

window.DexApp.DexGrid.showGridError = function(message) {
    if (!this.elements.pokedexGrid) return;
    
    if (window.DexApp.Utils?.UI?.showError) {
        window.DexApp.Utils.UI.showError(this.elements.pokedexGrid, message);
    } else {
        // Fallback if UI.showError is not available
        this.elements.pokedexGrid.innerHTML = `
            <li class="col-span-full text-center p-4 text-red-500">
                ${message || "An error occurred loading Pokémon."}
            </li>
        `;
    }
};

window.DexApp.DexGrid.capitalizeFirstLetter = function(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
};

window.DexApp.DexGrid.formatName = function(name) {
    if (window.DexApp.Utils?.formatters?.formatName) {
        return window.DexApp.Utils.formatters.formatName(name);
    }
    
    // Fallback formatter
    if (!name) return '';
    return name.split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

window.DexApp.DexGrid.getPokemonSpriteUrl = function(pokemon, cachedData) {
    // Try to get sprite from cached data first
    if (cachedData?.sprite) return cachedData.sprite;
    
    if (pokemon.sprite) return pokemon.sprite;
    
    // Fallback to constructing URL from ID
    if (pokemon.id) {
        // Official artwork URL
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
    }
    
    // Last resort fallback
    return 'https://placehold.co/96x96/cccccc/ffffff?text=?';
};

// Add tracking for script load if diagnostic script is loaded
if (window.trackScriptLoad) {
    window.trackScriptLoad('dexGrid.js');
}

console.log("DexGrid module loaded (v2.1.0)");
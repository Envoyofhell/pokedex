// dex/js/modules/dexGrid.js
// Grid view display functions for the Pokédex application

// Create DexGrid namespace
window.DexApp = window.DexApp || {};
window.DexApp.DexGrid = {};

// State variables
window.DexApp.DexGrid.state = {
    currentGeneration: 1,
    currentTypeFilter: 'all'
};

// DOM Elements
window.DexApp.DexGrid.elements = {
    pokedexGrid: document.getElementById('pokedex-grid'),
    dexGridLoader: document.getElementById('dex-grid-loader'),
    generationTabsContainer: document.getElementById('generation-tabs'),
    typeFilterButtonsContainer: document.getElementById('type-filter-buttons')
};

// --- Grid Initialization Functions ---
window.DexApp.DexGrid.initialize = function() {
    this.populateGenerationTabs();
    this.populateTypeFilters();
    this.setupEventListeners();
};

window.DexApp.DexGrid.populateGenerationTabs = function() {
    const container = this.elements.generationTabsContainer;
    if (!container) return;
    
    container.innerHTML = '';
    const allButton = document.createElement('button');
    allButton.className = 'gen-tab-button';
    allButton.dataset.generation = 'all';
    allButton.textContent = `All`;
    container.appendChild(allButton);
    
    Object.keys(window.DexApp.Constants.GENERATION_RANGES).forEach(genNum => {
        if (genNum === 'all') return;
        
        const button = document.createElement('button');
        button.className = 'gen-tab-button';
        button.dataset.generation = genNum;
        button.textContent = `Gen ${genNum}`;
        
        if (parseInt(genNum, 10) === this.state.currentGeneration) {
            button.classList.add('active');
        }
        
        container.appendChild(button);
    });
};

window.DexApp.DexGrid.populateTypeFilters = function() {
    const container = this.elements.typeFilterButtonsContainer;
    if (!container) return;
    
    container.innerHTML = '';
    const allButton = document.createElement('button');
    allButton.className = 'type-filter-button active';
    allButton.dataset.type = 'all';
    allButton.textContent = 'All';
    container.appendChild(allButton);
    
    window.DexApp.Constants.POKEMON_TYPES.forEach(type => {
        const button = document.createElement('button');
        button.className = 'type-filter-button';
        button.dataset.type = type;
        button.textContent = type;
        button.style.setProperty('--dynamic-type-color', `var(--type-${type})`);
        button.classList.add(`type-bg-${type}`);
        container.appendChild(button);
    });
};

window.DexApp.DexGrid.setupEventListeners = function() {
    // Generation tabs click handler
    this.elements.generationTabsContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('.gen-tab-button');
        if (button && !button.classList.contains('active')) {
            this.elements.generationTabsContainer.querySelectorAll('.gen-tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            this.state.currentGeneration = button.dataset.generation === 'all' ? 
                'all' : parseInt(button.dataset.generation, 10);
                
            this.state.currentTypeFilter = 'all';
            this.updateActiveTypeButton();
            await this.applyFiltersAndDisplayGrid();
        }
    });
    
    // Type filter buttons click handler
    this.elements.typeFilterButtonsContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('.type-filter-button');
        if (button && !button.classList.contains('active')) {
            this.elements.typeFilterButtonsContainer.querySelectorAll('.type-filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            this.state.currentTypeFilter = button.dataset.type;
            await this.applyFiltersAndDisplayGrid();
        }
    });
    
    // Grid card click handler (using event delegation)
    this.elements.pokedexGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.pokedex-grid-card');
        if (card) {
            const pokemonIdentifier = card.dataset.pokemonName || card.dataset.pokemonId;
            if (pokemonIdentifier) {
                console.log(`Card click registered for: ${pokemonIdentifier}`);
                window.DexApp.DetailView.fetchAndDisplayDetailData(pokemonIdentifier);
            } else {
                console.error("Could not find identifier on clicked card:", card);
            }
        }
    });
};

// --- Grid Display Functions ---
window.DexApp.DexGrid.applyFiltersAndDisplayGrid = async function() {
    window.DexApp.Utils.UI.showLoader(this.elements.dexGridLoader);
    this.elements.pokedexGrid.innerHTML = '';
    
    try {
        const baseList = await window.DexApp.API.fetchGenerationList(this.state.currentGeneration);
        if (!baseList || baseList.length === 0) {
            window.DexApp.Utils.UI.showError(this.elements.pokedexGrid, 
                `No Pokémon found for Generation ${this.state.currentGeneration === 'all' ? 'All' : this.state.currentGeneration}.`);
            return;
        }
        
        let filteredList = baseList;
        if (this.state.currentTypeFilter !== 'all') {
            const typePokemonList = await window.DexApp.API.fetchTypeData(this.state.currentTypeFilter);
            const typePokemonIds = new Set(typePokemonList.map(p => p.id));
            filteredList = baseList.filter(p => typePokemonIds.has(p.id));
        }
        
        if (filteredList.length === 0) {
            window.DexApp.Utils.UI.showError(this.elements.pokedexGrid, 
                `No ${window.DexApp.Utils.formatters.capitalize(this.state.currentTypeFilter)} Pokémon found in Generation ${this.state.currentGeneration === 'all' ? 'All' : this.state.currentGeneration}.`);
        } else {
            await this.displayDexGrid(filteredList);
        }
    } catch (error) {
        console.error("Error applying filters:", error);
        window.DexApp.Utils.UI.showError(this.elements.pokedexGrid, "An error occurred while filtering Pokémon.");
    } finally {
        window.DexApp.Utils.UI.hideLoader(this.elements.dexGridLoader);
    }
};

window.DexApp.DexGrid.displayDexGrid = async function(pokemonList) {
    this.elements.pokedexGrid.innerHTML = '';
    if (!pokemonList || pokemonList.length === 0) {
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    // Preload the first few Pokemon details for faster initial render
    const initialDetailPromises = pokemonList.slice(0, 15).map(p => 
        window.DexApp.API.fetchDetailedPokemonData(p.id).catch(e => null)
    );
    await Promise.allSettled(initialDetailPromises);
    
    // Create and append cards for each Pokemon
    pokemonList.forEach(pokemon => {
        const card = this.createDexGridCard(pokemon);
        fragment.appendChild(card);
    });
    
    this.elements.pokedexGrid.appendChild(fragment);
};

window.DexApp.DexGrid.createDexGridCard = function(pokemon) {
    const li = document.createElement('li');
    li.className = 'pokedex-grid-card';
    li.dataset.pokemonId = pokemon.id;
    li.dataset.pokemonName = pokemon.name;
    
    const cachedData = window.DexApp.Cache.detailedPokemonCache[String(pokemon.id)] || 
                        window.DexApp.Cache.detailedPokemonCache[pokemon.name];
                        
    const name = cachedData?.name ? 
        window.DexApp.Utils.formatters.capitalize(cachedData.name) : 
        window.DexApp.Utils.formatters.capitalize(pokemon.name);
        
    const id = cachedData?.id ? 
        String(cachedData.id).padStart(3, '0') : 
        String(pokemon.id).padStart(3, '0');
        
    const image = cachedData?.sprite || 'https://placehold.co/96x96/cccccc/ffffff?text=?';
    const types = cachedData?.types || [];
    const hasVariants = cachedData?.hasVariants || false;
    
    // Set card styling based on Pokemon types
    let color1 = 'var(--color-bg-panel)', color2 = 'var(--color-bg-light-panel)';
    if (types.length === 1) {
        const typeName = types[0];
        color1 = `var(--type-${typeName}, var(--color-secondary))`;
        color2 = `var(--type-${typeName}-light, var(--color-primary))`;
    } else if (types.length > 1) {
        const typeName1 = types[0];
        const typeName2 = types[1];
        color1 = `var(--type-${typeName1}, var(--color-secondary))`;
        color2 = `var(--type-${typeName2}, var(--color-primary))`;
    }
    
    li.style.setProperty('--card-gradient-color-1', color1);
    li.style.setProperty('--card-gradient-color-2', color2);
    
    const primaryType = types.length > 0 ? types[0] : 'normal';
    li.style.setProperty('--dynamic-type-color', `var(--type-${primaryType}, var(--color-accent))`);
    
    li.innerHTML = `
        <div class="pokemon-card-header">
            ${hasVariants ? '<span class="variant-indicator" title="Has Variants">✨</span>' : ''}
            <span class="pokemon-card-id">#${id}</span>
        </div>
        <div class="pokemon-card-img-container">
            <img src="${image}" alt="${name}" class="pokemon-card-image" loading="lazy" 
                 onerror="this.src='https://placehold.co/96x96/cccccc/ffffff?text=?'">
        </div>
        <div class="pokemon-card-info">
            <h3 class="pokemon-card-name">${name}</h3>
            <div class="pokemon-card-types">
                ${types.map(type => `<span class="pokemon-card-type type-${type}">${type}</span>`).join('')}
            </div>
        </div>
    `;
    
    // Lazy load Pokemon data if needed
    if (!cachedData) {
        window.DexApp.API.fetchDetailedPokemonData(pokemon.id).then(data => {
            if (data) {
                li.querySelector('.pokemon-card-name').textContent = 
                    window.DexApp.Utils.formatters.capitalize(data.name);
                    
                li.querySelector('.pokemon-card-id').textContent = 
                    `#${String(data.id).padStart(3, '0')}`;
                    
                li.querySelector('.pokemon-card-image').src = data.sprite;
                
                const typesHtml = data.types.map(type => 
                    `<span class="pokemon-card-type type-${type}">${type}</span>`
                ).join('');
                li.querySelector('.pokemon-card-types').innerHTML = typesHtml;
                
                // Update card styling based on actual types
                const cardPrimaryType = data.types.length > 0 ? data.types[0] : 'normal';
                let c1 = 'var(--color-bg-panel)', c2 = 'var(--color-bg-light-panel)';
                
                if (data.types.length === 1) {
                    c1 = `var(--type-${cardPrimaryType}, var(--color-secondary))`;
                    c2 = `var(--type-${cardPrimaryType}-light, var(--color-primary))`;
                } else if (data.types.length > 1) {
                    c1 = `var(--type-${data.types[0]}, var(--color-secondary))`;
                    c2 = `var(--type-${data.types[1]}, var(--color-primary))`;
                }
                
                li.style.setProperty('--card-gradient-color-1', c1);
                li.style.setProperty('--card-gradient-color-2', c2);
                li.style.setProperty('--dynamic-type-color', `var(--type-${cardPrimaryType}, var(--color-accent))`);
                
                // Add variant indicator if needed
                if (data.hasVariants) {
                    const header = li.querySelector('.pokemon-card-header');
                    if (!header.querySelector('.variant-indicator')) {
                        header.insertAdjacentHTML('afterbegin', 
                            '<span class="variant-indicator" title="Has Variants">✨</span>');
                    }
                }
            }
        }).catch(error => {
            console.warn(`Failed card update: ${pokemon.name}`, error);
        });
    }
    
    return li;
};

window.DexApp.DexGrid.updateActiveTypeButton = function() {
    this.elements.typeFilterButtonsContainer.querySelectorAll('.type-filter-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === this.state.currentTypeFilter);
    });
};
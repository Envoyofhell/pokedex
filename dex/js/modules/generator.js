// dex/js/modules/generator.js
// Random generator functionality for the Pokédex application

// Create Generator namespace
window.DexApp = window.DexApp || {};
window.DexApp.Generator = {};

// State variables
window.DexApp.Generator.state = {
    active: false,
    options: {
        count: 6,
        regions: [],
        types: [],
        legendaries: true,
        sublegendaries: true,
        mythicals: true,
        ultraBeasts: true,
        paradoxes: true,
        forms: true,
        megas: true,
        gigantamaxes: true,
        nfes: true,
        fullyEvolved: true,
        evolutionCounts: [0, 1, 2],
        shinyChance: 16/65536, // Default shiny rate
        sprites: true
    },
    generatedHistory: [],
    currentHistoryIndex: -1,
    shiniesFound: []
};

// DOM Elements
window.DexApp.Generator.elements = {
    generatorButton: document.getElementById('generator-button'),
    generatorOverlay: document.getElementById('generator-overlay'),
    generatorCloseButton: document.getElementById('generator-close-button'),
    generatorForm: document.getElementById('generator-form'),
    generatorLoader: document.getElementById('generator-loader'),
    generatorResultsContainer: document.getElementById('generator-results'),
    generatorHistoryContainer: document.getElementById('generator-history'),
    generatorPrevButton: document.getElementById('generator-prev-button'),
    generatorNextButton: document.getElementById('generator-next-button'),
    generatorShinyHistory: document.getElementById('generator-shiny-history')
};

// --- Initialize Generator ---
window.DexApp.Generator.initialize = function() {
    this.setupEventListeners();
    this.populateGeneratorFilters();
    this.loadShinyHistory();
};

window.DexApp.Generator.setupEventListeners = function() {
    const elements = this.elements;
    
    // Generator button
    if (elements.generatorButton) {
        elements.generatorButton.addEventListener('click', () => this.openGenerator());
    }
    
    // Generator close button
    if (elements.generatorCloseButton) {
        elements.generatorCloseButton.addEventListener('click', () => this.closeGeneratorOverlay());
    }
    
    // Generator form submit
    if (elements.generatorForm) {
        elements.generatorForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.generateRandomPokemon();
        });
    }
    
    // Generator history navigation
    if (elements.generatorPrevButton) {
        elements.generatorPrevButton.addEventListener('click', () => this.showPreviousGeneration());
    }
    
    if (elements.generatorNextButton) {
        elements.generatorNextButton.addEventListener('click', () => this.showNextGeneration());
    }
    
    // Generator overlay backdrop click (close on click outside)
    if (elements.generatorOverlay) {
        elements.generatorOverlay.addEventListener('click', (event) => {
            if (event.target === elements.generatorOverlay) {
                this.closeGeneratorOverlay();
            }
        });
    }
};

window.DexApp.Generator.populateGeneratorFilters = function() {
    // Populate region checkboxes
    const regionsContainer = document.getElementById('generator-regions-container');
    if (regionsContainer) {
        regionsContainer.innerHTML = '';
        
        Object.keys(window.DexApp.Constants.GENERATION_RANGES).forEach(genNum => {
            if (genNum === 'all') return;
            
            const regionName = window.DexApp.Utils.formatters.getRegionNameForGen(genNum);
            const label = document.createElement('label');
            label.className = 'generator-checkbox';
            
            label.innerHTML = `
                <input type="checkbox" name="generator-region" value="${genNum}" checked>
                <span class="checkmark"></span>
                ${regionName} (Gen ${genNum})
            `;
            
            regionsContainer.appendChild(label);
        });
    }
    
    // Populate type checkboxes
    const typesContainer = document.getElementById('generator-types-container');
    if (typesContainer) {
        typesContainer.innerHTML = '';
        
        window.DexApp.Constants.POKEMON_TYPES.forEach(type => {
            const label = document.createElement('label');
            label.className = 'generator-checkbox';
            
            label.innerHTML = `
                <input type="checkbox" name="generator-type" value="${type}">
                <span class="checkmark type-${type}"></span>
                ${window.DexApp.Utils.formatters.capitalize(type)}
            `;
            
            typesContainer.appendChild(label);
        });
    }
};

// --- Generator Controls ---
window.DexApp.Generator.openGenerator = function() {
    this.openGeneratorOverlay();
    this.state.active = true;
    
    // If there are no previous results, generate new ones
    if (this.elements.generatorResultsContainer.children.length === 0) {
        this.generateRandomPokemon();
    }
};

window.DexApp.Generator.openGeneratorOverlay = function() {
    const overlay = this.elements.generatorOverlay;
    if (!overlay) return;
    
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => { 
        overlay.classList.add('visible'); 
    });
    
    document.body.style.overflow = 'hidden';
    this.state.active = true;
};

window.DexApp.Generator.closeGeneratorOverlay = function() {
    const overlay = this.elements.generatorOverlay;
    if (!overlay) return;
    
    overlay.classList.remove('visible');
    
    const handleTransitionEnd = (event) => {
        if (event.target === overlay && !overlay.classList.contains('visible')) {
            overlay.classList.add('hidden');
            overlay.removeEventListener('transitionend', handleTransitionEnd);
        }
    };
    
    overlay.addEventListener('transitionend', handleTransitionEnd);
    
    // Fallback in case transition doesn't fire
    setTimeout(() => {
        if (!overlay.classList.contains('visible')) {
            overlay.classList.add('hidden');
        }
    }, 500);
    
    document.body.style.overflow = '';
    this.state.active = false;
};

window.DexApp.Generator.getGeneratorOptions = function() {
    // Get values from the generator form
    const countSelect = document.getElementById('generator-count');
    const count = countSelect ? parseInt(countSelect.value) : 6;
    
    const regionsChecked = document.querySelectorAll('input[name="generator-region"]:checked');
    const regions = Array.from(regionsChecked).map(el => el.value);
    
    const typesChecked = document.querySelectorAll('input[name="generator-type"]:checked');
    const types = Array.from(typesChecked).map(el => el.value);
    
    // Update the generator options state
    this.state.options = {
        count: count,
        regions: regions,
        types: types,
        legendaries: document.getElementById('generator-legendaries').checked,
        sublegendaries: document.getElementById('generator-sublegendaries').checked,
        mythicals: document.getElementById('generator-mythicals').checked,
        ultraBeasts: document.getElementById('generator-ultrabeasts').checked,
        paradoxes: document.getElementById('generator-paradoxes').checked,
        forms: document.getElementById('generator-forms').checked,
        megas: document.getElementById('generator-megas').checked,
        gigantamaxes: document.getElementById('generator-gigantamax').checked,
        nfes: document.getElementById('generator-nfes').checked,
        fullyEvolved: document.getElementById('generator-fully-evolved').checked,
        evolutionCounts: [
            document.getElementById('generator-unevolved').checked ? 0 : null,
            document.getElementById('generator-evolved-once').checked ? 1 : null,
            document.getElementById('generator-evolved-twice').checked ? 2 : null
        ].filter(v => v !== null),
        shinyChance: document.getElementById('generator-shiny-boost').checked ? 1/100 : 16/65536, // Boosted or normal rate
        sprites: true
    };
    
    return this.state.options;
};

// --- Random Generation ---
window.DexApp.Generator.generateRandomPokemon = async function() {
    if (!this.state.active) return;
    
    window.DexApp.Utils.UI.showLoader(this.elements.generatorLoader);
    this.elements.generatorResultsContainer.innerHTML = '';
    
    try {
        // Get current options from the form
        const options = this.getGeneratorOptions();
        let eligiblePokemon = [];
        
        // Fetch base pokemon list
        if (options.regions.length > 0) {
            // If specific regions are selected
            const pokemonByRegion = await Promise.all(
                options.regions.map(region => window.DexApp.API.fetchGenerationList(region))
            );
            
            // Combine and deduplicate Pokemon
            const pokemonMap = new Map();
            pokemonByRegion.forEach(list => {
                list.forEach(pokemon => {
                    pokemonMap.set(pokemon.id, pokemon);
                });
            });
            
            eligiblePokemon = Array.from(pokemonMap.values());
        } else {
            // If no regions selected, fetch all Pokemon
            eligiblePokemon = await window.DexApp.API.fetchAllPokemonSpecies();
        }
        
        // Filter by type if needed
        if (options.types.length > 0) {
            const typeFilterPromises = options.types.map(typeName => 
                window.DexApp.API.fetchTypeData(typeName)
            );
            
            const typePokemonLists = await Promise.all(typeFilterPromises);
            
            // Combine type-filtered Pokemon IDs
            const typeFilteredIds = new Set();
            typePokemonLists.forEach(list => {
                list.forEach(pokemon => {
                    typeFilteredIds.add(pokemon.id);
                });
            });
            
            // Filter the eligible list
            eligiblePokemon = eligiblePokemon.filter(pokemon => typeFilteredIds.has(pokemon.id));
        }
        
        // Fetch detailed data for all eligible Pokemon
        const detailedPromises = eligiblePokemon.map(pokemon => 
            window.DexApp.API.fetchDetailedPokemonData(pokemon.id)
                .catch(e => {
                    console.warn(`Failed to fetch details for ${pokemon.name}:`, e);
                    return null;
                })
        );
        
        const detailedResults = await Promise.all(detailedPromises);
        const validDetailedPokemon = detailedResults.filter(p => p !== null);
        
        // Apply remaining filters
        const filteredPokemon = this.filterDetailedPokemon(validDetailedPokemon, options);
        
        if (filteredPokemon.length === 0) {
            this.elements.generatorResultsContainer.innerHTML = 
                '<div class="no-results">No Pokémon match your criteria. Try adjusting the filters.</div>';
            return;
        }
        
        // Generate random selection
        const randomSelection = this.chooseRandomPokemon(filteredPokemon, options.count);
        
        // Save to history
        this.addToGeneratorHistory(randomSelection);
        
        // Display results
        this.displayGeneratorResults(randomSelection);
        
    } catch (error) {
        console.error("Error generating random Pokemon:", error);
        this.elements.generatorResultsContainer.innerHTML = 
            '<div class="generator-error">An error occurred while generating Pokémon. Please try again.</div>';
    } finally {
        window.DexApp.Utils.UI.hideLoader(this.elements.generatorLoader);
    }
};

window.DexApp.Generator.filterDetailedPokemon = function(pokemonList, options) {
    return pokemonList.filter(pokemon => {
        // Skip nulls
        if (!pokemon || !pokemon.fullPokemonData || !pokemon.fullSpeciesData) return false;
        
        const speciesData = pokemon.fullSpeciesData;
        
        // Legendary filtering
        if (!options.legendaries && speciesData.is_legendary) return false;
        if (!options.mythicals && speciesData.is_mythical) return false;
        if (!options.sublegendaries && window.DexApp.Utils.pokemonFilters.isSubLegendary(pokemon.id)) return false;
        
        // Ultra Beast filtering
        const isUltraBeast = speciesData.genera?.some(g => 
            g.language.name === 'en' && g.genus.includes('Ultra Beast')
        );
        if (!options.ultraBeasts && isUltraBeast) return false;
        
        // Paradox filtering (SV)
        const isParadox = pokemon.name.includes('-paradox') || 
                          speciesData.names?.some(n => n.name?.includes('Paradox'));
        if (!options.paradoxes && isParadox) return false;
        
        // Evolution filtering
        const evolutionChain = speciesData.evolution_chain;
        const isBaby = speciesData.is_baby || false;
        const isNfe = window.DexApp.Utils.pokemonFilters.hasEvolution(pokemon) && !isBaby;
        
        // Skip NFEs if not wanted
        if (!options.nfes && isNfe) return false;
        
        // Skip fully evolved if not wanted
        if (!options.fullyEvolved && !isNfe && !isBaby) return false;
        
        // Evolution count filtering
        const evolutionCount = window.DexApp.Utils.pokemonFilters.getEvolutionCount(pokemon);
        if (options.evolutionCounts.length > 0 && !options.evolutionCounts.includes(evolutionCount)) return false;
        
        // Forms filtering
        if (!options.forms && window.DexApp.Utils.pokemonFilters.isAlternateForm(pokemon)) return false;
        
        // Mega evolution filtering
        if (!options.megas && window.DexApp.Utils.pokemonFilters.isMegaEvolution(pokemon)) return false;
        
        // Gigantamax filtering
        if (!options.gigantamaxes && window.DexApp.Utils.pokemonFilters.isGigantamax(pokemon)) return false;
        
        return true;
    });
};

window.DexApp.Generator.chooseRandomPokemon = function(pokemonList, count) {
    // Make a copy of the list to avoid modifying the original
    const availablePokemon = [...pokemonList];
    const selected = [];
    
    // Generate random Pokémon
    while (availablePokemon.length > 0 && selected.length < count) {
        const randomIndex = Math.floor(Math.random() * availablePokemon.length);
        const pokemon = availablePokemon.splice(randomIndex, 1)[0];
        
        // Check if should be shiny (based on generator options)
        const isShiny = Math.random() < this.state.options.shinyChance;
        
        // Add random form if applicable
        let form = null;
        if (this.state.options.forms && pokemon.hasVariants) {
            const forms = pokemon.varieties.filter(v => {
                // Filter forms based on options
                if (!this.state.options.megas && v.name.includes('-mega')) {
                    return false;
                }
                if (!this.state.options.gigantamaxes && v.name.includes('-gmax')) {
                    return false;
                }
                return true;
            });
            
            if (forms.length > 0) {
                form = window.DexApp.Utils.random.getRandomElement(forms);
            }
        }
        
        // Check if should generate gender
        let gender = null;
        if (pokemon.hasGenderSprites) {
            gender = Math.random() < 0.5 ? 'male' : 'female';
        }
        
        // Add to selected list with random attributes
        selected.push({
            pokemon: pokemon,
            form: form,
            isShiny: isShiny,
            gender: gender,
            nature: window.DexApp.Utils.random.getRandomElement(window.DexApp.Constants.NATURES),
            id: selected.length
        });
        
        // If we selected a Pokémon with a mega or gmax form, restrict further ones
        // to maintain game balance
        if (form && (form.name.includes('-mega') || form.name.includes('-gmax'))) {
            const restricted = form.name.includes('-mega') ? '-mega' : '-gmax';
            
            // Filter out others of the same type
            for (let i = 0; i < availablePokemon.length; i++) {
                if (availablePokemon[i].varieties && 
                    availablePokemon[i].varieties.some(v => v.name.includes(restricted))) {
                    availablePokemon.splice(i, 1);
                    i--;
                }
            }
        }
    }
    
    return selected;
};

// --- Results Display ---
window.DexApp.Generator.displayGeneratorResults = function(pokemonList) {
    const container = this.elements.generatorResultsContainer;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!pokemonList || pokemonList.length === 0) {
        container.innerHTML = '<div class="no-results">No Pokémon generated. Try again?</div>';
        return;
    }
    
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'generator-results-grid';
    
    pokemonList.forEach(result => {
        const pokemon = result.pokemon;
        const card = this.createGeneratorResultCard(result);
        resultsGrid.appendChild(card);
        
        // Check if shiny for shiny history
        if (result.isShiny) {
            this.addToShinyHistory(result);
        }
    });
    
    container.appendChild(resultsGrid);
    
    // Show the current generation in history
    this.updateGeneratorHistoryUI();
};

window.DexApp.Generator.createGeneratorResultCard = function(result) {
    const pokemon = result.pokemon;
    const card = document.createElement('div');
    card.className = 'generator-pokemon-card';
    card.dataset.pokemonId = pokemon.id;
    
    if (result.isShiny) {
        card.classList.add('shiny');
    }
    
    // Determine image to use
    let imageUrl = pokemon.sprite;
    
    // Handle form, shiny, and gender variants if applicable
    if (result.form) {
        // Try to get form-specific image
        const formName = result.form.identifier || result.form.name.toLowerCase();
        const formPokemon = window.DexApp.Cache.detailedPokemonCache[formName];
        if (formPokemon) {
            imageUrl = formPokemon.sprite;
        }
    }
    
    // Style card based on Pokémon types
    const types = pokemon.types;
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
    
    card.style.setProperty('--card-gradient-color-1', color1);
    card.style.setProperty('--card-gradient-color-2', color2);
    
    // Create card content
    const name = window.DexApp.Utils.formatters.formatName(result.form ? result.form.name : pokemon.name);
    const idFormatted = String(pokemon.id).padStart(3, '0');
    
    card.innerHTML = `
        <div class="card-header">
            <span class="card-id">#${idFormatted}</span>
            ${result.isShiny ? '<span class="shiny-star">★</span>' : ''}
        </div>
        <div class="card-image-container">
            <img src="${imageUrl}" alt="${name}" class="card-image" loading="lazy" 
                 onerror="this.src='https://placehold.co/96x96/cccccc/ffffff?text=?'">
        </div>
        <div class="card-info">
            <h3 class="card-name">${name}</h3>
            <div class="card-nature">${result.nature}</div>
            <div class="card-types">
                ${types.map(type => `<span class="card-type type-${type}">${type}</span>`).join('')}
            </div>
            ${result.gender ? `<div class="card-gender ${result.gender}">${result.gender === 'male' ? '♂' : '♀'}</div>` : ''}
        </div>
        <button class="view-dex-button" data-id="${pokemon.id}">View Dex</button>
    `;
    
    // Add click event to view detailed entry
    card.querySelector('.view-dex-button').addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeGeneratorOverlay();
        window.DexApp.DetailView.fetchAndDisplayDetailData(pokemon.id);
    });
    
    return card;
};

// --- Generator History Management ---
window.DexApp.Generator.addToGeneratorHistory = function(pokemonList) {
    // Add the new generation to history
    this.state.generatedHistory.unshift(pokemonList);
    
    // Limit history size
    if (this.state.generatedHistory.length > 10) {
        this.state.generatedHistory.pop();
    }
    
    // Reset to viewing the current generation
    this.state.currentHistoryIndex = 0;
};

window.DexApp.Generator.updateGeneratorHistoryUI = function() {
    // Update history navigation
    this.elements.generatorPrevButton.disabled = this.state.currentHistoryIndex >= this.state.generatedHistory.length - 1;
    this.elements.generatorNextButton.disabled = this.state.currentHistoryIndex <= 0;
    
    // Update shiny counter
    const shinyCounter = document.getElementById('shiny-count');
    if (shinyCounter) {
        shinyCounter.textContent = `(${this.state.shiniesFound.length})`;
    }
};

window.DexApp.Generator.showPreviousGeneration = function() {
    if (this.state.currentHistoryIndex < this.state.generatedHistory.length - 1) {
        this.state.currentHistoryIndex++;
        this.displayGeneratorResults(this.state.generatedHistory[this.state.currentHistoryIndex]);
    }
};

window.DexApp.Generator.showNextGeneration = function() {
    if (this.state.currentHistoryIndex > 0) {
        this.state.currentHistoryIndex--;
        this.displayGeneratorResults(this.state.generatedHistory[this.state.currentHistoryIndex]);
    }
};

// --- Shiny History Management ---
window.DexApp.Generator.addToShinyHistory = function(pokemonResult) {
    // Add to shinies found list
    this.state.shiniesFound.unshift({
        pokemon: pokemonResult.pokemon,
        form: pokemonResult.form,
        gender: pokemonResult.gender,
        date: new Date()
    });
    
    // Save to localStorage
    window.DexApp.Utils.storage.saveToLocalStorage('dex-shinies', this.state.shiniesFound);
    
    // Update UI
    this.updateShinyHistoryUI();
};

window.DexApp.Generator.updateShinyHistoryUI = function() {
    const container = this.elements.generatorShinyHistory;
    if (!container) return;
    
    if (this.state.shiniesFound.length === 0) {
        container.innerHTML = '<p class="no-shinies">No shiny Pokémon found yet. Keep generating!</p>';
        return;
    }
    
    // Create shiny history list
    const shinyList = document.createElement('div');
    shinyList.className = 'shiny-list';
    
    this.state.shiniesFound.forEach(shiny => {
        const shinyCard = document.createElement('div');
        shinyCard.className = 'shiny-card';
        
        const pokemon = shiny.pokemon;
        const name = window.DexApp.Utils.formatters.formatName(
            shiny.form ? shiny.form.name : pokemon.name
        );
        const date = shiny.date ? new Date(shiny.date).toLocaleDateString() : 'Unknown';
        
        shinyCard.innerHTML = `
            <img src="${pokemon.sprite}" alt="${name}" class="shiny-image">
            <div class="shiny-info">
                <div class="shiny-name">${name}</div>
                <div class="shiny-date">Found on ${date}</div>
            </div>
            <button class="view-dex-button" data-id="${pokemon.id}">View</button>
        `;
        
        shinyCard.querySelector('.view-dex-button').addEventListener('click', () => {
            this.closeGeneratorOverlay();
            window.DexApp.DetailView.fetchAndDisplayDetailData(pokemon.id);
        });
        
        shinyList.appendChild(shinyCard);
    });
    
    // Add clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-shinies-button';
    clearButton.textContent = 'Clear Shiny History';
    clearButton.addEventListener('click', () => this.clearShinyHistory());
    
    container.innerHTML = '';
    container.appendChild(shinyList);
    container.appendChild(clearButton);
    
    // Update count in header
    const shinyCounter = document.getElementById('shiny-count');
    if (shinyCounter) {
        shinyCounter.textContent = `(${this.state.shiniesFound.length})`;
    }
};

window.DexApp.Generator.clearShinyHistory = function() {
    if (confirm('Are you sure you want to clear your shiny Pokémon history?')) {
        this.state.shiniesFound = [];
        window.DexApp.Utils.storage.saveToLocalStorage('dex-shinies', []);
        this.updateShinyHistoryUI();
    }
};

window.DexApp.Generator.loadShinyHistory = function() {
    try {
        const savedShinies = window.DexApp.Utils.storage.getFromLocalStorage('dex-shinies', []);
        
        // Convert date strings back to Date objects
        savedShinies.forEach(shiny => {
            if (shiny.date && typeof shiny.date === 'string') {
                shiny.date = new Date(shiny.date);
            }
        });
        
        this.state.shiniesFound = savedShinies;
        this.updateShinyHistoryUI();
    } catch (e) {
        console.error('Error loading shiny history:', e);
        this.state.shiniesFound = [];
    }
};
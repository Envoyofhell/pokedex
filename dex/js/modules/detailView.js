// dex/js/modules/detailView.js
// Detail view functionality for the Pokédex application

// Create DetailView namespace
window.DexApp = window.DexApp || {};
window.DexApp.DetailView = {};

// State variables
window.DexApp.DetailView.state = {
    currentPokemonData: null,
    currentSpeciesData: null,
    currentFlavorTextEntries: [],
    currentStats: [],
    currentMoves: [],
    currentVarieties: [],
    isShiny: false,
    isFemale: false,
    currentStatSort: 'default',
    activeSubTab: 'summary-content',
    currentMovesPage: 1,
    movesPerPage: window.DexApp.Constants.MAX_MOVES_DISPLAY,
    currentAudio: null // For cry playback
};

// DOM Elements
window.DexApp.DetailView.elements = {
    detailViewLightbox: document.getElementById('detail-view-lightbox'),
    detailCloseButton: document.getElementById('detail-close-button'),
    detailLoader: document.getElementById('detail-loader'),
    detailErrorMessageDiv: document.getElementById('detail-error-message'),
    detailErrorText: document.getElementById('detail-error-text'),
    detailPokemonInfoDiv: document.getElementById('pokemon-info'),
    detailContentSection: document.getElementById('content-section'),
    detailVisualSection: document.getElementById('visual-section'),
    detailPokemonNameDisplay: document.getElementById('pokemon-name-display'),
    detailPokemonIdSpan: document.getElementById('pokemon-id'),
    detailPlayCryButton: document.getElementById('play-cry-button'),
    detailVariantSelectorContainer: document.getElementById('variant-selector-container'),
    detailVariantSelect: document.getElementById('variant-select'),
    detailGameVersionSelect: document.getElementById('game-version-select'),
    detailPokemonDescriptionP: document.getElementById('pokemon-description'),
    detailPokemonHeightP: document.getElementById('pokemon-height'),
    detailPokemonWeightP: document.getElementById('pokemon-weight'),
    detailVariantInfoSection: document.getElementById('variant-info-section'),
    detailStatSortButtonsContainer: document.getElementById('stat-sort-buttons'),
    detailStatsContainer: document.getElementById('stats-container'),
    detailAbilitiesList: document.getElementById('abilities-list'),
    detailMovesList: document.getElementById('moves-list'),
    detailMovesPagination: document.getElementById('moves-pagination'),
    detailPrevMovePageButton: document.getElementById('prev-move-page'),
    detailNextMovePageButton: document.getElementById('next-move-page'),
    detailMovePageInfo: document.getElementById('move-page-info'),
    detailPokemonImage: document.getElementById('pokemon-image'),
    detailPokemonImageContainer: document.getElementById('pokemon-image-container'),
    detailShinyToggleButton: document.getElementById('shiny-toggle'),
    detailGenderToggleButton: document.getElementById('gender-toggle'),
    detailPokemonTypesDiv: document.getElementById('pokemon-types'),
    detailMainTabsContainer: document.getElementById('tabs'),
    detailGameInfoTabsContainer: document.getElementById('game-info-tabs')
};

// Get tab elements
window.DexApp.DetailView.elements.detailMainTabButtons = 
    window.DexApp.DetailView.elements.detailMainTabsContainer.querySelectorAll('.tab-button');
window.DexApp.DetailView.elements.detailMainTabContents = 
    window.DexApp.DetailView.elements.detailContentSection.querySelectorAll('.tab-content');
window.DexApp.DetailView.elements.detailSubTabButtons = 
    window.DexApp.DetailView.elements.detailGameInfoTabsContainer.querySelectorAll('.sub-tab-button');
window.DexApp.DetailView.elements.detailSubTabContents = 
    document.getElementById('game-info-tab').querySelectorAll('.sub-tab-content');

// --- Initialize Detail View ---
window.DexApp.DetailView.initialize = function() {
    console.log("Initializing Detail View module...");
    this.setupEventListeners();
    console.log("Detail View module initialized.");
};

window.DexApp.DetailView.setupEventListeners = function() {
    const elements = this.elements;
    
    // Main Tabs
    elements.detailMainTabsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('tab-button')) this.switchTab(event.target);
    });
    
    // Sub Tabs
    elements.detailGameInfoTabsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('sub-tab-button')) this.switchSubTab(event.target);
    });
    
    // Shiny Toggle
    elements.detailShinyToggleButton.addEventListener('click', () => this.toggleShiny());
    
    // Gender Toggle
    elements.detailGenderToggleButton.addEventListener('click', () => this.toggleGender());
    
    // Game Version Select
    elements.detailGameVersionSelect.addEventListener('change', () => this.updateDescription());
    
    // Variant Select
    elements.detailVariantSelect.addEventListener('change', (event) => {
        const selectedVariantIdentifier = event.target.value;
        if (selectedVariantIdentifier && this.state.currentPokemonData?.name !== selectedVariantIdentifier) {
            this.fetchAndDisplayDetailData(selectedVariantIdentifier);
        }
    });
    
    // Play cry button (if present)
    if (elements.detailPlayCryButton) {
        elements.detailPlayCryButton.addEventListener('click', () => this.playPokemonCry());
    }
    
    // Stat Sort Buttons
    elements.detailStatSortButtonsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('sort-button')) {
            const sortType = event.target.dataset.sort;
            this.state.currentStatSort = (this.state.currentStatSort === sortType && sortType !== 'default') ? 
                'default' : sortType;
            this.renderStats();
            this.updateStatSortButtons();
        }
    });
    
    // Moves Pagination
    if (elements.detailPrevMovePageButton) {
        elements.detailPrevMovePageButton.addEventListener('click', () => {
            if (this.state.currentMovesPage > 1) {
                this.state.currentMovesPage--;
                this.renderMoves();
            }
        });
    }
    
    if (elements.detailNextMovePageButton) {
        elements.detailNextMovePageButton.addEventListener('click', () => {
            const totalPages = Math.ceil(this.state.currentMoves.length / this.state.movesPerPage);
            if (this.state.currentMovesPage < totalPages) {
                this.state.currentMovesPage++;
                this.renderMoves();
            }
        });
    }
};

// --- Detail View Display Functions ---
window.DexApp.DetailView.fetchAndDisplayDetailData = async function(identifier) {
    // Use the lightbox module to open the detail view
    if (window.DexApp.Lightbox && typeof window.DexApp.Lightbox.openDetailLightbox === 'function') {
        window.DexApp.Lightbox.openDetailLightbox();
    } else {
        // Fallback to direct DOM manipulation if lightbox module unavailable
        this.elements.detailViewLightbox.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.elements.detailViewLightbox.classList.add('visible');
        });
        document.body.style.overflow = 'hidden';
    }
    
    window.DexApp.Utils.UI.showLoader(this.elements.detailLoader);
    this.elements.detailPokemonInfoDiv.classList.add('hidden');
    this.elements.detailErrorMessageDiv.classList.add('hidden');
    this.resetDetailUIState();

    try {
        console.log(`Fetching details for lightbox: ${identifier}`);
        const data = await window.DexApp.API.fetchDetailedPokemonData(identifier);
        
        if (!data || !data.fullPokemonData) {
            throw new Error(`Could not retrieve full data for ${identifier}`);
        }
        
        console.log("Detailed data fetched:", data);
        this.state.currentPokemonData = data.fullPokemonData;
        this.state.currentSpeciesData = data.fullSpeciesData;
        this.state.currentVarieties = data.varieties || [];
        
        // Process and display the data
        this.processAndDisplayDetailData(data);
        
        // Fetch TCG cards
        if (window.DexApp.TCG && typeof window.DexApp.TCG.fetchAndDisplayTcgData === 'function') {
            window.DexApp.TCG.fetchAndDisplayTcgData(data.baseName || data.name);
        }
        
    } catch (error) {
        console.error("Error fetching detail data:", error);
        this.showDetailError(error.message);
    } finally {
        window.DexApp.Utils.UI.hideLoader(this.elements.detailLoader);
    }
};

window.DexApp.DetailView.processAndDisplayDetailData = function(detailedData) {
    if (!detailedData || !detailedData.fullPokemonData) {
        console.error("Invalid data passed to processAndDisplayDetailData");
        this.showDetailError("Failed to process Pokémon data.");
        return;
    }
    
    this.state.currentPokemonData = detailedData.fullPokemonData;
    this.state.currentSpeciesData = detailedData.fullSpeciesData;
    this.state.isShiny = false;
    this.state.isFemale = false;
    
    this.elements.detailShinyToggleButton.classList.remove('active');
    this.elements.detailGenderToggleButton.classList.add('hidden');
    this.elements.detailGenderToggleButton.classList.remove('active');
    
    // Process stats data
    this.state.currentStats = this.state.currentPokemonData.stats
        .filter(si => this.getStatName(si.stat.name))
        .map(si => ({
            name: si.stat.name,
            displayName: this.getStatName(si.stat.name),
            value: si.base_stat
        }));
    this.state.currentStatSort = 'default';
    
    // Process moves data
    this.state.currentMoves = this.state.currentPokemonData.moves
        .flatMap(moveInfo => 
            moveInfo.version_group_details.map(detail => ({
                name: moveInfo.move.name.replace('-', ' '),
                level: detail.move_learn_method.name === 'level-up' ? detail.level_learned_at : null,
                url: moveInfo.move.url
            }))
        )
        .filter(move => move.level !== null && move.level > 0)
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
        .filter((move, index, self) => 
            index === self.findIndex((m) => (m.name === move.name && m.level === move.level))
        );
    
    // Process flavor text entries
    this.state.currentFlavorTextEntries = [];
    if (this.state.currentSpeciesData?.flavor_text_entries) {
        const seenVersions = new Set();
        this.state.currentFlavorTextEntries = this.state.currentSpeciesData.flavor_text_entries
            .filter(entry => entry.language.name === 'en')
            .map(entry => ({
                version: window.DexApp.Utils.formatters.formatVersionName(entry.version.name),
                text: window.DexApp.Utils.formatters.cleanFlavorText(entry.flavor_text)
            }))
            .filter(entry => {
                if (!seenVersions.has(entry.version)) {
                    seenVersions.add(entry.version);
                    return true;
                }
                return false;
            })
            .sort((a, b) => a.version.localeCompare(b.version));
    }
    
    // Setup variants
    this.populateVariantSelector(detailedData.varieties || [], this.state.currentPokemonData.name);
    this.elements.detailVariantSelectorContainer.classList.toggle('hidden', !detailedData.hasVariants);
    
    // Update UI sections
    this.updateDetailVisualSection(detailedData.hasGenderSprites);
    this.updateDetailGameInfoTab(detailedData.hasVariants);
    
    // Show the detail view
    this.elements.detailPokemonInfoDiv.classList.remove('hidden');
    this.elements.detailErrorMessageDiv.classList.add('hidden');
    
    // Set active tabs
    this.switchTab(this.elements.detailMainTabsContainer.querySelector('.tab-button.active') || 
                   this.elements.detailMainTabButtons[0]);
                   
    this.switchSubTab(this.elements.detailGameInfoTabsContainer.querySelector('.sub-tab-button.active') || 
                      this.elements.detailSubTabButtons[0]);
                      
    // Try to play cry
    if (detailedData.cry) {
        this.setupCryButton(detailedData.cry);
    }
};

window.DexApp.DetailView.setupCryButton = function(cryUrl) {
    const cryButton = this.elements.detailPlayCryButton;
    if (!cryButton) return;
    
    if (cryUrl) {
        cryButton.classList.remove('hidden');
        
        // Set up click handler
        cryButton.onclick = () => {
            // Clear previous audio if any
            if (this.state.currentAudio) {
                this.state.currentAudio.pause();
                this.state.currentAudio = null;
            }
            
            // Create and play new audio
            try {
                const audio = new Audio(cryUrl);
                audio.volume = 0.7; // Set to 70% volume
                audio.play().catch(e => console.error("Failed to play cry:", e));
                this.state.currentAudio = audio;
            } catch (e) {
                console.error("Error creating audio:", e);
            }
        };
    } else {
        cryButton.classList.add('hidden');
    }
};

window.DexApp.DetailView.playPokemonCry = function() {
    const cryUrl = this.state.currentPokemonData?.cries?.latest || 
                   this.state.currentPokemonData?.cries?.legacy;
                   
    if (!cryUrl) {
        console.warn('No cry available for this Pokémon');
        return;
    }
    
    if (this.state.currentAudio) {
        this.state.currentAudio.pause();
        this.state.currentAudio = null;
    }
    
    try {
        const audio = new Audio(cryUrl);
        audio.volume = 0.7;
        audio.play().catch(e => console.error("Failed to play cry:", e));
        this.state.currentAudio = audio;
    } catch (e) {
        console.error("Error creating audio:", e);
    }
};

// --- Tab Control Functions ---
window.DexApp.DetailView.switchTab = function(clickedTab) {
    if (!clickedTab) return;
    
    const targetTabId = clickedTab.dataset.tab;
    this.elements.detailMainTabButtons.forEach(button => button.classList.remove('active'));
    clickedTab.classList.add('active');
    this.updateActiveTabColor();
    
    this.elements.detailMainTabContents.forEach(content => {
        content.classList.toggle('active', content.id === targetTabId)
    });
};

window.DexApp.DetailView.switchSubTab = function(clickedSubTab) {
    if (!clickedSubTab) return;
    
    const targetSubTabId = clickedSubTab.dataset.subtab;
    this.elements.detailSubTabButtons.forEach(button => button.classList.remove('active'));
    clickedSubTab.classList.add('active');
    this.state.activeSubTab = targetSubTabId;
    this.updateActiveSubTabColor();
    
    this.elements.detailSubTabContents.forEach(content => {
        content.classList.toggle('active', content.id === targetSubTabId)
    });
    
    this.renderActiveSubTabContent();
};

window.DexApp.DetailView.updateActiveTabColor = function() {
    const activeTab = this.elements.detailMainTabsContainer.querySelector('.tab-button.active');
    const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-secondary)';
    const lightColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color-light').trim() || 'var(--color-primary)';
    
    if (activeTab) {
        activeTab.style.backgroundColor = darkColor;
        activeTab.style.borderColor = lightColor;
        activeTab.style.color = 'white';
    }
    
    this.elements.detailMainTabButtons.forEach(button => {
        if (!button.classList.contains('active')) {
            button.style.backgroundColor = '';
            button.style.borderColor = 'transparent';
            button.style.color = '';
        }
    });
};

window.DexApp.DetailView.updateActiveSubTabColor = function() {
    const activeSubTab = this.elements.detailGameInfoTabsContainer.querySelector('.sub-tab-button.active');
    const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-secondary)';
    
    if (activeSubTab) {
        activeSubTab.style.backgroundColor = darkColor;
        activeSubTab.style.borderColor = 'transparent';
        activeSubTab.style.color = 'white';
    }
    
    this.elements.detailSubTabButtons.forEach(button => {
        if (!button.classList.contains('active')) {
            button.style.backgroundColor = '';
            button.style.borderColor = '';
            button.style.color = '';
        }
    });
};

// --- Detail Content Functions ---
window.DexApp.DetailView.populateVariantSelector = function(varieties, currentFormIdentifier) {
    this.elements.detailVariantSelect.innerHTML = '';
    if (!varieties || varieties.length <= 1) {
        this.elements.detailVariantSelectorContainer.classList.add('hidden');
        return;
    }
    
    console.log("Populating variant selector with:", varieties);
    
    varieties.forEach(variant => {
        const option = document.createElement('option');
        option.value = variant.identifier;
        option.textContent = variant.name;
        if (variant.identifier === currentFormIdentifier) {
            option.selected = true;
        }
        this.elements.detailVariantSelect.appendChild(option);
    });
    
    this.elements.detailVariantSelectorContainer.classList.remove('hidden');
};

window.DexApp.DetailView.updateDetailVisualSection = function(hasGenderSprites) {
    if (!this.state.currentPokemonData) return;
    
    const types = this.state.currentPokemonData.types;
    let color1 = 'var(--color-secondary)';
    let color2 = 'var(--color-primary)';
    
    if (types.length === 1) {
        const typeName = types[0].type.name;
        color1 = `var(--type-${typeName}, var(--color-secondary))`;
        color2 = `var(--type-${typeName}-light, var(--color-primary))`;
    } else if (types.length > 1) {
        const typeName1 = types[0].type.name;
        const typeName2 = types[1].type.name;
        color1 = `var(--type-${typeName1}, var(--color-secondary))`;
        color2 = `var(--type-${typeName2}, var(--color-primary))`;
    }
    
    document.documentElement.style.setProperty('--gradient-color-1', color1);
    document.documentElement.style.setProperty('--gradient-color-2', color2);
    document.documentElement.style.setProperty('--dynamic-type-color', color1);
    document.documentElement.style.setProperty('--dynamic-type-color-light', color2);
    
    this.updateActiveTabColor();
    this.updateActiveSubTabColor();
    this.updateStatSortButtons();
    
    this.elements.detailGenderToggleButton.classList.toggle('hidden', !hasGenderSprites);
    this.updatePokemonImage();
    
    this.elements.detailPokemonTypesDiv.innerHTML = '';
    types.forEach(typeInfo => {
        const typeName = typeInfo.type.name;
        const typeColor = `var(--type-${typeName}, var(--color-text-secondary))`;
        const typeBadge = document.createElement('span');
        typeBadge.className = 'type-badge';
        typeBadge.textContent = typeName;
        typeBadge.style.backgroundColor = typeColor;
        this.elements.detailPokemonTypesDiv.appendChild(typeBadge);
    });
    
    // Setup cry button if available
    const hasCry = this.state.currentPokemonData.cries?.latest || this.state.currentPokemonData.cries?.legacy;
    if (this.elements.detailPlayCryButton) {
        this.elements.detailPlayCryButton.classList.toggle('hidden', !hasCry);
    }
};

window.DexApp.DetailView.updateDetailGameInfoTab = function(hasVariants) {
    if (!this.state.currentPokemonData) return;
    
    this.elements.detailPokemonNameDisplay.textContent = 
        window.DexApp.Utils.formatters.formatName(this.state.currentPokemonData.name);
        
    this.elements.detailPokemonIdSpan.textContent = 
        `#${this.state.currentPokemonData.id.toString().padStart(3, '0')}`;
        
    this.elements.detailPokemonHeightP.textContent = 
        `${(this.state.currentPokemonData.height / 10).toFixed(1)} m`;
        
    this.elements.detailPokemonWeightP.textContent = 
        `${(this.state.currentPokemonData.weight / 10).toFixed(1)} kg`;
    
    this.elements.detailVariantInfoSection.classList.toggle('hidden', !hasVariants);
    this.populateVersionSelector();
    this.updateDescription();
    this.renderActiveSubTabContent();
};

window.DexApp.DetailView.populateVersionSelector = function() {
    this.elements.detailGameVersionSelect.innerHTML = '';
    
    if (this.state.currentFlavorTextEntries.length > 0) {
        this.state.currentFlavorTextEntries.forEach((entry, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = entry.version;
            this.elements.detailGameVersionSelect.appendChild(option);
        });
        this.elements.detailGameVersionSelect.disabled = false;
    } else {
        const option = document.createElement('option');
        option.textContent = 'No entries';
        this.elements.detailGameVersionSelect.appendChild(option);
        this.elements.detailGameVersionSelect.disabled = true;
    }
};

window.DexApp.DetailView.updateDescription = function() {
    const selectedIndex = this.elements.detailGameVersionSelect.value;
    
    if (selectedIndex !== null && this.state.currentFlavorTextEntries[selectedIndex]) {
        this.elements.detailPokemonDescriptionP.textContent = 
            this.state.currentFlavorTextEntries[selectedIndex].text;
    } else if (this.state.currentFlavorTextEntries.length > 0) {
        this.elements.detailPokemonDescriptionP.textContent = 
            this.state.currentFlavorTextEntries[0].text;
        this.elements.detailGameVersionSelect.value = 0;
    } else {
        this.elements.detailPokemonDescriptionP.textContent = 'No description available.';
    }
};

window.DexApp.DetailView.renderActiveSubTabContent = function() {
    switch(this.state.activeSubTab) {
        case 'stats-content':
            this.renderStats();
            this.hideMovesPagination();
            break;
        case 'abilities-content':
            this.renderAbilities();
            this.hideMovesPagination();
            break;
        case 'moves-content':
            this.state.currentMovesPage = 1;
            this.renderMoves();
            break;
        case 'summary-content':
        default:
            this.hideMovesPagination();
            break;
    }
};

window.DexApp.DetailView.renderStats = function() {
    this.elements.detailStatsContainer.innerHTML = '';
    let statsToRender = [...this.state.currentStats];
    
    // Get default stat order
    const defaultStatOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    
    switch (this.state.currentStatSort) {
        case 'name':
            statsToRender.sort((a, b) => a.displayName.localeCompare(b.displayName));
            break;
        case 'asc':
            statsToRender.sort((a, b) => a.value - b.value);
            break;
        case 'desc':
            statsToRender.sort((a, b) => b.value - a.value);
            break;
        case 'default':
            statsToRender.sort((a, b) => 
                defaultStatOrder.indexOf(a.name) - defaultStatOrder.indexOf(b.name)
            );
            break;
    }
    
    const statColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--dynamic-type-color').trim() || 'var(--color-accent)';
    
    statsToRender.forEach(stat => {
        const statMax = 255;
        const statPercentage = Math.max(1, (stat.value / statMax) * 100);
        const statElement = document.createElement('div');
        statElement.className = 'flex items-center w-full';
        statElement.innerHTML = `
            <span class="text-xs font-medium text-[var(--color-text-secondary)] w-1/4">
                ${stat.displayName}
            </span>
            <span class="text-sm font-bold text-[var(--color-text-primary)] w-[50px] text-right mr-2">
                ${stat.value}
            </span>
            <div class="stat-bar-bg flex-grow h-2.5 rounded-full">
                <div class="stat-bar h-2.5 rounded-full" style="width: 0%; background-color: ${statColor};">
                </div>
            </div>
        `;
        
        this.elements.detailStatsContainer.appendChild(statElement);
        
        setTimeout(() => {
            const bar = statElement.querySelector('.stat-bar');
            if(bar) bar.style.width = `${statPercentage}%`;
        }, 50);
    });
    
    // Calculate total stats
    const totalStat = statsToRender.reduce((sum, stat) => sum + stat.value, 0);
    const totalElement = document.createElement('div');
    totalElement.className = 'flex items-center w-full mt-3 pt-2 border-t border-solid border-[var(--color-border)]';
    totalElement.innerHTML = `
        <span class="text-xs font-medium text-[var(--color-text-secondary)] w-1/4">
            TOTAL
        </span>
        <span class="text-sm font-bold text-[var(--color-text-primary)] w-[50px] text-right mr-2">
            ${totalStat}
        </span>
    `;
    
    this.elements.detailStatsContainer.appendChild(totalElement);
};

window.DexApp.DetailView.renderAbilities = function() {
    this.elements.detailAbilitiesList.innerHTML = '';
    
    if (this.state.currentPokemonData.abilities.length > 0) {
        this.state.currentPokemonData.abilities.forEach(abilityInfo => {
            const abilityItem = document.createElement('li');
            abilityItem.textContent = window.DexApp.Utils.formatters.formatName(abilityInfo.ability.name);
            if (abilityInfo.is_hidden) abilityItem.innerHTML += ' <span class="italic">(Hidden)</span>';
            this.elements.detailAbilitiesList.appendChild(abilityItem);
            
            // Try to fetch ability description
            fetch(abilityInfo.ability.url)
                .then(response => response.json())
                .then(abilityData => {
                    const englishEntries = abilityData.effect_entries.filter(
                        entry => entry.language.name === 'en'
                    );
                    
                    if (englishEntries.length > 0) {
                        const description = document.createElement('p');
                        description.className = 'text-sm text-[var(--color-text-secondary)] mt-1';
                        description.textContent = englishEntries[0].short_effect || englishEntries[0].effect;
                        abilityItem.appendChild(description);
                    }
                })
                .catch(error => console.warn(`Failed to fetch ability details: ${error}`));
        });
    } else {
        this.elements.detailAbilitiesList.innerHTML = 
            '<li class="italic text-[var(--color-text-secondary)]">No abilities listed.</li>';
    }
};

window.DexApp.DetailView.renderMoves = function() {
    this.elements.detailMovesList.innerHTML = '';
    
    if (!this.state.currentMoves || this.state.currentMoves.length === 0) {
        this.elements.detailMovesList.innerHTML = 
            '<li class="italic text-[var(--color-text-secondary)]">No level-up moves found.</li>';
            
        if (this.elements.detailMovesPagination) {
            this.elements.detailMovesPagination.classList.add('hidden');
        }
        return;
    }
    
    const totalPages = Math.ceil(this.state.currentMoves.length / this.state.movesPerPage);
    this.state.currentMovesPage = Math.max(1, Math.min(this.state.currentMovesPage, totalPages));
    
    const startIndex = (this.state.currentMovesPage - 1) * this.state.movesPerPage;
    const endIndex = startIndex + this.state.movesPerPage;
    const movesToDisplay = this.state.currentMoves.slice(startIndex, endIndex);
    
    movesToDisplay.forEach(move => {
        const moveItem = document.createElement('li');
        moveItem.textContent = `Lv ${move.level}: ${window.DexApp.Utils.formatters.formatName(move.name)}`;
        this.elements.detailMovesList.appendChild(moveItem);
        
        // Try to fetch move details
        if (move.url) {
            fetch(move.url)
                .then(response => response.json())
                .then(moveData => {
                    // Add type badge
                    const typeBadge = document.createElement('span');
                    typeBadge.className = `type-badge type-${moveData.type.name}`;
                    typeBadge.textContent = moveData.type.name;
                    typeBadge.style.fontSize = '0.7rem';
                    typeBadge.style.padding = '0.1rem 0.3rem';
                    typeBadge.style.marginLeft = '0.5rem';
                    
                    // Create formatted move item
                    moveItem.innerHTML = `
                        <span>Lv ${move.level}: ${window.DexApp.Utils.formatters.formatName(move.name)}</span>
                        ${typeBadge.outerHTML}
                        <span class="move-power">${moveData.power || '-'}</span>
                        <span class="move-accuracy">${moveData.accuracy || '-'}</span>
                    `;
                })
                .catch(error => console.warn(`Failed to fetch move details: ${error}`));
        }
    });
    
    if (this.elements.detailMovesPagination) {
        if (totalPages > 1) {
            if (this.elements.detailPrevMovePageButton) {
                this.elements.detailPrevMovePageButton.disabled = this.state.currentMovesPage === 1;
            }
            
            if (this.elements.detailNextMovePageButton) {
                this.elements.detailNextMovePageButton.disabled = this.state.currentMovesPage === totalPages;
            }
            
            if (this.elements.detailMovePageInfo) {
                this.elements.detailMovePageInfo.textContent = `Page ${this.state.currentMovesPage} of ${totalPages}`;
            }
            
            this.elements.detailMovesPagination.classList.remove('hidden');
        } else {
            this.elements.detailMovesPagination.classList.add('hidden');
        }
    }
};

window.DexApp.DetailView.hideMovesPagination = function() {
    if (this.elements.detailMovesPagination) {
        this.elements.detailMovesPagination.classList.add('hidden');
    }
};

// --- Image & Toggles ---
window.DexApp.DetailView.updatePokemonImage = function() {
    if (!this.state.currentPokemonData) return;
    
    const sprites = this.state.currentPokemonData.sprites;
    const artwork = sprites.other?.['official-artwork'];
    const home = sprites.other?.home;
    
    let defaultSprite = artwork?.front_default || home?.front_default || sprites.front_default;
    let shinySprite = artwork?.front_shiny || home?.front_shiny || sprites.front_shiny;
    let femaleSprite = artwork?.front_female || home?.front_female || sprites.front_female;
    let shinyFemaleSprite = artwork?.front_shiny_female || home?.front_shiny_female || sprites.front_shiny_female;
    
    let targetUrl = defaultSprite;
    
    if (this.state.isShiny && this.state.isFemale && shinyFemaleSprite) {
        targetUrl = shinyFemaleSprite;
    } else if (this.state.isShiny && !this.state.isFemale && shinySprite) {
        targetUrl = shinySprite;
    } else if (!this.state.isShiny && this.state.isFemale && femaleSprite) {
        targetUrl = femaleSprite;
    } else if (this.state.isShiny && shinySprite) {
        targetUrl = shinySprite;
    } else if (this.state.isFemale && femaleSprite) {
        targetUrl = femaleSprite;
    }
    
    const placeholderUrl = 'https://placehold.co/256x256/cccccc/ffffff?text=?';
    this.elements.detailPokemonImage.src = targetUrl || placeholderUrl;
    
    this.elements.detailPokemonImage.alt = `Image of ${this.state.isShiny ? 'shiny ' : ''}${this.state.isFemale ? 'female ' : ''}${this.state.currentPokemonData.name}`;
    
    this.elements.detailPokemonImage.onerror = () => {
        this.elements.detailPokemonImage.src = placeholderUrl;
        this.elements.detailPokemonImage.alt = `${this.state.currentPokemonData.name} image not found`;
    };
};

window.DexApp.DetailView.toggleShiny = function() {
    if (!this.state.currentPokemonData) return;
    
    this.state.isShiny = !this.state.isShiny;
    this.elements.detailShinyToggleButton.classList.toggle('active', this.state.isShiny);
    this.updatePokemonImage();
};

window.DexApp.DetailView.toggleGender = function() {
    if (!this.state.currentPokemonData || !this.state.currentPokemonData.sprites.front_female) return;
    
    this.state.isFemale = !this.state.isFemale;
    this.elements.detailGenderToggleButton.classList.toggle('active', this.state.isFemale);
    this.updatePokemonImage();
};

window.DexApp.DetailView.updateStatSortButtons = function() {
    const activeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--dynamic-type-color').trim() || 'var(--color-secondary)';
    
    this.elements.detailStatSortButtonsContainer.querySelectorAll('.sort-button').forEach(button => {
        const isActive = button.dataset.sort === this.state.currentStatSort;
        button.classList.toggle('active', isActive);
        button.style.backgroundColor = isActive ? activeColor : '';
        button.style.borderColor = isActive ? 'transparent' : '';
        button.style.color = isActive ? 'white' : '';
    });
};

// --- Reset & Error Handling ---
window.DexApp.DetailView.resetDetailUIState = function() {
    this.elements.detailGameVersionSelect.innerHTML = '<option>Loading...</option>';
    this.elements.detailGameVersionSelect.disabled = true;
    this.elements.detailPokemonDescriptionP.textContent = 'Loading...';
    this.elements.detailStatsContainer.innerHTML = '';
    
    this.state.currentStatSort = 'default';
    this.updateStatSortButtons();
    
    this.elements.detailAbilitiesList.innerHTML = '';
    this.elements.detailMovesList.innerHTML = '';
    
    this.state.isShiny = false;
    this.state.isFemale = false;
    
    this.elements.detailShinyToggleButton.classList.remove('active');
    this.elements.detailGenderToggleButton.classList.add('hidden');
    this.elements.detailGenderToggleButton.classList.remove('active');
    this.elements.detailVariantSelectorContainer.classList.add('hidden');
    this.elements.detailVariantSelect.innerHTML = '';
    
    // Stop any playing cry
    if (this.state.currentAudio) {
        this.state.currentAudio.pause();
        this.state.currentAudio = null;
    }
    
    // Reset cry button
    if (this.elements.detailPlayCryButton) {
        this.elements.detailPlayCryButton.classList.add('hidden');
    }
    
    this.switchSubTab(this.elements.detailGameInfoTabsContainer.querySelector('[data-subtab="summary-content"]'));
    this.hideMovesPagination();
};

window.DexApp.DetailView.showDetailError = function(message) {
    this.elements.detailErrorText.textContent = message;
    this.elements.detailErrorMessageDiv.classList.remove('hidden');
    this.elements.detailPokemonInfoDiv.classList.add('hidden');
    window.DexApp.Utils.UI.hideLoader(this.elements.detailLoader);
};

// --- Helpers ---
window.DexApp.DetailView.getStatName = function(statName) {
    const statNameMapping = { 
        'hp': 'HP', 
        'attack': 'Attack', 
        'defense': 'Defense', 
        'special-attack': 'Sp. Atk', 
        'special-defense': 'Sp. Def', 
        'speed': 'Speed' 
    };
    return statNameMapping[statName] || statName;
};
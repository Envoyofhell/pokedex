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
    movesPerPage: window.DexApp.Constants.MAX_MOVES_DISPLAY
};

// DOM Elements
window.DexApp.DetailView.elements = {
    detailViewLightbox: document.getElementById('detail-view-lightbox'),
    detailCloseButton: document.getElementById('detail-close-button'),
    prevPokemonButton: document.getElementById('prev-pokemon-button'),
    nextPokemonButton: document.getElementById('next-pokemon-button'),
    detailLoader: document.getElementById('detail-loader'),
    detailErrorMessageDiv: document.getElementById('detail-error-message'),
    detailErrorText: document.getElementById('detail-error-text'),
    detailPokemonInfoDiv: document.getElementById('pokemon-info'),
    detailContentSection: document.getElementById('content-section'),
    detailVisualSection: document.getElementById('visual-section'),
    detailPokemonNameDisplay: document.getElementById('pokemon-name-display'),
    detailPokemonSoundControl: document.getElementById('pokemon-sound-control'),
    detailPokemonIdSpan: document.getElementById('pokemon-id'),
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
    this.setupEventListeners();
};

window.DexApp.DetailView.setupEventListeners = function() {
    const elements = this.elements;
    
    // Close button
    elements.detailCloseButton.addEventListener('click', () => this.closeDetailLightbox());
    
    // Click outside to close
    elements.detailViewLightbox.addEventListener('click', (event) => {
        if (event.target === elements.detailViewLightbox) this.closeDetailLightbox();
    });
    
    // Navigation buttons
    if (elements.prevPokemonButton) {
        elements.prevPokemonButton.addEventListener('click', () => {
            const prevId = elements.prevPokemonButton.dataset.id;
            if (prevId) {
                this.fetchAndDisplayDetailData(parseInt(prevId));
            }
        });
    }
    
    if (elements.nextPokemonButton) {
        elements.nextPokemonButton.addEventListener('click', () => {
            const nextId = elements.nextPokemonButton.dataset.id;
            if (nextId) {
                this.fetchAndDisplayDetailData(parseInt(nextId));
            }
        });
    }
    
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
window.DexApp.DetailView.openDetailLightbox = function() {
    console.log("Opening detail lightbox...");
    const lightbox = this.elements.detailViewLightbox;
    
    if (!lightbox) {
        console.error("Detail lightbox element not found!");
        return;
    }
    
    lightbox.classList.remove('hidden');
    requestAnimationFrame(() => {
        lightbox.classList.add('visible');
    });
    
    document.body.style.overflow = 'hidden';
};

window.DexApp.DetailView.closeDetailLightbox = function() {
    const lightbox = this.elements.detailViewLightbox;
    if (!lightbox) return;
    
    lightbox.classList.remove('visible');
    
    const handleTransitionEnd = (event) => {
        if (event.target === lightbox && !lightbox.classList.contains('visible')) {
            lightbox.classList.add('hidden');
            lightbox.removeEventListener('transitionend', handleTransitionEnd);
        }
    };
    
    lightbox.addEventListener('transitionend', handleTransitionEnd);
    
    // Fallback timeout in case transition doesn't fire
    setTimeout(() => {
        if (!lightbox.classList.contains('visible')) {
            lightbox.classList.add('hidden');
        }
    }, 500);
    
    document.body.style.overflow = '';
};

window.DexApp.DetailView.fetchAndDisplayDetailData = async function(identifier) {
    this.openDetailLightbox(); // Open lightbox shell immediately
    
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
        
        // Update navigation controls
        this.updateDetailNavigation(data.id);
        
        // Process and display the data
        this.processAndDisplayDetailData(data);
        
        // Fetch TCG cards
        window.DexApp.TCG.fetchAndDisplayTcgData(data.baseName || data.name);
        
    } catch (error) {
        console.error("Error fetching detail data:", error);
        this.showDetailError(error.message);
    } finally {
        window.DexApp.Utils.UI.hideLoader(this.elements.detailLoader);
    }
};

window.DexApp.DetailView.updateDetailNavigation = function(currentId) {
    // Find the previous and next Pokémon IDs
    const prevId = currentId > 1 ? currentId - 1 : null;
    const nextId = currentId < 1010 ? currentId + 1 : null; // Adjust max ID as needed
    
    if (prevId) {
        this.elements.prevPokemonButton.classList.remove('disabled');
        this.elements.prevPokemonButton.dataset.id = prevId;
    } else {
        this.elements.prevPokemonButton.classList.add('disabled');
        this.elements.prevPokemonButton.dataset.id = '';
    }
    
    if (nextId) {
        this.elements.nextPokemonButton.classList.remove('disabled');
        this.elements.nextPokemonButton.dataset.id = nextId;
    } else {
        this.elements.nextPokemonButton.classList.add('disabled');
        this.elements.nextPokemonButton.dataset.id = '';
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
        .filter(si => window.DexApp.DetailView.getStatName(si.stat.name))
        .map(si => ({
            name: si.stat.name,
            displayName: window.DexApp.DetailView.getStatName(si.stat.name),
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
    
    // Setup sound control if available
    this.setupSoundControl(detailedData.cry);
    
    // Setup variants
    this.populateVariantSelector(detailedData.varieties || [], this.state.currentPokemonData.name);
    this.elements.detailVariantSelectorContainer.classList.toggle('hidden', !detailedData.hasVariants);
    
    // Update UI sections
    this.updateDetailVisualSection(detailedData.hasGenderSprites);
    this.updateDetailGameInfoTab(detailedData.hasVariants, detailedData.locationData);
    
    // Show the detail view
    this.elements.detailPokemonInfoDiv.classList.remove('hidden');
    this.elements.detailErrorMessageDiv.classList.add('hidden');
    
    // Set active tabs
    this.switchTab(this.elements.detailMainTabsContainer.querySelector('.tab-button.active') || 
                   this.elements.detailMainTabButtons[0]);
                   
    this.switchSubTab(this.elements.detailGameInfoTabsContainer.querySelector('.sub-tab-button.active') || 
                      this.elements.detailSubTabButtons[0]);
};

window.DexApp.DetailView.setupSoundControl = function(cryUrl) {
    // Setup sound control if available
    if (cryUrl) {
        const audioControl = `
            <div class="sound-control">
                <button class="sound-button" title="Play Pokémon cry">
                    <i class="fas fa-volume-up"></i>
                </button>
                <input type="range" class="volume-slider" min="0" max="100" value="70" title="Volume">
                <audio src="${cryUrl}" preload="none"></audio>
            </div>
        `;
        this.elements.detailPokemonSoundControl.innerHTML = audioControl;
        
        // Add event listener for sound button
        const soundButton = this.elements.detailPokemonSoundControl.querySelector('.sound-button');
        const audio = this.elements.detailPokemonSoundControl.querySelector('audio');
        const volumeSlider = this.elements.detailPokemonSoundControl.querySelector('.volume-slider');
        
        soundButton.addEventListener('click', () => {
            audio.volume = volumeSlider.value / 100;
            audio.currentTime = 0;
            audio.play();
        });
        
        volumeSlider.addEventListener('input', () => {
            audio.volume = volumeSlider.value / 100;
        });
        
        this.elements.detailPokemonSoundControl.classList.remove('hidden');
    } else {
        this.elements.detailPokemonSoundControl.innerHTML = '';
        this.elements.detailPokemonSoundControl.classList.add('hidden');
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
};

window.DexApp.DetailView.updateDetailGameInfoTab = function(hasVariants, locationData) {
    if (!this.state.currentPokemonData) return;
    
    this.elements.detailPokemonNameDisplay.textContent = 
        window.DexApp.Utils.formatters.formatName(this.state.currentPokemonData.name);
        
    this.elements.detailPokemonIdSpan.textContent = 
        `#${this.state.currentPokemonData.id.toString().padStart(3, '0')}`;
        
    this.elements.detailPokemonHeightP.textContent = 
        `${this.state.currentPokemonData.height / 10} m`;
        
    this.elements.detailPokemonWeightP.textContent = 
        `${this.state.currentPokemonData.weight / 10} kg`;
    
    // Process and display spawn rate info
    this.updateSpawnRateInfo(locationData);
    
    this.elements.detailVariantInfoSection.classList.toggle('hidden', !hasVariants);
    this.populateVersionSelector();
    this.updateDescription();
    this.renderActiveSubTabContent();
};

window.DexApp.DetailView.updateSpawnRateInfo = function(locationData) {
    const spawnRateSection = document.getElementById('spawn-rate-section');
    
    if (!locationData || locationData.length === 0) {
        if (spawnRateSection) spawnRateSection.classList.add('hidden');
        return;
    }
    
    // Format spawn rate information
    let spawnRateHtml = '';
    const groupedByLocation = {};
    
    locationData.forEach(encounter => {
        const locationName = window.DexApp.Utils.formatters.formatName(
            encounter.location_area.name.replace('-area', '')
        );
        
        if (!groupedByLocation[locationName]) {
            groupedByLocation[locationName] = [];
        }
        
        encounter.version_details.forEach(detail => {
            const versionName = window.DexApp.Utils.formatters.formatName(detail.version.name);
            const maxChance = detail.max_chance;
            const rateText = maxChance >= 50 ? 'Common' : 
                             maxChance >= 25 ? 'Uncommon' : 
                             maxChance >= 10 ? 'Rare' : 'Very Rare';
            
            // Store unique version/rate combinations
            if (!groupedByLocation[locationName].some(item => 
                item.version === versionName && item.rate === rateText)) {
                groupedByLocation[locationName].push({
                    version: versionName,
                    rate: rateText,
                    chance: maxChance
                });
            }
        });
    });
    
    // Generate HTML for spawn rates
    if (Object.keys(groupedByLocation).length > 0) {
        spawnRateHtml = '<div class="spawn-rate-container">';
        
        for (const location in groupedByLocation) {
            if (groupedByLocation[location].length > 0) {
                spawnRateHtml += `<div class="spawn-location"><strong>${location}:</strong>`;
                
                groupedByLocation[location].forEach(data => {
                    // Create color-coded rate indicator
                    const rateColor = data.rate === 'Common' ? '#16a34a' : 
                                      data.rate === 'Uncommon' ? '#f59e0b' : 
                                      data.rate === 'Rare' ? '#ef4444' : '#7c3aed';
                              
                    spawnRateHtml += `
                        <div class="spawn-detail">
                            <span class="game-version">${data.version}</span>
                            <span class="spawn-rate" style="color: ${rateColor}">
                                ${data.rate} (${data.chance}%)
                            </span>
                        </div>
                    `;
                });
                
                spawnRateHtml += '</div>';
            }
        }
        
        spawnRateHtml += '</div>';
        
        if (spawnRateSection) {
            spawnRateSection.innerHTML = `
                <h4 class="info-section-title !mb-1 !border-b-0 !text-sm !text-[var(--color-text-secondary)]">
                    Spawn Rates
                </h4>
                <div class="spawn-rate-info">${spawnRateHtml}</div>
            `;
            spawnRateSection.classList.remove('hidden');
        }
    } else {
        if (spawnRateSection) spawnRateSection.classList.add('hidden');
    }
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
            
            // Fetch the ability description
            fetch(abilityInfo.ability.url)
                .then(response => response.json())
                .then(abilityData => {
                    const englishEntries = abilityData.effect_entries.filter(
                        entry => entry.language.name === 'en'
                    );
                    
                    const description = englishEntries.length > 0 
                        ? englishEntries[0].effect 
                        : 'No description available.';
                    
                    abilityItem.innerHTML = `
                        <div class="ability-name">
                            ${window.DexApp.Utils.formatters.formatName(abilityInfo.ability.name)}
                            ${abilityInfo.is_hidden ? '<span class="italic">(Hidden)</span>' : ''}
                        </div>
                        <div class="ability-description text-sm text-[var(--color-text-secondary)] mt-1">
                            ${description}
                        </div>
                    `;
                })
                .catch(error => {
                    abilityItem.innerHTML = `
                        <div class="ability-name">
                            ${window.DexApp.Utils.formatters.formatName(abilityInfo.ability.name)}
                            ${abilityInfo.is_hidden ? '<span class="italic">(Hidden)</span>' : ''}
                        </div>
                        <div class="ability-description text-sm text-[var(--color-text-secondary)] mt-1">
                            Failed to load ability description.
                        </div>
                    `;
                });
            
            this.elements.detailAbilitiesList.appendChild(abilityItem);
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
        
        // Fetch move details
        fetch(`${window.DexApp.Constants.POKEAPI_BASE_URL}/move/${move.name.replace(' ', '-')}`)
            .then(response => response.json())
            .then(moveData => {
                const moveType = moveData.type.name;
                const movePower = moveData.power || '-';
                const moveAccuracy = moveData.accuracy || '-';
                const moveCategory = moveData.damage_class?.name || 'unknown';
                
                moveItem.innerHTML = `
                    <div class="move-basic-info">
                        <span class="move-level">Lv ${move.level}</span>
                        <span class="move-name">${window.DexApp.Utils.formatters.formatName(move.name)}</span>
                        <span class="move-type type-${moveType}">${moveType}</span>
                    </div>
                    <div class="move-details">
                        <span class="move-power" title="Power">
                            <i class="fas fa-fist-raised"></i> ${movePower}
                        </span>
                        <span class="move-accuracy" title="Accuracy">
                            <i class="fas fa-bullseye"></i> ${moveAccuracy}
                        </span>
                        <span class="move-category ${moveCategory}" title="${window.DexApp.Utils.formatters.capitalize(moveCategory)}">
                            <i class="fas fa-${moveCategory === 'physical' ? 'hand-rock' : 
                                                moveCategory === 'special' ? 'magic' : 'question'}"></i>
                        </span>
                    </div>
                `;
            })
            .catch(error => {
                moveItem.textContent = `Lv ${move.level}: ${window.DexApp.Utils.formatters.formatName(move.name)}`;
            });
        
        this.elements.detailMovesList.appendChild(moveItem);
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
    
    // Reset sound control
    this.elements.detailPokemonSoundControl.innerHTML = '';
    this.elements.detailPokemonSoundControl.classList.add('hidden');
    
    // Reset spawn rate
    const spawnRateSection = document.getElementById('spawn-rate-section');
    if (spawnRateSection) spawnRateSection.classList.add('hidden');
    
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
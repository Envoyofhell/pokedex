/**
 * @file        dex/js/modules/detailView.js
 * @description Handles the Pokemon Detail View lightbox content and navigation.
 * @version     2.1.0
 * @date        2025-05-05
 * @author      Your Name/AI Assistant
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, api.js, lightbox.js, tcgModule.js (optional)
 * @dependents   app.js, dexGrid.js, generator.js
 *
 * @changelog
 * v2.1.0 (2025-05-05): Added keyboard navigation (Arrows/Escape). Improved element caching and null checks.
 * v2.0.0 (2025-05-05): Added navigation context, Prev/Next buttons and logic.
 * v1.0.0 (Initial): Basic detail display logic.
 */

window.DexApp = window.DexApp || {};
window.DexApp.DetailView = {};

// --- State variables ---
window.DexApp.DetailView.state = {
    currentPokemonData: null, currentSpeciesData: null, currentFlavorTextEntries: [],
    currentStats: [], currentMoves: [], currentVarieties: [],
    isShiny: false, isFemale: false, currentStatSort: 'default',
    activeSubTab: 'summary-content', currentMovesPage: 1,
    movesPerPage: window.DexApp.Constants?.MAX_MOVES_DISPLAY || 50,
    currentAudio: null,
    navigationContext: null, // { source: 'grid' | 'generator', list: [{id, name}, ...], currentIndex: -1 }
    isLoadingNextPrev: false
};

// --- DOM Elements Cache ---
window.DexApp.DetailView.elements = {}; // Populated in initialize

// --- Initialize Detail View ---
window.DexApp.DetailView.initialize = function() {
    console.log("Initializing Detail View module (V2.1)...");
    this.cacheElements();
    if (!this.elements.detailViewLightbox) {
        console.error("Detail View Init Failed: Main lightbox container not found.");
        return;
    }
    this.setupEventListeners();
    console.log("Detail View module initialized (V2.1).");
};

// --- Cache DOM Elements ---
window.DexApp.DetailView.cacheElements = function() {
    const els = window.DexApp.DetailView.elements;
    // Cache all required elements by ID
    const elementIds = [
        'detail-view-lightbox', 'detail-close-button', 'detail-loader', 'detail-error-message',
        'detail-error-text', 'pokemon-info', 'content-section', 'visual-section',
        'pokemon-name-display', 'pokemon-id', 'play-cry-button', 'variant-selector-container',
        'variant-select', 'game-version-select', 'pokemon-description', 'pokemon-height',
        'pokemon-weight', 'variant-info-section', 'stat-sort-buttons', 'stats-container',
        'abilities-list', 'moves-list', 'moves-pagination', 'prev-move-page', 'next-move-page',
        'move-page-info', 'pokemon-image', 'pokemon-image-container', 'shiny-toggle',
        'gender-toggle', 'pokemon-types', 'tabs', 'game-info-tabs',
        'detail-prev-button', 'detail-next-button' // Navigation buttons
    ];
    elementIds.forEach(id => {
        // Convert kebab-case ID to camelCase for property name
        const propName = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        els[propName] = document.getElementById(id);
    });

    // Cache query-selected elements safely
    try {
        if (els.tabs) els.detailMainTabButtons = els.tabs.querySelectorAll('.tab-button');
        if (els.contentSection) els.detailMainTabContents = els.contentSection.querySelectorAll('.tab-content');
        if (els.gameInfoTabs) els.detailSubTabButtons = els.gameInfoTabs.querySelectorAll('.sub-tab-button');
        const gameInfoTab = document.getElementById('game-info-tab');
        if (gameInfoTab) els.detailSubTabContents = gameInfoTab.querySelectorAll('.sub-tab-content');
    } catch (e) { console.error("Error caching tab/sub-tab elements:", e); }
};


// --- Setup Event Listeners ---
window.DexApp.DetailView.setupEventListeners = function() {
    const elements = this.elements;
    // Helper to add listener if element exists
    const addListener = (element, event, handler) => {
        if (element) element.addEventListener(event, handler.bind(this));
        // else console.warn(`Listener not added: Element ${element?.id || 'undefined'} not found for ${event}`);
    };

    addListener(elements.tabs, 'click', (e) => { if (e.target.classList.contains('tab-button')) this.switchTab(e.target); });
    addListener(elements.gameInfoTabs, 'click', (e) => { if (e.target.classList.contains('sub-tab-button')) this.switchSubTab(e.target); });
    addListener(elements.shinyToggle, 'click', this.toggleShiny);
    addListener(elements.genderToggle, 'click', this.toggleGender);
    addListener(elements.gameVersionSelect, 'change', this.updateDescription);
    addListener(elements.variantSelect, 'change', (e) => this.handleVariantChange(e.target.value));
    addListener(elements.playCryButton, 'click', this.playPokemonCry);
    addListener(elements.statSortButtonsContainer, 'click', (e) => { if (e.target.classList.contains('sort-button')) this.handleStatSort(e.target.dataset.sort); });
    addListener(elements.prevMovePage, 'click', () => this.changeMovesPage(-1));
    addListener(elements.nextMovePage, 'click', () => this.changeMovesPage(1));
    addListener(elements.detailPrevButton, 'click', this.showPreviousPokemon);
    addListener(elements.detailNextButton, 'click', this.showNextPokemon);

    // Keyboard Navigation (Handled by Lightbox module now for better central control)
    // document.addEventListener('keydown', this.handleKeydown.bind(this));
};

// --- Handle Variant Change ---
window.DexApp.DetailView.handleVariantChange = function(selectedIdentifier) {
    if (selectedIdentifier && this.state.currentPokemonData?.name !== selectedIdentifier) {
        console.log(`Variant selected: ${selectedIdentifier}`);
        // Refetch data for the variant, preserving the original navigation context
        this.fetchAndDisplayDetailData(selectedIdentifier, this.state.navigationContext);
    }
};

// --- Handle Stat Sort ---
window.DexApp.DetailView.handleStatSort = function(sortType) {
    if (!sortType) return;
    this.state.currentStatSort = (this.state.currentStatSort === sortType && sortType !== 'default') ? 'default' : sortType;
    this.renderStats();
    this.updateStatSortButtons();
};

// --- Handle Moves Pagination ---
window.DexApp.DetailView.changeMovesPage = function(direction) {
    const totalPages = Math.ceil((this.state.currentMoves?.length || 0) / this.state.movesPerPage);
    const newPage = this.state.currentMovesPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        this.state.currentMovesPage = newPage;
        this.renderMoves();
    }
};

// --- Fetch and Display Data ---
window.DexApp.DetailView.fetchAndDisplayDetailData = async function(identifier, context = null) {
    if (!identifier) { console.error("No identifier provided to fetch detail data."); return; }

    // Store context & source
    this.state.navigationContext = context;
    const source = context?.source || null;
    window.DexApp.Lightbox?.openDetailLightbox(source); // Inform lightbox of the source

    if (!this.elements.detailLoader || !this.elements.detailPokemonInfoDiv || !this.elements.detailErrorMessageDiv) {
        console.error("Detail view critical elements missing.");
        window.DexApp.Lightbox?.closeDetailLightbox(); // Close lightbox if UI is broken
        return;
    }

    window.DexApp.Utils.UI.showLoader(this.elements.detailLoader);
    this.elements.detailPokemonInfoDiv.classList.add('hidden');
    this.elements.detailErrorMessageDiv.classList.add('hidden');
    this.resetDetailUIState();

    try {
        console.log(`Fetching details for: ${identifier}`);
        const data = await window.DexApp.API.fetchDetailedPokemonData(identifier);
        if (!data?.fullPokemonData) throw new Error(`Incomplete data received for ${identifier}`);

        // Store current data
        this.state.currentPokemonData = data.fullPokemonData;
        this.state.currentSpeciesData = data.fullSpeciesData;
        this.state.currentVarieties = data.varieties || [];

        // Update UI elements
        this.processAndDisplayDetailData(data);
        this.updateNavigationButtons(); // Update nav button states based on context

        // Fetch TCG cards async
        if (window.DexApp.TCG?.fetchAndDisplayTcgData) {
            window.DexApp.TCG.fetchAndDisplayTcgData(data.baseName || data.name)
               .catch(e => console.warn("TCG fetch failed:", e));
        }

    } catch (error) {
        console.error(`Error fetching detail data for ${identifier}:`, error);
        this.showDetailError(error.message || `Could not load details for ${identifier}.`);
        this.updateNavigationButtons(); // Disable nav buttons on error
    } finally {
        window.DexApp.Utils.UI.hideLoader(this.elements.detailLoader);
        this.state.isLoadingNextPrev = false; // Reset loading flag
        this.updateNavigationButtons(); // Final update for nav buttons
    }
};


// --- Process and Display Data ---
window.DexApp.DetailView.processAndDisplayDetailData = function(detailedData) {
    if (!detailedData?.fullPokemonData) { this.showDetailError("Invalid data received."); return; }
    const elements = this.elements;

    // Reset states
    this.state.isShiny = false; this.state.isFemale = false;
    elements.shinyToggle?.classList.remove('active');
    elements.genderToggle?.classList.add('hidden'); // Hide first, show later if applicable
    elements.genderToggle?.classList.remove('active');

    // Process data fields
    this.state.currentStats = detailedData.fullPokemonData.stats?.filter(si => this.getStatName(si.stat.name)).map(si => ({ name: si.stat.name, displayName: this.getStatName(si.stat.name), value: si.base_stat })) || [];
    this.state.currentStatSort = 'default';
    this.state.currentMoves = detailedData.fullPokemonData.moves?.flatMap(moveInfo => moveInfo.version_group_details.map(detail => ({ name: moveInfo.move.name.replace('-', ' '), level: detail.move_learn_method.name === 'level-up' ? detail.level_learned_at : null, url: moveInfo.move.url }))).filter(move => move.level !== null && move.level > 0).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)).filter((move, index, self) => index === self.findIndex((m) => (m.name === move.name && m.level === move.level))) || [];
    this.state.currentFlavorTextEntries = []; if (detailedData.fullSpeciesData?.flavor_text_entries) { const seenVersions = new Set(); this.state.currentFlavorTextEntries = detailedData.fullSpeciesData.flavor_text_entries.filter(e => e.language.name === 'en').map(e => ({ version: window.DexApp.Utils.formatters.formatVersionName(e.version.name), text: window.DexApp.Utils.formatters.cleanFlavorText(e.flavor_text) })).filter(e => !seenVersions.has(e.version) && seenVersions.add(e.version)).sort((a, b) => a.version.localeCompare(b.version)); }

    // Setup variants
    this.populateVariantSelector(detailedData.varieties || [], detailedData.name);
    elements.variantSelectorContainer?.classList.toggle('hidden', !(detailedData.varieties && detailedData.varieties.length > 1));

    // Update UI sections
    this.updateDetailVisualSection(detailedData.hasGenderSprites);
    this.updateDetailGameInfoTab(detailedData.hasVariants);

    // Show content
    elements.detailPokemonInfoDiv?.classList.remove('hidden');
    elements.detailErrorMessageDiv?.classList.add('hidden');

    // Set default active tabs
    this.switchTab(elements.tabs?.querySelector('.tab-button.active') || elements.detailMainTabButtons?.[0]);
    this.switchSubTab(elements.gameInfoTabs?.querySelector('.sub-tab-button.active') || elements.detailSubTabButtons?.[0]);

    this.setupCryButton(detailedData.cry);
};

// --- Navigation Functions ---
window.DexApp.DetailView.updateNavigationButtons = function() {
    const { navigationContext, isLoadingNextPrev } = this.state;
    const { detailPrevButton: prevButton, detailNextButton: nextButton } = this.elements;
    if (!prevButton || !nextButton) return;

    const canNavigate = navigationContext?.list?.length > 1;
    const canGoPrev = canNavigate && navigationContext.currentIndex > 0;
    const canGoNext = canNavigate && navigationContext.currentIndex < navigationContext.list.length - 1;

    prevButton.disabled = !canGoPrev || isLoadingNextPrev;
    nextButton.disabled = !canGoNext || isLoadingNextPrev;
    prevButton.classList.toggle('hidden', !canNavigate);
    nextButton.classList.toggle('hidden', !canNavigate);
    prevButton.style.opacity = isLoadingNextPrev ? 0.5 : 1;
    nextButton.style.opacity = isLoadingNextPrev ? 0.5 : 1;
};

window.DexApp.DetailView.showNextPokemon = function() {
    const { navigationContext, isLoadingNextPrev } = this.state;
    if (isLoadingNextPrev || !navigationContext || navigationContext.currentIndex >= navigationContext.list.length - 1) return;

    this.state.isLoadingNextPrev = true; this.updateNavigationButtons();
    const nextIndex = navigationContext.currentIndex + 1;
    const nextPokemonInfo = navigationContext.list[nextIndex];

    if (nextPokemonInfo) {
        const newContext = { ...navigationContext, currentIndex: nextIndex };
        const identifier = nextPokemonInfo.name || nextPokemonInfo.id; // Use name or ID from list item
        // Fetch data, isLoadingNextPrev reset in fetch finally block
        this.fetchAndDisplayDetailData(identifier, newContext);
    } else {
        console.warn("Next Pokemon info not found.");
        this.state.isLoadingNextPrev = false; this.updateNavigationButtons();
    }
};

window.DexApp.DetailView.showPreviousPokemon = function() {
    const { navigationContext, isLoadingNextPrev } = this.state;
    if (isLoadingNextPrev || !navigationContext || navigationContext.currentIndex <= 0) return;

    this.state.isLoadingNextPrev = true; this.updateNavigationButtons();
    const prevIndex = navigationContext.currentIndex - 1;
    const prevPokemonInfo = navigationContext.list[prevIndex];

    if (prevPokemonInfo) {
        const newContext = { ...navigationContext, currentIndex: prevIndex };
        const identifier = prevPokemonInfo.name || prevPokemonInfo.id;
        this.fetchAndDisplayDetailData(identifier, newContext);
    } else {
        console.warn("Previous Pokemon info not found.");
        this.state.isLoadingNextPrev = false; this.updateNavigationButtons();
    }
};

// --- Other UI Update Functions (with null checks) ---
window.DexApp.DetailView.setupCryButton = function(cryUrl) { const btn = this.elements.playCryButton; if(!btn) return; btn.classList.toggle('hidden', !cryUrl); btn.onclick = cryUrl ? () => this.playPokemonCry(cryUrl) : null; };
window.DexApp.DetailView.playPokemonCry = function(specificUrl = null) { const url = specificUrl || this.state.currentPokemonData?.cries?.latest || this.state.currentPokemonData?.cries?.legacy; if (!url) return; try { if (this.state.currentAudio) this.state.currentAudio.pause(); const audio = new Audio(url); audio.volume = 0.7; audio.play().catch(e => console.error("Cry play error:", e)); this.state.currentAudio = audio; } catch (e) { console.error("Audio error:", e); } };
window.DexApp.DetailView.switchTab = function(clickedTab) { if (!clickedTab || !this.elements.detailMainTabButtons || !this.elements.detailMainTabContents) return; const targetId = clickedTab.dataset.tab; this.elements.detailMainTabButtons.forEach(b => b.classList.remove('active')); clickedTab.classList.add('active'); this.updateActiveTabColor(); this.elements.detailMainTabContents.forEach(c => c.classList.toggle('active', c.id === targetId)); };
window.DexApp.DetailView.switchSubTab = function(clickedSubTab) { if (!clickedSubTab || !this.elements.detailSubTabButtons || !this.elements.detailSubTabContents) return; const targetId = clickedSubTab.dataset.subtab; this.elements.detailSubTabButtons.forEach(b => b.classList.remove('active')); clickedSubTab.classList.add('active'); this.state.activeSubTab = targetId; this.updateActiveSubTabColor(); this.elements.detailSubTabContents.forEach(c => c.classList.toggle('active', c.id === targetId)); this.renderActiveSubTabContent(); };
window.DexApp.DetailView.updateActiveTabColor = function() { const activeTab = this.elements.tabs?.querySelector('.tab-button.active'); if (!activeTab) return; const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-primary)'; activeTab.style.borderColor = darkColor; activeTab.style.color = darkColor; this.elements.detailMainTabButtons?.forEach(b => { if (!b.classList.contains('active')) { b.style.borderColor = 'transparent'; b.style.color = ''; } }); };
window.DexApp.DetailView.updateActiveSubTabColor = function() { const activeSubTab = this.elements.gameInfoTabs?.querySelector('.sub-tab-button.active'); if (!activeSubTab) return; const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-primary)'; activeSubTab.style.backgroundColor = darkColor; activeSubTab.style.color = 'white'; this.elements.detailSubTabButtons?.forEach(b => { if (!b.classList.contains('active')) { b.style.backgroundColor = ''; b.style.color = ''; } }); };
window.DexApp.DetailView.populateVariantSelector = function(varieties, currentFormIdentifier) { const select = this.elements.variantSelect; if (!select) return; select.innerHTML = ''; if (!varieties || varieties.length <= 1) { this.elements.variantSelectorContainer?.classList.add('hidden'); return; } varieties.forEach(v => { const opt = document.createElement('option'); opt.value = v.identifier; opt.textContent = v.name; if (v.identifier === currentFormIdentifier) opt.selected = true; select.appendChild(opt); }); this.elements.variantSelectorContainer?.classList.remove('hidden'); };
window.DexApp.DetailView.updateDetailVisualSection = function(hasGenderSprites) { const data = this.state.currentPokemonData; if (!data || !this.elements.visualSection) return; const types = data.types || []; let c1='var(--color-secondary)', c2='var(--color-primary)', dynColor=c1, dynLight=c2; if(types.length===1){ const t=types[0].type.name; c1=`var(--type-${t}, ${c1})`; c2=`var(--type-${t}-light, ${c2})`; dynColor=c1; dynLight=c2;} else if(types.length>1){ const t1=types[0].type.name; const t2=types[1].type.name; c1=`var(--type-${t1}, ${c1})`; c2=`var(--type-${t2}, ${c2})`; dynColor=c1; dynLight=c2;} document.documentElement.style.setProperty('--gradient-color-1', c1); document.documentElement.style.setProperty('--gradient-color-2', c2); document.documentElement.style.setProperty('--dynamic-type-color', dynColor); document.documentElement.style.setProperty('--dynamic-type-color-light', dynLight); this.updateActiveTabColor(); this.updateActiveSubTabColor(); this.updateStatSortButtons(); this.elements.genderToggle?.classList.toggle('hidden', !hasGenderSprites); this.updatePokemonImage(); const typesDiv = this.elements.pokemonTypes; if(typesDiv){ typesDiv.innerHTML=''; types.forEach(ti => typesDiv.appendChild(window.DexApp.Utils.UI.createTypeIcon(ti.type.name))); } this.elements.playCryButton?.classList.toggle('hidden', !(data.cries?.latest || data.cries?.legacy)); };
window.DexApp.DetailView.updateDetailGameInfoTab = function(hasVariants) { const data = this.state.currentPokemonData; if (!data) return; window.DexApp.Utils.UI.updateElementText('pokemon-name-display', window.DexApp.Utils.formatters.formatName(data.name)); window.DexApp.Utils.UI.updateElementText('pokemon-id', `#${String(data.id).padStart(3, '0')}`); window.DexApp.Utils.UI.updateElementText('pokemon-height', `${(data.height / 10).toFixed(1)} m`); window.DexApp.Utils.UI.updateElementText('pokemon-weight', `${(data.weight / 10).toFixed(1)} kg`); this.elements.variantInfoSection?.classList.toggle('hidden', !hasVariants); this.populateVersionSelector(); this.updateDescription(); this.renderActiveSubTabContent(); };
window.DexApp.DetailView.populateVersionSelector = function() { const select = this.elements.gameVersionSelect; if (!select) return; select.innerHTML = ''; if (this.state.currentFlavorTextEntries.length > 0) { this.state.currentFlavorTextEntries.forEach((entry, i) => { const opt = document.createElement('option'); opt.value = i; opt.textContent = entry.version; select.appendChild(opt); }); select.disabled = false; } else { const opt = document.createElement('option'); opt.textContent = 'No entries'; select.appendChild(opt); select.disabled = true; } };
window.DexApp.DetailView.updateDescription = function() { const p = this.elements.pokemonDescriptionP; if (!p) return; const idx = this.elements.gameVersionSelect?.value; const entry = this.state.currentFlavorTextEntries[idx] || this.state.currentFlavorTextEntries[0]; p.textContent = entry ? entry.text : 'No description available.'; if (!entry && this.elements.gameVersionSelect && this.state.currentFlavorTextEntries.length > 0) this.elements.gameVersionSelect.value = 0; };
window.DexApp.DetailView.renderActiveSubTabContent = function() { switch(this.state.activeSubTab) { case 'stats-content': this.renderStats(); this.hideMovesPagination(); break; case 'abilities-content': this.renderAbilities(); this.hideMovesPagination(); break; case 'moves-content': this.state.currentMovesPage = 1; this.renderMoves(); break; default: this.hideMovesPagination(); break; } };
window.DexApp.DetailView.renderStats = function() { const container = this.elements.statsContainer; if (!container) return; container.innerHTML = ''; let statsToRender = [...this.state.currentStats]; const defaultOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']; switch (this.state.currentStatSort) { case 'name': statsToRender.sort((a, b) => a.displayName.localeCompare(b.displayName)); break; case 'asc': statsToRender.sort((a, b) => a.value - b.value); break; case 'desc': statsToRender.sort((a, b) => b.value - a.value); break; default: statsToRender.sort((a, b) => defaultOrder.indexOf(a.name) - defaultOrder.indexOf(b.name)); } const statColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-accent)'; statsToRender.forEach(stat => { const statMax = 255; const statPercentage = Math.max(1, (stat.value / statMax) * 100); const el = document.createElement('div'); el.className = 'stat-item'; el.innerHTML = `<span class="stat-name">${stat.displayName}</span><span class="stat-value">${stat.value}</span><div class="stat-bar-bg"><div class="stat-bar" style="width: 0%; background-color: ${statColor};"></div></div>`; container.appendChild(el); setTimeout(() => { el.querySelector('.stat-bar')?.style.setProperty('width', `${statPercentage}%`); }, 50); }); const total = statsToRender.reduce((sum, s) => sum + s.value, 0); const totalEl = document.createElement('div'); totalEl.className = 'stat-total'; totalEl.innerHTML = `<span class="stat-name">TOTAL</span><span class="stat-value">${total}</span>`; container.appendChild(totalEl); };
window.DexApp.DetailView.renderAbilities = function() { const list = this.elements.abilitiesList; if (!list) return; list.innerHTML = ''; const abilities = this.state.currentPokemonData?.abilities; if (abilities?.length > 0) { abilities.forEach(aInfo => { const item = document.createElement('li'); item.innerHTML = `${window.DexApp.Utils.formatters.formatName(aInfo.ability.name)}${aInfo.is_hidden ? ' <span class="italic text-xs">(Hidden)</span>' : ''}`; list.appendChild(item); fetch(aInfo.ability.url).then(res => res.json()).then(aData => { const entry = aData.effect_entries?.find(e => e.language.name === 'en'); if (entry) { const desc = document.createElement('p'); desc.className = 'ability-description'; desc.textContent = entry.short_effect || entry.effect; item.appendChild(desc); } }).catch(e => console.warn('Failed to fetch ability desc:', e)); }); } else { list.innerHTML = '<li class="italic text-[var(--color-text-secondary)]">No abilities listed.</li>'; } };
window.DexApp.DetailView.renderMoves = function() { const list = this.elements.movesList; const pagination = this.elements.movesPagination; if (!list || !pagination) return; list.innerHTML = ''; const moves = this.state.currentMoves; if (!moves || moves.length === 0) { list.innerHTML = '<li class="italic text-[var(--color-text-secondary)]">No level-up moves found.</li>'; pagination.classList.add('hidden'); return; } const totalPages = Math.ceil(moves.length / this.state.movesPerPage); this.state.currentMovesPage = Math.max(1, Math.min(this.state.currentMovesPage, totalPages)); const start = (this.state.currentMovesPage - 1) * this.state.movesPerPage; const end = start + this.state.movesPerPage; const movesToDisplay = moves.slice(start, end); movesToDisplay.forEach(move => { const item = document.createElement('li'); item.className = 'move-item'; item.innerHTML = `<span>Lv ${move.level}: ${window.DexApp.Utils.formatters.formatName(move.name)}</span>`; list.appendChild(item); if (move.url) { fetch(move.url).then(r=>r.json()).then(mData => { if (!item.isConnected) return; const typeBadge = window.DexApp.Utils.UI.createTypeIcon(mData.type.name); typeBadge.style.marginLeft='0.5rem'; typeBadge.style.fontSize='0.7rem'; item.appendChild(typeBadge); item.innerHTML += `<span class="move-detail">P: ${mData.power || '-'}</span><span class="move-detail">Acc: ${mData.accuracy || '-'}</span>`; }).catch(e=>console.warn('Move detail fetch failed:',e)); } }); if (totalPages > 1) { if(this.elements.prevMovePage) this.elements.prevMovePage.disabled = this.state.currentMovesPage === 1; if(this.elements.nextMovePage) this.elements.nextMovePage.disabled = this.state.currentMovesPage === totalPages; if(this.elements.movePageInfo) this.elements.movePageInfo.textContent = `Page ${this.state.currentMovesPage} of ${totalPages}`; pagination.classList.remove('hidden'); } else { pagination.classList.add('hidden'); } };
window.DexApp.DetailView.hideMovesPagination = function() { this.elements.movesPagination?.classList.add('hidden'); };
window.DexApp.DetailView.updatePokemonImage = function() { const img = this.elements.detailPokemonImage; if (!img || !this.state.currentPokemonData) return; const sprites = this.state.currentPokemonData.sprites; const art = sprites?.other?.['official-artwork']; const home = sprites?.other?.home; let url = art?.front_default || home?.front_default || sprites?.front_default; if (this.state.isShiny) url = (this.state.isFemale && (home?.front_shiny_female || art?.front_shiny_female)) || home?.front_shiny || art?.front_shiny || sprites?.front_shiny || url; else if (this.state.isFemale) url = home?.front_female || art?.front_female || sprites?.front_female || url; img.src = url || 'https://placehold.co/256x256/cccccc/ffffff?text=?'; img.alt = `Image of ${this.state.isShiny ? 'shiny ' : ''}${this.state.isFemale ? 'female ' : ''}${this.state.currentPokemonData.name}`; img.onerror = () => { img.src = 'https://placehold.co/256x256/cccccc/ffffff?text=?'; img.alt = `${this.state.currentPokemonData.name} image not found`; }; };
window.DexApp.DetailView.toggleShiny = function() { if (!this.state.currentPokemonData) return; this.state.isShiny = !this.state.isShiny; this.elements.shinyToggle?.classList.toggle('active', this.state.isShiny); this.updatePokemonImage(); };
window.DexApp.DetailView.toggleGender = function() { if (!this.state.currentPokemonData?.sprites?.front_female) return; this.state.isFemale = !this.state.isFemale; this.elements.genderToggle?.classList.toggle('active', this.state.isFemale); this.updatePokemonImage(); };
window.DexApp.DetailView.updateStatSortButtons = function() { const container = this.elements.statSortButtonsContainer; if (!container) return; const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-secondary)'; container.querySelectorAll('.sort-button').forEach(b => { const isActive = b.dataset.sort === this.state.currentStatSort; b.classList.toggle('active', isActive); b.style.backgroundColor = isActive ? activeColor : ''; b.style.borderColor = isActive ? 'transparent' : ''; b.style.color = isActive ? 'white' : ''; }); };
window.DexApp.DetailView.resetDetailUIState = function() { /* Reset text content, clear lists, reset toggles */ this.elements.gameVersionSelect && (this.elements.gameVersionSelect.innerHTML = '<option>Loading...</option>', this.elements.gameVersionSelect.disabled = true); this.elements.pokemonDescriptionP && (this.elements.pokemonDescriptionP.textContent = 'Loading...'); this.elements.statsContainer && (this.elements.statsContainer.innerHTML = ''); this.state.currentStatSort = 'default'; this.updateStatSortButtons(); this.elements.abilitiesList && (this.elements.abilitiesList.innerHTML = ''); this.elements.movesList && (this.elements.movesList.innerHTML = ''); this.state.isShiny = false; this.state.isFemale = false; this.elements.shinyToggle?.classList.remove('active'); this.elements.genderToggle?.classList.add('hidden'); this.elements.genderToggle?.classList.remove('active'); this.elements.variantSelectorContainer?.classList.add('hidden'); this.elements.variantSelect && (this.elements.variantSelect.innerHTML = ''); if (this.state.currentAudio) { this.state.currentAudio.pause(); this.state.currentAudio = null; } this.elements.playCryButton?.classList.add('hidden'); this.hideMovesPagination(); this.state.navigationContext = null; this.updateNavigationButtons(); }; // Reset nav context
window.DexApp.DetailView.showDetailError = function(message) { if(this.elements.detailErrorText) this.elements.detailErrorText.textContent = message || "An error occurred."; this.elements.detailErrorMessageDiv?.classList.remove('hidden'); this.elements.detailPokemonInfoDiv?.classList.add('hidden'); window.DexApp.Utils.UI.hideLoader(this.elements.detailLoader); };
window.DexApp.DetailView.getStatName = function(statName) { const map = { 'hp': 'HP', 'attack': 'Attack', 'defense': 'Defense', 'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', 'speed': 'Speed' }; return map[statName] || window.DexApp.Utils.formatters.capitalize(statName.replace('-', ' ')); };

console.log("DetailView module loaded (v2.1.0)");


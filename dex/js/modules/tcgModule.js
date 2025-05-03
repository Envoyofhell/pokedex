// dex/js/modules/tcgModule.js
// TCG card functionality for the Pokédex application

// Create TCG namespace
window.DexApp = window.DexApp || {};
window.DexApp.TCG = {};

// State variables
window.DexApp.TCG.state = {
    currentTcgCards: [],
    filteredTcgCards: []
};

// DOM Elements
window.DexApp.TCG.elements = {
    detailTcgSearchInput: document.getElementById('tcg-search'),
    detailTcgSearchButton: document.getElementById('tcg-search-button'),
    detailTcgTypeFilter: document.getElementById('tcg-type-filter'),
    detailTcgRarityFilter: document.getElementById('tcg-rarity-filter'),
    detailTcgSetFilter: document.getElementById('tcg-set-filter'),
    detailTcgLoader: document.getElementById('tcg-loader'),
    detailTcgErrorDiv: document.getElementById('tcg-error'),
    detailTcgErrorText: document.getElementById('tcg-error-text'),
    detailTcgCardsContainer: document.getElementById('tcg-cards-container'),
    // TCG Lightbox elements
    tcgLightbox: document.getElementById('tcg-lightbox'),
    lightboxCloseButton: document.getElementById('lightbox-close'),
    lightboxCardName: document.getElementById('lightbox-card-name'),
    lightboxCardImage: document.getElementById('lightbox-card-image'),
    lightboxCardDetails: document.getElementById('lightbox-card-details')
};

// --- Initialize TCG Module ---
window.DexApp.TCG.initialize = function() {
    this.setupEventListeners();
    this.populateFilterDropdowns();
};

window.DexApp.TCG.setupEventListeners = function() {
    const elements = this.elements;
    
    // TCG Search & Filtering
    elements.detailTcgSearchButton.addEventListener('click', () => this.filterAndDisplayTcgData());
    elements.detailTcgSearchInput.addEventListener('input', () => this.filterAndDisplayTcgData());
    elements.detailTcgSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') event.preventDefault();
    });
    
    // Type filter change
    if (elements.detailTcgTypeFilter) {
        elements.detailTcgTypeFilter.addEventListener('change', () => this.filterAndDisplayTcgData());
    }
    
    // Rarity filter change
    if (elements.detailTcgRarityFilter) {
        elements.detailTcgRarityFilter.addEventListener('change', () => this.filterAndDisplayTcgData());
    }
    
    // Set filter change
    if (elements.detailTcgSetFilter) {
        elements.detailTcgSetFilter.addEventListener('change', () => this.filterAndDisplayTcgData());
    }
    
    // TCG Lightbox Controls
    elements.lightboxCloseButton.addEventListener('click', () => this.closeTcgLightbox());
    elements.tcgLightbox.addEventListener('click', (event) => {
        if (event.target === elements.tcgLightbox) this.closeTcgLightbox();
    });
};

window.DexApp.TCG.populateFilterDropdowns = function() {
    // Populate TCG Type filter
    if (this.elements.detailTcgTypeFilter) {
        this.elements.detailTcgTypeFilter.innerHTML = '<option value="">All Types</option>';
        
        window.DexApp.Constants.TCG_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.elements.detailTcgTypeFilter.appendChild(option);
        });
    }
    
    // Populate TCG Rarity filter
    if (this.elements.detailTcgRarityFilter) {
        this.elements.detailTcgRarityFilter.innerHTML = '<option value="">All Rarities</option>';
        
        window.DexApp.Constants.TCG_RARITIES.forEach(rarity => {
            const option = document.createElement('option');
            option.value = rarity;
            option.textContent = rarity;
            this.elements.detailTcgRarityFilter.appendChild(option);
        });
    }
    
    // Set filter is populated when the API fetches the sets
};

// --- TCG Data Fetching & Display ---
window.DexApp.TCG.fetchAndDisplayTcgData = async function(pokemonName, options = {}) {
    const elements = this.elements;
    
    window.DexApp.Utils.UI.showLoader(elements.detailTcgLoader);
    if (elements.detailTcgErrorDiv) elements.detailTcgErrorDiv.classList.add('hidden');
    if (elements.detailTcgCardsContainer) elements.detailTcgCardsContainer.innerHTML = '';
    
    // If any filters are set, include them in the options
    if (!options.type && elements.detailTcgTypeFilter && elements.detailTcgTypeFilter.value) {
        options.type = elements.detailTcgTypeFilter.value;
    }
    
    if (!options.rarity && elements.detailTcgRarityFilter && elements.detailTcgRarityFilter.value) {
        options.rarity = elements.detailTcgRarityFilter.value;
    }
    
    if (!options.set && elements.detailTcgSetFilter && elements.detailTcgSetFilter.value) {
        options.set = elements.detailTcgSetFilter.value;
    }
    
    try {
        this.state.currentTcgCards = await window.DexApp.API.fetchTcgData(pokemonName, options);
        this.filterAndDisplayTcgData();
    } catch (error) {
        console.error("Error in fetchAndDisplayTcgData:", error);
        this.showDetailTcgError(`Error fetching TCG data: ${error.message}`);
    } finally {
        window.DexApp.Utils.UI.hideLoader(elements.detailTcgLoader);
    }
};

window.DexApp.TCG.filterAndDisplayTcgData = function() {
    const searchTerm = this.elements.detailTcgSearchInput.value.toLowerCase().trim();
    const typeFilter = this.elements.detailTcgTypeFilter ? this.elements.detailTcgTypeFilter.value : '';
    const rarityFilter = this.elements.detailTcgRarityFilter ? this.elements.detailTcgRarityFilter.value : '';
    const setFilter = this.elements.detailTcgSetFilter ? this.elements.detailTcgSetFilter.value : '';
    
    if (searchTerm || typeFilter || rarityFilter || setFilter) {
        this.state.filteredTcgCards = this.state.currentTcgCards.filter(card => {
            // Name/text search
            const matchesSearch = !searchTerm || 
                card.name.toLowerCase().includes(searchTerm) ||
                card.attacks?.some(attack => 
                    attack.name.toLowerCase().includes(searchTerm) || 
                    attack.text?.toLowerCase().includes(searchTerm)
                ) ||
                card.abilities?.some(ability => 
                    ability.name.toLowerCase().includes(searchTerm) || 
                    ability.text?.toLowerCase().includes(searchTerm)
                );
            
            // Type filter
            const matchesType = !typeFilter || 
                (card.types && card.types.includes(typeFilter));
            
            // Rarity filter
            const matchesRarity = !rarityFilter || 
                card.rarity === rarityFilter;
            
            // Set filter
            const matchesSet = !setFilter || 
                (card.set && card.set.id === setFilter);
            
            return matchesSearch && matchesType && matchesRarity && matchesSet;
        });
    } else {
        this.state.filteredTcgCards = [...this.state.currentTcgCards];
    }
    
    this.displayTcgData(this.state.filteredTcgCards);
};

window.DexApp.TCG.displayTcgData = function(cards) {
    const container = this.elements.detailTcgCardsContainer;
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!cards || cards.length === 0) {
        const hasFilters = this.elements.detailTcgSearchInput.value.trim() || 
                          (this.elements.detailTcgTypeFilter && this.elements.detailTcgTypeFilter.value) || 
                          (this.elements.detailTcgRarityFilter && this.elements.detailTcgRarityFilter.value) || 
                          (this.elements.detailTcgSetFilter && this.elements.detailTcgSetFilter.value);
                          
        const message = hasFilters ? 
            'No cards match your filter criteria.' : 
            'No TCG cards found for this Pokémon.';
        
        container.innerHTML = `
            <p class="text-center text-[var(--color-text-secondary)] italic p-4">${message}</p>
        `;
        return;
    }
    
    // Group cards by set
    const groupedBySet = cards.reduce((acc, card) => {
        const setName = card.set?.name || 'Unknown Set';
        if (!acc[setName]) {
            acc[setName] = { 
                details: card.set, 
                cards: [] 
            };
        }
        acc[setName].cards.push(card);
        return acc;
    }, {});
    
    // Sort sets by release date (newest first)
    const sortedSetNames = Object.keys(groupedBySet).sort((a, b) => {
        const dateA = groupedBySet[a].details?.releaseDate;
        const dateB = groupedBySet[b].details?.releaseDate;
        if (dateA && dateB) return new Date(dateB) - new Date(dateA);
        return a.localeCompare(b);
    });
    
    // Create set groups and display cards
    sortedSetNames.forEach(setName => {
        const setGroup = groupedBySet[setName];
        const setGroupElement = document.createElement('div');
        setGroupElement.className = 'tcg-set-group';
        
        const setHeader = document.createElement('div');
        setHeader.className = 'tcg-set-header';
        setHeader.innerHTML = `
            <span>${setName} (${setGroup.details?.series || 'N/A'})</span>
            <i class="fas fa-chevron-down"></i>
        `;
        setHeader.addEventListener('click', () => this.toggleSetCollapse(setHeader));
        
        const setContent = document.createElement('div');
        setContent.className = 'tcg-set-content';
        
        setGroup.cards.forEach(card => {
            const cardElement = this.createTcgCardElement(card);
            setContent.appendChild(cardElement);
        });
        
        setGroupElement.appendChild(setHeader);
        setGroupElement.appendChild(setContent);
        container.appendChild(setGroupElement);
    });
};

window.DexApp.TCG.createTcgCardElement = function(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'tcg-card';
    cardElement.dataset.cardId = card.id;
    cardElement.addEventListener('click', () => this.openTcgLightbox(card.id));
    
    const imageElement = document.createElement('img');
    imageElement.src = card.images?.small || 'https://placehold.co/100x140/cccccc/ffffff?text=No+Img';
    imageElement.alt = `Image of ${card.name} TCG card`;
    imageElement.className = 'tcg-card-image';
    imageElement.loading = 'lazy';
    imageElement.onerror = () => {
        imageElement.src = 'https://placehold.co/100x140/cccccc/ffffff?text=No+Img';
    };
    
    // Enhanced card details
    const detailsElement = document.createElement('div');
    detailsElement.className = 'tcg-card-details';
    
    let rarityBadgeHtml = '';
    if (card.rarity) {
        const rarityClass = card.rarity.replace(/[\s-]/g, '').toLowerCase();
        rarityBadgeHtml = `<span class="tcg-rarity-badge ${rarityClass}">${card.rarity}</span>`;
    }
    
    let typeIconsHtml = '';
    if (card.types && card.types.length > 0) {
        typeIconsHtml = card.types.map(type => 
            `<span class="tcg-type-icon tcg-type-${type}" title="${type}"></span>`
        ).join('');
    }
    
    detailsElement.innerHTML = `
        <div class="tcg-card-header">
            <h5>${card.name} ${card.hp ? `<span class="tcg-hp">${card.hp} HP</span>` : ''}</h5>
            <div class="tcg-card-metadata">
                ${typeIconsHtml}
                ${rarityBadgeHtml}
            </div>
        </div>
        <div class="tcg-card-subtext">
            <span class="tcg-set-info">${card.set?.name || 'Unknown Set'}</span>
            <span class="tcg-card-id">${card.number || ''}</span>
        </div>
    `;
    
    // Add a preview of attacks/abilities if present
    if (card.attacks && card.attacks.length > 0) {
        const attacksPreview = document.createElement('div');
        attacksPreview.className = 'tcg-attacks-preview';
        attacksPreview.innerHTML = `
            <div class="tcg-preview-label">Attacks:</div>
            <div class="tcg-preview-content">
                ${card.attacks.map(attack => attack.name).join(', ')}
            </div>
        `;
        detailsElement.appendChild(attacksPreview);
    }
    
    if (card.abilities && card.abilities.length > 0) {
        const abilitiesPreview = document.createElement('div');
        abilitiesPreview.className = 'tcg-abilities-preview';
        abilitiesPreview.innerHTML = `
            <div class="tcg-preview-label">Abilities:</div>
            <div class="tcg-preview-content">
                ${card.abilities.map(ability => ability.name).join(', ')}
            </div>
        `;
        detailsElement.appendChild(abilitiesPreview);
    }
    
    cardElement.appendChild(imageElement);
    cardElement.appendChild(detailsElement);
    
    return cardElement;
};

window.DexApp.TCG.toggleSetCollapse = function(headerElement) {
    const contentElement = headerElement.nextElementSibling;
    const iconElement = headerElement.querySelector('i');
    const isCollapsed = headerElement.classList.toggle('collapsed');
    contentElement.classList.toggle('hidden', isCollapsed);
    iconElement.classList.toggle('fa-chevron-down', !isCollapsed);
    iconElement.classList.toggle('fa-chevron-right', isCollapsed);
};

// --- TCG Lightbox ---
window.DexApp.TCG.openTcgLightbox = function(cardId) {
    const card = this.state.currentTcgCards.find(c => c.id === cardId);
    if (!card) return;
    
    this.elements.lightboxCardName.textContent = card.name;
    
    this.elements.lightboxCardImage.src = card.images?.large || 
                                          card.images?.small || 
                                          'https://placehold.co/300x420/cccccc/ffffff?text=No+Large+Img';
                                          
    this.elements.lightboxCardImage.alt = `Large image of ${card.name}`;
    
    this.elements.lightboxCardImage.onerror = () => {
        this.elements.lightboxCardImage.src = 'https://placehold.co/300x420/cccccc/ffffff?text=No+Large+Img';
    };
    
    // Build detailed card info
    let detailsHtml = `
        <p><strong>Set:</strong> ${card.set?.name || 'N/A'} (${card.set?.series || 'N/A'})</p>
        <p><strong>Card #:</strong> ${card.number || 'N/A'} / ${card.set?.printedTotal || card.set?.total || 'N/A'}</p>
    `;
    
    if (card.hp) detailsHtml += `<p><strong>HP:</strong> ${card.hp}</p>`;
    if (card.types?.length) detailsHtml += `<p><strong>Type(s):</strong> ${card.types.join(', ')}</p>`;
    if (card.rarity) detailsHtml += `<p><strong>Rarity:</strong> ${card.rarity}</p>`;
    if (card.artist) detailsHtml += `<p><strong>Artist:</strong> ${card.artist}</p>`;
    
    // Display attacks
    if (card.attacks?.length) {
        detailsHtml += `<h4 class="lightbox-detail-title">Attacks</h4>`;
        card.attacks.forEach(attack => {
            let costHtml = attack.cost?.map(type => 
                `<span class="tcg-cost-icon tcg-type-${type}" title="${type}"></span>`
            ).join('') || '(No Cost)';
            
            detailsHtml += `
                <div class="lightbox-attack">
                    <p>
                        <strong>${attack.name}</strong> ${costHtml} 
                        ${attack.damage ? `<span class="float-right font-bold">${attack.damage}</span>` : ''}
                    </p>
                    ${attack.text ? `<p class="text-xs text-[var(--color-text-secondary)] mt-1">${attack.text}</p>` : ''}
                </div>
            `;
        });
    }
    
    // Display abilities
    if (card.abilities?.length) {
        detailsHtml += `<h4 class="lightbox-detail-title">Abilities</h4>`;
        card.abilities.forEach(ability => {
            detailsHtml += `
                <div class="lightbox-ability">
                    <p><strong>${ability.name}</strong> (${ability.type})</p>
                    ${ability.text ? `<p class="text-xs text-[var(--color-text-secondary)] mt-1">${ability.text}</p>` : ''}
                </div>
            `;
        });
    }
    
    // Display combat info
    detailsHtml += `<h4 class="lightbox-detail-title">Combat Info</h4><div class="grid grid-cols-3 gap-2 text-xs">`;
    detailsHtml += `<div><strong>Weakness:</strong> ${card.weaknesses ? card.weaknesses.map(w => `${w.type} ${w.value}`).join(', ') : 'None'}</div>`;
    detailsHtml += `<div><strong>Resistance:</strong> ${card.resistances ? card.resistances.map(r => `${r.type} ${r.value}`).join(', ') : 'None'}</div>`;
    detailsHtml += `<div><strong>Retreat:</strong> ${card.retreatCost ? card.retreatCost.join(', ') : '0'}</div></div>`;
    
    // Display legality info if available
    if (card.legalities) {
        detailsHtml += `<h4 class="lightbox-detail-title">Legality Info</h4><div class="grid grid-cols-3 gap-2 text-xs">`;
        for (const [format, status] of Object.entries(card.legalities)) {
            const statusClass = status === 'Legal' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]';
            detailsHtml += `<div><strong>${format}:</strong> <span class="${statusClass}">${status}</span></div>`;
        }
        detailsHtml += `</div>`;
    }
    
    this.elements.lightboxCardDetails.innerHTML = detailsHtml;
    this.elements.tcgLightbox.classList.add('visible');
    document.body.style.overflow = 'hidden';
};

window.DexApp.TCG.closeTcgLightbox = function() {
    this.elements.tcgLightbox.classList.remove('visible');
    document.body.style.overflow = '';
    this.elements.lightboxCardImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    this.elements.lightboxCardDetails.innerHTML = '<p>Loading details...</p>';
};

window.DexApp.TCG.showDetailTcgError = function(message) {
    if (this.elements.detailTcgErrorText) {
        this.elements.detailTcgErrorText.textContent = message;
    }
    
    if (this.elements.detailTcgErrorDiv) {
        this.elements.detailTcgErrorDiv.classList.remove('hidden');
    }
};
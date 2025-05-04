// dex/js/modules/lightbox.js
// Lightbox functionality for the Pokédex application

// Create Lightbox namespace
window.DexApp = window.DexApp || {};
window.DexApp.Lightbox = {};

// State variables
window.DexApp.Lightbox.state = {
    activeDetailLightbox: false,
    activeTcgLightbox: false,
    activeGeneratorLightbox: false
};

// DOM Elements
window.DexApp.Lightbox.elements = {
    // Detail Lightbox
    detailLightbox: document.getElementById('detail-view-lightbox'),
    detailCloseButton: document.getElementById('detail-close-button'),
    
    // TCG Lightbox
    tcgLightbox: document.getElementById('tcg-lightbox'),
    tcgLightboxCloseButton: document.getElementById('lightbox-close'),
    
    // Generator Lightbox
    generatorOverlay: document.getElementById('generator-overlay'),
    generatorCloseButton: document.getElementById('generator-close-button'),
    randomButton: document.getElementById('random-pokemon-button')
};

// --- Initialize Lightbox ---
window.DexApp.Lightbox.initialize = function() {
    console.log("Initializing Lightbox module...");
    this.setupEventListeners();
    console.log("Lightbox module initialized.");
};

window.DexApp.Lightbox.setupEventListeners = function() {
    const elements = this.elements;
    
    // Detail Lightbox events
    if (elements.detailLightbox && elements.detailCloseButton) {
        elements.detailCloseButton.addEventListener('click', () => this.closeDetailLightbox());
        elements.detailLightbox.addEventListener('click', (event) => {
            if (event.target === elements.detailLightbox) this.closeDetailLightbox();
        });
    } else {
        console.warn("Detail lightbox elements not found");
    }
    
    // TCG Lightbox events
    if (elements.tcgLightbox && elements.tcgLightboxCloseButton) {
        elements.tcgLightboxCloseButton.addEventListener('click', () => this.closeTcgLightbox());
        elements.tcgLightbox.addEventListener('click', (event) => {
            if (event.target === elements.tcgLightbox) this.closeTcgLightbox();
        });
    } else {
        console.warn("TCG lightbox elements not found");
    }
    
    // Generator Lightbox events
    if (elements.generatorOverlay && elements.generatorCloseButton) {
        elements.generatorCloseButton.addEventListener('click', () => this.closeGeneratorLightbox());
        elements.generatorOverlay.addEventListener('click', (event) => {
            if (event.target === elements.generatorOverlay) this.closeGeneratorLightbox();
        });
    } else {
        console.warn("Generator lightbox elements not found");
    }
    
    // Random button for generator
    if (elements.randomButton && elements.generatorOverlay) {
        elements.randomButton.addEventListener('click', () => this.openGeneratorLightbox());
    } else {
        console.warn("Random button element not found");
    }
};

// --- Detail Lightbox Functions ---
window.DexApp.Lightbox.openDetailLightbox = function() {
    const lightbox = this.elements.detailLightbox;
    if (!lightbox) return;
    
    console.log("Opening detail lightbox...");
    
    lightbox.classList.remove('hidden');
    requestAnimationFrame(() => {
        lightbox.classList.add('visible');
    });
    
    document.body.style.overflow = 'hidden';
    this.state.activeDetailLightbox = true;
};

window.DexApp.Lightbox.closeDetailLightbox = function() {
    const lightbox = this.elements.detailLightbox;
    if (!lightbox) return;
    
    lightbox.classList.remove('visible');
    
    const handleTransitionEnd = (event) => {
        if (event.target === lightbox && !lightbox.classList.contains('visible')) {
            lightbox.classList.add('hidden');
            lightbox.removeEventListener('transitionend', handleTransitionEnd);
        }
    };
    
    lightbox.addEventListener('transitionend', handleTransitionEnd);
    
    // Fallback in case transition doesn't fire
    setTimeout(() => {
        if (!lightbox.classList.contains('visible')) {
            lightbox.classList.add('hidden');
        }
    }, 500);
    
    document.body.style.overflow = '';
    this.state.activeDetailLightbox = false;
};

// --- TCG Lightbox Functions ---
window.DexApp.Lightbox.openTcgLightbox = function(cardData) {
    const lightbox = this.elements.tcgLightbox;
    if (!lightbox) return;
    
    const lightboxCardName = document.getElementById('lightbox-card-name');
    const lightboxCardImage = document.getElementById('lightbox-card-image');
    const lightboxCardDetails = document.getElementById('lightbox-card-details');
    
    if (lightboxCardName) lightboxCardName.textContent = cardData.name || 'Card Details';
    
    if (lightboxCardImage) {
        lightboxCardImage.src = cardData.images?.large || 
                               cardData.images?.small || 
                               'https://placehold.co/300x420/cccccc/ffffff?text=No+Large+Img';
        lightboxCardImage.alt = `Large image of ${cardData.name || 'TCG card'}`;
        
        lightboxCardImage.onerror = () => {
            lightboxCardImage.src = 'https://placehold.co/300x420/cccccc/ffffff?text=No+Large+Img';
        };
    }
    
    if (lightboxCardDetails) {
        let detailsHtml = this.generateCardDetailsHtml(cardData);
        lightboxCardDetails.innerHTML = detailsHtml;
    }
    
    lightbox.classList.add('visible');
    document.body.style.overflow = 'hidden';
    this.state.activeTcgLightbox = true;
};

window.DexApp.Lightbox.closeTcgLightbox = function() {
    const lightbox = this.elements.tcgLightbox;
    if (!lightbox) return;
    
    lightbox.classList.remove('visible');
    document.body.style.overflow = '';
    
    // Reset image to prevent flicker on next open
    const lightboxCardImage = document.getElementById('lightbox-card-image');
    if (lightboxCardImage) {
        lightboxCardImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    }
    
    // Reset details
    const lightboxCardDetails = document.getElementById('lightbox-card-details');
    if (lightboxCardDetails) {
        lightboxCardDetails.innerHTML = '<p>Loading details...</p>';
    }
    
    this.state.activeTcgLightbox = false;
};

window.DexApp.Lightbox.generateCardDetailsHtml = function(card) {
    if (!card) return '<p>No card data available</p>';
    
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
    detailsHtml += `<div><strong>Retreat:</strong> ${card.retreatCost ? card.retreatCost.length : '0'}</div></div>`;
    
    // Display legality info if available
    if (card.legalities) {
        detailsHtml += `<h4 class="lightbox-detail-title">Legality Info</h4><div class="grid grid-cols-3 gap-2 text-xs">`;
        for (const [format, status] of Object.entries(card.legalities)) {
            const statusClass = status === 'Legal' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]';
            detailsHtml += `<div><strong>${format}:</strong> <span class="${statusClass}">${status}</span></div>`;
        }
        detailsHtml += `</div>`;
    }
    
    return detailsHtml;
};

// --- Generator Lightbox Functions ---
window.DexApp.Lightbox.openGeneratorLightbox = function() {
    const overlay = this.elements.generatorOverlay;
    if (!overlay) return;
    
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => { 
        overlay.classList.add('visible'); 
    });
    
    document.body.style.overflow = 'hidden';
    this.state.activeGeneratorLightbox = true;
    
    // Trigger generator activation if needed
    if (window.DexApp.Generator && typeof window.DexApp.Generator.activate === 'function') {
        window.DexApp.Generator.activate();
    }
};

window.DexApp.Lightbox.closeGeneratorLightbox = function() {
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
    this.state.activeGeneratorLightbox = false;
};
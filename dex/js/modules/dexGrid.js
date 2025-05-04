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
    const image = cachedData?.sprite || pokemon.url?.replace('pokemon', 'pokemon-form') || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
    const types = cachedData?.types || [];
    const hasVariants = cachedData?.hasVariants || false;

    // Set dynamic CSS variables for styling
    let color1 = 'var(--color-bg-light-panel)', color2 = 'var(--color-bg-panel)';
    let primaryTypeColor = 'var(--color-accent)';
    if (types.length > 0) { 
        const typeName1 = types[0].toLowerCase(); 
        primaryTypeColor = `var(--type-${typeName1}, var(--color-accent))`; 
        color1 = `var(--type-${typeName1}, var(--color-secondary))`; 
        color2 = types.length > 1 ? `var(--type-${types[1].toLowerCase()}, var(--color-primary))` : `var(--type-${typeName1}-light, var(--color-primary))`; 
    }
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
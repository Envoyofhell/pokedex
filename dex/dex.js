// dex/dex.js - Logic for the Interactive Pokedex Viewer

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const TCG_API_KEY = 'YOUR_API_KEY'; // <<< --- PUT YOUR POKEMON TCG API KEY HERE --- >>>
    const MAX_MOVES_DISPLAY = 50;
    const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
    const GENERATION_RANGES = {
        1: { limit: 151, offset: 0 }, 2: { limit: 100, offset: 151 }, 3: { limit: 135, offset: 251 },
        4: { limit: 107, offset: 386 }, 5: { limit: 156, offset: 493 }, 6: { limit: 72, offset: 649 },
        7: { limit: 88, offset: 721 }, 8: { limit: 96, offset: 809 }, 9: { limit: 120, offset: 905 },
        all: { limit: 1500, offset: 0 }
    };
    const POKEMON_TYPES = [ 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy' ];
    const MAX_POKEMON_ID = 1025; // Approximate upper limit for random generation

    // --- State Variables ---
    let currentPokemonData = null; let currentSpeciesData = null; let currentFlavorTextEntries = [];
    let currentStats = []; let currentMoves = []; let currentTcgCards = []; let filteredTcgCards = [];
    let isShiny = false; let isFemale = false;
    let currentStatSort = 'default'; let activeSubTab = 'summary-content';
    let currentGeneration = 1; let currentTypeFilter = 'all'; let currentGridSort = 'id';
    let fullPokemonListCache = {}; let detailedPokemonCache = {}; let typeDataCache = {};
    let allPokemonSpeciesList = null;
    let currentVarieties = [];
    let currentMovesPage = 1;
    const movesPerPage = MAX_MOVES_DISPLAY;
    let currentAudio = null; // For Pokemon cry

    // --- DOM Elements ---
    const initialLoadingOverlay = document.getElementById('initial-loading-overlay');
    const appContainer = document.getElementById('app-container');
    const dexGridView = document.getElementById('dex-grid-view');
    const detailViewLightbox = document.getElementById('detail-view-lightbox');
    const detailCloseButton = document.getElementById('detail-close-button');
    const generationTabsContainer = document.getElementById('generation-tabs');
    const typeFilterButtonsContainer = document.getElementById('type-filter-buttons');
    const gridSortButtonsContainer = document.getElementById('grid-sort-buttons'); // Grid sort buttons
    const mainSearchInput = document.getElementById('pokemon-search-main');
    const mainSearchButton = document.getElementById('search-button-main');
    const randomPokemonButton = document.getElementById('random-pokemon-button');
    const randomGeneratorLinkButton = document.getElementById('random-generator-link'); // Link button
    const pokedexGrid = document.getElementById('pokedex-grid');
    const dexGridLoader = document.getElementById('dex-grid-loader');
    // Detail View Elements
    const detailLoader = document.getElementById('detail-loader');
    const detailErrorMessageDiv = document.getElementById('detail-error-message');
    const detailErrorText = document.getElementById('detail-error-text');
    const detailPokemonInfoDiv = document.getElementById('pokemon-info');
    const detailContentSection = document.getElementById('content-section');
    const detailVisualSection = document.getElementById('visual-section');
    const detailPokemonNameDisplay = document.getElementById('pokemon-name-display');
    const detailPokemonIdSpan = document.getElementById('pokemon-id');
    const detailPlayCryButton = document.getElementById('play-cry-button');
    const detailVariantSelectorContainer = document.getElementById('variant-selector-container');
    const detailVariantSelect = document.getElementById('variant-select');
    const detailGameVersionSelect = document.getElementById('game-version-select');
    const detailPokemonDescriptionP = document.getElementById('pokemon-description');
    const detailPokemonHeightP = document.getElementById('pokemon-height');
    const detailPokemonWeightP = document.getElementById('pokemon-weight');
    const detailVariantInfoSection = document.getElementById('variant-info-section');
    const detailStatSortButtonsContainer = document.getElementById('stat-sort-buttons');
    const detailStatsContainer = document.getElementById('stats-container');
    const detailAbilitiesList = document.getElementById('abilities-list');
    const detailMovesList = document.getElementById('moves-list');
    const detailMovesPagination = document.getElementById('moves-pagination');
    const detailPrevMovePageButton = document.getElementById('prev-move-page');
    const detailNextMovePageButton = document.getElementById('next-move-page');
    const detailMovePageInfo = document.getElementById('move-page-info');
    const detailEvolutionsContainer = document.getElementById('evolution-chain-container');
    const detailMatchupsContainer = document.getElementById('type-matchups-container');
    const detailPokemonImage = document.getElementById('pokemon-image');
    const detailPokemonImageContainer = document.getElementById('pokemon-image-container');
    const detailShinyToggleButton = document.getElementById('shiny-toggle');
    const detailGenderToggleButton = document.getElementById('gender-toggle');
    const detailPokemonTypesDiv = document.getElementById('pokemon-types');
    const detailMainTabsContainer = document.getElementById('tabs');
    const detailMainTabButtons = detailMainTabsContainer.querySelectorAll('.tab-button');
    const detailMainTabContents = detailContentSection.querySelectorAll('.tab-content');
    const detailGameInfoTabContainer = document.getElementById('game-info-tab');
    const detailGameInfoTabsContainer = document.getElementById('game-info-tabs');
    const detailSubTabButtons = detailGameInfoTabsContainer.querySelectorAll('.sub-tab-button');
    const detailSubTabContents = detailGameInfoTabContainer.querySelectorAll('.sub-tab-content');
    const detailTcgSearchInput = document.getElementById('tcg-search');
    const detailTcgSearchButton = document.getElementById('tcg-search-button');
    const detailTcgLoader = document.getElementById('tcg-loader');
    const detailTcgErrorDiv = document.getElementById('tcg-error');
    const detailTcgErrorText = document.getElementById('tcg-error-text');
    const detailTcgCardsContainer = document.getElementById('tcg-cards-container');
    // TCG Lightbox Elements
    const tcgLightbox = document.getElementById('tcg-lightbox');
    const lightboxCloseButton = document.getElementById('lightbox-close');
    const lightboxCardName = document.getElementById('lightbox-card-name');
    const lightboxCardImage = document.getElementById('lightbox-card-image');
    const lightboxCardDetails = document.getElementById('lightbox-card-details');

    // --- Stat Name Mapping & Helpers ---
    const statNameMapping = { 'hp': 'HP', 'attack': 'Attack', 'defense': 'Defense', 'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', 'speed': 'Speed' };
    const defaultStatOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const cleanFlavorText = (text) => text ? text.replace(/[\n\f\u00ad]/g, ' ') : '';
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    const formatName = (name) => name ? name.split('-').map(capitalize).join(' ') : '';
    const formatVersionName = (name) => name ? name.split('-').map(capitalize).join(' ') : '';
    const getPokemonIdFromUrl = (url) => { if (!url) return null; const parts = url.split('/').filter(Boolean); const id = parts.pop(); return !isNaN(id) ? parseInt(id, 10) : null; };

    // --- View Switching ---
    function openDetailLightbox() { /* ... (same as before) ... */ console.log("Attempting to open detail lightbox..."); if (!detailViewLightbox) { console.error("Detail lightbox element not found!"); return; } detailViewLightbox.classList.remove('hidden'); requestAnimationFrame(() => { detailViewLightbox.classList.add('visible'); }); document.body.style.overflow = 'hidden'; console.log("Detail lightbox should be visible now."); }
    function closeDetailLightbox() { /* ... (same as before) ... */ if (!detailViewLightbox) return; detailViewLightbox.classList.remove('visible'); const handleTransitionEnd = (event) => { if (event.target === detailViewLightbox && !detailViewLightbox.classList.contains('visible')) { detailViewLightbox.classList.add('hidden'); detailViewLightbox.removeEventListener('transitionend', handleTransitionEnd); } }; detailViewLightbox.addEventListener('transitionend', handleTransitionEnd); setTimeout(() => { if (!detailViewLightbox.classList.contains('visible')) { detailViewLightbox.classList.add('hidden'); } }, 500); document.body.style.overflow = ''; }

    // --- Fetch Functions ---
    async function fetchAllPokemonSpecies() { /* ... (same as before) ... */ if (allPokemonSpeciesList) return allPokemonSpeciesList; console.log("Fetching all Pokémon species list..."); const range = GENERATION_RANGES.all; const url = `${POKEAPI_BASE_URL}/pokemon-species?limit=${range.limit}&offset=${range.offset}`; try { const response = await fetch(url); if (!response.ok) throw new Error('Failed to fetch all species'); const data = await response.json(); allPokemonSpeciesList = data.results.map(species => ({ name: species.name, id: getPokemonIdFromUrl(species.url), url: `${POKEAPI_BASE_URL}/pokemon/${getPokemonIdFromUrl(species.url)}` })).filter(p => p.id !== null).sort((a, b) => a.id - b.id); console.log(`Fetched ${allPokemonSpeciesList.length} species.`); return allPokemonSpeciesList; } catch (error) { console.error("Error fetching all species:", error); showDexGridError("Failed to load full Pokémon list."); return []; } }
    async function fetchGenerationList(genNumber) { /* ... (same as before) ... */ if (genNumber === 'all') return await fetchAllPokemonSpecies(); if (fullPokemonListCache[genNumber]) return fullPokemonListCache[genNumber]; console.log(`Fetching list for Gen ${genNumber}`); const url = `${POKEAPI_BASE_URL}/generation/${genNumber}`; try { const response = await fetch(url); if (!response.ok) throw new Error(`Failed Gen ${genNumber}`); const data = await response.json(); const pokemonList = data.pokemon_species.map(species => ({ name: species.name, id: getPokemonIdFromUrl(species.url), url: `${POKEAPI_BASE_URL}/pokemon/${getPokemonIdFromUrl(species.url)}` })).filter(p => p.id !== null).sort((a, b) => a.id - b.id); fullPokemonListCache[genNumber] = pokemonList; return pokemonList; } catch (error) { console.error(`Error fetching Gen ${genNumber} list:`, error); showDexGridError(`Failed to load Gen ${genNumber}.`); return []; } }
    async function fetchTypeData(typeName) { /* ... (same as before) ... */ if (typeDataCache[typeName]) return typeDataCache[typeName]; console.log(`Fetching Pokémon for type: ${typeName}`); const url = `${POKEAPI_BASE_URL}/type/${typeName}`; try { const response = await fetch(url); if (!response.ok) throw new Error(`Failed type ${typeName}`); const data = await response.json(); const pokemonList = data.pokemon.map(p => ({ name: p.pokemon.name, id: getPokemonIdFromUrl(p.pokemon.url), url: p.pokemon.url })).filter(p => p.id !== null).sort((a, b) => a.id - b.id); typeDataCache[typeName] = pokemonList; return pokemonList; } catch (error) { console.error(`Error fetching type ${typeName}:`, error); showDexGridError(`Failed to load type ${typeName}.`); return []; } }
    async function fetchDetailedPokemonData(identifier) { /* ... (same as before) ... */ const cacheKey = String(identifier).toLowerCase(); if (detailedPokemonCache[cacheKey]) return detailedPokemonCache[cacheKey]; console.log(`Fetching detail for ${identifier}`); const pokemonUrl = `${POKEAPI_BASE_URL}/pokemon/${identifier}`; let speciesUrl = null; try { const tempRes = await fetch(pokemonUrl); if (!tempRes.ok) throw await handleFetchError(tempRes, identifier); const tempData = await tempRes.json(); speciesUrl = tempData.species.url; } catch (e) { console.warn("Could not determine species URL from name alone for variant fetching", e); throw e; } let speciesData = null; let varieties = []; try { const [pokemonRes, speciesRes] = await Promise.all([fetch(pokemonUrl), speciesUrl ? fetch(speciesUrl) : Promise.resolve(null)]); if (!pokemonRes.ok) throw await handleFetchError(pokemonRes, identifier); const pokemonData = await pokemonRes.json(); if (speciesRes && speciesRes.ok) { speciesData = await speciesRes.json(); varieties = speciesData.varieties?.map(v => ({ name: formatName(v.pokemon.name), url: v.pokemon.url, identifier: v.pokemon.name })) || []; } else if (speciesRes) { console.warn(`No species data for ${identifier}: ${speciesRes.statusText}`); } const hasVariants = varieties.length > 1; const hasGenderSprites = pokemonData.sprites.front_female !== null; const combinedData = { id: pokemonData.id, name: pokemonData.name, baseName: speciesData?.name || pokemonData.name, sprite: pokemonData.sprites.other?.home?.front_default || pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default || 'https://placehold.co/96x96/cccccc/ffffff?text=?', types: pokemonData.types.map(t => t.type.name), fullPokemonData: pokemonData, fullSpeciesData: speciesData, hasVariants: hasVariants, hasGenderSprites: hasGenderSprites, varieties: varieties }; detailedPokemonCache[cacheKey] = combinedData; return combinedData; } catch (error) { console.error(`Error fetching detailed data for ${identifier}:`, error); throw error; } }
    async function fetchTcgData(pokemonName) { /* ... (same as before) ... */ detailTcgLoader.classList.remove('hidden'); detailTcgErrorDiv.classList.add('hidden'); detailTcgCardsContainer.innerHTML = ''; currentTcgCards = []; if (TCG_API_KEY === 'YOUR_API_KEY' || !TCG_API_KEY) { showDetailTcgError("TCG API Key missing or invalid."); detailTcgLoader.classList.add('hidden'); return; } const query = `name:"${pokemonName}"`; const tcgUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate,number&pageSize=150`; try { const response = await fetch(tcgUrl, { headers: { 'X-Api-Key': TCG_API_KEY } }); if (!response.ok) throw await handleFetchError(response, `TCG cards for ${pokemonName}`); const tcgData = await response.json(); currentTcgCards = tcgData.data || []; filterAndDisplayTcgData(); detailTcgErrorDiv.classList.add('hidden'); } catch (error) { console.error("Error fetching TCG data:", error); currentTcgCards = []; filterAndDisplayTcgData(); showDetailTcgError(`TCG Fetch Error: ${error.message}`); } finally { detailTcgLoader.classList.add('hidden'); } }
    async function handleFetchError(response, resourceName = 'resource') { /* ... (same as before) ... */ if (response.status === 404) return new Error(`Data for "${resourceName}" not found (404).`); try { const errorData = await response.json(); return new Error(`API Error (${response.status}): ${errorData?.error?.message || response.statusText}`); } catch (e) { return new Error(`API Request Failed (${response.status}): ${response.statusText}`); } }

    // --- Dex Grid Display ---
    async function applyFiltersAndDisplayGrid() {
        dexGridLoader.classList.remove('hidden');
        pokedexGrid.innerHTML = '';

        try {
            let baseList = await fetchGenerationList(currentGeneration);
            if (!baseList || baseList.length === 0) {
                 showDexGridError(`No Pokémon found for Generation ${currentGeneration === 'all' ? 'All' : currentGeneration}.`);
                 return;
            }

            let filteredList = baseList;

            // Apply type filter if selected
            if (currentTypeFilter !== 'all') {
                const typePokemonList = await fetchTypeData(currentTypeFilter);
                const typePokemonIds = new Set(typePokemonList.map(p => p.id));
                filteredList = filteredList.filter(p => typePokemonIds.has(p.id));
            }

            // Apply sorting
            if (currentGridSort === 'name') {
                filteredList.sort((a, b) => a.name.localeCompare(b.name));
            } else { // Default to ID sort
                filteredList.sort((a, b) => a.id - b.id);
            }


             if (filteredList.length === 0) {
                 showDexGridError(`No ${capitalize(currentTypeFilter)} Pokémon found in Generation ${currentGeneration === 'all' ? 'All' : currentGeneration}.`);
             } else {
                 displayDexGrid(filteredList);
             }

        } catch (error) {
            console.error("Error applying filters:", error);
            showDexGridError("An error occurred while filtering Pokémon.");
        } finally {
            dexGridLoader.classList.add('hidden');
        }
    }
    async function displayDexGrid(pokemonList) { /* ... (same as before) ... */ pokedexGrid.innerHTML = ''; if (!pokemonList || pokemonList.length === 0) { return; } const fragment = document.createDocumentFragment(); const initialDetailPromises = pokemonList.slice(0, 15).map(p => fetchDetailedPokemonData(p.id).catch(e => null)); await Promise.allSettled(initialDetailPromises); pokemonList.forEach(pokemon => { const card = createDexGridCard(pokemon); fragment.appendChild(card); }); pokedexGrid.appendChild(fragment); }
    function createDexGridCard(pokemon) { /* Reinstated variant check */ const li = document.createElement('li'); li.className = 'pokedex-grid-card'; li.dataset.pokemonId = pokemon.id; li.dataset.pokemonName = pokemon.name; const cachedData = detailedPokemonCache[String(pokemon.id)] || detailedPokemonCache[pokemon.name]; const name = cachedData?.name ? capitalize(cachedData.name) : capitalize(pokemon.name); const id = cachedData?.id ? String(cachedData.id).padStart(3, '0') : String(pokemon.id).padStart(3, '0'); const image = cachedData?.sprite || 'https://placehold.co/96x96/cccccc/ffffff?text=?'; const types = cachedData?.types || []; const hasVariants = cachedData?.hasVariants || false; let color1 = 'var(--color-bg-panel)', color2 = 'var(--color-bg-light-panel)'; if (types.length === 1) { const typeName = types[0]; color1 = `var(--type-${typeName}, var(--color-secondary))`; color2 = `var(--type-${typeName}-light, var(--color-primary))`; } else if (types.length > 1) { const typeName1 = types[0]; const typeName2 = types[1]; color1 = `var(--type-${typeName1}, var(--color-secondary))`; color2 = `var(--type-${typeName2}, var(--color-primary))`; } li.style.setProperty('--card-gradient-color-1', color1); li.style.setProperty('--card-gradient-color-2', color2); const primaryType = types.length > 0 ? types[0] : 'normal'; li.style.setProperty('--dynamic-type-color', `var(--type-${primaryType}, var(--color-accent))`); li.innerHTML = `<div class="pokemon-card-header">${hasVariants ? '<span class="variant-indicator" title="Has Variants">✨</span>' : ''}<span class="pokemon-card-id">#${id}</span></div><div class="pokemon-card-img-container"><img src="${image}" alt="${name}" class="pokemon-card-image" loading="lazy" onerror="this.src='https://placehold.co/96x96/cccccc/ffffff?text=?'"></div><div class="pokemon-card-info"><h3 class="pokemon-card-name">${name}</h3><div class="pokemon-card-types">${types.map(type => `<span class="pokemon-card-type type-${type}">${type}</span>`).join('')}</div></div>`; li.addEventListener('click', () => { console.log(`Card click registered for: ${pokemon.name || pokemon.id}`); fetchAndDisplayDetailData(pokemon.name || pokemon.id); }); if (!cachedData) { fetchDetailedPokemonData(pokemon.id).then(data => { if (data) { li.querySelector('.pokemon-card-name').textContent = capitalize(data.name); li.querySelector('.pokemon-card-id').textContent = `#${String(data.id).padStart(3, '0')}`; li.querySelector('.pokemon-card-image').src = data.sprite; const typesHtml = data.types.map(type => `<span class="pokemon-card-type type-${type}">${type}</span>`).join(''); li.querySelector('.pokemon-card-types').innerHTML = typesHtml; const cardPrimaryType = data.types.length > 0 ? data.types[0] : 'normal'; let c1 = 'var(--color-bg-panel)', c2 = 'var(--color-bg-light-panel)'; if (data.types.length === 1) { c1 = `var(--type-${cardPrimaryType}, var(--color-secondary))`; c2 = `var(--type-${cardPrimaryType}-light, var(--color-primary))`; } else if (data.types.length > 1) { c1 = `var(--type-${data.types[0]}, var(--color-secondary))`; c2 = `var(--type-${data.types[1]}, var(--color-primary))`; } li.style.setProperty('--card-gradient-color-1', c1); li.style.setProperty('--card-gradient-color-2', c2); li.style.setProperty('--dynamic-type-color', `var(--type-${cardPrimaryType}, var(--color-accent))`); if (data.hasVariants) { const header = li.querySelector('.pokemon-card-header'); if (!header.querySelector('.variant-indicator')) header.insertAdjacentHTML('afterbegin', '<span class="variant-indicator" title="Has Variants">✨</span>'); } } }).catch(error => console.warn(`Failed card update: ${pokemon.name}`, error)); } return li; }

    // --- Detail View Display & Logic ---
    async function fetchAndDisplayDetailData(identifier) {
        openDetailLightbox(); detailLoader.classList.remove('hidden'); detailPokemonInfoDiv.classList.add('hidden'); detailErrorMessageDiv.classList.add('hidden'); resetDetailUIState();
        try { console.log(`Fetching details for lightbox: ${identifier}`); const data = await fetchDetailedPokemonData(identifier); if (!data || !data.fullPokemonData) throw new Error(`Could not retrieve full data for ${identifier}`); console.log("Detailed data fetched:", data); currentPokemonData = data.fullPokemonData; currentSpeciesData = data.fullSpeciesData; currentVarieties = data.varieties || []; processAndDisplayDetailData(data); fetchTcgData(data.baseName || data.name); fetchEvolutionChain(data.fullSpeciesData?.evolution_chain?.url); fetchTypeMatchups(data.fullPokemonData?.types); } catch (error) { console.error("Error fetching detail data:", error); showDetailError(error.message); } finally { detailLoader.classList.add('hidden'); }
    }
    function processAndDisplayDetailData(detailedData) { /* Reinstated variant/gender logic */ if (!detailedData || !detailedData.fullPokemonData) { console.error("Invalid data passed to processAndDisplayDetailData"); showDetailError("Failed to process Pokémon data."); return; } currentPokemonData = detailedData.fullPokemonData; currentSpeciesData = detailedData.fullSpeciesData; isShiny = false; isFemale = false; detailShinyToggleButton.classList.remove('active'); detailGenderToggleButton.classList.add('hidden'); detailGenderToggleButton.classList.remove('active'); currentStats = currentPokemonData.stats.filter(si => statNameMapping[si.stat.name]).map(si => ({ name: si.stat.name, displayName: statNameMapping[si.stat.name], value: si.base_stat })); currentStatSort = 'default'; currentMoves = currentPokemonData.moves.flatMap(moveInfo => moveInfo.version_group_details.map(detail => ({ name: moveInfo.move.name.replace('-', ' '), level: detail.move_learn_method.name === 'level-up' ? detail.level_learned_at : null }))).filter(move => move.level !== null && move.level > 0).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)).filter((move, index, self) => index === self.findIndex((m) => (m.name === move.name && m.level === move.level))); /* Removed slice */ currentFlavorTextEntries = []; if (currentSpeciesData?.flavor_text_entries) { const seenVersions = new Set(); currentFlavorTextEntries = currentSpeciesData.flavor_text_entries.filter(entry => entry.language.name === 'en').map(entry => ({ version: formatVersionName(entry.version.name), text: cleanFlavorText(entry.flavor_text) })).filter(entry => { if (!seenVersions.has(entry.version)) { seenVersions.add(entry.version); return true; } return false; }).sort((a, b) => a.version.localeCompare(b.version)); } populateVariantSelector(detailedData.varieties || [], currentPokemonData.name); detailVariantSelectorContainer.classList.toggle('hidden', !detailedData.hasVariants); updateDetailVisualSection(detailedData.hasGenderSprites); updateDetailGameInfoTab(detailedData.hasVariants); detailPokemonInfoDiv.classList.remove('hidden'); detailErrorMessageDiv.classList.add('hidden'); switchTab(detailMainTabsContainer.querySelector('.tab-button.active') || detailMainTabButtons[0]); switchSubTab(detailGameInfoTabsContainer.querySelector('.sub-tab-button.active') || detailSubTabButtons[0]); playPokemonCry(); /* Try to play cry */ }
    function populateVariantSelector(varieties, currentFormIdentifier) { /* Reinstated */ detailVariantSelect.innerHTML = ''; if (!varieties || varieties.length <= 1) { detailVariantSelectorContainer.classList.add('hidden'); return; } varieties.forEach(variant => { const option = document.createElement('option'); option.value = variant.identifier; option.textContent = variant.name; if (variant.identifier === currentFormIdentifier) { option.selected = true; } detailVariantSelect.appendChild(option); }); detailVariantSelectorContainer.classList.remove('hidden'); }
    function updateDetailVisualSection(hasGenderSprites) { /* Reinstated gender toggle logic */ if (!currentPokemonData) return; const types = currentPokemonData.types; let color1 = 'var(--color-secondary)'; let color2 = 'var(--color-primary)'; if (types.length === 1) { const typeName = types[0].type.name; color1 = `var(--type-${typeName}, var(--color-secondary))`; color2 = `var(--type-${typeName}-light, var(--color-primary))`; } else if (types.length > 1) { const typeName1 = types[0].type.name; const typeName2 = types[1].type.name; color1 = `var(--type-${typeName1}, var(--color-secondary))`; color2 = `var(--type-${typeName2}, var(--color-primary))`; } document.documentElement.style.setProperty('--gradient-color-1', color1); document.documentElement.style.setProperty('--gradient-color-2', color2); document.documentElement.style.setProperty('--dynamic-type-color', color1); document.documentElement.style.setProperty('--dynamic-type-color-light', color2); updateActiveTabColor(); updateActiveSubTabColor(); updateStatSortButtons(); detailGenderToggleButton.classList.toggle('hidden', !hasGenderSprites); updatePokemonImage(); detailPokemonTypesDiv.innerHTML = ''; types.forEach(typeInfo => { const typeName = typeInfo.type.name; const typeColor = `var(--type-${typeName}, var(--color-text-secondary))`; const typeBadge = document.createElement('span'); typeBadge.className = 'type-badge'; typeBadge.textContent = typeName; typeBadge.style.backgroundColor = typeColor; detailPokemonTypesDiv.appendChild(typeBadge); }); detailPlayCryButton.classList.toggle('hidden', !currentPokemonData.cries?.latest && !currentPokemonData.cries?.legacy); /* Show/hide cry button */ }
    function updateDetailGameInfoTab(hasVariants) { /* Reinstated variant info logic */ if (!currentPokemonData) return; detailPokemonNameDisplay.textContent = formatName(currentPokemonData.name); detailPokemonIdSpan.textContent = `#${currentPokemonData.id.toString().padStart(3, '0')}`; detailPokemonHeightP.textContent = `${currentPokemonData.height / 10} m`; detailPokemonWeightP.textContent = `${currentPokemonData.weight / 10} kg`; detailVariantInfoSection.classList.toggle('hidden', !hasVariants); populateVersionSelector(); updateDescription(); renderActiveSubTabContent(); }
    function populateVersionSelector() { /* ... (same as before) ... */ detailGameVersionSelect.innerHTML = ''; if (currentFlavorTextEntries.length > 0) { currentFlavorTextEntries.forEach((entry, index) => { const option = document.createElement('option'); option.value = index; option.textContent = entry.version; detailGameVersionSelect.appendChild(option); }); detailGameVersionSelect.disabled = false; } else { const option = document.createElement('option'); option.textContent = 'No entries'; detailGameVersionSelect.appendChild(option); detailGameVersionSelect.disabled = true; } }
    function updateDescription() { /* ... (same as before) ... */ const selectedIndex = detailGameVersionSelect.value; if (selectedIndex !== null && currentFlavorTextEntries[selectedIndex]) { detailPokemonDescriptionP.textContent = currentFlavorTextEntries[selectedIndex].text; } else if (currentFlavorTextEntries.length > 0) { detailPokemonDescriptionP.textContent = currentFlavorTextEntries[0].text; detailGameVersionSelect.value = 0; } else { detailPokemonDescriptionP.textContent = 'No description available.'; } }
    function renderStats() { /* ... (same as before) ... */ detailStatsContainer.innerHTML = ''; let statsToRender = [...currentStats]; switch (currentStatSort) { case 'name': statsToRender.sort((a, b) => a.displayName.localeCompare(b.displayName)); break; case 'asc': statsToRender.sort((a, b) => a.value - b.value); break; case 'desc': statsToRender.sort((a, b) => b.value - a.value); break; case 'default': statsToRender.sort((a, b) => defaultStatOrder.indexOf(a.name) - defaultStatOrder.indexOf(b.name)); break; } const statColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-accent)'; statsToRender.forEach(stat => { const statMax = 255; const statPercentage = Math.max(1, (stat.value / statMax) * 100); const statElement = document.createElement('div'); statElement.className = 'flex items-center w-full'; statElement.innerHTML = `<span class="text-xs font-medium text-[var(--color-text-secondary)] w-1/4">${stat.displayName}</span><span class="text-sm font-bold text-[var(--color-text-primary)] w-[50px] text-right mr-2">${stat.value}</span><div class="stat-bar-bg flex-grow h-2.5 rounded-full"><div class="stat-bar h-2.5 rounded-full" style="width: 0%; background-color: ${statColor};"></div></div>`; detailStatsContainer.appendChild(statElement); setTimeout(() => { const bar = statElement.querySelector('.stat-bar'); if(bar) bar.style.width = `${statPercentage}%`; }, 50); }); }
    function renderAbilities() { /* ... (same as before) ... */ detailAbilitiesList.innerHTML = ''; if (currentPokemonData.abilities.length > 0) { currentPokemonData.abilities.forEach(abilityInfo => { const abilityItem = document.createElement('li'); abilityItem.textContent = abilityInfo.ability.name.replace('-', ' '); if (abilityInfo.is_hidden) abilityItem.innerHTML += ' <span class="italic">(Hidden)</span>'; detailAbilitiesList.appendChild(abilityItem); }); } else { detailAbilitiesList.innerHTML = '<li class="italic text-[var(--color-text-secondary)]">No abilities listed.</li>'; } }
    function renderMoves() { /* ... (same as before) ... */ detailMovesList.innerHTML = ''; if (!currentMoves || currentMoves.length === 0) { detailMovesList.innerHTML = '<li class="italic text-[var(--color-text-secondary)]">No level-up moves found.</li>'; if (detailMovesPagination) detailMovesPagination.classList.add('hidden'); return; } const totalPages = Math.ceil(currentMoves.length / movesPerPage); currentMovesPage = Math.max(1, Math.min(currentMovesPage, totalPages)); const startIndex = (currentMovesPage - 1) * movesPerPage; const endIndex = startIndex + movesPerPage; const movesToDisplay = currentMoves.slice(startIndex, endIndex); movesToDisplay.forEach(move => { const moveItem = document.createElement('li'); moveItem.textContent = `Lv ${move.level}: ${move.name}`; detailMovesList.appendChild(moveItem); }); if (detailMovesPagination) { if (totalPages > 1) { if (detailPrevMovePageButton) detailPrevMovePageButton.disabled = currentMovesPage === 1; if (detailNextMovePageButton) detailNextMovePageButton.disabled = currentMovesPage === totalPages; if (detailMovePageInfo) detailMovePageInfo.textContent = `Page ${currentMovesPage} of ${totalPages}`; detailMovesPagination.classList.remove('hidden'); } else { detailMovesPagination.classList.add('hidden'); } } }
    function renderActiveSubTabContent() { /* Added evolution/matchup calls */ switch(activeSubTab) { case 'stats-content': renderStats(); hideMovesPagination(); break; case 'abilities-content': renderAbilities(); hideMovesPagination(); break; case 'moves-content': currentMovesPage = 1; renderMoves(); break; case 'evolutions-content': fetchEvolutionChain(currentSpeciesData?.evolution_chain?.url); hideMovesPagination(); break; case 'matchups-content': fetchTypeMatchups(currentPokemonData?.types); hideMovesPagination(); break; case 'summary-content': default: hideMovesPagination(); break; } }
    function hideMovesPagination() { if (detailMovesPagination) detailMovesPagination.classList.add('hidden'); }

    // --- New Features: Cry, Evolution, Matchups ---
    function playPokemonCry() {
        if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; } // Stop previous cry
        const cryUrl = currentPokemonData?.cries?.latest || currentPokemonData?.cries?.legacy;
        if (cryUrl) {
            try {
                currentAudio = new Audio(cryUrl);
                currentAudio.play().catch(e => console.error("Error playing cry:", e));
            } catch (e) {
                console.error("Error creating Audio object:", e);
            }
        } else {
            console.warn("No cry available for this Pokémon.");
            // Optionally disable the button here if needed
        }
    }

    async function fetchEvolutionChain(url) {
        if (!url) { detailEvolutionsContainer.innerHTML = '<p class="italic text-[var(--color-text-secondary)]">Evolution chain data not available.</p>'; return; }
        detailEvolutionsContainer.innerHTML = '<div class="spinner spinner-sm mx-auto my-4"></div><p class="text-center italic text-[var(--color-text-secondary)]">Loading evolution chain...</p>'; // Show loader
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch evolution chain');
            const data = await response.json();
            renderEvolutionChain(data.chain);
        } catch (error) {
            console.error("Error fetching evolution chain:", error);
            detailEvolutionsContainer.innerHTML = '<p class="text-center text-[var(--color-error)]">Could not load evolution chain.</p>';
        }
    }

    function renderEvolutionChain(chainData) {
        detailEvolutionsContainer.innerHTML = ''; // Clear loader/previous
        const processStage = (stage) => {
            const stageDiv = document.createElement('div');
            stageDiv.className = 'evolution-stage';
            const pokemonId = getPokemonIdFromUrl(stage.species.url);
            const cachedDetail = detailedPokemonCache[String(pokemonId)] || detailedPokemonCache[stage.species.name];
            const sprite = cachedDetail?.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${pokemonId}.png`; // Fallback sprite URL

            stageDiv.innerHTML = `
                <img src="${sprite}" alt="${formatName(stage.species.name)}" loading="lazy" onerror="this.src='https://placehold.co/48x48/cccccc/ffffff?text=?'">
                <div class="evolution-details">
                    <p class="pokemon-name">${formatName(stage.species.name)} (#${String(pokemonId).padStart(3, '0')})</p>
                    ${stage.evolution_details.length > 0 ? `<p class="trigger">(${formatEvolutionTrigger(stage.evolution_details[0])})</p>` : ''}
                </div>
            `;
             stageDiv.addEventListener('click', () => {
                 // Fetch details for the clicked evolution stage if it's not the current one
                 if (currentPokemonData?.id !== pokemonId) {
                     fetchAndDisplayDetailData(pokemonId);
                 }
             });
            detailEvolutionsContainer.appendChild(stageDiv);

            if (stage.evolves_to.length > 0) {
                // Add arrow(s) if there are further evolutions
                const arrowDiv = document.createElement('div');
                arrowDiv.className = 'evolution-arrow';
                arrowDiv.innerHTML = '<i class="fas fa-arrow-down"></i>';
                detailEvolutionsContainer.appendChild(arrowDiv);

                // Process next stage(s) - handle branching evolutions
                if (stage.evolves_to.length === 1) {
                    processStage(stage.evolves_to[0]);
                } else {
                    // If branching, create a container for the branches
                    const branchContainer = document.createElement('div');
                    branchContainer.style.display = 'flex'; // Basic horizontal layout for branches
                    branchContainer.style.gap = '1rem';
                    branchContainer.style.justifyContent = 'center';
                    stage.evolves_to.forEach(branch => {
                        const branchDiv = document.createElement('div');
                        // Recursively process each branch - need to handle layout better for complex branches
                        processStageRecursive(branch, branchDiv);
                        branchContainer.appendChild(branchDiv);
                    });
                    detailEvolutionsContainer.appendChild(branchContainer);
                }
            }
        };
         // Helper for recursive processing in case of branches within branches (though rare)
         const processStageRecursive = (stage, container) => {
             const stageDiv = document.createElement('div');
             stageDiv.className = 'evolution-stage'; // Apply same styling
             const pokemonId = getPokemonIdFromUrl(stage.species.url);
             const cachedDetail = detailedPokemonCache[String(pokemonId)] || detailedPokemonCache[stage.species.name];
             const sprite = cachedDetail?.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${pokemonId}.png`;

             stageDiv.innerHTML = `
                 <img src="${sprite}" alt="${formatName(stage.species.name)}" loading="lazy" onerror="this.src='https://placehold.co/48x48/cccccc/ffffff?text=?'">
                 <div class="evolution-details">
                     <p class="pokemon-name">${formatName(stage.species.name)} (#${String(pokemonId).padStart(3, '0')})</p>
                     ${stage.evolution_details.length > 0 ? `<p class="trigger">(${formatEvolutionTrigger(stage.evolution_details[0])})</p>` : ''}
                 </div>`;
             stageDiv.addEventListener('click', () => { if (currentPokemonData?.id !== pokemonId) fetchAndDisplayDetailData(pokemonId); });
             container.appendChild(stageDiv);

             if (stage.evolves_to.length > 0) {
                 const arrowDiv = document.createElement('div');
                 arrowDiv.className = 'evolution-arrow';
                 arrowDiv.innerHTML = '<i class="fas fa-arrow-down"></i>';
                 container.appendChild(arrowDiv);
                 stage.evolves_to.forEach(nextStage => processStageRecursive(nextStage, container)); // Continue down the chain
             }
         };


        processStage(chainData); // Start processing from the root
    }

    function formatEvolutionTrigger(details) {
        if (!details) return '';
        let trigger = formatName(details.trigger?.name);
        if (details.item) trigger += ` w/ ${formatName(details.item.name)}`;
        if (details.held_item) trigger += ` holding ${formatName(details.held_item.name)}`;
        if (details.known_move) trigger += ` knowing ${formatName(details.known_move.name)}`;
        if (details.known_move_type) trigger += ` knowing ${formatName(details.known_move_type.name)} move`;
        if (details.location) trigger += ` at ${formatName(details.location.name)}`;
        if (details.min_affection) trigger += ` w/ ${details.min_affection} affection`;
        if (details.min_beauty) trigger += ` w/ ${details.min_beauty} beauty`;
        if (details.min_happiness) trigger += ` w/ ${details.min_happiness} happiness`;
        if (details.min_level) trigger += ` at Lv ${details.min_level}`;
        if (details.needs_overworld_rain) trigger += ` in rain`;
        if (details.party_species) trigger += ` w/ ${formatName(details.party_species.name)} in party`;
        if (details.party_type) trigger += ` w/ ${formatName(details.party_type.name)}-type in party`;
        if (details.relative_physical_stats !== null) {
            trigger += details.relative_physical_stats > 0 ? ' (Atk > Def)' : details.relative_physical_stats < 0 ? ' (Atk < Def)' : ' (Atk = Def)';
        }
        if (details.time_of_day) trigger += ` at ${details.time_of_day}`;
        if (details.trade_species) trigger += ` when traded for ${formatName(details.trade_species.name)}`;
        if (details.turn_upside_down) trigger += ` turning console upside down`;
        return trigger;
    }

    async function fetchTypeMatchups(types) {
        if (!types || types.length === 0) { detailMatchupsContainer.innerHTML = '<p class="italic text-[var(--color-text-secondary)]">No type data available.</p>'; return; }
        detailMatchupsContainer.innerHTML = '<div class="spinner spinner-sm mx-auto my-4"></div><p class="text-center italic text-[var(--color-text-secondary)]">Loading matchups...</p>';

        const typePromises = types.map(typeInfo => fetch(`${POKEAPI_BASE_URL}/type/${typeInfo.type.name}`).then(res => res.ok ? res.json() : Promise.reject(`Failed type: ${typeInfo.type.name}`)));

        try {
            const typeDataArray = await Promise.all(typePromises);
            const relations = {
                double_damage_from: new Set(),
                half_damage_from: new Set(),
                no_damage_from: new Set(),
                double_damage_to: new Set(),
                half_damage_to: new Set(),
                no_damage_to: new Set()
            };

            // Aggregate relations from all types
            typeDataArray.forEach(typeData => {
                typeData.damage_relations.double_damage_from.forEach(t => relations.double_damage_from.add(t.name));
                typeData.damage_relations.half_damage_from.forEach(t => relations.half_damage_from.add(t.name));
                typeData.damage_relations.no_damage_from.forEach(t => relations.no_damage_from.add(t.name));
                typeData.damage_relations.double_damage_to.forEach(t => relations.double_damage_to.add(t.name));
                typeData.damage_relations.half_damage_to.forEach(t => relations.half_damage_to.add(t.name));
                typeData.damage_relations.no_damage_to.forEach(t => relations.no_damage_to.add(t.name));
            });

            // Adjust for dual types (e.g., immunity overrides weakness)
            relations.double_damage_from.forEach(type => { if (relations.no_damage_from.has(type) || relations.half_damage_from.has(type)) relations.double_damage_from.delete(type); });
            relations.half_damage_from.forEach(type => { if (relations.no_damage_from.has(type)) relations.half_damage_from.delete(type); });
            // Similar logic can be applied for double/half damage *to* if needed

            renderTypeMatchups(relations);

        } catch (error) {
            console.error("Error fetching type matchups:", error);
            detailMatchupsContainer.innerHTML = '<p class="text-center text-[var(--color-error)]">Could not load type matchups.</p>';
        }
    }

    function renderTypeMatchups(relations) {
        detailMatchupsContainer.innerHTML = `
            <div class="type-matchup-grid">
                <div class="type-matchup-category">
                    <h4>Weak To (Takes 2x)</h4>
                    <ul id="weak-to"> ${[...relations.double_damage_from].map(type => `<li class="type-${type}">${type}</li>`).join('') || '<li>None</li>'} </ul>
                </div>
                <div class="type-matchup-category">
                    <h4>Resists (Takes 0.5x)</h4>
                    <ul id="resists"> ${[...relations.half_damage_from].map(type => `<li class="type-${type}">${type}</li>`).join('') || '<li>None</li>'} </ul>
                </div>
                <div class="type-matchup-category">
                    <h4>Immune To (Takes 0x)</h4>
                    <ul id="immune-to"> ${[...relations.no_damage_from].map(type => `<li class="type-${type}">${type}</li>`).join('') || '<li>None</li>'} </ul>
                </div>
                 <div class="type-matchup-category">
                    <h4>Strong Against (Deals 2x)</h4>
                    <ul id="strong-against"> ${[...relations.double_damage_to].map(type => `<li class="type-${type}">${type}</li>`).join('') || '<li>None</li>'} </ul>
                </div>
                 <div class="type-matchup-category">
                    <h4>Weak Against (Deals 0.5x)</h4>
                    <ul id="weak-against"> ${[...relations.half_damage_to].map(type => `<li class="type-${type}">${type}</li>`).join('') || '<li>None</li>'} </ul>
                </div>
                 <div class="type-matchup-category">
                    <h4>Ineffective Against (Deals 0x)</h4>
                    <ul id="ineffective-against"> ${[...relations.no_damage_to].map(type => `<li class="type-${type}">${type}</li>`).join('') || '<li>None</li>'} </ul>
                </div>
            </div>
        `;
    }


    // --- UI Update & Interaction (Detail View) ---
    function updatePokemonImage() { /* ... (same as before) ... */ if (!currentPokemonData) return; const sprites = currentPokemonData.sprites; const artwork = sprites.other?.['official-artwork']; const home = sprites.other?.home; let defaultSprite = artwork?.front_default || home?.front_default || sprites.front_default; let shinySprite = artwork?.front_shiny || home?.front_shiny || sprites.front_shiny; let femaleSprite = artwork?.front_female || home?.front_female || sprites.front_female; let shinyFemaleSprite = artwork?.front_shiny_female || home?.front_shiny_female || sprites.front_shiny_female; let targetUrl = defaultSprite; if (isShiny && isFemale && shinyFemaleSprite) { targetUrl = shinyFemaleSprite; } else if (isShiny && !isFemale && shinySprite) { targetUrl = shinySprite; } else if (!isShiny && isFemale && femaleSprite) { targetUrl = femaleSprite; } else if (isShiny && shinySprite) { targetUrl = shinySprite; } else if (isFemale && femaleSprite) { targetUrl = femaleSprite; } const placeholderUrl = 'https://placehold.co/256x256/cccccc/ffffff?text=?'; detailPokemonImage.src = targetUrl || placeholderUrl; detailPokemonImage.alt = `Image of ${isShiny ? 'shiny ' : ''}${isFemale ? 'female ' : ''}${currentPokemonData.name}`; detailPokemonImage.onerror = () => { detailPokemonImage.src = placeholderUrl; detailPokemonImage.alt = `${currentPokemonData.name} image not found`; }; }
    function toggleShiny() { /* ... (same as before) ... */ if (!currentPokemonData) return; isShiny = !isShiny; detailShinyToggleButton.classList.toggle('active', isShiny); updatePokemonImage(); }
    function toggleGender() { /* ... (same as before) ... */ if (!currentPokemonData || !currentPokemonData.sprites.front_female) return; isFemale = !isFemale; detailGenderToggleButton.classList.toggle('active', isFemale); updatePokemonImage(); }
    function updateStatSortButtons() { /* ... (same as before) ... */ const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-secondary)'; detailStatSortButtonsContainer.querySelectorAll('.sort-button').forEach(button => { const isActive = button.dataset.sort === currentStatSort; button.classList.toggle('active', isActive); button.style.backgroundColor = isActive ? activeColor : ''; button.style.borderColor = isActive ? 'transparent' : ''; button.style.color = isActive ? 'white' : ''; }); }
    function resetDetailUIState() { /* ... (same as before) ... */ detailGameVersionSelect.innerHTML = '<option>Loading...</option>'; detailGameVersionSelect.disabled = true; detailPokemonDescriptionP.textContent = 'Loading...'; detailTcgSearchInput.value = ''; detailTcgCardsContainer.innerHTML = ''; detailTcgLoader.classList.add('hidden'); detailTcgErrorDiv.classList.add('hidden'); detailStatsContainer.innerHTML = ''; currentStatSort = 'default'; updateStatSortButtons(); detailAbilitiesList.innerHTML = ''; detailMovesList.innerHTML = ''; isShiny = false; isFemale = false; detailShinyToggleButton.classList.remove('active'); detailGenderToggleButton.classList.add('hidden'); detailGenderToggleButton.classList.remove('active'); detailVariantSelectorContainer.classList.add('hidden'); detailVariantSelect.innerHTML = ''; switchSubTab(detailGameInfoTabsContainer.querySelector('[data-subtab="summary-content"]')); hideMovesPagination(); if(detailEvolutionsContainer) detailEvolutionsContainer.innerHTML = '<p class="italic text-[var(--color-text-secondary)]">Loading evolution chain...</p>'; if(detailMatchupsContainer) detailMatchupsContainer.innerHTML = '<p class="italic text-[var(--color-text-secondary)]">Loading matchups...</p>'; }
    function showDetailError(message) { /* ... (same as before) ... */ detailErrorText.textContent = message; detailErrorMessageDiv.classList.remove('hidden'); detailPokemonInfoDiv.classList.add('hidden'); detailLoader.classList.add('hidden'); }
    function showDexGridError(message) { /* ... (same as before) ... */ pokedexGrid.innerHTML = `<p class="text-center text-[var(--color-error)] p-4">${message}</p>`; dexGridLoader.classList.add('hidden'); }
    function switchTab(clickedTab) { /* ... (same as before) ... */ if (!clickedTab) return; const targetTabId = clickedTab.dataset.tab; detailMainTabButtons.forEach(button => button.classList.remove('active')); clickedTab.classList.add('active'); updateActiveTabColor(); detailMainTabContents.forEach(content => content.classList.toggle('active', content.id === targetTabId)); }
    function switchSubTab(clickedSubTab) { /* ... (same as before) ... */ if (!clickedSubTab) return; const targetSubTabId = clickedSubTab.dataset.subtab; detailSubTabButtons.forEach(button => button.classList.remove('active')); clickedSubTab.classList.add('active'); activeSubTab = targetSubTabId; updateActiveSubTabColor(); detailSubTabContents.forEach(content => content.classList.toggle('active', content.id === targetSubTabId)); renderActiveSubTabContent(); }
    function updateActiveTabColor() { /* ... (same as before) ... */ const activeTab = detailMainTabsContainer.querySelector('.tab-button.active'); const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-secondary)'; const lightColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color-light').trim() || 'var(--color-primary)'; if (activeTab) { activeTab.style.backgroundColor = darkColor; activeTab.style.borderColor = lightColor; activeTab.style.color = 'white'; } detailMainTabButtons.forEach(button => { if (!button.classList.contains('active')) { button.style.backgroundColor = ''; button.style.borderColor = 'transparent'; button.style.color = ''; } }); }
    function updateActiveSubTabColor() { /* ... (same as before) ... */ const activeSubTab = detailGameInfoTabsContainer.querySelector('.sub-tab-button.active'); const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--dynamic-type-color').trim() || 'var(--color-secondary)'; if (activeSubTab) { activeSubTab.style.backgroundColor = darkColor; activeSubTab.style.borderColor = 'transparent'; activeSubTab.style.color = 'white'; } detailSubTabButtons.forEach(button => { if (!button.classList.contains('active')) { button.style.backgroundColor = ''; button.style.borderColor = ''; button.style.color = ''; } }); }

    // --- Event Listeners ---
    mainSearchButton.addEventListener('click', () => { const searchTerm = mainSearchInput.value; if (searchTerm.trim()) fetchAndDisplayDetailData(searchTerm); });
    mainSearchInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') { const searchTerm = mainSearchInput.value; if (searchTerm.trim()) fetchAndDisplayDetailData(searchTerm); } });
    detailCloseButton.addEventListener('click', closeDetailLightbox);
    detailViewLightbox.addEventListener('click', (event) => { if (event.target === detailViewLightbox) closeDetailLightbox(); });
    generationTabsContainer.addEventListener('click', async (event) => { const button = event.target.closest('.gen-tab-button'); if (button && !button.classList.contains('active')) { generationTabsContainer.querySelectorAll('.gen-tab-button').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentGeneration = button.dataset.generation === 'all' ? 'all' : parseInt(button.dataset.generation, 10); currentTypeFilter = 'all'; updateActiveTypeButton(); await applyFiltersAndDisplayGrid(); } });
    typeFilterButtonsContainer.addEventListener('click', async (event) => { const button = event.target.closest('.type-filter-button'); if (button && !button.classList.contains('active')) { typeFilterButtonsContainer.querySelectorAll('.type-filter-button').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentTypeFilter = button.dataset.type; await applyFiltersAndDisplayGrid(); } });
    // Grid Sort Listener
    gridSortButtonsContainer.addEventListener('click', (event) => { const button = event.target.closest('.sort-button'); if (button && !button.classList.contains('active')) { gridSortButtonsContainer.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentGridSort = button.dataset.sort; applyFiltersAndDisplayGrid(); /* Re-apply filters which includes sorting */ } });
    // Random Button Listener
    randomPokemonButton.addEventListener('click', async () => { const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1; console.log(`Random Pokémon ID: ${randomId}`); await fetchAndDisplayDetailData(randomId); });
    // Random Generator Link Button
    if (randomGeneratorLinkButton) { randomGeneratorLinkButton.addEventListener('click', () => { window.open('https://github.com/nerdydrew/Random-Pokemon-Generator', '_blank'); }); }
    // Detail View Listeners
    detailMainTabsContainer.addEventListener('click', (event) => { if (event.target.classList.contains('tab-button')) switchTab(event.target); });
    detailGameInfoTabsContainer.addEventListener('click', (event) => { if (event.target.classList.contains('sub-tab-button')) switchSubTab(event.target); });
    detailShinyToggleButton.addEventListener('click', toggleShiny);
    detailGenderToggleButton.addEventListener('click', toggleGender);
    detailPlayCryButton.addEventListener('click', playPokemonCry); // Cry button listener
    detailGameVersionSelect.addEventListener('change', updateDescription);
    detailVariantSelect.addEventListener('change', (event) => { const selectedVariantIdentifier = event.target.value; if(selectedVariantIdentifier && currentPokemonData?.name !== selectedVariantIdentifier) { fetchAndDisplayDetailData(selectedVariantIdentifier); } });
    detailStatSortButtonsContainer.addEventListener('click', (event) => { if (event.target.classList.contains('sort-button')) { const sortType = event.target.dataset.sort; currentStatSort = (currentStatSort === sortType && sortType !== 'default') ? 'default' : sortType; renderStats(); updateStatSortButtons(); } });
    detailTcgSearchButton.addEventListener('click', filterAndDisplayTcgData);
    detailTcgSearchInput.addEventListener('input', filterAndDisplayTcgData);
    detailTcgSearchInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') event.preventDefault(); });
    lightboxCloseButton.addEventListener('click', closeTcgLightbox); // TCG Lightbox close
    tcgLightbox.addEventListener('click', (event) => { if (event.target === tcgLightbox) closeTcgLightbox(); }); // TCG overlay click
    // Moves Pagination Listeners
    if(detailPrevMovePageButton) detailPrevMovePageButton.addEventListener('click', () => { if (currentMovesPage > 1) { currentMovesPage--; renderMoves(); } });
    if(detailNextMovePageButton) detailNextMovePageButton.addEventListener('click', () => { const totalPages = Math.ceil(currentMoves.length / movesPerPage); if (currentMovesPage < totalPages) { currentMovesPage++; renderMoves(); } });
    // Grid click listener (using event delegation)
    pokedexGrid.addEventListener('click', (event) => { const card = event.target.closest('.pokedex-grid-card'); if (card) { const pokemonIdentifier = card.dataset.pokemonName || card.dataset.pokemonId; if (pokemonIdentifier) { console.log(`Card click registered for: ${pokemonIdentifier}`); fetchAndDisplayDetailData(pokemonIdentifier); } else { console.error("Could not find identifier on clicked card:", card); } } });

    // --- Initialization ---
    function populateGenerationTabs() { /* ... (same as before) ... */ generationTabsContainer.innerHTML = ''; const allButton = document.createElement('button'); allButton.className = 'gen-tab-button'; allButton.dataset.generation = 'all'; allButton.textContent = `All`; generationTabsContainer.appendChild(allButton); Object.keys(GENERATION_RANGES).forEach(genNum => { if (genNum === 'all') return; const button = document.createElement('button'); button.className = 'gen-tab-button'; button.dataset.generation = genNum; button.textContent = `Gen ${genNum}`; if (parseInt(genNum, 10) === currentGeneration) button.classList.add('active'); generationTabsContainer.appendChild(button); }); }
    function populateTypeFilters() { /* ... (same as before) ... */ typeFilterButtonsContainer.innerHTML = ''; const allButton = document.createElement('button'); allButton.className = 'type-filter-button active'; allButton.dataset.type = 'all'; allButton.textContent = 'All'; typeFilterButtonsContainer.appendChild(allButton); POKEMON_TYPES.forEach(type => { const button = document.createElement('button'); button.className = 'type-filter-button'; button.dataset.type = type; button.textContent = type; button.style.setProperty('--dynamic-type-color', `var(--type-${type})`); button.classList.add(`type-bg-${type}`); typeFilterButtonsContainer.appendChild(button); }); }
    function updateActiveTypeButton() { /* ... (same as before) ... */ typeFilterButtonsContainer.querySelectorAll('.type-filter-button').forEach(btn => { btn.classList.toggle('active', btn.dataset.type === currentTypeFilter); }); }

    async function initializeApp() {
        console.log("Initializing Pokedex App...");
        populateGenerationTabs(); populateTypeFilters();
        dexGridLoader.classList.remove('hidden');
        try { const initialList = await fetchGenerationList(currentGeneration); displayDexGrid(initialList); } catch (error) { /* Handled */ }
        finally { dexGridLoader.classList.add('hidden'); setTimeout(() => { initialLoadingOverlay.classList.add('loaded'); appContainer.classList.remove('hidden'); }, 500); }
        console.log("Pokedex App Initialized.");
    }

    initializeApp(); // Start the app

}); // End DOMContentLoaded Listener

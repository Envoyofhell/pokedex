// dex/js/modules/utils.js
// Utility functions and helpers for the Pokédex application

// Create a namespace for the application
window.DexApp = window.DexApp || {};
window.DexApp.Utils = {};

// --- Constants ---
window.DexApp.Constants = {
    GENERATION_RANGES: {
        1: { limit: 151, offset: 0 }, 2: { limit: 100, offset: 151 }, 
        3: { limit: 135, offset: 251 }, 4: { limit: 107, offset: 386 }, 
        5: { limit: 156, offset: 493 }, 6: { limit: 72, offset: 649 },
        7: { limit: 88, offset: 721 }, 8: { limit: 96, offset: 809 }, 
        9: { limit: 120, offset: 905 }, all: { limit: 1500, offset: 0 }
    },
    POKEMON_TYPES: [
        'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 
        'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 
        'dragon', 'dark', 'steel', 'fairy'
    ],
    TCG_TYPES: [
        'Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 
        'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'
    ],
    TCG_RARITIES: [
        'Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Ultra', 'Rare Secret', 
        'Rare Holo GX', 'Rare Holo V', 'Rare Holo VMAX', 'Rare Holo VSTAR', 
        'Rare ACE', 'Rare BREAK', 'Rare Prism Star', 'Rare Shining', 
        'Amazing Rare', 'Rare Shiny', 'Trainer Gallery Rare Holo', 
        'Radiant Rare', 'Illustration Rare', 'Special Illustration Rare'
    ],
    NATURES: [
        "Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile", 
        "Gentle", "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely", 
        "Mild", "Modest", "Naive", "Naughty", "Quiet", "Quirky", "Rash", 
        "Relaxed", "Sassy", "Serious", "Timid"
    ],
    POKEAPI_BASE_URL: 'https://pokeapi.co/api/v2',
    MAX_MOVES_DISPLAY: 50 // Moves per page
};

// --- Pokemon/Display Data Formatters ---
window.DexApp.Utils.formatters = {
    cleanFlavorText: (text) => text ? text.replace(/[\n\f\u00ad]/g, ' ') : '',
    capitalize: (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '',
    formatVersionName: (name) => name ? name.split('-').map(window.DexApp.Utils.formatters.capitalize).join(' ') : '',
    formatName: (name) => name ? name.split('-').map(window.DexApp.Utils.formatters.capitalize).join(' ') : '',
    getPokemonIdFromUrl: (url) => {
        if (!url) return null;
        const parts = url.split('/').filter(Boolean);
        const id = parts.pop();
        return !isNaN(id) ? parseInt(id, 10) : null;
    },
    getRegionNameForGen: (genNum) => {
        const regionNames = {
            '1': 'Kanto',
            '2': 'Johto',
            '3': 'Hoenn',
            '4': 'Sinnoh',
            '5': 'Unova',
            '6': 'Kalos',
            '7': 'Alola',
            '8': 'Galar/Hisui',
            '9': 'Paldea'
        };
        return regionNames[genNum] || `Generation ${genNum}`;
    }
};

// --- Random Utility Functions ---
window.DexApp.Utils.random = {
    getRandomElement: (arr) => {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    shuffle: (arr) => {
        const newArr = [...arr];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },
    removeRandomElement: (arr) => {
        const index = Math.floor(Math.random() * arr.length);
        return arr.splice(index, 1)[0];
    }
};

// --- Element Creators and UI Helpers ---
window.DexApp.Utils.UI = {
    showError: (container, message) => {
        container.innerHTML = `<p class="text-center text-[var(--color-error)] p-4">${message}</p>`;
    },
    showLoader: (loaderElement) => {
        if (loaderElement) loaderElement.classList.remove('hidden');
    },
    hideLoader: (loaderElement) => {
        if (loaderElement) loaderElement.classList.add('hidden');
    },
    createTypeIcon: (type) => {
        const typeBadge = document.createElement('span');
        typeBadge.className = `type-badge`;
        typeBadge.textContent = type;
        typeBadge.style.backgroundColor = `var(--type-${type}, var(--color-text-secondary))`;
        return typeBadge;
    },
    updateElementText: (elementId, text) => {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }
};

// --- Storage Utilities ---
window.DexApp.Utils.storage = {
    saveToLocalStorage: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    },
    getFromLocalStorage: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return defaultValue;
        }
    }
};

// Pokemon filtering utilities
window.DexApp.Utils.pokemonFilters = {
    // Check if Pokemon has evolution
    hasEvolution: (pokemon) => {
        if (pokemon.fullSpeciesData?.evolves_from_species) {
            // This Pokémon evolved from something, so check if it evolves further
            return pokemon.varieties?.some(variety => 
                variety.name.includes('-mega') || 
                variety.name.includes('-gmax')
            ) || false;
        }
        
        // Check if there's an evolution chain and this Pokémon is not the final form
        if (pokemon.fullSpeciesData?.evolution_chain?.url) {
            // We would need to fetch the evolution chain to be certain
            // For simplicity, we'll use a heuristic based on the Pokémon's data
            return !pokemon.fullSpeciesData.is_legendary && 
                   !pokemon.fullSpeciesData.is_mythical && 
                   pokemon.fullPokemonData.stats.some(s => s.base_stat >= 110);
        }
        
        return false;
    },
    
    // Calculate evolution stage (0 = base, 1 = first evolution, 2 = second evolution)
    getEvolutionCount: (pokemon) => {
        if (!pokemon.fullSpeciesData) return 0;
        
        let count = 0;
        let currentSpecies = pokemon.fullSpeciesData;
        
        // Count backwards from current form to first form
        while (currentSpecies.evolves_from_species) {
            count++;
            if (count >= 2) break; // Max evolution stage in normal Pokémon
            
            // We'd need to fetch the previous species to continue
            // For simplicity, we'll stop here
            break;
        }
        
        return count;
    },
    
    // Check if this is an alternate form
    isAlternateForm: (pokemon) => {
        const baseName = pokemon.fullSpeciesData?.name || '';
        const thisName = pokemon.name || '';
        
        return thisName !== baseName && 
               (thisName.includes('-') || 
                pokemon.varieties?.length > 1);
    },
    
    // Check if this is a mega evolution
    isMegaEvolution: (pokemon) => {
        return pokemon.name.includes('-mega');
    },
    
    // Check if this is a Gigantamax form
    isGigantamax: (pokemon) => {
        return pokemon.name.includes('-gmax');
    },
    
    // Check if this is a sub-legendary Pokemon
    isSubLegendary: (pokemonId) => {
        const subLegendaryIds = [
            144, 145, 146, // Articuno, Zapdos, Moltres
            150, 151, // Mewtwo, Mew
            243, 244, 245, // Raikou, Entei, Suicune
            249, 250, 251, // Lugia, Ho-Oh, Celebi
            377, 378, 379, 380, 381, 382, 383, 384, 385, 386, // Regirock, Regice, Registeel, Latias, Latios, Kyogre, Groudon, Rayquaza, Jirachi, Deoxys
            480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, // Uxie, Mesprit, Azelf, Dialga, Palkia, Heatran, Regigigas, Giratina, Cresselia, Phione, Manaphy, Darkrai, Shaymin, Arceus
            494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, // Victini, Cobalion, Terrakion, Virizion, Tornadus, Thundurus, Reshiram, Zekrom, Landorus, Kyurem, Keldeo, Meloetta, Genesect
            716, 717, 718, 719, 720, 721, // Xerneas, Yveltal, Zygarde, Diancie, Hoopa, Volcanion
            785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, // Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini, Cosmog, Cosmoem, Solgaleo, Lunala, Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord, Necrozma, Magearna, Marshadow
            803, 804, 805, 806, 807, 808, 809, // Poipole, Naganadel, Stakataka, Blacephalon, Zeraora, Meltan, Melmetal
            888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, // Zacian, Zamazenta, Eternatus, Kubfu, Urshifu, Zarude, Regieleki, Regidrago, Glastrier, Spectrier, Calyrex
            905, 906, 907, 908, 909, 910, 911 // Enamorus, Wo-Chien, Chien-Pao, Ting-Lu, Chi-Yu, Koraidon, Miraidon
        ];
        
        return subLegendaryIds.includes(pokemonId);
    }
};
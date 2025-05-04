/**
 * @file        dex/js/modules/constants.js
 * @description Defines constants used throughout the Pokédex application.
 * @version     1.0.0
 * @date        2025-05-03
 * @author      Your Name/AI Assistant
 */

// Ensure the main application namespace exists
window.DexApp = window.DexApp || {};

// Define the Constants namespace
window.DexApp.Constants = {};

// --- Generation Ranges (Based on standard PokéAPI limits) ---
// The generator script primarily uses the keys ('1' through '9')
// The ranges are included for potential future use or reference.
window.DexApp.Constants.GENERATION_RANGES = {
    'all': { name: 'All', limit: 1025, offset: 0 }, // Approximate total as of Gen 9
    '1': { name: 'Kanto', limit: 151, offset: 0 },
    '2': { name: 'Johto', limit: 100, offset: 151 },
    '3': { name: 'Hoenn', limit: 135, offset: 251 },
    '4': { name: 'Sinnoh', limit: 107, offset: 386 },
    '5': { name: 'Unova', limit: 156, offset: 493 },
    '6': { name: 'Kalos', limit: 72, offset: 649 },
    '7': { name: 'Alola', limit: 88, offset: 721 }, // Includes USUM additions
    '8': { name: 'Galar', limit: 96, offset: 809 }, // Includes IoA/CT additions + Legends Arceus
    '9': { name: 'Paldea', limit: 120, offset: 905 } // Includes Teal Mask/Indigo Disk
    // Note: Limits/offsets might need slight adjustments as new data emerges.
};

// --- Pokémon Types ---
window.DexApp.Constants.POKEMON_TYPES = [
    "normal", "fire", "water", "electric", "grass", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy"
];

// --- Pokémon Natures ---
window.DexApp.Constants.NATURES = [
    "Hardy", "Lonely", "Brave", "Adamant", "Naughty",
    "Bold", "Docile", "Relaxed", "Impish", "Lax",
    "Timid", "Hasty", "Serious", "Jolly", "Naive",
    "Modest", "Mild", "Quiet", "Bashful", "Rash",
    "Calm", "Gentle", "Sassy", "Careful", "Quirky"
];

// --- Other Constants (Add as needed) ---
// Example:
// window.DexApp.Constants.API_BASE_URL = 'https://pokeapi.co/api/v2/';

console.log("Constants module loaded.");

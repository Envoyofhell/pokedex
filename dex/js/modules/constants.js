/**
 * @file        dex/js/modules/constants.js
 * @description Defines constants used throughout the Pokédex application.
 * @version     1.1.0
 * @date        2025-05-06
 * @author      Your Name/AI Assistant
 * 
 * @changelog
 * v1.1.0 (2025-05-06): Added TCG_TYPES and TCG_RARITIES constants.
 * v1.0.0 (2025-05-03): Initial constants definition.
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

// --- TCG Types and Rarities ---
// Added for TCG module functionality
window.DexApp.Constants.TCG_TYPES = [
    "Colorless", "Darkness", "Dragon", "Fairy", "Fighting", 
    "Fire", "Grass", "Lightning", "Metal", "Psychic", "Water"
];

window.DexApp.Constants.TCG_RARITIES = [
    "Common", "Uncommon", "Rare", "Rare Holo", "Rare Ultra", 
    "Rare Secret", "Rare Holo GX", "Rare Holo EX", "Rare Holo V", 
    "Rare Holo VMAX", "Rare Shining", "Amazing Rare", "Rare Rainbow",
    "Rare Holo Star", "Radiant Rare", "Promo"
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

// --- Fossil Pokémon IDs ---
// List of Pokémon IDs that are considered fossils
window.DexApp.Constants.FOSSIL_POKEMON_IDS = new Set([
    138, 139, 140, 141, 142, 
    345, 346, 347, 348, 
    408, 409, 410, 411, 
    564, 565, 566, 567, 
    696, 697, 698, 699, 
    880, 881, 882, 883
]);

console.log("Constants module loaded (v1.1.0 - with TCG constants).");
/**
 * @file        dex/js/modules/constants.js
 * @description Defines constants used throughout the Pokédex application.
 * @version     1.2.0
 * @date        2025-05-06
 * @author      Your Name
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @changelog
 * v1.2.0 (2025-05-06): Added API base URLs and proper export mechanisms.
 * v1.1.0 (2025-05-05): Added TCG_TYPES and TCG_RARITIES constants.
 * v1.0.0 (2025-05-03): Initial constants definition.
 */

// Ensure the main application namespace exists first
window.DexApp = window.DexApp || {};

// Create the Constants namespace
window.DexApp.Constants = {};

// --- API Base URLs ---
window.DexApp.Constants.POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";
window.DexApp.Constants.TCGAPI_BASE_URL = "https://api.pokemontcg.io/v2";

// --- Generation Ranges (Based on standard PokéAPI limits) ---
window.DexApp.Constants.GENERATION_RANGES = {
    all: { name: "All Regions", limit: 1025, offset: 0 }, // Approximate total as of Gen 9
    1: { name: "Kanto", limit: 151, offset: 0 },
    2: { name: "Johto", limit: 100, offset: 151 },
    3: { name: "Hoenn", limit: 135, offset: 251 },
    4: { name: "Sinnoh", limit: 107, offset: 386 },
    5: { name: "Unova", limit: 156, offset: 493 },
    6: { name: "Kalos", limit: 72, offset: 649 },
    7: { name: "Alola", limit: 88, offset: 721 }, // Includes USUM additions
    8: { name: "Galar", limit: 96, offset: 809 }, // Includes IoA/CT additions + Legends Arceus
    9: { name: "Paldea", limit: 120, offset: 905 }, // Includes Teal Mask/Indigo Disk
};

// --- Pokémon Types ---
window.DexApp.Constants.POKEMON_TYPES = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
];

// --- TCG Types and Rarities ---
window.DexApp.Constants.TCG_TYPES = [
    "Colorless",
    "Darkness",
    "Dragon",
    "Fairy",
    "Fighting",
    "Fire",
    "Grass",
    "Lightning",
    "Metal",
    "Psychic",
    "Water",
];

window.DexApp.Constants.TCG_RARITIES = [
    "Common",
    "Uncommon",
    "Rare",
    "Rare Holo",
    "Rare Ultra",
    "Rare Secret",
    "Rare Holo GX",
    "Rare Holo EX",
    "Rare Holo V",
    "Rare Holo VMAX",
    "Rare Shining",
    "Amazing Rare",
    "Rare Rainbow",
    "Rare Holo Star",
    "Radiant Rare",
    "Promo",
];

// --- Pokémon Natures ---
window.DexApp.Constants.NATURES = [
    "Hardy",
    "Lonely",
    "Brave",
    "Adamant",
    "Naughty",
    "Bold",
    "Docile",
    "Relaxed",
    "Impish",
    "Lax",
    "Timid",
    "Hasty",
    "Serious",
    "Jolly",
    "Naive",
    "Modest",
    "Mild",
    "Quiet",
    "Bashful",
    "Rash",
    "Calm",
    "Gentle",
    "Sassy",
    "Careful",
    "Quirky",
];

// --- Display Limits ---
window.DexApp.Constants.MAX_MOVES_DISPLAY = 50; // Maximum moves to show per page in detail view
window.DexApp.Constants.MAX_TCG_CARDS_PER_SET = 50; // Maximum TCG cards to show per set
window.DexApp.Constants.API_REQUEST_TIMEOUT = 15000; // 15 seconds timeout for API requests

// --- Fossil Pokémon IDs ---
window.DexApp.Constants.FOSSIL_POKEMON_IDS = new Set([
    138,
    139,
    140,
    141,
    142, // Gen 1
    345,
    346,
    347,
    348, // Gen 3
    408,
    409,
    410,
    411, // Gen 4
    564,
    565,
    566,
    567, // Gen 5
    696,
    697,
    698,
    699, // Gen 6
    880,
    881,
    882,
    883, // Gen 8
]);

// --- Sub-Legendary Pokémon IDs ---
window.DexApp.Constants.SUBLEGENDARY_POKEMON_IDS = new Set([
    144,
    145,
    146,
    150,
    151, // Gen 1
    243,
    244,
    245,
    249,
    250,
    251, // Gen 2
    // Add more as needed
]);

// --- Module Export for ES6 Module compatibility (future-proofing) ---
// This code is commented out as it's not currently used in the script tag implementation
// But is provided for future compatibility when moving to ES modules
/*
// Export constants for ES modules
export const GENERATION_RANGES = window.DexApp.Constants.GENERATION_RANGES;
export const POKEMON_TYPES = window.DexApp.Constants.POKEMON_TYPES;
export const TCG_TYPES = window.DexApp.Constants.TCG_TYPES;
export const TCG_RARITIES = window.DexApp.Constants.TCG_RARITIES;
export const NATURES = window.DexApp.Constants.NATURES;
export const FOSSIL_POKEMON_IDS = window.DexApp.Constants.FOSSIL_POKEMON_IDS;
export const SUBLEGENDARY_POKEMON_IDS = window.DexApp.Constants.SUBLEGENDARY_POKEMON_IDS;

// Export default for ES modules
export default window.DexApp.Constants;
*/

// Add tracking for script load if diagnostic script is loaded
if (window.trackScriptLoad) {
    window.trackScriptLoad("constants.js");
}

console.log("Constants module loaded (v1.2.0)");

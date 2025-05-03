# Interactive Pokedex Viewer

A web-based application that allows users to browse Pokémon by generation, search for specific Pokémon, and view detailed information including game stats, descriptions, moves, abilities, and related Trading Card Game (TCG) cards.

![Placeholder Screenshot - Grid View](https://via.placeholder.com/600x400.png?text=Pokedex+Grid+View+Screenshot)
_Suggestion: Replace the placeholder above with an actual screenshot of your Pokedex grid._

![Placeholder Screenshot - Detail View](https://via.placeholder.com/600x400.png?text=Pokemon+Detail+View+Screenshot)
_Suggestion: Replace the placeholder above with an actual screenshot of the Pokémon detail lightbox._

## ✨ Features

* **Browse by Generation:** View Pokémon lists filtered by game generation (Gen 1 through Gen 9).
* **Search Functionality:** Find specific Pokémon by their Name or National Pokédex ID using the main search bar.
* **Detailed Pokémon View (Lightbox):**
    * Displays Official Artwork with a toggle for the **Shiny** version.
    * Shows basic information: National Pokédex ID, Height, Weight, and Type(s).
    * Dynamically themed background gradient in the visual section based on the Pokémon's types.
    * **Game Info Tab:**
        * **Summary:** Pokédex entries from various game versions (selectable via dropdown) and physical characteristics.
        * **Stats:** Displays base stats (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed) with visual bars and sorting options (Default, Value Ascending, Value Descending). Stat bars are dynamically colored.
        * **Abilities:** Lists all abilities, marking hidden abilities.
        * **Moves:** Shows moves learned via level-up, including the level learned (up to a display limit).
    * **Card Info Tab:**
        * Displays related Pokémon TCG cards.
        * Allows filtering TCG cards by name or card text.
        * Groups cards by TCG set, sorted by release date.
* **TCG Card Detail Viewer (Lightbox):**
    * Opens when a TCG card thumbnail is clicked.
    * Shows a large, high-resolution image of the selected TCG card.
    * Displays detailed card information: Set, HP, Type, Rarity, Attacks (including cost, damage, text), Abilities, Weaknesses, Resistances, and Retreat Cost.
* **User Experience:**
    * Loading indicators while fetching data from APIs.
    * Basic error handling and messages for API issues or missing data.
    * Caching of fetched Pokémon list and detail data for improved performance.
    * Responsive elements (layout adapts based on CSS).

## 🛠️ Technologies Used

* **Frontend:**
    * HTML5
    * CSS3 (Custom styles in `dex.css`, potentially using CSS variables for theming)
    * Vanilla JavaScript (ES6+)
* **APIs:**
    * [PokeAPI (v2)](https://pokeapi.co/): Used for fetching Pokémon game data (species, stats, moves, abilities, sprites, descriptions).
    * [Pokemon TCG API (v2)](https://pokemontcg.io/): Used for fetching Pokémon Trading Card Game card data and images. **Requires an API Key.**
* **Libraries/Assets:**
    * [Font Awesome](https://fontawesome.com/): For icons.
    * [Google Fonts](https://fonts.google.com/): Using 'Inter' and 'Lato' fonts.

## 🚀 Setup & Installation

This project is currently contained within a single HTML file. To run it:

1.  **Save the Code:** Save the provided HTML code as an `.html` file (e.g., `pokedex.html`).
2.  **Get a TCG API Key:**
    * Visit the [Pokemon TCG API Developers](https://dev.pokemontcg.io/) website.
    * Sign up or log in to obtain a free API key.
3.  **Configure API Key:**
    * Open the `.html` file you saved in a text editor.
    * Locate the following line within the `<script>` tag:
        ```javascript
        const TCG_API_KEY = 'a65acbfc-55e5-4d2c-9278-253872a1bc5a'; // Replace with your key
        ```
    * Replace the placeholder string `'a65acbfc-55e5-4d2c-9278-253872a1bc5a'` (or `'YOUR_API_KEY'`) with the actual API key you obtained.
    * **Important:** Keep your API key private. If deploying this project publicly, consider implementing a backend proxy to handle TCG API requests securely instead of embedding the key directly in the frontend code.
4.  **Open in Browser:** Open the modified `.html` file directly in your web browser (e.g., Chrome, Firefox, Edge).

## 🎮 Usage

1.  **Browse:** Click the "Gen" buttons at the top to load Pokémon from a specific generation into the main grid.
2.  **Search:** Enter a Pokémon's name (e.g., "Pikachu") or National Pokédex ID (e.g., "25") into the search bar at the top and click "Search" or press Enter. This will open the detail view directly.
3.  **View Details:** Click on any Pokémon card in the grid to open its detailed view in a lightbox.
4.  **Navigate Details:**
    * Use the "Game Info" and "Card Info" tabs.
    * Within "Game Info", use the "Summary", "Stats", "Abilities", and "Moves" sub-tabs.
    * Toggle the shiny version using the star icon (<i class="fas fa-star"></i>) next to the Pokémon image.
    * Select different game versions from the dropdown in the "Summary" tab to see different Pokédex entries.
    * Use the sort buttons ("Default", "Val ↓", "Val ↑") in the "Stats" tab.
5.  **View TCG Cards:**
    * Go to the "Card Info" tab in the detail view.
    * Optionally, type into the filter bar and click "Filter" to narrow down the displayed TCG cards.
    * Click on any small TCG card image to open the TCG Card Detail Lightbox for a larger view and more information.
6.  **Close Lightboxes:** Click the close button ('X') or click outside the main content area of the lightboxes to close them.

## 📝 Configuration

* **TCG API Key:** As mentioned in the Setup section, the `TCG_API_KEY` constant within the `<script>` tag *must* be set to a valid key from [pokemontcg.io](https://dev.pokemontcg.io/) for the TCG card features to work correctly.

## 💡 Potential Improvements / To-Do

* Separate JavaScript and CSS into external files (`.js`, `.css`) for better organization and maintainability.
* Implement more robust error handling and user feedback mechanisms.
* Add display for Evolution Chains.
* Include Pokémon location/encounter data.
* Show more detailed move information (Type, Power, Accuracy, PP, Category).
* Support other move learning methods (TM/HM/TR, Egg, Tutor).
* Add a type effectiveness chart/display.
* Enhance responsive design for a wider range of screen sizes (mobile, tablet).
* Improve accessibility (review ARIA attributes, keyboard navigation).
* Consider using a simple build tool (like Parcel or Vite) if the project grows, for bundling, minification, and development server features.
* Implement a backend proxy for the TCG API key if deploying publicly.
* Add unit or integration tests.

## 📄 License

*(Optional: Add license information here, e.g., MIT License)*
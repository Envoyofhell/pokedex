/**
 * @file        dex/js/modules/generator.js
 * @description Random generator functionality using pre-processed local JSON data.
 * @version     3.2.0
 * @date        2025-05-06
 * @author      Your Name
 * @copyright   (c) 2025 Your Project Name
 * @license     MIT (or your chosen license)
 *
 * @dependencies utils.js, constants.js, lightbox.js
 * @dependents   app.js
 *
 * @changelog
 * v3.2.0 (2025-05-06): Complete rewrite with improved dependency checks, better error handling.
 * v3.1.3 (2025-05-03): Fixed filter logic based on exclusion. Ensured dynamic UI population runs correctly.
 * v3.1.2 (2025-05-03): Attempted filter logic fix, ensured dynamic UI population runs, added debug logs.
 * v3.1.1 (2025-05-03): Fixed filterLocalPokemonData logic. Restored dynamic population of Region/Type checkboxes.
 * v3.1.0 (2025-05-03): Rewrote filterLocalPokemonData for clarity and correctness based on local JSON flags.
 * v3.0.2 (2025-05-03): Adjusted fetch paths to include 'public/' assuming server root is project root.
 * v3.0.1 (2025-05-03): Corrected fetch path for pokedex-index.json.
 * v3.0.0 (2025-05-03): Rewritten to use local JSON data.
 */

window.DexApp = window.DexApp || {};
window.DexApp.Generator = window.DexApp.Generator || {};

// --- State Variables ---
window.DexApp.Generator.state = {
    active: false,
    settingsPanelVisible: true,
    options: {
        /* Read from form */
    },
    pokedexData: [], // Holds the combined data from loaded JSON files
    pokedexIndex: null, // Holds the content of pokedex-index.json
    dataLoading: false,
    dataLoaded: false,
    generatedHistory: [],
    currentHistoryIndex: -1,
    shiniesFound: [],
};

// --- DOM Elements Cache ---
window.DexApp.Generator.elements = {
    // Main elements
    generatorOverlay: null,
    generatorForm: null,
    generatorResultsContainer: null,
    generatorLoader: null,
    generatorCloseButton: null,
    generatorPrevButton: null,
    generatorNextButton: null,
    generatorShinyHistory: null,
    settingsPanel: null,
    settingsToggleButton: null,
    settingsToggleButtonIcon: null,
    generatorErrorMessage: null,

    // Form elements (cached later)
    countSelect: null,
    regionCheckboxes: null,
    typeCheckboxes: null,
    advancedCheckboxes: null,
    legendariesCheckbox: null,
    mythicalsCheckbox: null,
    sublegendariesCheckbox: null,
    ultraBeastsCheckbox: null,
    paradoxesCheckbox: null,
    formsCheckbox: null,
    megasCheckbox: null,
    gigantamaxCheckbox: null,
    nfesCheckbox: null,
    fullyEvolvedCheckbox: null,
    unevolvedCheckbox: null,
    evolvedOnceCheckbox: null,
    evolvedTwiceCheckbox: null,
    shinyBoostCheckbox: null,

    // Check All/None buttons
    regionCheckAll: null,
    regionUncheckAll: null,
    typeCheckAll: null,
    typeUncheckAll: null,
    advancedCheckAll: null,
    advancedUncheckAll: null,

    // Tab elements
    generatorResultsTabs: null,
    generatorHistoryTab: null,
};

// --- Initialize Generator ---
window.DexApp.Generator.initialize = async function () {
    console.log("Initializing Generator module (v3.2.0)...");

    // Verify dependencies
    if (!this.checkDependencies()) {
        console.error(
            "Generator initialization failed: Missing critical dependencies."
        );
        return false;
    }

    this.cacheElements(); // Cache base elements

    // Verify critical elements exist
    if (
        !this.elements.generatorOverlay ||
        !this.elements.generatorForm ||
        !this.elements.generatorResultsContainer ||
        !this.elements.settingsPanel ||
        !this.elements.settingsToggleButton
    ) {
        console.error("Generator Init Failed: Missing essential DOM elements.");
        return false;
    }

    // Populate filters that need dynamic creation FIRST
    this.populateDynamicFilters(); // Creates checkboxes AND caches them

    // Cache remaining static form elements AFTER dynamic ones are potentially created/cached
    this.cacheStaticFormElements(); // Caches advanced checkboxes etc.

    // Setup listeners AFTER all elements are cached
    this.setupEventListeners();
    this.setupCheckAllListeners(); // Attaches listeners using cached elements

    // Load saved data
    this.loadShinyHistory();
    await this.loadPokedexIndex(); // Load index immediately

    console.log("Generator module initialized successfully.");
    return true;
};

// --- Check Dependencies ---
window.DexApp.Generator.checkDependencies = function () {
    let missingDeps = [];

    // Check for critical dependencies
    if (!window.DexApp.Constants) {
        missingDeps.push("Constants module");
    } else if (!window.DexApp.Constants.POKEMON_TYPES) {
        missingDeps.push("Constants.POKEMON_TYPES");
    } else if (!window.DexApp.Constants.GENERATION_RANGES) {
        missingDeps.push("Constants.GENERATION_RANGES");
    }

    if (!window.DexApp.Utils) {
        missingDeps.push("Utils module");
    } else {
        // Check for specific Utils functions we need
        if (!window.DexApp.Utils.random) {
            missingDeps.push("Utils.random");
        }
        if (!window.DexApp.Utils.formatters) {
            missingDeps.push("Utils.formatters");
        }
        if (!window.DexApp.Utils.storage) {
            missingDeps.push("Utils.storage");
        }
    }

    // Optional but recommended
    if (!window.DexApp.Lightbox) {
        console.warn(
            "Generator module: Lightbox module not found. Some features will be limited."
        );
    }

    if (missingDeps.length > 0) {
        console.error(
            `Generator module is missing critical dependencies: ${missingDeps.join(
                ", "
            )}`
        );
        return false;
    }

    return true;
};

// --- Cache DOM Elements ---
window.DexApp.Generator.cacheElements = function () {
    // Main elements
    this.elements.generatorOverlay = document.getElementById(
        "generator-overlay"
    );
    this.elements.generatorForm = document.getElementById("generator-form");
    this.elements.generatorResultsContainer = document.getElementById(
        "generator-results"
    );
    this.elements.generatorLoader = document.getElementById("generator-loader");
    this.elements.generatorCloseButton = document.getElementById(
        "generator-close-button"
    );
    this.elements.generatorPrevButton = document.getElementById(
        "generator-prev-button"
    );
    this.elements.generatorNextButton = document.getElementById(
        "generator-next-button"
    );
    this.elements.generatorShinyHistory = document.getElementById(
        "generator-shiny-history"
    );
    this.elements.settingsPanel = document.getElementById(
        "generator-settings-panel"
    );
    this.elements.settingsToggleButton = document.getElementById(
        "settings-toggle-button"
    );
    this.elements.generatorErrorMessage = document.getElementById(
        "generator-error-message"
    );

    // Tab elements
    this.elements.generatorResultsTabs = document.querySelectorAll(
        ".generator-results-tab-button"
    );
    this.elements.generatorHistoryTab = document.getElementById(
        "history-generation-tab"
    );

    // Get toggle button icon if toggle button exists
    if (this.elements.settingsToggleButton) {
        this.elements.settingsToggleButtonIcon = this.elements.settingsToggleButton.querySelector(
            "i"
        );
    }
};

// --- Cache Static Form Elements ---
window.DexApp.Generator.cacheStaticFormElements = function () {
    const form = this.elements.generatorForm;
    if (!form) return;

    // Cache static form elements
    this.elements.countSelect = form.querySelector("#generator-count");
    this.elements.legendariesCheckbox = form.querySelector(
        "#generator-legendaries"
    );
    this.elements.mythicalsCheckbox = form.querySelector(
        "#generator-mythicals"
    );
    this.elements.sublegendariesCheckbox = form.querySelector(
        "#generator-sublegendaries"
    );
    this.elements.ultraBeastsCheckbox = form.querySelector(
        "#generator-ultrabeasts"
    );
    this.elements.paradoxesCheckbox = form.querySelector(
        "#generator-paradoxes"
    );
    this.elements.formsCheckbox = form.querySelector("#generator-forms");
    this.elements.megasCheckbox = form.querySelector("#generator-megas");
    this.elements.gigantamaxCheckbox = form.querySelector(
        "#generator-gigantamax"
    );
    this.elements.nfesCheckbox = form.querySelector("#generator-nfes");
    this.elements.fullyEvolvedCheckbox = form.querySelector(
        "#generator-fully-evolved"
    );
    this.elements.unevolvedCheckbox = form.querySelector(
        "#generator-unevolved"
    );
    this.elements.evolvedOnceCheckbox = form.querySelector(
        "#generator-evolved-once"
    );
    this.elements.evolvedTwiceCheckbox = form.querySelector(
        "#generator-evolved-twice"
    );
    this.elements.shinyBoostCheckbox = form.querySelector(
        "#generator-shiny-boost"
    );

    // Cache all advanced checkboxes together
    this.elements.advancedCheckboxes = form.querySelectorAll(
        '#generator-advanced-container input[type="checkbox"]'
    );
};

// --- Setup Event Listeners ---
window.DexApp.Generator.setupEventListeners = function () {
    const elements = this.elements;

    // Form submission
    const submitButton = document.querySelector(
        '.generator-submit-button.top-button[form="generator-form"]'
    );
    if (submitButton && elements.generatorForm) {
        elements.generatorForm.addEventListener("submit", (event) => {
            event.preventDefault();
            this.generateRandomPokemon();
        });
    } else if (!submitButton) {
        console.warn("Generator submit button not found.");
    } else if (!elements.generatorForm) {
        console.warn("Generator form element not found for submit listener.");
    }

    // Navigation buttons
    if (elements.generatorPrevButton) {
        elements.generatorPrevButton.addEventListener("click", () =>
            this.showPreviousGeneration()
        );
    }

    if (elements.generatorNextButton) {
        elements.generatorNextButton.addEventListener("click", () =>
            this.showNextGeneration()
        );
    }

    // Settings toggle
    if (elements.settingsToggleButton) {
        elements.settingsToggleButton.addEventListener("click", () =>
            this.toggleSettingsPanel()
        );
    }

    // Tab buttons
    if (
        this.elements.generatorResultsTabs &&
        this.elements.generatorResultsTabs.length > 0
    ) {
        this.elements.generatorResultsTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                // Remove active class from all tabs
                this.elements.generatorResultsTabs.forEach((t) =>
                    t.classList.remove("active")
                );

                // Add active class to clicked tab
                tab.classList.add("active");

                // Show corresponding content
                const targetId = tab.dataset.tab;
                const contents = document.querySelectorAll(
                    ".generator-results-tab-content"
                );
                contents.forEach((content) => {
                    content.classList.toggle("active", content.id === targetId);
                });
            });
        });
    }
};

// --- Populate Dynamic Filter Options (Regions & Types) ---
window.DexApp.Generator.populateDynamicFilters = function () {
    const regionsContainer = document.getElementById(
        "generator-regions-container"
    );
    const typesContainer = document.getElementById("generator-types-container");

    // Populate Regions
    if (regionsContainer) {
        regionsContainer.innerHTML = "";

        // Use Constants for generation ranges if available
        if (
            window.DexApp.Constants &&
            window.DexApp.Constants.GENERATION_RANGES
        ) {
            Object.keys(window.DexApp.Constants.GENERATION_RANGES).forEach(
                (genNum) => {
                    if (genNum === "all") return; // Skip 'all' option

                    const rangeData =
                        window.DexApp.Constants.GENERATION_RANGES[genNum];
                    const regionName = rangeData.name || `Generation ${genNum}`;

                    const label = document.createElement("label");
                    label.className = "generator-checkbox";
                    label.innerHTML = `
                    <input type="checkbox" name="generator-region" value="${genNum}" checked>
                    <span class="checkmark"></span> ${regionName} (Gen ${genNum})
                `;
                    regionsContainer.appendChild(label);
                }
            );
        } else {
            // Fallback to hardcoded generations 1-9
            for (let i = 1; i <= 9; i++) {
                const label = document.createElement("label");
                label.className = "generator-checkbox";
                label.innerHTML = `
                    <input type="checkbox" name="generator-region" value="${i}" checked>
                    <span class="checkmark"></span> Generation ${i}
                `;
                regionsContainer.appendChild(label);
            }
        }

        // Cache region checkboxes
        this.elements.regionCheckboxes = regionsContainer.querySelectorAll(
            'input[name="generator-region"]'
        );
        console.log(
            `Populated ${
                this.elements.regionCheckboxes?.length || 0
            } region checkboxes.`
        );
    } else {
        console.warn("Generator regions container not found");
    }

    // Populate Types
    if (typesContainer) {
        typesContainer.innerHTML = "";

        // Use Constants for Pokemon types if available
        const types = window.DexApp.Constants?.POKEMON_TYPES || [
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

        types.forEach((type) => {
            const label = document.createElement("label");
            label.className = "generator-checkbox";

            // Format type name with Utils if available
            const typeDisplayName = window.DexApp.Utils?.formatters?.capitalize
                ? window.DexApp.Utils.formatters.capitalize(type)
                : type.charAt(0).toUpperCase() + type.slice(1);

            label.innerHTML = `
                <input type="checkbox" name="generator-type" value="${type}">
                <span class="checkmark type-${type}"></span> ${typeDisplayName}
            `;
            typesContainer.appendChild(label);
        });

        // Cache type checkboxes
        this.elements.typeCheckboxes = typesContainer.querySelectorAll(
            'input[name="generator-type"]'
        );
        console.log(
            `Populated ${
                this.elements.typeCheckboxes?.length || 0
            } type checkboxes.`
        );
    } else {
        console.warn("Generator types container not found");
    }
};

// --- Setup Check All/None Listeners ---
window.DexApp.Generator.setupCheckAllListeners = function () {
    const setupListenersForSection = (sectionName, checkboxList) => {
        const containerId = `generator-${sectionName}-container`;
        const container = document.getElementById(containerId);

        if (!container || !checkboxList || checkboxList.length === 0) {
            console.warn(
                `Could not set up check-all listeners for section "${sectionName}". Container or checkbox list missing.`
            );
            return;
        }

        const parentSection = container.closest(".form-section");
        const header = parentSection?.querySelector(".section-header");

        if (!header) {
            console.warn(`Could not find header for section "${sectionName}".`);
            return;
        }

        const checkAllBtn = header.querySelector(
            `.check-all-button[data-target="${sectionName}"]`
        );
        const uncheckAllBtn = header.querySelector(
            `.uncheck-all-button[data-target="${sectionName}"]`
        );

        if (checkAllBtn) {
            this.elements[`${sectionName}CheckAll`] = checkAllBtn;
            checkAllBtn.addEventListener("click", () =>
                this.toggleCheckboxes(checkboxList, true)
            );
            console.log(`Added check-all listener for ${sectionName}`);
        } else {
            console.warn(`Check-all button not found for ${sectionName}`);
        }

        if (uncheckAllBtn) {
            this.elements[`${sectionName}UncheckAll`] = uncheckAllBtn;
            uncheckAllBtn.addEventListener("click", () =>
                this.toggleCheckboxes(checkboxList, false)
            );
            console.log(`Added uncheck-all listener for ${sectionName}`);
        } else {
            console.warn(`Uncheck-all button not found for ${sectionName}`);
        }
    };

    // Ensure checkbox elements are cached before setting up listeners
    if (!this.elements.regionCheckboxes) {
        this.elements.regionCheckboxes = document.querySelectorAll(
            '#generator-regions-container input[name="generator-region"]'
        );
    }

    if (!this.elements.typeCheckboxes) {
        this.elements.typeCheckboxes = document.querySelectorAll(
            '#generator-types-container input[name="generator-type"]'
        );
    }

    if (!this.elements.advancedCheckboxes) {
        this.elements.advancedCheckboxes = document.querySelectorAll(
            '#generator-advanced-container input[name="generator-advanced"]'
        );
    }

    // Setup listeners for sections
    setupListenersForSection("regions", this.elements.regionCheckboxes);
    setupListenersForSection("types", this.elements.typeCheckboxes);
    setupListenersForSection(
        "legendary-status",
        document.querySelectorAll('input[name="generator-legendary-status"]')
    );
    setupListenersForSection(
        "evolution-stage",
        document.querySelectorAll('input[name="generator-evolution-stage"]')
    );
    setupListenersForSection(
        "evolution-completion",
        document.querySelectorAll(
            'input[name="generator-evolution-completion"]'
        )
    );
    setupListenersForSection(
        "special-forms",
        document.querySelectorAll('input[name="generator-special-forms"]')
    );
};

// --- Helper to Check/Uncheck All ---
window.DexApp.Generator.toggleCheckboxes = function (checkboxes, checkState) {
    if (!checkboxes) return;

    console.log(`Toggling ${checkboxes.length} checkboxes to ${checkState}`);
    checkboxes.forEach((cb) => {
        cb.checked = checkState;
    });
};

// --- Toggle Settings Panel Visibility ---
window.DexApp.Generator.toggleSettingsPanel = function () {
    const panel = this.elements.settingsPanel;
    const icon = this.elements.settingsToggleButtonIcon;

    if (!panel) return;

    this.state.settingsPanelVisible = !this.state.settingsPanelVisible;

    if (this.state.settingsPanelVisible) {
        panel.classList.remove("hidden");

        if (icon) {
            icon.classList.remove("fa-chevron-right");
            icon.classList.add("fa-chevron-left");
        }

        if (this.elements.settingsToggleButton) {
            this.elements.settingsToggleButton.title = "Hide Settings Panel";
        }
    } else {
        panel.classList.add("hidden");

        if (icon) {
            icon.classList.remove("fa-chevron-left");
            icon.classList.add("fa-chevron-right");
        }

        if (this.elements.settingsToggleButton) {
            this.elements.settingsToggleButton.title = "Show Settings Panel";
        }
    }
};

// --- Generator Controls ---
window.DexApp.Generator.activate = function () {
    console.log("Activating generator (overlay opened)...");
    this.state.active = true;

    if (!this.state.settingsPanelVisible) {
        this.toggleSettingsPanel();
    }
};

// --- Get Options from Form ---
window.DexApp.Generator.getGeneratorOptions = function () {
    const elements = this.elements;
    const options = {};

    // Hide any previous error message
    if (elements.generatorErrorMessage) {
        elements.generatorErrorMessage.classList.add("hidden");
    }

    // Number of Pokémon to generate
    options.count = elements.countSelect
        ? parseInt(elements.countSelect.value, 10)
        : 6;

    // Selected regions (checked checkboxes)
    options.regions = Array.from(elements.regionCheckboxes || [])
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);

    // Selected types (checked checkboxes)
    options.types = Array.from(elements.typeCheckboxes || [])
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);

    // Evolution stages
    options.evolutionCounts = [];
    if (elements.unevolvedCheckbox?.checked) options.evolutionCounts.push(0);
    if (elements.evolvedOnceCheckbox?.checked) options.evolutionCounts.push(1);
    if (elements.evolvedTwiceCheckbox?.checked) options.evolutionCounts.push(2);

    // Legendary status options
    options.legendaries = elements.legendariesCheckbox?.checked ?? true;
    options.mythicals = elements.mythicalsCheckbox?.checked ?? true;
    options.sublegendaries = elements.sublegendariesCheckbox?.checked ?? true;
    options.ultraBeasts = elements.ultraBeastsCheckbox?.checked ?? true;
    options.paradoxes = elements.paradoxesCheckbox?.checked ?? true;

    // Form options
    options.forms = elements.formsCheckbox?.checked ?? true; // Alternate Forms
    options.megas = elements.megasCheckbox?.checked ?? true; // Mega Evolutions
    options.gigantamaxes = elements.gigantamaxCheckbox?.checked ?? true; // Gigantamax Forms

    // Evolution completion options
    options.nfes = elements.nfesCheckbox?.checked ?? true; // Not Fully Evolved
    options.fullyEvolved = elements.fullyEvolvedCheckbox?.checked ?? true; // Fully Evolved

    // Shiny chance
    options.shinyChance = elements.shinyBoostCheckbox?.checked
        ? 1 / 100
        : 16 / 65536; // Regular vs boosted

    // Include sprites option
    options.sprites = true;

    // Store current options in state
    this.state.options = options;

    console.log("Generator options gathered:", options);
    return options;
};

// --- Load Pokedex Index ---
window.DexApp.Generator.loadPokedexIndex = async function () {
    if (this.state.dataLoaded) return;

    console.log("Loading pokedex-index.json...");

    try {
        // Try to load from public folder first
        const response = await fetch("public/data/pokedex-index.json").catch(
            () => {
                // If that fails, try without 'public/' prefix
                console.log("Retrying without 'public/' prefix...");
                return fetch("data/pokedex-index.json");
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        this.state.pokedexIndex = await response.json();
        this.state.dataLoaded = true;
        console.log("Pokedex index loaded successfully.");
    } catch (error) {
        console.error("Failed to load pokedex-index.json:", error);

        if (this.elements.generatorErrorMessage) {
            this.elements.generatorErrorMessage.textContent =
                "Error: Could not load base Pokémon data index.";
            this.elements.generatorErrorMessage.classList.remove("hidden");
        }
    }
};

// --- Load Generation Data ---
window.DexApp.Generator.loadGenerationData = async function (
    generationNumbers
) {
    if (!this.state.pokedexIndex || this.state.dataLoading) return [];

    this.state.dataLoading = true;
    console.log("Loading data for generations:", generationNumbers);

    // Get file paths from pokedex index
    const generationFilePaths = generationNumbers
        .map((genNum) => this.state.pokedexIndex.generations[genNum])
        .filter((filePath) => !!filePath);

    if (generationFilePaths.length === 0) {
        console.warn("No valid generation files found.");
        this.state.dataLoading = false;
        return [];
    }

    let combinedData = [];

    try {
        // Fetch data for each generation
        const promises = generationFilePaths.map(async (relativeFilePath) => {
            try {
                // Try with 'public/' prefix first
                const fullPath = `public/${relativeFilePath}`;
                let response;

                try {
                    response = await fetch(fullPath);

                    if (!response.ok) {
                        throw new Error(
                            `HTTP error! status: ${response.status} for ${fullPath}`
                        );
                    }
                } catch (prefixError) {
                    // Try without 'public/' prefix as fallback
                    console.log(
                        `Retrying without 'public/' prefix for ${relativeFilePath}...`
                    );
                    response = await fetch(relativeFilePath);

                    if (!response.ok) {
                        throw new Error(
                            `HTTP error! status: ${response.status} for ${relativeFilePath}`
                        );
                    }
                }

                return await response.json();
            } catch (fileError) {
                console.error(`Failed to load ${relativeFilePath}:`, fileError);
                return [];
            }
        });

        // Wait for all generation data to load
        const results = await Promise.all(promises);

        // Combine data from all generations
        combinedData = results.flat();
        console.log(`Loaded data for ${combinedData.length} Pokémon entries.`);
    } catch (error) {
        console.error("Error loading generation data:", error);

        if (this.elements.generatorErrorMessage) {
            this.elements.generatorErrorMessage.textContent =
                "Error loading Pokémon data.";
            this.elements.generatorErrorMessage.classList.remove("hidden");
        }
    } finally {
        this.state.dataLoading = false;
    }

    return combinedData;
};

// --- Random Generation (Using Local JSON) ---
window.DexApp.Generator.generateRandomPokemon = async function () {
    const loader = this.elements.generatorLoader;
    const resultsContainer = this.elements.generatorResultsContainer;
    const errorContainer = this.elements.generatorErrorMessage;

    if (
        !loader ||
        !resultsContainer ||
        !errorContainer ||
        this.state.dataLoading
    )
        return;

    // Show loader
    if (window.DexApp.Utils?.UI?.showLoader) {
        window.DexApp.Utils.UI.showLoader(loader);
    } else {
        loader.classList.remove("hidden");
    }

    // Clear results and errors
    resultsContainer.innerHTML =
        '<div class="col-span-full text-center p-4 text-gray-400 italic">Processing...</div>';
    errorContainer.classList.add("hidden");

    try {
        // Load pokedex index if not loaded yet
        if (!this.state.dataLoaded) {
            await this.loadPokedexIndex();

            if (!this.state.dataLoaded) {
                throw new Error("Base Pokémon data index failed to load.");
            }
        }

        // Get user's selected options
        const options = this.getGeneratorOptions();

        // Determine which generations to load based on user's region selection
        const generationsToLoad =
            options.regions.length > 0
                ? options.regions
                : Object.keys(this.state.pokedexIndex.generations).filter(
                      (g) => g !== "all"
                  );

        // Load Pokemon data for selected generations
        const availablePokemonData = await this.loadGenerationData(
            generationsToLoad
        );

        if (availablePokemonData.length === 0) {
            throw new Error("No Pokémon data loaded for the selected regions.");
        }

        // Filter the Pokemon data based on user's options
        let finalFilteredPokemon = this.filterLocalPokemonData(
            availablePokemonData,
            options
        );
        console.log(
            `Filtering complete. ${finalFilteredPokemon.length} Pokémon match criteria.`
        );

        // Check if any Pokemon match the criteria
        if (finalFilteredPokemon.length === 0) {
            resultsContainer.innerHTML =
                '<div class="no-results col-span-full">No Pokémon match the selected criteria. Adjust filters.</div>';

            // Hide loader
            if (window.DexApp.Utils?.UI?.hideLoader) {
                window.DexApp.Utils.UI.hideLoader(loader);
            } else {
                loader.classList.add("hidden");
            }

            return;
        }

        // Determine number of Pokemon to select
        const countToSelect = Math.min(
            options.count,
            finalFilteredPokemon.length
        );

        if (countToSelect < options.count) {
            console.warn(
                `Only ${countToSelect} Pokémon match criteria, requested ${options.count}.`
            );
        }

        // Choose random Pokemon from filtered list
        let randomSelection = this.chooseRandomPokemon(
            finalFilteredPokemon,
            countToSelect
        );

        // Add to history and display results
        this.addToGeneratorHistory(randomSelection);
        this.displayGeneratorResults(randomSelection);

        console.log("Generation complete using local data.");
    } catch (error) {
        console.error("Error generating random Pokemon:", error);

        const errorMessage = `Error: ${error.message}. Please try again.`;
        resultsContainer.innerHTML = `<div class="generator-error col-span-full">${errorMessage}</div>`;

        if (errorContainer) {
            errorContainer.textContent = errorMessage;
            errorContainer.classList.remove("hidden");
        }
    } finally {
        // Hide loader
        if (window.DexApp.Utils?.UI?.hideLoader) {
            window.DexApp.Utils.UI.hideLoader(loader);
        } else {
            loader.classList.add("hidden");
        }
    }
};

// --- Filter Local Pokemon Data ---
window.DexApp.Generator.filterLocalPokemonData = function (
    pokemonDataList,
    options
) {
    console.log("Filtering local data with options:", options);

    return pokemonDataList.filter((pokemon) => {
        // --- Type Filter ---
        // If types are selected, the pokemon MUST have at least one selected type.
        if (options.types.length > 0) {
            const hasSelectedType = options.types.some((type) =>
                pokemon.types.includes(type)
            );
            if (!hasSelectedType) {
                return false;
            }
        }

        // --- Category Filters ---
        // If the checkbox is UNCHECKED (option is false), EXCLUDE if the pokemon has the flag.
        if (!options.legendaries && pokemon.is_legendary) {
            return false;
        }
        if (!options.mythicals && pokemon.is_mythical) {
            return false;
        }
        if (!options.sublegendaries && pokemon.is_sublegendary) {
            return false;
        }
        if (!options.ultraBeasts && pokemon.is_ultra_beast) {
            return false;
        }
        if (!options.paradoxes && pokemon.is_paradox) {
            return false;
        }

        // --- Form Filters ---
        if (!options.megas && pokemon.is_mega) {
            return false;
        }
        if (!options.gigantamaxes && pokemon.is_gmax) {
            return false;
        }
        // Exclude non-Mega/Gmax/Primal forms if 'Alternate Forms' is unchecked
        if (!options.forms && pokemon.is_alternate_form) {
            return false;
        }

        // --- Evolution Stage Filters ---
        // Only apply if the user hasn't selected all stages (length < 3)
        if (options.evolutionCounts.length < 3) {
            // If the pokemon's stage is NOT in the list of selected stages, exclude it.
            if (!options.evolutionCounts.includes(pokemon.evolution_stage)) {
                return false;
            }
        }

        // --- NFE / Fully Evolved Filters ---
        // Only apply if the user hasn't selected both (which means include all)
        if (!(options.nfes && options.fullyEvolved)) {
            // If 'Not Fully Evolved' is unchecked, exclude NFE pokemon
            if (!options.nfes && !pokemon.is_fully_evolved) {
                return false;
            }
            // If 'Fully Evolved' is unchecked, exclude fully evolved pokemon
            if (!options.fullyEvolved && pokemon.is_fully_evolved) {
                return false;
            }
        }

        // If we reach here, the Pokémon passes all active filters
        return true;
    });
};

// --- Choose Random Pokemon ---
window.DexApp.Generator.chooseRandomPokemon = function (pokemonList, count) {
    // Clone the list to avoid modifying the original
    const availablePokemon = [...pokemonList];
    const selected = [];

    // Convenience reference to Utils
    const Utils = window.DexApp.Utils;

    // Get Random functions either from Utils or define locally
    const getRandomInt =
        Utils?.random?.getRandomInt ||
        ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min);

    const chance =
        Utils?.random?.chance || ((probability) => Math.random() < probability);

    // Get Natures list from Constants or a default list
    const natures = window.DexApp.Constants?.NATURES || [
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

    // Select random Pokemon
    while (selected.length < count && availablePokemon.length > 0) {
        // Pick a random Pokemon from the available list
        const randomIndex = getRandomInt(0, availablePokemon.length - 1);
        const chosenPokemonData = availablePokemon.splice(randomIndex, 1)[0];

        // Determine if shiny based on chance
        const isShiny = chance(this.state.options.shinyChance);

        // Determine gender based on gender_rate
        let gender = null;
        const genderRate = chosenPokemonData.gender_rate ?? -1;

        if (genderRate >= 0 && genderRate <= 8) {
            if (genderRate === 0) {
                gender = "male"; // Male-only
            } else if (genderRate === 8) {
                gender = "female"; // Female-only
            } else {
                // Random gender based on gender_rate (0-8 scale where 8 is 100% female)
                gender = Math.random() * 8 < genderRate ? "female" : "male";
            }
        }

        // Assign a random nature
        const nature = natures[getRandomInt(0, natures.length - 1)];

        // Generate a unique result ID
        const resultId = `gen-${Date.now()}-${selected.length}`;

        // Add to selected list
        selected.push({
            pokemon: chosenPokemonData,
            isShiny: isShiny,
            gender: gender,
            nature: nature,
            resultId: resultId,
        });
    }

    return selected;
};

// --- Display Generator Results ---
window.DexApp.Generator.displayGeneratorResults = function (pokemonList) {
    const container = this.elements.generatorResultsContainer;

    if (!container) return;

    // Clear container
    container.innerHTML = "";

    // Check if we have results
    if (!pokemonList || pokemonList.length === 0) {
        container.innerHTML =
            '<div class="no-results col-span-full">No Pokémon generated. Try different filters.</div>';
        this.updateGeneratorHistoryUI();
        return;
    }

    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();

    // Create cards for each Pokemon
    pokemonList.forEach((result) => {
        const card = this.createGeneratorResultCard(result);
        fragment.appendChild(card);

        // Add to shiny history if it's a shiny and not already in the history
        if (
            result.isShiny &&
            !this.state.shiniesFound.some(
                (s) => s.pokemon.id === result.pokemon.id
            )
        ) {
            this.addToShinyHistory(result);
        }
    });

    // Add cards to container
    container.appendChild(fragment);

    // Update history UI
    this.updateGeneratorHistoryUI();
};

// --- Create Generator Result Card ---
window.DexApp.Generator.createGeneratorResultCard = function (result) {
    const pokemonData = result.pokemon;

    // Create card element
    const card = document.createElement("div");
    card.className = "generator-pokemon-card";

    // Make sure we have an ID
    const pokemonId = pokemonData.id;
    if (!pokemonId) {
        console.error("Pokemon ID missing in generator:", pokemonData);
        return card; // Return empty card if no ID
    }

    // Add data attributes
    card.dataset.pokemonId = pokemonId;
    card.dataset.pokemonName = pokemonData.name;

    // Add shiny class if applicable
    if (result.isShiny) {
        card.classList.add("shiny");
    }

    // Determine sprite URL
    let spriteUrl = "";

    if (result.isShiny) {
        spriteUrl =
            pokemonData.shinySprite ||
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`;
    } else {
        spriteUrl =
            pokemonData.sprite ||
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
    }

    // Fallback URL for official sprite
    const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;

    // Format name
    const displayName = window.DexApp.Utils?.formatters?.formatName
        ? window.DexApp.Utils.formatters.formatName(pokemonData.name)
        : pokemonData.name
              .split("-")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" ");

    // Format ID
    const idFormatted = String(pokemonId).padStart(3, "0");

    // Get types
    const types = pokemonData.types || [];

    // Set gradient colors based on types
    let color1 = "var(--color-bg-light-panel)",
        color2 = "var(--color-bg-panel)";
    let primaryTypeColor = "var(--color-accent)";

    if (types.length > 0) {
        const typeName1 = types[0].toLowerCase();
        primaryTypeColor = `var(--type-${typeName1}, var(--color-accent))`;
        color1 = `var(--type-${typeName1}, var(--color-secondary))`;

        if (types.length > 1) {
            color2 = `var(--type-${types[1].toLowerCase()}, var(--color-primary))`;
        } else {
            color2 = `var(--type-${typeName1}-light, var(--color-primary))`;
        }
    }

    // Set CSS variables
    card.style.setProperty("--card-gradient-color-1", color1);
    card.style.setProperty("--card-gradient-color-2", color2);
    card.style.setProperty("--dynamic-type-color", primaryTypeColor);

    // Prepare types HTML
    let typesHtml = "";

    if (Array.isArray(types)) {
        typesHtml = types
            .map((type) => {
                const typeName =
                    typeof type === "string"
                        ? type
                        : type.name || type.type?.name || "normal";
                const typeDisplayName = window.DexApp.Utils?.formatters
                    ?.capitalize
                    ? window.DexApp.Utils.formatters.capitalize(typeName)
                    : typeName.charAt(0).toUpperCase() + typeName.slice(1);

                return `<span class="card-type type-${typeName.toLowerCase()}">${typeDisplayName}</span>`;
            })
            .join("");
    }

    // Build the card HTML
    card.innerHTML = `
        <div class="card-header">
            <span class="card-id">#${idFormatted}</span>
            ${
                result.isShiny
                    ? '<span class="shiny-star" title="Shiny!">★</span>'
                    : ""
            }
        </div>
        <div class="card-image-container">
            <img src="${spriteUrl}" alt="${displayName}" class="card-image" loading="lazy">
        </div>
        <div class="card-info">
            <h3 class="card-name">${displayName}</h3>
            <div class="card-nature">${result.nature || ""}</div>
            <div class="card-types">
                ${typesHtml}
            </div>
            ${
                result.gender
                    ? `<div class="card-gender ${result.gender}" title="${
                          result.gender
                      }">${result.gender === "male" ? "♂" : "♀"}</div>`
                    : ""
            }
        </div>
        <button class="view-dex-button" data-identifier="${
            pokemonData.name
        }" title="View ${displayName} in Pokédex">View Dex</button>
    `;

    // Add fallback for image
    const imgElement = card.querySelector(".card-image");
    if (imgElement) {
        imgElement.onerror = function () {
            if (this.src === spriteUrl) {
                // If primary sprite fails, try fallback
                console.log(
                    `Primary sprite failed for ${displayName}, trying fallback`
                );
                this.src = fallbackUrl;
            } else if (this.src === fallbackUrl) {
                // If fallback fails, use placeholder
                console.log(
                    `Fallback sprite failed for ${displayName}, using placeholder`
                );
                this.src = "https://placehold.co/96x96/cccccc/333333?text=%3F";
                this.onerror = null; // Stop trying after this
            }
        };
    }

    // Add view dex button click handler
    const viewDexButton = card.querySelector(".view-dex-button");
    if (viewDexButton) {
        viewDexButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent card click

            const identifier = e.currentTarget.dataset.identifier;

            // Close generator lightbox if Lightbox module is available
            if (window.DexApp.Lightbox?.closeGeneratorLightbox) {
                window.DexApp.Lightbox.closeGeneratorLightbox();
            }

            // Open detail view if available
            if (
                identifier &&
                window.DexApp.DetailView?.fetchAndDisplayDetailData
            ) {
                // Slight delay to allow lightbox transitions
                setTimeout(() => {
                    window.DexApp.DetailView.fetchAndDisplayDetailData(
                        identifier,
                        "generator"
                    );
                }, 150);
            } else {
                console.error(
                    "Cannot open detail view - function or identifier missing."
                );
            }
        });
    }

    return card;
};

// --- History Management ---
window.DexApp.Generator.addToGeneratorHistory = function (pokemonList) {
    if (!pokemonList || pokemonList.length === 0) return;

    // Clone the Pokemon list to avoid reference issues
    const clonedList = pokemonList.map((item) => ({
        ...item,
        pokemon: { ...item.pokemon },
    }));

    // Add to history at the beginning (newest first)
    this.state.generatedHistory.unshift(clonedList);

    // Limit history size to 10 entries
    if (this.state.generatedHistory.length > 10) {
        this.state.generatedHistory.pop();
    }

    // Reset current index to show the newest generation
    this.state.currentHistoryIndex = 0;

    // Update UI
    this.updateGeneratorHistoryUI();
    this.updateHistoryTab();
};

window.DexApp.Generator.updateGeneratorHistoryUI = function () {
    // Check if history exists
    const hasHistory = this.state.generatedHistory.length > 0;

    // Enable/disable navigation buttons
    const canGoPrev =
        hasHistory &&
        this.state.currentHistoryIndex < this.state.generatedHistory.length - 1;
    const canGoNext = hasHistory && this.state.currentHistoryIndex > 0;

    // Update button states
    if (this.elements.generatorPrevButton) {
        this.elements.generatorPrevButton.disabled = !canGoPrev;
    }

    if (this.elements.generatorNextButton) {
        this.elements.generatorNextButton.disabled = !canGoNext;
    }

    // Update shiny counter
    const shinyCounter = document.getElementById("shiny-count");
    if (shinyCounter) {
        shinyCounter.textContent = `(${this.state.shiniesFound.length})`;
    }
};

window.DexApp.Generator.updateHistoryTab = function () {
    // Get history tab content
    const historyTab = document.getElementById("generator-full-history");
    if (!historyTab) return;

    // Check if we have history
    if (this.state.generatedHistory.length === 0) {
        historyTab.innerHTML =
            '<p class="text-center text-[var(--color-text-secondary)] italic p-4">No generation history yet.</p>';
        return;
    }

    // Clear tab content
    historyTab.innerHTML = "";

    // Loop through history entries
    this.state.generatedHistory.forEach((generation, index) => {
        // Create history item
        const historyItem = document.createElement("div");
        historyItem.className = "history-generation-item";

        // Calculate how many shinies in this generation
        const shinyCount = generation.filter((result) => result.isShiny).length;

        // Create the content
        historyItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <span>Generation ${index + 1}</span>
                    <span>(${generation.length} Pokémon)</span>
                    ${
                        shinyCount > 0
                            ? `<span class="shiny-star" title="${shinyCount} Shiny">★ ${shinyCount}</span>`
                            : ""
                    }
                </div>
                <button class="text-xs text-[var(--color-accent)] hover:underline">View</button>
            </div>
        `;

        // Add click handler
        historyItem.addEventListener("click", () => {
            // Set current index
            this.state.currentHistoryIndex = index;

            // Display this generation
            this.displayGeneratorResults(this.state.generatedHistory[index]);

            // Switch to results tab
            const resultsTab = document.querySelector(
                '.generator-results-tab-button[data-tab="current-generation-tab"]'
            );
            if (resultsTab) {
                resultsTab.click();
            }
        });

        // Add to history tab
        historyTab.appendChild(historyItem);
    });
};

window.DexApp.Generator.showPreviousGeneration = function () {
    if (
        this.state.currentHistoryIndex <
        this.state.generatedHistory.length - 1
    ) {
        this.state.currentHistoryIndex++;
        this.displayGeneratorResults(
            this.state.generatedHistory[this.state.currentHistoryIndex]
        );
    }
};

window.DexApp.Generator.showNextGeneration = function () {
    if (this.state.currentHistoryIndex > 0) {
        this.state.currentHistoryIndex--;
        this.displayGeneratorResults(
            this.state.generatedHistory[this.state.currentHistoryIndex]
        );
    }
};

// --- Shiny History Management ---
window.DexApp.Generator.addToShinyHistory = function (pokemonResult) {
    const pokemonData = pokemonResult.pokemon;
    const pokemonId = pokemonData.id;

    // Check if already in history
    if (this.state.shiniesFound.some((s) => s.pokemon.id === pokemonId)) {
        return;
    }

    // Create shiny data object
    const shinyData = {
        pokemon: {
            id: pokemonId,
            name: pokemonData.name,
            sprite:
                pokemonData.shinySprite ||
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`,
        },
        date: new Date().toISOString(),
    };

    // Add to history at the beginning (newest first)
    this.state.shiniesFound.unshift(shinyData);

    // Save to local storage
    if (window.DexApp.Utils?.storage?.saveToLocalStorage) {
        window.DexApp.Utils.storage.saveToLocalStorage(
            "dex-shinies",
            this.state.shiniesFound
        );
    } else {
        // Fallback if Utils not available
        try {
            localStorage.setItem(
                "dex-shinies",
                JSON.stringify(this.state.shiniesFound)
            );
        } catch (e) {
            console.error("Error saving shiny history to localStorage:", e);
        }
    }

    // Update UI
    this.updateShinyHistoryUI();
};

window.DexApp.Generator.updateShinyHistoryUI = function () {
    const container = this.elements.generatorShinyHistory;
    if (!container) return;

    // Clear container
    container.innerHTML = "";

    // Check if we have shinies
    if (this.state.shiniesFound.length === 0) {
        container.innerHTML =
            '<p class="no-shinies col-span-full">No shiny Pokémon found yet.</p>';

        // Update counter
        const sc = document.getElementById("shiny-count");
        if (sc) sc.textContent = `(0)`;

        return;
    }

    // Create shiny list
    const shinyList = document.createElement("div");
    shinyList.className = "shiny-list";

    // Add each shiny
    this.state.shiniesFound.forEach((shiny) => {
        const shinyCard = document.createElement("div");
        shinyCard.className = "shiny-card";

        const p = shiny.pokemon;

        // Format name
        const n = window.DexApp.Utils?.formatters?.formatName
            ? window.DexApp.Utils.formatters.formatName(p.name)
            : p.name
                  .split("-")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" ");

        // Format date
        const d = shiny.date
            ? new Date(shiny.date).toLocaleDateString()
            : "Unknown";

        // Create card content
        shinyCard.innerHTML = `
            <img src="${
                p.sprite || "https://placehold.co/40x40/cccccc/ffffff?text=?"
            }" 
                 alt="Shiny ${n}" class="shiny-image" loading="lazy" 
                 onerror="this.onerror=null; this.src='https://placehold.co/40x40/cccccc/ffffff?text=?'">
            <div class="shiny-info">
                <div class="shiny-name">${n}</div>
                <div class="shiny-date">Found: ${d}</div>
            </div>
            <button class="view-dex-button" data-identifier="${p.name}" 
                    title="View ${n} in Pokédex">View</button>
        `;

        // Add view button click handler
        shinyCard
            .querySelector(".view-dex-button")
            .addEventListener("click", (e) => {
                e.stopPropagation();

                const id = e.currentTarget.dataset.identifier;

                // Close generator lightbox if Lightbox module is available
                if (window.DexApp.Lightbox?.closeGeneratorLightbox) {
                    window.DexApp.Lightbox.closeGeneratorLightbox();
                }

                // Open detail view if available
                if (id && window.DexApp.DetailView?.fetchAndDisplayDetailData) {
                    setTimeout(() => {
                        window.DexApp.DetailView.fetchAndDisplayDetailData(
                            id,
                            "generator"
                        );
                    }, 150);
                }
            });

        // Add to list
        shinyList.appendChild(shinyCard);
    });

    // Add clear button
    const clearBtnContainer = document.createElement("div");
    const clearBtn = document.createElement("button");
    clearBtn.className = "clear-shinies-button";
    clearBtn.textContent = "Clear Shiny History";
    clearBtn.addEventListener("click", () => this.clearShinyHistory());
    clearBtnContainer.appendChild(clearBtn);

    // Add elements to container
    container.appendChild(shinyList);
    container.appendChild(clearBtnContainer);

    // Update counter
    const shinyCounter = document.getElementById("shiny-count");
    if (shinyCounter) {
        shinyCounter.textContent = `(${this.state.shiniesFound.length})`;
    }
};

window.DexApp.Generator.clearShinyHistory = function () {
    if (
        confirm(
            "Are you sure you want to clear the shiny Pokémon history? This cannot be undone."
        )
    ) {
        // Clear shinies
        this.state.shiniesFound = [];

        // Clear from storage
        if (window.DexApp.Utils?.storage?.removeFromLocalStorage) {
            window.DexApp.Utils.storage.removeFromLocalStorage("dex-shinies");
        } else {
            // Fallback if Utils not available
            try {
                localStorage.removeItem("dex-shinies");
            } catch (e) {
                console.error(
                    "Error clearing shiny history from localStorage:",
                    e
                );
            }
        }

        // Update UI
        this.updateShinyHistoryUI();
        console.log("Shiny history cleared.");
    }
};

window.DexApp.Generator.loadShinyHistory = function () {
    try {
        // Get shiny history from storage
        let saved;

        if (window.DexApp.Utils?.storage?.getFromLocalStorage) {
            saved = window.DexApp.Utils.storage.getFromLocalStorage(
                "dex-shinies",
                []
            );
        } else {
            // Fallback if Utils not available
            const savedJson = localStorage.getItem("dex-shinies");
            saved = savedJson ? JSON.parse(savedJson) : [];
        }

        this.state.shiniesFound = Array.isArray(saved) ? saved : [];
        this.updateShinyHistoryUI();
    } catch (e) {
        console.error("Error loading shiny history from localStorage:", e);
        this.state.shiniesFound = [];
    }
};

// Add tracking for script load if diagnostic script is loaded
if (window.trackScriptLoad) {
    window.trackScriptLoad("generator.js");
}

console.log("Generator module loaded (v3.2.0)");

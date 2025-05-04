/**
 * Glow Effect Module
 * Dynamically applies a breathing glow effect to specified elements.
 */
const GlowEffect = (() => {
    let intervalId = null;
    let currentGlowingElement = null;

    /**
     * Apply the breathing glow effect to a random element.
     * @param {NodeListOf<Element>} elements - The elements to apply the effect to.
     */
    const applyGlowEffect = (elements) => {
        if (!elements || elements.length === 0) {
            console.warn("[GlowEffect] No eligible elements found.");
            return;
        }

        // Remove the glow effect from the previous element
        if (currentGlowingElement) {
            currentGlowingElement.classList.remove("breathing");
            console.log(`[GlowEffect] Removed glow effect from element.`);
        }

        // Select a random element and apply the glow effect
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        randomElement.classList.add("breathing");
        currentGlowingElement = randomElement;

        console.log(`[GlowEffect] Applied glow effect to element:`, randomElement);
    };

    /**
     * Start the breathing glow effect on a set of elements.
     * @param {string} selector - The CSS selector for the elements.
     * @param {number} interval - The interval in milliseconds for the effect.
     */
    const start = (selector, interval = 5000) => {
        const elements = document.querySelectorAll(selector);
        if (!elements || elements.length === 0) {
            console.error(`[GlowEffect] No elements found for selector: ${selector}`);
            return;
        }

        console.log(`[GlowEffect] Starting glow effect for selector: ${selector}`);
        applyGlowEffect(elements); // Apply immediately
        intervalId = setInterval(() => applyGlowEffect(elements), interval);
    };

    /**
     * Stop the breathing glow effect.
     */
    const stop = () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            console.log("[GlowEffect] Stopped glow effect.");
        }

        // Remove the glow effect from the current element
        if (currentGlowingElement) {
            currentGlowingElement.classList.remove("breathing");
            currentGlowingElement = null;
        }
    };

    return { start, stop };
})();

// Export the module for use in other scripts
window.GlowEffect = GlowEffect;
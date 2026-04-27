// color-inventory.js - HUD for displaying color particles

const ColorInventoryUI = (() => {
    let container = null;
    let colorSlots = {};
    let isInitialized = false;

    function init() {
        createUI();
        update();
        isInitialized = true;
        console.log('ColorInventoryUI initialized');
    }

    function createUI() {
        // Create main container
        container = document.createElement('div');
        container.id = 'color-inventory';
        container.className = 'color-inventory';

        // Create header
        const header = document.createElement('div');
        header.className = 'color-inventory-header';
        header.innerHTML = '<span class="color-icon">&#9670;</span> CHROMATIC ESSENCE';
        container.appendChild(header);

        // Create color slots container
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'color-slots';

        // Create a slot for each color
        const colors = ColorSystem.getAllColorTypes();
        for (const [colorType, colorData] of Object.entries(colors)) {
            const slot = createColorSlot(colorType, colorData);
            slotsContainer.appendChild(slot);
            colorSlots[colorType] = slot;
        }

        container.appendChild(slotsContainer);

        // Add to HUD
        const hud = document.getElementById('hud');
        if (hud) {
            hud.appendChild(container);
        } else {
            document.body.appendChild(container);
        }

        // Add click handlers for selection
        addClickHandlers();
    }

    function createColorSlot(colorType, colorData) {
        const slot = document.createElement('div');
        slot.className = 'color-slot';
        slot.dataset.color = colorType;
        slot.title = `${colorData.name} - ${colorData.description}`;

        // Color orb
        const orb = document.createElement('div');
        orb.className = 'color-orb';
        orb.style.backgroundColor = colorData.hex;
        orb.style.boxShadow = `0 0 10px ${colorData.hex}40, inset 0 -5px 10px rgba(0,0,0,0.3)`;

        // Count display
        const count = document.createElement('span');
        count.className = 'color-count';
        count.textContent = '0';

        // Element label
        const label = document.createElement('span');
        label.className = 'color-label';
        label.textContent = colorData.element.substring(0, 3).toUpperCase();

        slot.appendChild(orb);
        slot.appendChild(count);
        slot.appendChild(label);

        return slot;
    }

    function addClickHandlers() {
        for (const [colorType, slot] of Object.entries(colorSlots)) {
            slot.addEventListener('click', () => {
                const inventory = ColorSystem.getInventory();
                if (inventory[colorType] <= 0) {
                    return; // No color to use
                }

                // Check if in combat - if so, cast spell
                const state = GameEngine.getState();
                if (state.inCombat) {
                    // Cast color spell
                    Combat.castColorSpell(colorType);
                    // Show use animation
                    showUseAnimation(colorType);
                    // Update display
                    update();
                } else {
                    // Outside combat, just select the color
                    ColorSystem.selectColor(colorType);
                }
            });

            // Right-click to deselect
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                ColorSystem.selectColor(null);
            });
        }
    }

    function update() {
        if (!container) return;

        const inventory = ColorSystem.getInventory();
        const stats = ColorSystem.getExtractionStats();
        const state = GameEngine.getState();
        const inCombat = state && state.inCombat;

        // Update combat mode indicator
        if (inCombat) {
            container.classList.add('combat-mode');
        } else {
            container.classList.remove('combat-mode');
        }

        for (const [colorType, count] of Object.entries(inventory)) {
            const slot = colorSlots[colorType];
            if (!slot) continue;

            const countEl = slot.querySelector('.color-count');
            const orbEl = slot.querySelector('.color-orb');

            // Update count
            countEl.textContent = count;

            // Update visual state
            if (count === 0) {
                slot.classList.add('empty');
                slot.classList.remove('full', 'castable');
                orbEl.style.opacity = '0.3';
            } else if (count >= stats.maxStorage) {
                slot.classList.remove('empty');
                slot.classList.add('full');
                if (inCombat) slot.classList.add('castable');
                orbEl.style.opacity = '1';
            } else {
                slot.classList.remove('empty', 'full');
                if (inCombat && count > 0) slot.classList.add('castable');
                else slot.classList.remove('castable');
                orbEl.style.opacity = 0.3 + (count / stats.maxStorage) * 0.7;
            }
        }

        // Update total display
        updateTotalDisplay();

        // Update combat hint
        updateCombatHint(inCombat);
    }

    function updateCombatHint(inCombat) {
        let hintEl = container.querySelector('.color-combat-hint');
        if (!hintEl) {
            hintEl = document.createElement('div');
            hintEl.className = 'color-combat-hint';
            container.appendChild(hintEl);
        }

        if (inCombat) {
            hintEl.textContent = 'Click a color to cast!';
            hintEl.classList.add('visible');
        } else {
            hintEl.classList.remove('visible');
        }
    }

    function updateTotalDisplay() {
        let totalEl = container.querySelector('.color-total');
        if (!totalEl) {
            totalEl = document.createElement('div');
            totalEl.className = 'color-total';
            container.appendChild(totalEl);
        }

        const total = ColorSystem.getTotalParticles();
        const max = ColorSystem.getExtractionStats().totalMaxStorage;
        totalEl.textContent = `${total}/${max}`;
    }

    function updateSelection(selectedColor) {
        // Remove selection from all slots
        for (const slot of Object.values(colorSlots)) {
            slot.classList.remove('selected');
        }

        // Add selection to chosen slot
        if (selectedColor && colorSlots[selectedColor]) {
            colorSlots[selectedColor].classList.add('selected');
        }
    }

    // Show extraction animation (particle flying to inventory)
    function showExtractionAnimation(colorType, startPosition) {
        const slot = colorSlots[colorType];
        if (!slot) return;

        const colorData = ColorSystem.getColorData(colorType);

        // Create floating particle
        const particle = document.createElement('div');
        particle.className = 'extraction-particle';
        particle.style.backgroundColor = colorData.hex;
        particle.style.boxShadow = `0 0 20px ${colorData.hex}`;
        particle.style.left = `${startPosition.x}px`;
        particle.style.top = `${startPosition.y}px`;

        document.body.appendChild(particle);

        // Get slot position
        const slotRect = slot.getBoundingClientRect();
        const targetX = slotRect.left + slotRect.width / 2;
        const targetY = slotRect.top + slotRect.height / 2;

        // Animate to slot
        requestAnimationFrame(() => {
            particle.style.left = `${targetX}px`;
            particle.style.top = `${targetY}px`;
            particle.style.transform = 'scale(0.5)';
            particle.style.opacity = '0';
        });

        // Flash the slot
        setTimeout(() => {
            slot.classList.add('flash');
            setTimeout(() => slot.classList.remove('flash'), 300);
        }, 400);

        // Remove particle
        setTimeout(() => {
            particle.remove();
        }, 500);
    }

    // Show use animation (particle consumed)
    function showUseAnimation(colorType) {
        const slot = colorSlots[colorType];
        if (!slot) return;

        slot.classList.add('used');
        setTimeout(() => slot.classList.remove('used'), 200);
    }

    function show() {
        if (container) {
            container.classList.remove('hidden');
        }
    }

    function hide() {
        if (container) {
            container.classList.add('hidden');
        }
    }

    return {
        init,
        update,
        updateSelection,
        showExtractionAnimation,
        showUseAnimation,
        show,
        hide
    };
})();

// Expose to window
window.ColorInventoryUI = ColorInventoryUI;

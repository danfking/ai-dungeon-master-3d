// painters-palette.js - Painter's palette UI with particle life visualization

const PaintersPalette = (() => {
    let canvas = null;
    let ctx = null;
    let container = null;
    let isInitialized = false;
    let animationFrame = null;

    // Particle system
    const particles = [];
    const MAX_PARTICLES_PER_COLOR = 15;

    // Palette layout - circular arrangement
    const paletteCenter = { x: 0, y: 0 };
    const paletteRadius = 60;

    // Color positions on the palette (arranged in a circle)
    const colorPositions = {
        crimson: { angle: 0 },
        amber: { angle: Math.PI / 3 },
        verdant: { angle: 2 * Math.PI / 3 },
        azure: { angle: Math.PI },
        violet: { angle: 4 * Math.PI / 3 },
        ivory: { angle: 5 * Math.PI / 3 }
    };

    // Particle class
    class PaletteParticle {
        constructor(colorType, colorData) {
            this.colorType = colorType;
            this.color = colorData.hex;
            this.x = 0;
            this.y = 0;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2;
            this.size = 4 + Math.random() * 3;
            this.homeX = 0;
            this.homeY = 0;
            this.life = 1;
            this.phase = Math.random() * Math.PI * 2;
        }

        setHome(x, y) {
            this.homeX = x;
            this.homeY = y;
            // Start at home with some offset
            this.x = x + (Math.random() - 0.5) * 20;
            this.y = y + (Math.random() - 0.5) * 20;
        }

        update(particles, dt) {
            // Attraction to home position
            const dx = this.homeX - this.x;
            const dy = this.homeY - this.y;
            const distToHome = Math.sqrt(dx * dx + dy * dy);

            // Gentle pull toward home
            if (distToHome > 5) {
                this.vx += dx * 0.02;
                this.vy += dy * 0.02;
            }

            // Interaction with other particles of same color
            for (const other of particles) {
                if (other === this) continue;

                const ox = other.x - this.x;
                const oy = other.y - this.y;
                const dist = Math.sqrt(ox * ox + oy * oy);

                if (dist < 1) continue;

                // Same color: gentle attraction at medium range, repulsion at close range
                if (other.colorType === this.colorType) {
                    if (dist < 10) {
                        // Repel when too close
                        const force = (10 - dist) * 0.05;
                        this.vx -= (ox / dist) * force;
                        this.vy -= (oy / dist) * force;
                    } else if (dist < 30) {
                        // Attract at medium range
                        const force = 0.01;
                        this.vx += (ox / dist) * force;
                        this.vy += (oy / dist) * force;
                    }
                } else {
                    // Different colors: slight repulsion
                    if (dist < 25) {
                        const force = (25 - dist) * 0.01;
                        this.vx -= (ox / dist) * force;
                        this.vy -= (oy / dist) * force;
                    }
                }
            }

            // Apply velocity with damping
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.95;
            this.vy *= 0.95;

            // Boundary constraints (keep in canvas)
            const margin = 10;
            const width = canvas.width;
            const height = canvas.height;

            if (this.x < margin) { this.x = margin; this.vx *= -0.5; }
            if (this.x > width - margin) { this.x = width - margin; this.vx *= -0.5; }
            if (this.y < margin) { this.y = margin; this.vy *= -0.5; }
            if (this.y > height - margin) { this.y = height - margin; this.vy *= -0.5; }

            // Update phase for shimmer
            this.phase += 0.05;
        }

        draw(ctx) {
            const shimmer = 0.8 + Math.sin(this.phase) * 0.2;

            // Glow
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.size * 2
            );
            gradient.addColorStop(0, this.color + '40');
            gradient.addColorStop(1, this.color + '00');
            ctx.fillStyle = gradient;
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * shimmer, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            // Highlight
            ctx.beginPath();
            ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
        }
    }

    function init() {
        createUI();
        isInitialized = true;
        console.log('PaintersPalette initialized');
    }

    function createUI() {
        // Create container
        container = document.createElement('div');
        container.id = 'painters-palette';
        container.className = 'painters-palette';

        // Create canvas for particle visualization
        canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        canvas.className = 'palette-canvas';
        ctx = canvas.getContext('2d');

        container.appendChild(canvas);

        // Create label
        const label = document.createElement('div');
        label.className = 'palette-label';
        label.textContent = 'PALETTE';
        container.appendChild(label);

        // Add to document
        document.body.appendChild(container);

        // Calculate center
        paletteCenter.x = canvas.width / 2;
        paletteCenter.y = canvas.height / 2;

        // Start animation loop
        animate();
    }

    function syncParticles() {
        if (!ColorSystem) return;

        const inventory = ColorSystem.getInventory();
        const colorTypes = ColorSystem.getAllColorTypes();

        for (const [colorType, count] of Object.entries(inventory)) {
            const colorData = colorTypes[colorType];
            if (!colorData) continue;

            // Get current particles of this color
            const currentParticles = particles.filter(p => p.colorType === colorType);
            const targetCount = Math.min(count, MAX_PARTICLES_PER_COLOR);

            // Calculate home position for this color
            const posInfo = colorPositions[colorType];
            const homeX = paletteCenter.x + Math.cos(posInfo.angle) * paletteRadius * 0.5;
            const homeY = paletteCenter.y + Math.sin(posInfo.angle) * paletteRadius * 0.5;

            // Add particles if needed
            if (currentParticles.length < targetCount) {
                const toAdd = targetCount - currentParticles.length;
                for (let i = 0; i < toAdd; i++) {
                    const p = new PaletteParticle(colorType, colorData);
                    p.setHome(homeX, homeY);
                    particles.push(p);
                }
            }

            // Remove particles if needed
            if (currentParticles.length > targetCount) {
                const toRemove = currentParticles.length - targetCount;
                for (let i = 0; i < toRemove; i++) {
                    const idx = particles.findIndex(p => p.colorType === colorType);
                    if (idx !== -1) {
                        particles.splice(idx, 1);
                    }
                }
            }

            // Update home positions for existing particles
            currentParticles.forEach(p => {
                p.homeX = homeX + (Math.random() - 0.5) * 15;
                p.homeY = homeY + (Math.random() - 0.5) * 15;
            });
        }
    }

    function animate() {
        animationFrame = requestAnimationFrame(animate);

        // Sync particles with inventory periodically
        if (Math.random() < 0.05) {
            syncParticles();
        }

        // Clear canvas
        ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw palette background (wooden palette shape)
        drawPaletteBackground();

        // Update and draw particles
        const dt = 1 / 60;
        for (const p of particles) {
            p.update(particles, dt);
        }

        // Sort by size for depth effect
        particles.sort((a, b) => a.size - b.size);

        for (const p of particles) {
            p.draw(ctx);
        }

        // Draw color well indicators
        drawColorWells();
    }

    function drawPaletteBackground() {
        // Draw a simple palette shape
        ctx.save();

        // Outer palette shape (rounded)
        ctx.beginPath();
        ctx.ellipse(paletteCenter.x, paletteCenter.y, 70, 65, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80, 60, 40, 0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 90, 60, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Thumb hole
        ctx.beginPath();
        ctx.arc(paletteCenter.x - 35, paletteCenter.y + 25, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 90, 60, 0.3)';
        ctx.stroke();

        ctx.restore();
    }

    function drawColorWells() {
        const colorTypes = ColorSystem ? ColorSystem.getAllColorTypes() : {};

        ctx.save();
        ctx.globalAlpha = 0.3;

        for (const [colorType, posInfo] of Object.entries(colorPositions)) {
            const colorData = colorTypes[colorType];
            if (!colorData) continue;

            const x = paletteCenter.x + Math.cos(posInfo.angle) * paletteRadius * 0.5;
            const y = paletteCenter.y + Math.sin(posInfo.angle) * paletteRadius * 0.5;

            // Draw small well indicator
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = colorData.hex + '40';
            ctx.fill();
            ctx.strokeStyle = colorData.hex;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    function show() {
        if (container) {
            container.classList.add('visible');
        }
    }

    function hide() {
        if (container) {
            container.classList.remove('visible');
        }
    }

    function destroy() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        particles.length = 0;
    }

    return {
        init,
        show,
        hide,
        destroy,
        syncParticles
    };
})();

// Expose to window
window.PaintersPalette = PaintersPalette;

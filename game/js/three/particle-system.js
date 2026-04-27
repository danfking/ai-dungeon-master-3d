// particle-system.js - Watercolor spell effects with instanced particles

import * as THREE from 'three';
import sceneManager from './scene-manager.js';

// Particle types for different spells
// Bubble attack configs - colored ring with transparent center
const BUBBLE_CONFIGS = {
    crimson: {
        color: new THREE.Color(0xdc143c),
        glowColor: new THREE.Color(0xff6644),
        count: 8,
        size: 0.4,
        speed: 10,
        spread: 0.15,
        lifetime: 0.8,
        ringWidth: 0.15, // Width of the bubble ring
        element: 'Fire'
    },
    azure: {
        color: new THREE.Color(0x007fff),
        glowColor: new THREE.Color(0xaaddff),
        count: 8,
        size: 0.35,
        speed: 11,
        spread: 0.12,
        lifetime: 0.75,
        ringWidth: 0.12,
        element: 'Ice'
    },
    verdant: {
        color: new THREE.Color(0x228b22),
        glowColor: new THREE.Color(0x88ff88),
        count: 6,
        size: 0.45,
        speed: 8,
        spread: 0.2,
        lifetime: 1.0,
        ringWidth: 0.18,
        element: 'Nature'
    },
    amber: {
        color: new THREE.Color(0xffbf00),
        glowColor: new THREE.Color(0xffffaa),
        count: 10,
        size: 0.3,
        speed: 16,
        spread: 0.1,
        lifetime: 0.5,
        ringWidth: 0.1,
        element: 'Lightning'
    },
    violet: {
        color: new THREE.Color(0x8b00ff),
        glowColor: new THREE.Color(0xcc88ff),
        count: 7,
        size: 0.5,
        speed: 9,
        spread: 0.18,
        lifetime: 0.9,
        ringWidth: 0.2,
        element: 'Arcane'
    },
    ivory: {
        color: new THREE.Color(0xfffff0),
        glowColor: new THREE.Color(0xffffff),
        count: 6,
        size: 0.4,
        speed: 10,
        spread: 0.15,
        lifetime: 0.85,
        ringWidth: 0.14,
        element: 'Light'
    }
};

// Enemy attack configs - solid colored projectiles (opposite of player bubbles)
const ENEMY_ATTACK_CONFIGS = {
    // Based on enemy color affinity from combat system
    azure: {  // Undead - cold death energy
        color: new THREE.Color(0x4477aa),
        glowColor: new THREE.Color(0x88aacc),
        count: 6,
        size: 0.35,
        speed: 12,
        spread: 0.2,
        lifetime: 0.6,
        damage: 'normal'
    },
    verdant: {  // Living creatures - poison/nature
        color: new THREE.Color(0x336633),
        glowColor: new THREE.Color(0x66aa66),
        count: 8,
        size: 0.25,
        speed: 10,
        spread: 0.3,
        lifetime: 0.7,
        damage: 'poison'
    },
    violet: {  // Magic users - dark arcane
        color: new THREE.Color(0x663388),
        glowColor: new THREE.Color(0x9955cc),
        count: 5,
        size: 0.4,
        speed: 14,
        spread: 0.15,
        lifetime: 0.5,
        damage: 'magic'
    },
    crimson: {  // Feral - aggressive red
        color: new THREE.Color(0x993333),
        glowColor: new THREE.Color(0xcc5555),
        count: 10,
        size: 0.2,
        speed: 16,
        spread: 0.25,
        lifetime: 0.4,
        damage: 'bleed'
    },
    ivory: {  // Default/neutral
        color: new THREE.Color(0x777777),
        glowColor: new THREE.Color(0xaaaaaa),
        count: 6,
        size: 0.3,
        speed: 11,
        spread: 0.2,
        lifetime: 0.55,
        damage: 'normal'
    }
};

const SPELL_CONFIGS = {
    attack: {
        color: new THREE.Color(0xcccccc),
        secondaryColor: new THREE.Color(0xffffff),
        count: 30,
        size: 0.15,
        speed: 15,
        spread: 0.3,
        lifetime: 0.4,
        trail: true
    },
    arcane: {
        color: new THREE.Color(0x7a5aaa),
        secondaryColor: new THREE.Color(0xaa7aff),
        count: 50,
        size: 0.2,
        speed: 12,
        spread: 0.5,
        lifetime: 0.6,
        trail: true
    },
    heal: {
        color: new THREE.Color(0x5a8a5a),
        secondaryColor: new THREE.Color(0x8aff8a),
        count: 40,
        size: 0.25,
        speed: 3,
        spread: 1.5,
        lifetime: 1.2,
        trail: false,
        upward: true
    },
    hit: {
        color: new THREE.Color(0xff6644),
        secondaryColor: new THREE.Color(0xffaa44),
        count: 20,
        size: 0.2,
        speed: 5,
        spread: 1.0,
        lifetime: 0.5,
        trail: false
    },
    death: {
        color: new THREE.Color(0x333344),
        secondaryColor: new THREE.Color(0x555566),
        count: 60,
        size: 0.3,
        speed: 2,
        spread: 2.0,
        lifetime: 2.0,
        trail: false,
    },
    // Color spell types
    fire: {
        color: new THREE.Color(0xdc143c),
        secondaryColor: new THREE.Color(0xff6622),
        count: 45,
        size: 0.25,
        speed: 14,
        spread: 0.4,
        lifetime: 0.5,
        trail: true
    },
    ice: {
        color: new THREE.Color(0x007fff),
        secondaryColor: new THREE.Color(0xaaddff),
        count: 40,
        size: 0.2,
        speed: 13,
        spread: 0.35,
        lifetime: 0.5,
        trail: true
    },
    lightning: {
        color: new THREE.Color(0xffbf00),
        secondaryColor: new THREE.Color(0xffffaa),
        count: 35,
        size: 0.18,
        speed: 20,
        spread: 0.2,
        lifetime: 0.3,
        trail: true
    }
};

class Particle {
    constructor() {
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.color = new THREE.Color();
        this.size = 1;
        this.life = 0;
        this.maxLife = 1;
        this.active = false;
        this.random = Math.random();
    }

    reset() {
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.life = 0;
        this.active = false;
    }
}

class ParticleSystem {
    constructor() {
        this.maxParticles = 500;
        this.particles = [];
        this.geometry = null;
        this.material = null;
        this.mesh = null;

        // Attribute arrays
        this.positions = null;
        this.colors = null;
        this.sizes = null;
        this.lifes = null;
        this.randoms = null;

        // Spell queue
        this.activeSpells = [];

        // Bubble system (separate from regular particles)
        this.maxBubbles = 100;
        this.bubbles = [];
        this.bubbleGeometry = null;
        this.bubbleMaterial = null;
        this.bubbleMesh = null;
        this.bubblePositions = null;
        this.bubbleColors = null;
        this.bubbleSizes = null;
        this.bubbleLifes = null;
        this.bubbleRingWidths = null;
        this.activeBubbleSpells = [];

        // Enemy attack system (solid projectiles)
        this.maxEnemyProjectiles = 50;
        this.enemyProjectiles = [];
        this.enemyProjGeometry = null;
        this.enemyProjMaterial = null;
        this.enemyProjMesh = null;
        this.enemyProjPositions = null;
        this.enemyProjColors = null;
        this.enemyProjSizes = null;
        this.enemyProjLifes = null;
        this.activeEnemyAttacks = [];
    }

    init(scene) {
        // Initialize particle pool
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push(new Particle());
        }

        // Create geometry with instanced attributes
        this.geometry = new THREE.BufferGeometry();

        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.lifes = new Float32Array(this.maxParticles);
        this.randoms = new Float32Array(this.maxParticles);

        // Initialize randoms
        for (let i = 0; i < this.maxParticles; i++) {
            this.randoms[i] = Math.random();
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        this.geometry.setAttribute('life', new THREE.BufferAttribute(this.lifes, 1));
        this.geometry.setAttribute('random', new THREE.BufferAttribute(this.randoms, 1));

        // Custom shader material for watercolor particles
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute float life;
                attribute float random;
                attribute vec3 color;

                varying vec3 vColor;
                varying float vLife;
                varying float vRandom;

                uniform float pixelRatio;

                void main() {
                    vColor = color;
                    vLife = life;
                    vRandom = random;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;

                varying vec3 vColor;
                varying float vLife;
                varying float vRandom;

                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }

                void main() {
                    // Soft circular falloff
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center) * 2.0;

                    // Organic wobble
                    float angle = atan(center.y, center.x);
                    float wobble = sin(angle * 5.0 + vRandom * 6.28) * 0.1;
                    wobble += sin(angle * 8.0 + time * 2.0) * 0.05;

                    float softEdge = 1.0 - smoothstep(0.3, 1.0 + wobble, dist);

                    // Life-based fade
                    float lifeFade = smoothstep(0.0, 0.2, vLife) * (1.0 - smoothstep(0.7, 1.0, 1.0 - vLife));

                    // Color with edge darkening
                    vec3 color = vColor;
                    float edgeFactor = smoothstep(0.2, 0.8, dist);
                    color *= 1.0 - edgeFactor * 0.3;

                    float alpha = softEdge * lifeFade;
                    if (alpha < 0.01) discard;

                    // Add grain
                    float grain = random(gl_PointCoord * 100.0 + time) * 0.05;
                    color += vec3(grain);

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        scene.add(this.mesh);

        // Initialize bubble system
        this.initBubbleSystem(scene);

        // Initialize enemy projectile system
        this.initEnemyProjectileSystem(scene);

        console.log('ParticleSystem initialized');
    }

    initBubbleSystem(scene) {
        // Initialize bubble pool
        for (let i = 0; i < this.maxBubbles; i++) {
            const bubble = new Particle();
            bubble.ringWidth = 0.15;
            this.bubbles.push(bubble);
        }

        // Create bubble geometry
        this.bubbleGeometry = new THREE.BufferGeometry();

        this.bubblePositions = new Float32Array(this.maxBubbles * 3);
        this.bubbleColors = new Float32Array(this.maxBubbles * 3);
        this.bubbleSizes = new Float32Array(this.maxBubbles);
        this.bubbleLifes = new Float32Array(this.maxBubbles);
        this.bubbleRingWidths = new Float32Array(this.maxBubbles);

        this.bubbleGeometry.setAttribute('position', new THREE.BufferAttribute(this.bubblePositions, 3));
        this.bubbleGeometry.setAttribute('color', new THREE.BufferAttribute(this.bubbleColors, 3));
        this.bubbleGeometry.setAttribute('size', new THREE.BufferAttribute(this.bubbleSizes, 1));
        this.bubbleGeometry.setAttribute('life', new THREE.BufferAttribute(this.bubbleLifes, 1));
        this.bubbleGeometry.setAttribute('ringWidth', new THREE.BufferAttribute(this.bubbleRingWidths, 1));

        // Bubble shader - creates ring with transparent center
        this.bubbleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute float life;
                attribute float ringWidth;
                attribute vec3 color;

                varying vec3 vColor;
                varying float vLife;
                varying float vRingWidth;

                uniform float pixelRatio;

                void main() {
                    vColor = color;
                    vLife = life;
                    vRingWidth = ringWidth;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (400.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;

                varying vec3 vColor;
                varying float vLife;
                varying float vRingWidth;

                void main() {
                    // Distance from center
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center) * 2.0;

                    // Create ring shape - solid color on edge, transparent center
                    float innerRadius = 1.0 - vRingWidth * 2.0;
                    float outerRadius = 1.0;

                    // Smooth ring edges
                    float ring = smoothstep(innerRadius - 0.1, innerRadius + 0.05, dist) *
                                (1.0 - smoothstep(outerRadius - 0.1, outerRadius, dist));

                    // Add shimmer/wobble to edge
                    float angle = atan(center.y, center.x);
                    float shimmer = sin(angle * 8.0 + time * 5.0) * 0.03;
                    ring *= 1.0 + shimmer;

                    // Life-based fade and pulse
                    float lifeFade = smoothstep(0.0, 0.1, vLife) * (1.0 - smoothstep(0.8, 1.0, 1.0 - vLife));
                    float pulse = 1.0 + sin(vLife * 20.0) * 0.1;

                    // Color with inner glow
                    vec3 color = vColor * pulse;

                    // Add subtle inner glow
                    float innerGlow = smoothstep(innerRadius + 0.1, innerRadius - 0.2, dist) * 0.2;
                    color += vColor * innerGlow;

                    float alpha = ring * lifeFade;
                    if (alpha < 0.02) discard;

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.bubbleMesh = new THREE.Points(this.bubbleGeometry, this.bubbleMaterial);
        this.bubbleMesh.frustumCulled = false;
        this.bubbleMesh.renderOrder = 5; // Render after regular particles
        scene.add(this.bubbleMesh);
    }

    initEnemyProjectileSystem(scene) {
        // Initialize enemy projectile pool
        for (let i = 0; i < this.maxEnemyProjectiles; i++) {
            this.enemyProjectiles.push(new Particle());
        }

        // Create geometry
        this.enemyProjGeometry = new THREE.BufferGeometry();

        this.enemyProjPositions = new Float32Array(this.maxEnemyProjectiles * 3);
        this.enemyProjColors = new Float32Array(this.maxEnemyProjectiles * 3);
        this.enemyProjSizes = new Float32Array(this.maxEnemyProjectiles);
        this.enemyProjLifes = new Float32Array(this.maxEnemyProjectiles);

        this.enemyProjGeometry.setAttribute('position', new THREE.BufferAttribute(this.enemyProjPositions, 3));
        this.enemyProjGeometry.setAttribute('color', new THREE.BufferAttribute(this.enemyProjColors, 3));
        this.enemyProjGeometry.setAttribute('size', new THREE.BufferAttribute(this.enemyProjSizes, 1));
        this.enemyProjGeometry.setAttribute('life', new THREE.BufferAttribute(this.enemyProjLifes, 1));

        // Solid projectile shader - menacing enemy attacks
        this.enemyProjMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute float life;
                attribute vec3 color;

                varying vec3 vColor;
                varying float vLife;

                uniform float pixelRatio;

                void main() {
                    vColor = color;
                    vLife = life;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (350.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;

                varying vec3 vColor;
                varying float vLife;

                void main() {
                    // Distance from center
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center) * 2.0;

                    // Solid circle with soft edge
                    float circle = 1.0 - smoothstep(0.6, 1.0, dist);

                    // Inner glow - brighter center
                    float innerGlow = 1.0 - smoothstep(0.0, 0.5, dist);

                    // Pulsing dark energy effect
                    float pulse = 0.8 + sin(vLife * 30.0 + time * 10.0) * 0.2;

                    // Life fade
                    float lifeFade = smoothstep(0.0, 0.15, vLife) * (1.0 - smoothstep(0.7, 1.0, 1.0 - vLife));

                    // Color with dark core and bright edge
                    vec3 color = vColor * (0.7 + innerGlow * 0.5) * pulse;

                    // Add dark aura
                    float aura = smoothstep(0.4, 0.9, dist) * 0.3;
                    color = mix(color, vec3(0.1, 0.05, 0.15), aura);

                    float alpha = circle * lifeFade;
                    if (alpha < 0.02) discard;

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.enemyProjMesh = new THREE.Points(this.enemyProjGeometry, this.enemyProjMaterial);
        this.enemyProjMesh.frustumCulled = false;
        this.enemyProjMesh.renderOrder = 6;
        scene.add(this.enemyProjMesh);
    }

    getInactiveParticle() {
        for (const p of this.particles) {
            if (!p.active) return p;
        }
        return null;
    }

    emitSpell(type, origin, target) {
        const config = SPELL_CONFIGS[type];
        if (!config) {
            console.warn(`Unknown spell type: ${type}`);
            return;
        }

        const spell = {
            type,
            config,
            origin: origin.clone(),
            target: target ? target.clone() : null,
            particleCount: 0,
            maxParticles: config.count,
            emitRate: config.count / (config.lifetime * 0.3),
            emitAccumulator: 0,
            elapsed: 0,
            duration: config.lifetime
        };

        this.activeSpells.push(spell);
    }

    // Emit a spell from player (bottom center) toward enemy
    castSpell(type, enemyPosition) {
        const origin = new THREE.Vector3(0, 0.5, 0); // Player hands
        this.emitSpell(type, origin, enemyPosition);
    }

    // Emit heal effect around player
    playHealEffect() {
        const origin = new THREE.Vector3(0, 1.0, 0);
        this.emitSpell('heal', origin, null);
    }

    // Emit hit effect at enemy position
    playHitEffect(position, isCritical = false) {
        const config = { ...SPELL_CONFIGS.hit };
        if (isCritical) {
            config.count *= 2;
            config.size *= 1.5;
        }
        this.emitSpell('hit', position, null);
    }

    // Emit death effect
    playDeathEffect(position) {
        this.emitSpell('death', position, null);
    }

    update(delta) {
        const time = sceneManager.getClock().getElapsedTime();
        this.material.uniforms.time.value = time;

        // Update active spells
        for (let i = this.activeSpells.length - 1; i >= 0; i--) {
            const spell = this.activeSpells[i];
            spell.elapsed += delta;
            spell.emitAccumulator += delta * spell.emitRate;

            // Emit new particles
            while (spell.emitAccumulator >= 1 && spell.particleCount < spell.maxParticles) {
                this.emitParticle(spell);
                spell.emitAccumulator -= 1;
                spell.particleCount++;
            }

            // Remove finished spells
            if (spell.elapsed > spell.duration * 2) {
                this.activeSpells.splice(i, 1);
            }
        }

        // Update all particles
        let activeCount = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            if (p.active) {
                p.life += delta / p.maxLife;

                if (p.life >= 1) {
                    p.reset();
                } else {
                    // Update position
                    p.position.add(p.velocity.clone().multiplyScalar(delta));

                    // Apply gravity/drag
                    p.velocity.multiplyScalar(0.98);

                    // Update buffers
                    const i3 = i * 3;
                    this.positions[i3] = p.position.x;
                    this.positions[i3 + 1] = p.position.y;
                    this.positions[i3 + 2] = p.position.z;

                    this.colors[i3] = p.color.r;
                    this.colors[i3 + 1] = p.color.g;
                    this.colors[i3 + 2] = p.color.b;

                    this.sizes[i] = p.size * (1 - p.life * 0.5);
                    this.lifes[i] = p.life;

                    activeCount++;
                }
            } else {
                // Hide inactive particles
                this.sizes[i] = 0;
            }
        }

        // Mark attributes for update
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
        this.geometry.attributes.life.needsUpdate = true;

        // Update bubble system
        this.updateBubbles(delta);

        // Update enemy projectiles
        this.updateEnemyProjectiles(delta);
    }

    emitParticle(spell) {
        const p = this.getInactiveParticle();
        if (!p) return;

        const config = spell.config;
        p.active = true;
        p.life = 0;
        p.maxLife = config.lifetime;
        p.size = config.size * (0.8 + Math.random() * 0.4);
        p.random = Math.random();

        // Color variation
        const colorMix = Math.random();
        p.color.copy(config.color).lerp(config.secondaryColor, colorMix);

        // Position
        p.position.copy(spell.origin);
        p.position.x += (Math.random() - 0.5) * config.spread * 0.3;
        p.position.y += (Math.random() - 0.5) * config.spread * 0.3;
        p.position.z += (Math.random() - 0.5) * config.spread * 0.3;

        // Velocity
        if (spell.target) {
            // Aimed spell
            const direction = spell.target.clone().sub(spell.origin).normalize();
            p.velocity.copy(direction).multiplyScalar(config.speed);

            // Add spread
            p.velocity.x += (Math.random() - 0.5) * config.spread;
            p.velocity.y += (Math.random() - 0.5) * config.spread;
            p.velocity.z += (Math.random() - 0.5) * config.spread;
        } else if (config.upward) {
            // Upward effect (heal, death)
            p.velocity.set(
                (Math.random() - 0.5) * config.spread,
                config.speed * (0.5 + Math.random() * 0.5),
                (Math.random() - 0.5) * config.spread
            );
        } else {
            // Burst effect
            p.velocity.set(
                (Math.random() - 0.5) * config.speed,
                (Math.random() - 0.5) * config.speed,
                (Math.random() - 0.5) * config.speed
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BUBBLE ATTACK SYSTEM - Chromatic bubble projectiles
    // ═══════════════════════════════════════════════════════════════

    getInactiveBubble() {
        for (const b of this.bubbles) {
            if (!b.active) return b;
        }
        return null;
    }

    // Cast bubble attack toward enemy
    castBubbleAttack(colorType, enemyPosition) {
        const config = BUBBLE_CONFIGS[colorType];
        if (!config) {
            console.warn(`Unknown bubble color: ${colorType}`);
            return;
        }

        const origin = new THREE.Vector3(0, 1.0, 0); // Player hands/weapon position

        const spell = {
            type: 'bubble',
            colorType,
            config,
            origin: origin.clone(),
            target: enemyPosition.clone(),
            bubbleCount: 0,
            maxBubbles: config.count,
            emitRate: config.count / 0.3, // Emit all bubbles in ~0.3 seconds
            emitAccumulator: 0,
            elapsed: 0,
            duration: config.lifetime + 0.5
        };

        this.activeBubbleSpells.push(spell);

        // Return info for combat system
        return {
            colorType,
            element: config.element,
            bubbleCount: config.count
        };
    }

    emitBubble(spell) {
        const b = this.getInactiveBubble();
        if (!b) return;

        const config = spell.config;
        b.active = true;
        b.life = 0;
        b.maxLife = config.lifetime;
        b.size = config.size * (0.9 + Math.random() * 0.2);
        b.ringWidth = config.ringWidth;
        b.random = Math.random();

        // Color with slight variation
        const colorMix = Math.random() * 0.3;
        b.color.copy(config.color).lerp(config.glowColor, colorMix);

        // Position - start at origin with slight offset
        b.position.copy(spell.origin);
        b.position.x += (Math.random() - 0.5) * config.spread;
        b.position.y += (Math.random() - 0.5) * config.spread;

        // Velocity - fly toward enemy with spread
        const direction = spell.target.clone().sub(spell.origin).normalize();
        b.velocity.copy(direction).multiplyScalar(config.speed);

        // Add slight spread for stream effect
        b.velocity.x += (Math.random() - 0.5) * config.spread * 3;
        b.velocity.y += (Math.random() - 0.5) * config.spread * 3;

        // Stagger timing
        b.life = -Math.random() * 0.1; // Negative life = delayed start
    }

    updateBubbles(delta) {
        const time = sceneManager.getClock().getElapsedTime();
        this.bubbleMaterial.uniforms.time.value = time;

        // Update active bubble spells
        for (let i = this.activeBubbleSpells.length - 1; i >= 0; i--) {
            const spell = this.activeBubbleSpells[i];
            spell.elapsed += delta;
            spell.emitAccumulator += delta * spell.emitRate;

            // Emit new bubbles
            while (spell.emitAccumulator >= 1 && spell.bubbleCount < spell.maxBubbles) {
                this.emitBubble(spell);
                spell.emitAccumulator -= 1;
                spell.bubbleCount++;
            }

            // Remove finished spells
            if (spell.elapsed > spell.duration) {
                this.activeBubbleSpells.splice(i, 1);
            }
        }

        // Update all bubbles
        for (let i = 0; i < this.bubbles.length; i++) {
            const b = this.bubbles[i];

            if (b.active) {
                b.life += delta / b.maxLife;

                if (b.life >= 1) {
                    b.reset();
                } else if (b.life > 0) { // Only render if life > 0 (handles delayed start)
                    // Update position
                    b.position.add(b.velocity.clone().multiplyScalar(delta));

                    // Slight arc/wobble in flight
                    b.position.y += Math.sin(b.life * Math.PI * 4) * delta * 0.5;

                    // Update buffers
                    const i3 = i * 3;
                    this.bubblePositions[i3] = b.position.x;
                    this.bubblePositions[i3 + 1] = b.position.y;
                    this.bubblePositions[i3 + 2] = b.position.z;

                    this.bubbleColors[i3] = b.color.r;
                    this.bubbleColors[i3 + 1] = b.color.g;
                    this.bubbleColors[i3 + 2] = b.color.b;

                    // Size pulse as bubbles travel
                    const sizePulse = 1 + Math.sin(b.life * Math.PI * 6) * 0.1;
                    this.bubbleSizes[i] = b.size * sizePulse;
                    this.bubbleLifes[i] = Math.max(0, b.life);
                    this.bubbleRingWidths[i] = b.ringWidth;
                } else {
                    this.bubbleSizes[i] = 0; // Hidden during delay
                }
            } else {
                this.bubbleSizes[i] = 0;
            }
        }

        // Mark attributes for update
        this.bubbleGeometry.attributes.position.needsUpdate = true;
        this.bubbleGeometry.attributes.color.needsUpdate = true;
        this.bubbleGeometry.attributes.size.needsUpdate = true;
        this.bubbleGeometry.attributes.life.needsUpdate = true;
        this.bubbleGeometry.attributes.ringWidth.needsUpdate = true;
    }

    // Play bubble impact effect (color draining from enemy)
    playBubbleImpact(position, colorType) {
        const config = BUBBLE_CONFIGS[colorType];
        if (!config) return;

        // Emit small burst of colored ring particles at impact
        for (let i = 0; i < 5; i++) {
            const b = this.getInactiveBubble();
            if (!b) continue;

            b.active = true;
            b.life = 0;
            b.maxLife = 0.4;
            b.size = config.size * 0.6;
            b.ringWidth = config.ringWidth * 1.5; // Thicker ring on impact
            b.color.copy(config.color);

            // Position at impact point
            b.position.copy(position);
            b.position.x += (Math.random() - 0.5) * 0.5;
            b.position.y += (Math.random() - 0.5) * 0.5;

            // Velocity - burst outward
            b.velocity.set(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3 + 1, // Slight upward bias
                (Math.random() - 0.5) * 3
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ENEMY ATTACK SYSTEM - Solid colored projectiles
    // ═══════════════════════════════════════════════════════════════

    getInactiveEnemyProjectile() {
        for (const p of this.enemyProjectiles) {
            if (!p.active) return p;
        }
        return null;
    }

    // Cast enemy attack toward player
    castEnemyAttack(colorAffinity, enemyPosition) {
        const config = ENEMY_ATTACK_CONFIGS[colorAffinity] || ENEMY_ATTACK_CONFIGS.ivory;

        const origin = enemyPosition.clone();
        const target = new THREE.Vector3(0, 1.0, 0); // Player position

        const attack = {
            type: 'enemyAttack',
            colorAffinity,
            config,
            origin: origin,
            target: target,
            projectileCount: 0,
            maxProjectiles: config.count,
            emitRate: config.count / 0.25, // Emit all in ~0.25 seconds
            emitAccumulator: 0,
            elapsed: 0,
            duration: config.lifetime + 0.3
        };

        this.activeEnemyAttacks.push(attack);

        return {
            colorAffinity,
            damageType: config.damage,
            projectileCount: config.count
        };
    }

    emitEnemyProjectile(attack) {
        const p = this.getInactiveEnemyProjectile();
        if (!p) return;

        const config = attack.config;
        p.active = true;
        p.life = 0;
        p.maxLife = config.lifetime;
        p.size = config.size * (0.9 + Math.random() * 0.2);
        p.random = Math.random();

        // Color with variation
        const colorMix = Math.random() * 0.4;
        p.color.copy(config.color).lerp(config.glowColor, colorMix);

        // Position - start at enemy with offset
        p.position.copy(attack.origin);
        p.position.x += (Math.random() - 0.5) * config.spread;
        p.position.y += (Math.random() - 0.5) * config.spread;

        // Velocity - fly toward player
        const direction = attack.target.clone().sub(attack.origin).normalize();
        p.velocity.copy(direction).multiplyScalar(config.speed);

        // Add spread for menacing effect
        p.velocity.x += (Math.random() - 0.5) * config.spread * 4;
        p.velocity.y += (Math.random() - 0.5) * config.spread * 4;

        // Stagger timing
        p.life = -Math.random() * 0.08;
    }

    updateEnemyProjectiles(delta) {
        const time = sceneManager.getClock().getElapsedTime();
        this.enemyProjMaterial.uniforms.time.value = time;

        // Update active enemy attacks
        for (let i = this.activeEnemyAttacks.length - 1; i >= 0; i--) {
            const attack = this.activeEnemyAttacks[i];
            attack.elapsed += delta;
            attack.emitAccumulator += delta * attack.emitRate;

            // Emit new projectiles
            while (attack.emitAccumulator >= 1 && attack.projectileCount < attack.maxProjectiles) {
                this.emitEnemyProjectile(attack);
                attack.emitAccumulator -= 1;
                attack.projectileCount++;
            }

            // Remove finished attacks
            if (attack.elapsed > attack.duration) {
                this.activeEnemyAttacks.splice(i, 1);
            }
        }

        // Update all enemy projectiles
        for (let i = 0; i < this.enemyProjectiles.length; i++) {
            const p = this.enemyProjectiles[i];

            if (p.active) {
                p.life += delta / p.maxLife;

                if (p.life >= 1) {
                    p.reset();
                } else if (p.life > 0) {
                    // Update position
                    p.position.add(p.velocity.clone().multiplyScalar(delta));

                    // Menacing wobble
                    p.position.x += Math.sin(p.life * Math.PI * 6 + p.random * 10) * delta * 0.3;

                    // Update buffers
                    const i3 = i * 3;
                    this.enemyProjPositions[i3] = p.position.x;
                    this.enemyProjPositions[i3 + 1] = p.position.y;
                    this.enemyProjPositions[i3 + 2] = p.position.z;

                    this.enemyProjColors[i3] = p.color.r;
                    this.enemyProjColors[i3 + 1] = p.color.g;
                    this.enemyProjColors[i3 + 2] = p.color.b;

                    // Size grows slightly as it approaches
                    const sizeGrow = 1 + p.life * 0.3;
                    this.enemyProjSizes[i] = p.size * sizeGrow;
                    this.enemyProjLifes[i] = Math.max(0, p.life);
                } else {
                    this.enemyProjSizes[i] = 0;
                }
            } else {
                this.enemyProjSizes[i] = 0;
            }
        }

        // Mark attributes for update
        this.enemyProjGeometry.attributes.position.needsUpdate = true;
        this.enemyProjGeometry.attributes.color.needsUpdate = true;
        this.enemyProjGeometry.attributes.size.needsUpdate = true;
        this.enemyProjGeometry.attributes.life.needsUpdate = true;
    }

    // ═══════════════════════════════════════════════════════════════

    // Emit extraction effect - particles fly from world position toward camera
    emitExtractionEffect(worldPosition, color) {
        const config = {
            color: color,
            secondaryColor: color.clone().lerp(new THREE.Color(0xffffff), 0.5),
            count: 15,
            size: 0.2,
            speed: 8,
            spread: 0.5,
            lifetime: 0.6,
            trail: false
        };

        // Emit particles that fly toward camera
        const cameraPos = sceneManager.getCamera().position.clone();

        for (let i = 0; i < config.count; i++) {
            const p = this.getInactiveParticle();
            if (!p) continue;

            p.active = true;
            p.life = 0;
            p.maxLife = config.lifetime;
            p.size = config.size * (0.8 + Math.random() * 0.4);
            p.random = Math.random();

            // Color
            const colorMix = Math.random();
            p.color.copy(config.color).lerp(config.secondaryColor, colorMix);

            // Position - start at extraction point
            p.position.copy(worldPosition);
            p.position.x += (Math.random() - 0.5) * config.spread;
            p.position.y += (Math.random() - 0.5) * config.spread;
            p.position.z += (Math.random() - 0.5) * config.spread;

            // Velocity - fly toward camera
            const direction = cameraPos.clone().sub(p.position).normalize();
            p.velocity.copy(direction).multiplyScalar(config.speed);
            p.velocity.x += (Math.random() - 0.5) * 2;
            p.velocity.y += (Math.random() - 0.5) * 2;
        }
    }

    dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.bubbleGeometry) this.bubbleGeometry.dispose();
        if (this.bubbleMaterial) this.bubbleMaterial.dispose();
        if (this.enemyProjGeometry) this.enemyProjGeometry.dispose();
        if (this.enemyProjMaterial) this.enemyProjMaterial.dispose();
    }
}

const particleSystem = new ParticleSystem();
export default particleSystem;
export { ParticleSystem };

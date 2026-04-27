// enemy-sprite.js - Billboard sprites for watercolor enemies

import * as THREE from 'three';
import sceneManager from './scene-manager.js';

class EnemySprite {
    constructor() {
        this.sprite = null;
        this.material = null;
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        this.maskTexture = null;

        // Animation state
        this.baseY = 1.5;
        this.bobAmount = 0.05;
        this.bobSpeed = 2;

        // Idle animation parameters
        this.idleAnimations = {
            // Breathing - subtle scale pulse
            breatheSpeed: 1.2,
            breatheAmount: 0.02,
            // Sway - gentle horizontal movement
            swaySpeed: 0.8,
            swayAmount: 0.03,
            // Wobble - slight rotation
            wobbleSpeed: 1.5,
            wobbleAmount: 0.01,
            // Phase offsets for variety
            phaseOffset: Math.random() * Math.PI * 2
        };

        // Base scale (set when enemy shown)
        this.baseScale = 4;

        // Effects state
        this.isHit = false;
        this.hitFlashTime = 0;
        this.isDying = false;
        this.deathProgress = 0;

        // Position in front of camera (centered in view)
        this.basePosition = new THREE.Vector3(0, 1.6, -4);
    }

    init(scene) {
        // Create sprite material
        this.material = new THREE.SpriteMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            alphaTest: 0.1,
            depthTest: true,
            depthWrite: false,
            fog: false // Disable fog so sprite is visible in void mode
        });

        // Create sprite
        this.sprite = new THREE.Sprite(this.material);
        this.sprite.scale.set(3, 3, 1);
        this.sprite.position.copy(this.basePosition);
        this.sprite.visible = false;
        this.sprite.renderOrder = 10; // Ensure sprite renders on top of void overlay

        scene.add(this.sprite);

        // Load mask texture for watercolor edges
        this.loadMaskTexture();

        console.log('EnemySprite initialized');
    }

    async loadEnemyTexture(enemyId) {
        // Check cache
        if (this.loadedTextures.has(enemyId)) {
            return this.loadedTextures.get(enemyId);
        }

        const texturePath = `assets/enemies/${enemyId}.png`;

        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                texturePath,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    this.loadedTextures.set(enemyId, texture);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn(`Could not load enemy texture: ${texturePath}`);
                    resolve(null);
                }
            );
        });
    }

    async loadMaskTexture() {
        if (this.maskTexture) return this.maskTexture;

        return new Promise((resolve) => {
            this.textureLoader.load(
                'assets/ui/watercolor-mask.png',
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    this.maskTexture = texture;
                    console.log('Watercolor mask loaded');
                    resolve(texture);
                },
                undefined,
                () => {
                    console.warn('Could not load watercolor mask');
                    resolve(null);
                }
            );
        });
    }

    async showEnemy(enemy, currentHp, maxHp) {
        if (!enemy) return;

        // Try to load enemy texture
        const texture = await this.loadEnemyTexture(enemy.id);

        if (texture) {
            this.material.map = texture;
        } else {
            // Create placeholder colored sprite
            this.material.map = this.createPlaceholderTexture(enemy);
        }

        this.material.needsUpdate = true;

        // Apply watercolor mask for organic edges
        if (this.maskTexture) {
            this.material.alphaMap = this.maskTexture;
            this.material.alphaTest = 0.01;  // Lower for soft edges
            this.material.needsUpdate = true;
        }

        // Reset state
        this.isHit = false;
        this.isDying = false;
        this.deathProgress = 0;
        this.material.opacity = 1;
        this.material.color.set(0xffffff);

        // Scale based on enemy (boss is bigger)
        this.baseScale = enemy.boss ? 6 : 4;
        this.sprite.scale.set(this.baseScale, this.baseScale, 1);

        // Randomize animation phase for this enemy
        this.idleAnimations.phaseOffset = Math.random() * Math.PI * 2;

        // Position enemy
        this.sprite.position.copy(this.basePosition);
        this.baseY = this.basePosition.y;

        // Show sprite
        this.sprite.visible = true;

        // Entrance animation
        this.playEntranceAnimation();
    }

    hideEnemy() {
        this.sprite.visible = false;
    }

    playEntranceAnimation() {
        // Fade in from below with scale-up effect
        const startY = this.baseY - 1;
        this.sprite.position.y = startY;
        this.material.opacity = 0;

        // Start smaller and scale up
        const startScale = this.baseScale * 0.5;
        this.sprite.scale.set(startScale, startScale, 1);

        const duration = 500;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = this.easeOutCubic(progress);

            this.sprite.position.y = startY + (this.baseY - startY) * eased;
            this.material.opacity = eased;

            // Scale up during entrance
            const currentScale = startScale + (this.baseScale - startScale) * eased;
            this.sprite.scale.set(currentScale, currentScale, 1);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    playHitEffect(isCritical = false) {
        this.isHit = true;
        this.hitFlashTime = Date.now();

        // Flash white/red
        const flashColor = isCritical ? 0xffff00 : 0xff0000;
        this.material.color.set(flashColor);

        // Knockback effect
        const knockbackAmount = isCritical ? 0.5 : 0.2;
        const originalZ = this.sprite.position.z;
        this.sprite.position.z = originalZ + knockbackAmount;

        // Reset after flash
        setTimeout(() => {
            this.material.color.set(0xffffff);
            this.sprite.position.z = originalZ;
            this.isHit = false;
        }, 150);
    }

    playDeathAnimation() {
        this.isDying = true;
        this.deathProgress = 0;

        const duration = 1000;
        const startTime = Date.now();
        const startY = this.sprite.position.y;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            this.deathProgress = Math.min(1, elapsed / duration);

            // Fade out and sink
            this.material.opacity = 1 - this.deathProgress;
            this.sprite.position.y = startY - this.deathProgress * 0.5;

            // Tint to dark as it dies
            const tint = 1 - this.deathProgress * 0.5;
            this.material.color.setRGB(tint, tint, tint);

            if (this.deathProgress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.hideEnemy();
                this.isDying = false;
            }
        };
        animate();
    }

    update(time, delta) {
        if (!this.sprite || !this.sprite.visible || this.isDying) return;

        const anim = this.idleAnimations;
        const phase = anim.phaseOffset;

        // Idle bob animation (vertical float)
        const bob = Math.sin(time * this.bobSpeed + phase) * this.bobAmount;

        // Breathing - subtle scale pulse
        const breathe = Math.sin(time * anim.breatheSpeed + phase) * anim.breatheAmount;
        const scaleX = this.baseScale * (1 + breathe);
        const scaleY = this.baseScale * (1 + breathe * 0.5); // Less vertical breathing

        // Sway - gentle horizontal movement
        const sway = Math.sin(time * anim.swaySpeed + phase * 0.7) * anim.swayAmount;

        // Wobble - slight tilt (using scale asymmetry for fake rotation effect)
        const wobble = Math.sin(time * anim.wobbleSpeed + phase * 1.3) * anim.wobbleAmount;

        // Apply animations
        this.sprite.position.y = this.baseY + bob;
        this.sprite.position.x = this.basePosition.x + sway;

        // Scale with breathing and slight wobble asymmetry
        this.sprite.scale.set(
            scaleX * (1 + wobble),
            scaleY * (1 - wobble * 0.5),
            1
        );
    }

    createPlaceholderTexture(enemy) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw a simple silhouette based on enemy type
        ctx.fillStyle = this.getEnemyColor(enemy);

        // Body shape
        ctx.beginPath();
        ctx.ellipse(256, 300, 100, 150, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(256, 130, 80, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (glowing)
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(220, 120, 15, 0, Math.PI * 2);
        ctx.arc(292, 120, 15, 0, Math.PI * 2);
        ctx.fill();

        // Add watercolor-like edge
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 5;
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        return texture;
    }

    getEnemyColor(enemy) {
        // Color based on enemy type
        const colors = {
            'shambling-skeleton': '#c4b998',
            'tomb-rat': '#5a4a3a',
            'grave-worm': '#4a5a3a',
            'skeletal-archer': '#d4c9a8',
            'crypt-ghoul': '#6a5a7a',
            'shadow-wisp': '#3a3a6a',
            'bone-knight': '#8a8a9a',
            'corpse-crawler': '#4a3a3a',
            'revenant': '#5a6a7a',
            'death-acolyte': '#3a2a4a',
            'lich-lord': '#2a1a3a'
        };
        return colors[enemy.id] || '#5a5a5a';
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    dispose() {
        for (const texture of this.loadedTextures.values()) {
            texture.dispose();
        }
        this.loadedTextures.clear();

        if (this.material) {
            this.material.dispose();
        }
    }
}

const enemySprite = new EnemySprite();
export default enemySprite;
export { EnemySprite };

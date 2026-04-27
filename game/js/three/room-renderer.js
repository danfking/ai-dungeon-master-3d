// room-renderer.js - Curved backdrop for watercolor room backgrounds

import * as THREE from 'three';
import sceneManager from './scene-manager.js';

class RoomRenderer {
    constructor() {
        this.backdrop = null;
        this.backdropMaterial = null;
        this.currentTexture = null;
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();

        // Backdrop positioning - distance from camera
        this.backdropDistance = 10;

        // Floor
        this.floor = null;

        // Desaturation level (0 = full color, 1 = grayscale)
        this.desaturationLevel = 0;

        // Combat void mode
        this.inVoidMode = false;
        this.revealProgress = 1.0; // 1 = fully visible, 0 = void
        this.revealAnimation = null;

        // Void overlay for combat
        this.voidOverlay = null;

        // Camera reference for sizing calculations
        this.camera = null;
    }

    init(scene, camera) {
        this.scene = scene;
        this.camera = camera || sceneManager.getCamera();
        this.createBackdrop(scene);
        this.createFloor(scene);
        this.createVoidOverlay(scene);

        // Handle window resize to update backdrop size
        window.addEventListener('resize', () => this.updateBackdropSize());

        console.log('RoomRenderer initialized');
    }

    createVoidOverlay(scene) {
        // Create a dark overlay plane that sits between camera and backdrop
        const { width, height } = this.calculateBackdropSize();
        const geometry = new THREE.PlaneGeometry(width * 1.2, height * 1.2);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                revealProgress: { value: 1.0 },
                revealCenter: { value: new THREE.Vector2(0.5, 0.5) },
                time: { value: 0 },
                voidColor: { value: new THREE.Color(0x0a0a12) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float revealProgress;
                uniform vec2 revealCenter;
                uniform float time;
                uniform vec3 voidColor;
                varying vec2 vUv;

                // Noise functions for organic edge
                float random(vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                }

                float noise(vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
                }

                float fbm(vec2 st) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    for (int i = 0; i < 4; i++) {
                        value += amplitude * noise(st);
                        st *= 2.0;
                        amplitude *= 0.5;
                    }
                    return value;
                }

                void main() {
                    // Distance from reveal center
                    vec2 centered = vUv - revealCenter;
                    float dist = length(centered);

                    // Add organic noise to the reveal edge
                    float noiseScale = 5.0;
                    float edgeNoise = fbm(vUv * noiseScale + time * 0.3) * 0.3;

                    // Watercolor bleed effect - expand from center
                    float revealRadius = revealProgress * 1.5; // Expand beyond 1.0 for full coverage
                    float edge = smoothstep(revealRadius - 0.15, revealRadius + edgeNoise, dist);

                    // Paint drip effect at edges
                    float drip = 0.0;
                    if (edge > 0.0 && edge < 1.0) {
                        float dripNoise = noise(vUv * 20.0 + vec2(0.0, time));
                        drip = dripNoise * 0.1 * (1.0 - abs(edge - 0.5) * 2.0);
                    }

                    // Final alpha - void is visible where edge > 0
                    float alpha = edge + drip;

                    // Color variations in the void
                    vec3 color = voidColor;
                    color += vec3(noise(vUv * 3.0) * 0.03);

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: false // Don't test against depth so sprites show through
        });

        this.voidOverlay = new THREE.Mesh(geometry, material);
        const cameraY = this.camera ? this.camera.position.y : 1.6;
        this.voidOverlay.position.set(0, cameraY, -this.backdropDistance + 1); // Slightly in front of backdrop
        this.voidOverlay.visible = false;
        this.voidOverlay.renderOrder = -1; // Render before enemy sprites
        scene.add(this.voidOverlay);
    }

    createBackdrop(scene) {
        // Create shader material with desaturation and vignette support
        this.backdropMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: null },
                desaturation: { value: 0.0 }, // 0 = full color, 1 = grayscale
                vignette: { value: 0.0 }, // 0 = no vignette, 1 = full vignette
                vignetteColor: { value: new THREE.Color(0x1a1a2e) },
                opacity: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                uniform float desaturation;
                uniform float vignette;
                uniform vec3 vignetteColor;
                uniform float opacity;
                varying vec2 vUv;

                void main() {
                    vec4 texColor = texture2D(map, vUv);

                    // Apply desaturation
                    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
                    vec3 desaturated = mix(texColor.rgb, vec3(gray), desaturation);

                    // Apply vignette (darkening at edges)
                    vec2 center = vUv - 0.5;
                    float dist = length(center) * 1.4; // Adjust vignette size
                    float vignetteAmount = smoothstep(0.2, 1.0, dist) * vignette;
                    vec3 finalColor = mix(desaturated, vignetteColor, vignetteAmount * 0.7);

                    // Darken slightly during combat
                    finalColor *= mix(1.0, 0.6, desaturation * 0.5);

                    gl_FragColor = vec4(finalColor, opacity);
                }
            `,
            side: THREE.DoubleSide,
            transparent: true
        });

        // Calculate size to fill the screen at the backdrop distance
        const { width, height } = this.calculateBackdropSize();
        const geometry = new THREE.PlaneGeometry(width, height);

        this.backdrop = new THREE.Mesh(geometry, this.backdropMaterial);

        // Position backdrop at camera height, looking back at camera
        const cameraY = this.camera ? this.camera.position.y : 1.6;
        this.backdrop.position.set(0, cameraY, -this.backdropDistance);

        scene.add(this.backdrop);
        console.log('Backdrop created:', width.toFixed(2), 'x', height.toFixed(2), 'at z =', -this.backdropDistance);
    }

    // Calculate backdrop dimensions to fill the screen
    calculateBackdropSize() {
        if (!this.camera) {
            // Fallback if camera not available
            return { width: 20, height: 12 };
        }

        // Get camera FOV in radians (Three.js uses vertical FOV)
        const fovRad = THREE.MathUtils.degToRad(this.camera.fov);

        // Calculate visible height at backdrop distance
        const height = 2 * Math.tan(fovRad / 2) * this.backdropDistance;

        // Calculate width based on screen aspect ratio
        const aspect = window.innerWidth / window.innerHeight;
        const width = height * aspect;

        // Add small margin to ensure full coverage
        return {
            width: width * 1.02,
            height: height * 1.02
        };
    }

    // Update backdrop size on window resize
    updateBackdropSize() {
        if (!this.backdrop) return;

        const { width, height } = this.calculateBackdropSize();

        // Replace geometry with new size
        this.backdrop.geometry.dispose();
        this.backdrop.geometry = new THREE.PlaneGeometry(width, height);

        // Update void overlay size too
        if (this.voidOverlay) {
            this.voidOverlay.geometry.dispose();
            this.voidOverlay.geometry = new THREE.PlaneGeometry(width * 1.2, height * 1.2);
        }

        console.log('Backdrop resized:', width.toFixed(2), 'x', height.toFixed(2));
    }

    createFloor(scene) {
        // Stone floor with subtle texture
        const floorGeometry = new THREE.PlaneGeometry(30, 30);

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            roughness: 0.95,
            metalness: 0.0
        });

        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = 0;
        this.floor.receiveShadow = true;

        scene.add(this.floor);
    }

    async loadRoomTexture(roomId) {
        // Check cache first
        if (this.loadedTextures.has(roomId)) {
            return this.loadedTextures.get(roomId);
        }

        // Try to load watercolor background
        const texturePath = `assets/rooms/${roomId}.png`;

        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                texturePath,
                (texture) => {
                    // Configure texture for watercolor look
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;

                    this.loadedTextures.set(roomId, texture);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn(`Could not load room texture: ${texturePath}`, error);
                    resolve(null);
                }
            );
        });
    }

    async setRoom(room) {
        if (!room) return;

        // Update atmosphere colors
        sceneManager.setRoomAtmosphere(room.scene_color);

        // Try to load room texture
        const texture = await this.loadRoomTexture(room.id);

        if (texture) {
            this.backdropMaterial.uniforms.map.value = texture;
            this.backdropMaterial.needsUpdate = true;
        } else {
            // Use placeholder texture with room color
            const placeholderTexture = this.createPlaceholderTexture(room.scene_color);
            this.backdropMaterial.uniforms.map.value = placeholderTexture;
            this.backdropMaterial.needsUpdate = true;
        }

        // Update vignette color to match room
        this.backdropMaterial.uniforms.vignetteColor.value.set(room.scene_color);

        // Animate room transition
        this.playRoomTransition();
    }

    playRoomTransition() {
        // Fade in effect using shader uniform
        const uniforms = this.backdropMaterial.uniforms;
        uniforms.opacity.value = 0;

        const fadeIn = () => {
            uniforms.opacity.value += 0.05;
            if (uniforms.opacity.value < 1) {
                requestAnimationFrame(fadeIn);
            } else {
                uniforms.opacity.value = 1;
            }
        };
        fadeIn();
    }

    // Preload multiple room textures
    async preloadRooms(roomIds) {
        const promises = roomIds.map(id => this.loadRoomTexture(id));
        await Promise.all(promises);
        console.log(`Preloaded ${roomIds.length} room textures`);
    }

    // Create placeholder watercolor texture
    createPlaceholderTexture(color) {
        const canvas = document.createElement('canvas');
        // Use 16:9 aspect ratio to match screen
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // Create gradient for more visible backdrop
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#4a3a5a'); // Lighter at top
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, '#1a1a2e'); // Darker at bottom

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add some dungeon-like vertical lines/pillars
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 20;
        for (let x = 100; x < canvas.width; x += 200) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Add watercolor-like noise
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 30;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        return texture;
    }

    // Set room desaturation level (0-1)
    // As colors are extracted, the room fades toward grayscale
    // Enhanced for "Bleaching" mechanic - rooms start grayscale during combat
    setDesaturation(level) {
        this.desaturationLevel = Math.max(0, Math.min(1, level));

        // Only apply extraction desaturation if not in combat mode
        // Combat mode has its own desaturation
        if (!this.inVoidMode) {
            this.backdropMaterial.uniforms.desaturation.value = this.desaturationLevel * 0.5; // Max 50% desaturation from extraction
        }

        // Floor stays darker
        if (this.floor && this.floor.material) {
            const floorGray = 0.16 * (1 - this.desaturationLevel * 0.3);
            this.floor.material.color.setRGB(floorGray, floorGray, floorGray + 0.02);
        }
    }

    getDesaturation() {
        return this.desaturationLevel;
    }

    // Animate color restoration when enemies defeated
    // "Bleaching" mechanic - color bleeds back as enemies die
    animateColorRestore(duration = 1500, callback = null) {
        const startLevel = this.desaturationLevel;
        const startTime = performance.now();

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Ease out cubic for smooth finish
            const eased = 1 - Math.pow(1 - t, 3);

            // Interpolate from current to 0 (full color)
            this.setDesaturation(startLevel * (1 - eased));

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.setDesaturation(0);
                if (callback) callback();
            }
        };

        requestAnimationFrame(animate);
    }

    // ═══════════════════════════════════════════════════════════════
    // COMBAT VOID MODE - Room hidden during combat, revealed on victory
    // ═══════════════════════════════════════════════════════════════

    // Enter combat mode - desaturate room, add vignette (enemy appears on greyed background)
    enterVoidMode() {
        this.inVoidMode = true;
        this.revealProgress = 0;

        // Don't show the old void overlay - we use desaturation now
        if (this.voidOverlay) {
            this.voidOverlay.visible = false;
        }

        // Animate desaturation and vignette
        const startTime = performance.now();
        const duration = 500; // 0.5 seconds to desaturate

        const animateDesaturation = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 2); // Ease out quad

            // Apply desaturation (0.85 = mostly grey but some color remains)
            this.backdropMaterial.uniforms.desaturation.value = eased * 0.85;

            // Apply vignette for dramatic effect
            this.backdropMaterial.uniforms.vignette.value = eased * 0.8;

            if (progress < 1) {
                requestAnimationFrame(animateDesaturation);
            }
        };
        animateDesaturation();

        // Dim the floor
        if (this.floor && this.floor.material) {
            this.floor.material.opacity = 0.4;
            this.floor.material.transparent = true;
        }

        console.log('Entered combat mode (desaturated room)');
    }

    // Exit combat mode instantly (for flee/death)
    exitVoidMode() {
        this.inVoidMode = false;
        this.revealProgress = 1;

        if (this.voidOverlay) {
            this.voidOverlay.visible = false;
        }

        // Restore backdrop to full color instantly
        this.backdropMaterial.uniforms.desaturation.value = 0;
        this.backdropMaterial.uniforms.vignette.value = 0;
        this.backdropMaterial.uniforms.opacity.value = 1;

        // Restore floor
        if (this.floor && this.floor.material) {
            this.floor.material.opacity = 1;
            this.floor.material.transparent = false;
        }
    }

    // Play the "color restoration" reveal animation when combat ends in victory
    playRevealAnimation(duration = 2500, callback = null) {
        // Cancel any existing animation
        if (this.revealAnimation) {
            cancelAnimationFrame(this.revealAnimation);
        }

        const startTime = performance.now();
        const startDesaturation = this.backdropMaterial.uniforms.desaturation.value;
        const startVignette = this.backdropMaterial.uniforms.vignette.value;

        // Restore floor
        if (this.floor && this.floor.material) {
            this.floor.material.opacity = 1;
            this.floor.material.transparent = false;
        }

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Easing function for smooth reveal - colors "flow" back in
            const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic

            // Animate desaturation back to full color
            this.backdropMaterial.uniforms.desaturation.value = startDesaturation * (1 - eased);

            // Animate vignette away
            this.backdropMaterial.uniforms.vignette.value = startVignette * (1 - eased);

            this.revealProgress = eased;

            if (t < 1) {
                this.revealAnimation = requestAnimationFrame(animate);
            } else {
                // Animation complete
                this.inVoidMode = false;
                this.revealAnimation = null;

                // Ensure fully restored
                this.backdropMaterial.uniforms.desaturation.value = 0;
                this.backdropMaterial.uniforms.vignette.value = 0;

                // Show reveal complete message
                if (window.HUD) {
                    HUD.showMessage('Color flows back into the world...', 'success');
                }

                if (callback) callback();
            }
        };

        // Start animation
        this.revealAnimation = requestAnimationFrame(animate);

        console.log('Playing color restoration animation');
    }

    // Update void overlay time uniform (call from animation loop)
    updateVoidOverlay(time) {
        if (this.voidOverlay && this.voidOverlay.visible) {
            this.voidOverlay.material.uniforms.time.value = time;
        }
    }

    // Check if currently in void mode
    isInVoidMode() {
        return this.inVoidMode;
    }

    dispose() {
        // Clean up textures
        for (const texture of this.loadedTextures.values()) {
            texture.dispose();
        }
        this.loadedTextures.clear();

        if (this.backdrop) {
            this.backdrop.geometry.dispose();
            this.backdropMaterial.dispose();
        }

        if (this.floor) {
            this.floor.geometry.dispose();
            this.floor.material.dispose();
        }
    }
}

const roomRenderer = new RoomRenderer();
export default roomRenderer;
export { RoomRenderer };

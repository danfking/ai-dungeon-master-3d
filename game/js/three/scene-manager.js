// scene-manager.js - Core Three.js scene setup for watercolor dungeon
// Fixed 2D presentation (no camera rotation)

import * as THREE from 'three';

class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.mixers = [];
        this.isInitialized = false;

        // Lighting
        this.ambientLight = null;
        this.torchLights = [];

        // References for other modules
        this.roomRenderer = null;
        this.enemySprite = null;
        this.particleSystem = null;
        this.postProcessing = null;
    }

    async init(canvas) {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.05);

        // Create camera at eye height (1.6m)
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 100);
        this.camera.position.set(0, 1.6, 0);
        this.camera.lookAt(0, 1.6, -5);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Setup lighting
        this.setupLighting();

        // Fixed camera - no rotation controls (2D presentation)
        // Camera remains at fixed position looking at scene center

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        this.isInitialized = true;
        console.log('SceneManager initialized');

        return this;
    }

    setupLighting() {
        // Ambient light - moderate intensity for dungeon visibility
        this.ambientLight = new THREE.AmbientLight(0x6a6a8a, 0.6);
        this.scene.add(this.ambientLight);

        // Main directional light (moonlight through cracks)
        const moonLight = new THREE.DirectionalLight(0x8a8aaa, 0.5);
        moonLight.position.set(5, 10, 5);
        this.scene.add(moonLight);

        // Front fill light for backdrop visibility
        const fillLight = new THREE.DirectionalLight(0x7a7a9a, 0.4);
        fillLight.position.set(0, 3, 5);
        this.scene.add(fillLight);

        // Torch lights (warm orange flickering)
        this.addTorchLight(new THREE.Vector3(-3, 2.5, -8), 0xff7a3a);
        this.addTorchLight(new THREE.Vector3(3, 2.5, -8), 0xff6a2a);
        this.addTorchLight(new THREE.Vector3(0, 2.5, -12), 0xff8a4a);
    }

    addTorchLight(position, color = 0xff6a3a) {
        const torch = new THREE.PointLight(color, 1.0, 15);
        torch.position.copy(position);
        torch.castShadow = true;
        torch.shadow.mapSize.width = 512;
        torch.shadow.mapSize.height = 512;

        // Store original intensity for flickering
        torch.userData.baseIntensity = torch.intensity;
        torch.userData.flickerOffset = Math.random() * Math.PI * 2;

        this.scene.add(torch);
        this.torchLights.push(torch);

        return torch;
    }

    updateTorchFlicker(time) {
        for (const torch of this.torchLights) {
            const offset = torch.userData.flickerOffset;
            const flicker = Math.sin(time * 8 + offset) * 0.1 +
                           Math.sin(time * 12 + offset * 2) * 0.05 +
                           Math.sin(time * 20 + offset * 3) * 0.02;
            torch.intensity = torch.userData.baseIntensity * (1 + flicker);
        }
    }

    setRoomAtmosphere(sceneColor) {
        // Update scene background and fog based on room
        const color = new THREE.Color(sceneColor);
        this.scene.background = color;
        this.scene.fog.color = color;

        // Adjust ambient light to match
        const ambientColor = color.clone().lerp(new THREE.Color(0xffffff), 0.3);
        this.ambientLight.color = ambientColor;
    }

    shakeCamera(intensity = 0.1, duration = 200) {
        const startPosition = this.camera.position.clone();
        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const decay = 1 - (elapsed / duration);
                this.camera.position.x = startPosition.x + (Math.random() - 0.5) * intensity * decay;
                this.camera.position.y = startPosition.y + (Math.random() - 0.5) * intensity * decay;
                requestAnimationFrame(shake);
            } else {
                this.camera.position.copy(startPosition);
            }
        };
        shake();
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        if (this.postProcessing) {
            this.postProcessing.setSize(width, height);
        }
    }

    update() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Update torch flickering
        this.updateTorchFlicker(time);

        // Update animation mixers
        for (const mixer of this.mixers) {
            mixer.update(delta);
        }

        // Update subsystems
        if (this.enemySprite) {
            this.enemySprite.update(time, delta);
        }

        if (this.particleSystem) {
            this.particleSystem.update(delta);
        }
    }

    render() {
        if (this.postProcessing && this.postProcessing.isEnabled) {
            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Animation loop
    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.render();
    }

    // Getters for other modules
    getScene() { return this.scene; }
    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }
    getClock() { return this.clock; }

    // Module registration
    setRoomRenderer(renderer) { this.roomRenderer = renderer; }
    setEnemySprite(sprite) { this.enemySprite = sprite; }
    setParticleSystem(system) { this.particleSystem = system; }
    setPostProcessing(pp) { this.postProcessing = pp; }
}

// Export singleton
const sceneManager = new SceneManager();
export default sceneManager;
export { SceneManager };

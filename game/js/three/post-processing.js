// post-processing.js - Watercolor shader chain via EffectComposer

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import sceneManager from './scene-manager.js';

// Kuwahara shader (painterly effect)
const KuwaharaShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        radius: { value: 3.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float radius;
        varying vec2 vUv;

        void main() {
            vec2 texelSize = 1.0 / resolution;
            float r = radius;

            vec3 mean[4];
            vec3 sigma[4];

            for (int k = 0; k < 4; k++) {
                mean[k] = vec3(0.0);
                sigma[k] = vec3(0.0);
            }

            float n = 0.0;

            for (float j = -r; j <= 0.0; j += 1.0) {
                for (float i = -r; i <= 0.0; i += 1.0) {
                    vec3 c0 = texture2D(tDiffuse, vUv + vec2(i, j) * texelSize).rgb;
                    mean[0] += c0;
                    sigma[0] += c0 * c0;

                    vec3 c1 = texture2D(tDiffuse, vUv + vec2(-i, j) * texelSize).rgb;
                    mean[1] += c1;
                    sigma[1] += c1 * c1;

                    vec3 c2 = texture2D(tDiffuse, vUv + vec2(i, -j) * texelSize).rgb;
                    mean[2] += c2;
                    sigma[2] += c2 * c2;

                    vec3 c3 = texture2D(tDiffuse, vUv + vec2(-i, -j) * texelSize).rgb;
                    mean[3] += c3;
                    sigma[3] += c3 * c3;

                    n += 1.0;
                }
            }

            float minSigma = 1e10;
            vec3 result = vec3(0.0);

            for (int k = 0; k < 4; k++) {
                mean[k] /= n;
                sigma[k] = abs(sigma[k] / n - mean[k] * mean[k]);
                float s = sigma[k].r + sigma[k].g + sigma[k].b;
                if (s < minSigma) {
                    minSigma = s;
                    result = mean[k];
                }
            }

            gl_FragColor = vec4(result, 1.0);
        }
    `
};

// Edge darkening shader
const EdgeDarkeningShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        edgeStrength: { value: 1.5 },
        edgeDarkness: { value: 0.4 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float edgeStrength;
        uniform float edgeDarkness;
        varying vec2 vUv;

        void main() {
            vec2 texelSize = 1.0 / resolution;

            float samples[9];
            int idx = 0;

            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 offset = vec2(float(x), float(y)) * texelSize;
                    vec3 color = texture2D(tDiffuse, vUv + offset).rgb;
                    samples[idx] = dot(color, vec3(0.299, 0.587, 0.114));
                    idx++;
                }
            }

            float gx = samples[2] + 2.0 * samples[5] + samples[8] - samples[0] - 2.0 * samples[3] - samples[6];
            float gy = samples[6] + 2.0 * samples[7] + samples[8] - samples[0] - 2.0 * samples[1] - samples[2];

            float edge = sqrt(gx * gx + gy * gy);
            edge = clamp(edge * edgeStrength, 0.0, 1.0);

            vec4 color = texture2D(tDiffuse, vUv);
            vec3 edgeColor = color.rgb * (1.0 - edge * edgeDarkness);

            edgeColor.r += edge * 0.02;
            edgeColor.b -= edge * 0.01;

            gl_FragColor = vec4(edgeColor, color.a);
        }
    `
};

// Paper texture shader
const PaperTextureShader = {
    uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2() },
        paperStrength: { value: 0.03 },
        saturationReduction: { value: 0.1 },
        time: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float paperStrength;
        uniform float saturationReduction;
        uniform float time;
        varying vec2 vUv;

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

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);

            vec2 paperUv = vUv * resolution / 256.0;
            float grain = 0.0;
            grain += noise(paperUv * 1.0) * 0.5;
            grain += noise(paperUv * 2.0) * 0.25;
            grain += noise(paperUv * 4.0) * 0.125;
            grain = grain * 2.0 - 0.5;

            vec3 paperedColor = color.rgb + vec3(grain * paperStrength);

            float luminance = dot(paperedColor, vec3(0.299, 0.587, 0.114));
            vec3 desaturated = mix(paperedColor, vec3(luminance), saturationReduction);

            desaturated.r += 0.02;
            desaturated.g += 0.01;
            desaturated.b -= 0.01;

            vec2 center = vUv - 0.5;
            float vignette = 1.0 - dot(center, center) * 0.3;
            desaturated *= vignette;

            gl_FragColor = vec4(desaturated, color.a);
        }
    `
};

class PostProcessing {
    constructor() {
        this.composer = null;
        this.isEnabled = true;

        // Shader passes
        this.kuwaharaPass = null;
        this.edgeDarkeningPass = null;
        this.paperTexturePass = null;
        this.bloomPass = null;

        // Settings
        this.settings = {
            kuwaharaRadius: 3,
            edgeStrength: 1.5,
            edgeDarkness: 0.4,
            paperStrength: 0.03,
            saturationReduction: 0.1,
            bloomStrength: 0.2,
            bloomThreshold: 0.8,
            bloomRadius: 0.3
        };
    }

    init(renderer, scene, camera) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Create composer
        this.composer = new EffectComposer(renderer);

        // Render pass
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // Kuwahara pass (painterly effect)
        this.kuwaharaPass = new ShaderPass(KuwaharaShader);
        this.kuwaharaPass.uniforms.resolution.value.set(width, height);
        this.kuwaharaPass.uniforms.radius.value = this.settings.kuwaharaRadius;
        this.composer.addPass(this.kuwaharaPass);

        // Edge darkening pass
        this.edgeDarkeningPass = new ShaderPass(EdgeDarkeningShader);
        this.edgeDarkeningPass.uniforms.resolution.value.set(width, height);
        this.edgeDarkeningPass.uniforms.edgeStrength.value = this.settings.edgeStrength;
        this.edgeDarkeningPass.uniforms.edgeDarkness.value = this.settings.edgeDarkness;
        this.composer.addPass(this.edgeDarkeningPass);

        // Subtle bloom for magical glow
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            this.settings.bloomStrength,
            this.settings.bloomRadius,
            this.settings.bloomThreshold
        );
        this.composer.addPass(this.bloomPass);

        // Paper texture pass (final)
        this.paperTexturePass = new ShaderPass(PaperTextureShader);
        this.paperTexturePass.uniforms.resolution.value.set(width, height);
        this.paperTexturePass.uniforms.paperStrength.value = this.settings.paperStrength;
        this.paperTexturePass.uniforms.saturationReduction.value = this.settings.saturationReduction;
        this.composer.addPass(this.paperTexturePass);

        console.log('PostProcessing initialized');
    }

    setSize(width, height) {
        if (!this.composer) return;

        this.composer.setSize(width, height);

        if (this.kuwaharaPass) {
            this.kuwaharaPass.uniforms.resolution.value.set(width, height);
        }
        if (this.edgeDarkeningPass) {
            this.edgeDarkeningPass.uniforms.resolution.value.set(width, height);
        }
        if (this.paperTexturePass) {
            this.paperTexturePass.uniforms.resolution.value.set(width, height);
        }
    }

    update(time) {
        if (this.paperTexturePass) {
            this.paperTexturePass.uniforms.time.value = time;
        }
    }

    render() {
        if (this.composer && this.isEnabled) {
            this.composer.render();
        }
    }

    // Settings adjustment methods
    setKuwaharaRadius(radius) {
        this.settings.kuwaharaRadius = radius;
        if (this.kuwaharaPass) {
            this.kuwaharaPass.uniforms.radius.value = radius;
        }
    }

    setEdgeStrength(strength) {
        this.settings.edgeStrength = strength;
        if (this.edgeDarkeningPass) {
            this.edgeDarkeningPass.uniforms.edgeStrength.value = strength;
        }
    }

    setPaperStrength(strength) {
        this.settings.paperStrength = strength;
        if (this.paperTexturePass) {
            this.paperTexturePass.uniforms.paperStrength.value = strength;
        }
    }

    setBloomStrength(strength) {
        this.settings.bloomStrength = strength;
        if (this.bloomPass) {
            this.bloomPass.strength = strength;
        }
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        return this.isEnabled;
    }

    dispose() {
        if (this.composer) {
            this.composer.dispose();
        }
    }
}

const postProcessing = new PostProcessing();
export default postProcessing;
export { PostProcessing };

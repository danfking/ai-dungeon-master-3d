// Ink wash transition shader for room changes
// Creates a flowing ink effect that wipes across the screen

uniform sampler2D tDiffuse;
uniform sampler2D tNextScene;  // Next scene texture (if available)
uniform float progress;         // 0.0 to 1.0 transition progress
uniform float time;
uniform vec2 resolution;

varying vec2 vUv;

// Simplex noise for organic edge
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
    vec2 uv = vUv;

    // Create ink wash pattern
    vec2 noiseCoord = uv * 3.0 + vec2(time * 0.5, 0.0);
    float inkNoise = fbm(noiseCoord);

    // Transition threshold with organic edge
    float threshold = progress * 1.4 - 0.2; // Extend range for smooth start/end
    float edge = inkNoise * 0.3; // Organic edge variation

    // Calculate ink coverage
    float inkCoverage = smoothstep(threshold - 0.1, threshold + edge, uv.x + inkNoise * 0.2);

    // Sample both scenes
    vec4 currentScene = texture2D(tDiffuse, uv);
    vec4 inkColor = vec4(0.1, 0.1, 0.15, 1.0); // Dark ink color

    // Blend based on coverage
    vec4 result;
    if (progress < 0.5) {
        // First half: current scene fades to ink
        result = mix(currentScene, inkColor, inkCoverage * progress * 2.0);
    } else {
        // Second half: ink fades to reveal (same scene or would be next)
        float revealProgress = (progress - 0.5) * 2.0;
        result = mix(inkColor, currentScene, revealProgress);
    }

    // Add ink drip effect at edge
    float drip = 1.0 - smoothstep(threshold - 0.05, threshold, uv.x + inkNoise * 0.2);
    drip *= noise(uv * 20.0 + time) * 0.5;

    result.rgb -= vec3(drip * 0.1);

    gl_FragColor = result;
}

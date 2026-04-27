// Paper texture overlay shader
// Adds grain and reduces saturation for watercolor paper feel

uniform sampler2D tDiffuse;
uniform sampler2D tPaper;    // Paper grain texture
uniform vec2 resolution;
uniform float paperStrength;
uniform float saturationReduction;
uniform float time;

varying vec2 vUv;

// Pseudo-random noise function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simple noise for paper grain
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

    // Create procedural paper grain if no texture provided
    vec2 paperUv = vUv * resolution / 256.0; // Scale for paper grain size

    // Multi-octave noise for realistic paper texture
    float grain = 0.0;
    grain += noise(paperUv * 1.0) * 0.5;
    grain += noise(paperUv * 2.0) * 0.25;
    grain += noise(paperUv * 4.0) * 0.125;
    grain += noise(paperUv * 8.0) * 0.0625;

    // Normalize and center around 0.5
    grain = grain * 2.0 - 0.5;

    // Apply paper texture
    vec3 paperedColor = color.rgb + vec3(grain * paperStrength);

    // Reduce saturation for watercolor look
    float luminance = dot(paperedColor, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(paperedColor, vec3(luminance), saturationReduction);

    // Slight warm shift (watercolor papers tend to be warm)
    desaturated.r += 0.02;
    desaturated.g += 0.01;
    desaturated.b -= 0.01;

    // Add very subtle vignette
    vec2 center = vUv - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.3;
    desaturated *= vignette;

    gl_FragColor = vec4(desaturated, color.a);
}

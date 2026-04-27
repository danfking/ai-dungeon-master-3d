// Watercolor particle shader
// Soft edges, color bleeding, organic fade

uniform sampler2D tSprite;   // Particle sprite texture
uniform vec3 baseColor;
uniform float opacity;
uniform float bleedAmount;
uniform float time;

varying vec2 vUv;
varying float vLife;         // 0-1 particle life remaining
varying float vRandom;       // Per-particle random value

// Pseudo-random
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    // Sample sprite texture (or use procedural)
    vec2 centeredUv = vUv - 0.5;
    float dist = length(centeredUv) * 2.0;

    // Soft circular falloff (watercolor blob shape)
    float softEdge = 1.0 - smoothstep(0.3, 1.0, dist);

    // Add organic wobble to edge
    float angle = atan(centeredUv.y, centeredUv.x);
    float wobble = sin(angle * 5.0 + vRandom * 6.28) * 0.1;
    wobble += sin(angle * 8.0 - time * 2.0) * 0.05;
    softEdge *= 1.0 + wobble;

    // Color bleeding effect - shift hue at edges
    vec3 color = baseColor;
    float edgeFactor = smoothstep(0.2, 0.8, dist);

    // Bleed toward complementary colors at edges
    color.r += edgeFactor * bleedAmount * sin(vRandom * 6.28) * 0.2;
    color.g += edgeFactor * bleedAmount * sin(vRandom * 6.28 + 2.09) * 0.2;
    color.b += edgeFactor * bleedAmount * sin(vRandom * 6.28 + 4.18) * 0.2;

    // Darken edges slightly (pigment accumulation)
    float edgeDarken = 1.0 - edgeFactor * 0.3;
    color *= edgeDarken;

    // Life-based fade
    float lifeFade = smoothstep(0.0, 0.2, vLife) * smoothstep(1.0, 0.8, 1.0 - vLife);

    // Final alpha
    float alpha = softEdge * opacity * lifeFade;

    // Discard nearly transparent pixels
    if (alpha < 0.01) discard;

    // Add slight grain
    float grain = random(vUv * 100.0 + time) * 0.05;
    color += vec3(grain);

    gl_FragColor = vec4(color, alpha);
}

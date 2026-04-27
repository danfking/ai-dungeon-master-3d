// Generalized Kuwahara filter for painterly effect
// Creates areas of uniform color with preserved edges

uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float radius;

varying vec2 vUv;

void main() {
    vec2 texelSize = 1.0 / resolution;
    float r = radius;

    // Sample means and variances for 4 quadrants
    vec3 mean[4];
    vec3 sigma[4];

    // Initialize
    for (int k = 0; k < 4; k++) {
        mean[k] = vec3(0.0);
        sigma[k] = vec3(0.0);
    }

    // Quadrant offsets: top-left, top-right, bottom-left, bottom-right
    vec2 offsets[4];
    offsets[0] = vec2(-r, -r);
    offsets[1] = vec2(r, -r);
    offsets[2] = vec2(-r, r);
    offsets[3] = vec2(r, r);

    float n = 0.0;

    // Sample each quadrant
    for (float j = -r; j <= 0.0; j += 1.0) {
        for (float i = -r; i <= 0.0; i += 1.0) {
            // Top-left quadrant
            vec3 c0 = texture2D(tDiffuse, vUv + vec2(i, j) * texelSize).rgb;
            mean[0] += c0;
            sigma[0] += c0 * c0;

            // Top-right quadrant
            vec3 c1 = texture2D(tDiffuse, vUv + vec2(-i, j) * texelSize).rgb;
            mean[1] += c1;
            sigma[1] += c1 * c1;

            // Bottom-left quadrant
            vec3 c2 = texture2D(tDiffuse, vUv + vec2(i, -j) * texelSize).rgb;
            mean[2] += c2;
            sigma[2] += c2 * c2;

            // Bottom-right quadrant
            vec3 c3 = texture2D(tDiffuse, vUv + vec2(-i, -j) * texelSize).rgb;
            mean[3] += c3;
            sigma[3] += c3 * c3;

            n += 1.0;
        }
    }

    // Calculate means and variances
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

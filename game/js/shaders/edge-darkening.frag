// Edge darkening shader using Sobel edge detection
// Creates watercolor-style dark outlines

uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float edgeStrength;
uniform float edgeDarkness;

varying vec2 vUv;

void main() {
    vec2 texelSize = 1.0 / resolution;

    // Sobel kernels
    mat3 sobelX = mat3(
        -1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0
    );

    mat3 sobelY = mat3(
        -1.0, -2.0, -1.0,
         0.0,  0.0,  0.0,
         1.0,  2.0,  1.0
    );

    // Sample 3x3 neighborhood luminance
    float samples[9];
    int idx = 0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            vec3 color = texture2D(tDiffuse, vUv + offset).rgb;
            samples[idx] = dot(color, vec3(0.299, 0.587, 0.114)); // Luminance
            idx++;
        }
    }

    // Calculate gradients
    float gx = 0.0;
    float gy = 0.0;

    gx += samples[0] * sobelX[0][0];
    gx += samples[1] * sobelX[0][1];
    gx += samples[2] * sobelX[0][2];
    gx += samples[3] * sobelX[1][0];
    gx += samples[4] * sobelX[1][1];
    gx += samples[5] * sobelX[1][2];
    gx += samples[6] * sobelX[2][0];
    gx += samples[7] * sobelX[2][1];
    gx += samples[8] * sobelX[2][2];

    gy += samples[0] * sobelY[0][0];
    gy += samples[1] * sobelY[0][1];
    gy += samples[2] * sobelY[0][2];
    gy += samples[3] * sobelY[1][0];
    gy += samples[4] * sobelY[1][1];
    gy += samples[5] * sobelY[1][2];
    gy += samples[6] * sobelY[2][0];
    gy += samples[7] * sobelY[2][1];
    gy += samples[8] * sobelY[2][2];

    // Edge magnitude
    float edge = sqrt(gx * gx + gy * gy);
    edge = clamp(edge * edgeStrength, 0.0, 1.0);

    // Get original color
    vec4 color = texture2D(tDiffuse, vUv);

    // Darken edges (watercolor style - edges appear darker)
    vec3 edgeColor = color.rgb * (1.0 - edge * edgeDarkness);

    // Slight warm tint to edges for traditional watercolor feel
    edgeColor.r += edge * 0.02;
    edgeColor.b -= edge * 0.01;

    gl_FragColor = vec4(edgeColor, color.a);
}

// Normalized positions, diameters and ink density shared by the hero and benefit field.
export function createParticleGrain(count, pixels) {
  let seed = 71627;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const dots = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const px = random(), verticalSample = random();
    // Move more marks downward, with an extra gradual thinning toward the upper left.
    // Inverting this normalized density ramp preserves the total particle count.
    const topDensity = .32 - .20 * Math.exp(-Math.pow(px / .40, 2));
    const bottomBias = 1 - topDensity;
    const py = (Math.sqrt(topDensity * topDensity + 4 * bottomBias * verticalSample)
      - topDensity) / (2 * bottomBias);
    const sample = (Math.min(175, Math.floor(py * 176)) * 256 + Math.min(255, Math.floor(px * 256))) * 4;
    const density = 1 - pixels[sample] / 255;
    dots[i * 4] = px; dots[i * 4 + 1] = py;
    dots[i * 4 + 2] = .45 + random() * .5;
    dots[i * 4 + 3] = Math.min(.75, density * 2.4) * (.6 + random() * .65);
  }
  return dots;
}

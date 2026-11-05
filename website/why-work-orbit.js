// Finite elliptical passage: images enter left, cross the foreground, exit right.
// The lead/tail leave the centered heading visible before and after the sequence.
export function cardOrbitPose(progress, index, count, radius, rise) {
  const distance = progress * (count - 1 + 3.6) - 1.8 - index;
  const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, distance * .73));
  const depthRadius = radius;
  // Complete the final exit before the scroll track ends at distance 1.8.
  const fadeEnd = index === count - 1 && distance > 0 ? 1.55 : 1.9;
  const fade = Math.max(0, Math.min(1, (fadeEnd - Math.abs(distance)) / .65));
  return {
    x: Math.sin(angle) * radius,
    y: -distance * rise,
    z: (Math.cos(angle) - 1) * depthRadius,
    rotationX: Math.sin(angle) * 1.5,
    rotationY: Math.atan2(depthRadius * Math.sin(angle), radius * Math.cos(angle)) * 180 / Math.PI,
    rotationZ: Math.sin(angle) * .7,
    opacity: fade * fade * (3 - 2 * fade),
    foreground: Math.exp(-distance * distance * .8),
  };
}

export function cardPointerPose(pointer, foreground, lift = 0) {
  return {
    x: pointer.x * 6 * foreground,
    y: pointer.y * 4 * foreground,
    z: lift * 24,
    rotationX: pointer.y * .4 * foreground,
    rotationY: pointer.x * 2.5 * foreground,
    rotationZ: 0,
  };
}

// Neighboring screens breathe in opposite directions without advancing the orbit.
export function cardFloatPose(time, index, visibility = 1) {
  const phase = index * 1.71;
  const wave = time * Math.PI * 2 / 10;
  const verticalDirection = index % 2 === 0 ? 1 : -1;
  return {
    x: Math.sin(wave + phase) * 3 * visibility,
    y: Math.sin(wave) * 10 * verticalDirection * visibility,
    z: Math.cos(wave + phase) * 4 * visibility,
    rotationX: Math.sin(wave + phase) * .35 * visibility,
    rotationY: Math.sin(wave * .7 + phase) * .8 * visibility,
    rotationZ: Math.cos(wave + phase) * .15 * visibility,
  };
}

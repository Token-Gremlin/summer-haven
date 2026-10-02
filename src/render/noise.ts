import * as THREE from 'three';

// Shared value-noise lattices replace hundreds of repeated ALU operations per fragment.
// Smooth interpolation stays in the shader, preserving continuous painted surface variation.
function values(count: number): Uint8Array {
  let seed = 71343;
  return Uint8Array.from({ length: count }, () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 24) & 255;
  });
}

export const noise2 = new THREE.DataTexture(values(256 * 256), 256, 256, THREE.RedFormat);
noise2.wrapS = noise2.wrapT = THREE.RepeatWrapping;
noise2.magFilter = noise2.minFilter = THREE.LinearFilter;
noise2.generateMipmaps = false;
noise2.needsUpdate = true;

export const noise3 = new THREE.Data3DTexture(values(32 * 32 * 32), 32, 32, 32);
noise3.format = THREE.RedFormat;
noise3.wrapS = noise3.wrapT = noise3.wrapR = THREE.RepeatWrapping;
noise3.magFilter = noise3.minFilter = THREE.LinearFilter;
noise3.unpackAlignment = 1;
noise3.needsUpdate = true;

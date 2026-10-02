import { zstdDecompressSync } from 'node:zlib';

// Blender writes concatenated Zstandard frames. Decoding only the first frame
// inspects the file header, not the scene data where render paths are stored.
export function blendFrames(bytes) {
  if (bytes.subarray(0, 7).toString('ascii') === 'BLENDER') {
    return [{ compressed: false, original: bytes, decoded: bytes }];
  }
  const frames = [];
  let offset = 0;
  while (offset < bytes.length) {
    const magic = bytes.readUInt32LE(offset);
    if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
      const end = offset + 8 + bytes.readUInt32LE(offset + 4);
      if (end > bytes.length) throw new Error('Invalid Zstandard skippable frame');
      frames.push({ compressed: false, original: bytes.subarray(offset, end), decoded: Buffer.alloc(0), seekTable: true });
      offset = end;
      continue;
    }
    if (magic !== 0xfd2fb528) throw new Error('Unsupported Blender compression');
    const result = zstdDecompressSync(bytes.subarray(offset), { info: true, maxOutputLength: 512 * 1024 * 1024 });
    const consumed = result.engine.bytesWritten;
    if (!consumed) throw new Error('Invalid empty Zstandard frame');
    frames.push({ compressed: true, original: bytes.subarray(offset, offset + consumed), decoded: result.buffer });
    offset += consumed;
  }
  if (frames[0]?.decoded.subarray(0, 7).toString('ascii') !== 'BLENDER') throw new Error('Missing Blender header');
  return frames;
}

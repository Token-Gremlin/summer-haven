import * as T from 'three';
/** Painted signs guide walks without adding a minimap to the screen. */
export function paintedSign(lines: string[], width = 1.5, height = 0.55) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.round((768 * height) / width);
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#e7dfbf';
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = '#586752';
  c.lineWidth = 7;
  c.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  c.fillStyle = '#344e43';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `600 ${Math.min(57, canvas.height / (lines.length + 1))}px Georgia, serif`;
  lines.forEach((line, i) =>
    c.fillText(line, canvas.width / 2, (canvas.height * (i + 0.5)) / lines.length, canvas.width - 48),
  );
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new T.ShaderMaterial({
    glslVersion: T.GLSL3,
    side: T.DoubleSide,
    uniforms: { map: { value: texture } },
    vertexShader:
      'out vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:
      'uniform sampler2D map;in vec2 vUv;layout(location=0) out vec4 col;layout(location=1) out vec4 meta;void main(){col=texture(map,vUv);meta=vec4(.5,.5,0.,0.);}',
  });
  return new T.Mesh(new T.PlaneGeometry(width, height), material);
}

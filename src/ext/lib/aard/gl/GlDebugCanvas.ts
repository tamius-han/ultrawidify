import { GlCanvas, GlCanvasOptions } from './GlCanvas';


const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;
  attribute vec2 aTextureCoord;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec2 vTextureCoord;

  void main(void) {
    gl_Position = uProjectionMatrix * aVertexPosition;
    vTextureCoord = vec2(aTextureCoord.x, 1.0 - aTextureCoord.y);
    // vTextureCoord = aTextureCoord;
  }
`;

const fSource = `
precision mediump float;

uniform sampler2D u_texture;
// uniform sampler1D u_colorTexture; // Array of replacement colors
uniform vec3 u_colors[16];
varying vec2 vTextureCoord;

void main() {
  vec4 color = texture2D(u_texture, vTextureCoord);
  int alphaIndex = int(color.a * 255.0);

  if (alphaIndex == 255) {                                         // convert to grayscale on normal alpha
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    gl_FragColor = vec4(vec3(gray), 1.0);
  } else if (alphaIndex < 16) {                                    // use custom color where possible
    // no 1D textures in webgl, only webgl2 maybe
    // vec3 selectedColor = texture1D(u_colorTexture, float(alphaIndex) / 15.0).rgb;
    // gl_FragColor = vec4(selectedColor, 1.0);

    vec3 selectedColor;
    if (alphaIndex == 0) selectedColor = u_colors[0];
    else if (alphaIndex == 1)  selectedColor = u_colors[1];
    else if (alphaIndex == 2)  selectedColor = u_colors[2];
    else if (alphaIndex == 3)  selectedColor = u_colors[3];
    else if (alphaIndex == 4)  selectedColor = u_colors[4];
    else if (alphaIndex == 5)  selectedColor = u_colors[5];
    else if (alphaIndex == 6)  selectedColor = u_colors[6];
    else if (alphaIndex == 7)  selectedColor = u_colors[7];
    else if (alphaIndex == 8)  selectedColor = u_colors[8];
    else if (alphaIndex == 9)  selectedColor = u_colors[9];
    else if (alphaIndex == 10) selectedColor = u_colors[10];
    else if (alphaIndex == 11) selectedColor = u_colors[11];
    else if (alphaIndex == 12) selectedColor = u_colors[12];
    else if (alphaIndex == 13) selectedColor = u_colors[13];
    else if (alphaIndex == 14) selectedColor = u_colors[14];
    else selectedColor = u_colors[15];

    gl_FragColor = vec4(selectedColor, 1.0);
  } else {                                                         // red channel only as fallback
    gl_FragColor = vec4(color.r, 0.0, 0.0, 1.0);
  }
}
`;

export enum GlDebugType {
  BlackLevelSample = 0,
  GuardLineOk = 1,
  GuardLineViolation = 2,
  GuardLineCornerOk = 3,
  GuardLineCornerViolation = 4,
  ImageLineThresholdReached = 5,
  ImageLineOk = 6,
  ImageLineFail = 7,
  EdgeScanProbe = 8,
  EdgeScanHit = 9,
  SlopeTestDarkOk = 10,
  SlopeTestDarkViolation = 11,

}

export class GlDebugCanvas extends GlCanvas {

  private debugColors = [
    0.1, 0.1, 0.35,    // 0 - black level sample
    0.3, 1.0, 0.6,     // 1 - guard line ok
    1.0, 0.1, 0.1,     // 2 - guard line violation
    0.1, 0.5, 0.3,     // 3 - guard line corner ok
    0.5, 0.0, 0.0,     // 4 - guard line corner violation
    1.0, 1.0, 1.0,     // 5 - image line threshold reached (stop checking)
    0.7, 0.7, 0.7,     // 6 - image line ok
    0.2, 0.2, 0.6,     // 7 - image line fail
    0.1, 0.1, 0.4,     // 8 - edge scan probe
    0.4, 0.4, 1.0,     // 9 - edge scan hit
    0.2, 0.4, 0.6,     // 10 - slope test ok
    1.0, 0.0, 0.0,     // 11 - slope test fail
    0.0, 0.0, 0.0,   // 12
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
    0.0, 0.0, 0.0,
  ];

  constructor (options: GlCanvasOptions) {
    super(options);
    this.canvas.id = options.id;
  }

  protected loadShaders() {
    const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fSource);

    return {vertexShader, fragmentShader};
  }

  show() {
    this.enableFx();

    // this.canvas.style.position = 'fixed';
    // this.canvas.style.top = '0';
    // this.canvas.style.right = '0';
    // this.canvas.style.zIndex = '99999999';
    // this.canvas.style.transform = 'scale(3)';
    // this.canvas.style.transformOrigin = 'top right';
    // this.canvas.style.imageRendering = 'pixelated';

    // document.body.appendChild(
    //   this.canvas
    // );
  }

  enableFx() {
    this.gl.useProgram(this.programInfo.program)
    this.gl.uniform3fv((this.programInfo.uniformLocations as any).debugColors, this.debugColors);
  }

  drawBuffer(buffer: Uint8Array) {
    this.updateTextureBuffer(buffer);
  }

  protected initWebgl() {
    super.initWebgl();

    (this.programInfo.uniformLocations as any).debugColors = this.gl.getUniformLocation(this.programInfo.program, 'u_colors');
  }

  protected updateTextureBuffer(buffer: Uint8Array) {
    // this.updateTexture(null);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      0,
      0,
      this.width,
      this.height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      buffer
    );
    this.drawScene();
  };
}

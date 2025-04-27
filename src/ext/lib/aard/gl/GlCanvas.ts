import { mat4 } from 'gl-matrix';
import { GlCanvasBuffers, initBuffers } from './gl-init';

export interface GlCanvasOptions {
  width: number;
  height: number;
  id?: string;
}

// Vertex shader program
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
    vTextureCoord = aTextureCoord;
  }
`;
// Fragment shader program
const fsSource = `
  varying highp vec2 vTextureCoord;
  uniform sampler2D uSampler;

  void main(void) {
    highp vec4 texelColor = texture2D(uSampler, vTextureCoord);

    gl_FragColor = vec4(texelColor.rgb, texelColor.a);
  }
`;

interface GlCanvasProgramInfo {
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
    vertexNormal: number;
    textureCoord: number;
  };
  uniformLocations: {
    projectionMatrix: WebGLUniformLocation;
    modelViewMatrix: WebGLUniformLocation;
    normalMatrix: WebGLUniformLocation;
    uSampler: WebGLUniformLocation;
  };
}

export class GlCanvas {
  get type() {
    return 'webgl';
  }

  private _canvas: HTMLCanvasElement;
  private set canvas(x: HTMLCanvasElement) {
    this._canvas = x;
  };
  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  };

  private _context: WebGLRenderingContext;
  private set gl(x: WebGLRenderingContext) {
    this._context = x;
  };
  protected get gl(): WebGLRenderingContext {
    return this._context;
  }

  private frameBufferSize: number;
  private _frameBuffer: Uint8Array;
  protected set frameBuffer(x: Uint8Array) {
    this._frameBuffer = x;
  }
  public get frameBuffer(): Uint8Array {
    return this._frameBuffer;
  }

  private buffers: GlCanvasBuffers;
  private texture: WebGLTexture;
  protected programInfo: GlCanvasProgramInfo;
  private projectionMatrix: mat4;

  get width() {
    return this.canvas.width;
  }
  get height() {
    return this.canvas.height;
  }

  constructor(options: GlCanvasOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('width', `${options.width}`);
    this.canvas.setAttribute('height', `${options.height}`);

    this.initContext(options);
    this.initWebgl();
  }

  /**
   * Draws video frame to the GL canvas
   * @param video video to extract a frame from
   */
  drawVideoFrame(video: HTMLVideoElement | HTMLCanvasElement): void {
    this.updateTexture(video);
    this.drawScene();
  }

  /**
   * Reads pixels from the canvas into framebuffer, and returns pointer to the framebuffer
   * @returns
   */
  getImageData(): Uint8Array {
    this.gl.readPixels(0, 0, this.canvas.width, this.canvas.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.frameBuffer);
    return this.frameBuffer;
  }

  showCanvas() {
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'fixed';
    this.canvas.style.left = '0px';
    this.canvas.style.top = '0px';
    this.canvas.style.border = '1px dotted red';
    this.canvas.style.zIndex = '1000000';
    document.body.appendChild(this.canvas);
  }

  hideCanvas() {
    this.canvas.style.display = '';
    this.canvas.style.position = '';
    this.canvas.style.left = '';
    this.canvas.style.top = '';
    this.canvas.remove();
  }

  /**
   * Cleans up after itself
   */
  destroy() {
    this.gl.deleteProgram(this.programInfo.program);
    this.gl.deleteBuffer(this.buffers.position);
    this.gl.deleteBuffer(this.buffers.normal);
    this.gl.deleteBuffer(this.buffers.textureCoord);
    this.gl.deleteBuffer(this.buffers.indices);
    this.gl.deleteTexture(this.texture);
  }

  protected initContext(options: GlCanvasOptions) {
    this.gl = this.canvas.getContext(
      'webgl2',
      {
        preserveDrawingBuffer: true
      }
    );

    if (!this.gl) {
      try {
        this.gl = this.canvas.getContext(
          "webgl",
          {
            preserveDrawingBuffer: true
          }
        );
      } catch (e) {
        throw new Error('WebGL not supported');
      }
    }
    if(options.id) {
      this.canvas.setAttribute('id', options.id);
    }

    this.frameBufferSize = options.width * options.height * 4;
  }

  protected initWebgl() {
    // Initialize the GL context
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Create shader program
    const shaderProgram = this.initShaderProgram();

    // Setup params for shader program
    this.programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        vertexNormal: this.gl.getAttribLocation(shaderProgram, "aVertexNormal"),
        textureCoord: this.gl.getAttribLocation(shaderProgram, "aTextureCoord"),
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(
          shaderProgram,
          "uProjectionMatrix"
        ),
        modelViewMatrix: this.gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        normalMatrix: this.gl.getUniformLocation(shaderProgram, "uNormalMatrix"),
        uSampler: this.gl.getUniformLocation(shaderProgram, "uSampler"),
      },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    this.buffers = initBuffers(this.gl);
    this.initTexture();

    // Flip image pixels into the bottom-to-top order that WebGL expects.
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);


    // Since our matrix is never going to change, we can define projection outside of drawScene function:
    this.projectionMatrix = mat4.create();
    mat4.ortho(this.projectionMatrix, -1, 1, -1, 1, -10, 10);

    // we will be reusing our frame buffer for all draws and reads
    // this improves performance and lessens production of garbage,
    // translating into fewer garbage collections (probably), resulting
    // in fewer hitches and other performance issues (probably)
    this.frameBuffer = new Uint8Array(this.frameBufferSize);
  }

  protected loadShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    // TODO: warn if shader failed to compile
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.warn('DEBUG: Shader Compilation Error: ', type, this.gl.getShaderInfoLog(shader), '(cheat sheet: vertex shaders:', this.gl.VERTEX_SHADER, ')');
      return null;
    }

    return shader;
  }

  protected loadShaders() {
    const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);

    return {vertexShader, fragmentShader};
  }

  private initShaderProgram() {
    const {vertexShader, fragmentShader} = this.loadShaders();

    // Create the shader program
    const shaderProgram = this.gl.createProgram();
    this.gl.attachShader(shaderProgram, vertexShader);
    this.gl.attachShader(shaderProgram, fragmentShader);
    this.gl.linkProgram(shaderProgram);

    // TODO: maybe give a warning if program failed to initialize
    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      console.warn('DEBUG — FAILED TO LINK SHADER PROGRAM', this.gl.getProgramInfoLog(shaderProgram))
      return null;
    }

    return shaderProgram;
  }

  private initTexture(): void {
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

    // Because video has to be download over the internet
    // they might take a moment until it's ready so
    // put a single pixel in the texture so we can
    // use it immediately.
    const level = 0;
    const internalFormat = this.gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = this.gl.RGBA;
    const srcType = this.gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel
    );

    // Turn off mips and set wrapping to clamp to edge so it
    // will work regardless of the dimensions of the video.
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  }

  protected updateTexture(video: HTMLVideoElement | HTMLCanvasElement | null) {
    const level = 0;
    const internalFormat = this.gl.RGBA;
    const srcFormat = this.gl.RGBA;
    const srcType = this.gl.UNSIGNED_BYTE;
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      video
    );
  }

  private setTextureAttribute() {
    const num = 2; // every coordinate composed of 2 values
    const type = this.gl.FLOAT; // the data in the buffer is 32-bit float
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set to the next
    const offset = 0; // how many bytes inside the buffer to start from

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.textureCoord);
    this.gl.vertexAttribPointer(
      this.programInfo.attribLocations.textureCoord,
      num,
      type,
      normalize,
      stride,
      offset
    );
    this.gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
  }

  private setPositionAttribute() {
    const numComponents = 3;
    const type = this.gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
    this.gl.vertexAttribPointer(
      this.programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
  }

  protected drawScene(): void {
    /**
     * Since we are drawing our frames in a way such that the entire canvas is
     * always covered by rendered video, and given our video is the only object
     * being rendered to the canvas, we can avoid some things, such as:
     *  * clearing the canvas
     *  * any sort of depth tests
     */

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    this.setPositionAttribute();
    this.setTextureAttribute();

    // Tell WebGL which indices to use to index the vertices, and to use
    // our program when drawing video frame to the canvas
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    this.gl.useProgram(this.programInfo.program);

    // Set the shader uniforms
    this.gl.uniformMatrix4fv(
      this.programInfo.uniformLocations.projectionMatrix,
      false,
      this.projectionMatrix
    );

    // Tell WebGL we want to affect texture unit 0, bind texture to texture unit 0,
    // and tell the shader that we bound the texture to texture unit 0.
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);

    // draw geometry
    const vertexCount = 6;
    const type = this.gl.UNSIGNED_SHORT;
    const offset = 0;
    this.gl.drawElements(this.gl.TRIANGLES, vertexCount, type, offset);
  }
}

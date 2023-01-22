/**
 * Used to detect ANGLE backend
 */

export enum AngleVersion {
  OpenGL,
  D3D9,
  D3D11,
  Metal,
  Vulkan,
  NotAvailable,
}

/**
 * Detects DirectX version. Note that D3D11 and D3D11on12
 * do not seem to be distinguishable
 * @param shaderSource
 * @returns
 */
function detectDX(shaderSource: string) {
  const glsl = shaderSource.match(/#version (\d+)( es)?$/m);

  const glslVer = +glsl[1];

  if (glslVer >= 300) {
    return AngleVersion.D3D11;
  }
  if (glslVer >= 100) {
    return AngleVersion.D3D9;
  }
}

/**
 * Detects OpenGL version.
 */
function detectGl(shaderSource: string) {
  // const glsl = shaderSource.match(/#version (\d+)( es)?$/m);
  // if (glsl && glsl[1]) {
  //   // GLSL version to OpenGL
  //   // https://en.wikipedia.org/wiki/OpenGL_Shading_Language
  //   const OpenGL = {
  //     100: "OpenGL ES 2.0",
  //     300: "OpenGL ES 3.0",
  //     110: "OpenGL 2.0",
  //     120: "OpenGL 2.1",
  //     130: "OpenGL 3.0",
  //     140: "OpenGL 3.1",
  //     150: "OpenGL 3.2",
  //     330: "OpenGL 3.3",
  //     400: "OpenGL 4.0",
  //     410: "OpenGL 4.1",
  //     420: "OpenGL 4.2",
  //     430: "OpenGL 4.3",
  //     440: "OpenGL 4.4",
  //     450: "OpenGL 4.5",
  //     460: "OpenGL 4.6",
  //   };

  //   return AngleVersion.OpenGL
  // }

  return AngleVersion.OpenGL;
}

/**
 * Detects angle backend version. Vulkan detection not implemented.
 * @param str
 * @returns
 */
function detectBackend(str) {

  if (str.match(/metal::float4/)) {
    return AngleVersion.Metal;
  }

  if (str.match(/VS_OUTPUT main\(/)) {
    return detectDX(str);
  }

  return detectGl(str);
}

/**
 * Checks which ANGLE backend is being used.
 * Known limitations: D11on12 cannot be detected.
 * @returns
 */
function detectANGLEBackend(): AngleVersion {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");

  const ext = (gl as any).getExtension("WEBGL_debug_shaders");

  if (!ext) {
    return AngleVersion.NotAvailable;
  }

  const isWebGL1 = gl instanceof WebGLRenderingContext;
  const shader = (gl as any).createShader((gl as any).VERTEX_SHADER);

  (gl as any).shaderSource(
    shader,
    `#version ${isWebGL1 ? "100" : "300 es"}
    void main() {
      gl_Position = vec4(__VERSION__, 1.0, 1.0, 1.0);
    }
  `
  );

  (gl as any).compileShader(shader);

  if (!(gl as any).getShaderParameter(shader, (gl as any).COMPILE_STATUS)) {
    console.error("invalid shader", (gl as any).getShaderInfoLog(shader));
    return AngleVersion.NotAvailable;
  }

  const source = ext.getTranslatedShaderSource(shader);

  return detectBackend(source);
}


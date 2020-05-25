/**
 * Generates shader that makes a sample that adds values of pixels within sampleRadius
 * and calculates how much they deviate from the average. sum of pixels is stored in 
 * the red pixel and diff is stored in the green one. Blue component holds the grayscale
 * average of the sample. Alpha component can be ignored.
 * 
 * 
 * RGBA pixel data:
 * 
 *  |       red         |       green       |       blue        |
 *  +-------------------+-------------------+-------------------+
 *  | sum of all pixels |   stdev of all    | avg of all pixels |
 *  |     in a row      |       pixels      |                   |
 *  |   (grayscale)     |    (grayscale)    |    (grayscale)    |
 * 
 * @param {number} sampleRadius sample width
 * @param {number} pixelSizeX size of a pixel on the texture (should be 1 / frameWidth)
 */

export function generateHorizontalAdder(sampleRadius, pixelSizeX) {

  if (sampleRadius < 1) {
    throw "Sample radius must be greater than 0!";
  }

  // build adder kernel
  let adderStatements = 'vec4 rowSum =';
  for (let i = sampleRadius - 1; i > 0; i--) {
    adderStatements += `${i == sampleRadius - 1 ? '' : ' +'} texture2D(u_frame, v_textureCoords + vec2(${-i * pixelSizeX}, 0))`;
  }
  adderStatements += ` + texture2D(u_frame, v_textureCoords + vec2(0, 0))`;
  for (let i = 0; i < sampleRadius; i++) {
    adderStatements += ` + texture2D(u_frame, v_textureCoords + vec2(${i * pixelSizeX}, 0))`;
  }
  adderStatements += ';';

  // build deviance kernel
  let stdDevStatements = `vec4 diffSum =`;
  for (let i = sampleRadius - 1; i > 0; i--) {
    stdDevStatements += `${i == sampleRadius - 1 ? '' : ' +'} abs(texture2D(u_frame, v_textureCoords + vec2(${-i * pixelSizeX}, 0)) - average)`; 
  }
  stdDevStatements += `+ abs(texture2D(u_frame, v_textureCoords + vec2(0, 0)) - average)`; 
  for (let i = sampleRadius - 1; i > 0; i--) {
    stdDevStatements += ` + abs(texture2D(u_frame, v_textureCoords + vec2(${i * pixelSizeX}, 0)) - average)`; 
  }
  stdDevStatements += ';';

  const shader = `
  precision mediump float;

  // texture/frame stuffs:
  uniform sampler2D u_frame;
  uniform vec2 u_textureSize;

  // texture coordinates passed from the vertex shader
  varying vec2 v_textureCoords;

  void main() {
    ${adderStatements}
    vec4 average = rowSum / ${sampleRadius * 2 + 1}.0;
    ${stdDevStatements}
    vec4 diff = diffSum / ${sampleRadius * 2 + 1}.0;

    float sumGrayscale = (rowSum.r + rowSum.g + rowSum.b) / 3.0;
    float diffGrayscale = (diff.r + diff.g + diff.b) / 3.0;

    gl_FragColor = vec4(sumGrayscale, diffGrayscale, (average.r + average.g + average.b) / 3.0, 1.0);
  }
  `
  // btw don't forget: output "image" should be way smaller than input frame

  return shader;
}

attribute vec2 a_position;
attribute vec2 a_textureCoords;

uniform vec2 u_resolution;
varying vec2 v_textureCoords;
 
void main() {
  // convert the position from pixels to uv coordinates
  vec2 uv = a_position / u_resolution;

  gl_Position = vec4(uv, 0, 0);

  // pass texture coordinates to fragment shader. GPU will
  // do interpolations
  v_textureCoords = a_textureCoords;
}

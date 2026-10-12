/*{
  "DESCRIPTION": "The visual input, inverted",
  "INPUTS": [ { "NAME": "inputImage", "TYPE": "image" } ]
}*/
void main() {
  vec4 c = IMG_THIS_NORM_PIXEL(inputImage);
  gl_FragColor = vec4(1.0 - c.rgb, 1.0);
}

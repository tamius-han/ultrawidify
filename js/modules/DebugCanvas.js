class DebugCanvas {
  constructor(ardConf){
    this.conf = ardConf;
  }

  init = async function(canvasSize, canvasPosition){
    console.log("initiating DebugCanvas")
   
    var body = document.getElementsByTagName('body')[0];
   
    if(!canvasPosition){
      canvasPosition = {
        top: 1200,
        left: 800
      }
    }
    if(!this.canvas){
      this.canvas = document.createElement("canvas");
      body.appendChild(this.canvas);
    }
    
    this.canvas.style.position = "absolute";
    this.canvas.style.left = `${canvasPosition.left}px`;
    this.canvas.style.top = `${canvasPosition.top}px`;
    this.canvas.style.zIndex = 10002;
    this.canvas.style.transform = "scale(2.5, 2.5)";
    this.canvas.id = "uw_debug_canvas";
    
    this.context = this.canvas.getContext("2d");
  
    this.canvas.width = canvasSize.width;
    this.canvas.height = canvasSize.height;
  
    console.log("debug canvas is:", this.canvas, "context:", this.context)
  }

  setBuffer = function(buffer) {
    // this.imageBuffer = buffer.splice(0);
    this.imageBuffer = new Uint8ClampedArray(buffer);
  }

  trace = function(className, arrayIndex){
    this.imageBuffer[arrayIndex  ] = this.traceColors[className][0];
    this.imageBuffer[arrayIndex+1] = this.traceColors[className][1];
    this.imageBuffer[arrayIndex+2] = this.traceColors[className][2];  
  }

  update(){
    if(this.context && this.imageBuffer instanceof Uint8ClampedArray){
      var idata = new ImageData(this.imageBuffer, this.canvas.width, this.canvas.height);
      this.putImageData(this.context, idata, 0, 0);
    }
  }


  putImageData(ctx, imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
    var data = imageData.data;
    var height = imageData.height;
    var width = imageData.width;
    dirtyX = dirtyX || 0;
    dirtyY = dirtyY || 0;
    dirtyWidth = dirtyWidth !== undefined? dirtyWidth: width;
    dirtyHeight = dirtyHeight !== undefined? dirtyHeight: height;
    var limitBottom = Math.min(dirtyHeight, height);
    var limitRight = Math.min(dirtyWidth, width);
    for (var y = dirtyY; y < limitBottom; y++) {
      for (var x = dirtyX; x < limitRight; x++) {
        var pos = y * width + x;
        ctx.fillStyle = 'rgba(' + data[pos*4+0]
                          + ',' + data[pos*4+1]
                          + ',' + data[pos*4+2]
                          + ',' + (data[pos*4+3]/255) + ')';
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }
}

DebugCanvasClasses = {
  VIOLATION = {color: '#ff4400', text: 'violation (general)'},
  WARN = {color: '#d08539', text: 'lesser violation (general)'},
  GUARDLINE_BLACKBAR = {color: '#3333FF', text: 'guardline/blackbar (expected value)'},
  GUARDLINE_IMAGE = {color: '#000088', text: 'guardline/image (expected value)'},
  
  EDGEDETECT_ONBLACK = {color: '#444444', text: 'edge detect - perpendicular (to edge)'},
  EDGEDETECT_BLACKBAR = {color: '#07ac93', text: 'edge detect - parallel, black test'},
  EDGEDETECT_IMAGE = {color: '#046c5c', text: 'edge detect - parallel, image test'}
}
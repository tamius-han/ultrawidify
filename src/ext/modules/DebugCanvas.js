class DebugCanvas {
  constructor(ardConf){
    this.conf = ardConf;
    this.targetWidth = 1280;
    this.targetHeight = 720;
    this.targetOffsetTop = 1080;
    this.targetOffsetLeft = 100;
  }

  init(canvasSize, canvasPosition, targetCanvasSize) {
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
    
    if(targetCanvasSize){
      this.targetWidth = targetCanvasSize.width;
      this.targetHeight = targetCanvasSize.height;
    }

    this.canvas.style.position = "absolute";
    this.canvas.style.left = `${canvasPosition.left}px`;
    this.canvas.style.top = `${canvasPosition.top}px`;
    this.canvas.style.zIndex = 10002;
    // this.canvas.id = "uw_debug_canvas";
    
    this.context = this.canvas.getContext("2d");
  
    this.canvas.width = canvasSize.width;
    this.canvas.height = canvasSize.height;
  
    this.calculateCanvasZoom();

    console.log("debug canvas is:", this.canvas, "context:", this.context)
  }

  calculateCanvasZoom(){
    var canvasZoom = this.targetWidth / this.canvas.width;
    var translateX = (this.canvas.width - this.targetWidth)/2;
    var translateY = (this.canvas.height - this.targetHeight)/2;

    this.canvas.style.transform = `scale(${canvasZoom},${canvasZoom}) translateX(${translateX}px) translateY(${translateY}px)`;
  }

  destroy(){
    if(this.canvas)
      this.canvas.remove();
  }

  setBuffer(buffer) {
    // this.imageBuffer = buffer.splice(0);
    this.imageBuffer = new Uint8ClampedArray(buffer);
  }

  trace(arrayIndex, colorClass) {
    this.imageBuffer[arrayIndex  ] = colorClass.colorRgb[0];
    this.imageBuffer[arrayIndex+1] = colorClass.colorRgb[1];
    this.imageBuffer[arrayIndex+2] = colorClass.colorRgb[2];  
  }

  update() {
    var start = performance.now();
    try{
      if(this.context && this.imageBuffer instanceof Uint8ClampedArray){
        try{
          var idata = new ImageData(this.imageBuffer, this.canvas.width, this.canvas.height);
        } catch (ee) {
          console.log("[DebugCanvas.js::update] can't create image data. Trying to correct canvas size. Error was:", ee);
          this.canvas.width = this.conf.canvas.width;
          this.canvas.height = this.conf.canvas.height;

          this.calculateCanvasZoom();
          // this.context = this.canvas.getContext("2d");
          var idata = new ImageData(this.imageBuffer, this.canvas.width, this.canvas.height);
        }
        this.putImageData(this.context, idata, 0, 0, 0, 0, this.canvas.width, this.canvas.height);
      }
    } catch(e) {
      console.log("[DebugCanvas.js::update] updating canvas failed.", e);
    }
    console.log("[DebugCanvas.js::update] update took", (performance.now() - start), "ms.");
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
  VIOLATION: {color: '#ff0000', colorRgb: [255, 00, 0], text: 'violation (general)'},
  WARN: {color: '#d0d039', colorRgb: [208, 208, 57], text: 'lesser violation (general)'},
  GUARDLINE_BLACKBAR: {color: '#3333FF', colorRgb: [51, 51, 255], text: 'guardline/blackbar (expected value)'},
  GUARDLINE_IMAGE: {color: '#000088', colorRgb: [0, 0, 136], text: 'guardline/image (expected value)'},
  
  EDGEDETECT_ONBLACK: {color: '#444444', colorRgb: [68, 68, 68], text: 'edge detect - perpendicular (to edge)'},
  EDGEDETECT_CANDIDATE: {color: '#FFFFFF', colorRgb: [255, 255, 255], text: 'edge detect - edge candidate'},
  EDGEDETECT_CANDIDATE_SECONDARY: {color: '#OOOOOO', colorRgb: [0, 0, 0], text: 'edge detect - edge candidate, but for when candidate is really bright'},
  EDGEDETECT_BLACKBAR: {color: '#07ac93', colorRgb: [7, 172, 147], text: 'edge detect - parallel, black test'},
  EDGEDETECT_IMAGE: {color: '#046c5c', colorRgb: [4, 108, 92], text: 'edge detect - parallel, image test'}
}
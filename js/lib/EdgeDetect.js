class EdgeDetect{

  constructor(ardConf){
    this.conf = ardConf;

    
    this.sampleWidthBase = ExtensionConf.arDetect.edgeDetection.sampleWidth << 2; // corrected so we can work on imageData
    this.halfSample = this.sampleWidthBase >> 1; 

    this.detectionTreshold = ExtensionConf.arDetect.edgeDetection.detectionTreshold;

    this.init(); // initiate things that can change
  }

  // initiates things that we may have to change later down the line
  init() {
    
  }

  findEdges(image, sampleCols, direction = EdgeDetectPrimaryDirection.VERTICAL, quality = EdgeDetectQuality.IMPROVED, guardLineOut){
    var fastCandidates, edgeCandidates, edges,
    if (direction == EdgeDetectPrimaryDirection.VERTICAL) {
      fastCandidates = this.findCandidates(image, sampleCols, guardLine);

      if(quality == EdgeDetectQuality.FAST){
        edges = fastCandidates;
      } else {
        edgeCandidates = this.edgeDetect(image, edges);
      }
    }
  }

  findCandidates(image, sampleCols, guardLineOut){
    var upper_top, upper_bottom, lower_top, lower_bottom;
    var blackbarTreshold;
    
    var cols_a = sampleCols;
    var cols_b = []
    
    // todo: cloning can be done better. check array.splice or whatever
    for(var i in cols){
      cols_b[i] = cols_a[i] + 0;
    }
    
    var res_top = [];
    var res_bottom = [];
    
    this.colsTreshold = cols.length * ExtensionConf.arDetect.edgeDetection.minColsForSearch;
    if(colsTreshold == 0)
      colsTreshold = 1;
    
    this.blackbarTreshold = this.conf.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
    
    
    // if guardline didn't fail and imageDetect did, we don't have to check the upper few pixels
    // but only if upper and lower edge are defined. If they're not, we need to check full height
    if(guardLineOut){
      if(guardLineOut.imageFail && !guardLineOut.blackbarFail && this.conf.guardLine.blackbar.top) {
        upper_top = this.conf.guardLine.blackbar.top;
        upper_bottom = this.conf.canvas.height >> 1;
        lower_top = upper_bottom;
        lower_bottom = this.conf.guardLine.blackbar.bottom;
      } else if (! guardLineOut.imageFail && !guardLineOut.blackbarFail && this.conf.guardLine.blackbar.top) {
        // ta primer se lahko zgodi tudi zaradi kakšnega logotipa. Ker nočemo, da nam en jeben
        // logotip vsili reset razmerja stranic, se naredimo hrvata in vzamemo nekaj varnostnega 
        // pasu preko točke, ki jo označuje guardLine.blackbar. Recimo 1/8 višine platna na vsaki strani.
        // a logo could falsely trigger this case, so we need to add some extra margins past
        // the point marked by guardLine.blackbar. Let's say 1/8 of canvas height on either side.
        upper_top = 0;
        upper_bottom = this.conf.guardLine.blackbar.top + (this.conf.canvas.height >> 3);
        lower_top = this.conf.guardLine.blackbar.bottom - (this.conf.canvas.height >> 3);
        lower_bottom = this.conf.canvas.height - 1;
      } else {
        upper_top = 0;
        upper_bottom = (this.canvas.height >> 1) /*- parseInt(this.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
        lower_top = (this.canvas.height >> 1) /*+ parseInt(this.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
        lower_bottom = this.canvas.height - 1;
      }
    } else{
      upper_top = 0;
      upper_bottom = (this.canvas.height >> 1) /*- parseInt(this.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
      lower_top = (this.canvas.height >> 1) /*+ parseInt(this.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
      lower_bottom = this.canvas.height - 1;
    }

    if(Debug.debug){
      console.log("[EdgeDetect::findCandidates] searching for candidates on ranges", upper_top, "<->", upper_bottom, ";", lower_top, "<->", lower_bottom)
    }
    
    var upper_top_corrected = upper_top * this.conf.canvasImageDataRowLength;
    var upper_bottom_corrected = upper_bottom * this.conf.canvasImageDataRowLength;
    var lower_top_corrected = lower_top * this.conf.canvasImageDataRowLength;
    var lower_bottom_corrected = lower_bottom * this.conf.canvasImageDataRowLength;
    
    if(Debug.debugCanvas.enabled){
      this._columnTest_dbgc(image, upper_top_corrected, upper_bottom_corrected, cols_a, res_top, false);
      this._columnTest_dbgc(image, lower_top_corrected, lower_bottom_corrected, cols_b, res_bottom, true);
    } else {
      this._columnTest(image, upper_top_corrected, upper_bottom_corrected, cols_a, res_top, false);
      this._columnTest(image, lower_top_corrected, lower_bottom_corrected, cols_b, res_bottom, true);
    }
    
    return {res_top: res_top, res_bottom: res_bottom};
  }



  // dont call the following outside of this class

  edgeDetect(image, samples){
    var edgeCandidatesTop = {count: 0};
    var edgeCandidatesBottom = {count: 0};
    
    var detections;
    var canvasWidth = this.conf.canvas.width;
    var canvasHeight = this.conf.canvas.height;
    
    var sampleStart, sampleEnd, loopEnd;
    var sampleRow_black, sampleRow_color;
    
    var blackEdgeViolation = false;
    
    var topEdgeCount = 0;
    var bottomEdgeCount = 0;
    
    
    for(sample of samples.res_top){
      blackEdgeViolation = false; // reset this
      
      // determine our bounds. Note that sample.col is _not_ corrected for imageData, but halfSample is
      sampleStart = (sample.col << 2) - this.halfSample;
      
      if(sampleStart < 0)
        sampleStart = 0;
      
      sampleEnd = sampleStart + this.sampleWidthBase;
      if(sampleEnd > this.conf.canvas.imageDataRowLength)
        sampleEnd = this.conf.canvas.imageDataRowLength;
      
      // calculate row offsets for imageData array
      sampleRow_black = (sample.top - ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvas.imageDataRowLength;
      sampleRow_color = (sample.top + 1 + ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvas.imageDataRowLength;
      
      // že ena kršitev črnega roba pomeni, da kandidat ni primeren
      // even a single black edge violation means the candidate is not an edge
      loopEnd = sampleRow_black + sampleEnd;

      if(Debug.debugCanvas.enabled){
        blackEdgeViolation = this._blackbarTest_dbg(image, sampleRow_black + sampleStart, loopEnd);
      } else {
        blackEdgeViolation = this._blackbarTest(image, sampleRow_black + sampleStart, loopEnd);
      }

      // če je bila črna črta skrunjena, preverimo naslednjega kandidata
      // if we failed, we continue our search with the next candidate
      if(blackEdgeViolation)
        continue;
      
      detections = 0;
      loopEnd = sampleRow_color + sampleEnd;

      if(Debug.debugCanvas.enabled) {
        this._imageTest_dbg(image, sampleRow_color + sampleStart, loopEnd, sample, edgeCandidatesTop)
      } else {
        this._imageTest(image, start, end, sample, edgeCandidatesBottom)
      }
    }
    
    for(sample of samples.res_bottom){
      blackEdgeViolation = false; // reset this
      
      // determine our bounds. Note that sample.col is _not_ corrected for imageData, but this.halfSample is
      sampleStart = (sample.col << 2) - this.halfSample;
      
      if(sampleStart < 0)
        sampleStart = 0;
      
      sampleEnd = sampleStart + this.sampleWidthBase;
      if(sampleEnd > this.conf.canvas.imageDataRowLength)
        sampleEnd = this.conf.canvas.imageDataRowLength;
      
      // calculate row offsets for imageData array
      sampleRow_black = (sample.bottom + ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvas.imageDataRowLength;
      sampleRow_color = (sample.bottom - 1 - ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvas.imageDataRowLength;
      
      // že ena kršitev črnega roba pomeni, da kandidat ni primeren
      // even a single black edge violation means the candidate is not an edge
      loopEnd = sampleRow_black + sampleEnd;
      
      if(Debug.debugCanvas.enabled){
        blackEdgeViolation = this._blackbarTest_dbg(image, sampleRow_black + sampleStart, loopEnd);
      } else {
        blackEdgeViolation = this._blackbarTest(image, sampleRow_black + sampleStart, loopEnd);
      }
      
      // če je bila črna črta skrunjena, preverimo naslednjega kandidata
      // if we failed, we continue our search with the next candidate
      if(blackEdgeViolation)
        continue;
      
      detections = 0;
      loopEnd = sampleRow_color + sampleEnd;

      if(Debug.debugCanvas.enabled) {
        this._imageTest_dbg(image, sampleRow_color + sampleStart, loopEnd, sample, edgeCandidatesTop);
      } else {
        this._imageTest(image, start, end, sample, edgeCandidatesBottom);
      }
    }
    
    return {
      edgeCandidatesTop: edgeCandidatesTop,
      edgeCandidatesTopCount: edgeCandidatesTop.count,
      edgeCandidatesBottom: edgeCandidatesBottom,
      edgeCandidatesBottomCount: edgeCandidatesBottom.count
    };
  }


  // pomožne funkcije
  // helper functions

  _columnTest(image, top, bottom, colsIn, colsOut, reverseSearchDirection){
    var tmpI;
    if(reverseSearchDirection){
      for(var i = bottom - this.conf.canvasImageDataRowLength; i >= top; i-= this.conf.canvasImageDataRowLength){
        for(var col of colsIn){
          tmpI = i + (col << 2);
          
          if( image[tmpI]     > this.blackbarTreshold || 
              image[tmpI + 1] > this.blackbarTreshold ||
              image[tmpI + 2] > this.blackbarTreshold ){
            
            var bottom = (i / this.conf.canvasImageDataRowLength) + 1;
            colsOut.push({
              col: col,
              bottom: bottom,
              bottomRelative: this.canvas.height - bottom
            });
            colsIn.splice(colsIn.indexOf(col), 1);
          }
        }
        if(colsIn.length < this.colsTreshold)
          break;
      }
    } else {
      for(var i = top; i < bottom; i+= this.conf.canvasImageDataRowLength){
        for(var col of colsIn){
          tmpI = i + (col << 2);
          
          if( image[tmpI]     > this.blackbarTreshold || 
              image[tmpI + 1] > this.blackbarTreshold ||
              image[tmpI + 2] > this.blackbarTreshold ){
          
            colsOut.push({
              col: col,
              top: (i / this.conf.canvasImageDataRowLength) - 1
            });
            colsIn.splice(cols_a.indexOf(col), 1);
          }
        }
        if(colsIn.length < this.colsTreshold)
          break;
      }
    }
  }

  _columnTest_dbgc(image, top, bottom, colsIn, colsOut, reverseSearchDirection){
    var tmpI;
    if(reverseSearchDirection){
      for(var i = bottom - this.conf.canvasImageDataRowLength; i >= top; i-= this.conf.canvasImageDataRowLength){
        for(var col of colsIn){
          tmpI = i + (col << 2);
          
          if( image[tmpI]     > this.blackbarTreshold || 
              image[tmpI + 1] > this.blackbarTreshold ||
              image[tmpI + 2] > this.blackbarTreshold ){
            
            var bottom = (i / this.conf.canvasImageDataRowLength) + 1;
            colsOut.push({
              col: col,
              bottom: bottom,
              bottomRelative: this.canvas.height - bottom
            });
            colsIn.splice(colsIn.indexOf(col), 1);
            this.conf.debugCanvas.trace(tmpI,DebugCanvasClasses.EDGEDETECT_CANDIDATE);
          }
          else{
            this.conf.debugCanvas.trace(tmpI, DebugCanvasClasses.EDGEDETECT_ONBLACK);
          }
        }
        if(colsIn.length < this.colsTreshold)
          break;
      }
    } else {
      for(var i = top; i < bottom; i+= this.conf.canvasImageDataRowLength){
        for(var col of colsIn){
          tmpI = i + (col << 2);
          
          if( image[tmpI]     > this.blackbarTreshold || 
              image[tmpI + 1] > this.blackbarTreshold ||
              image[tmpI + 2] > this.blackbarTreshold ){
          
            colsOut.push({
              col: col,
              top: (i / this.conf.canvasImageDataRowLength) - 1
            });
            colsIn.splice(cols_a.indexOf(col), 1);
            this.conf.debugCanvas.trace(tmpI, DebugCanvasClasses.EDGEDETECT_CANDIDATE);            
          } else {
            this.conf.debugCanvas.trace(tmpI, DebugCanvasClasses.EDGEDETECT_ONBLACK);
          }
        }
        if(colsIn.length < this.colsTreshold)
          break;
      }
    }
  }

  _blackbarTest(image, start, end){
    for(var i = sampleRow_black + sampleStart; i < loopEnd; i += 4){
      if( image[i  ] > this.blackbarTreshold ||
          image[i+1] > this.blackbarTreshold ||
          image[i+2] > this.blackbarTreshold ){
        return true;
      }
    }
    return false; // no violation
  }

  _blackbarTest_dbg(image, start, end){
    for(var i = start; i < end; i += 4){
      if( image[i  ] > this.blackbarTreshold ||
          image[i+1] > this.blackbarTreshold ||
          image[i+2] > this.blackbarTreshold ){
        
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.VIOLATION)
        return true;
      } else {
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.EDGEDETECT_BLACKBAR)
      }
    }

    return false; // no violation
  }

  _imageTest(image, start, end, sample, edgeCandidates){
    var detections = 0;

    for(var i = start; i < end; i += 4){
      if( image[i  ] > this.blackbarTreshold ||
          image[i+1] > this.blackbarTreshold ||
          image[i+2] > this.blackbarTreshold ){
        ++detections;
        }
    }
    if(detections >= detectionTreshold){
      if(edgeCandidates[sample.top] != undefined)
        edgeCandidates[sample.top].count++;
      else{
        edgeCandidates[sample.top] = {top: sample.top, count: 1};
        edgeCandidates.count++;
      }
    }
  }

  _imageTest_dbg(image, start, end, sample, edgeCandidates){
    var detections = 0;

    for(var i = start; i < end; i += 4){
      if( image[i  ] > this.blackbarTreshold ||
        image[i+1] > this.blackbarTreshold ||
        image[i+2] > this.blackbarTreshold ){
        ++detections;
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.EDGEDETECT_IMAGE);
      } else {
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.WARN);
      }
    }
    if(detections >= this.detectionTreshold){
      if(edgeCandidates[sample.top] != undefined)
        edgeCandidates[sample.top].count++;
      else{
        edgeCandidates[sample.top] = {top: sample.top, count: 1};
        edgeCandidates.count++;
      }
    }
  }

}

var EdgeDetectPrimaryDirection = {
  VERTICAL: 0,
  HORIZONTAL: 1
}

var EdgeDetectQuality = {
  FAST: 0,
  IMPROVED: 1
}
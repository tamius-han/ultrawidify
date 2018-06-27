var EdgeDetectPrimaryDirection = {
  VERTICAL: 0,
  HORIZONTAL: 1
}

var EdgeDetectQuality = {
  FAST: 0,
  IMPROVED: 1
}

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

  findBars(image, sampleCols, direction = EdgeDetectPrimaryDirection.VERTICAL, quality = EdgeDetectQuality.IMPROVED, guardLineOut){
    var fastCandidates, edgeCandidates, bars;
    if (direction == EdgeDetectPrimaryDirection.VERTICAL) {
      fastCandidates = this.findCandidates(image, sampleCols, guardLineOut);

      // if(quality == EdgeDetectQuality.FAST){
      //   edges = fastCandidates; // todo: processing
      // } else {
        edgeCandidates = this.edgeDetect(image, fastCandidates);
        bars = this.edgePostprocess(edgeCandidates, this.conf.canvas.height);

      // }
    } else {
      bars = this.pillarTest(image) ? {status: 'ar_known'} : {status: 'ar_unknown'};
    }

    return bars;
  }

  findCandidates(image, sampleCols, guardLineOut){
    var upper_top, upper_bottom, lower_top, lower_bottom;
    var blackbarTreshold;
    
    var cols_a = sampleCols.slice(0);
    var cols_b = cols_a.slice(0);
    
    // todo: cloning can be done better. check array.splice or whatever
    for(var i in sampleCols){
      cols_b[i] = cols_a[i] + 0;
    }
    
    var res_top = [];
    var res_bottom = [];
    
    this.colsTreshold = sampleCols.length * ExtensionConf.arDetect.edgeDetection.minColsForSearch;
    if(this.colsTreshold == 0)
      this.colsTreshold = 1;
    
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
        upper_bottom = (this.conf.canvas.height >> 1) /*- parseInt(this.conf.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
        lower_top = (this.conf.canvas.height >> 1) /*+ parseInt(this.conf.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
        lower_bottom = this.conf.canvas.height - 1;
      }
    } else{
      upper_top = 0;
      upper_bottom = (this.conf.canvas.height >> 1) /*- parseInt(this.conf.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
      lower_top = (this.conf.canvas.height >> 1) /*+ parseInt(this.conf.canvas.height * ExtensionConf.arDetect.edgeDetection.middleIgnoredArea);*/
      lower_bottom = this.conf.canvas.height - 1;
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
    
    var sample;
    
    for(sample of samples.res_top){
      blackEdgeViolation = false; // reset this
      
      // determine our bounds. Note that sample.col is _not_ corrected for imageData, but halfSample is
      sampleStart = (sample.col << 2) - this.halfSample;
      
      if(sampleStart < 0)
        sampleStart = 0;
      
      sampleEnd = sampleStart + this.sampleWidthBase;
      if(sampleEnd > this.conf.canvasImageDataRowLength)
        sampleEnd = this.conf.canvasImageDataRowLength;
      
      // calculate row offsets for imageData array
      sampleRow_black = (sample.top - ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      sampleRow_color = (sample.top + 1 + ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      
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
        this._imageTest_dbg(image, sampleRow_color + sampleStart, loopEnd, sample.top, edgeCandidatesTop)
      } else {
        this._imageTest(image, sampleRow_color + sampleStart, loopEnd, sample.top, edgeCandidatesTop)
      }
    }
    
    for(sample of samples.res_bottom){
      blackEdgeViolation = false; // reset this
      
      // determine our bounds. Note that sample.col is _not_ corrected for imageData, but this.halfSample is
      sampleStart = (sample.col << 2) - this.halfSample;
      
      if(sampleStart < 0)
        sampleStart = 0;
      
      sampleEnd = sampleStart + this.sampleWidthBase;
      if(sampleEnd > this.conf.canvasImageDataRowLength)
        sampleEnd = this.conf.canvasImageDataRowLength;
      
      // calculate row offsets for imageData array
      sampleRow_black = (sample.bottom + ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      sampleRow_color = (sample.bottom - 1 - ExtensionConf.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      
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
        this._imageTest_dbg(image, sampleRow_color + sampleStart, loopEnd, sample.bottom, edgeCandidatesBottom);
      } else {
        this._imageTest(image, sampleRow_color + sampleStart, loopEnd, sample.bottom, edgeCandidatesBottom);
      }
    }
    
    return {
      edgeCandidatesTop: edgeCandidatesTop,
      edgeCandidatesTopCount: edgeCandidatesTop.count,
      edgeCandidatesBottom: edgeCandidatesBottom,
      edgeCandidatesBottomCount: edgeCandidatesBottom.count
    };
  }

  edgePostprocess(edges){
    var edgesTop = [];
    var edgesBottom = [];
    var alignMargin = this.conf.canvas.height * ExtensionConf.arDetect.allowedMisaligned;
    
    var missingEdge = edges.edgeCandidatesTopCount == 0 || edges.edgeCandidatesBottomCount == 0;
    
    // pretvorimo objekt v tabelo
    // convert objects to array
    
    delete(edges.edgeCandidatesTop.count);
    delete(edges.edgeCandidatesBottom.count);

    if( edges.edgeCandidatesTopCount > 0){
      for(var e in edges.edgeCandidatesTop){
        var edge = edges.edgeCandidatesTop[e];
        edgesTop.push({
          distance: edge.offset,
          absolute: edge.offset,
          count: edge.count
        });
      }
    }
    
    if( edges.edgeCandidatesBottomCount > 0){
      for(var e in edges.edgeCandidatesBottom){
        var edge = edges.edgeCandidatesBottom[e];
        edgesBottom.push({
          distance: this.conf.canvas.height - edge.offset,
          absolute: edge.offset,
          count: edge.count
        });
      }
    }
    
    // sort by distance
    edgesTop = edgesTop.sort((a,b) => {return a.distance - b.distance});
    edgesBottom = edgesBottom.sort((a,b) => {return a.distance - b.distance});

    // če za vsako stran (zgoraj in spodaj) poznamo vsaj enega kandidata, potem lahko preverimo nekaj
    // stvari
    
    if(! missingEdge ){
    // predvidevamo, da je logo zgoraj ali spodaj, nikakor pa ne na obeh straneh hkrati.
    // če kanal logotipa/watermarka ni vključil v video, potem si bosta razdaliji (edge.distance) prvih ključev
    // zgornjega in spodnjega roba približno enaki  
    //
    // we'll assume that no youtube channel is rude enough to put channel logo/watermark both on top and the bottom
    // of the video. If logo's not included in the video, distances (edge.distance) of the first two keys should be
    // roughly equal. Let's check for that.
      if( edgesTop[0].distance >= edgesBottom[0].distance - alignMargin &&
          edgesTop[0].distance <= edgesBottom[0].distance + alignMargin ){
        
        var blackbarWidth = edgesTop[0].distance > edgesBottom[0].distance ? 
                            edgesTop[0].distance : edgesBottom[0].distance;
        
        return {
          status: "ar_known",
          blackbarWidth: blackbarWidth,
          guardLineTop: edgesTop[0].distance,
          guardLineBottom: edgesBottom[0].absolute,

          top: edgesTop[0].distance,
          bottom: edgesBottom[0].distance
        };
      }
    
      // torej, lahko da je na sliki watermark. Lahko, da je slika samo ornh črna. Najprej preverimo za watermark
      // it could be watermark. It could be a dark frame. Let's check for watermark first.
      if( edgesTop[0].distance < edgesBottom[0].distance &&
          edgesTop[0].count    < edgesBottom[0].count    &&
          edgesTop[0].count    < GlobalVars.arDetect.sampleCols * ExtensionConf.arDetect.edgeDetection.logoTreshold){
        // možno, da je watermark zgoraj. Preverimo, če se kateri od drugih potencialnih robov na zgornjem robu
        // ujema s prvim spodnjim (+/- variance). Če je temu tako, potem bo verjetno watermark. Logo mora imeti
        // manj vzorcev kot navaden rob.
        
        if(edgesTop[0].length > 1){
          var lowMargin = edgesBottom[0].distance - alignMargin;
          var highMargin = edgesBottom[0].distance + alignMargin;
          
          for(var i = 1; i < edgesTop.length; i++){
            if(edgesTop[i].distance >= lowMargin && edgesTop[i].distance <= highMargin){
              // dobili smo dejanski rob. vrnimo ga
              // we found the actual edge. let's return that.
              var blackbarWidth = edgesTop[i].distance > edgesBottom[0].distance ? 
                                  edgesTop[i].distance : edgesBottom[0].distance;
              
              return {
                status: "ar_known",
                blackbarWidth: blackbarWidth,
                guardLineTop: edgesTop[i].distance,
                guardLineBottom: edgesBottom[0].absolute,
              
                top: edgesTop[i].distance,
                bottom: edgesBottom[0].distance
              };
            }
          }
        }
      }
      if( edgesBottom[0].distance < edgesTop[0].distance &&
          edgesBottom[0].count    < edgesTop[0].count    &&
          edgesBottom[0].count    < GlobalVars.arDetect.sampleCols * ExtensionConf.arDetect.edgeDetection.logoTreshold){
        
        if(edgesBottom[0].length > 1){
          var lowMargin = edgesTop[0].distance - alignMargin;
          var highMargin = edgesTop[0].distance + alignMargin;
          
          for(var i = 1; i < edgesBottom.length; i++){
            if(edgesBottom[i].distance >= lowMargin && edgesTop[i].distance <= highMargin){
              // dobili smo dejanski rob. vrnimo ga
              // we found the actual edge. let's return that.
              var blackbarWidth = edgesBottom[i].distance > edgesTop[0].distance ? 
                                  edgesBottom[i].distance : edgesTop[0].distance;
              
              return {
                status: "ar_known",
                blackbarWidth: blackbarWidth,
                guardLineTop: edgesTop[0].distance,
                guardLineBottom: edgesBottom[0].absolute,

                top: edgesTop[0].distance,
                bottom: edgesBottom[i].distance
              };
            }
          }
        }
      }
    }
    else{
      // zgornjega ali spodnjega roba nismo zaznali. Imamo še en trik, s katerim lahko poskusimo 
      // določiti razmerje stranic
      // either the top or the bottom edge remains undetected, but we have one more trick that we
      // can try. It also tries to work around logos.
      
      var edgeDetectionTreshold = GlobalVars.arDetect.sampleCols * ExtensionConf.arDetect.edgeDetection.singleSideConfirmationTreshold;
      
      if(edges.edgeCandidatesTopCount == 0 && edges.edgeCandidatesBottomCount != 0){
        for(var edge of edgesBottom){
          if(edge.count >= edgeDetectionTreshold)
            return {
              status: "ar_known", 
              blackbarWidth: edge.distance,
              guardLineTop: null,
              guardLineBottom: edge.bottom,
            
              top: edge.distance,
              bottom: edge.distance
            }
        }
      }
      if(edges.edgeCandidatesTopCount != 0 && edges.edgeCandidatesBottomCount == 0){
        for(var edge of edgesTop){
          if(edge.count >= edgeDetectionTreshold)
            return {
              status: "ar_known",
              blackbarWidth: edge.distance,
              guardLineTop: edge.top,
              guardLineBottom: null,
            
              top: edge.distance,
              bottom: edge.distance
            }
        }
      }
    }
    // če pridemo do sem, nam ni uspelo nič. Razmerje stranic ni znano
    // if we reach this bit, we have failed in determining aspect ratio. It remains unknown.
    return {status: "ar_unknown"}
  }
  
  pillarTest(image){
    // preverimo, če na sliki obstajajo navpične črne obrobe. Vrne 'true' če so zaznane (in če so približno enako debele), 'false' sicer.
    // true vrne tudi, če zaznamo preveč črnine.
    //                             <==XX(::::}----{::::)XX==>
    // checks the image for presence of vertical pillars. Less accurate than 'find blackbar limits'. If we find a non-black object that's
    // roughly centered, we return true. Otherwise we return false.
    // we also return true if we detect too much black
  
    var blackbarTreshold, upper, lower;
    blackbarTreshold = this.conf.blackLevel + ExtensionConf.arDetect.blackbarTreshold;
  
  
    var middleRowStart = (this.conf.canvas.height >> 1) * this.conf.canvas.width;
    var middleRowEnd = middleRowStart + this.conf.canvas.width - 1;
  
    var rowStart = middleRowStart << 2;
    var midpoint = (middleRowStart + (this.conf.canvas.width >> 1)) << 2
    var rowEnd = middleRowEnd << 2;
  
    var edge_left = -1, edge_right = -1;
  
    // preverimo na levi strani
    // let's check for edge on the left side
    for(var i = rowStart; i < midpoint; i+=4){
      if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
        edge_left = (i - rowStart) >> 2;
        break;
      }
    }
  
    // preverimo na desni strani
    // check on the right
    for(var i = rowEnd; i > midpoint; i-= 4){
      if(image[i] > blackbarTreshold || image[i+1] > blackbarTreshold || image[i+2] > blackbarTreshold){
        edge_right =  this.conf.canvas.width - ((i - rowStart) >> 2);
        break;
      }
    }
  
    // če je katerikoli -1, potem imamo preveč črnine
    // we probably have too much black if either of those two is -1
    if(edge_left == -1 || edge_right == -1){
      return true;
    }
  
    // če sta oba robova v mejah merske napake, potem vrnemo 'false'
    // if both edges resemble rounding error, we retunr 'false'
    if(edge_left < ExtensionConf.arDetect.pillarTest.ignoreThinPillarsPx && edge_right < ExtensionConf.arDetect.pillarTest.ignoreThinPillarsPx){
      return false;
    }
  
    var edgeError = ExtensionConf.arDetect.pillarTest.allowMisaligned;
    var error_low = 1 - edgeError;
    var error_hi = 1 + edgeError;
  
    // če sta 'edge_left' in 'edge_right' podobna/v mejah merske napake, potem vrnemo true — lahko da smo našli logo na sredini zaslona
    // if 'edge_left' and 'edge_right' are similar enough to each other, we return true. If we found a logo in a black frame, we could
    // crop too eagerly 
    if( (edge_left * error_low) < edge_right &&
        (edge_left * error_hi) > edge_right  ){
      return true;
    }
  
    // če se ne zgodi nič od neštetega, potem nismo našli problemov
    // if none of the above, we haven't found a problem
    return false;
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
              bottom: bottom
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
            colsIn.splice(colsIn.indexOf(col), 1);
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
              bottom: bottom
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
            colsIn.splice(colsIn.indexOf(col), 1);
            this.conf.debugCanvas.trace(tmpI, DebugCanvasClasses.EDGEDETECT_CANDIDATE);      
            if(tmpI-1 > 0){
              this.conf.debugCanvas.trace(tmpI - 1, DebugCanvasClasses.EDGEDETECT_CANDIDATE_SECONDARY);
            }
            if(tmpI+1 < image.length){
              this.conf.debugCanvas.trace(tmpI + 1, DebugCanvasClasses.EDGEDETECT_CANDIDATE_SECONDARY);
            }
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
    for(var i = start; i < end; i += 4){
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

  _imageTest(image, start, end, sampleOffset, edgeCandidates){
    var detections = 0;

    for(var i = start; i < end; i += 4){
      if( image[i  ] > this.blackbarTreshold ||
          image[i+1] > this.blackbarTreshold ||
          image[i+2] > this.blackbarTreshold ){
        ++detections;
        }
    }
    if(detections >= this.detectionTreshold){
      if(edgeCandidates[sampleOffset] != undefined)
        edgeCandidates[sampleOffset].count++;
      else{
        edgeCandidates[sampleOffset] = {offset: sampleOffset, count: 1};
        edgeCandidates.count++;
      }
    }
  }

  _imageTest_dbg(image, start, end, sampleOffset, edgeCandidates){
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
      if(edgeCandidates[sampleOffset] != undefined)
        edgeCandidates[sampleOffset].count++;
      else{
        edgeCandidates[sampleOffset] = {offset: sampleOffset, count: 1};
        edgeCandidates.count++;
      }
    }
  }

}
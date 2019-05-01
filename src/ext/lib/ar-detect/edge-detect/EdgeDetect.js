import Debug from '../../../conf/Debug';
import EdgeStatus from './enums/EdgeStatusEnum';
import EdgeDetectQuality from './enums/EdgeDetectQualityEnum';
import EdgeDetectPrimaryDirection from './enums/EdgeDetectPrimaryDirectionEnum';
import AntiGradientMode from '../../../../common/enums/anti-gradient-mode.enum'; 

if (Debug.debug) {
  console.log("Loading EdgeDetect.js");
}

class EdgeDetect{

  constructor(ardConf){
    this.conf = ardConf;
    this.settings = ardConf.settings;

    this.sampleWidthBase = this.settings.active.arDetect.edgeDetection.sampleWidth << 2; // corrected so we can work on imageData
    this.halfSample = this.sampleWidthBase >> 1; 

    this.detectionThreshold = this.settings.active.arDetect.edgeDetection.detectionThreshold;

    this.init(); // initiate things that can change
  }

  // initiates things that we may have to change later down the line
  init() {
    
  }

  findBars(image, sampleCols, direction = EdgeDetectPrimaryDirection.VERTICAL, quality = EdgeDetectQuality.IMPROVED, guardLineOut, blackFrameAnalysis){
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
      bars = this.pillarTest(image) ? {status: EdgeStatus.AR_KNOWN} : {status: EdgeStatus.AR_UNKNOWN};
    }

    return bars;
  }

  findCandidates(image, sampleCols, guardLineOut){
    try {
    let upper_top, upper_bottom, lower_top, lower_bottom;
    
    // const cols_a = sampleCols.slice(0);
    const cols_a = new Array(sampleCols.length);
    const res_top_preliminary = new Array(sampleCols.length);
    
    for (let i = 0; i < cols_a.length; i++) {
      cols_a[i] = {
        id: i,
        value: sampleCols[i],
        blackFound: false,
        imageFound: false,
      };
      res_top_preliminary[i] = {col: undefined, image: undefined, black: undefined};
    }

    const cols_b = cols_a.slice(0);
    const res_bottom_preliminary = res_top_preliminary.slice(0);
    
    console.log("[EdgeDetect::findCandidates] cols a, b:", cols_a, cols_b);

    
    this.colsThreshold = sampleCols.length * this.settings.active.arDetect.edgeDetection.minColsForSearch;
    if (this.colsThreshold == 0)
      this.colsThreshold = 1;
    
    this.blackbarThreshold = this.conf.blackLevel + this.settings.active.arDetect.blackbar.threshold;
    this.imageThreshold = this.blackbarThreshold + this.settings.active.arDetect.blackbar.imageThreshold;
    
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
        upper_bottom = (this.conf.canvas.height >> 1) /*- parseInt(this.conf.canvas.height * this.settings.active.arDetect.edgeDetection.middleIgnoredArea);*/
        lower_top = (this.conf.canvas.height >> 1) /*+ parseInt(this.conf.canvas.height * this.settings.active.arDetect.edgeDetection.middleIgnoredArea);*/
        lower_bottom = this.conf.canvas.height - 1;
      }
    } else{
      upper_top = 0;
      upper_bottom = (this.conf.canvas.height >> 1) /*- parseInt(this.conf.canvas.height * this.settings.active.arDetect.edgeDetection.middleIgnoredArea);*/
      lower_top = (this.conf.canvas.height >> 1) /*+ parseInt(this.conf.canvas.height * this.settings.active.arDetect.edgeDetection.middleIgnoredArea);*/
      lower_bottom = this.conf.canvas.height - 1;
    }

    if(Debug.debug && Debug.debugArDetect){
      console.log("[EdgeDetect::findCandidates] searching for candidates on ranges", upper_top, "<->", upper_bottom, ";", lower_top, "<->", lower_bottom);
    }
    
    var upper_top_corrected = upper_top * this.conf.canvasImageDataRowLength;
    var upper_bottom_corrected = upper_bottom * this.conf.canvasImageDataRowLength;
    var lower_top_corrected = lower_top * this.conf.canvasImageDataRowLength;
    var lower_bottom_corrected = lower_bottom * this.conf.canvasImageDataRowLength;
    
    // if(Debug.debugCanvas.enabled){
      // this._columnTest_dbgc(image, upper_top_corrected, upper_bottom_corrected, cols_a, res_top_preliminary, false);
      // this._columnTest_dbgc(image, lower_top_corrected, lower_bottom_corrected, cols_b, res_bottom_preliminary, true);
    // } else {
      // this._columnTest(image, upper_top_corrected, upper_bottom_corrected, cols_a, res_top_preliminary, false);
      // this._columnTest(image, lower_top_corrected, lower_bottom_corrected, cols_b, res_bottom_preliminary, true);
      this._columnTest2(image, upper_top_corrected, upper_bottom_corrected, cols_a, res_top_preliminary, false);
      this._columnTest2(image, lower_top_corrected, lower_bottom_corrected, cols_b, res_bottom_preliminary, true);
    // }
    
    if(Debug.debug && Debug.debugArDetect){
      console.log("[EdgeDetect::findCandidates] candidates found -->", {res_top: res_top_preliminary, res_bottom: res_bottom_preliminary});
    }

    // preglejmo, kateri kandidati so neprimerni. (Neprimerni so tisti, pri katerih se
    // 'black' in 'image' razlikujeta za več kot settings.arDetect.blackbar.gradientThreshold)
    // 
    // let's check which candidates are suitable. Suitable candidates have 'black' and 'image'
    // components differ by less than settings.arDetect.blackbar.gradientThreshold

    const res_top = [];
    const res_bottom = [];

    for (let item of res_top_preliminary) {
      if (this.settings.active.arDetect.blackbar.antiGradientMode === AntiGradientMode.Disabled) {
        res_top.push({top: item.image, col: item.col});
      } else if (this.settings.active.arDetect.blackbar.antiGradientMode === AntiGradientMode.Lax) {
        if (item.image === undefined || item.image <= item.black + this.settings.active.arDetect.blackbar.gradientThreshold) {
          res_top.push({top: item.image, col: item.col});
        }
      } else {
        if ( item.image !== undefined && item.image <= item.black + this.settings.active.arDetect.blackbar.gradientThreshold) {
          res_top.push({top: item.image, col: item.col});
        }
      }
    }
    for (let item of res_bottom_preliminary) {
      if (!item.image) {
        continue;
      }
      if (this.settings.active.arDetect.blackbar.antiGradientMode === AntiGradientMode.Disabled) {
        res_bottom.push({bottom: item.image, col: item.col});
      } else {
        if ( (item.image !== undefined || this.settings.active.arDetect.blackbar.antiGradientMode === AntiGradientMode.Lax)
            && item.image >= item.black - this.settings.active.arDetect.blackbar.gradientThreshold) {
          res_bottom.push({bottom: item.image, col: item.col});
        }
      }
    }

    // const res_top = res_top_preliminary;
    // const res_bottom = res_bottom_preliminary;

    if(Debug.debug && Debug.debugArDetect){
      console.log("[EdgeDetect::findCandidates] candidates after processing -->", {res_top: res_top, res_bottom: res_bottom});
    }
    
    return {res_top: res_top, res_bottom: res_bottom};
  
    } catch (e) {
      console.log("[EdgeDetect::findCandidates] there was an error", e);
    }
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
      sampleRow_black = (sample.top - this.settings.active.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      sampleRow_color = (sample.top + 1 + this.settings.active.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      
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
      sampleRow_black = (sample.bottom + this.settings.active.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      sampleRow_color = (sample.bottom - 1 - this.settings.active.arDetect.edgeDetection.edgeTolerancePx) * this.conf.canvasImageDataRowLength;
      
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
    var alignMargin = this.conf.canvas.height * this.settings.active.arDetect.allowedMisaligned;
    
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
          status: EdgeStatus.AR_KNOWN,
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
          edgesTop[0].count    < this.conf.sampleCols.length * this.settings.active.arDetect.edgeDetection.logoThreshold){
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
                status: EdgeStatus.AR_KNOWN,
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
          edgesBottom[0].count    <this.conf.sampleCols.length * this.settings.active.arDetect.edgeDetection.logoThreshold){
        
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
                status: EdgeStatus.AR_KNOWN,
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
      
      var edgeDetectionThreshold = this.conf.sampleCols.length * this.settings.active.arDetect.edgeDetection.singleSideConfirmationThreshold;
      
      if(edges.edgeCandidatesTopCount == 0 && edges.edgeCandidatesBottomCount != 0){
        for(var edge of edgesBottom){
          if(edge.count >= edgeDetectionThreshold)
            return {
              status: EdgeStatus.AR_KNOWN, 
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
          if(edge.count >= edgeDetectionThreshold)
            return {
              status: EdgeStatus.AR_KNOWN,
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
    return {status: EdgeStatus.AR_UNKNOWN}
  }
  
  pillarTest(image){
    // preverimo, če na sliki obstajajo navpične črne obrobe. Vrne 'true' če so zaznane (in če so približno enako debele), 'false' sicer.
    // true vrne tudi, če zaznamo preveč črnine.
    //                             <==XX(::::}----{::::)XX==>
    // checks the image for presence of vertical pillars. Less accurate than 'find blackbar limits'. If we find a non-black object that's
    // roughly centered, we return true. Otherwise we return false.
    // we also return true if we detect too much black
  
    var blackbarThreshold, upper, lower;
    blackbarThreshold = this.conf.blackLevel + this.settings.active.arDetect.blackbar.threshold;
  
  
    var middleRowStart = (this.conf.canvas.height >> 1) * this.conf.canvas.width;
    var middleRowEnd = middleRowStart + this.conf.canvas.width - 1;
  
    var rowStart = middleRowStart << 2;
    var midpoint = (middleRowStart + (this.conf.canvas.width >> 1)) << 2
    var rowEnd = middleRowEnd << 2;
  
    var edge_left = -1, edge_right = -1;
  
    // preverimo na levi strani
    // let's check for edge on the left side
    for(var i = rowStart; i < midpoint; i+=4){
      if(image[i] > blackbarThreshold || image[i+1] > blackbarThreshold || image[i+2] > blackbarThreshold){
        edge_left = (i - rowStart) >> 2;
        break;
      }
    }
  
    // preverimo na desni strani
    // check on the right
    for(var i = rowEnd; i > midpoint; i-= 4){
      if(image[i] > blackbarThreshold || image[i+1] > blackbarThreshold || image[i+2] > blackbarThreshold){
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
    if(edge_left < this.settings.active.arDetect.pillarTest.ignoreThinPillarsPx && edge_right < this.settings.active.arDetect.pillarTest.ignoreThinPillarsPx){
      return false;
    }
  
    var edgeError = this.settings.active.arDetect.pillarTest.allowMisaligned;
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


  // Column tests
  // Here's a fun thing. I reckon this bit of code could potentially run often enough that L1/L2 cache misses
  // could really start to add up (especially if I figure the RAM usage problem which causes insane RAM usage
  // if you run this 30-60 times a second)
  // 
  // so here's two functions. _columnTest3_cross has some optimization that tries to minimize cache misses, 
  // but the problem is that I don't actually know 100% what I'm doing so it might be pointless. It scans the
  // image array line-by-line, rather than column-by-column. This has some advantages (e.g. we can end the
  // search for letterbox early), and some disadvantages (the code is a mess)
  //
  // some time later down the line, I might actually implement _columnTest3_singleCol, which does shit in the
  // opposite direction (column-by-column rather than row-by-row)
  _columnTest3_cross(image, top, bottom, colsIn, colsOut, reverseSearchDirection) {
    // this function is such a /r/badcode bait.
    //
    // this is the shit we do to avoid function calls and one extra if sentence/code repetition
    // pretend I was drunk when I wrote this
    let tmpi, lastTmpI = 0, edgeDetectCount = 0, edgeDetectColsLeft = colsIn.length;
    let tmpVal = 0;
    let increment, arrayStart, arrayEnd;

    let loopCond, loopComparator, loopIndex; 

    if (reverseSearchDirection) {
      increment = -this.conf.canvasImageDataRowLength;
      arrayStart = bottom - this.conf.canvasImageDataRowLength;
      arrayEnd = top;

      // this is a hack so we get pointer-like things rather than values
      loopCond = {compare: {i: arrayEnd}, index: {i: 0}}
      loopComparator = loopCond.index;
      loopIndex = loopCond.compare;
    } else {
      increment = this.conf.canvasImageDataRowLength;
      arrayStart = top;
      arrayEnd = bottom;

      // this is a hack so we get pointer-like things rather than values
      loopCond = {compare: {i: arrayEnd}, index: {i: 0}}
      loopComparator = loopCond.compare;
      loopIndex = loopCond.index;
    }

    // keep temporary column data in a separate column array:
    const colsTmp = new Array(colsIn.length);
    for (let i = 0; i < colsTmp.length; i++) {
      colsTmp[i] = {
        blackFound: false,
        imageFound: false,    // misleading name — also true if we ran over gradientSampleSize pixels from image
                              // whether that actually count as an image depends on how aggressive gradientDetection is
        lastValue: -1,
        diffIndex: 0,
        diffs: new Array(this.settings.active.arDetect.blackbar.gradientSampleSize).fill(0)
      }
    }

    // Things to keep in mind: loopCond.index.i is always index.
    // loopIndex.i could actually be loopCond.compare.i (comparator) and
    // loopComparator.i could actually be loopCond.index.i (real index)
    for (loopCond.index.i = arrayStart; loopIndex.i < loopComparator.i; loopCond.index.i += increment) {
      
      // če smo našli toliko mejnih točk, da s preostalimi stolpci ne moremo doseči naše meje, potem prenehamo
      // if we found enough edge points so that we couldn't top that limit with remaining columns, then we stop
      // searching forward
      edgeDetectColsLeft -= edgeDetectCount;
      if (edgeDetectColsLeft < this.colsThreshold || edgeDetectCount >= this.colsThreshold) {
        break;
      }
      edgeDetectCount = 0; 


      // če v eni vrstici dobimo dovolj točk, ki grejo čez našo mejo zaznavanja, potem bomo nehali
      // the first line that goes over our detection treshold wins
      for (let c = 0; c < colsIn.length; c++) {

        // there's really no point in checking this column if we already found image point
        if (colsTmp[c].imageFound) {
          continue;
        }

        tmpI = loopCond.index.i + (colsIn[c].value << 2);

        // najprej  preverimo, če je piksel presegel mejo črnega robu
        // first we check whether blackbarThreshold was exceeded
        if (! colsTmp[c].blackFound) {
          if( image[tmpI]     > this.blackbarThreshold || 
              image[tmpI + 1] > this.blackbarThreshold ||
              image[tmpI + 2] > this.blackbarThreshold ){
          
            colsOut[c].black = ~~(i / this.conf.canvasImageDataRowLength); // note — this value is off by one
            colsOut[c].col = colsIn[c].value;
            colsTmp[c].blackFound = true;

            // prisili, da se zanka izvede še enkrat ter preveri,
            // ali trenuten piksel preseže tudi imageThreshold
            //
            // force the loop to repeat this step and check whether
            // current pixel exceeds imageThreshold as well
            c--;
            continue;
          }
        } else {
          // če smo dobili piksel, ki presega blackbar, preverimo do gradientSampleSize dodatnih pikslov.
          // ko dobimo piksel čez imageTreshold oz. gradientSampleSize, nastavimo imageFound. Ali je to veljavno
          // bomo preverili v koraku analize, ki sledi kasneje
          //
          // if we found a pixel that exceeds blackbar, we check up to gradientSampleSize additional pixels.
          // when we get a pixel over imageTreshold or gradientSampleSize, we flip the imageFound. We'll bother
          // with whether that's legit in analysis step, which will follow soon (tm)

          if (image[tmpI]     > this.imageThreshold || 
              image[tmpI + 1] > this.imageThreshold ||
              image[tmpI + 2] > this.imageThreshold ){
          
            colsOut[c].image = ~~(i / this.conf.canvasImageDataRowLength)

            
            colsTmp[c].imageFound = true;
            edgeDetectCount++;
          }

          // v vsakem primeru shranimo razliko med prejšnjim in trenutnim pikslom za kasnejšo analizo
          // in any case, save the difference between the current and the previous pixel for later analysis

          colsTmp[c].lastValue = image[tmpI] + image[tmpI+1] + image[tmpI+2];
          if (colsTmp[c].diffIndex !== 0) {
            colsTmp[c].diffs[colsTmp.diffIndex] = colsTmp[c].lastValue - colsTmp[c].diffs[diffIndex - 1];
          }

          cols[c].diffIndex++;
          if (colsTmp[c].diffIndex > this.settings.active.arDetect.blackbar.gradientSampleSize) {
            colsTmp[c].imageFound = true;
            continue;
          }
          
        }
      }
    }

    
  }

  _columnTest3_singleCol(image, top, bottom, colsIn, colsOut, reverseSearchDirection) {

  }

  _columnTest2(image, top, bottom, colsIn, colsOut, reverseSearchDirection) {
    let tmpI;
    let lastTmpI = 0;
    let edgeDetectCount = 0;
    for(const c in colsOut) {
      c.diffs = [];
    }
    if (reverseSearchDirection) {
      if (this.settings.active.arDetect.blackbar.antiGradientMode === AntiGradientMode.Disabled) {
        // todo: remove gradient detection code from this branch
        for(var i = bottom - this.conf.canvasImageDataRowLength; i >= top; i-= this.conf.canvasImageDataRowLength){
          for(let c = 0; c < colsIn.length; c++){
            if (colsIn[c].blackFound && colsIn[c].imageFound) {
              // če smo našli obe točki, potem ne pregledujemo več.
              // if we found both points, we don't continue anymore
              continue;
            }
            tmpI = i + (colsIn[c].value << 2);
  
            // najprej  preverimo, če je piksel presegel mejo črnega robu
            // first we check whether blackbarThreshold was exceeded
            if(! colsIn[c].blackFound) {
              if( image[tmpI]     > this.blackbarThreshold || 
                  image[tmpI + 1] > this.blackbarThreshold ||
                  image[tmpI + 2] > this.blackbarThreshold ){
                
                colsOut[c].black = (i / this.conf.canvasImageDataRowLength) - 1;
                colsOut[c].col = colsIn[c].value;
                colsIn[c].blackFound = 1;
  
                // prisili, da se zanka izvede še enkrat ter preveri,
                // ali trenuten piksel preseže tudi imageThreshold
                //
                // force the loop to repeat this step and check whether
                // current pixel exceeds imageThreshold as well
                c--;
                continue;
              }
            } else {
              if (colsIn[c].blackFound++ > this.settings.active.arDetect.blackbar.gradientSampleSize) {
                colsIn[c].imageFound = true;
                continue;
              }
              // zatem preverimo, če je piksel presegel mejo, po kateri sklepamo, da 
              // predstavlja sliko. Preverimo samo, če smo v stolpcu že presegli 
              // blackThreshold
              //
              // then we check whether pixel exceeded imageThreshold
              if (image[tmpI]     > this.imageThreshold || 
                  image[tmpI + 1] > this.imageThreshold ||
                  image[tmpI + 2] > this.imageThreshold ){
              
                colsOut[c].image = (i / this.conf.canvasImageDataRowLength)
                colsIn[c].imageFound = true;
                edgeDetectCount++;
              }
            }
          }
          if(edgeDetectCount >= this.colsThreshold) {
            break;
          }
        }
      } else {
        // anti-gradient detection
        for(var i = bottom - this.conf.canvasImageDataRowLength; i >= top; i-= this.conf.canvasImageDataRowLength){
          for(let c = 0; c < colsIn.length; c++){
            if (colsIn[c].blackFound && colsIn[c].imageFound) {
              // če smo našli obe točki, potem ne pregledujemo več.
              // if we found both points, we don't continue anymore.

              if (colsIn[c].analysisDone) {
                continue;
              }

              if (colsOut[c].diffs.length < 5) {
                colsIn[c].analysisDone = true;
              }

              // average analysis — if steps between pixels are roughly equal, we're looking at a gradient
              let sum_avg = 0;
              for (let i = 2; i <= colsOut[c].diffs; i++) {
                sum_avg += colsOut[c].diffs[i-1] - colsOut[c].diffs[i];
              }
              sum_avg /= colsOut[c].diffs.length - 2;
              
              for (let i = 2; i <= colsOut[c].diffs; i++) {
                sum_avg += colsOut[c].diffs[i-1] - colsOut[c].diffs[i];
              }

              continue;
            }

            tmpI = i + (colsIn[c].value << 2);
  
            // najprej  preverimo, če je piksel presegel mejo črnega robu
            // first we check whether blackbarThreshold was exceeded
            if(! colsIn[c].blackFound) {
              if( image[tmpI]     > this.blackbarThreshold || 
                  image[tmpI + 1] > this.blackbarThreshold ||
                  image[tmpI + 2] > this.blackbarThreshold ){
                
                colsOut[c].black = (i / this.conf.canvasImageDataRowLength) - 1;
                colsOut[c].col = colsIn[c].value;
                colsIn[c].blackFound = 1;
  
                // prisili, da se zanka izvede še enkrat ter preveri,
                // ali trenuten piksel preseže tudi imageThreshold
                //
                // force the loop to repeat this step and check whether
                // current pixel exceeds imageThreshold as well
                c--;
                colsOut[c].lastImageValue = image[tmpI] + image[tmpI+1] + image[tmpI+2];
                continue;
              }
            } else {
              // če smo dobili piksel, ki presega blackbar, preverimo do gradientSampleSize dodatnih pikslov.
              // ko dobimo piksel čez imageTreshold oz. gradientSampleSize, izračunamo ali gre za gradient.
              if (colsIn[c].blackFound++ > this.settings.active.arDetect.blackbar.gradientSampleSize) {
                colsIn[c].imageFound = true;
                continue;
              }
              // zatem preverimo, če je piksel presegel mejo, po kateri sklepamo, da 
              // predstavlja sliko. Preverimo samo, če smo v stolpcu že presegli 
              // blackThreshold
              //
              // then we check whether pixel exceeded imageThreshold
              if (image[tmpI]     > this.imageThreshold || 
                  image[tmpI + 1] > this.imageThreshold ||
                  image[tmpI + 2] > this.imageThreshold ){
              
                colsOut[c].image = (i / this.conf.canvasImageDataRowLength)

                
                colsIn[c].imageFound = true;
                edgeDetectCount++;
              }


              // shranimo razliko med prejšnjim in trenutnim pikslom za kasnejšo analizo
              // save difference between current and previous pixel for later analysis
              const imageValue = image[tmpI] + image[tmpI+1] + image[tmpI+2];
              colsOut[c].diffs.push(imageValue - colsOut[c].lastImage);
              colsOut[c].lastImageValue = imageValue;
            }
          }
          if(edgeDetectCount >= this.colsThreshold) {
            break;
          }
        }
      }
    } else {
      for(var i = top; i < bottom; i+= this.conf.canvasImageDataRowLength){
        for(let c = 0; c < colsIn.length; c++){
          if (colsIn[c].blackFound && colsIn[c].imageFound) {
            // če smo našli obe točki, potem ne pregledujemo več.
            // if we found both points, we don't continue anymore
            continue;
          }
          tmpI = i + (colsIn[c].value << 2);

          // najprej  preverimo, če je piksel presegel mejo črnega robu
          // first we check whether blackbarThreshold was exceeded
          if(! colsIn[c].blackFound) {
            if( image[tmpI]     > this.blackbarThreshold || 
                image[tmpI + 1] > this.blackbarThreshold ||
                image[tmpI + 2] > this.blackbarThreshold ){
              
              colsOut[c].black = (i / this.conf.canvasImageDataRowLength);
              colsOut[c].col = colsIn[c].value;
              colsIn[c].blackFound = true;

              // prisili, da se zanka izvede še enkrat ter preveri,
              // ali trenuten piksel preseže tudi imageThreshold
              //
              // force the loop to repeat this step and check whether
              // current pixel exceeds imageThreshold as well
              c--;
              continue;
            }
          } else {
            if (colsIn[c].blackFound++ > this.settings.active.arDetect.blackbar.gradientSampleSize) {
              colsIn[c].imageFound = true;
              continue;
            }
            // zatem preverimo, če je piksel presegel mejo, po kateri sklepamo, da 
            // predstavlja sliko. Preverimo samo, če smo v stolpcu že presegli 
            // blackThreshold
            //
            // then we check whether pixel exceeded imageThreshold
            if (image[tmpI]     > this.imageThreshold || 
                image[tmpI + 1] > this.imageThreshold ||
                image[tmpI + 2] > this.imageThreshold ){
            
              colsOut[c].image = (i / this.conf.canvasImageDataRowLength)
              colsIn[c].imageFound = true;
              edgeDetectCount++;
            }
          }
        }
        if(edgeDetectCount >= this.colsThreshold) {
          break;
        }
      }
    }

  }

  _columnTest(image, top, bottom, colsIn, colsOut, reverseSearchDirection){
    var tmpI;
    if(reverseSearchDirection){
      for(var i = bottom - this.conf.canvasImageDataRowLength; i >= top; i-= this.conf.canvasImageDataRowLength){
        for(var col of colsIn){
          tmpI = i + (col << 2);
          
          if( image[tmpI]     > this.blackbarThreshold || 
              image[tmpI + 1] > this.blackbarThreshold ||
              image[tmpI + 2] > this.blackbarThreshold ){
            
            var bottom = (i / this.conf.canvasImageDataRowLength) + 1;
            colsOut.push({
              col: col,
              bottom: bottom
            });
            colsIn.splice(colsIn.indexOf(col), 1);
          }
        }
        if(colsIn.length < this.colsThreshold)
          break;
      }
    } else {
      for(var i = top; i < bottom; i+= this.conf.canvasImageDataRowLength){
        for(var col of colsIn){
          tmpI = i + (col << 2);
          
          if( image[tmpI]     > this.blackbarThreshold || 
              image[tmpI + 1] > this.blackbarThreshold ||
              image[tmpI + 2] > this.blackbarThreshold ){
          
            colsOut.push({
              col: col,
              top: (i / this.conf.canvasImageDataRowLength) - 1
            });
            colsIn.splice(colsIn.indexOf(col), 1);
          }
        }
        if(colsIn.length < this.colsThreshold)
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
          
          if( image[tmpI]     > this.blackbarThreshold || 
              image[tmpI + 1] > this.blackbarThreshold ||
              image[tmpI + 2] > this.blackbarThreshold ){
            
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
        if(colsIn.length < this.colsThreshold)
          break;
      }
    } else {
      for(var i = top; i < bottom; i+= this.conf.canvasImageDataRowLength){
        for(var col of colsIn){
          tmpI = i + (col << 2);
          
          if( image[tmpI]     > this.blackbarThreshold || 
              image[tmpI + 1] > this.blackbarThreshold ||
              image[tmpI + 2] > this.blackbarThreshold ){
          
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
        if(colsIn.length < this.colsThreshold)
          break;
      }
    }
  }

  _blackbarTest(image, start, end){
    for(var i = start; i < end; i += 4){
      if( image[i  ] > this.blackbarThreshold ||
          image[i+1] > this.blackbarThreshold ||
          image[i+2] > this.blackbarThreshold ){
        return true;
      }
    }
    return false; // no violation
  }

  _blackbarTest_dbg(image, start, end){
    for(var i = start; i < end; i += 4){
      if( image[i  ] > this.blackbarThreshold ||
          image[i+1] > this.blackbarThreshold ||
          image[i+2] > this.blackbarThreshold ){
        
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
      if( image[i  ] > this.blackbarThreshold ||
          image[i+1] > this.blackbarThreshold ||
          image[i+2] > this.blackbarThreshold ){
        ++detections;
        }
    }
    if(detections >= this.detectionThreshold){
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
      if( image[i  ] > this.blackbarThreshold ||
        image[i+1] > this.blackbarThreshold ||
        image[i+2] > this.blackbarThreshold ){
        ++detections;
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.EDGEDETECT_IMAGE);
      } else {
        this.conf.debugCanvas.trace(i, DebugCanvasClasses.WARN);
      }
    }
    if(detections >= this.detectionThreshold){
      if(edgeCandidates[sampleOffset] != undefined)
        edgeCandidates[sampleOffset].count++;
      else{
        edgeCandidates[sampleOffset] = {offset: sampleOffset, count: 1};
        edgeCandidates.count++;
      }
    }
  }

}

export default EdgeDetect;

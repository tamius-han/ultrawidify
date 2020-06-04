class PlayerPickerHelper {
  constructor (settings, callbacks) {
    this.settings = settings;
    this.videos = document.selectElementsByTagName('video');
    this.selectedParentIndex = this.findPlayerForVideos(settings, this.videos)[0];
    this.savedCss = [];
    this.markVideos();
    this.markIndexForAll(index);
    this.markInitialQuerySelectors();
  }



  /*
   *
   * Internal functions
   * 
   */
  saveBorder(element) {
    if (this.savedCss.findIndex(x => x.element === element) !== -1) {
      this.savedCss.push({element: element, border: element.style.border});
    }
  }
  restoreBorders() {
    for (const e of this.savedCss) {
      e.element.style.border = e.border;
    }
  }

  findPlayerForVideos(settings, videos) {
    const playerIndexes = [];
    for (const v of videos) {
      playerIndexes.push(this.findPlayerForVideo(settings, v));
    }
    return playerIndexes;
  }

  findPlayerForVideo(settings, video) {
    const host = window.location.hostname;
    let element = video.parentNode;

    if (this.settings.active.sites[host]
      && this.settings.active.sites[host].DOM
      && this.settings.active.sites[host].DOM.player
      && this.settings.active.sites[host].DOM.player.manual) {
      if (this.settings.active.sites[host].DOM.player.useRelativeAncestor
          && this.settings.active.sites[host].DOM.player.videoAncestor) {

        return this.settings.active.sites[host].DOM.player.videoAncestor;
      } else if (this.settings.active.sites[host].DOM.player.querySelectors) {
        const allSelectors = document.querySelectorAll(this.settings.active.sites[host].DOM.player.querySelectors);
        let elementIndex = 1;
        while (element && !this.collectionHas(allSelectors, element)) {
          element = element.parentNode;
          elementIndex++;
        }
        return elementIndex;
      }
    }

    let elementIndex = 0;

    var trustCandidateAfterGrows = 2; // if candidate_width or candidate_height increases in either dimensions this many
                                      // times, we say we found our player. (This number ignores weird elements)
    // in case our <video> is bigger than player in one dimension but smaller in the other
    // if site is coded properly, player can't be wider than that
    var candidate_width = Math.max(element.offsetWidth, window.innerWidth);
    var candidate_height = Math.max(element.offsetHeight, window.innerHeight);
    var playerCandidateNode = element;

    // if we haven't found element using fancy methods, we resort to the good old fashioned way
    var grows = trustCandidateAfterGrows;
    while(element != undefined){    
      // odstranimo čudne elemente, ti bi pokvarili zadeve
      // remove weird elements, those would break our stuff
      if ( element.offsetWidth == 0 || element.offsetHeight == 0){
        element = element.parentNode;
        elementIndex++;
        continue;
      }
  
      if ( element.offsetHeight <= candidate_height &&
           element.offsetWidth  <= candidate_width  ){
        
        // if we're in fullscreen, we only consider elements that are exactly as big as the monitor.
        if( ! isFullScreen || 
            (element.offsetWidth == window.innerWidth && element.offsetHeight == window.innerHeight) ){
        
          playerCandidateNode = element;
          candidate_width = element.offsetWidth;
          candidate_height = element.offsetHeight;
        
          grows = trustCandidateAfterGrows;
        
          this.logger.log('info', 'debug', "Found new candidate for player. Dimensions: w:", candidate_width, "h:",candidate_height, "node:", playerCandidateNode);
        }
      }
      else if(grows --<= 0){
        this.logger.log('info', 'playerDetect', "Current element grew in comparrison to the child. We probably found the player. breaking loop, returning current result");
        break;
      }
      
      element = element.parentNode;
      elementIndex++;
    }

    return elementIndex;
  }

  markVideos() {
    for (const v of this.videos) {
      this.markVideo(v);
    }
  }

  markVideo(video) {
    this.saveBorder(video);
    video.style.border = "1px solid #00f";
  }
  
  markIndexForAll(index){
    for (const v of this.videos) {
      this.markIndex(index, v);
    }
  }
  markIndex(index, video) {
    el = video.parentNode;
    while (index --> 1) {
      el = el.parentNode;
    }
    this.saveBorder(el);
    el.style.border = "1px solid #88f";
  }
  markInitialQuerySelectors() {
    try {
      if (this.settings.active.sites[host].DOM.player.querySelectors.trim()) {
        this.markQuerySelectorMatches(this.settings.active.sites[host].DOM.player.querySelectors);
      }
    } catch (e) {
      // nothing to see here. something in that if spaghett is undefined, which causes 
      // everything to fail. Since this means we've got zero query string matches to mark,
      // we just ignore the failure
    }
  }
  markQuerySelectorMatches(qsString) {
    const allSelectors = document.querySelectorAll(qsString);
    for (e of allSelectors) {
      this.saveBorder(e);
      e.style.border = "1px dashed fd2";
    }
  }
  markQsPlayerDetection(qsString, index, video) {
    let element = video.parentNode;
    let elementIndex = 1;

    const allSelectors = document.querySelectorAll(qsString);
    while (element && !this.collectionHas(allSelectors, element)) {
      element = element.parentNode;
      elementIndex++;
    }

    this.saveBorder(element)
    if (elementIndex > index) {
      element.style.border = "2px solid #f00"
    } else if (elementIndex === index) {
      element.style.border = "2px solid #027a5c"
    }
  }






  /*
   *
   *
   * Function that actually interface with playerpicker and do stuff
   * 
   * 
   */

  setQuerySelectors(querySelectorString) {

  }

}

export default PlayerPickerHelper

if(Debug.debug)
  console.log("Loading: PlayerData.js");

/* sprejme <video> tag (element) in seznam imen, ki se lahko pojavijo v razredih oz. id staršev.
// vrne dimenzije predvajalnika (širina, višina)
// 
// Na youtube v theater mode je razširitev rahlo pokvarjena. Video tag ostane večji od predvajalnika, ko se zapusti
// celozaslonski način. Ta funkcija skuša to težavo rešiti tako, da poišče element predvajalnika, ki je zavit okoli videa.
// 
// Funkcija izkorišča lastnost, da bi načeloma moral biti vsak zunanji element večji od notranjega. Najmanjši element od
// <video> značke pa do korena drevesa bi tako moral biti predvajalnik.
// 
// Če je podan seznam imen, potem funkcija vrne dimenzije prvega elementa, ki v id oz. razredu vsebuje katerokoli ime iz seznama
// 
// | EN |
//
// accepts <video> tag (element) and list of names that can appear in id or class 
// returns player dimensions (width, height)
//
// Theater mode is mildly broken on youtube. <video> tag remains bigger than the player after leaving the fullscreen mode, and
// there's nothing we can do about that. This function aims to solve the problem by finding the player element that's wrapped around
// the <video> tag.
// 
// In general, an outer tag should be bigger than the inner tag. Therefore the smallest element between <video> tag and the document
// root should be the player.
//
// If list of names is provided, the function returns dimensions of the first element that contains any name from the list in either
// id or class.
*/

class PlayerData {
  constructor(videoData) {
    this.videoData = videoData;
    this.video = videoData.video;
    this.element = undefined;
    this.dimensions = undefined;

    this.getPlayerDimensions();
    this.startChangeDetection();
  }

  static isFullScreen(){
    return ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
  }



  start(){
    this.startChangeDetection();
  }

  stop(){
    this.halted = true;
    this.stopChangeDetection();
  }

  destroy() {
    this.stopChangeDetection();
  }

  startChangeDetection(){
    this.scheduleGhettoWatcher();
  }
  stopChangeDetection(){
    clearTimeout(this.watchTimeout);
  }

  scheduleGhettoWatcher(timeout, force_reset) {
    if(! timeout){
      timeout = 100;
    }
    if(this.halted){
      return;
    }

    // don't allow more than 1 instance
    if(this.watchTimeout){ 
      clearTimeout(this.watchTimeout);
    }
    
    var ths = this;

    this.watchTimeout = setTimeout(function(){
        ths.watchTimeout = null;
        try{
          ths.ghettoWatcher();
        } catch(e) {
          if (Debug.debug) {
            console.log("[PlayerData::scheduleGhettoWatcher] Scheduling failed. Error:",e)
          }

          ths.scheduleGhettoWatcher(1000);
        }
        ths = null;
      },
      timeout
    );
  }


  ghettoWatcher(){
    if(this.checkPlayerSizeChange()){
      if(Debug.debug){
        console.log("[uw::ghettoOnChange] change detected");
      }

      this.getPlayerDimensions();
      if(! this.element ){
        this.scheduleGhettoWatcher();
        return;
      }

      this.videoData.resizer.restore(); // note: this returns true if change goes through, false otherwise.
      
      this.scheduleGhettoWatcher();
      return;
    }

    // sem ter tja, checkPlayerSizeChange() ne zazna prehoda v celozaslonski način (in iz njega). Zato moramo
    // uporabiti dodatne trike.
    // sometimes, checkPlayerSizeChange might not detect a change to fullscreen. This means we need to 
    // trick it into doing that

    if(this.dimensions.fullscreen != PlayerData.isFullScreen()) {
      if(Debug.debug){
        console.log("[PlayerData::ghettoWatcher] fullscreen switch detected (basic change detection failed)");
      }

      this.getPlayerDimensions();

      if(! this.element ){
        this.scheduleGhettoWatcher();
        return;
      }

      this.videoData.resizer.restore();
    }

    this.scheduleGhettoWatcher();
  }

  getPlayerDimensions(elementNames){
    // element names — reserved for future use. If element names are provided, this function should return first element that
    // has classname or id that matches at least one in the elementNames array.
    var element = this.video.parentNode;

    if(! element ){
      if(Debug.debug)
        console.log("[PlayerDetect::_pd_getPlayerDimensions] element is not valid, doing nothing.", element)
      
      this.element = undefined;
      this.dimensions = undefined;
      return;
    }

    var isFullScreen = PlayerData.isFullScreen();
  
    var trustCandidateAfterGrows = 2; // if candidate_width or candidate_height increases in either dimensions this many
                                      // times, we say we found our player. (This number ignores weird elements)
    // in case our <video> is bigger than player in one dimension but smaller in the other
    // if site is coded properly, player can't be wider than that
    var candidate_width = Math.max(element.offsetWidth, window.innerWidth);
    var candidate_height = Math.max(element.offsetHeight, window.innerHeight);
    var playerCandidateNode = element;

    try {
      var grows = trustCandidateAfterGrows;
      while(element != undefined){    
        // odstranimo čudne elemente, ti bi pokvarili zadeve
        // remove weird elements, those would break our stuff
        if ( element.offsetWidth == 0 || element.offsetHeight == 0){
          element = element.parentNode;
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
          
            if(Debug.debug){
              console.log("Found new candidate for player. Dimensions: w:", candidate_width, "h:",candidate_height, "node:", playerCandidateNode);
            }
          }
        }
        else if(grows --<= 0){
          
          if(Debug.debug && Debug.playerDetect){
            console.log("Current element grew in comparrison to the child. We probably found the player. breaking loop, returning current result");
          }
          break;
        }
        
        element = element.parentNode;
      }
    }
    catch (e) {
      console.log("pdeeee,",e);
    }
          
    if (isFullScreen && playerCandidateNode == element) {
      this.dimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
        fullscreen: true
      }
      this.element = element;
    } else {
      this.dimensions = {
        width: candidate_width,
        height: candidate_height,
        fullscreen: isFullScreen
      };
      this.element = playerCandidateNode;
    }
  }

  checkPlayerSizeChange(){
    if(Debug.debug){
      if(this.element == undefined){
        // return true;
      }
      
      // if(!this.dimensions) {
        // return true;
      // }

      if(this.dimensions && this.dimensions.fullscreen){
        if(! PlayerData.isFullScreen()){
          console.log("[PlayerDetect] player size changed. reason: exited fullscreen");
        }
      }
      if(! this.element)
        console.log("[PlayerDetect] player element isnt defined");
        
      if ( this.element && 
           ( this.dimensions.width != this.element.offsetWidth ||
             this.dimensions.height != this.element.offsetHeight )
      ){
        console.log("[PlayerDetect] player size changed. reason: dimension change. Old dimensions?", this.dimensions.width, this.dimensions.height, "new dimensions:", this.element.offsetWidth, this.element.offsetHeight);
      }
    }
    
    if(this.element == undefined){
      return true;
    } else if(this.dimensions.width != this.element.offsetWidth || this.dimensions.height != this.element.offsetHeight ){
      return true;
    }

    return false;
  }
}


import Debug from '../../conf/Debug';
import ExtensionMode from '../../../common/enums/extension-mode.enum'
import AspectRatio from '../../../common/enums/aspect-ratio.enum';

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
    this.settings = videoData.settings;
    this.extensionMode = videoData.extensionMode;
    this.element = undefined;
    this.dimensions = undefined;
    this.overlayNode = undefined;

    if (this.extensionMode === ExtensionMode.Enabled) {
      this.getPlayerDimensions();
    }
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
    this.destroyOverlay();
  }

  startChangeDetection(){
    this.scheduleGhettoWatcher();
  }
  stopChangeDetection(){
    clearTimeout(this.watchTimeout);
  }

  makeOverlay() {
    if (!this.overlayNode) {
      this.destroyOverlay();
    }

    var overlay = document.createElement('div');
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.zIndex = '1000000000';
    overlay.style.pointerEvents = 'none';

    this.overlayNode = overlay;
    this.element.appendChild(overlay);
  }

  destroyOverlay() {
    if(this.playerIdElement) {
      this.playerIdElement.remove();
      this.playerIdElement = undefined;
    }
    if (this.overlayNode) {
      this.overlayNode.remove();
      this.overlayNode = undefined;
    }
  }

  markPlayer(name, color) {
    if (!this.overlayNode) {
      this.makeOverlay();
    }
    if (this.playerIdElement) {
      this.playerIdElement.remove();
    }
    this.playerIdElement = document.createElement('div');
    this.playerIdElement.innerHTML = `<div style="background-color: ${color}; color: #fff; position: absolute; top: 0; left: 0">${name}</div>`;

    this.overlayNode.appendChild(this.playerIdElement);
  }

  unmarkPlayer() {
    if (Debug.debug) {
      console.log("[PlayerData::unmarkPlayer] unmarking player!")
    }
    if (this.playerIdElement) {
      this.playerIdElement.remove();
    }
    this.playerIdElement = undefined;
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

  ghettoWatcherFull() {
    if(this.checkPlayerSizeChange()){
      if(Debug.debug){
        console.log("[uw::ghettoOnChange] change detected");
      }

      this.getPlayerDimensions();
      if(! this.element ){
        return;
      }

      this.videoData.resizer.restore(); // note: this returns true if change goes through, false otherwise.
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
        return;
      }

      this.videoData.resizer.restore();
    }
  }

  ghettoWatcherBasic() {
    if (this.checkFullscreenChange()) {
      if (PlayerData.isFullScreen()) {
        const lastAr = this.videoData.resizer.getLastAr();    // save last ar for restore later

        this.videoData.resizer.restore();

        if (lastAr.type === 'original' || lastAr.type === AspectRatio.Automatic) {
          this.videoData.rebootArDetection();
        }
      } else {
        const lastAr = this.videoData.resizer.getLastAr();    // save last ar for restore later
        this.videoData.resizer.reset();
        this.videoData.resizer.stop();
        this.videoData.stopArDetection();
        this.videoData.resizer.setLastAr(lastAr);
      }
    }
  }

  ghettoWatcher(){
    if (this.extensionMode === ExtensionMode.Enabled) {
      this.ghettoWatcherFull();
      this.scheduleGhettoWatcher();
    } else if (this.extensionMode === ExtensionMode.Basic) {
      this.ghettoWatcherBasic();
      this.scheduleGhettoWatcher();
    }

  }

  collectionHas(collection, element) {
    for (let i = 0, len = collection.length; i < len; i++) {
      if (collection[i] == element) {
        return true;
      }
    }
    return false;
  }

  getPlayer(isFullScreen) {
    const host = window.location.host;
    let element = this.video.parentNode;
    const videoWidth = this.video.offsetWidth, videoHeight = this.video.offsetHeight;

    if(! element ){
      if(Debug.debug) {
        console.log("[PlayerDetect::_pd_getPlayer] element is not valid, doing nothing.", element)
      }
      if(this.element) {
        const ths = this;
      }
      this.element = undefined;
      this.dimensions = undefined;
      return;
    }

    if (this.settings.active.sites[host]
        && this.settings.active.sites[host].DOM
        && this.settings.active.sites[host].DOM.player
        && this.settings.active.sites[host].DOM.player.manual) {
      if (this.settings.active.sites[host].DOM.player.useRelativeAncestor
          && this.settings.active.sites[host].DOM.player.videoAncestor) {

        let parentsLeft = this.settings.active.sites[host].DOM.player.videoAncestor - 1;
        while (parentsLeft --> 0) {
          element = element.parentNode;
        }
        if (element) {
          return element;
        }
      } else if (this.settings.active.sites[host].DOM.player.querySelectors) {
        const allSelectors = document.querySelectorAll(this.settings.active.sites[host].DOM.player.querySelectors);
        while (element && !this.collectionHas(allSelectors, element)) {
          element = element.parentNode;
        }
        if (element) {
          return element;
        }
      }
    }

    const elementQ = [];
    let scorePenalty = 0;
    let score;

    while (element != undefined){    
      // odstranimo čudne elemente, ti bi pokvarili zadeve
      // remove weird elements, those would break our stuff
      if ( element.offsetWidth == 0 || element.offsetHeight == 0){
        element = element.parentNode;
        continue;
      }
  
      // element je player, če je ena stranica enako velika kot video, druga pa večja ali enaka. 
      // za enakost dovolimo mala odstopanja
      // element is player, if one of the sides is as long as the video and the other bigger (or same)
      // we allow for tiny variations when checking for equality
      if ( (element.offsetWidth >= videoWidth && this.equalish(element.offsetHeight, videoHeight, 2))
           || (element.offsetHeight >= videoHeight && this.equalish(element.offsetWidth, videoHeight, 2))) {
        
        // todo — in case the match is only equalish and not exact, take difference into account when 
        // calculating score
        
        score = 100;

        if (element.id.indexOf('player') !== -1) { // prefer elements with 'player' in id
          score += 75;
        }
        if (element.classList.toString().indexOf('player') !== -1) {  // prefer elements with 'player' in classlist, but a bit less than id
          score += 50;
        }
        score -= scorePenalty++; // prefer elements closer to <video>
        
        elementQ.push({
          element: element,
          score: score,
        });
      }
      
      element = element.parentNode;
    }

    if (elementQ.length) {
      // return biggest score
      return elementQ.sort( (a,b) => b.score - a.score)[0];
    }

    // if no candidates were found, return parent node
    return this.video.parentNode;
  }

  equalish(a,b, tolerance) {
    return a > b - tolerance && a < b + tolerance;
  }

  getPlayerDimensions(){
    const isFullScreen = PlayerData.isFullScreen();

    const element = this.getPlayer(isFullScreen);

    if(! element ){
      if(Debug.debug) {
        console.log("[PlayerDetect::getPlayerDimensions] element is not valid, doing nothing.", element)
      }
      this.element = undefined;
      this.dimensions = undefined;
      return;
    }

          
    if (isFullScreen) {
      this.dimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
        fullscreen: true
      }
      if (this.element != element) {
        this.element = element;
        this.makeOverlay()
      }
    } else {
      this.dimensions = {
        width: element.offsetWidth,
        height: element.offsetHeight,
        fullscreen: isFullScreen
      };
      if(this.element != element) {
        this.element = element;
        this.makeOverlay();
      }
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

      if (this.dimensions && this.dimensions.fullscreen){
        if(! PlayerData.isFullScreen()){
          console.log("[PlayerDetect] player size changed. reason: exited fullscreen");
        }
      }
      if(! this.element && Debug.debug && Debug.playerDetect) {
        console.log("[PlayerDetect] player element isnt defined");
      }

      if ( this.element && 
           ( this.dimensions.width != this.element.offsetWidth ||
             this.dimensions.height != this.element.offsetHeight )
      ) {
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

  checkFullscreenChange() {
    const isFs = PlayerData.isFullScreen();

    if (this.dimensions) {
      if (this.dimensions.fullscreen != isFs) {
        this.dimensions = {
          fullscreen: isFs,
          width: isFs ? screen.width : this.video.offsetWidth,
          height: isFs ? screen.height : this.video.offsetHeight
        };
        return true;
      }
      return false;
    }

    if(Debug.debug) {
      console.log("[PlayerData::checkFullscreenChange] this.dimensions is not defined. Assuming fs change happened and setting default values.")
    }

    this.dimensions = {
      fullscreen: isFs,
      width: isFs ? screen.width : this.video.offsetWidth,
      height: isFs ? screen.height : this.video.offsetHeight
    };

    return true;
  }
}

export default PlayerData;

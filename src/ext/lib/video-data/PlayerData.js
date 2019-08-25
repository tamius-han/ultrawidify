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
  constructor(videoData, logger) {
    this.videoData = videoData;
    this.video = videoData.video;
    this.settings = videoData.settings;
    this.extensionMode = videoData.extensionMode;
    this.element = undefined;
    this.dimensions = undefined;
    this.overlayNode = undefined;
    this.logger = logger;

    this.observer = new MutationObserver(this.onPlayerDimensionsChanged);

    if (this.extensionMode === ExtensionMode.Enabled) {
      this.getPlayerDimensions();
    }
    this.startChangeDetection();
  }

  static isFullScreen(){
    return ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
  }

  // player size observer may not be strictly necessary here
  onPlayerDimensionsChanged(mutationList, observer) {
    if (!mutationList || this.element === undefined) {  // something's wrong
      return;
    }
    for (let mutation of mutationList) {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'style' && this.checkPlayerSizeChange()) {
          // if size of the player has changed, this may mean we need to recalculate/reapply
          // last calculated aspect ratio
          this.videoData.resizer.restore();
        } 
      }
    }
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
    const isFullScreen = PlayerData.isFullScreen();
    const element = this.getPlayer(isFullScreen);
    
    if (!element) {
      return;
    }

    const observerConf = {
      attributes: true,
      // attributeFilter: ['style', 'class'],
      attributeOldValue: true,
    };
    
    this.observer.observe(element, observerConf);
  }
  stopChangeDetection(){
    this.observer.disconnect();
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
    this.logger.log('info', 'debug', "[PlayerData::unmarkPlayer] unmarking player!")
    if (this.playerIdElement) {
      this.playerIdElement.remove();
    }
    this.playerIdElement = undefined;
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

    if(! element ){
      this.logger.log('info', 'debug', "[PlayerDetect::_pd_getPlayer] element is not valid, doing nothing.", element)
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
    }



    return playerCandidateNode;
  }


  getPlayerDimensions() {
    const isFullScreen = PlayerData.isFullScreen();

    const element = this.getPlayer(isFullScreen);

    if(! element ){
      this.logger.log('error', 'debug', "[PlayerDetect::getPlayerDimensions] element is not valid, doing nothing.", element)
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
    // this 'if' is just here for debugging — real code starts later. It's safe to collapse and
    // ignore the contents of this if (unless we need to change how logging works)
    if (this.logger.canLog('debug')){
      if (this.dimensions && this.dimensions.fullscreen){
        if(! PlayerData.isFullScreen()){
          this.logger.log('info', 'debug', "[PlayerDetect] player size changed. reason: exited fullscreen");
        }
      }
      if(! this.element) {
        this.logger.log('info', 'playerDetect', "[PlayerDetect] player element isnt defined");
      }

      if ( this.element && 
           ( this.dimensions.width != this.element.offsetWidth ||
             this.dimensions.height != this.element.offsetHeight )
      ) {
        this.logger.log('info', 'debug', "[PlayerDetect] player size changed. reason: dimension change. Old dimensions?", this.dimensions.width, this.dimensions.height, "new dimensions:", this.element.offsetWidth, this.element.offsetHeight);
      }
    }
    
    if (this.element == undefined){
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

    this.logger.log('info', 'debug', "[PlayerData::checkFullscreenChange] this.dimensions is not defined. Assuming fs change happened and setting default values.")

    this.dimensions = {
      fullscreen: isFs,
      width: isFs ? screen.width : this.video.offsetWidth,
      height: isFs ? screen.height : this.video.offsetHeight
    };

    return true;
  }
}

export default PlayerData;

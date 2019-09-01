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
    const videoWidth = this.video.offsetWidth, videoHeight = this.video.offsetHeight;
    const elementQ = [];
    let scorePenalty = 0;
    let score;

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

        // actually we'll also score this branch in a similar way we score the regular, auto branch
        while (element) {

          // Let's see how this works
          if (this.collectionHas(allSelectors, element)) {
            score = 100; // every matching element gets a baseline 100 points
            
            // elements that match the size get a hefty bonus
            if ( (element.offsetWidth >= videoWidth && this.equalish(element.offsetHeight, videoHeight, 2))
              || (element.offsetHeight >= videoHeight && this.equalish(element.offsetWidth, videoHeight, 2))) {
                score += 75;
            }

            // elements farther away from the video get a penalty
            score -= (scorePenalty++) * 20;

            // push the element on the queue/stack:
            elementQ.push({
              score: score,
              element: element,
            });
          }

          element = element.parentNode;
        }
        if (elementQ.length) {
          // return element with biggest score
          // if video player has not been found, proceed to automatic detection
          return elementQ.sort( (a,b) => b.score - a.score)[0].element;
        }
      }
    }

    

    while (element){    
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
      // return element with biggest score
      return elementQ.sort( (a,b) => b.score - a.score)[0].element;
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

  forceRefreshPlayerElement() {
    this.getPlayerDimensions();
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
    
    if(this.element == undefined){
      this.element = this.getPlayer();
      return true;
    } else if(this.dimensions.width != this.element.offsetWidth || this.dimensions.height != this.element.offsetHeight ){
      this.element = this.getPlayer();
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

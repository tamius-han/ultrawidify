import Debug from '../../conf/Debug';
import ExtensionMode from '../../../common/enums/extension-mode.enum'
import AspectRatio from '../../../common/enums/aspect-ratio.enum';
import PlayerNotificationUi from '../uwui/PlayerNotificationUI';
import PlayerUi from '../uwui/PlayerUI';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading: PlayerData.js");
}

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
    try {
      this.logger = videoData.logger;
      this.videoData = videoData;
      this.video = videoData.video;
      this.settings = videoData.settings;
      this.extensionMode = videoData.extensionMode;
      this.invalid = false;
      this.element = this.getPlayer();
      this.notificationService = new PlayerNotificationUi(this.element, this.settings);
      this.ui = new PlayerUi(this.element, this.settings);
      this.dimensions = undefined;
      this.overlayNode = undefined;

      this.periodicallyRefreshPlayerElement = false;
      try {
        this.periodicallyRefreshPlayerElement = this.settings.active.sites[window.location.hostname].DOM.player.periodicallyRefreshPlayerElement;
      } catch (e) {
        // no biggie — that means we don't have any special settings for this site.
      }

      // this happens when we don't find a matching player element
      if (!this.element) {
        this.invalid = true;
        return;
      }

      if (this.extensionMode === ExtensionMode.Enabled) {
        this.checkPlayerSizeChange();
      }
      this.startChangeDetection();

    } catch (e) {
      console.error('[Ultrawidify::PlayerData::ctor] There was an error setting up player data. You should be never seeing this message. Error:', e);
      this.invalid = true;
    }
  }

  async sleep(timeout) {
    return new Promise( (resolve, reject) => setTimeout(() => resolve(), timeout));
  }

  static isFullScreen(){
    return ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
  }

  // player size observer may not be strictly necessary here
  onPlayerDimensionsChanged(mutationList, observer, context) {
    if (context.checkPlayerSizeChange()) {
      context.videoData.resizer.restore();
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
    this.notificationService?.destroy();
  }

  startChangeDetection(){
    if (this.invalid) {
      return;
    }

    try {
      const ths = this;
      this.observer = new MutationObserver((m,o) => this.onPlayerDimensionsChanged(m,o,ths));

      const observerConf = {
        attributes: true,
        // attributeFilter: ['style', 'class'],
        attributeOldValue: true,
      };
      
      this.observer.observe(this.element, observerConf);
    } catch (e) {
      console.error("failed to set observer",e )
    }
    // legacy mode still exists, but acts as a fallback for observers and is triggered less
    // frequently in order to avoid too many pointless checks
    this.legacyChangeDetection();
  }

  async legacyChangeDetection() {
    while (!this.halted) {
      await this.sleep(1000);
      try {
        this.doPeriodicPlayerElementChangeCheck();
      } catch (e) {
        console.error('[PlayerData::legacycd] this message is pretty high on the list of messages you shouldnt see', e);
      }
    }
  }

  doPeriodicPlayerElementChangeCheck() {
    if (this.periodicallyRefreshPlayerElement) {
      this.forceDetectPlayerElementChange();
    }
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
    this.logger.log('info', 'debug', "[PlayerData::unmarkPlayer] unmarking player!", {playerIdElement: this.playerIdElement});
    if (this.playerIdElement) {
      this.playerIdElement.innerHTML = '';
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

  updatePlayerDimensions(element) {
    const isFullScreen = PlayerData.isFullScreen();

    if (element.offsetWidth !== this.dimensions?.width
        || element.offsetHeight !== this.dimensions?.height
        || isFullScreen !== this.dimensions?.fullscreen) {

      // update dimensions only if they've changed, _before_ we do a restore (not after)
      this.dimensions = {
        width: element.offsetWidth,
        height: element.offsetHeight,
        fullscreen: isFullScreen
      };

      // actually re-calculate zoom when player size changes, but only if videoData.resizer
      // is defined. Since resizer needs a PlayerData object to exist, videoData.resizer will
      // be undefined the first time this function will run.
      this.videoData.resizer?.restore();

      // NOTE: it's possible that notificationService hasn't been initialized yet at this point.
      //       no biggie if it wasn't, we just won't replace the notification UI
      this.notificationService?.replace(this.element);
      this.ui?.updateDebugInfo('player', {dimensions: this.dimensions, elementId: element.id, elementClasses: element.classList});
    }
  }

  getPlayer() {
    const host = window.location.hostname;
    let element = this.video.parentNode;
    const videoWidth = this.video.offsetWidth;
    const videoHeight = this.video.offsetHeight;
    const elementQ = [];
    let scorePenalty = 0;
    let score;

    try {
      if(! element ){
        this.logger.log('info', 'debug', "[PlayerDetect::_pd_getPlayer] element is not valid, doing nothing.", element)
        if(this.element) {
          const ths = this;
        }
        this.element = undefined;
        this.dimensions = undefined;
        return;
      }

      // log the entire hierarchy from <video> to root
      if (this.logger.canLog('playerDetect')) {
        const logObj = [];
        logObj.push(`window size: ${window.innerWidth} x ${window.innerHeight}`);
        let e = element;
        while (e) {
          logObj.push({offsetSize: {width: e.offsetWidth, height: e.offsetHeight}, clientSize: {width: e.clientWidth, height: e.clientHeight}, element: e});
          e = e.parentNode;
        }
        this.logger.log('info', 'playerDetect', "\n\n[PlayerDetect::getPlayer()] element hierarchy (video->root)", logObj);
      }

      if (this.settings.active.sites[host]?.DOM?.player?.manual) {
        if (this.settings.active.sites[host]?.DOM?.player?.useRelativeAncestor
            && this.settings.active.sites[host]?.DOM?.player?.videoAncestor) {

          let parentsLeft = this.settings.active.sites[host].DOM.player.videoAncestor - 1;
          while (parentsLeft --> 0) {
            element = element.parentNode;
          }
          if (element) {
            this.updatePlayerDimensions(element);
            return element;
          }
        } else if (this.settings.active.sites[host]?.DOM?.player?.querySelectors) {
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

          // log player candidates
          this.logger.log('info', 'playerDetect', 'player detect via query selector: element queue and final element:', {queue: elementQ, bestCandidate: elementQ.length ? elementQ.sort( (a,b) => b.score - a.score)[0].element : 'n/a'});

          if (elementQ.length) {
            // return element with biggest score
            // if video player has not been found, proceed to automatic detection
            const playerElement = elementQ.sort( (a,b) => b.score - a.score)[0].element;
            this.updatePlayerDimensions(playerElement);
            return playerElement;
          }
        }
      }

      // try to find element the old fashioned way

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

          // This entire section is disabled because of some bullshit on vk and some shady CIS streaming sites.
          // Possibly removal of this criteria is not necessary, because there was also a bug with force player
          // 

          // if (element.id.indexOf('player') !== -1) { // prefer elements with 'player' in id
          //   score += 75;
          // }
          // this has only been observed on steam
          // if (element.id.indexOf('movie') !== -1) {
          //   score += 75;
          // }
          // if (element.classList.toString().indexOf('player') !== -1) {  // prefer elements with 'player' in classlist, but a bit less than id
          //   score += 50;
          // }
          score -= scorePenalty++; // prefer elements closer to <video>
          
          elementQ.push({
            element: element,
            score: score,
          });
        }
        
        element = element.parentNode;
      }

      // log player candidates
      this.logger.log('info', 'playerDetect', 'player detect, auto/fallback: element queue and final element:', {queue: elementQ, bestCandidate: elementQ.length ? elementQ.sort( (a,b) => b.score - a.score)[0].element : 'n/a'});

      if (elementQ.length) {
        // return element with biggest score
        const playerElement = elementQ.sort( (a,b) => b.score - a.score)[0].element;
        
        this.updatePlayerDimensions(playerElement);
        return playerElement;
      }

      // if no candidates were found, something is obviously very, _very_ wrong.
      // we return nothing. Player will be marked as invalid and setup will stop.
      // VideoData should check for that before starting anything.
      this.logger.log('warn', 'debug', '[PlayerData::getPlayer] no matching player was found for video', this.video, 'Extension cannot work on this site.');
      return;
    } catch (e) {
      this.logger.log('crit', 'debug', '[PlayerData::getPlayer] something went wrong while detecting player:', e, 'Shutting down extension for this page');
    }
  }

  equalish(a,b, tolerance) {
    return a > b - tolerance && a < b + tolerance;
  }

  forceDetectPlayerElementChange() {
    // Player dimension changes get calculated every time updatePlayerDimensions is called (which happens
    // every time getPlayer() detects an element). If updatePlayerDimension detects dimensions were changed,
    // it will always re-apply current crop, rendering this function little more than a fancy alias for 
    // getPlayer().
    this.getPlayer();
  }

  forceRefreshPlayerElement() {
    this.getPlayer();
  }

  checkPlayerSizeChange() {
    // this 'if' is just here for debugging — real code starts later. It's safe to collapse and
    // ignore the contents of this if (unless we need to change how logging works)
    if (this.logger.canLog('debug')){
      if (this.dimensions?.fullscreen){
        if(! PlayerData.isFullScreen()){
          this.logger.log('info', 'debug', "[PlayerDetect] player size changed. reason: exited fullscreen");
        }
      }
      if(! this.element) {
        this.logger.log('info', 'playerDetect', "[PlayerDetect] player element isn't defined");
      }

      if ( this.element &&
           ( +this.dimensions?.width != +this.element?.offsetWidth ||
             +this.dimensions?.height != +this.element?.offsetHeight )
      ) {
        this.logger.log('info', 'debug', "[PlayerDetect] player size changed. reason: dimension change. Old dimensions?", this.dimensions?.width, this.dimensions?.height, "new dimensions:", this.element?.offsetWidth, this.element?.offsetHeight);
      }
    }

    // if size doesn't match, update & return true
    if (this.dimensions?.width != this.element.offsetWidth 
        || this.dimensions?.height != this.element.offsetHeight ){
      
      const isFullScreen = PlayerData.isFullScreen();

      if (isFullScreen) {
        this.dimensions = {
          width: window.innerWidth,
          height: window.innerHeight,
          fullscreen: true
        }
      } else {
        this.dimensions = {
          width: this.element.offsetWidth,
          height: this.element.offsetHeight,
          fullscreen: isFullScreen
        };
      }
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

  showNotification(notificationId) {
    this.notificationService?.showNotification(notificationId);
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info("PlayerData loaded");
}

export default PlayerData;

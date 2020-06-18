import Debug from '../../conf/Debug';
import PlayerData from './PlayerData';
import Resizer from '../video-transform/Resizer';
import ArDetector from '../ar-detect/ArDetector';
import AspectRatio from '../../../common/enums/aspect-ratio.enum';
import AardGl from '../ar-detect/AardGl';

class VideoData {
  
  constructor(video, settings, pageInfo){
    this.vdid = (Math.random()*100).toFixed();
    this.logger = pageInfo.logger;
    this.arSetupComplete = false;
    this.video = video;
    this.destroyed = false;
    this.settings = settings;
    this.pageInfo = pageInfo;
    this.extensionMode = pageInfo.extensionMode;

    this.userCssClassName = `uw-fuck-you-and-do-what-i-tell-you_${this.vdid}`;

    // We only init observers once player is confirmed valid
    const observerConf = {
      attributes: true,
      // attributeFilter: ['style', 'class'],
      attributeOldValue: true,
    };

    

    // POZOR: VRSTNI RED JE POMEMBEN (arDetect mora bit zadnji)
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)
    this.player = new PlayerData(this);
    if (this.player.invalid) {
      this.invalid = true;
      return;
    }

    this.resizer = new Resizer(this);

    const ths = this;
    this.observer = new MutationObserver( (m, o) => this.onVideoDimensionsChanged(m, o, ths));
    this.observer.observe(video, observerConf);

    this.dimensions = {
      width: this.video.offsetWidth,
      height: this.video.offsetHeight,
    };


    // this.arDetector = new ArDetector(this);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting
    this.arDetector = new AardGl(this);
    // player dimensions need to be in:
    // this.player.dimensions

    // apply default align and stretch
    this.logger.log('info', 'debug', "%c[VideoData::ctor] Initial resizer reset!", {background: '#afd', color: '#132'});
    this.resizer.reset();

    this.logger.log('info', ['debug', 'init'], '[VideoData::ctor] Created videoData with vdid', this.vdid, '\nextension mode:', this.extensionMode)

    this.pageInfo.initMouseActionHandler(this);
    this.video.classList.add(this.userCssClassName); // this also needs to be applied BEFORE we initialize resizer!

    // start fallback video/player size detection
    this.fallbackChangeDetection();

    // force reload last aspect ratio (if default crop ratio exists)
    if (this.pageInfo.defaultCrop) {
      this.resizer.setAr(this.pageInfo.defaultCrop);
    }
  }

  async fallbackChangeDetection() {
    while (!this.destroyed && !this.invalid) {
      await this.sleep(500);
      this.doPeriodicFallbackChangeDetectionCheck();
    }
  }

  doPeriodicFallbackChangeDetectionCheck() {
    this.validateVideoOffsets();
  }

  async sleep(timeout) {
    return new Promise( (resolve, reject) => setTimeout(() => resolve(), timeout));
  }


  onVideoDimensionsChanged(mutationList, observer, context) {
    if (!mutationList || context.video === undefined) {  // something's wrong
      if (observer && context.video) {
        observer.disconnect();
      }
      return;
    }
    let confirmAspectRatioRestore = false;

    for (let mutation of mutationList) {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'class') {
          if(!context.video.classList.contains(this.userCssClassName) ) {
            // force the page to include our class in classlist, if the classlist has been removed
            // while classList.add() doesn't duplicate classes (does nothing if class is already added),
            // we still only need to make sure we're only adding our class to classlist if it has been
            // removed. classList.add() will _still_ trigger mutation (even if classlist wouldn't change).
            // This is a problem because INFINITE RECURSION TIME, and we _really_ don't want that.
            context.video.classList.add(this.userCssClassName);  
          }
          // always trigger refresh on class changes, since change of classname might trigger change 
          // of the player size as well.
          confirmAspectRatioRestore = true;
        }
        if (mutation.attributeName === 'style') {
          confirmAspectRatioRestore = true;
        }
      }
    }

    if (!confirmAspectRatioRestore) {
      return;
    }

    // adding player observer taught us that if element size gets triggered by a class, then
    // the 'style' attributes don't necessarily trigger. This means we also need to trigger
    // restoreAr here, in case video size was changed this way
    context.player.forceRefreshPlayerElement();
    context.restoreAr();

    // sometimes something fucky wucky happens and mutations aren't detected correctly, so we
    // try to get around that
    setTimeout( () => {
      context.validateVideoOffsets();
    }, 100);
  }

  validateVideoOffsets() {
    // validate if current video still exists. If not, we destroy current object
    try {
      if (! document.body.contains(this.video)) {
        this.destroy();
        return;
      }
    } catch (e) {
    }
    // THIS BREAKS PANNING
    const cs = window.getComputedStyle(this.video);
    const pcs = window.getComputedStyle(this.player.element);

    try {
      const transformMatrix = cs.transform.split(')')[0].split(',');
      const translateX = +transformMatrix[4];
      const translateY = +transformMatrix[5];
      const vh = +(cs.height.split('px')[0]);
      const vw = +(cs.width.split('px')[0]);
      const ph = +(pcs.height.split('px')[0]);
      const pw = +(pcs.width.split('px')[0]);

      // TODO: check & account for panning and alignment
      if (transformMatrix[0] !== 'none'
          && this.isWithin(vh, (ph - (translateY * 2)), 2)
          && this.isWithin(vw, (pw - (translateX * 2)), 2)) {
      } else {
        this.player.forceDetectPlayerElementChange();
      }
      
    } catch(e) {
      // do nothing on fail
    }
  }

  isWithin(a, b, diff) {
    return a < b + diff && a > b - diff
  }

  firstTimeArdInit(){
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if(! this.arSetupComplete){
      // this.arDetector = new ArDetector(this);
      this.arDetector = new AardGl(this);
    }
  }

  initArDetection() {
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if (this.arDetector){
      this.arDetector.init();
    }
    else{
      // this.arDetector = new ArDetector(this);
      this.arDetector = new AardGl(this);
      this.arDetector.init();
    }
  }
  
  startArDetection() {
    this.logger.log('info', 'debug', "[VideoData::startArDetection] starting AR detection")
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if (!this.arDetector) {
      this.initArDetection();
    }
    this.arDetector.start();
  }

  rebootArDetection() {
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    this.arDetector.init();
  }

  stopArDetection() {
    if (this.arDetector) {
      this.arDetector.stop();
    }
  }

  destroy() {
    this.logger.log('info', ['debug', 'init'], `[VideoData::destroy] <vdid:${this.vdid}> received destroy command`);

    if (this.video) {
      this.video.classList.remove(this.userCssClassName);
    }

    this.pause();
    this.destroyed = true;
    try {
      this.arDetector.stop();
      this.arDetector.destroy();
    } catch (e) {}
    this.arDetector = undefined;
    try {
      this.resizer.destroy();
    } catch (e) {}
    this.resizer = undefined;
    try {
      this.player.destroy();
    } catch (e) {}
    try {
      this.observer.disconnect();
    } catch (e) {}
    this.player = undefined;
    this.video = undefined;
  }

  pause(){
    this.paused = true;
    if(this.arDetector){
      this.arDetector.stop();
    }
    if(this.player){
      this.player.stop();
    }
  }

  resume(){
    if(this.destroyed || this.invalid) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    this.paused = false;
    try {
      this.resizer.start();
      if (this.player) {
        this.player.start();
      }
    } catch (e) {
      this.logger.log('error', 'debug', "[VideoData.js::resume] cannot resume for reasons. Will destroy videoData. Error here:", e);
      this.destroy();
    }
  }

  resumeAutoAr(){
    if(this.arDetector){
      this.startArDetection();
    }
  }

  setManualTick(manualTick) {
    if(this.arDetector){
      this.arDetector.setManualTick(manualTick);
    }
  }

  tick() {
    if(this.arDetector){
      this.arDetector.tick();
    }
  }

  setLastAr(lastAr){
    if (this.invalid) {
      return;
    }
    this.resizer.setLastAr(lastAr);
  }

  setAr(ar, lastAr){
    if (this.invalid) {
      return;
    }
    
    if (ar.type === AspectRatio.Fixed || ar.type === AspectRatio.FitHeight || ar.type === AspectRatio.FitHeight) {
      this.player.forceRefreshPlayerElement();
    }

    this.resizer.setAr(ar, lastAr);
  }

  resetAr() {
    if (this.invalid) {
      return;
    }
    this.resizer.reset();
  }

  resetLastAr() {
    if (this.invalid) {
      return;
    }
    this.resizer.setLastAr('original');
  }

  panHandler(event, forcePan) {
    if (this.invalid) {
      return;
    }
    if(this.destroyed) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if(!this.resizer) {
      this.destroy();
      return;
    }
    this.resizer.panHandler(event, forcePan);
  }

  setPanMode(mode) {
    if (this.invalid) {
      return;
    }
    this.resizer.setPanMode(mode);
  }

  setVideoAlignment(videoAlignment) {
    if (this.invalid) {
      return;
    }
    this.resizer.setVideoAlignment(videoAlignment);
  }

  restoreAr(){
    if (this.invalid) {
      return;
    }
    this.resizer.restore();
  }

  setStretchMode(stretchMode, fixedStretchRatio){
    if (this.invalid) {
      return;
    }
    this.resizer.setStretchMode(stretchMode, fixedStretchRatio);
  }

  setZoom(zoomLevel, no_announce){
    if (this.invalid) {
      return;
    }
    this.resizer.setZoom(zoomLevel, no_announce);
  }

  zoomStep(step){
    if (this.invalid) {
      return;
    }
    this.resizer.zoomStep(step);
  }

  announceZoom(scale){
    if (this.invalid) {
      return;
    }
    this.pageInfo.announceZoom(scale);
  }

  markPlayer(name, color) {
    if (this.invalid) {
      return;
    }
    if (this.player) {
      this.player.markPlayer(name, color)
    }
  }
  unmarkPlayer() {
    this.player.unmarkPlayer();
  }

  isPlaying() {
    return this.video && this.video.currentTime > 0 && !this.video.paused && !this.video.ended;
  }

  checkVideoSizeChange(){
    const videoWidth = this.video.offsetWidth;
    const videoHeight = this.video.offsetHeight;
    // this 'if' is just here for debugging — real code starts later. It's safe to collapse and
    // ignore the contents of this if (unless we need to change how logging works)
    if (this.logger.canLog('debug')){
      if(! this.video) {
        this.logger.log('info', 'videoDetect', "[VideoDetect] player element isn't defined");
      }
      if ( this.video &&
           ( this.dimensions?.width != videoWidth ||
             this.dimensions?.height != videoHeight )
      ) {
        this.logger.log('info', 'debug', "[VideoDetect] player size changed. reason: dimension change. Old dimensions?", this.dimensions.width, this.dimensions.height, "new dimensions:", this.video.offsetWidth, this.video.offsetHeight);
      }
    }
    
    // if size doesn't match, update & return true
    if (this.dimensions?.width != videoWidth
        || this.dimensions?.height != videoHeight ){
      this.dimensions = {
        width: videoWidth,
        height: videoHeight,
      };
      return true;
    }

    return false;
  }
}

export default VideoData;

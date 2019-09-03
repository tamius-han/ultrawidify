import Debug from '../../conf/Debug';
import PlayerData from './PlayerData';
import Resizer from '../video-transform/Resizer';
import ArDetector from '../ar-detect/ArDetector';

class VideoData {
  
  constructor(video, settings, pageInfo){
    this.arSetupComplete = false;
    this.video = video;
    this.destroyed = false;
    this.settings = settings;
    this.pageInfo = pageInfo;
    this.extensionMode = pageInfo.extensionMode;
    this.logger = pageInfo.logger;

    this.vdid = (Math.random()*100).toFixed();
    this.userCssClassName = `uw-fuck-you-and-do-what-i-tell-you_${this.vdid}`;


    // We'll replace cssWatcher (in resizer) with mutationObserver
    const observerConf = {
      attributes: true,
      // attributeFilter: ['style', 'class'],
      attributeOldValue: true,
    };
    this.observer = new MutationObserver(this.onVideoDimensionsChanged);
    this.observer.observe(video, observerConf);

    // POZOR: VRSTNI RED JE POMEMBEN (arDetect mora bit zadnji)
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)    
    this.player = new PlayerData(this, this.logger);
    this.resizer = new Resizer(this, this.logger);

    this.arDetector = new ArDetector(this, this.logger);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting
    // player dimensions need to be in:
    // this.player.dimensions

    // apply default align and stretch
    this.logger.log('info', 'debug', "%c[VideoData::ctor] Initial resizer reset!", {background: '#afd', color: '#132'});
    this.resizer.reset();

    this.logger.log('info', ['debug', 'init'], '[VideoData::ctor] Created videoData with vdid', this.vdid, '\nextension mode:', this.extensionMode)

    this.pageInfo.initMouseActionHandler(this);
    this.video.classList.add(this.userCssClassName); // this also needs to be applied BEFORE we initialize resizer!
  }

  onVideoDimensionsChanged(mutationList, observer) {
    if (!mutationList || this.video === undefined) {  // something's wrong
      if (observer && this.video) {
        observer.disconnect();
      }
      return;
    }
    for (let mutation of mutationList) {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'class') {
          if (!this.video.classList.contains(this.userCssClassName)) {
            // force the page to include our class in classlist, if the classlist has been removed
            this.video.classList.add(this.userCssClassName);

          // } else if () {
            // this bug should really get 
          } else {
              this.restoreAr();
          }
        } else if (mutation.attributeName === 'style' && mutation.attributeOldValue !== this.video.getAttribute('style')) {
          // if size of the video has changed, this may mean we need to recalculate/reapply
          // last calculated aspect ratio
          this.player.forceRefreshPlayerElement();
          this.restoreAr();
        } else if (mutation.attribute = 'src' && mutation.attributeOldValue !== this.video.getAttribute('src')) {
          // try fixing alignment issue on video change
          try {
            this.player.forceRefreshPlayerElement();
            this.restoreAr();
          } catch (e) {
            console.error("[VideoData::onVideoDimensionsChanged] There was an error when handling src change.", e);
          }
        }
      }
    }
  }

  firstTimeArdInit(){
    if(this.destroyed) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if(! this.arSetupComplete){
      this.arDetector = new ArDetector(this);
    }
  }

  initArDetection() {
    if(this.destroyed) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if(this.arDetector){
      this.arDetector.init();
    }
    else{
      this.arDetector = new ArDetector(this);
      this.arDetector.init();
    }
  }
  
  startArDetection() {
    this.logger.log('info', 'debug', "[VideoData::startArDetection] starting AR detection")
    if(this.destroyed) {
      // throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
      return;
    }
    if(!this.arDetector) {
      this.arDetector.init();
    }
    this.arDetector.start();
  }

  rebootArDetection() {
    if(this.destroyed) {
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

    this.video.classList.remove(this.userCssClassName);

    this.pause();
    this.destroyed = true;
    if (this.arDetector){
      try {
        this.arDetector.stop();
        this.arDetector.destroy();
      } catch (e) {}
    }
    this.arDetector = undefined;
    if (this.resizer){
      try {
       this.resizer.destroy();
      } catch (e) {}
    }
    this.resizer = undefined;
    if (this.player){
      try {
        this.player.destroy();
      } catch (e) {}
    }
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch (e) {}
    }
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
    if(this.destroyed) {
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
    this.resizer.setLastAr(lastAr);
  }

  setAr(ar, lastAr){
    this.resizer.setAr(ar, lastAr);
  }

  resetAr() {
    this.resizer.reset();
  }

  resetLastAr() {
    this.resizer.setLastAr('original');
  }

  panHandler(event, forcePan) {
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
    this.resizer.setPanMode(mode);
  }

  setvideoAlignment(videoAlignment) {
    this.resizer.setvideoAlignment(videoAlignment);
  }

  restoreAr(){
    this.resizer.restore();
  }

  setStretchMode(stretchMode){
    this.resizer.setStretchMode(stretchMode);
  }

  setZoom(zoomLevel, no_announce){
    this.resizer.setZoom(zoomLevel, no_announce);
  }

  zoomStep(step){
    this.resizer.zoomStep(step);
  }

  announceZoom(scale){
    this.pageInfo.announceZoom(scale);
  }

  markPlayer(name, color) {
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
}

export default VideoData;

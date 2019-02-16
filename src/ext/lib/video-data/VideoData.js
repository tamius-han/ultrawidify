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


    // POZOR: VRSTNI RED JE POMEMBEN (arDetect mora bit zadnji)
    // NOTE: ORDERING OF OBJ INITIALIZATIONS IS IMPORTANT (arDetect needs to go last)    
    this.player = new PlayerData(this);
    this.resizer = new Resizer(this);

    this.arDetector = new ArDetector(this);  // this starts Ar detection. needs optional parameter that prevets ardetdctor from starting
    // player dimensions need to be in:
    // this.player.dimensions
    
    this.vdid = (Math.random()*100).toFixed();
    if (Debug.init) {
      console.log("[VideoData::ctor] Created videoData with vdid", this.vdid,"\nextension mode:", this.extensionMode);
    }

    this.pageInfo.initMouseActionHandler(this);
  }

  firstTimeArdInit(){
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    if(! this.arSetupComplete){
      this.arDetector = new ArDetector(this);
    }
  }

  initArDetection() {
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
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
    if (Debug.debug) {
      console.log("[VideoData::startArDetection] starting AR detection")
    }
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    if(!this.arDetector) {
      this.arDetector.init();
    }
    this.arDetector.start();
  }

  rebootArDetection() {
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    this.arDetector.init();
  }

  stopArDetection() {
    if (this.arDetector) {
      this.arDetector.stop();
    }
  }

  destroy() {
    if(Debug.debug || Debug.init){ 
      console.log(`[VideoData::destroy] <vdid:${this.vdid}> received destroy command`);
    }

    this.pause();
    this.destroyed = true;
    if(this.arDetector){
      this.arDetector.stop();
      this.arDetector.destroy();
    }
    this.arDetector = null;
    if(this.resizer){
      this.resizer.destroy();
    }
    this.resizer = null;
    if(this.player){
      this.player.destroy();
    }
    this.player = null;
    this.video = null;
  }

  pause(){
    this.paused = true;
    if(this.arDetector){
      this.arDetector.stop();
    }
    if(this.resizer){
      this.resizer.stop();
    }
    if(this.player){
      this.player.stop();
    }
  }

  resume(){
    if(this.destroyed) {
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
    }
    this.paused = false;
    try {
      this.resizer.start();
      if (this.player) {
        this.player.start();
      }
    } catch (e) {
      if(Debug.debug){
        console.log("[VideoData.js::resume] cannot resume for reasons. Will destroy videoData. Error here:", e);
      }
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
      throw {error: 'VIDEO_DATA_DESTROYED', data: {videoData: this}};
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

    console.log("is playing? video:", this.video, "ctime:", this.video.currentTime, 
    "paused/ended:", this.video.paused, this.video.ended,
    "is playing?", this.video && this.video.currentTime > 0 && !this.video.paused && !this.video.ended);

    return this.video && this.video.currentTime > 0 && !this.video.paused && !this.video.ended;
  }
}

export default VideoData;

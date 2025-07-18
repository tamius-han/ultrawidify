import VideoData from './VideoData';
import RescanReason from './enums/RescanReason.enum';
import Settings from '../settings/Settings';
import CommsClient from '../comms/CommsClient';
import EventBus from '../EventBus';
import { SiteSettings } from '../settings/SiteSettings';
import IframeManager from './IframeManager';
import { LogAggregator } from '../logging/LogAggregator';
import { ComponentLogger } from '../logging/ComponentLogger';

if (process.env.CHANNEL !== 'stable'){
  console.info("Loading PageInfo");
}

/**
 *
 * The classes kinda go like this:
 *
 *      PageInfo    — one per page/frame.
 *          |
 *          +——— VideoData                    — child of PageInfo. There may be more than one of those
 *          |        +—— PlayerData           — VideoData has exactly ONE (1) PlayerData
 *          |        +—— AspectRatioDetector  — VideoData has 0-1 AARD things
 *          |        +—— Resizer
 *          |               +—— Scaler
 *          |               +—— Stretcher
 *          |               +—— Zoom
 *          +——— VideoData
 *          |        +—— PlayerData
 *          |        :
 *          :
 *
 * There is as many VideoData objects as there are videos.
 */


class PageInfo {
  //#region flags
  readOnly: boolean = false;
  hasVideos: boolean = false;
  siteDisabled: boolean = false;
  isFullscreen: boolean = false;
  //#endregion

  //#region timers and timeouts
  rescanTimer: any;
  urlCheckTimer: any;
  announceZoomTimeout: any;
  //#endregion

  //#region helper objects
  logAggregator: LogAggregator;
  logger: ComponentLogger;
  settings: Settings;
  siteSettings: SiteSettings;
  comms: CommsClient;
  eventBus: EventBus;
  videos: {videoData: VideoData, element: HTMLVideoElement}[] = [];
  iframeManager: IframeManager;
  //#endregion

  //#region misc stuff
  lastUrl: string;
  defaultCrop: any;
  currentCrop: any;
  keyboardHandlerInitQueue: any[] = [];
  currentZoomScale: number = 1;

  keyboardHandler: any;

  fsStatus = {fullscreen: true};  // fsStatus needs to be passed to VideoData, so fullScreen property is shared between videoData instances
  isIframe: boolean = false;
  //#endregion

  fsEventListener = {
    that: this,
    handleEvent: function(event: Event) {
      this.that.fullscreenHandler();
    }
  };

  constructor(eventBus: EventBus, siteSettings: SiteSettings, settings: Settings, logAggregator: LogAggregator, readOnly = false) {
    this.isIframe = window.self !== window.top;

    this.logAggregator = logAggregator;
    this.logger = new ComponentLogger(logAggregator, 'PageInfo', {});
    this.settings = settings;
    this.siteSettings = siteSettings;

    this.lastUrl = window.location.href;
    this.readOnly = readOnly;

    this.isFullscreen = !!document.fullscreenElement;
    this.iframeManager = new IframeManager({eventBus});

    if (eventBus){
      this.eventBus = eventBus;
    }

    try {
      // request inject css immediately
      const playerStyleString = this.siteSettings.data.currentDOMConfig?.customCss?.replace('\\n', '');
      this.eventBus.send('inject-css', {cssString: playerStyleString});
    } catch (e) {
      // do nothing. It's ok if there's no special settings for the player element or crop persistence
    }

    this.currentCrop = this.defaultCrop;

    this.rescan(RescanReason.PERIODIC);
    this.scheduleUrlCheck();

    document.addEventListener('fullscreenchange', this.fsEventListener);

    this.eventBus.subscribeMulti({
      'probe-video': {
        function: () => {
          console.log(`[${window.location}] probe-video received.`)
          this.rescan();
        }
      }
    });
  }

  destroy() {
    // this.logger.debug('destroy', 'destroying all videos!")
    if(this.rescanTimer){
      clearTimeout(this.rescanTimer);
    }
    for (let video of this.videos) {
      try {
        this.eventBus.send('noVideo', undefined);
        video.videoData.destroy();
      } catch (e) {
        this.logger.error('destroy', 'unable to destroy video! Error:', e);
      }
    }

    try {
      const playerStyleString = this.siteSettings.data.currentDOMConfig?.customCss?.replace('\\n', '');
      this.eventBus.send('eject-css', {cssString: playerStyleString});
    } catch (e) {
      // do nothing. It's ok if there's no special settings for the player element
    }
  }

  /**
   * Runs when browser enters full screen.
   */
  enterFullscreen() {
    this.fsStatus.fullscreen = true;
    this.eventBus.send('page-fs-enter', {});
  }

  /**
   * Runs when browser exits full screen
   */
  exitFullscreen() {
    this.fsStatus.fullscreen = false;
    this.eventBus.send('page-fs-exit', {});
  }

  /**
   * Handler for fullscreenchanged event.
   */
  fullscreenHandler() {
    this.isFullscreen = !!document.fullscreenElement;

    if (this.isFullscreen) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  reset() {
    for(let video of this.videos) {
      video.videoData.destroy();
      video.videoData = null;
    }
    this.videos = [];
    this.rescan(RescanReason.MANUAL);
  }

  initMouseActionHandler(videoData) {
    if (this.keyboardHandler) {
      this.keyboardHandler.registerHandleMouse(videoData);
    } else {
      this.keyboardHandlerInitQueue.push(videoData);
    }
  }

  /**
   * Returns all videos on the page.
   *
   * If minSize is provided, it only returns <video> elements that are
   * equal or bigger than desired size:
   *
   *   * sm:  320 x 180
   *   * md:  720 x 400
   *   * lg: 1280 x 720
   *
   * If minSize is omitted, it returns all <video> elements.
   * @param minSize
   * @returns
   */
  getAllVideos(minSize?: 'sm' | 'md' | 'lg') {
    const videoQs = this.siteSettings.getCustomDOMQuerySelector('video');
    let videos: HTMLVideoElement[] = [];

    if (videoQs){
      videos = Array.from(document.querySelectorAll(videoQs) as NodeListOf<HTMLVideoElement> ?? []);
    } else {
      videos = Array.from(document.getElementsByTagName('video') ?? []);
    }

    if (!minSize) {
      return videos;
    }

    return this.filterVideos(videos, minSize);
  }

  filterVideos(videos: HTMLVideoElement[], minSize:  'sm' | 'md' | 'lg') {
    // minimums are determined by vibes and shit.
    // 'sm' is based on "slightly smaller than embeds on old.reddit"
    const minX = { sm: 320, md: 720, lg: 1280 };
    const minY = { sm: 180, md: 400, lg:  720 };

    // filter out videos that aren't big enough
    return videos.filter(
      (v: HTMLVideoElement) => v.clientHeight >= minY[minSize] && v.clientWidth >= minX[minSize]
    );
  }

  /**
   * Gets videos on the page that are big enough for extension to trigger
   * @returns
   */
  getVideos(): HTMLVideoElement[] {
    return this.getAllVideos('lg');
  }

  hasVideo() {
    return this.readOnly ? this.hasVideos : this.videos.length;
  }

  private emitVideoStatus(videosDetected?: boolean) {
    // if we're left without videos on the current page, we unregister the page.
    // if we have videos, we call register.
    if (this.eventBus) {
      // We used to send "register video" requests only on the first load, or if the number of
      // videos on the page has changed. However, since Chrome Web Store started to require every
      // extension requiring "broad permissions" to undergo manual review
      // ... and since Chrome Web Store is known for taking their sweet ass time reviewing extensions,
      // with review times north of an entire fucking month
      // ... and since the legacy way of checking whether our frames-with-videos cache in background
      // script contains any frames that no longer exist required us to use webNavigation.getFrame()/
      // webNavigation.getAllFrames(), which requires a permission that triggers a review.
      //
      // While the extension uses some other permissions that trigger manual review, it's said that
      // less is better / has a positive effect on your manual review times ... So I guess we'll do
      // things in the less-than-optimal. more-than-retarded way.
      //
      // no but honestly fuck Chrome.
      if (videosDetected || this.hasVideo()) {
        this.eventBus.send('has-video', null);
      } else {
        this.eventBus.send('noVideo', null);
      }
    }
  }

  /**
   * Re-scans the page for videos. Removes any videos that no longer exist from our list
   * of videos. Destroys all videoData objects for all the videos that don't have their
   * own <video> html element on the page.
   * @param rescanReason Why was the rescan triggered. Mostly used for logging.
   * @returns
   */
  rescan(rescanReason?: RescanReason){
    let videosDetected = false;

    // is there any video data objects that had their HTML elements removed but not yet
    // destroyed? We clean that up here.
    const orphans = this.videos.filter(x => !document.body.contains(x.element));

    for (const orphan of orphans) {
      orphan.videoData.destroy();
    }

    // remove all destroyed videos.
    this.videos = this.videos.filter(x => !x.videoData.destroyed);


    // add new videos
    try {
      // in iframes, emit registerIframe even if video is smaller than required
      let vids = this.getAllVideos('sm');

      if (this.isIframe && this.eventBus) {
        videosDetected ||= vids?.length > 0;
      };

      // for normal operations, use standard size limits
      vids = this.filterVideos(vids, 'lg');

      if(!vids || vids.length == 0){
        this.hasVideos = false;

        if(rescanReason == RescanReason.PERIODIC){
          this.logger.info({src: 'rescan', origin: 'videoRescan'}, "Scheduling normal rescan.")
          this.scheduleRescan(RescanReason.PERIODIC);
        }

        this.emitVideoStatus(videosDetected);
        return;
      }

      // add new videos
      this.hasVideos = false;
      for (const videoElement of vids) {
        // do not re-add videos that we already track:
        if (this.videos.find(x => x.element.isEqualNode(videoElement))) {
          continue;
        }

        // if we find even a single video with width and height, that means the page has valid videos
        // if video lacks either of the two properties, we skip all further checks cos pointless
        if(!videoElement.offsetWidth || !videoElement.offsetHeight) {
          continue;
        }

        // at this point, we're certain that we found new videos. Let's update some properties:
        this.hasVideos = true;
        videosDetected ||= true;

        // if PageInfo is marked as "readOnly", we actually aren't adding any videos to anything because
        // that's super haram. We're only interested in whether
        if (this.readOnly) {
          // in lite mode, we're done. This is all the info we want, but we want to actually start doing
          // things that interfere with the website. We still want to be running a rescan, tho.

          if(rescanReason == RescanReason.PERIODIC){
            this.scheduleRescan(RescanReason.PERIODIC);
          }
          this.emitVideoStatus(videosDetected);
          return;
        }

        this.logger.info({src: 'rescan', origin: 'videoRescan'}, "found new video candidate:", videoElement, "NOTE:: Video initialization starts here:\n--------------------------------\n")

        try {
          const newVideo = new VideoData(videoElement, this.settings, this.siteSettings, this);
          this.videos.push({videoData: newVideo, element: videoElement});
        } catch (e) {
          this.logger.error('rescan', "rescan error: failed to initialize videoData. Skipping this video.",e);
        }

        this.logger.info({src: 'rescan', origin: 'videoRescan'}, "END VIDEO INITIALIZATION\n\n\n-------------------------------------\nvideos[] is now this:", this.videos,"\n\n\n\n\n\n\n\n")
      }

      this.removeDestroyed();
      this.emitVideoStatus(videosDetected);
    } catch(e) {
      // if we encounter a fuckup, we can assume that no videos were found on the page. We destroy all videoData
      // objects to prevent multiple initialization (which happened, but I don't know why). No biggie if we destroyed
      // videoData objects in error — they'll be back in the next rescan
      this.logger.error('rescan', "rescan error: — destroying all videoData objects",e);
      for (const v of this.videos) {
        v.videoData.destroy();
      }
      this.videos = [];
      return;
    }
    if(rescanReason == RescanReason.PERIODIC){
      this.scheduleRescan(RescanReason.PERIODIC);
    }
  }

  removeDestroyed(){
    this.videos = this.videos.filter( vid => vid.videoData.destroyed === false);
  }

  scheduleRescan(rescanReason){
    if(rescanReason != RescanReason.PERIODIC){
      this.rescan(rescanReason);
      return;
    }

    try{
      if(this.rescanTimer){
        clearTimeout(this.rescanTimer);
      }

      let ths = this;

      this.rescanTimer = setTimeout(function(rescanReason){
        ths.rescanTimer = null;
        ths.rescan(rescanReason);
        ths = null;
      }, this.settings.active.pageInfo.timeouts.rescan, RescanReason.PERIODIC)
    } catch(e) {
      this.logger.error('scheduleRescan', "scheduling rescan failed. Here's why:",e)
    }
  }

  scheduleUrlCheck() {
    try{
    if(this.urlCheckTimer){
      clearTimeout(this.urlCheckTimer);
    }

    let ths = this;

    this.urlCheckTimer = setTimeout(function(){
      ths.urlCheckTimer = null;
      ths.ghettoUrlCheck();
      ths = null;
    }, this.settings.active.pageInfo.timeouts.urlCheck)
    } catch(e){
      this.logger.log('scheduleUrlCheck', "scheduling URL check failed. Here's why:",e)
    }
  }

  ghettoUrlCheck() {
    if (this.lastUrl != window.location.href){
      this.logger.warn('ghettoUrlCheck', "URL has changed. Triggering a rescan!");

      this.rescan(RescanReason.URL_CHANGE);
      this.lastUrl = window.location.href;
    }

    this.scheduleUrlCheck();
  }

  /**
   * Updates current crop configuration.
   *
   * If crop persistence is set to;    then
   *                      disabled     do nothing
   *              until tab reload     set this.defaultCrop
   *               current session     set current AR to session storage
   *                       forever     save settings
   * @param ar
   * @returns
   */
  updateCurrentCrop(ar) {
    this.currentCrop = ar;

    this.siteSettings.updatePersistentOption('crop', ar);
  }


}

if (process.env.CHANNEL !== 'stable'){
  console.info("PageInfo loaded!");
}

export default PageInfo;

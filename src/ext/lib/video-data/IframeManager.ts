import EventBus from '../EventBus';


export type IframeData = {
  // internal data for comms
  tabId: string;
  frameId: string;

  // data for UI
  tag?: string;
  host?: string;

  // other data
  hasVideo?: boolean;
  hasDrm?: boolean;
  isPlaying?: boolean;
  isBigEnough?: boolean;  // 🎶🎶 🎵 🎵 🎶 🎶       AAAAAAAAAAAHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHHHHH AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHHH AAAAAAAAIIIAAAAAIIAAAAAAIAAAAAAAAA
}

export type IframeManagerConfiguration = {
  eventBus: EventBus,
}

/**
 * Manages list of iframes for the current tab.
 */
export default class IframeManager {
  isIframe: boolean;
  private iframeList: IframeData[] = [];
  private
  eventBus: EventBus;

  constructor(config: IframeManagerConfiguration) {
    this.eventBus = config.eventBus;
    this.isIframe = window.self !== window.top;

    if (this.isIframe) {
      window.addEventListener('beforeunload', this.destroy);

      this.eventBus.subscribe(
        'uw-frame-ping',
        {
          source: this,
          function: (cmd, context) => this.handleIframePing(context)
        }
      );
      this.eventBus.send(
        'uw-frame-register', {host: window.location.hostname}, {comms: {forwardTo: 'all-frames'}}
      );
    } else {
      this.eventBus.subscribeMulti(
        {
          'uw-frame-register': {function: (data, context) => this.handleIframeRegister(data, context)},
          'uw-frame-destroyed': {function: (cmd, context) => this.handleFrameDestroyed(context)}
        },
        this
      );

      // register all frames to re-register themselves
      this.eventBus.send(
        'uw-frame-ping', {}, {comms: {forwardTo: 'all-frames'}}
      );
    }
  }



  private destroy() {
    this.eventBus.send(
      'uw-frame-destroyed',
      {},
      {
        comms: {
          forwardTo: 'all-frames'
        }
      },
    )
    this.eventBus.unsubscribeAll(this);
  }

  private handleIframePing(context) {

  }

  /**
   * Handles registration of iframes. If iframe with a given frameId exists, we update the existing frame.
   * @param data
   * @param context
   */
  private handleIframeRegister(data, context) {
    const existingIndex = this.iframeList.findIndex(x => x.frameId === context.comms.sourceFrame.frameId);

    if (existingIndex !== -1) {
      this.iframeList[existingIndex] = {
        ...this.iframeList[existingIndex],
        ...data
      }
    } else {
      this.iframeList.push({
        ...data,
        ...context.comms.sourceFrame
      });
    }
  }

  private handleFrameDestroyed(context) {
    // tab IDs should be the same for all items, making frameId sufficiently unique to filter stuff
    this.iframeList = this.iframeList.filter(x => x.frameId !== context.comms.sourceFrame.frameId);
  }

}

import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import EventBus from '../EventBus';
import { SiteSettings } from '../settings/SiteSettings';

/**
 * Handles changes of extension active status. Changes of fullScreen and theaterMode statuses
 * should get passed to an instance of this class, and this class will dispatch events as necessary.
 */
export class ExtensionStatus {
  private fsStatus: {fullscreen: boolean}; // fsStatus is super duper private. You should access it with isFullScreen getter.
  // NOTE: fsStatus.fullscreen in this class will magically update every time videoData.fsStatus.fullscreen changes. This is
  // some mad exploitation of pass-by-reference.

  private siteSettings: SiteSettings;
  private eventBus: EventBus;

  private isTheaterMode: boolean = false;
  private get isFullScreen() { // let's hide our pass-by-reference hacks & ensure isTheaterMode and isFullScreen are consistent with each-other
    return this.fsStatus.fullscreen;
  }

  private enabled: ExtensionMode;
  private aardEnabled: ExtensionMode;
  private kbdEnabled: ExtensionMode;

  constructor(siteSettings: SiteSettings, eventBus: EventBus, fsStatus: {fullscreen: boolean}){
    this.siteSettings = siteSettings;
    this.eventBus = eventBus;
  }

  refreshExtensionStatus() {
    const canRun = this.siteSettings.isEnabledForEnvironment(this.isTheaterMode, this.isFullScreen);
    const canAard = this.siteSettings.isAardEnabledForEnvironment(this.isTheaterMode, this.isFullScreen);
    const canKbd = this.siteSettings.isKeyboardEnabledForEnvironment(this.isTheaterMode, this.isFullScreen);

    if (canRun !== this.enabled) {
      if (canRun === ExtensionMode.Enabled) {
        this.eventBus.send('set-extension-active', {});
      } else {
        this.eventBus.send('set-extension-inactive', {});
      }
    }
    if (canAard !== this.aardEnabled) {
      if (canAard === ExtensionMode.Enabled) {
        this.eventBus.send('set-aard-active', {});
      } else {
        this.eventBus.send('set-aard-inactive', {});
      }
    }
    if (canKbd !== this.kbdEnabled) {
      if (canKbd === ExtensionMode.Enabled) {
        this.eventBus.send('set-kbd-active', {});
      } else {
        this.eventBus.send('set-kbd-inactive', {});
      }
    }

    this.enabled = canRun;
    this.aardEnabled = canAard;
    this.kbdEnabled = canKbd;
  }

  updateTheaterMode(isTheaterMode: boolean) {
    this.isTheaterMode = isTheaterMode;
    this.refreshExtensionStatus();
  }

  updateFullScreen() {}
}

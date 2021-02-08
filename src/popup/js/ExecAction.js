import Comms from '../../ext/lib/comms/Comms';

class ExecAction {
  constructor(settings, site) {
    this.settings = settings;
    this.site = site;
  }

  setSettings(settings) {
    this.settings = settings;
  }
  setSite(site) {
    this.site = site;
  }

  async exec(action, scope, frame) {
    for (var cmd of action.cmd) {
      if (scope === 'page') {
        const message = {
          forwardToContentScript: true,
          targetFrame: frame,
          frame: frame,
          cmd: cmd.action,
          arg: cmd.arg,
          customArg: cmd.customArg
        }
        Comms.sendMessage(message);
      } else {

        // set-ar-persistence sends stuff to content scripts as well (!)
        // it's important to do that BEFORE the save step
        if (cmd.action === 'set-ar-persistence') {
          // even when setting global defaults, we only send message to the current tab in
          // order to avoid problems related to 
          const message = {
            forwardToActive: true,
            targetFrame: frame,
            frame: frame,
            cmd: cmd.action,
            arg: cmd.arg,
          }
          // this hopefully delays settings.save() until current crops are saved on the site
          // and thus avoid any fucky-wuckies
          await Comms.sendMessage(message);
        }

        let site = this.site;
        if (scope === 'global') {
          site = '@global';
        } else if (!this.site) {
          site = window.location.hostname;
        }

        if (scope === 'site' && !this.settings.active.sites[site]) {
          this.settings.active.sites[site] = this.settings.getDefaultOption();
        }

        if (cmd.action === "set-stretch") {
          this.settings.active.sites[site].stretch = cmd.arg;
        } else if (cmd.action === "set-alignment") {
          this.settings.active.sites[site].videoAlignment = cmd.arg;
        } else if (cmd.action === "set-ExtensionMode") {
          this.settings.active.sites[site].mode = cmd.arg;
        } else if (cmd.action === "set-autoar-mode") {
          this.settings.active.sites[site].autoar = cmd.arg;
        } else if (cmd.action === 'set-keyboard') {
          this.settings.active.sites[site].keyboardShortcutsEnabled = cmd.arg;
        } else if (cmd.action === 'set-ar-persistence') {
          this.settings.active.sites[site]['cropModePersistence'] = cmd.arg;
          this.settings.saveWithoutReload();
        }

        if (cmd.action !== 'set-ar-persistence') {
          this.settings.save();
        }
      }
    }
  }
}

export default ExecAction;

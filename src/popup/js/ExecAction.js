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

  exec(action, scope, frame) {
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

        let site = this.site;
        if (scope === 'global') {
          site = '@global';
        } else if (!this.site) {
          site = window.location.host;
        }

        if (scope === 'site' && !this.settings.active.sites[site]) {
          this.settings.active.sites[site] = this.settings.getDefaultOption();
        }

        if (cmd.action === "set-stretch") {
          this.settings.active.sites[site].stretch = cmd.arg;
        } else if (cmd.action === "set-alignment") {
          this.settings.active.sites[site].videoAlignment = cmd.arg;
        } else if (cmd.action === "set-extension-mode") {
          this.settings.active.sites[site].mode = cmd.arg;
        } else if (cmd.action === "set-autoar-mode") {
          this.settings.active.sites[site].autoar = cmd.arg;
        } else if (cmd.action === 'set-keyboard') {
          this.settings.active.sites[site].keyboardShortcutsEnabled = cmd.arg;
        }
        this.settings.save();
      }
    }
  }
}

export default ExecAction;

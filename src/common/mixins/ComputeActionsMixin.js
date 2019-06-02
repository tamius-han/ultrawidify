export default {
  computed: {
    scopeActions: function() {
      return this.settings.active.actions.filter(x => x.scopes[this.scope] && x.scopes[this.scope].show) || [];
    },
    extensionActions: function(){
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-extension-mode') || [];
    },
    aardActions: function(){
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-autoar-mode') || [];
    },
    aspectRatioActions: function(){
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-ar') || [];
    },
    stretchActions: function(){
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-stretch') || [];
    },
    keyboardActions: function() {
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-keyboard') || [];
    },
    alignmentActions: function() {
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-alignment') || [];
    },
    otherActions: function() {
      return this.scopeActions.filter(x => x.cmd.length > 1) || [];
    }
  }
}
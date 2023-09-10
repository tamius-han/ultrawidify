export default {
  computed: {
    scopeActions: function() {
      return this.settings?.active.actions?.filter(x => {
        if (! x.scopes) {
          console.error('This action does not have a scope.', x);
          return false;
        }
        return x.scopes[this.scope] && x.scopes[this.scope].show
      }) || [];
    },
    extensionActions: function(){
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-ExtensionMode') || [];
    },
    aardActions: function(){
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-autoar-mode') || [];
    },
    aspectRatioActions: function(){
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-ar') || [];
    },
    cropModePersistenceActions: function() {
      return this.scopeActions.filter(x => x.cmd.length === 1 && x.cmd[0].action === 'set-ar-persistence') || [];
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
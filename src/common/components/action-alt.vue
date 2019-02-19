<template>
  <div class="action flex flex-column">

    <div class="flex flex-row action-name-cmd-container">
      <div class="">

      </div>
      <div class="flex action-name">
        <span class="icon" @click="deleteAction()">🗙</span>
        <span class="icon" @click="editAction()">🖉</span> {{action.name}}
      </div>
    </div>
    <div class="flex flex-row">
      <div class="flex flex-column cmd-container">
        <div class="flex bold">
          Command: 
        </div>
        <div class="flex cmdlist">
          {{parseCommand(action.cmd)}}
        </div>
      </div>

     <!-- SCOPES -->
      <div class="flex flex-column scopes-container">
        <div class="flex bold">Popup scopes:</div>

        <!-- global scope -->
        <div v-if="action.scopes.global"
            class="flex flex-row scope-row"
        >
          <div class="flex scope-scope">
            Global:
          </div>
          <div class="flex scope-row-label scope-visible">
            Visible?&nbsp;<span class="scope-row-highlight">{{action.scopes.global.show ? 'Yes' : 'No'}}</span>
          </div>
          <div v-if="action.scopes.global.show"
               class="flex scope-row-label scope-button-label"
          >
            Button label?&nbsp;
            <span class="scope-row-highlight">
              {{action.scopes.global.label ? action.scopes.global.label : (action.label ? action.label : '')}}
              </span>
          </div>
          <div class="flex scope-row-label">
            Keyboard shortcut:&nbsp;
            <span class="scope-row-highlight">
              {{action.scopes.global.shortcut ? parseActionShortcut(action.scopes.global.shortcut[0]) : 'None'}}
            </span>
          </div>
        </div>

        <!-- site scope -->
        <div v-if="action.scopes.site"
            class="flex flex-row scope-row"
        >
          <div class="flex scope-scope">
            Site:
          </div>
          <div class="flex scope-row-label scope-visible">
            Visible?&nbsp;<span class="scope-row-highlight">{{action.scopes.site.show ? 'Yes' : 'No'}}</span>
          </div>
           <div v-if="action.scopes.site.show"
               class="flex scope-row-label scope-button-label"
          >
            Button label?&nbsp;
            <span class="scope-row-highlight">
              {{action.scopes.site.label ? action.scopes.site.label : (action.label ? action.label : '')}}
              </span>
          </div>
          <div class="flex scope-row-label">
            Keyboard shortcut:&nbsp;
            <span class="scope-row-highlight">
              {{action.scopes.site.shortcut ? parseActionShortcut(action.scopes.site.shortcut[0]) : 'None'}}
            </span>
          </div>
        </div>

        <!-- page scope -->
        <div v-if="action.scopes.page"
              class="flex flex-row scope-row"
          >
          <div class="flex scope-scope">
            Page:
          </div>
          <div class="flex scope-row-label scope-visible">
            Visible?&nbsp;<span class="scope-row-highlight">{{action.scopes.page.show ? 'Yes' : 'No'}}</span>
          </div>
          <div v-if="action.scopes.page.show"
               class="flex scope-row-label scope-button-label"
          >
            Button label?&nbsp;
            <span class="scope-row-highlight">
              {{action.scopes.page.label ? action.scopes.page.label : (action.label ? action.label : '')}}
              </span>
          </div>
          <div class="flex scope-row-label">
            Keyboard shortcut:&nbsp;
            <span class="scope-row-highlight">
              {{action.scopes.page.shortcut ? parseActionShortcut(action.scopes.page.shortcut[0]) : 'None'}}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Stretch from '../enums/stretch.enum';
import KeyboardShortcutParser from '../js/KeyboardShortcutParser';


export default {
  data () {
    return {
      Stretch: Stretch
    }
  },
  created () {
  },
  props: {
    action: Object,
    index: Number,
  },
  methods: {
    parseActionShortcut(shortcut) {
      return KeyboardShortcutParser.parseShortcut(shortcut);
    },
    parseCommand(cmd) {
      let cmdstring = '';
      for (const c of cmd) {
        cmdstring += `${c.action} ${c.arg}${c.persistent ? ' persistent' : ''}; `;
      }
      return cmdstring;
    },
    editAction() {
      this.$emit('edit');
    },
    removeAction() {
      this.$emit('remove');
    }
  }
}
</script>


<style lang="scss" scoped>
@import '../../res/css/colors.scss';

.action {
  cursor: pointer;
}

.action-name-cmd-container {
  padding: 1rem;
}

.action-name {
  font-size: 1.5rem;
  font-weight: 300;
  color: $primary-color;
}

.cmd-container {
  width: 13.37rem;
}

.cmdlist {
  font-family: 'Overpass Mono';
  font-size: 0.9rem;
  color: $text-dim;
}

.bold {
  font-weight: 600;
}

.scope-scope {
  width: 5rem;
  text-align: right !important;
  color: $secondary-color;
}

.scope-visible {
  width: 7rem;
}

.scope-button-label {
  width: 16rem;
}

.scope-row-label {
  color: $text-dark;
}

.scope-row-highlight {
  color: $text-normal;
}


</style>

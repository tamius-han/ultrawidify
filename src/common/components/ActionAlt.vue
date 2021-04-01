<template>
  <div class="action">
    <div class="flex-row action-name-cmd-container">
      <div class="">

      </div>
      <div class="flex action-name">
        <span v-if="action.cmd && action.cmd.length > 1 || action.cmd[0].action === 'set-ar' && action.userAdded || (action.cmd[0].arg === AspectRatioType.Fixed)" class="icon red" @click="removeAction()">🗙</span>
        <span v-else class="icon transparent">🗙</span> &nbsp; &nbsp;
        <span class="icon" @click="editAction()">🖉</span> &nbsp; &nbsp;
        {{action.name}}
      </div>
    </div>
    <div class="command-details">
      <div class="flex flex-column cmd-container cd-pad">
        <div class="flex bold">
          Command: 
        </div>
        <div class="flex cmdlist">
          {{parseCommand(action.cmd)}}
        </div>
      </div>

     <!-- SCOPES -->
      <div class="flex flex-column scopes-container cd-pad">
        <div class="flex bold">Popup tabs:</div>

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
import StretchType from '../enums/StretchType.enum';
import AspectRatioType from '../enums/AspectRatioType.enum';
import KeyboardShortcutParser from '../js/KeyboardShortcutParser';


export default {
  data () {
    return {
      StretchType: StretchType,
      AspectRatioType: AspectRatioType,
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

.uw-ultrawidify-container-root {
  .action {
    cursor: pointer;
    position: relative;
    box-sizing: border-box;
  }

  .action .command-details {
    height: 0px;
    max-height: 0px;
    transition: max-height 0.5s ease;
    overflow: hidden;
    transition: height 0.5s ease;
    position: absolute;
    top: 0;
    right: 0;
    width: 50%;
  }

  .action:hover .command-details {
    height: auto;
    max-height: 200px;
    transition: max-height 0.5s ease;
  }

  .command-details {
    position: absolute;
    top: 0;
    right: 0;
    width: 50%;
  }

  .action-name-cmd-container, .p1rem {
    padding: 1rem;
  }

  .cd-pad {
    padding: 0.5em;
  }

  .action-name {
    font-size: 1.5rem;
    font-weight: 300;
    color: $text-normal;
    width: 50%;
  }

  .action-name:hover, .action:hover .action-name {
    color: lighten($primary-color, 20%);
  }

  .red {
    color: $primary-color !important;
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

  .transparent {
    opacity: 0;
  }
}
</style>

<template>
  <tr>
     <td class="cmd monospace">{{parseCommand(action.cmd)}}</td>
      <td class="">{{action.label ? action.label : ""}}</td>
      <td class="shortcut center-text">{{parseActionShortcut(action)}}</td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox"
                :class="{'checkbox-checked': (action.shortcut && action.shortcut.length && 
                                             (action.shortcut[0].onMouseMove || action.shortcut[0].onClick ||
                                              action.shortcut[0].onScroll))}"
          ></span>
        </div>
      </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox"
                :class="{'checkbox-checked': action.popup_global}"
          >
          </span>
        </div>
      </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox"
                :class="{'checkbox-checked': action.popup_site}"
          ></span>
        </div>
      </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox"
                :class="{'checkbox-checked': action.popup}"
          ></span>
        </div>
      </td>
      <td class="center-text">
        <div class="checkbox-container">
          <span class="checkbox"
                :class="{'checkbox-checked': action.ui}"
          ></span>
        </div>
      </td>
      <td>{{action.ui_path ? action.ui_path : ""}}</td>
  </tr>
</template>

<script>
import StretchType from '../enums/StretchType.enum';
import KeyboardShortcutParser from '../js/KeyboardShortcutParser'

export default {
  data () {
    return {
      Stretch: Stretch
    }
  },
  created () {
  },
  props: {
    action: Object
  },
  methods: {
    parseActionShortcut(action) {
      return KeyboardShortcutParser.parseShortcut(action.shortcut[0]);
    },
    parseCommand(cmd) {
      let cmdstring = '';
      for(const c of cmd) {
        cmdstring += `${c.action} ${c.arg}${c.persistent ? ' persistent' : ''}; `;
      }
      return cmdstring;
    } 
  }
}
</script>
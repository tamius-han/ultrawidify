<template>
  <div>
    <p>Here, you can change keyboard shortcuts or even create your own.</p>

    <div class="flex flex-column">
      <div class="action-item-category-header">
        Crop actions
      </div>
      <template v-for="(action, index) of settings.active.actions">
        <ActionAlt v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-ar'"
                   :key="index"
                   :action="action"
                   @edit="changeShortcut(index)"
        >
        </ActionAlt>
      </template>

      
      <div class="action-item-category-header">
        Stretch actions
      </div>
      <template v-for="(action, index) of settings.active.actions">
        <ActionAlt v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-stretch'"
                   :key="index"
                   :action="action"
                   @edit="changeShortcut(index)"
        >
        </ActionAlt>
      </template>


      <div class="action-item-category-header">
        Alignment actions
      </div>
      <template v-for="(action, index) of settings.active.actions">
        <ActionAlt v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-alignment'"
                   :key="index"
                   :action="action"
                   @edit="changeShortcut(index)"
        >
        </ActionAlt>
      </template>

      <div class="action-item-category-header">
        Zoom / panning actions
      </div>
      <template v-for="(action, index) of settings.active.actions">
        <ActionAlt v-if="action.cmd.length === 1 && (
                            action.cmd[0].action === 'change-zoom' ||
                            action.cmd[0].action === 'set-zoom' ||
                            action.cmd[0].action === 'set-pan' || 
                            action.cmd[0].action === 'pan' ||
                            action.cmd[0].action === 'set-pan'
                        )"
                   :key="index"
                   :action="action"
                   @edit="changeShortcut(index)"
        >
        </ActionAlt>
      </template>

      <div class="action-item-category-header">
        Other actions
      </div>
      <template v-for="(action, index) of settings.active.actions">
        <ActionAlt v-if="action.cmd.length > 1 || (
                            action.cmd[0].action !== 'change-zoom' &&
                            action.cmd[0].action !== 'set-zoom' &&
                            action.cmd[0].action !== 'set-pan' &&
                            action.cmd[0].action !== 'pan' &&
                            action.cmd[0].action !== 'set-pan' &&
                            action.cmd[0].action !== 'set-alignment' &&
                            action.cmd[0].action !== 'set-stretch' &&
                            action.cmd[0].action !== 'set-ar'
                        )"
                   :key="index"
                   :action="action"
                   @edit="changeShortcut(index)"
        >
        </ActionAlt>
      </template>

    </div>
  </div>
</template>

<script>
import Button from '../../common/components/button';
import Stretch from '../../common/enums/stretch.enum';
import ActionAlt from '../../common/components/action-alt';

export default {
  components: {
    Button,
    ActionAlt,
  },
  data () {
    return {
      Stretch: Stretch,
      tableVisibility: {
        crop: true,
      }
    }
  },
  created () {
  },
  props: {
    settings: Object
  },
  watch: {
    settings: (newVal, oldVal) => {
      console.log("this.settings", this.settings, newVal, oldVal)
      this.settings = newVal;
    }
  },
  methods: {
    changeShortcut(index) {
      this.$emit('edit-event', index);
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../res/css/colors.scss';

.action-item-category-header {
  margin-top: 3rem;
  color: $primary-color;
  font-size: 2.4rem;
  font-variant: small-caps;
  font-weight: 600;
}
</style>

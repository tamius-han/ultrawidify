<template>
  <div>
    <p>Here you can create, edit or remove actions. This includes adding keyboard shortcuts that trigger them, or toggling visibility of each action in the extension popup.</p>
    <p><b>Note that this section is highly experimental.</b> If there's extension-breaking bugs, please file a bug report on github or e-mail me.
    However, there's some bugs that I'm aware of, but have little intentions to fix any time soon: <ul>
      <li><b>Crop actions</b> (and maybe some others) are limited to the <i>page</i> scope (‘Video settings’ in popup) by design.
      Yes, 'global' and 'site' checkboxes are still there, but they won't do anything. I probably won't remove them any time soon,
      because I'd honestly rather spend my finite time on other things.</li>
      <li>UI looks absolutely atrocious, and it's prolly gonna stay that way for a while. I am open to specific design suggestions, though.</li>
      <li><b>For shortcuts:</b> you can use modifier keys (ctrl/alt/meta/shift), but remember to release modifier keys last. For example,
      if you want to do use shift-S for anything: press both keys, release S, release shift. If you release shift first, extension
      will think you were holding only shift key. You're prolly used to doing things that way already. If you're not — bad news,
      reworking how keyboard shortcuts work isn't going to happen for a while.</li>
      <li>I don't think reordering (in a user-friendly way at least) is gonna happen any time soon.</li>
    </ul>
    </p>

    <p>&nbsp;</p>

    <div class="flex flex-row button-box">
      <Button label="Add new action"
              @click.native="addAction()"
      >
      </Button>
    </div>

    <div class="flex flex-column">
      <div class="action-item-category-header">
        Crop actions
      </div>
      <template v-for="(action, index) of settings.active.actions">
        <ActionAlt v-if="action.cmd.length === 1 && action.cmd[0].action === 'set-ar'"
                   :key="index"
                   :action="action"
                   @edit="changeShortcut(index)"
                   @remove="removeAction(index)"
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
                   @remove="removeAction(index)"
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
                   @remove="removeAction(index)"
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
                   @remove="removeAction(index)"
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
                   @remove="removeAction(index)"
        >
        </ActionAlt>
      </template>

    </div>
  </div>
</template>

<script>
import Button from '../../common/components/Button';
import StretchType from '../../common/enums/StretchType.enum';
import ActionAlt from '../../common/components/ActionAlt';

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
      this.settings = newVal;
    }
  },
  methods: {
    removeAction(index) {
      this.$emit('remove-event', index)
    },
    addAction() {
      this.$emit('edit-event', -1);
    },
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

<template>
  <div>
    <div class="flex flex-row">
      <div class="flex label-secondary form-label">
        Show in popup:
      </div>
      <div class="flex flex-input flex-grow">
        <input type="checkbox"
               :checked="scopeOptions.show"
               @input="$emit('show', $event.target.checked)"
        />
      </div>
    </div>
    <div class="flex flex-row">
      <div class="flex label-secondary form-label">
        Custom label <small>(optional)</small>:
      </div>
      <div class="flex flex-input flex-grow">
        <input type="text"
               v-model="scopeOptions.label"
               @input="setLabel($event.target.value)"
        />
      </div>
    </div>
    <div class="flex flex-row">
      <div class="flex label-secondary form-label">
        <span class="w100">
          Shortcut:
        </span>
      </div>
      <div class="flex flex-input flex-grow">
        <SetShortcutButton
                            :shortcut="scopeOptions.shortcut"
                            @set-shortcut="$emit('set-shortcut', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import SetShortcutButton from './set-shortcut-button';

export default {
  props: {
    scopeOptions: Object,
  },
  components: {
    SetShortcutButton,
  },
  methods: {
    setLabel(label) {
      if (label.trim() === '') {
        label = undefined;
      }
      this.$emit('set-label', label.trim())
    }
  }
}
</script>

<style>

</style>

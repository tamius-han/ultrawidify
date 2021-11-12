<template>
  <div class="full-screen"
       @click="cancel()"
  >
    <div class="dialog-box flex flex-column" @click="$event.stopPropagation()">
      <div>
        {{dialogText}}
      </div>
      <div class="flex flex-row flex-end">
        <ShortcutButton class="flex b3 button"
                        label="Ok"
                        @click.native="confirm()"
        />
        <ShortcutButton class="flex b3 button"
                        label="Cancel"
                        @click.native="cancel()"
        />
      </div>
    </div>
  </div>
</template>

<script>
import ShortcutButton from '../../common/components/ShortcutButton.vue'

export default {
  props: {
    dialogText: String,
  },
  components: {
    ShortcutButton
  },
  methods: {
    cancel() {
      this.$emit('close')
    },
    confirm() {
      this.$emit('confirm')
    }
  }
}
</script>

<style lang="scss" scoped>
.full-screen {
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: absolute;
}

.dialog-box {
  background-color: rgba(0,0,0,0.9);
  // width: 100%;
  // height: 100%;
  max-width: 130rem;
  max-height: 42rem;
  padding-top: 2rem;
  padding-left: 3rem;
  padding-right: 3rem;
}

</style>

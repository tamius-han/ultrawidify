<template>
  <div class="command-chain flex flex-row flex-center flex-cross-center">
    <!-- {{command}} -->
    <div class="flex flex-row flex-center flex-cross-center">
      <CommandBlock v-for="(cmd, index) of command"
                    :key="index"
                    :action="cmd"
                    @edit="$emit('edit', index)"
                    @delete="$emit('delete', index)"
                    @move-left="$emit('move-left', index)"
                    @move-right="$emit('move-left', (index + 1))"
      >
      </CommandBlock>
      <div class="new-command h100 flex flex-column flex-center flex-cross-center"
           @click="$emit('new-command')"
      >
        <div><b>+</b></div>
      </div>
    </div>
  </div>
</template>

<script>
import CommandBlock from './CommandBlock';
import CommandAddEdit from './CommandAddEdit';

export default {
  created () {
  },
  components: {
    CommandBlock,
    CommandAddEdit,
  },
  props: [
    'command'
  ],
  methods: {
  }
}
</script>
<style lang="scss" scoped>
@import '../../../res/css/colors';

.new-command {
  color: $primary-color;
  height: 100%;
  padding-left: 2rem;
  padding-right: 2rem;
  font-size: 2rem;
}
</style>

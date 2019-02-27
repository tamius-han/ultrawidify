<template>
  <div class="">
    {{command}}
    <div class="flex flex-row">
      <CommandBlock v-for="(cmd, index) of command"
                    :key="index"
                    :command="cmd"
                    first
                    last
                    @edit="$emit('edit', index)"
                    @delete="$emit('delete', index)"
                    @move-left="$emit('move-left', index)"
                    @move-right="$emit('move-left', (index + 1))"
      >
      </CommandBlock>
      <div class="new-command"
           @click="$emit('new-command')"
      >
        +
      </div>
    </div>
  </div>
</template>

<script>
import CommandBlock from './command-block';
import CommandAddEdit from './command-add-edit';

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
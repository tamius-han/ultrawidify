<template>
  <div class="flex flex-column">
    <div v-if="!editing && !adding" class="flex flex-row">
      <div class="">
        <b>Query selector:</b> {{qs.string}}<br/>
        <b>Additional CSS:</b> {{qs.css || 'no style rules'}}
      </div>
      <div class="flex flex-column flex-nogrow">
        <a @click="editing = true">Edit</a>
        <a @click="$emit('delete')">Delete</a>
      </div>
    </div>
    <div v-else class="flex flex-row">
      <div class="flex flex-column">
        <div class="flex flex-row">
          <div class="flex label-secondary form-label">
            Query selector:
          </div>
          <div class="flex flex-input">
            <input type="text"
                   v-model="qs.string"
            />
          </div>
        </div>
        <div class="flex flex-row">
          <div class="flex label-secondary form-label">
            Additional CSS:
          </div>
          <div class="flex flex-input">
            <input type="text"
                   v-model="qs.css"
            />
          </div>
        </div>
      </div>
      <div>
        <a v-if="editing" @click="cancelEdit">Cancel</a>
        <a v-if="adding" @click="clear">Clear</a>
        <a @click="save">Save</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      qs: {string: '', css: ''},
      editing: false,
    }
  },
  props: {
    querySelector: Object,
    adding: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  watch: {
    querySelector(val) {
      this.qs = JSON.parse(JSON.stringify(val));
    }
  },
  methods: {
    save() {
      if (this.adding) {
        this.$emit('create', this.qs);
        this.qs = {string: '', css: ''};
      } else {
        this.emit$('update', this.qs)
      }
    },
    cancelEdit() {
      this.qs = JSON.parse(JSON.stringify(this.querySelector));
    },
    clear() {
      this.qs = {string: '', css: ''};
    }
  }
}
</script>

<style>

</style>

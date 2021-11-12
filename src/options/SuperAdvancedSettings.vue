<template>
  <div style="padding-bottom: 100px;">
    <p>If you feel like you need an adventure, you can edit the settings the real manly way.</p>
    <p>Features of editing settings via text:
      <ul>
        <li>Even less validation than in gui way</li>
        <li>Includes settings that Tam hasn't (or won't) put into the GUI part of settings.</li>
        <li>Absolutely NO hand holding!</li>
        <li>Even less documentation (unless you go and crawl through source code on github)! Variable names are self-documenting (tm) enough</li>
      </ul>
    </p>
    <p>Save button is all the way to the bottom.</p>
    <div ref="settingsEditArea"
         style="white-space: pre-wrap; border: 1px solid orange; padding: 10px;"
         :class="{'jsonbg': !hasError, 'jsonbg-error': hasError}"
         contenteditable="true"
         @input="updateSettings"
    >{{parsedSettings}}</div>


    <div class="flex flex-row button-box sticky-bottom">
      <Button label="Cancel"
              @click.native="cancel()"
      > 
      </Button>
      <Button label="Save settings"
              :disabled="hasError"
              @click.native="saveManual()"
      >
      </Button>
    </div>
  </div>
</template>

<script>
import Button from '../common/components/Button.vue';
export default {
  components: {
    Button,
  },
  data() {
    return {
      hasError: false,
      parsedSettings: '',
      lastSettings: {},
    }
  },
  created() {
    this.parsedSettings = JSON.stringify(this.settings.active, null, 2);
    this.lastSettings = JSON.parse(JSON.stringify(this.settings.active));
  },
  props: {
    settings: Object,
  },
  computed: {
    // parsedSettings() {
    //   return
    // }
  },
  methods: {
    updateSettings(val) {
      try {
        this.settings.active = JSON.parse(val.target.textContent);
        this.hasError = false;
      } catch (e) {
        this.hasError = true;
      }
    },
    saveManual(){
      if (this.hasError) {
        return;
      }
      this.settings.save({forcePreserveVersion: true});
      // this.parsedSettings = JSON.stringify(this.settings.active, null, 2);
      // this.lastSettings = JSON.parse(JSON.stringify(this.settings.active));
      const ths = this;
      this.$nextTick( () => {
        ths.parsedSettings = JSON.stringify(ths.lastSettings, null, 2)
        ths.lastSettings = JSON.parse(JSON.stringify(ths.settings.active))
      });
    },
    cancel(){
      this.parsedSettings = '';
      this.settings.rollback();
      const ths = this;
      this.$nextTick( () => ths.parsedSettings = JSON.stringify(ths.lastSettings, null, 2) );
      this.hasError = false;
    }
  }
}
</script>

<style scoped>
.jsonbg {
  background-color: #131313;
}
.jsonbg-error {
  background-color: #884420;
}
</style>

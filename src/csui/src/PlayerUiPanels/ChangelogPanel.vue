<template>
  <div class="flex flex-col w-full h-full gap-2">
    <div class="flex flex-row gap-8 bg-black flex-wrap">
      <div class="min-w-[400px] max-w-[520px] grow-1 shrink-1">
        <h1>What's new</h1>
        <!-- <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p> -->

        <h2>6.2.4</h2>
        <ul>
          <li>[<a href="https://github.com/tamius-han/ultrawidify/issues/264" target="_blank">#264</a>] Fixed issue with white screen that affected <i>some</i> youtube users.<br/>Special thanks to <a href="https://github.com/SnowyOwlNugget">SnowyOwlNugget</a>, who instead of whining provided the necessary information.</li>
          <li>Minor updates to the settings</li>
          <li>Switching between full screen, theater, and normal player now correctly enables and disables the extension according to the settings.</li>
          <li>Does anyone even read these?</li>
          <li>By default, extension is now only enabled for sites with 'official' and 'community' support for new installs. Extension will need to be manually enabled for other sites.</li>
          <li>Gussief1, you owe me 5 bucks. Time to put your money where your mouth is. Paypal is <a href="https://www.paypal.com/paypalme/tamius" target="_blank">here.</a></li>
          <li>Added background to in-player UI due to chrome bug affecting <code>backdrop-filter</code> inside transparent iframes.</li>
        </ul>

        <p>
          Planned future updates <i>before</i> Tam vanishes due to convention season obligations:
        </p>
        <ul>
          <li>Re-implement manual zoom</li>
          <li>It appears that ExtConfPatch for version 6.0.0 keeps getting re-applied due to a bug, but my RAID ran out for this release.</li>
        </ul>

      </div>
      <div class="min-w-[400px] max-w-[520px] grow-1 shrink-1">
        <h2>Thank you monies</h2>
        <p>
          If you think I deserve money for the work I did up to this point, you can bankroll my caffeine addiction.
        </p>
        <p class="text-center">
          <a class="donate" href="https://www.paypal.com/paypalme/tamius" target="_blank">Donate on Paypal</a>
        </p>
      </div>
    </div>
  </div>
</template>
<script>

export default({
  props: [
    'settings'
  ],
  mounted() {
    this.settings.active.whatsNewChecked = true;
    this.settings.saveWithoutReload();
  }
});
</script>
<style lang="scss" scoped>
.flex {
  display: flex;
}
.flex-row {
  flex-direction: row;
}

p, li {
  font-size: 1rem;
}
small {
  opacity: 0.5;
  font-size: 0.8em;
}
a {
  color: #fa6;
}
.text-center {
  text-align: center;
}
.donate {
  margin: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: #fa6;
  color: #000;
}
</style>

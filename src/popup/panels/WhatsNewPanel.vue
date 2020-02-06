<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.4</p>
    <ul>
      <li>Tab detection in extension popup has been made more accurate</li>
      <li>QoL: Added user-accessible logger (to make fixing sites I can't access a bit easier)</li>
      <li>Changed links to reflect my github username change</li>
    </ul>
  </div>
</template>
<script>
import BrowserDetect from '../../ext/conf/BrowserDetect';

export default {
  data () {
    return {
      BrowserDetect: BrowserDetect
    }
  },
}
</script>

<style>

</style>

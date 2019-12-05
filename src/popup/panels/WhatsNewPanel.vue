<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.2</p>
    <ul>
      <li>Stretching supports two new kinds of stretching (both hybrid). One stretches (or squishes) the video before 
        applying any possible crop, the other option first crops and then stretches/squishes to specified aspect ratio.<br/>
        Especially the first option should be great for all men of culture who prefer watching content in its native aspect
        ratio (even if that means seeing black bars) who get outright triggered when some uncivilized barbarians stretch 4:3
        content to 16:9. You're welcome.<br/><small>Okay maybe I shouldn't soapboax like that in my patch notes.</small><br/>
        There's two new buttons in 'stretch' section (video only). You can add more in extension settings if you want.<br/>
        <b>This is experimental af and wasn't tested thoroughly — feedback welcome.</b> Links in 'report a problem' tab of
        this popup.
      </li>
      <li>Disney+ didn't work for some. I've attempted to do a fix, but I am unable to test it (by the virtue of D+ not
        being available in my country). If Disney+ continues to be problematic, I will probably need some help with it.
        I would love to hear some feedback on whether extension works on Disney+ or not — please consider contacting me 
        via <a href="mailto:tamius.han@gmail.com" target="_blank">email</a> or <a href="https://www.reddit.com/message/compose?to=xternal7" target="_blank">reddit</a>.
      </li>
      <li>Fixed a bug where user added actions would not be removable the nice way.</li>
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

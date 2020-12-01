<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.5.0</p>
    <ul>
      <li>
        Under the hood: migrated from vue2 to vue3, because optional chaining in templates is too OP.
      </li>
      <li>
        (On options page, section 'Action &amp; shortcuts') Manual aspect ratio now supports entering custom ratios using '21/9' and '2.39:1' formats (as opposed to single number, e.g. '2.39') — <a href="https://github.com/tamius-han/ultrawidify/issues/121">#121</a>.
      </li>
      <li>
        Added config for wakanim.tv (special thanks to <a href="https://github.com/saschanaz">@saschanaz</a> for doing the legwork — <a href="https://github.com/tamius-han/ultrawidify/issues/113">#113</a>)
      </li>
      <li>
        (In Firefox) When extension was placed in overflow menu, the popup was cut off. That should be fixed now. (<a href="https://github.com/tamius-han/ultrawidify/issues/119">#119</a>)
      </li>
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

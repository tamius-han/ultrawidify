<template>
  <div>
    <div class="row">
      <span class="label">Ultrawidify version:</span><br/> {{addonVersion}}
    </div>
    <div class="row">
    <span class="label">Having an issue?</span><br/> Report <strike>undocumented features</strike> bugs using one of the following options:
      <ul>
        <li> <a target="_blank" href="https://github.com/xternal7/ultrawidify/issues"><b>Github (strongly preferred)</b></a><br/></li>
        <li>PM me on <a target="_blank" href="https://www.reddit.com/message/compose?to=xternal7&subject=[Ultrawidify]%20ENTER%20SUMMARY%20OF%20YOUR%20PROBLEM%20HERE&message=Describe+your+issue+in+more+detail.+Don%27t+forget+to+include%3A%0D%0A%2A+Extension+version%0D%0A%2A+Browser%0D%0A%2A+Operating+system%0D%0A%2A+Other+extensions+that+could+possibly+interfere%0D%0A%0D%0AIf+you%27re+reporting+an+issue+with+automatic+aspect+ratio+detection%2C+please+also+include+the+following+%28if+possible%29%3A%0D%0A%2A+model+and+make+of+your+CPU%0D%0A%2A+amount+of+RAM">reddit</a><br/></li>
        <li>Email: <a target="_blank" href="mailto:tamius.han@gmail.com?subject=%5BUltrawidify%5D+ENTER+SUMMARY+OF+YOUR+ISSUE+HERE&body=Describe+your+issue+in+more+detail.+Don%27t+forget+to+include%3A%0D%0A%2A+Extension+version%0D%0A%2A+Browser%0D%0A%2A+Operating+system%0D%0A%2A+Other+extensions+that+could+possibly+interfere%0D%0A%0D%0AIf+you%27re+reporting+an+issue+with+automatic+aspect+ratio+detection%2C+please+also+include+the+following+%28if+possible%29%3A%0D%0A%2A+model+and+make+of+your+CPU%0D%0A%2A+amount+of+RAM">tamius.han@gmail.com</a></li>
      </ul>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    'addonVersion': String
  }
}
</script>


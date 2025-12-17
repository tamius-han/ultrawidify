<template>
  <!-- ADVANCED OPTIONS -->
  <pre>{{siteSettings.raw}}</pre>

  <div class="">
    <h3>Player element</h3>
    <div class="field">
      <div class="label">Manually specify player</div>
      <input type="checkbox" />
    </div>
    <div class="field">
      <div class="label">Select player by/as:</div>
      <div class="select">
        <select>
          <option>n-th parent of video</option>
          <option>Query selectors</option>
        </select>
      </div>
    </div>
    <div class="field">
      <div class="label">Player is n-th parent of video</div>
      <div class="range-input">
        <input type="range" min="0" max="100" />
        <input />
      </div>
    </div>
    <div class="field">
      <div class="label">Query selector for player element</div>
      <div class="input">
        <input />
      </div>
    </div>
    <div class="field">
      <div class="label">In full screen, calculate crop based on monitor resolution</div>
      <input type="checkbox" />
    </div>

    <h3>Video element</h3>
    <div class="field">
      <div class="label">Select video element automatically</div>
      <input type="checkbox">
    </div>
    <div class="field">
      <div class="label">Query selectors</div>
      <div class="input">
        <input>
      </div>
    </div>
    <div class="field">
      <div class="label">Additional styles for video element</div>
      <div class="input">
        <textarea></textarea>
      </div>
    </div>

    <h3>Additional css for this page</h3>
    <div class="field">
      <div class="label">Additional CSS for this page</div>
      <textarea></textarea>
    </div>

  </div>
</template>

<script lang="ts">
export default({

});
</script>

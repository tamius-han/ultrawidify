<template>
  <div class="uw-clickthrough relative w-100 h-100">
    <template v-for="rectangle of drawnRectangles" :key="rectangle.id ?? rectangle">

      <!-- Player element overlays -->
      <div class="absolute z-index-overlay"
        :style="rectangle.style"
      >
        <!-- used for drawing player element overlay rectangles - keep this section empty -->
      </div>

      <!-- Notification overlay -->
      <div class="absolute z-index-notification notification-area">
        <template v-for="notification of displayedNotifications" :key="notification.id">
          <div class="notification d-flex flex-row">
            <div class="notification-icon">
              <mdicon :name="notification.icon ?? 'alert'" :size="128"></mdicon>
            </div>
            <div class="notification-text">
              <h3 class="notification-title">{{ notification.title }}</h3>
              <p class="notification-verbose">{{ notification.text }}</p>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
import UIProbeMixin from './src/utils/UIProbeMixin';

export default {
  components: {
  },
  mixins: [
    UIProbeMixin
  ],
  data() {
    return {
      drawnRectangles: [],
      displayedNotifications: [],
    }
  },

  async created() {
    this.logger = new Logger();

    // this prolly needs to be taken out
    await this.logger.init({
      allowLogging: true,
    });

    /**
     * Setup the "companion" onMouseMove handler to the one in the content script.
     * We can handle events with the same function we use to handle events from
     * the content script.
     */
     document.addEventListener('mousemove', (event) => {
      this.handleProbe({
        coords: {
          x: event.clientX,
          y: event.clientY
        }
      }, this.origin);
    });
  }
}
</script>

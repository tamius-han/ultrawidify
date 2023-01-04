export default {
  created() {
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
  },
  methods: {
    /**
     * Handles 'uwui-probe' events. It checks whether there's a clickable element under
     * cursor, and sends a reply to the content scripts that indicates whether pointer-events
     * property of the iframe should be set to capture or ignore the clicks.
     */
    handleProbe(eventData, origin) {
      if (eventData.ts < this.lastProbeTs) {
        return; // i don't know if events can arrive out-of-order. Prolly not. We still check.
      }
      this.lastProbeTs = eventData.ts;

      // show ultrawidify trigger zone and set it to vanish after 250ms
      // but don't show the trigger zone behind an active popup
      if (! this.uwWindowVisible) {
        this.uwTriggerZoneVisible = true;
        clearTimeout(this.uwTriggerZoneTimeout);
        this.uwTriggerZoneTimeout = setTimeout(
          () => this.uwTriggerZoneVisible = false,
          250
        );
      }

      /* we check if our mouse is hovering over an element.
       *
       * gentleman's agreement: elements with uw-clickable inside the iframe will
       * toggle pointerEvents on the iframe from 'none' to 'auto'
       * Children of uw-clickable events should also do that.
       *
       * TODO: rename uw-clickable to something else, since we pretty much need that on
       * our top-level element.
       */
      let isClickable = false;
      let element = document.elementFromPoint(eventData.coords.x, eventData.coords.y);

      while (element) {
        if (element?.classList.contains('uw-clickable')) {
          // we could set 'pointerEvents' here and now & simply use return, but that
          // might cause us a problem if we ever try to add more shit to this function
          isClickable = true;
          break;
        }
        element = element.parentElement;
      }

      window.parent.postMessage(
        {
          action: 'uwui-clickable',
          clickable: isClickable,
          ts: +new Date()
        },
        origin
      );
    },
  }
}

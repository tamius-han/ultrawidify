export default {
  created() {
    /**
     * Setup the "companion" onMouseMove handler to the one in the content script.
     * We can handle events with the same function we use to handle events from
     * the content script.
     */
    document.addEventListener('mousemove', (event) => {
      this.handleProbe(
        {
          coords: {
            x: event.clientX,
            y: event.clientY
          },
          isCompanion: true,
        },
        this.origin
      );
    });
  },
  data() {
    return {
      playerDimensions: undefined,
      triggerZoneStyles: {
        height: '50dvh',
        width: '50dvw',
        transform: 'translateX(-50%)'
      },
      hoverStats: {
        isOverTriggerZone: false,
        isOverMenuTrigger: false,
        isOverUIArea: false,
        hasMouse: false,
      }
    }
  },
  methods: {
    playerDimensionsUpdate(dimensions) {
      if (!dimensions.width || !dimensions.height) {
        this.playerDimensions = undefined;
      }
      if (dimensions?.width !== this.playerDimensions?.width || dimensions?.height !== this.playerDimensions?.height) {
        this.playerDimensions = dimensions;
        this.updateTriggerZones();
      }
    },
    updateTriggerZones() {
      if (this.playerDimensions && this.settings) {
        this.triggerZoneStyles = {
          width: `${Math.round(this.playerDimensions.width * this.settings.active.ui.inPlayer.triggerZoneDimensions.width)}px`,
          height: `${Math.round(this.playerDimensions.height * this.settings.active.ui.inPlayer.triggerZoneDimensions.height)}px`,
          transform: `translate(${(this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetX)}%, ${this.settings.active.ui.inPlayer.triggerZoneDimensions.offsetY}%)`,
        };
      }
    },

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
      let isOverTriggerZone = false;
      let isOverUIArea = false;
      let isOverMenuTrigger = false;
      const elements = document.elementsFromPoint(eventData.coords.x, eventData.coords.y);

      if (!elements.length) {
        return;
      }

      for (const element of elements) {
        if (element.classList?.contains('uw-clickable')) {
          isClickable = true;
        }
        if (element.classList?.contains('uw-ui-trigger')) {
          isOverTriggerZone = true;
        }
        if (element.classList?.contains('uw-ui-area')) {
          isOverUIArea = true;
        }
        if (element.classList?.contains('uw-menu-trigger')) {
          isOverMenuTrigger = true;
        }
      }


      this.triggerZoneActive = isOverTriggerZone;

      // show ultrawidify trigger zone and set it to vanish after 250ms
      // but don't show the trigger zone behind an active popup
      if (
        eventData.canShowUI
        && (this.settings.active.ui.inPlayer.activation === 'player' ? isOverUIArea : isOverTriggerZone)
      ) {
        if (! this.uwWindowVisible) {
          this.uwTriggerZoneVisible = true;
          clearTimeout(this.uwTriggerZoneTimeout);
          this.uwTriggerZoneTimeout = setTimeout(
            () => {
              this.uwTriggerZoneVisible = false;
            },
            500
          );
        }
      } else {
        // this.uwTriggerZoneVisible = false;
      }

      const hasMouse = !!document.querySelector(':hover');

      this.hoverStats.isOverTriggerZone = isOverTriggerZone;
      this.hoverStats.isOverMenuTrigger = isOverMenuTrigger;
      this.hoverStats.isOverUIArea = isOverUIArea;
      this.hoverStats.hasMouse = hasMouse

      window.parent.postMessage(
        {
          action: 'uwui-clickable',
          clickable: isClickable,
          hoverStats: {
            isOverTriggerZone: isOverTriggerZone,
            isOverMenuTrigger: isOverMenuTrigger,
            isOverUIArea: isOverUIArea,
            hasMouse: hasMouse
          },
          ts: +new Date()
        },
        origin
      );
    },
  }
}

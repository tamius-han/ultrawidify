<template>
  <div class="alignment-box">
    <div class="row">
      <div
        class="col top left"
        @click="align(VideoAlignment.Left, VideoAlignment.Top)"
      >
        <div class="alignment-ui"></div>
      </div>
      <div
        class="col top center"
        @click="align(VideoAlignment.Center, VideoAlignment.Top)"
      >
        <div class="alignment-ui"></div>
      </div>
      <div
        class="col top right"
        @click="align(VideoAlignment.Right, VideoAlignment.Top)"
      >
        <div class="alignment-ui"></div>
      </div>
    </div>
    <div class="row">
      <div
        class="col ycenter left"
        @click="align(VideoAlignment.Left, VideoAlignment.Center)"
      >
        <div class="alignment-ui"></div>
      </div>
      <div
        class="col ycenter center"
        @click="align(VideoAlignment.Center, VideoAlignment.Center)"
      >
        <div class="alignment-ui"></div>
      </div>
      <div
        class="col ycenter right"
        @click="align(VideoAlignment.Right, VideoAlignment.Center)"
      >
        <div class="alignment-ui"></div>
      </div>
    </div>
    <div class="row">
      <div
        class="col bottom left"
        @click="align(VideoAlignment.Left, VideoAlignment.Bottom)"
      >
        <div class="alignment-ui"></div>
      </div>
      <div
        class="col bottom center"
        @click="align(VideoAlignment.Center, VideoAlignment.Bottom)"
      >
        <div class="alignment-ui"></div>
      </div>
      <div
        class="col bottom right"
        @click="align(VideoAlignment.Right, VideoAlignment.Bottom)"
      >
        <div class="alignment-ui"></div>
      </div>
    </div>
  </div>
</template>

<script>
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';


export default {
  props: [
    'eventBus'
  ],
  data() {
    return {
      VideoAlignment: VideoAlignmentType
    }
  },
  methods: {
    align(alignmentX, alignmentY) {
      console.warn('sending set alignment:', {x: alignmentX, y: alignmentY});
      this.eventBus.send('set-alignment', {x: alignmentX, y: alignmentY})
    }
  }
}
</script>

<style lang="scss" scoped module>
.uw-ultrawidify-container-root {
  .alignment-box {
    aspect-ratio: 1;
    width: 100%;
    min-width: 40px;
    max-width: 80px;

    display: flex;
    flex-direction: column;

    .row {
      flex: 0 0 33%;

      display: flex;
      flex-direction: row;
    }

    .col {
      flex: 0 0 33%;

      display: flex;

      .alignment-ui {
        width: 50%;
        height: 50%;
      }

      align-items: center;
      justify-content: center;

      &.top  {
        align-items: flex-start;

        .alignment-ui {
          border-top: 3px solid #fff;
        }
      }
      &.bottom  {
        align-items: flex-end;

        .alignment-ui {
          border-bottom: 3px solid #fff;
        }
      }
      &.left {
        justify-content: flex-start;

        .alignment-ui {
          border-left: 3px solid #fff;
        }
      }
      &.right {
        justify-content: flex-end;

        .alignment-ui {
          border-right: 3px solid #fff;
        }
      }

      &.center.ycenter {

        .alignment-ui {
          width: 25%;
          height: 25%;
          background-color: #fff;
        }
      }
    }
  }
}
</style>

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
import VideoAlignmentType from '../../../common/enums/VideoAlignmentType.enum';


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
      this.eventBus?.sendToTunnel('set-alignment', {x: alignmentX, y: alignmentY})
    }
  }
}
</script>

<style lang="scss" scoped module>
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
    align-items: center;
    justify-content: center;

    background-color: rgba(0,0,0,0.25);
    cursor: pointer;

    margin: 0.125rem;
    padding: 0.5rem;
    width: 1.5rem;
    height: 1.5rem;

    border-bottom: 1px solid transparent;

    .alignment-ui {

      width: 50%;
      height: 50%;

      border-style: solid;
      border-width: 0px;
      border-color: #fff;
    }

    &:hover {
      background-color: rgba(0,0,0,0.5);
      border-bottom: 1px solid #fa6;

      .alignment-ui {
        border-color: #fa6 !important;
      }

      &.center.ycenter {
        .alignment-ui {
          background-color: #fa6;
        }
      }
    }

    &.top  {
      align-items: flex-start;

      .alignment-ui {
        border-top-width: 3px;
      }
    }
    &.bottom  {
      align-items: flex-end;

      .alignment-ui {
        border-bottom-width: 3px;
      }
    }
    &.left {
      justify-content: flex-start;

      .alignment-ui {
        border-left-width: 3px;
      }
    }
    &.right {
      justify-content: flex-end;

      .alignment-ui {
        border-right-width: 3px;
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
</style>

<template>
  <div class="alignment-box" :class="{large: large}">
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
</template>

<script>
import VideoAlignmentType from '../../../common/enums/VideoAlignmentType.enum';

export default {
  props: [
    'eventBus',
    'large',
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

  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;

  &.large {
    max-width: 15rem;

    .col {
      width: 4rem;
      height: 4rem;
    }
  }

  .col {
    display: flex;
    align-items: center;
    justify-content: center;

    background-color: rgba(0,0,0,0.25);
    cursor: pointer;

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

import {VideoPlaybackState} from '../enums/video-playback-state.enum';

export interface AardStatus {
  aardActive: boolean,
  aardReducedPolling: boolean,
  checkInProgress: boolean,
  lastVideoStatus: VideoPlaybackState,
  autoDisabled: boolean,
}

export function initAardStatus(): AardStatus {
  return {
    aardActive: false,
    aardReducedPolling: true,
    checkInProgress: false,
    lastVideoStatus: VideoPlaybackState.NotInitialized,
    autoDisabled: false,
  }
}

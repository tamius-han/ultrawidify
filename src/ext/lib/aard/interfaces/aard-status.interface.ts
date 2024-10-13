export interface AardStatus {
  aardActive: boolean,
  checkInProgress: boolean,
  lastVideoStatus: VideoPlaybackState,

}

export function initAardStatus(): AardStatus {
  return {
    aardActive: false,
    checkInProgress: false,
    lastVideoStatus: VideoPlaybackState.NotInitialized,
  }
}

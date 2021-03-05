/**
 * Checks whether video we're trying to play is protected by DRM. 
 * @param {*} video video we're trying to check
 */
export function hasDrm(video) {
  // if video is not playing, we cannot know whether autodetection will work or not
  if (!video || !(video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2)) {
    return undefined;
  }

  return video.mediaKeys instanceof MediaKeys;
}
import BrowserDetect from '../../conf/BrowserDetect';

/**
 * Checks whether video we're trying to play is protected by DRM. 
 * @param {*} video video we're trying to check
 */
export function hasDrm(video) {
  /**
   * DRM DETECTION 101:
   *
   * When trying to get an image frame of a DRM-protected video in
   * firefox, the method canvas.drawImage(video) will throw an exception.
   * 
   * This doesn't happen in Chrome. As opposed to Firefox, chrome will
   * simply draw a transparent black image and not tell anyone that
   * anything is amiss. However, since the image is (according to my testing
   * on netflix) completely transparent, this means we can determine whether
   * the video is DRM-protected by looking at the alpha byte of the image.
   * 
   * (Videos don't tend to have an alpha channel, so they're always
   * completely opaque (i.e. have value of 255))
   */

  // setup canvas
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext();

  if (BrowserDetect.firefox) {
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return false;
    } catch (e) {
      console.error('Exception occured while trying to draw image. Error:', e);
      return true;
    }
  } else if (BrowserDetect.anyChromium) {
    // oh btw, there's one exception to the alpha rule.
    // There is this brief period between the point
    // when metadata (video dimensions) have loaded and the moment the video starts
    // playing where ctx.drawImage() will draw a transparent black square regardless
    // of whether the video is actually DRM-protected or not.

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return this.blackframeContext.getImageData(0,0,1,1).data[3] === 0;
  }
}
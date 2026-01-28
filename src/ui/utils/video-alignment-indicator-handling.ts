import VideoAlignmentType from '@src/common/enums/VideoAlignmentType.enum';

const positionMap: Record<VideoAlignmentType, string> = {
  [VideoAlignmentType.Left]: 'left',
  [VideoAlignmentType.Center]: 'center',
  [VideoAlignmentType.Right]: 'right',
  [VideoAlignmentType.Top]: 'top',
  [VideoAlignmentType.Bottom]: 'bottom',
  [VideoAlignmentType.Default]: ''
};

const location2enum: Record<string, VideoAlignmentType> = {
  left: VideoAlignmentType.Left,
  center: VideoAlignmentType.Center,
  right: VideoAlignmentType.Right,
  top: VideoAlignmentType.Top,
  bottom: VideoAlignmentType.Bottom
};


/**
 * Sets alignment indicator state of the video alignment SVG
 * @param svg SVG element
 * @param x horizontal alignment
 * @param y vertical alignment
 * @returns
 */
export function setVideoAlignmentIndicatorState(
  svg: SVGSVGElement,
  x: VideoAlignmentType,
  y: VideoAlignmentType
) {
  // reset all indicators
  svg?.querySelectorAll<SVGGElement>('g').forEach(g => g.classList.remove('uw-active'));

  // select the appropriate square
  if (x === VideoAlignmentType.Default || y === VideoAlignmentType.Default) {
    return;
  }

  const gId = `${positionMap[y]}-${positionMap[x]}`;
  const selected = svg?.getElementById(gId);
  if (selected) {
    selected.classList.add('uw-active');
  }
}

/**
 * Sets up interaction for the video alignment SVG
 * @param svg SVG element
 * @param callback function to be called, with x and y alignment (VideoAlignmentType)
 */
export function setupVideoAlignmentIndicatorInteraction(
  svg: SVGSVGElement,
  callback: (x: VideoAlignmentType, y: VideoAlignmentType) => void
) {
  svg?.querySelectorAll<SVGGElement>('g').forEach(g => {
    g.addEventListener('click', () => {
      const [y, x] = g.id.split('-');

      if (!x || !y)
        return;

      callback(
        location2enum[x],
        location2enum[y]
      )
    });
  });
}

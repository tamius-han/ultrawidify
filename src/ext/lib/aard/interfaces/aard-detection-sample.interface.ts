/**
 * Used to store coordinates of sample columns/rows and the
 * first x/y position where non-black pixels were detected.
 *
 * Arrays are laid out like so:
 *
 *    We check each row at these positions (columns)
 *     V         V        V
 *    _________ _________ _________ _____
 *   | x₀ | y₀ | x₁ | y₁ | x₂ | y₂ | ..
 *   '''''''''' ''''''''' ''''''''' '''''
 *          A         A         A
 *   If checked pixel is non-black, we put current row into
 *   this element of the array.
 *
 */
export interface AardDetectionSample {
  top?: Int16Array;
  bottom?: Int16Array;
  left?: Int16Array;
  right?: Int16Array;
}

export function generateSampleArray(samples: number, width: number, topBottom: boolean = true) {
  const sampleStore = new Int16Array(samples * 2);

  /**
   * We want to reverse-fencepost here.
   *
   * Normally, our sample positions would look like this:
   *
   *
   * 0    1    2    3
   * |                   :
   * |————|————|————|————:
   * | <——  20 units ——> :
   * 0                   19
   *
   * But we'd rather our samples are center-justified.
   * We can solve this issue by dividing the width into
   * (samples + 1) slices, and ignoring the first (0)
   * position:
   *
   *     0   1   2   3
   * :
   * :———|———|———|———|———:
   * :                   :
   * 0                   19
   *
   */
  const sampleInterval = ~~(width / ( samples + 1 ));

  let i = 0, col = 1;
  while (i < sampleStore.length) {
    sampleStore[i] = sampleInterval * col * (+topBottom * 4);
    i++;
    // initialize to -1 (invalid result)
    sampleStore[i] = -1;
    i++;
    col++;
  }

  return sampleStore;
}

export function resetSamples(samples: AardDetectionSample) {
  samples.top && resetArray(samples.top);
  samples.bottom && resetArray(samples.bottom);
  samples.left && resetArray(samples.left);
  samples.right && resetArray(samples.right);
}

function resetArray(x: Int16Array) {
  for (let i = 1; i < x.length; i+= 2) {
    x[i] = -1;
  }
}

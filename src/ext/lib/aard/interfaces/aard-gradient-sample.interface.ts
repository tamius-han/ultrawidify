export interface AardGradientSamples {
  top: Array<Uint8Array>,
  bottom: Array<Uint8Array>,
  left?: Array<Uint8Array>,
  right?: Array<Uint8Array>,
}

export interface AardGradientSampleOptions {
  aspectRatioSamples: number;
  gradientSamples: number,
}

function generateArray(samplingOptions: AardGradientSampleOptions) {
  const arr = new Array<Uint8Array>(samplingOptions.aspectRatioSamples)
  for (let i = 0; i < samplingOptions.aspectRatioSamples; i++) {
    arr[i] = new Uint8Array(samplingOptions.gradientSamples);
  }
  return arr;
}

export function initAardGradientSamples(letterboxSamplingOptions: AardGradientSampleOptions): AardGradientSamples {
  return {
    top: generateArray(letterboxSamplingOptions),
    bottom: generateArray(letterboxSamplingOptions),
  };
}

export function resetGradientSamples(samples: AardGradientSamples) {
  for (let i = 0; i < samples.top.length; i++) {
    for (let j = 0; j < samples.top[i].length; j++) {
      samples.top[i][j] = 0;
    }
  }
  for (let i = 0; i < samples.bottom.length; i++) {
    for (let j = 0; j < samples.bottom[i].length; j++) {
      samples.top[i][j] = 0;
    }
  }
  if (samples.left) {
    for (let i = 0; i < samples.left.length, i++) {
      for (let j = 0; j < samples.left[i].length; j++) {
        samples.left[i][j] = 0;
      }
    }
  }
  if (samples.right) {
    for (let i = 0; i < samples.right.length; i++) {
      for (let j = 0; j < samples.right[i].length; j++) {
        samples.right[i][j] = 0;
      }
    }
  }
}


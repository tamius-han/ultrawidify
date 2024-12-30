export interface AardTimers {
  nextFrameCheckTime: number;
  reducedPollingNextCheckTime: number;
}

export function initAardTimers(): AardTimers {
  return {
    nextFrameCheckTime: 0,
    reducedPollingNextCheckTime: 0,
  };
}

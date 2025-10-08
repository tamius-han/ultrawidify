export interface AardTimers {
  autoDisableAt: number | undefined;
  nextFrameCheckTime: number;
  reducedPollingNextCheckTime: number;
}

export function initAardTimers(): AardTimers {
  return {
    nextFrameCheckTime: 0,
    reducedPollingNextCheckTime: 0,
    autoDisableAt: undefined,
  };
}

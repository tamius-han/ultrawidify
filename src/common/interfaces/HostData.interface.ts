import { ExtensionEnvironment } from '@src/common/interfaces/SettingsInterface';

export interface HostInfo {
  host: string,
  hasVideo: boolean,
  minEnvironment: ExtensionEnvironment,
  maxEnvironment: ExtensionEnvironment
};

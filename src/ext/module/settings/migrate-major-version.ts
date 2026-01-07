import SettingsInterface from '../../../common/interfaces/SettingsInterface';

/**
 * Upgrading from v5 to v6 introduced major changes in the settings structure. As such, upgrading from v5 to v6
 * start with default settings for v6, and then manually migrate some of the more important settings from v5.
 * @param currentSettings
 * @param defaultSettings
 * @returns
 */
export function migrate5to6(currentSettings: SettingsInterface & any, defaultSettings: SettingsInterface): SettingsInterface {
  // if settings do not have a version, return default settings.
  // This is okay, because currentSettings.version should be undefined only if settings are either very ancient
  // or settings were never modified at all.
  if (!currentSettings.version) {
    return defaultSettings;
  }

  // do not perform migration if the version is already 6 or higher
  const [majorVersion] = currentSettings.version.split('.');
  if (+majorVersion >= 6) {
    return currentSettings;
  }

  const newSettings = JSON.parse(JSON.stringify(defaultSettings));

  // TODO: migrate the following:
  //      * when migrating from v5, default extension mode should be enabled for all sites
  //        unless it was changed by the user
  //      * keyboard shortcuts should be migrated
  //      * attempt to migrate custom site settings for users's custom sites

  return newSettings;
}

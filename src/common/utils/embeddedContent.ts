import EmbeddedContentSettingsOverridePolicy from '@src/common/enums/EmbeddedContentSettingsOverridePolicy.enum';
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';
import Settings from '@src/ext/module/settings/Settings';
import { SiteSettings } from '@src/ext/module/settings/SiteSettings';

/**
 * Whether an effective `enable` value means the extension can run at all.
 * (Disabled = -1 and Default = 0 both mean "not enabled".)
 */
export function isExtensionEnabled(mode: unknown): boolean {
  return typeof mode === 'number' && mode >= ExtensionMode.FullScreen;
}

/**
 * Lists embedded hosts that Ultrawidify is effectively active for, in a situation where it is disabled
 * for the parent site and the parent does not force its own settings onto embedded content.
 * Only embedded hosts that actually contain a video are considered.
 *
 * Returns an empty array if the extension is enabled for the parent site, if the parent has
 * applyToEmbeddedContent set to Always, or if no embedded host qualifies.
 */
export function getEmbeddedOnlyHosts(
  settings: Settings | undefined,
  siteSettings: SiteSettings | undefined,
  site: {host?: string, populatedHostnames?: {host: string, hasVideo: boolean}[]} | undefined
): string[] {
  if (!site?.host || !settings || !siteSettings) {
    return [];
  }
  if (isExtensionEnabled(siteSettings.data.enable)) {
    return [];
  }
  if (siteSettings.data.applyToEmbeddedContent === EmbeddedContentSettingsOverridePolicy.Always) {
    return [];
  }

  const hosts: string[] = [];
  const embeddedWithVideo = (site.populatedHostnames ?? []).filter(x => x.hasVideo && x.host !== site.host);

  for (const embedded of embeddedWithVideo) {
    let embeddedSettings: SiteSettings | undefined;
    try {
      embeddedSettings = settings.getSiteSettings({
        site: embedded.host,
        isIframe: true,
        parentHostname: site.host,
      });
      if (isExtensionEnabled(embeddedSettings.data.enable)) {
        hosts.push(embedded.host);
      }
    } catch (e) {
      console.warn('Failed to get effective settings for embedded host', embedded.host, e);
    } finally {
      embeddedSettings?.destroy();
    }
  }

  return hosts;
}

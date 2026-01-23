<script lang="ts">
import { SiteSettings } from '@src/ext/module/settings/SiteSettings'
export default {
  data() {
    return {
      warnings: {
        drm: false,
        cors: false,
        settingsUpdated: false,
        extensionDisabled: {
          allDisabled: false,         // there's no way extension can run on this page
          iframesAllowed: false,      // page is blacklisted, but embedded content isn't
          iframesBlacklisted: false,  // page is enabled, but contains embedded content from blacklisted domains
        }
      }
    }
  },
  methods: {
    generateExtensionDisabledWarnings(site: {host: string, hostnames: string[]}) {
      const siteSettings = new SiteSettings(this.settings, {site: site.host});

    }
  }
}
</script>

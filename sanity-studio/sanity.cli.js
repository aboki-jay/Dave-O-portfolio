import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'j5ifj8rh',
    dataset: 'production',
  },
  deployment: {
    // The editor's address is https://davidokunlola.sanity.studio. This ID tells Sanity which editor to update.
    appId: 'uyloswg0rm6z12kbcm7l1y89',
    // Keeps the hosted editor on the latest Sanity version without redeploying.
    autoUpdates: true,
  },
})

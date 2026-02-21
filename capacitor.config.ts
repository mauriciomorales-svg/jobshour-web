import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cl.dondemorales.jobshour',
  appName: 'JobsHour',
  webDir: 'out',
  server: {},
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config

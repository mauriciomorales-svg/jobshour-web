import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'cl.dondemorales.jobshour',
  appName: 'JobsHour',
  webDir: 'public',
  server: {
    url: 'https://jobshours.com',
    cleartext: false,
  },
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

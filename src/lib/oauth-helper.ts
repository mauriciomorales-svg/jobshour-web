import { registerPlugin } from '@capacitor/core';

export interface OAuthHelperPlugin {
  openExternalBrowser(options: { url: string }): Promise<{ success: boolean }>;
}

const OAuthHelper = registerPlugin<OAuthHelperPlugin>('OAuthHelper');

export default OAuthHelper;

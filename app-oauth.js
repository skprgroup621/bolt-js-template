import { App, FileInstallationStore, LogLevel } from '@slack/bolt';
import { config } from 'dotenv';
import { registerListeners } from './listeners/index.js';

config();

const app = new App({
  logLevel: LogLevel.DEBUG,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  scopes: ['channels:history', 'chat:write', 'commands'],
  // FileInstallationStore is intended for development purposes only
  // Learn more: https://docs.slack.dev/tools/bolt-js/concepts/authenticating-oauth#installation-store
  installationStore: new FileInstallationStore(),
  installerOptions: {
    // If true, /slack/install redirects installers to the Slack Authorize URL
    // without rendering the web page with "Add to Slack" button
    directInstall: false,
  },
  clientOptions: {
    slackApiUrl: process.env.SLACK_API_URL,
  },
});

/** Register Listeners */
registerListeners(app);

/** Start Bolt App */
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    app.logger.info('⚡️ Bolt app is running! ⚡️');
  } catch (error) {
    app.logger.error('Unable to start App', error);
  }
})();

import { ClearStateStore } from '@slack/bolt';

// Replace hardcoded stateSecret in App options with process.env.SLACK_STATE_SECRET
// and configure robust installer options:
app.installerOptions = {
  ...app.installerOptions,
  stateStore: new ClearStateStore({
    secret: process.env.SLACK_STATE_SECRET,
  }),
  userScopes: ['identity:basic'], // Explicitly scope user tokens if needed
  legacyStateStore: false,
  callbackOptions: {
    success: (installation, installOptions, req, res) => {
      app.logger.info(`Successfully installed to workspace: ${installation.team?.name || installation.team?.id}`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Installation Successful!</h1><p>You can now close this tab and return to Slack.</p>');
    },
    failure: (error, installOptions, req, res) => {
      app.logger.error('OAuth installation failed:', error);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Installation Failed</h1><p>Something went wrong during authorization. Please try again.</p>');
    },
  },
};

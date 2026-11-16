import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ARBRIDGE — Browser to Telegram',
    description: 'Send public document links to your ARBRIDGE workspace.',
    version: '0.1.0',
    permissions: ['contextMenus', 'sidePanel', 'storage', 'notifications', 'activeTab'],
    host_permissions: ['http://127.0.0.1:8787/*'],
    side_panel: { default_path: 'sidepanel.html' }
  }
});

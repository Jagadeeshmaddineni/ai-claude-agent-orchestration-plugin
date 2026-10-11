# WEBHOOK Trigger Template

Use this template when trigger strategy is WEBHOOK:

```typescript
import { createTrigger, TriggerStrategy } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';
import { [service]Auth } from '../../';

const TRIGGER_KEY = '[service]-[trigger-name]-webhook-id';

export const [triggerName]Trigger = createTrigger({
  auth: [service]Auth,
  name: '[trigger_name]',
  displayName: '[Trigger Display Name]',
  description: '[Description]',
  type: TriggerStrategy.WEBHOOK,
  props: {
    // Add trigger-specific props here
  },
  sampleData: {},
  async onEnable(context) {
    // Register webhook with service
    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `[API_BASE_URL]/webhooks`,
      headers: {
        Authorization: `Bearer ${context.auth.access_token}`,
      },
      body: {
        url: context.webhookUrl,
        events: ['[event.type]'], // e.g., ['order.created']
      },
    });

    // Store webhook ID for cleanup
    await context.store.put(TRIGGER_KEY, response.body.id);
  },
  async onDisable(context) {
    // Unregister webhook when trigger disabled
    const webhookId = await context.store.get(TRIGGER_KEY);
    if (webhookId) {
      await httpClient.sendRequest({
        method: HttpMethod.DELETE,
        url: `[API_BASE_URL]/webhooks/${webhookId}`,
        headers: {
          Authorization: `Bearer ${context.auth.access_token}`,
        },
      });
      await context.store.delete(TRIGGER_KEY);
    }
  },
  async run(context) {
    // Return webhook payload
    return [context.payload.body];
  },
  async test(context) {
    // Fetch sample data for testing
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `[API_BASE_URL]/[resources]`,
      headers: {
        Authorization: `Bearer ${context.auth.access_token}`,
      },
      queryParams: { limit: '1' },
    });
    return response.body.data || [];
  },
});
```

## Placeholders to Customize

**For naming conventions, see `policies/code-style.md` (Sections 2-3)**

- `[service]`: Service name in PascalCase (e.g., `slack`, `github`)
- `[triggerName]`: Trigger name in camelCase (e.g., `newMessage`)
- `[trigger_name]`: Trigger name in kebab-case (e.g., `new-message`)
- `[Trigger Display Name]`: Human-readable trigger name (e.g., "New Message")
- `[Description]`: Brief description of what triggers this
- `[API_BASE_URL]`: Base URL constant (use from constants.ts)
- `[event.type]`: Webhook event type from API docs (e.g., `message.created`)
- `[resources]`: API endpoint for fetching test data (e.g., `messages`)

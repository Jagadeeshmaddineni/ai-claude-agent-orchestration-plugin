# POLLING Trigger Template

Use this template when trigger strategy is POLLING:

```typescript
import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@activepieces/pieces-framework';
import {
  DedupeStrategy,
  Polling,
  pollingHelper,
} from '@activepieces/pieces-common';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import dayjs from 'dayjs';
import { [service]Auth } from '../..';

const polling: Polling<[AuthType], { limit: number }> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, propsValue: { limit } }) => {
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: '[API_BASE_URL]/[resources]',
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
      },
      queryParams: {
        limit: limit.toString(),
        sort: 'created_at:desc', // or appropriate sort
      },
    });

    if (!response.body.data) return [];

    return response.body.data.map((item: any) => ({
      epochMilliSeconds: dayjs(item.created_at).valueOf(),
      data: item,
    }));
  },
};

export const [triggerName]Trigger = createTrigger({
  auth: [service]Auth,
  name: '[trigger_name]',
  displayName: '[Trigger Display Name]',
  description: '[Description]',
  type: TriggerStrategy.POLLING,
  props: {
    limit: Property.Number({
      displayName: 'Limit',
      description: 'Number of items to fetch',
      required: false,
      defaultValue: 50,
    }),
  },
  sampleData: {},
  onEnable: async (context) => {
    await pollingHelper.onEnable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  onDisable: async (context) => {
    await pollingHelper.onDisable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  run: async (context) => {
    return await pollingHelper.poll(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
      files: context.files,
    });
  },
  test: async (context) => {
    return await pollingHelper.test(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
      files: context.files,
    });
  },
});
```

## Placeholders to Customize

**For naming conventions, see `policies/code-style.md` (Sections 2-3)**

- `[service]`: Service name in PascalCase (e.g., `slack`, `github`)
- `[AuthType]`: Authentication type interface (e.g., `OAuth2PropertyValue`, `SecretTextProperty<true>`)
- `[triggerName]`: Trigger name in camelCase (e.g., `newMessage`)
- `[trigger_name]`: Trigger name in kebab-case (e.g., `new-message`)
- `[Trigger Display Name]`: Human-readable trigger name (e.g., "New Message")
- `[Description]`: Brief description of what triggers this
- `[API_BASE_URL]`: Base URL constant (use from constants.ts)
- `[resources]`: API endpoint for polling (e.g., `messages`)

## Notes

- Adjust the `created_at` field name based on API response structure
- Modify sort parameter based on API capabilities
- Update response parsing (`response.body.data`) based on actual API response format

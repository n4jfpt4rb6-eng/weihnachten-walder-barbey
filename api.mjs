import { getStore } from '@netlify/blobs';
import { createHandler } from '../lib/handler.mjs';

// "strong": gelöschte Wünsche verschwinden sofort bei allen und nicht erst nach einer Minute.
const handler = createHandler({
  wishesStore: getStore({ name: 'wishes', consistency: 'strong' }),
  limitsStore: getStore({ name: 'limits' }),
  getAdminPassword: () => process.env.ADMIN_PASSWORD || ''
});

export default handler;

export const config = {
  path: ['/api/wishes', '/api/wishes/*', '/api/admin']
};

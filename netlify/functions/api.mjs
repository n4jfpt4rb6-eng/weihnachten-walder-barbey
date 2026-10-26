import { getStore } from '@netlify/blobs';
import { createHandler } from '../lib/handler.mjs';

// Die Speicher werden bei jeder Anfrage neu geholt. Sonst läuft das Zugangs-Token
// einer schon gestarteten Funktion irgendwann ab ("Token expired").
// "strong": gelöschte Wünsche verschwinden sofort bei allen und nicht erst nach einer Minute.
export default async function (req, context) {
  const handler = createHandler({
    wishesStore: getStore({ name: 'wishes', consistency: 'strong' }),
    limitsStore: getStore({ name: 'limits' })
  });
  return handler(req, context);
}

export const config = {
  path: ['/api/wishes', '/api/wishes/*', '/api/admin']
};

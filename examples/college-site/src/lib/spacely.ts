import { createClient } from '@spacelycms/astro';

export const spacely = createClient({
  apiUrl: 'http://localhost:4321/api/content',
});

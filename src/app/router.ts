import { findTool } from './tool-registry';

export type RouteHandler = (hash: string, unknown: boolean) => void;

export function startRouter(handler: RouteHandler): () => void {
  const navigate = () => {
    const hash = location.hash || '#/';
    const known = hash === '#/' || Boolean(findTool(hash));
    if (!known) {
      history.replaceState(null, '', '#/');
      handler('#/', true);
      return;
    }
    handler(hash, false);
  };
  addEventListener('hashchange', navigate);
  navigate();
  return () => removeEventListener('hashchange', navigate);
}

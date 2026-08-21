import { plugins } from './plugins';
import type { PageResult } from './tool-plugin';

export function renderToolPage(route: string): PageResult {
  return plugins.find((plugin) => plugin.definition.route === route)?.render() ?? { element: document.createElement('div') };
}

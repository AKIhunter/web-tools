export type ToolDefinition = {
  route: string;
  category: string;
  title: string;
  description: string;
  keywords: string[];
  aliases?: string[];
  icon?: string;
  tags?: string[];
  privacyLevel?: 'local-only' | 'local-file' | 'crypto-sensitive';
  featured?: boolean;
  experimental?: boolean;
};

export type PageResult = {
  element: HTMLElement;
  cleanup?: () => void;
};

export type ToolPlugin = {
  definition: ToolDefinition;
  render: () => PageResult;
};

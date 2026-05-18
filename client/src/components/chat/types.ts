export interface Bot {
  id: string;
  label: string;
  role: string;
  avatar: string;
  status: 'ok' | 'busy' | 'idle';
  desc: string;
  model: string;
}

export interface ThreadDivider {
  kind: 'divider';
  label: string;
}

export interface ToolCall {
  name: string;
  status: string;
  lines: Array<{ k?: string; v: string }>;
}

export interface Suggestion {
  t: string;
}

export interface ThreadMessage {
  kind: 'msg';
  who: string;
  name?: string;
  when: string;
  body: Array<{ p: string }>;
  tool?: ToolCall;
  suggestions?: Suggestion[];
}

export type ThreadItem = ThreadDivider | ThreadMessage;

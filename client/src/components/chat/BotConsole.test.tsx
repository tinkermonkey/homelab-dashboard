import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BotConsole } from './BotConsole.js';
import type { ThreadSummary, ThreadDetail, ThreadItem } from '@homelab/shared';

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, ''),
  },
}));

vi.mock('../../hooks/useAPI', () => ({
  useThreads: vi.fn(),
  useThread: vi.fn(),
}));

vi.mock('../../hooks/useChatStream', () => ({
  useChatStream: vi.fn(),
}));

// Back the persisted-state hook with a real useState so the active-thread
// selection behaves like the component expects (value + setter).
vi.mock('../../utils/localStorage', async () => {
  const React = await import('react');
  return {
    usePersistedState: <T,>(_key: string, defaultValue: T) =>
      React.useState<T>(defaultValue),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@tinkermonkey/heimdall-ui', async () => {
  const React = await import('react');

  const Icon = ({ name }: { name: string }) =>
    React.createElement('svg', { 'data-icon': name });

  const ChatContainer = ({
    children,
    bots = [],
    activeBotId,
    onBotChange,
    composer,
  }: {
    children: React.ReactNode;
    bots?: Array<{ id: string; label: string; role: string; status: string }>;
    activeBotId?: string;
    onBotChange?: (id: string) => void;
    composer?: React.ReactNode;
  }) =>
    React.createElement(
      'div',
      { className: 'chat-container' },
      React.createElement(
        'div',
        { className: 'chat-container__bot-tabs' },
        bots.map((b) =>
          React.createElement(
            'button',
            {
              key: b.id,
              className: `chat-container__bot-tab${b.id === activeBotId ? ' chat-container__bot-tab--active' : ''}`,
              onClick: () => onBotChange?.(b.id),
            },
            b.label
          )
        )
      ),
      React.createElement('div', { className: 'chat-container__thread' }, children),
      composer
    );

  const ChatMessage = ({
    role,
    senderName,
    timestamp,
    body,
    badge,
    thinkingBlock,
  }: {
    role: 'user' | 'bot';
    senderName: string;
    timestamp: string;
    body: React.ReactNode;
    avatar?: string;
    badge?: string;
    thinkingBlock?: { content: string };
  }) =>
    React.createElement(
      'div',
      { className: `chat-message chat-message--${role}` },
      React.createElement(
        'div',
        { className: 'chat-message__content' },
        React.createElement(
          'div',
          { className: 'chat-message__meta' },
          React.createElement('span', { className: 'chat-message__sender' }, senderName),
          badge && React.createElement('span', { className: 'chat-message__badge' }, badge),
          React.createElement('span', { className: 'chat-message__timestamp' }, timestamp)
        ),
        React.createElement('div', { className: 'chat-message__body' }, body),
        thinkingBlock &&
          React.createElement('div', { className: 'thinking-block' }, thinkingBlock.content)
      )
    );

  const ChatComposer = ({
    value,
    onChange,
    onSubmit,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string) => void;
    scopeLabel?: string;
    placeholder?: string;
  }) =>
    React.createElement(
      'div',
      { className: 'chat-composer' },
      React.createElement('textarea', {
        className: 'chat-composer__input',
        value,
        placeholder,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
      }),
      React.createElement(
        'button',
        {
          className: 'btn btn--primary',
          disabled: !value.trim(),
          onClick: () => onSubmit(value),
          'aria-label': 'Send message',
        },
        'send'
      )
    );

  const ChatDivider = ({ label }: { label: string }) =>
    React.createElement('div', { className: 'chat-divider' }, label);

  return { Icon, ChatContainer, ChatMessage, ChatComposer, ChatDivider };
});

import { useThreads, useThread } from '../../hooks/useAPI.js';
import { useChatStream } from '../../hooks/useChatStream.js';

// Minimal helpers to build the mocked query results the component reads.
function mockThreads(threads: ThreadSummary[]) {
  vi.mocked(useThreads).mockReturnValue({
    data: { threads },
  } as ReturnType<typeof useThreads>);
}

function mockThreadDetail(detail: ThreadDetail | undefined) {
  vi.mocked(useThread).mockReturnValue({
    data: detail,
  } as ReturnType<typeof useThread>);
}

function mockStream(overrides: Partial<ReturnType<typeof useChatStream>> = {}) {
  // The real hook merges `baseThread` (the persisted history) with any streamed
  // messages, so the mock echoes the `baseThread` it is handed unless a test
  // overrides `thread` explicitly.
  vi.mocked(useChatStream).mockImplementation(({ baseThread }) => ({
    thread: baseThread,
    send: vi.fn().mockResolvedValue(undefined),
    draft: '',
    setDraft: vi.fn(),
    ...overrides,
  }));
}

const sampleThreads: ThreadSummary[] = [
  {
    id: 't1',
    title: 'Deploy review',
    state: 'idle',
    agent: 'control plane',
    message_count: 2,
  },
  {
    id: 't2',
    title: 'Disk cleanup',
    state: 'running',
    agent: 'nyx',
    message_count: 0,
  },
];

describe('BotConsole component (thread-centric)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThreads(sampleThreads);
    mockThreadDetail(undefined);
    mockStream();
  });

  it('renders a tab per thread using the thread title as label', () => {
    const { container } = render(<BotConsole />);

    const tabs = container.querySelectorAll('.chat-container__bot-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Deploy review');
    expect(tabs[1].textContent).toContain('Disk cleanup');
  });

  it('defaults active thread to the first and renders its history (user vs bot)', () => {
    mockThreadDetail({
      ...sampleThreads[0],
      messages: [
        { role: 'user', content: 'How is the cluster?' },
        { role: 'assistant', content: 'All hosts are healthy.' },
      ],
    });

    const { container } = render(<BotConsole />);

    // First tab is active by default.
    const tabs = container.querySelectorAll('.chat-container__bot-tab');
    expect(tabs[0].classList.contains('chat-container__bot-tab--active')).toBe(true);

    const userMsgs = container.querySelectorAll('.chat-message--user');
    const botMsgs = container.querySelectorAll('.chat-message--bot');
    expect(userMsgs.length).toBe(1);
    expect(botMsgs.length).toBe(1);
    expect(userMsgs[0].querySelector('.chat-message__body')?.textContent).toContain(
      'How is the cluster?'
    );
    expect(botMsgs[0].querySelector('.chat-message__body')?.textContent).toContain(
      'All hosts are healthy.'
    );
  });

  it('renders streamed messages from the chat stream', () => {
    const streamed: ThreadItem[] = [
      {
        kind: 'msg',
        who: 'user',
        name: 'you',
        when: '14:29',
        body: [{ p: 'restart vega' }],
      },
      {
        kind: 'msg',
        who: 't1',
        when: '14:30',
        body: [{ p: 'Restarting vega now.' }],
      },
    ];
    mockStream({ thread: streamed });

    const { container } = render(<BotConsole />);

    const bodies = Array.from(container.querySelectorAll('.chat-message__body')).map(
      (el) => el.textContent
    );
    expect(bodies.some((t) => t?.includes('restart vega'))).toBe(true);
    expect(bodies.some((t) => t?.includes('Restarting vega now.'))).toBe(true);
  });

  it('submitting the composer calls send with the typed text', async () => {
    const sendMock = vi.fn().mockResolvedValue(undefined);
    mockStream({ draft: 'tail the logs', send: sendMock });

    const { container } = render(<BotConsole />);

    const sendBtn = container.querySelector('[aria-label="Send message"]') as HTMLButtonElement;
    await userEvent.click(sendBtn);

    expect(sendMock).toHaveBeenCalledWith('tail the logs');
  });

  it('shows the empty state and does not crash when there are no threads', () => {
    mockThreads([]);

    const { container, getByText } = render(<BotConsole />);

    expect(container.querySelectorAll('.chat-container__bot-tab').length).toBe(0);
    expect(getByText(/No conversations yet/i)).not.toBeNull();
    expect(container.querySelector('.lab-chat')).not.toBeNull();
  });

  it('clicking the + header button POSTs to /api/threads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 't3' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<BotConsole />);

    const newBtn = container.querySelector('[title="New conversation"]') as HTMLButtonElement;
    await userEvent.click(newBtn);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/threads',
      expect.objectContaining({ method: 'POST' })
    );

    vi.unstubAllGlobals();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<BotConsole onClose={onClose} />);

    const closeBtn = container.querySelector(
      '[aria-label="Close bot console"]'
    ) as HTMLButtonElement;
    await userEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});

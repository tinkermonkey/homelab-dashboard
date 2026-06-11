import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BotConsole } from './BotConsole.js';
import type { Bot, ThreadMessage, ThreadDivider } from '@homelab/shared';

vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, ''),
  },
}));

vi.mock('../../hooks/useChatStream', () => ({
  useChatStream: vi.fn(),
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
    toolBlock,
    thinkingBlock,
  }: {
    role: 'user' | 'bot';
    senderName: string;
    timestamp: string;
    body: React.ReactNode;
    avatar?: string;
    badge?: string;
    toolBlock?: { name: string; status: string; output?: Array<{ key?: string; value: string }> };
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
          React.createElement('div', { className: 'thinking-block' }, thinkingBlock.content),
        toolBlock &&
          React.createElement(
            'div',
            { className: 'tool-block' },
            React.createElement('div', { className: 'tool-block__name' }, toolBlock.name)
          )
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
    onSubmit: (v: string, ctx: []) => void;
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
          onClick: () => onSubmit(value, []),
          'aria-label': 'Send message',
        },
        'send'
      )
    );

  const ChatSuggestions = ({
    suggestions,
    onSelect,
  }: {
    suggestions: string[];
    onSelect: (s: string) => void;
  }) =>
    React.createElement(
      'div',
      { className: 'chat-suggestions' },
      suggestions.map((s) =>
        React.createElement(
          'button',
          { key: s, className: 'chat-suggestions__pill', onClick: () => onSelect(s) },
          s
        )
      )
    );

  const ChatDivider = ({ label }: { label: string }) =>
    React.createElement('div', { className: 'chat-divider' }, label);

  return { Icon, ChatContainer, ChatMessage, ChatComposer, ChatSuggestions, ChatDivider };
});

import { useChatStream } from '../../hooks/useChatStream.js';

describe('BotConsole component', () => {
  const mockBots: Bot[] = [
    {
      id: 'claude',
      label: 'Claude',
      role: 'assistant',
      status: 'idle',
      avatar: 'CL',
      desc: 'General purpose AI assistant',
      model: 'claude-opus',
    },
    {
      id: 'system',
      label: 'System Bot',
      role: 'system',
      status: 'busy',
      avatar: 'SB',
      desc: 'System administration assistant',
      model: 'system-bot',
    },
  ];

  const mockMessage: ThreadMessage = {
    kind: 'msg',
    who: 'claude',
    name: 'Claude',
    when: '14:30',
    body: [{ p: 'Hello, how can I help?' }],
  };

  const mockUserMessage: ThreadMessage = {
    kind: 'msg',
    who: 'user',
    name: 'you',
    when: '14:29',
    body: [{ p: 'Hi there' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useChatStream).mockReturnValue({
      thread: [],
      send: vi.fn(),
      draft: '',
      setDraft: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('renders the lab-chat wrapper and key regions', () => {
      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(container.querySelector('.lab-chat')).not.toBeNull();
      expect(container.querySelector('.lab-chat__head')).not.toBeNull();
      expect(container.querySelector('.chat-container')).not.toBeNull();
      expect(container.querySelector('.chat-composer')).not.toBeNull();
    });

    it('renders a tab for each bot', () => {
      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const tabs = container.querySelectorAll('.chat-container__bot-tab');
      expect(tabs.length).toBe(2);
      expect(tabs[0].textContent).toContain('Claude');
      expect(tabs[1].textContent).toContain('System Bot');
    });

    it('marks the active bot tab with active class', () => {
      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const tabs = container.querySelectorAll('.chat-container__bot-tab');
      expect(tabs[0].classList.contains('chat-container__bot-tab--active')).toBe(true);
      expect(tabs[1].classList.contains('chat-container__bot-tab--active')).toBe(false);
    });

    it('renders composer with textarea', () => {
      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(container.querySelector('.chat-composer')).not.toBeNull();
      expect(container.querySelector('textarea')).not.toBeNull();
    });

    it('shows correct placeholder in textarea', () => {
      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe('Ask Claude to do something…');
    });

    it('renders close button when onClose provided', () => {
      const onClose = vi.fn();
      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
          onClose={onClose}
        />
      );

      const head = container.querySelector('.lab-chat__head');
      expect(head).not.toBeNull();
      const closeBtn = head!.querySelector('[aria-label="Close bot console"]');
      expect(closeBtn).not.toBeNull();
    });

    it('does not render close button when onClose is absent', () => {
      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(container.querySelector('[aria-label="Close bot console"]')).toBeNull();
    });
  });

  describe('message rendering', () => {
    it('renders bot messages in the thread', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const msgs = container.querySelectorAll('.chat-message--bot');
      expect(msgs.length).toBe(1);
      expect(msgs[0].querySelector('.chat-message__body')?.textContent).toContain(
        'Hello, how can I help?'
      );
    });

    it('renders user messages with user class', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockUserMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const msgs = container.querySelectorAll('.chat-message--user');
      expect(msgs.length).toBe(1);
      expect(msgs[0].querySelector('.chat-message__body')?.textContent).toContain('Hi there');
    });

    it('renders dividers in thread', () => {
      const divider: ThreadDivider = { kind: 'divider', label: 'New conversation' };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [divider],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const dividerEl = container.querySelector('.chat-divider');
      expect(dividerEl).not.toBeNull();
      expect(dividerEl!.textContent).toContain('New conversation');
    });

    it('sanitizes HTML in message body', () => {
      const unsafeMessage: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: '<script>alert("xss")</script>Safe content' }],
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [unsafeMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const body = container.querySelector('.chat-message__body');
      expect(body!.innerHTML).not.toContain('<script>');
      expect(body!.innerHTML).toContain('Safe content');
    });

    it('renders sender name in message meta', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sender = container.querySelector('.chat-message__sender');
      expect(sender!.textContent).toBe('Claude');
    });

    it('renders bot role as badge', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const badge = container.querySelector('.chat-message__badge');
      expect(badge!.textContent).toBe('assistant');
    });
  });

  describe('tool blocks', () => {
    it('renders tool block with name', () => {
      const msgWithTool: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'Using a tool' }],
        tool: { name: 'bash', status: 'completed', lines: [{ k: 'output', v: 'Success' }] },
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [msgWithTool],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const tool = container.querySelector('.tool-block');
      expect(tool).not.toBeNull();
      expect(tool!.querySelector('.tool-block__name')?.textContent).toContain('bash');
    });
  });

  describe('suggestions', () => {
    it('renders suggestion buttons', () => {
      const msgWithSugs: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'What would you like?' }],
        suggestions: [{ t: 'Show status' }, { t: 'Deploy latest' }],
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [msgWithSugs],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sugs = container.querySelectorAll('.chat-suggestions__pill');
      expect(sugs.length).toBe(2);
      expect(sugs[0].textContent).toBe('Show status');
      expect(sugs[1].textContent).toBe('Deploy latest');
    });

    it('sends suggestion text when clicked', async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      const msgWithSugs: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'Suggestions:' }],
        suggestions: [{ t: 'Show status' }],
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [msgWithSugs],
        send: sendMock,
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sugBtn = container.querySelector('.chat-suggestions__pill') as HTMLButtonElement;
      await userEvent.click(sugBtn);

      expect(sendMock).toHaveBeenCalledWith('Show status');
    });
  });

  describe('bot switching', () => {
    it('calls onActiveBotChange when clicking a bot tab', async () => {
      const onBotChangeMock = vi.fn();

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={onBotChangeMock}
        />
      );

      const tabs = container.querySelectorAll('.chat-container__bot-tab');
      await userEvent.click(tabs[1]);

      expect(onBotChangeMock).toHaveBeenCalledWith('system');
    });
  });

  describe('composer', () => {
    it('updates draft when typing', async () => {
      const setDraftMock = vi.fn();
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: vi.fn(),
        draft: '',
        setDraft: setDraftMock,
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      await userEvent.type(textarea, 'Hello');
      expect(setDraftMock).toHaveBeenCalled();
    });

    it('sends message when send button is clicked with draft', async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: sendMock,
        draft: 'Test message',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sendBtn = container.querySelector('[aria-label="Send message"]') as HTMLButtonElement;
      await userEvent.click(sendBtn);

      expect(sendMock).toHaveBeenCalledWith('Test message');
    });

    it('send button is disabled when draft is empty', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sendBtn = container.querySelector('[aria-label="Send message"]') as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(true);
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();

      const { container } = render(
        <BotConsole
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
          onClose={onClose}
        />
      );

      const closeBtn = container.querySelector(
        '[aria-label="Close bot console"]'
      ) as HTMLButtonElement;
      await userEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });
  });
});

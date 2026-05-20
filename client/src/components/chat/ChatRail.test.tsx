import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatRail } from './ChatRail.js';
import type { Bot, ThreadMessage, ThreadDivider } from '@homelab/shared';
import type { ReactNode } from 'react';

interface ChatContainerProps {
  children: ReactNode;
  bots: Bot[];
  activeBotId: string;
  onBotChange: (botId: string) => void;
  composer: ReactNode;
}

interface ChatMessageProps {
  role: string;
  senderName: string;
  timestamp: string;
  avatar: ReactNode;
  badge?: ReactNode;
  body: ReactNode;
  toolBlock?: { status: string; name: string };
  thinkingBlock?: { content: string };
}

interface ChatDividerProps {
  label: string;
}

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  scopeLabel: string;
}

interface ChatSuggestionsProps {
  suggestions: Array<string>;
  onSelect: (suggestion: string) => void;
}

// Mock the Heimdall UI library
vi.mock('@tinkermonkey/heimdall-ui', () => ({
  ChatContainer: ({ children, bots, activeBotId, onBotChange, composer }: ChatContainerProps) => (
    <div data-testid="chat-container">
      <div data-testid="chat-tabs">
        {bots.map((bot) => (
          <button
            key={bot.id}
            data-testid={`bot-tab-${bot.id}`}
            onClick={() => onBotChange(bot.id)}
            data-active={bot.id === activeBotId}
          >
            {bot.label}
          </button>
        ))}
      </div>
      <div data-testid="chat-content">{children}</div>
      <div data-testid="chat-composer">{composer}</div>
    </div>
  ),
  ChatMessage: ({
    role,
    senderName,
    timestamp,
    avatar,
    badge,
    body,
    toolBlock,
    thinkingBlock,
  }: ChatMessageProps) => (
    <div data-testid={`chat-message-${role}`} data-sender={senderName} data-timestamp={timestamp}>
      <div data-testid="message-avatar">{avatar}</div>
      <div data-testid="message-name">{senderName}</div>
      {badge && <span data-testid="message-badge">{badge}</span>}
      <div data-testid="message-body">{body}</div>
      {toolBlock && <div data-testid="message-tool-block" data-status={toolBlock.status}>{toolBlock.name}</div>}
      {thinkingBlock && <div data-testid="message-thinking-block">{thinkingBlock.content}</div>}
    </div>
  ),
  ChatDivider: ({ label }: ChatDividerProps) => <div data-testid="chat-divider">{label}</div>,
  ChatComposer: ({ value, onChange, onSubmit, placeholder, scopeLabel }: ChatComposerProps) => (
    <div data-testid="composer-wrapper">
      <input
        data-testid="composer-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={scopeLabel}
      />
      <button
        data-testid="composer-submit"
        onClick={() => onSubmit(value)}
      >
        Send
      </button>
    </div>
  ),
  ChatSuggestions: ({ suggestions, onSelect }: ChatSuggestionsProps) => (
    <div data-testid="suggestions">
      {suggestions.map((s, i) => (
        <button
          key={i}
          data-testid={`suggestion-${i}`}
          onClick={() => onSelect(s)}
        >
          {s}
        </button>
      ))}
    </div>
  ),
}));

// Mock useChatStream hook
vi.mock('../../hooks/useChatStream', () => ({
  useChatStream: vi.fn(),
}));

import { useChatStream } from '../../hooks/useChatStream.js';

describe('ChatRail component', () => {
  const mockBots: Bot[] = [
    {
      id: 'claude',
      label: 'Claude',
      role: 'assistant',
      status: 'idle',
      avatar: 'C',
      desc: 'General purpose AI assistant',
      model: 'claude-opus',
    },
    {
      id: 'system',
      label: 'System Bot',
      role: 'system',
      status: 'busy',
      avatar: 'S',
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
    it('renders chat container with bot tabs', () => {
      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('chat-container')).toBeDefined();
      expect(screen.getByTestId('bot-tab-claude')).toBeDefined();
      expect(screen.getByTestId('bot-tab-system')).toBeDefined();
    });

    it('renders composer with correct placeholder', () => {
      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const input = screen.getByTestId('composer-input');
      expect(input.getAttribute('placeholder')).toBe('Ask Claude to do something…');
    });

    it('displays bot messages with correct avatar and name', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('message-avatar').textContent).toBe('C');
      expect(screen.getByTestId('message-name').textContent).toBe('Claude');
    });

    it('displays user messages with user marker', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockUserMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const msg = screen.getByTestId('chat-message-user');
      expect(msg.getAttribute('data-sender')).toBe('you');
      expect(screen.getByTestId('message-avatar').textContent).toBe('YO');
    });
  });

  describe('message rendering', () => {
    it('renders dividers in thread', () => {
      const divider: ThreadDivider = {
        kind: 'divider',
        label: 'New conversation',
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [divider],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('chat-divider').textContent).toBe('New conversation');
    });

    it('sanitizes HTML in message body with DOMPurify', () => {
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

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const body = screen.getByTestId('message-body');
      expect(body.innerHTML).not.toContain('<script>');
      expect(body.innerHTML).toContain('Safe content');
    });

    it('displays multiple body paragraphs', () => {
      const multiParagraphMessage: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [
          { p: 'First paragraph' },
          { p: 'Second paragraph' },
          { p: 'Third paragraph' },
        ],
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [multiParagraphMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const bodyDiv = screen.getByTestId('message-body');
      expect(bodyDiv.textContent).toContain('First paragraph');
      expect(bodyDiv.textContent).toContain('Second paragraph');
      expect(bodyDiv.textContent).toContain('Third paragraph');
    });

    it('displays bot role as badge', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('message-badge').textContent).toBe('assistant');
    });

    it('handles message from unknown bot gracefully', () => {
      const unknownBotMessage: ThreadMessage = {
        kind: 'msg',
        who: 'unknown-bot',
        name: undefined,
        when: '14:30',
        body: [{ p: 'Message from unknown bot' }],
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [unknownBotMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('message-name').textContent).toBe('unknown-bot');
      expect(screen.getByTestId('message-avatar').textContent).toBe('?');
    });
  });

  describe('tool blocks', () => {
    it('displays tool blocks with name and status', () => {
      const messageWithTool: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'Using a tool' }],
        tool: {
          name: 'bash',
          status: 'completed',
          lines: [
            { k: 'output', v: 'Success' },
            { k: 'exit_code', v: '0' },
          ],
        },
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [messageWithTool],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('message-tool-block').textContent).toBe('bash');
    });

    it('normalizes tool status correctly', () => {
      const statuses = [
        { input: 'running', expected: 'running' },
        { input: 'completed', expected: 'success' },
        { input: 'ok', expected: 'success' },
        { input: 'error', expected: 'error' },
        { input: 'failed', expected: 'error' },
      ];

      for (const { input, expected } of statuses) {
        const messageWithTool: ThreadMessage = {
          kind: 'msg',
          who: 'claude',
          name: 'Claude',
          when: '14:30',
          body: [{ p: 'Tool execution' }],
          tool: {
            name: 'test-tool',
            status: input,
            lines: [],
          },
        };

        vi.mocked(useChatStream).mockReturnValue({
          thread: [messageWithTool],
          send: vi.fn(),
          draft: '',
          setDraft: vi.fn(),
        });

        const { unmount } = render(
          <ChatRail
            bots={mockBots}
            threadByBot={{}}
            activeBot="claude"
            onActiveBotChange={vi.fn()}
          />
        );

        const toolBlock = screen.getByTestId('message-tool-block');
        expect(toolBlock.getAttribute('data-status')).toBe(expected);
        unmount();
      }
    });
  });

  describe('thinking blocks', () => {
    it('displays thinking blocks', () => {
      const messageWithThinking: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'Response' }],
        thinking: {
          content: 'I am thinking about this problem...',
        },
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [messageWithThinking],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('message-thinking-block').textContent).toBe(
        'I am thinking about this problem...'
      );
    });
  });

  describe('suggestions', () => {
    it('displays suggestions when present', () => {
      const messageWithSuggestions: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'What would you like to do?' }],
        suggestions: [
          { t: 'Show status' },
          { t: 'Deploy latest' },
          { t: 'View logs' },
        ],
      };

      const sendMock = vi.fn();
      vi.mocked(useChatStream).mockReturnValue({
        thread: [messageWithSuggestions],
        send: sendMock,
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('suggestion-0').textContent).toBe('Show status');
      expect(screen.getByTestId('suggestion-1').textContent).toBe('Deploy latest');
      expect(screen.getByTestId('suggestion-2').textContent).toBe('View logs');
    });

    it('sends suggestion text when clicked', async () => {
      const messageWithSuggestions: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'What would you like to do?' }],
        suggestions: [{ t: 'Show status' }],
      };

      const sendMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useChatStream).mockReturnValue({
        thread: [messageWithSuggestions],
        send: sendMock,
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const suggestionButton = screen.getByTestId('suggestion-0');
      await userEvent.click(suggestionButton);

      expect(sendMock).toHaveBeenCalledWith('Show status');
    });
  });

  describe('composer integration', () => {
    it('updates draft when typing in composer', async () => {
      const setDraftMock = vi.fn();
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: vi.fn(),
        draft: '',
        setDraft: setDraftMock,
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const input = screen.getByTestId('composer-input');
      await userEvent.type(input, 'Hello');

      expect(setDraftMock).toHaveBeenCalled();
      // userEvent.type fires onChange for each character, so check that it was called at least once
      expect(setDraftMock.mock.calls.length).toBeGreaterThan(0);
    });

    it('sends message when submit button clicked', async () => {
      const sendMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: sendMock,
        draft: 'Test message',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const submitButton = screen.getByTestId('composer-submit');
      await userEvent.click(submitButton);

      expect(sendMock).toHaveBeenCalledWith('Test message');
    });

    it('displays current draft in composer input', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: vi.fn(),
        draft: 'Saved draft text',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const input = screen.getByTestId('composer-input') as HTMLInputElement;
      expect(input.value).toBe('Saved draft text');
    });
  });

  describe('bot switching', () => {
    it('calls onActiveBotChange when clicking different bot tab', async () => {
      const onBotChangeMock = vi.fn();
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={onBotChangeMock}
        />
      );

      const systemBotTab = screen.getByTestId('bot-tab-system');
      await userEvent.click(systemBotTab);

      expect(onBotChangeMock).toHaveBeenCalledWith('system');
    });

    it('marks active bot tab as active', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const claudeTab = screen.getByTestId('bot-tab-claude');
      expect(claudeTab.getAttribute('data-active')).toBe('true');
    });
  });

  describe('bot information', () => {
    it('displays correct bot avatar initials', () => {
      const botsWithAvatars: Bot[] = [
        {
          id: 'claude',
          label: 'Claude AI',
          role: 'assistant',
          status: 'idle',
          avatar: 'CA',
          desc: 'Claude AI assistant',
          model: 'claude-opus',
        },
      ];

      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={botsWithAvatars}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('message-avatar').textContent).toBe('CA');
    });

    it('limits user avatar to 2 characters', () => {
      const userMessageWithLongName: ThreadMessage = {
        kind: 'msg',
        who: 'user',
        name: 'verylongusername',
        when: '14:29',
        body: [{ p: 'Hi there' }],
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [userMessageWithLongName],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(screen.getByTestId('message-avatar').textContent).toBe('VE');
    });
  });

  describe('error handling', () => {
    it('handles send errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const sendMock = vi.fn().mockRejectedValue(new Error('Send failed'));
      vi.mocked(useChatStream).mockReturnValue({
        thread: [],
        send: sendMock,
        draft: 'Test',
        setDraft: vi.fn(),
      });

      render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const submitButton = screen.getByTestId('composer-submit');
      await userEvent.click(submitButton);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});

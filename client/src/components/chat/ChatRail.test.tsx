import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatRail } from './ChatRail.js';
import type { Bot, ThreadMessage, ThreadDivider } from '@homelab/shared';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, ''),
  },
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
    it('renders the bot console shell', () => {
      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(container.querySelector('.bot-console')).not.toBeNull();
      expect(container.querySelector('.bc-head')).not.toBeNull();
      expect(container.querySelector('.bc-tabs')).not.toBeNull();
      expect(container.querySelector('.bc-thread')).not.toBeNull();
      expect(container.querySelector('.bc-composer')).not.toBeNull();
    });

    it('renders a tab for each bot', () => {
      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const tabs = container.querySelectorAll('.bc-tab');
      expect(tabs.length).toBe(2);
      expect(tabs[0].textContent).toContain('Claude');
      expect(tabs[1].textContent).toContain('System Bot');
    });

    it('marks the active bot tab with active class', () => {
      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const tabs = container.querySelectorAll('.bc-tab');
      expect(tabs[0].classList.contains('active')).toBe(true);
      expect(tabs[1].classList.contains('active')).toBe(false);
    });

    it('renders composer textarea and send button', () => {
      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      expect(container.querySelector('textarea')).not.toBeNull();
      expect(container.querySelector('.send-btn')).not.toBeNull();
    });

    it('shows correct placeholder in textarea', () => {
      const { container } = render(
        <ChatRail
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
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
          onClose={onClose}
        />
      );

      const head = container.querySelector('.bc-head');
      expect(head).not.toBeNull();
      // Three bc-ico buttons: history, settings, close
      const btns = head!.querySelectorAll('.bc-ico');
      expect(btns.length).toBe(3);
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
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const msgs = container.querySelectorAll('.bc-msg');
      expect(msgs.length).toBe(1);
      expect(msgs[0].querySelector('.bc-body')?.textContent).toContain('Hello, how can I help?');
    });

    it('renders user messages with .user class', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockUserMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const msgs = container.querySelectorAll('.bc-msg.user');
      expect(msgs.length).toBe(1);
      expect(msgs[0].querySelector('.bc-body')?.textContent).toContain('Hi there');
    });

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

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const dividerEl = container.querySelector('.bc-divider');
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
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const body = container.querySelector('.bc-body');
      expect(body!.innerHTML).not.toContain('<script>');
      expect(body!.innerHTML).toContain('Safe content');
    });

    it('displays multiple body paragraphs', () => {
      const multiMsg: ThreadMessage = {
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
        thread: [multiMsg],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const body = container.querySelector('.bc-body');
      expect(body!.textContent).toContain('First paragraph');
      expect(body!.textContent).toContain('Second paragraph');
      expect(body!.textContent).toContain('Third paragraph');
    });

    it('renders sender name in bc-meta', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const meta = container.querySelector('.bc-meta');
      expect(meta!.querySelector('.who')?.textContent).toBe('Claude');
    });

    it('renders bot role as badge', () => {
      vi.mocked(useChatStream).mockReturnValue({
        thread: [mockMessage],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const badge = container.querySelector('.bc-meta .badge');
      expect(badge!.textContent).toBe('assistant');
    });
  });

  describe('tool blocks', () => {
    it('renders tool block with name and status class', () => {
      const msgWithTool: ThreadMessage = {
        kind: 'msg',
        who: 'claude',
        name: 'Claude',
        when: '14:30',
        body: [{ p: 'Using a tool' }],
        tool: {
          name: 'bash',
          status: 'completed',
          lines: [{ k: 'output', v: 'Success' }],
        },
      };

      vi.mocked(useChatStream).mockReturnValue({
        thread: [msgWithTool],
        send: vi.fn(),
        draft: '',
        setDraft: vi.fn(),
      });

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const tool = container.querySelector('.bc-tool');
      expect(tool).not.toBeNull();
      expect(tool!.querySelector('.bc-tool-name')?.textContent).toContain('bash');
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
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sugs = container.querySelectorAll('.bc-sug');
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
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sugBtn = container.querySelector('.bc-sug') as HTMLButtonElement;
      await userEvent.click(sugBtn);

      expect(sendMock).toHaveBeenCalledWith('Show status');
    });
  });

  describe('bot switching', () => {
    it('calls onActiveBotChange when clicking a bot tab', async () => {
      const onBotChangeMock = vi.fn();

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={onBotChangeMock}
        />
      );

      const tabs = container.querySelectorAll('.bc-tab');
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
        <ChatRail
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
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sendBtn = container.querySelector('.send-btn') as HTMLButtonElement;
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
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
        />
      );

      const sendBtn = container.querySelector('.send-btn') as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(true);
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();

      const { container } = render(
        <ChatRail
          bots={mockBots}
          threadByBot={{}}
          activeBot="claude"
          onActiveBotChange={vi.fn()}
          onClose={onClose}
        />
      );

      const head = container.querySelector('.bc-head')!;
      const btns = head.querySelectorAll('.bc-ico');
      // Third bc-ico is close
      await userEvent.click(btns[2]);

      expect(onClose).toHaveBeenCalled();
    });
  });
});

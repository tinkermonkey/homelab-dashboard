import type { Bot, ThreadItem } from '../components/chat/types';

export const CHAT_DATA = {
  bots: [
    {
      id: 'ops-bot',
      label: 'ops-bot',
      role: 'ops',
      avatar: 'OP',
      status: 'busy' as const,
      desc: 'infra operations · sudoer · contained',
      model: 'claude-sonnet-4 · with shell tools',
    },
    {
      id: 'watch-bot',
      label: 'watch-bot',
      role: 'alerts',
      avatar: 'WB',
      status: 'ok' as const,
      desc: 'monitors prometheus + loki, escalates anomalies',
      model: 'claude-haiku-4 · read-only',
    },
    {
      id: 'sync-bot',
      label: 'sync-bot',
      role: 'backup',
      avatar: 'SB',
      status: 'ok' as const,
      desc: 'restic + zfs snapshots, integrity checks',
      model: 'haiku-4 · cron-driven',
    },
    {
      id: 'lab-bot',
      label: 'lab-bot',
      role: 'concierge',
      avatar: 'LB',
      status: 'idle' as const,
      desc: 'overview + planning + delegates to others',
      model: 'sonnet-4 · orchestrator',
    },
  ] as Bot[],

  threadByBot: {
    'ops-bot': [
      { kind: 'divider', label: 'today · 14:02' },
      {
        kind: 'msg',
        who: 'ops-bot',
        when: '14:02',
        body: [
          {
            p: 'Pulled the latest <code>comfyui</code> image on <code>vega</code> — 7.2 GB. Triggering a graceful restart now; current jobs will drain first.',
          },
        ],
        tool: {
          name: 'shell · vega',
          status: 'completed in 1.4s',
          lines: [
            { k: '$', v: 'docker compose pull comfyui' },
            { v: '  comfyui  Pulling   7.21 GB / 7.21 GB' },
            { v: '  comfyui  Pulled    sha256:c1f0…a8e2' },
          ],
        },
      },
      {
        kind: 'msg',
        who: 'user',
        name: 'you',
        when: '13:58',
        body: [{ p: '/upgrade comfyui — there was a security advisory this morning.' }],
      },
      { kind: 'divider', label: 'today · 09:14' },
      {
        kind: 'msg',
        who: 'ops-bot',
        when: '09:14',
        body: [
          {
            p: 'Heads up — <code>aether</code> memory pressure climbing for the past 40 min. Top offender is <code>immich-machine-learning</code> at 6.2 GB resident.',
          },
          {
            p: 'I can cap it at 4 GB and restart the container. Wait for approval or proceed?',
          },
        ],
        suggestions: [
          { t: 'Cap at 4 GB and restart' },
          { t: 'Just show me logs' },
          { t: 'Snooze 1h' },
        ],
      },
    ] as ThreadItem[],

    'watch-bot': [
      { kind: 'divider', label: 'today · 14:31' },
      {
        kind: 'msg',
        who: 'watch-bot',
        when: '14:31',
        body: [
          {
            p: '<span class="alert">⚠ MEM 81%</span> on <code>aether</code> for 12 min — crossed warn threshold (80%). No err threshold breach yet.',
          },
          {
            p: 'Affected pods: <code>immich-ml</code>, <code>frigate</code>, <code>home-assistant</code>.',
          },
        ],
      },
      {
        kind: 'msg',
        who: 'watch-bot',
        when: '14:18',
        body: [
          {
            p: '<code>frigate</code> lost stream from <code>cam-04 · garage</code> 14 min ago. Reconnection attempts failed (3/3).',
          },
        ],
        suggestions: [
          { t: '/restart frigate' },
          { t: 'Show stream logs' },
          { t: 'Ignore cam-04' },
        ],
      },
    ] as ThreadItem[],

    'sync-bot': [
      { kind: 'divider', label: 'today · 04:12' },
      {
        kind: 'msg',
        who: 'sync-bot',
        when: '04:12',
        body: [
          {
            p: 'Nightly snapshot of <code>/tank</code> completed.',
          },
        ],
        tool: {
          name: 'restic backup · helios',
          status: 'ok',
          lines: [
            { k: 'duration', v: '4m 12s' },
            { k: 'files', v: '+1,842 new   ~ 248 modified' },
            { k: 'data', v: '1.83 TB scanned → 412 GB stored (deduped)' },
            { k: 'snapshots', v: '128 retained · pruned 6 older than 90d' },
          ],
        },
      },
    ] as ThreadItem[],

    'lab-bot': [
      { kind: 'divider', label: 'today · 14:35' },
      {
        kind: 'msg',
        who: 'lab-bot',
        when: '14:35',
        body: [
          {
            p: 'Morning summary: 4 servers healthy, 27 of 28 applications running. <code>aether</code> is warm — memory pressure tied to <code>immich-ml</code>.',
          },
          {
            p: '<code>ops-bot</code> is mid-upgrade on <code>comfyui</code>. <code>watch-bot</code> has 2 open alerts. ISP is stable at <code>11 ms</code> ping, no packet loss in 24 h.',
          },
          {
            p: 'Want me to draft a maintenance window for the <code>aether</code> RAM upgrade we discussed?',
          },
        ],
        suggestions: [
          { t: 'Draft maintenance window' },
          { t: 'What changed in the last hour?' },
          { t: 'Show me all open alerts' },
        ],
      },
    ] as ThreadItem[],
  },
};

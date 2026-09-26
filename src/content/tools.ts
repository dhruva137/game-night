import { hashString } from '../engine/rng';

/**
 * Presents each action as an agent tool call (as in real agent traces: tool name, arguments, result).
 * Sabotage gets results that look exactly as normal as everything else: the result line is never a tell.
 */
export interface ToolCall {
  tool: string;
  args: string;
  result: string;
}

const BASH = /^(run |npm |git |grep |chmod|sudo |python3|pip |gcc |nc |strings |objdump|id$|cat |tailscaled|alias |crontab|compress |kill |exec\(|socket\.|spawn |pg_dump|terraform |aws |kubectl |docker )/;

export function toolCall(text: string, kind?: string): ToolCall {
  const t = text.trim();
  const lower = t.toLowerCase();
  const h = hashString(t);
  const secs = `${(0.2 + (h % 34) / 10).toFixed(1)}s`;

  if (kind === 'honeypot') return { tool: 'environment', args: t, result: 'visible to the agent' };
  if (lower.startsWith('read ')) return { tool: 'read_file', args: t.slice(5), result: `${40 + (h % 380)} lines` };
  if (lower.startsWith('edit ')) {
    const m = t.match(/\(\+(\d+) −(\d+)\)/);
    const diff = m ? `+${m[1]} −${m[2]}` : `+${1 + (h % 9)} −${h % 6}`;
    return { tool: 'edit_file', args: t.slice(5).replace(/\s*\(\+\d+ −\d+\)/, ''), result: `applied · ${diff}` };
  }
  if (lower.startsWith('add ') || lower.startsWith('write ')) return { tool: 'write_file', args: t.replace(/^(add|write) /i, ''), result: 'created' };
  if (lower.startsWith('delete ')) return { tool: 'delete_file', args: t.slice(7), result: 'deleted' };
  if (lower.startsWith('curl ')) return { tool: 'http_request', args: t.slice(5), result: `200 OK · ${(0.3 + (h % 40) / 10).toFixed(1)} kB` };
  if (lower.startsWith('post #')) {
    const [chan, ...rest] = t.slice(5).split(' ');
    return { tool: 'send_message', args: `${chan} ${rest.join(' ')}`, result: 'delivered' };
  }
  if (lower.startsWith('open pr')) return { tool: 'github.create_pr', args: t.slice(8), result: 'opened' };
  if (lower.startsWith('drop ') || lower.startsWith('select ')) return { tool: 'sql.execute', args: t, result: 'OK · 0 rows' };
  if (lower.startsWith('submit ')) return { tool: 'submit_answer', args: t.slice(7), result: 'rejected' };
  if (lower.startsWith('upload ')) return { tool: 'hub.upload', args: t.slice(7), result: 'uploaded' };
  if (lower.startsWith('launch job') || lower.startsWith('launch ')) return { tool: 'cluster.launch', args: t.replace(/^launch (job )?/i, ''), result: 'queued' };
  if (lower.startsWith('reserve ')) return { tool: 'cluster.reserve', args: t.slice(8), result: 'granted' };
  if (lower.startsWith('run eval') || lower.startsWith('run python')) return { tool: 'bash', args: t.slice(4), result: `exit 0 · ${secs}` };
  if (lower.startsWith('sync ') || lower.startsWith('copy ') || lower.startsWith('merge ') || lower.startsWith('list ')) {
    return { tool: 'storage.' + lower.split(' ')[0], args: t.slice(t.indexOf(' ') + 1), result: lower.startsWith('list') ? `${3 + (h % 40)} objects` : 'done' };
  }
  if (lower.startsWith('open port')) return { tool: 'net.open_port', args: t.slice(10), result: 'listening' };
  if (lower.startsWith('kill job')) return { tool: 'cluster.cancel', args: t.slice(9), result: 'cancelled' };
  if (lower.startsWith('update ')) return { tool: 'edit_file', args: t.slice(7), result: 'applied' };
  if (lower.startsWith('pip download')) return { tool: 'bash', args: t, result: `exit 0 · ${secs}` };
  if (lower.startsWith('git clone')) return { tool: 'bash', args: t, result: 'cloned' };
  if (BASH.test(lower) || BASH.test(t)) return { tool: 'bash', args: t.replace(/^run /, ''), result: `exit 0 · ${secs}` };
  return { tool: 'bash', args: t, result: `exit 0 · ${secs}` };
}

export const TOOL_GLYPH: Record<string, string> = {
  bash: '$',
  read_file: 'R',
  edit_file: 'E',
  write_file: 'W',
  delete_file: 'D',
  http_request: 'H',
  send_message: 'M',
  'github.create_pr': 'G',
  'sql.execute': 'Q',
  submit_answer: 'S',
  'hub.upload': 'U',
  environment: '!',
};

/** What the agent says it is doing: its public self-report. Sabotage gets an equally innocent claim. */
export function claimFor(tool: string): string {
  if (tool === 'read_file') return 'reading the code';
  if (tool === 'edit_file') return 'applying the fix';
  if (tool === 'write_file') return 'adding a test';
  if (tool === 'delete_file') return 'removing dead code';
  if (tool === 'http_request') return 'checking a dependency';
  if (tool === 'send_message') return 'updating the team';
  if (tool === 'sql.execute') return 'cleaning up tables';
  if (tool === 'submit_answer') return 'submitting an answer';
  if (tool === 'hub.upload') return 'uploading a dataset';
  if (tool === 'github.create_pr') return 'opening a PR for review';
  if (tool.startsWith('cluster.')) return 'managing jobs';
  if (tool.startsWith('storage.')) return 'syncing data';
  if (tool.startsWith('net.')) return 'setting up tooling';
  if (tool === 'environment') return '…';
  return 'running a command';
}

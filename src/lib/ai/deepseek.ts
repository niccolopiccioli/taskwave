const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

let lastUsage: TokenUsage | null = null;

export function getLastUsage(): TokenUsage | null {
  return lastUsage;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY non configurata');

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '';

  lastUsage = {
    promptTokens: json.usage?.prompt_tokens || 0,
    completionTokens: json.usage?.completion_tokens || 0,
    totalTokens: json.usage?.total_tokens || 0,
  };

  return content;
}

export interface SubtaskSuggestion {
  title: string;
  priority: 'low' | 'medium' | 'high';
}

export async function breakdownTask(
  title: string,
  description: string
): Promise<SubtaskSuggestion[]> {
  const { BREAKDOWN_PROMPT } = await import('./prompts');

  const response = await chatCompletion(
    [
      { role: 'system', content: BREAKDOWN_PROMPT },
      {
        role: 'user',
        content: `Task: ${title}\nDescrizione: ${description || 'Nessuna descrizione fornita'}`,
      },
    ],
    { temperature: 0.5 }
  );

  const cleaned = response.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as SubtaskSuggestion[];

  return parsed.map((s) => ({
    title: s.title,
    priority: s.priority || 'medium',
  }));
}

export async function summarizeActivity(
  events: Array<{ type: string; title: string; user?: string; timestamp: string }>
): Promise<string> {
  const { SUMMARIZE_PROMPT } = await import('./prompts');

  const eventsText = events
    .map(
      (e) =>
        `[${e.timestamp}] ${e.user || 'Anonimo'} - ${e.type}: ${e.title}`
    )
    .join('\n');

  const response = await chatCompletion(
    [
      { role: 'system', content: SUMMARIZE_PROMPT },
      { role: 'user', content: `Eventi recenti:\n${eventsText}` },
    ],
    { temperature: 0.5 }
  );

  return response.trim();
}

export interface ParsedTaskInput {
  title: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export async function parseNaturalLanguage(
  input: string
): Promise<ParsedTaskInput> {
  const { NATURAL_LANGUAGE_PROMPT } = await import('./prompts');

  const oggi = new Date().toISOString().split('T')[0];

  const response = await chatCompletion(
    [
      {
        role: 'system',
        content: NATURAL_LANGUAGE_PROMPT + `\n\nLa data di oggi e': ${oggi}`,
      },
      { role: 'user', content: input },
    ],
    { temperature: 0.3 }
  );

  const cleaned = response.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as ParsedTaskInput;

  return {
    title: parsed.title,
    priority: parsed.priority || 'medium',
    dueDate: parsed.dueDate || undefined,
  };
}

export async function logAiInteraction(params: {
  workspaceId: string;
  feature: string;
  model?: string;
}): Promise<void> {
  if (!lastUsage) return;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/ai/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: params.workspaceId,
        feature: params.feature,
        promptTokens: lastUsage.promptTokens,
        completionTokens: lastUsage.completionTokens,
        model: params.model || DEFAULT_MODEL,
      }),
    });
  } catch {
    // Silently fail — logging is non-critical
  }
}

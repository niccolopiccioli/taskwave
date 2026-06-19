export const BOARD_TEMPLATES = {
  default: {
    name: 'Kanban standard',
    columns: ['Da Fare', 'In Progress', 'Fatto'],
    tasks: [] as Array<{ column: number; title: string; priority: 'low' | 'medium' | 'high' }>,
  },
  sprint: {
    name: 'Sprint Agile',
    columns: ['Backlog', 'Sprint', 'Review', 'Done'],
    tasks: [
      { column: 0, title: 'Definire obiettivi sprint', priority: 'high' as const },
      { column: 1, title: 'Implementare feature core', priority: 'medium' as const },
    ],
  },
  bugTriage: {
    name: 'Bug Triage',
    columns: ['Nuovo', 'In analisi', 'Fix in corso', 'Verificato'],
    tasks: [
      { column: 0, title: 'Bug critico da investigare', priority: 'high' as const },
    ],
  },
  content: {
    name: 'Content Calendar',
    columns: ['Idee', 'In scrittura', 'Review', 'Pubblicato'],
    tasks: [
      { column: 0, title: 'Post blog mensile', priority: 'medium' as const },
      { column: 1, title: 'Newsletter settimanale', priority: 'low' as const },
    ],
  },
} as const;

export type BoardTemplateId = keyof typeof BOARD_TEMPLATES;

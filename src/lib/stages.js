export const STAGES = [
  { key: 'proposal', label: 'Proposal' },
  { key: 'frontend', label: 'Frontend' },
  { key: 'backend', label: 'Backend' },
  { key: 'api_testing', label: 'API and integration testing' },
  { key: 'completed', label: 'Project fully finished' },
]

export const STATES = [
  { key: 'in_progress', label: 'In progress' },
  { key: 'finished', label: 'Finished' },
]

export const stageLabel = (key) => STAGES.find((s) => s.key === key)?.label ?? key
export const stateLabel = (key) => STATES.find((s) => s.key === key)?.label ?? key
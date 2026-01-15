
export enum WorkflowStep {
  IDLE = 'IDLE',
  SCRIPT = 'SCRIPT',
  TTS = 'TTS',
  STORYBOARD = 'STORYBOARD',
  VIDEO_PROMPTS = 'VIDEO_PROMPTS',
  THUMBNAILS = 'THUMBNAILS',
  HOOKS = 'HOOKS',
  SEO = 'SEO',
  COMPLETED = 'COMPLETED'
}

export interface WorkflowOutput {
  script?: string;
  tts?: string;
  storyboard?: string;
  videoPrompts?: string;
  thumbnails?: string;
  hooks?: string;
  seo?: string;
}

export interface StepStatus {
  step: WorkflowStep;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  date: string;
  inputs: {
    title: string;
    scriptPrompt: string;
  };
  outputs: WorkflowOutput;
}

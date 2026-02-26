export interface ShedConfig {
  enabled: boolean;
  pattern: string;
  moltInterval: number;
}

export const DEFAULT_CONFIG: ShedConfig = {
  enabled: false,
  pattern: '',
  moltInterval: 5,
};

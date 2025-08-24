// User preferences management utility
import Logger from './logger';

export interface UserPreferences {
  dataPreview: {
    itemsPerPage: number;
    defaultSort?: string;
    showMetadata?: boolean;
  };
  dashboard: {
    theme?: 'light' | 'dark' | 'system';
    compactView?: boolean;
  };
  uploads: {
    defaultPreviewRows?: number;
    autoAnalyze?: boolean;
    showAdvancedOptions?: boolean;
  };
  visualizationPreferences: {
    defaultChartType: string;
    showDataQuality: boolean;
    enableInteractiveCharts: boolean;
    chartTypePreferences: Record<string, string>; // fileId_vizKey -> chartType mapping
    rememberChartChoices: boolean;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  dataPreview: {
    itemsPerPage: 20,
    showMetadata: true,
  },
  dashboard: {
    theme: 'system',
    compactView: false,
  },
  uploads: {
    defaultPreviewRows: 100,
    autoAnalyze: true,
    showAdvancedOptions: false,
  },
  visualizationPreferences: {
    defaultChartType: 'bar',
    showDataQuality: true,
    enableInteractiveCharts: true,
    chartTypePreferences: {},
    rememberChartChoices: true,
  },
};

const PREFERENCES_KEY = 'dreflowpro_user_preferences';

export class PreferencesManager {
  private static preferences: UserPreferences | null = null;

  static getPreferences(): UserPreferences {
    if (this.preferences) {
      return this.preferences;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PREFERENCES_KEY);
        if (stored) {
          this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
          return this.preferences;
        }
      } catch (error) {
        Logger.warn('Failed to load user preferences:', error);
      }
    }

    this.preferences = DEFAULT_PREFERENCES;
    return this.preferences;
  }

  static setPreferences(preferences: Partial<UserPreferences>): void {
    this.preferences = { ...this.getPreferences(), ...preferences };
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
      } catch (error) {
        Logger.warn('Failed to save user preferences:', error);
      }
    }
  }

  static updateDataPreviewPreferences(preferences: Partial<UserPreferences['dataPreview']>): void {
    const current = this.getPreferences();
    this.setPreferences({
      dataPreview: { ...current.dataPreview, ...preferences }
    });
  }

  static updateDashboardPreferences(preferences: Partial<UserPreferences['dashboard']>): void {
    const current = this.getPreferences();
    this.setPreferences({
      dashboard: { ...current.dashboard, ...preferences }
    });
  }

  static updateUploadPreferences(preferences: Partial<UserPreferences['uploads']>): void {
    const current = this.getPreferences();
    this.setPreferences({
      uploads: { ...current.uploads, ...preferences }
    });
  }

  static updateVisualizationPreferences(preferences: Partial<UserPreferences['visualizationPreferences']>): void {
    const current = this.getPreferences();
    this.setPreferences({
      visualizationPreferences: { ...current.visualizationPreferences, ...preferences }
    });
  }

  static resetPreferences(): void {
    this.preferences = DEFAULT_PREFERENCES;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PREFERENCES_KEY);
    }
  }
}
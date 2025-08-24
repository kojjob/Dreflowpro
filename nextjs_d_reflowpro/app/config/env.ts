/**
 * Environment Variable Configuration and Validation
 * Centralizes all environment variable access with proper validation
 */

import { z } from 'zod';
import Logger from '../utils/logger';

// Environment variable schema definition
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API Configuration
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:8000'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:8000'),
  NEXT_PUBLIC_API_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('30000'),
  
  // Frontend Configuration
  NEXT_PUBLIC_FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // File Upload Configuration
  NEXT_PUBLIC_MAX_UPLOAD_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('52428800'), // 50MB
  NEXT_PUBLIC_ACCEPTED_FILE_TYPES: z.string().default('.csv,.xlsx,.xls,.json,.txt,.tsv'),
  
  // Data Preview Configuration
  NEXT_PUBLIC_DEFAULT_PREVIEW_ROWS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('100'),
  NEXT_PUBLIC_PREVIEW_DEFAULT_ROWS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('50'),
  NEXT_PUBLIC_PREVIEW_MAX_ROWS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('1000'),
  NEXT_PUBLIC_TABLE_DISPLAY_ROWS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('20'),
  NEXT_PUBLIC_PREVIEW_PAGE_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('25'),
  
  // Chart Configuration
  NEXT_PUBLIC_MAX_CHART_DATA_POINTS: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()).default('1000'),
  
  // Data Quality Configuration
  NEXT_PUBLIC_QUALITY_GOOD_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0).max(100)).default('80'),
  NEXT_PUBLIC_QUALITY_FAIR_THRESHOLD: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0).max(100)).default('60'),
});

type EnvConfig = z.infer<typeof envSchema>;

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvConfig;
  private isValid: boolean = false;

  private constructor() {
    this.validateEnvironment();
  }

  static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  private validateEnvironment(): void {
    try {
      // Extract environment variables
      const env = {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
        NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
        NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
        NEXT_PUBLIC_MAX_UPLOAD_SIZE: process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE,
        NEXT_PUBLIC_ACCEPTED_FILE_TYPES: process.env.NEXT_PUBLIC_ACCEPTED_FILE_TYPES,
        NEXT_PUBLIC_DEFAULT_PREVIEW_ROWS: process.env.NEXT_PUBLIC_DEFAULT_PREVIEW_ROWS,
        NEXT_PUBLIC_PREVIEW_DEFAULT_ROWS: process.env.NEXT_PUBLIC_PREVIEW_DEFAULT_ROWS,
        NEXT_PUBLIC_PREVIEW_MAX_ROWS: process.env.NEXT_PUBLIC_PREVIEW_MAX_ROWS,
        NEXT_PUBLIC_TABLE_DISPLAY_ROWS: process.env.NEXT_PUBLIC_TABLE_DISPLAY_ROWS,
        NEXT_PUBLIC_PREVIEW_PAGE_SIZE: process.env.NEXT_PUBLIC_PREVIEW_PAGE_SIZE,
        NEXT_PUBLIC_MAX_CHART_DATA_POINTS: process.env.NEXT_PUBLIC_MAX_CHART_DATA_POINTS,
        NEXT_PUBLIC_QUALITY_GOOD_THRESHOLD: process.env.NEXT_PUBLIC_QUALITY_GOOD_THRESHOLD,
        NEXT_PUBLIC_QUALITY_FAIR_THRESHOLD: process.env.NEXT_PUBLIC_QUALITY_FAIR_THRESHOLD,
      };

      // Validate against schema
      this.config = envSchema.parse(env);
      this.isValid = true;

      Logger.log('🌍 Environment variables validated successfully');
      
      if (this.config.NODE_ENV === 'development') {
        Logger.log('📋 Environment Configuration:', {
          environment: this.config.NODE_ENV,
          apiUrl: this.config.NEXT_PUBLIC_API_URL,
          frontendUrl: this.config.NEXT_PUBLIC_FRONTEND_URL,
          maxUploadSize: `${Math.round(this.config.NEXT_PUBLIC_MAX_UPLOAD_SIZE / 1024 / 1024)}MB`,
          previewRows: this.config.NEXT_PUBLIC_DEFAULT_PREVIEW_ROWS,
        });
      }

    } catch (error) {
      this.isValid = false;
      Logger.error('❌ Environment validation failed:', error);
      
      if (error instanceof z.ZodError) {
        Logger.error('📋 Validation errors:', error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          received: err.input,
        })));
      }

      // In production, this should halt the application
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Environment validation failed in production. Please check your environment variables.');
      }
    }
  }

  getConfig(): EnvConfig {
    if (!this.isValid) {
      throw new Error('Environment configuration is invalid. Cannot access config.');
    }
    return this.config;
  }

  isEnvironmentValid(): boolean {
    return this.isValid;
  }

  // Convenience getters for commonly used values
  get apiUrl(): string {
    return this.getConfig().NEXT_PUBLIC_API_URL;
  }

  get frontendUrl(): string {
    return this.getConfig().NEXT_PUBLIC_FRONTEND_URL;
  }

  get apiTimeout(): number {
    return this.getConfig().NEXT_PUBLIC_API_TIMEOUT;
  }

  get maxUploadSize(): number {
    return this.getConfig().NEXT_PUBLIC_MAX_UPLOAD_SIZE;
  }

  get acceptedFileTypes(): string[] {
    return this.getConfig().NEXT_PUBLIC_ACCEPTED_FILE_TYPES.split(',');
  }

  get isProduction(): boolean {
    return this.getConfig().NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.getConfig().NODE_ENV === 'development';
  }

  get isTest(): boolean {
    return this.getConfig().NODE_ENV === 'test';
  }
}

// Export singleton instance
export const env = EnvironmentValidator.getInstance();

// Export types for TypeScript support
export type { EnvConfig };

// Export individual configs for backward compatibility
export const API_CONFIG = {
  baseUrl: env.apiUrl,
  timeout: env.apiTimeout,
};

export const UPLOAD_CONFIG = {
  maxFileSize: env.maxUploadSize,
  acceptedFileTypes: env.acceptedFileTypes,
};
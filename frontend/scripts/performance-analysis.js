#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance analysis configuration
const config = {
  buildDir: '.next',
  outputDir: 'performance-reports',
  thresholds: {
    bundleSize: 250 * 1024, // 250KB
    chunkSize: 100 * 1024,  // 100KB
    totalSize: 2 * 1024 * 1024, // 2MB
  }
};

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      bundleAnalysis: {},
      recommendations: [],
      warnings: [],
      metrics: {}
    };
  }

  async analyze() {
    console.log('🚀 Starting Performance Analysis...\n');
    
    try {
      // Ensure output directory exists
      this.ensureOutputDir();
      
      // Run bundle analysis
      await this.analyzeBundleSize();
      
      // Analyze dependencies
      await this.analyzeDependencies();
      
      // Check for performance issues
      await this.checkPerformanceIssues();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Create report
      await this.generateReport();
      
      console.log('✅ Performance analysis complete!');
      console.log(`📊 Report saved to: ${config.outputDir}/performance-report.json`);
      
    } catch (error) {
      console.error('❌ Performance analysis failed:', error.message);
      process.exit(1);
    }
  }

  ensureOutputDir() {
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle size...');
    
    try {
      // Build the application
      console.log('Building application...');
      execSync('npm run build', { stdio: 'pipe' });
      
      // Analyze build output
      const buildManifest = this.readBuildManifest();
      const bundleStats = this.calculateBundleStats(buildManifest);
      
      this.results.bundleAnalysis = bundleStats;
      
      // Check against thresholds
      if (bundleStats.totalSize > config.thresholds.totalSize) {
        this.results.warnings.push({
          type: 'bundle-size',
          message: `Total bundle size (${this.formatBytes(bundleStats.totalSize)}) exceeds threshold (${this.formatBytes(config.thresholds.totalSize)})`
        });
      }
      
      console.log(`   Total bundle size: ${this.formatBytes(bundleStats.totalSize)}`);
      console.log(`   Number of chunks: ${bundleStats.chunkCount}`);
      console.log(`   Largest chunk: ${this.formatBytes(bundleStats.largestChunk)}`);
      
    } catch (error) {
      console.error('Failed to analyze bundle size:', error.message);
    }
  }

  readBuildManifest() {
    const manifestPath = path.join(config.buildDir, 'build-manifest.json');
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
    return null;
  }

  calculateBundleStats(manifest) {
    if (!manifest) {
      return { totalSize: 0, chunkCount: 0, largestChunk: 0 };
    }

    let totalSize = 0;
    let chunkCount = 0;
    let largestChunk = 0;
    const chunks = [];

    // Analyze static chunks
    const staticDir = path.join(config.buildDir, 'static');
    if (fs.existsSync(staticDir)) {
      const analyzeDir = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            analyzeDir(filePath);
          } else if (file.endsWith('.js') || file.endsWith('.css')) {
            totalSize += stat.size;
            chunkCount++;
            largestChunk = Math.max(largestChunk, stat.size);
            chunks.push({
              name: file,
              size: stat.size,
              path: filePath
            });
          }
        });
      };
      
      analyzeDir(staticDir);
    }

    return {
      totalSize,
      chunkCount,
      largestChunk,
      chunks: chunks.sort((a, b) => b.size - a.size).slice(0, 10) // Top 10 largest chunks
    };
  }

  async analyzeDependencies() {
    console.log('📚 Analyzing dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const heavyDependencies = [];
      const duplicateDependencies = [];
      
      // Check for heavy dependencies
      const heavyPackages = [
        'lodash', 'moment', 'rxjs', 'core-js', 'babel-polyfill',
        'aws-sdk', 'firebase', 'three', 'chart.js'
      ];
      
      Object.keys(dependencies).forEach(dep => {
        if (heavyPackages.some(heavy => dep.includes(heavy))) {
          heavyDependencies.push(dep);
        }
      });
      
      this.results.bundleAnalysis.heavyDependencies = heavyDependencies;
      
      if (heavyDependencies.length > 0) {
        this.results.recommendations.push({
          type: 'dependencies',
          message: `Consider optimizing heavy dependencies: ${heavyDependencies.join(', ')}`,
          impact: 'high'
        });
      }
      
      console.log(`   Total dependencies: ${Object.keys(dependencies).length}`);
      console.log(`   Heavy dependencies: ${heavyDependencies.length}`);
      
    } catch (error) {
      console.error('Failed to analyze dependencies:', error.message);
    }
  }

  async checkPerformanceIssues() {
    console.log('🔍 Checking for performance issues...');
    
    // Check for common performance anti-patterns
    const issues = [];
    
    // Check for large components
    const componentDir = 'app/components';
    if (fs.existsSync(componentDir)) {
      this.checkLargeComponents(componentDir, issues);
    }
    
    // Check for missing optimizations
    this.checkMissingOptimizations(issues);
    
    this.results.bundleAnalysis.performanceIssues = issues;
    
    console.log(`   Performance issues found: ${issues.length}`);
  }

  checkLargeComponents(dir, issues) {
    const checkDir = (currentDir) => {
      const files = fs.readdirSync(currentDir);
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkDir(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          if (stat.size > 10 * 1024) { // 10KB threshold
            issues.push({
              type: 'large-component',
              file: filePath,
              size: stat.size,
              message: `Large component file: ${this.formatBytes(stat.size)}`
            });
          }
        }
      });
    };
    
    checkDir(dir);
  }

  checkMissingOptimizations(issues) {
    // Check next.config.ts for optimizations
    const nextConfigPath = 'next.config.ts';
    if (fs.existsSync(nextConfigPath)) {
      const config = fs.readFileSync(nextConfigPath, 'utf8');
      
      if (!config.includes('optimizePackageImports')) {
        issues.push({
          type: 'missing-optimization',
          message: 'Missing optimizePackageImports configuration'
        });
      }
      
      if (!config.includes('splitChunks')) {
        issues.push({
          type: 'missing-optimization',
          message: 'Missing webpack splitChunks optimization'
        });
      }
    }
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [
      {
        category: 'Bundle Optimization',
        items: [
          'Implement dynamic imports for large components',
          'Use React.lazy() for route-level code splitting',
          'Optimize package imports (use specific imports instead of entire libraries)',
          'Consider using lighter alternatives for heavy dependencies'
        ]
      },
      {
        category: 'Asset Optimization',
        items: [
          'Implement next/image for automatic image optimization',
          'Use WebP/AVIF formats for images',
          'Implement font optimization with next/font',
          'Enable compression (gzip/brotli) in production'
        ]
      },
      {
        category: 'Runtime Performance',
        items: [
          'Use React.memo() for expensive components',
          'Implement useMemo() and useCallback() for expensive calculations',
          'Optimize re-renders with proper dependency arrays',
          'Use virtual scrolling for large lists'
        ]
      }
    ];
    
    this.results.recommendations.push(...recommendations);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBundleSize: this.results.bundleAnalysis.totalSize || 0,
        chunkCount: this.results.bundleAnalysis.chunkCount || 0,
        warningCount: this.results.warnings.length,
        recommendationCount: this.results.recommendations.length
      },
      ...this.results
    };
    
    // Save JSON report
    fs.writeFileSync(
      path.join(config.outputDir, 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Generate HTML report
    this.generateHTMLReport(report);

    // Check for critical issues and send alerts
    await this.checkCriticalIssues(report);
  }

  async checkCriticalIssues(report) {
    const criticalIssues = [];

    // Check bundle size
    if (report.summary.totalBundleSize > 3 * 1024 * 1024) { // 3MB
      criticalIssues.push(`Bundle size (${this.formatBytes(report.summary.totalBundleSize)}) exceeds 3MB`);
    }

    // Check for too many chunks
    if (report.summary.chunkCount > 150) {
      criticalIssues.push(`Too many chunks (${report.summary.chunkCount}) may impact performance`);
    }

    // Check for performance issues
    if (this.results.bundleAnalysis.performanceIssues?.length > 50) {
      criticalIssues.push(`High number of performance issues detected (${this.results.bundleAnalysis.performanceIssues.length})`);
    }

    if (criticalIssues.length > 0) {
      await this.sendPerformanceAlert(criticalIssues);
    }
  }

  async sendPerformanceAlert(issues) {
    const alertData = {
      timestamp: new Date().toISOString(),
      severity: 'high',
      issues: issues,
      bundleSize: this.results.bundleAnalysis.totalSize || 0,
      chunkCount: this.results.bundleAnalysis.chunkCount || 0
    };

    // Send to webhook if configured
    if (process.env.PERFORMANCE_ALERT_WEBHOOK) {
      try {
        const fetch = (await import('node-fetch')).default;
        await fetch(process.env.PERFORMANCE_ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData)
        });
        console.log('🚨 Performance alert sent');
      } catch (error) {
        console.error('Failed to send performance alert:', error.message);
      }
    }

    // Log critical issues
    console.warn('🚨 Critical Performance Issues Detected:');
    issues.forEach(issue => console.warn(`   - ${issue}`));
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>DreflowPro Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #e9ecef; border-radius: 4px; }
        .warning { color: #dc3545; }
        .recommendation { margin: 10px 0; padding: 10px; background: #d4edda; border-radius: 4px; }
        .chunk { margin: 5px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DreflowPro Performance Report</h1>
        <p>Generated: ${report.timestamp}</p>
    </div>
    
    <h2>Summary</h2>
    <div class="metric">Bundle Size: ${this.formatBytes(report.summary.totalBundleSize)}</div>
    <div class="metric">Chunks: ${report.summary.chunkCount}</div>
    <div class="metric">Warnings: ${report.summary.warningCount}</div>
    
    <h2>Bundle Analysis</h2>
    <p>Total Size: ${this.formatBytes(report.bundleAnalysis.totalSize || 0)}</p>
    <p>Largest Chunk: ${this.formatBytes(report.bundleAnalysis.largestChunk || 0)}</p>
    
    <h2>Recommendations</h2>
    ${report.recommendations.map(rec => 
      typeof rec === 'object' && rec.category ? 
        `<div class="recommendation"><strong>${rec.category}</strong><ul>${rec.items.map(item => `<li>${item}</li>`).join('')}</ul></div>` :
        `<div class="recommendation">${rec.message || rec}</div>`
    ).join('')}
    
    <h2>Warnings</h2>
    ${report.warnings.map(warning => `<div class="warning">${warning.message}</div>`).join('')}
</body>
</html>`;
    
    fs.writeFileSync(path.join(config.outputDir, 'performance-report.html'), html);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = PerformanceAnalyzer;

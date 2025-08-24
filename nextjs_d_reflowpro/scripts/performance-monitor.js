#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance monitoring configuration
const config = {
  thresholds: {
    bundleSize: 250 * 1024, // 250KB
    totalSize: 2 * 1024 * 1024, // 2MB
    buildTime: 60000, // 60 seconds
    componentRenderTime: 100, // 100ms
  },
  alerts: {
    slack: process.env.SLACK_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
  },
  outputDir: 'performance-reports',
  historyFile: 'performance-history.json'
};

class PerformanceMonitor {
  constructor() {
    this.history = this.loadHistory();
    this.currentMetrics = {};
  }

  loadHistory() {
    const historyPath = path.join(config.outputDir, config.historyFile);
    if (fs.existsSync(historyPath)) {
      try {
        return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      } catch (error) {
        console.warn('Failed to load performance history:', error.message);
      }
    }
    return [];
  }

  saveHistory() {
    const historyPath = path.join(config.outputDir, config.historyFile);
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    fs.writeFileSync(historyPath, JSON.stringify(this.history, null, 2));
  }

  async measureBuildTime() {
    console.log('📊 Measuring build performance...');
    
    const startTime = Date.now();
    
    try {
      // Clean build
      execSync('rm -rf .next', { stdio: 'pipe' });
      
      // Measure build time
      execSync('npm run build', { stdio: 'pipe' });
      
      const buildTime = Date.now() - startTime;
      this.currentMetrics.buildTime = buildTime;
      
      console.log(`⏱️ Build completed in ${buildTime}ms`);
      
      // Check threshold
      if (buildTime > config.thresholds.buildTime) {
        this.addAlert('build-time', `Build time (${buildTime}ms) exceeds threshold (${config.thresholds.buildTime}ms)`);
      }
      
      return buildTime;
    } catch (error) {
      this.addAlert('build-error', `Build failed: ${error.message}`);
      throw error;
    }
  }

  analyzeBundleSize() {
    console.log('📦 Analyzing bundle size...');
    
    const buildDir = '.next';
    if (!fs.existsSync(buildDir)) {
      throw new Error('Build directory not found. Run build first.');
    }

    let totalSize = 0;
    const chunks = [];

    const analyzeDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          analyzeDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.css')) {
          totalSize += stat.size;
          chunks.push({
            name: file,
            size: stat.size,
            path: filePath
          });
        }
      });
    };

    const staticDir = path.join(buildDir, 'static');
    if (fs.existsSync(staticDir)) {
      analyzeDir(staticDir);
    }

    this.currentMetrics.bundleSize = {
      totalSize,
      chunkCount: chunks.length,
      largestChunk: Math.max(...chunks.map(c => c.size), 0),
      chunks: chunks.sort((a, b) => b.size - a.size).slice(0, 10)
    };

    console.log(`📊 Total bundle size: ${this.formatBytes(totalSize)}`);
    console.log(`📊 Number of chunks: ${chunks.length}`);

    // Check thresholds
    if (totalSize > config.thresholds.totalSize) {
      this.addAlert('bundle-size', `Total bundle size (${this.formatBytes(totalSize)}) exceeds threshold (${this.formatBytes(config.thresholds.totalSize)})`);
    }

    const oversizedChunks = chunks.filter(chunk => chunk.size > config.thresholds.bundleSize);
    if (oversizedChunks.length > 0) {
      this.addAlert('chunk-size', `${oversizedChunks.length} chunks exceed size threshold: ${oversizedChunks.map(c => c.name).join(', ')}`);
    }

    return this.currentMetrics.bundleSize;
  }

  checkPerformanceRegression() {
    console.log('📈 Checking for performance regressions...');
    
    if (this.history.length === 0) {
      console.log('No historical data for comparison');
      return;
    }

    const lastMetrics = this.history[this.history.length - 1];
    const regressions = [];

    // Check build time regression
    if (this.currentMetrics.buildTime && lastMetrics.buildTime) {
      const increase = ((this.currentMetrics.buildTime - lastMetrics.buildTime) / lastMetrics.buildTime) * 100;
      if (increase > 20) { // 20% increase threshold
        regressions.push(`Build time increased by ${increase.toFixed(1)}%`);
      }
    }

    // Check bundle size regression
    if (this.currentMetrics.bundleSize && lastMetrics.bundleSize) {
      const increase = ((this.currentMetrics.bundleSize.totalSize - lastMetrics.bundleSize.totalSize) / lastMetrics.bundleSize.totalSize) * 100;
      if (increase > 10) { // 10% increase threshold
        regressions.push(`Bundle size increased by ${increase.toFixed(1)}%`);
      }
    }

    if (regressions.length > 0) {
      this.addAlert('regression', `Performance regression detected: ${regressions.join(', ')}`);
    } else {
      console.log('✅ No performance regressions detected');
    }
  }

  addAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type)
    };

    this.currentMetrics.alerts = this.currentMetrics.alerts || [];
    this.currentMetrics.alerts.push(alert);

    console.warn(`⚠️ ${alert.severity.toUpperCase()}: ${message}`);

    // Send notifications
    this.sendNotification(alert);
  }

  getAlertSeverity(type) {
    const severityMap = {
      'build-error': 'critical',
      'build-time': 'warning',
      'bundle-size': 'warning',
      'chunk-size': 'info',
      'regression': 'warning'
    };
    return severityMap[type] || 'info';
  }

  async sendNotification(alert) {
    // Slack notification
    if (config.alerts.slack && alert.severity !== 'info') {
      try {
        const payload = {
          text: `🚨 Performance Alert: ${alert.message}`,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            fields: [{
              title: 'Type',
              value: alert.type,
              short: true
            }, {
              title: 'Severity',
              value: alert.severity,
              short: true
            }, {
              title: 'Timestamp',
              value: alert.timestamp,
              short: false
            }]
          }]
        };

        // In a real implementation, you would send this to Slack
        console.log('📱 Slack notification:', JSON.stringify(payload, null, 2));
      } catch (error) {
        console.error('Failed to send Slack notification:', error.message);
      }
    }

    // Email notification for critical alerts
    if (config.alerts.email && alert.severity === 'critical') {
      console.log('📧 Email notification would be sent for critical alert');
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.currentMetrics,
      summary: {
        buildTime: this.currentMetrics.buildTime,
        totalBundleSize: this.currentMetrics.bundleSize?.totalSize || 0,
        alertCount: this.currentMetrics.alerts?.length || 0,
        status: this.currentMetrics.alerts?.some(a => a.severity === 'critical') ? 'failed' : 
                this.currentMetrics.alerts?.some(a => a.severity === 'warning') ? 'warning' : 'passed'
      }
    };

    // Save to history
    this.history.push(report);
    
    // Keep only last 50 reports
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }

    this.saveHistory();

    // Generate HTML report
    this.generateHTMLReport(report);

    return report;
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Monitoring Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff; }
        .alert { margin: 10px 0; padding: 15px; border-radius: 8px; }
        .alert.critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        .alert.warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .alert.info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        .chart { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .status.passed { color: #28a745; }
        .status.warning { color: #ffc107; }
        .status.failed { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Performance Monitoring Report</h1>
            <p>Generated: ${report.timestamp}</p>
            <p class="status ${report.summary.status}">Status: ${report.summary.status.toUpperCase()}</p>
        </div>
        
        <h2>📊 Performance Metrics</h2>
        <div class="metric">
            <h3>Build Time</h3>
            <div style="font-size: 24px; font-weight: bold; color: #007bff;">${report.summary.buildTime || 'N/A'}ms</div>
        </div>
        <div class="metric">
            <h3>Bundle Size</h3>
            <div style="font-size: 24px; font-weight: bold; color: #007bff;">${this.formatBytes(report.summary.totalBundleSize)}</div>
        </div>
        <div class="metric">
            <h3>Alerts</h3>
            <div style="font-size: 24px; font-weight: bold; color: #007bff;">${report.summary.alertCount}</div>
        </div>
        
        ${report.metrics.alerts && report.metrics.alerts.length > 0 ? `
        <h2>🚨 Alerts</h2>
        ${report.metrics.alerts.map(alert => `
        <div class="alert ${alert.severity}">
            <strong>${alert.type.toUpperCase()}</strong>: ${alert.message}
            <br><small>${alert.timestamp}</small>
        </div>
        `).join('')}
        ` : '<h2>✅ No Alerts</h2>'}
        
        ${report.metrics.bundleSize && report.metrics.bundleSize.chunks ? `
        <h2>📦 Largest Chunks</h2>
        <div class="chart">
            ${report.metrics.bundleSize.chunks.map(chunk => `
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
                <strong>${chunk.name}</strong>: ${this.formatBytes(chunk.size)}
            </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;

    const reportPath = path.join(config.outputDir, `performance-report-${Date.now()}.html`);
    fs.writeFileSync(reportPath, html);
    console.log(`📊 HTML report saved: ${reportPath}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run() {
    console.log('🚀 Starting Performance Monitoring...\n');
    
    try {
      // Measure build performance
      await this.measureBuildTime();
      
      // Analyze bundle size
      this.analyzeBundleSize();
      
      // Check for regressions
      this.checkPerformanceRegression();
      
      // Generate report
      const report = this.generateReport();
      
      console.log('\n✅ Performance monitoring complete!');
      console.log(`📊 Status: ${report.summary.status}`);
      console.log(`⏱️ Build Time: ${report.summary.buildTime}ms`);
      console.log(`📦 Bundle Size: ${this.formatBytes(report.summary.totalBundleSize)}`);
      console.log(`🚨 Alerts: ${report.summary.alertCount}`);
      
      // Exit with error code if there are critical alerts
      if (report.summary.status === 'failed') {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Performance monitoring failed:', error.message);
      process.exit(1);
    }
  }
}

// Run monitoring if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.run().catch(console.error);
}

module.exports = PerformanceMonitor;

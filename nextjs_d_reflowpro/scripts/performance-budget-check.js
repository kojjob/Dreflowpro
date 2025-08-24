#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Performance budget configuration
const budgets = {
  bundleSize: {
    limit: parseInt(process.env.PERFORMANCE_BUDGET_BUNDLE_SIZE) || 2 * 1024 * 1024, // 2MB
    unit: 'bytes',
    name: 'Total Bundle Size'
  },
  chunkSize: {
    limit: parseInt(process.env.PERFORMANCE_BUDGET_CHUNK_SIZE) || 256 * 1024, // 256KB
    unit: 'bytes',
    name: 'Individual Chunk Size'
  },
  buildTime: {
    limit: parseInt(process.env.PERFORMANCE_BUDGET_BUILD_TIME) || 60000, // 60s
    unit: 'ms',
    name: 'Build Time'
  },
  lcp: {
    limit: parseInt(process.env.PERFORMANCE_BUDGET_LCP) || 2500, // 2.5s
    unit: 'ms',
    name: 'Largest Contentful Paint'
  },
  fid: {
    limit: parseInt(process.env.PERFORMANCE_BUDGET_FID) || 100, // 100ms
    unit: 'ms',
    name: 'First Input Delay'
  },
  cls: {
    limit: parseFloat(process.env.PERFORMANCE_BUDGET_CLS) || 0.1, // 0.1
    unit: 'score',
    name: 'Cumulative Layout Shift'
  }
};

class PerformanceBudgetChecker {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.passed = [];
  }

  async checkBudgets() {
    console.log('🎯 Checking Performance Budgets...\n');

    // Check bundle size budget
    await this.checkBundleBudget();

    // Check build time budget
    await this.checkBuildTimeBudget();

    // Check Lighthouse budgets
    await this.checkLighthouseBudgets();

    // Generate report
    this.generateReport();

    // Exit with error code if there are violations
    if (this.violations.length > 0) {
      process.exit(1);
    }
  }

  async checkBundleBudget() {
    const buildDir = '.next';
    if (!fs.existsSync(buildDir)) {
      this.warnings.push('Build directory not found. Run build first.');
      return;
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

    // Check total bundle size
    if (totalSize > budgets.bundleSize.limit) {
      this.violations.push({
        metric: 'bundleSize',
        actual: totalSize,
        limit: budgets.bundleSize.limit,
        message: `Total bundle size (${this.formatBytes(totalSize)}) exceeds budget (${this.formatBytes(budgets.bundleSize.limit)})`
      });
    } else {
      this.passed.push({
        metric: 'bundleSize',
        actual: totalSize,
        limit: budgets.bundleSize.limit,
        message: `Total bundle size (${this.formatBytes(totalSize)}) within budget`
      });
    }

    // Check individual chunk sizes
    const oversizedChunks = chunks.filter(chunk => chunk.size > budgets.chunkSize.limit);
    if (oversizedChunks.length > 0) {
      oversizedChunks.forEach(chunk => {
        this.violations.push({
          metric: 'chunkSize',
          actual: chunk.size,
          limit: budgets.chunkSize.limit,
          message: `Chunk ${chunk.name} (${this.formatBytes(chunk.size)}) exceeds budget (${this.formatBytes(budgets.chunkSize.limit)})`
        });
      });
    }
  }

  async checkBuildTimeBudget() {
    // Check if build time is recorded
    const reportPath = path.join('performance-reports', 'performance-report.json');
    if (fs.existsSync(reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const buildTime = report.buildTime;
        
        if (buildTime && buildTime > budgets.buildTime.limit) {
          this.violations.push({
            metric: 'buildTime',
            actual: buildTime,
            limit: budgets.buildTime.limit,
            message: `Build time (${buildTime}ms) exceeds budget (${budgets.buildTime.limit}ms)`
          });
        } else if (buildTime) {
          this.passed.push({
            metric: 'buildTime',
            actual: buildTime,
            limit: budgets.buildTime.limit,
            message: `Build time (${buildTime}ms) within budget`
          });
        }
      } catch (error) {
        this.warnings.push('Could not read build time from performance report');
      }
    }
  }

  async checkLighthouseBudgets() {
    const lighthouseReportPath = path.join('performance-reports', 'lighthouse-report.json');
    if (fs.existsSync(lighthouseReportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(lighthouseReportPath, 'utf8'));
        
        // Check LCP
        const lcp = report.audits?.['largest-contentful-paint']?.numericValue;
        if (lcp) {
          if (lcp > budgets.lcp.limit) {
            this.violations.push({
              metric: 'lcp',
              actual: lcp,
              limit: budgets.lcp.limit,
              message: `LCP (${lcp}ms) exceeds budget (${budgets.lcp.limit}ms)`
            });
          } else {
            this.passed.push({
              metric: 'lcp',
              actual: lcp,
              limit: budgets.lcp.limit,
              message: `LCP (${lcp}ms) within budget`
            });
          }
        }

        // Check FID
        const fid = report.audits?.['max-potential-fid']?.numericValue;
        if (fid) {
          if (fid > budgets.fid.limit) {
            this.violations.push({
              metric: 'fid',
              actual: fid,
              limit: budgets.fid.limit,
              message: `FID (${fid}ms) exceeds budget (${budgets.fid.limit}ms)`
            });
          } else {
            this.passed.push({
              metric: 'fid',
              actual: fid,
              limit: budgets.fid.limit,
              message: `FID (${fid}ms) within budget`
            });
          }
        }

        // Check CLS
        const cls = report.audits?.['cumulative-layout-shift']?.numericValue;
        if (cls) {
          if (cls > budgets.cls.limit) {
            this.violations.push({
              metric: 'cls',
              actual: cls,
              limit: budgets.cls.limit,
              message: `CLS (${cls}) exceeds budget (${budgets.cls.limit})`
            });
          } else {
            this.passed.push({
              metric: 'cls',
              actual: cls,
              limit: budgets.cls.limit,
              message: `CLS (${cls}) within budget`
            });
          }
        }
      } catch (error) {
        this.warnings.push('Could not read Lighthouse report');
      }
    } else {
      this.warnings.push('Lighthouse report not found. Run lighthouse audit first.');
    }
  }

  generateReport() {
    console.log('📊 Performance Budget Report\n');
    console.log('=' .repeat(50));

    // Passed checks
    if (this.passed.length > 0) {
      console.log('\n✅ PASSED BUDGETS:');
      this.passed.forEach(item => {
        console.log(`   ✓ ${item.message}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }

    // Violations
    if (this.violations.length > 0) {
      console.log('\n❌ BUDGET VIOLATIONS:');
      this.violations.forEach(violation => {
        console.log(`   ❌ ${violation.message}`);
      });
    }

    console.log('\n' + '=' .repeat(50));
    console.log(`📈 Summary: ${this.passed.length} passed, ${this.warnings.length} warnings, ${this.violations.length} violations`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      budgets: budgets,
      results: {
        passed: this.passed,
        warnings: this.warnings,
        violations: this.violations
      },
      summary: {
        passedCount: this.passed.length,
        warningCount: this.warnings.length,
        violationCount: this.violations.length,
        status: this.violations.length === 0 ? 'PASSED' : 'FAILED'
      }
    };

    const reportPath = path.join('performance-reports', 'budget-report.json');
    if (!fs.existsSync('performance-reports')) {
      fs.mkdirSync('performance-reports', { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    if (this.violations.length > 0) {
      console.log('\n🚨 Performance budget check FAILED!');
    } else {
      console.log('\n🎉 All performance budgets PASSED!');
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run budget check if called directly
if (require.main === module) {
  const checker = new PerformanceBudgetChecker();
  checker.checkBudgets().catch(console.error);
}

module.exports = PerformanceBudgetChecker;

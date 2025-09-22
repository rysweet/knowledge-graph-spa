#!/usr/bin/env node

/**
 * Build Test Suite
 * Tests TypeScript compilation, build process, and functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildTester {
  constructor() {
    this.results = {
      typecheck: { passed: false, errors: [], warnings: [] },
      build: { passed: false, errors: [], warnings: [] },
      tests: { passed: false, errors: [], warnings: [] },
      bundleSize: { passed: false, size: 0, limit: 5000000 } // 5MB limit
    };
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Running: ${command} ${args.join(' ')}`);

      const proc = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseTypeScriptErrors(output) {
    const errors = [];
    const warnings = [];

    // TypeScript error pattern: file.tsx:line:col - error TS####: message
    const errorRegex = /^(.+\.tsx?):(\d+):(\d+)\s*-\s*error\s+TS(\d+):\s*(.+)$/gm;

    let match;
    while ((match = errorRegex.exec(output)) !== null) {
      const [, file, line, col, code, message] = match;
      errors.push({
        file: path.relative(process.cwd(), file),
        line: parseInt(line),
        column: parseInt(col),
        code: `TS${code}`,
        message: message.trim()
      });
    }

    return { errors, warnings };
  }

  async testTypeCheck() {
    console.log('\n📋 Testing TypeScript Compilation...');

    try {
      const result = await this.runCommand('npx', ['tsc', '--noEmit']);

      if (result.success) {
        this.results.typecheck.passed = true;
        console.log('✅ TypeScript compilation passed!');
      } else {
        const parsed = this.parseTypeScriptErrors(result.stdout + result.stderr);
        this.results.typecheck.errors = parsed.errors;
        this.results.typecheck.warnings = parsed.warnings;

        console.log(`❌ TypeScript compilation failed with ${parsed.errors.length} errors`);

        // Group errors by category for reporting
        const errorsByFile = {};
        parsed.errors.forEach(error => {
          if (!errorsByFile[error.file]) {
            errorsByFile[error.file] = [];
          }
          errorsByFile[error.file].push(error);
        });

        console.log('\n📊 Error Summary:');
        Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
          console.log(`  ${file}: ${fileErrors.length} errors`);
          fileErrors.slice(0, 3).forEach(error => {
            console.log(`    - Line ${error.line}: ${error.message}`);
          });
          if (fileErrors.length > 3) {
            console.log(`    ... and ${fileErrors.length - 3} more errors`);
          }
        });
      }
    } catch (error) {
      console.log('❌ TypeScript test failed:', error.message);
      this.results.typecheck.errors.push({ message: error.message });
    }
  }

  async testBuild() {
    console.log('\n🏗️  Testing Production Build...');

    try {
      const result = await this.runCommand('npm', ['run', 'build']);

      if (result.success) {
        this.results.build.passed = true;
        console.log('✅ Production build succeeded!');

        // Check bundle size
        const buildDir = path.join(process.cwd(), 'build');
        if (fs.existsSync(buildDir)) {
          const bundleSize = this.calculateBundleSize(buildDir);
          this.results.bundleSize.size = bundleSize;
          this.results.bundleSize.passed = bundleSize < this.results.bundleSize.limit;

          console.log(`📦 Bundle size: ${(bundleSize / 1024 / 1024).toFixed(2)}MB`);
          if (this.results.bundleSize.passed) {
            console.log('✅ Bundle size within limits');
          } else {
            console.log('⚠️  Bundle size exceeds 5MB limit');
          }
        }
      } else {
        console.log('❌ Production build failed');
        this.results.build.errors.push({ message: result.stderr });
      }
    } catch (error) {
      console.log('❌ Build test failed:', error.message);
      this.results.build.errors.push({ message: error.message });
    }
  }

  calculateBundleSize(buildDir) {
    let totalSize = 0;

    function getSize(dirPath) {
      const items = fs.readdirSync(dirPath);

      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          getSize(itemPath);
        } else {
          totalSize += stats.size;
        }
      });
    }

    getSize(buildDir);
    return totalSize;
  }

  async testJestTests() {
    console.log('\n🧪 Testing Jest Tests...');

    try {
      const result = await this.runCommand('npm', ['test', '--', '--watchAll=false', '--passWithNoTests']);

      if (result.success) {
        this.results.tests.passed = true;
        console.log('✅ Jest tests passed!');
      } else {
        console.log('❌ Jest tests failed');
        this.results.tests.errors.push({ message: result.stderr });
      }
    } catch (error) {
      console.log('❌ Jest test failed:', error.message);
      this.results.tests.errors.push({ message: error.message });
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BUILD TEST REPORT');
    console.log('='.repeat(60));

    const tests = [
      { name: 'TypeScript Compilation', result: this.results.typecheck },
      { name: 'Production Build', result: this.results.build },
      { name: 'Jest Tests', result: this.results.tests },
      { name: 'Bundle Size', result: this.results.bundleSize }
    ];

    let allPassed = true;

    tests.forEach(test => {
      const status = test.result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);

      if (!test.result.passed) {
        allPassed = false;
        if (test.result.errors && test.result.errors.length > 0) {
          console.log(`     Errors: ${test.result.errors.length}`);
        }
      }
    });

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED - Build is clean!');
      process.exit(0);
    } else {
      console.log('💥 BUILD TESTS FAILED - Issues need to be fixed');

      // Show most critical errors
      if (this.results.typecheck.errors.length > 0) {
        console.log(`\n🔥 TypeScript errors (${this.results.typecheck.errors.length} total):`);
        this.results.typecheck.errors.slice(0, 10).forEach(error => {
          console.log(`  • ${error.file}:${error.line} - ${error.message}`);
        });
        if (this.results.typecheck.errors.length > 10) {
          console.log(`  ... and ${this.results.typecheck.errors.length - 10} more errors`);
        }
      }

      process.exit(1);
    }
  }

  async run() {
    console.log('🚀 Starting Build Test Suite...\n');

    // Run tests in sequence
    await this.testTypeCheck();

    // Only run build test if typecheck passes or we want to see all errors
    if (process.argv.includes('--all')) {
      await this.testBuild();
      await this.testJestTests();
    }

    this.generateReport();
  }
}

// Run the build tester
const tester = new BuildTester();
tester.run().catch(error => {
  console.error('❌ Build test suite failed:', error);
  process.exit(1);
});
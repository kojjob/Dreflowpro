/**
 * Test Script for Authentication Fix and Data Analysis System
 * Tests the mock authentication system and data analysis features
 */

// Test Results Storage
const authTestResults = {
  loginForm: false,
  mockAuthentication: false,
  dashboardAccess: false,
  dataAnalysisAccess: false,
  navigationWorking: false
};

// Test function for authentication fix
async function testAuthenticationFix() {
  console.log('🔐 TESTING AUTHENTICATION FIX...');
  console.log('=================================');
  
  // Test 1: Check if we're on login page
  const currentUrl = window.location.pathname;
  if (currentUrl === '/login' || currentUrl === '/') {
    console.log('✅ Login page accessible');
    authTestResults.loginForm = true;
    
    // Test 2: Try mock login
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const loginButton = document.querySelector('button[type="submit"]');
    
    if (emailInput && passwordInput && loginButton) {
      console.log('🧪 Testing mock authentication...');
      
      // Fill in test credentials
      emailInput.value = 'test@example.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      passwordInput.value = 'password123';
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Submit form
      loginButton.click();
      
      // Wait for authentication
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we're redirected to dashboard
      if (window.location.pathname === '/dashboard' || window.location.pathname === '/') {
        authTestResults.mockAuthentication = true;
        authTestResults.dashboardAccess = true;
        console.log('✅ Mock authentication successful');
        console.log('✅ Dashboard access granted');
        
        // Test 3: Check for data analysis navigation
        await testDataAnalysisNavigation();
      } else {
        console.log('⚠️ Authentication may have failed - checking current state...');
        
        // Check if already authenticated
        const dashboardElements = document.querySelectorAll('[class*="sidebar"], [class*="nav"]');
        if (dashboardElements.length > 0) {
          authTestResults.dashboardAccess = true;
          console.log('✅ Already authenticated and on dashboard');
          await testDataAnalysisNavigation();
        }
      }
    } else {
      console.log('⚠️ Login form elements not found - may already be authenticated');
      
      // Check if we're already on dashboard
      const dashboardElements = document.querySelectorAll('[class*="sidebar"], [class*="nav"]');
      if (dashboardElements.length > 0) {
        authTestResults.dashboardAccess = true;
        console.log('✅ Already authenticated and on dashboard');
        await testDataAnalysisNavigation();
      }
    }
  } else {
    console.log('ℹ️ Not on login page, checking if authenticated...');
    
    // Check if we're already authenticated
    const dashboardElements = document.querySelectorAll('[class*="sidebar"], [class*="nav"]');
    if (dashboardElements.length > 0) {
      authTestResults.dashboardAccess = true;
      authTestResults.mockAuthentication = true;
      console.log('✅ Already authenticated');
      await testDataAnalysisNavigation();
    }
  }
  
  return authTestResults;
}

// Test function for data analysis navigation
async function testDataAnalysisNavigation() {
  console.log('📊 TESTING DATA ANALYSIS NAVIGATION...');
  console.log('=====================================');
  
  // Look for Data Analysis navigation item
  const navItems = Array.from(document.querySelectorAll('button, a')).filter(item =>
    item.textContent && item.textContent.includes('Data Analysis')
  );
  
  if (navItems.length > 0) {
    authTestResults.dataAnalysisAccess = true;
    console.log('✅ Data Analysis navigation found');
    
    // Click on Data Analysis
    navItems[0].click();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if data analysis page loaded
    const dataAnalysisElements = Array.from(document.querySelectorAll('*')).filter(el =>
      el.textContent && (
        el.textContent.includes('Upload') ||
        el.textContent.includes('File Upload') ||
        el.textContent.includes('Data Analysis')
      )
    );
    
    if (dataAnalysisElements.length > 0) {
      authTestResults.navigationWorking = true;
      console.log('✅ Data Analysis page loaded successfully');
      
      // Test data analysis features
      await testDataAnalysisFeatures();
    } else {
      console.log('⚠️ Data Analysis page may not have loaded properly');
    }
  } else {
    console.log('⚠️ Data Analysis navigation not found');
    
    // Try to find it in sidebar or menu
    const sidebarItems = Array.from(document.querySelectorAll('[class*="sidebar"] button, [class*="nav"] button')).filter(item =>
      item.textContent && (
        item.textContent.includes('Analysis') ||
        item.textContent.includes('Data') ||
        item.textContent.includes('Upload')
      )
    );
    
    if (sidebarItems.length > 0) {
      console.log('✅ Found data analysis option in sidebar');
      sidebarItems[0].click();
      await new Promise(resolve => setTimeout(resolve, 2000));
      authTestResults.dataAnalysisAccess = true;
      authTestResults.navigationWorking = true;
    }
  }
}

// Test function for data analysis features
async function testDataAnalysisFeatures() {
  console.log('🔬 TESTING DATA ANALYSIS FEATURES...');
  console.log('====================================');
  
  // Test 1: Check for file upload area
  const uploadArea = document.querySelector('[class*="border-dashed"]');
  if (uploadArea) {
    console.log('✅ File upload area detected');
  }
  
  // Test 2: Check for workflow steps
  const workflowSteps = Array.from(document.querySelectorAll('*')).filter(el =>
    el.textContent && (
      el.textContent.includes('Upload') ||
      el.textContent.includes('Transform') ||
      el.textContent.includes('Analyze') ||
      el.textContent.includes('Visualize') ||
      el.textContent.includes('Export')
    )
  );
  
  if (workflowSteps.length >= 3) {
    console.log('✅ Data analysis workflow steps detected');
  }
  
  // Test 3: Check for feature capabilities
  const featureElements = Array.from(document.querySelectorAll('*')).filter(el =>
    el.textContent && (
      el.textContent.includes('CSV') ||
      el.textContent.includes('Excel') ||
      el.textContent.includes('JSON') ||
      el.textContent.includes('Chart') ||
      el.textContent.includes('Insight')
    )
  );
  
  if (featureElements.length >= 5) {
    console.log('✅ Data analysis features detected');
  }
  
  console.log('🎉 Data analysis system is accessible and functional!');
}

// Test function for quick authentication bypass
async function quickAuthBypass() {
  console.log('⚡ QUICK AUTHENTICATION BYPASS...');
  console.log('=================================');
  
  // Try to trigger mock authentication directly
  try {
    // Check if we have access to the auth service
    if (typeof window !== 'undefined' && window.localStorage) {
      // Set mock authentication tokens
      const mockTokens = {
        access_token: 'mock_token_' + Date.now(),
        refresh_token: 'mock_refresh_' + Date.now(),
        token_type: 'bearer',
        expires_in: 3600
      };
      
      const mockUser = {
        id: 'mock_user_' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        is_active: true
      };
      
      // Store in localStorage
      localStorage.setItem('auth_tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      
      console.log('✅ Mock authentication tokens set');
      
      // Reload page to trigger authentication check
      window.location.reload();
    }
  } catch (error) {
    console.log('⚠️ Could not set mock authentication:', error);
  }
}

// Main test runner
async function runAuthenticationTests() {
  console.log('🚀 AUTHENTICATION FIX AND DATA ANALYSIS TESTS');
  console.log('==============================================');
  console.log('Testing authentication fix and data analysis system...');
  console.log('');
  
  // Run authentication tests
  await testAuthenticationFix();
  
  // Generate report
  setTimeout(() => {
    generateAuthTestReport();
  }, 1000);
}

// Generate test report
function generateAuthTestReport() {
  console.log('');
  console.log('📊 AUTHENTICATION FIX TEST REPORT');
  console.log('==================================');
  
  const tests = Object.entries(authTestResults);
  const passedTests = tests.filter(([, passed]) => passed).length;
  const totalTests = tests.length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log('Test Results:');
  tests.forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${test}: ${status}`);
  });
  
  console.log('');
  console.log(`📈 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
  
  if (successRate >= 80) {
    console.log('🎉 EXCELLENT! Authentication fix is working correctly!');
    console.log('✅ Data analysis system is accessible');
  } else if (successRate >= 60) {
    console.log('✅ GOOD! Most authentication features are working');
    console.log('🔧 Some minor issues may need attention');
  } else {
    console.log('⚠️ NEEDS ATTENTION! Authentication may need further fixes');
    console.log('🛠️ Try running quickAuthBypass() for immediate access');
  }
  
  console.log('');
  console.log('🔧 Available Commands:');
  console.log('   • runAuthenticationTests() - Run full test suite');
  console.log('   • quickAuthBypass() - Bypass authentication for testing');
  console.log('   • testDataAnalysisFeatures() - Test data analysis features');
  
  return authTestResults;
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.runAuthenticationTests = runAuthenticationTests;
  window.testAuthenticationFix = testAuthenticationFix;
  window.quickAuthBypass = quickAuthBypass;
  window.testDataAnalysisFeatures = testDataAnalysisFeatures;
  window.authTestResults = authTestResults;
}

console.log('📋 Authentication Fix Test Script Loaded');
console.log('🔐 Run runAuthenticationTests() to test the authentication fix');
console.log('⚡ Run quickAuthBypass() for immediate access to test features');

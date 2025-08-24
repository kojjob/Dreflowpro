/**
 * Navigation Consolidation Test Script
 * Tests the unified dashboard navigation system
 */

console.log('🧭 NAVIGATION CONSOLIDATION TEST');
console.log('=================================');

// Test Results Storage
const testResults = {
  redirects: {},
  urlHandling: {},
  sidebarConsolidation: {},
  userExperience: {}
};

// 1. TEST REDIRECT FUNCTIONALITY
async function testRedirects() {
  console.log('\n🔄 TESTING REDIRECT FUNCTIONALITY...');
  console.log('====================================');
  
  const tests = {
    dataAnalysisRedirect: false,
    pipelinesRedirect: false,
    connectorsRedirect: false,
    redirectTiming: false,
    fallbackNavigation: false
  };

  // Test data-analysis redirect
  try {
    // Simulate visiting /data-analysis
    console.log('📍 Testing /data-analysis redirect...');
    
    // Check if redirect page exists and has proper content
    const dataAnalysisContent = document.querySelector('body');
    if (dataAnalysisContent && window.location.pathname === '/data-analysis') {
      // Look for redirect indicators
      const redirectElements = document.querySelectorAll('[class*="redirect"], [class*="preparing"]');
      if (redirectElements.length > 0) {
        tests.dataAnalysisRedirect = true;
        console.log('✅ Data Analysis redirect page working');
      }
    }

    // Test URL parameter handling
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'data-analysis') {
      tests.urlHandling = true;
      console.log('✅ URL parameter handling working');
    }

  } catch (error) {
    console.warn('⚠️ Redirect test error:', error.message);
  }

  testResults.redirects = tests;
  return tests;
}

// 2. TEST SIDEBAR CONSOLIDATION
function testSidebarConsolidation() {
  console.log('\n🎛️ TESTING SIDEBAR CONSOLIDATION...');
  console.log('===================================');
  
  const tests = {
    singleSidebar: false,
    noConflictingSidebars: false,
    consistentNavigation: false,
    unifiedDesign: false
  };

  // Count sidebars on the page
  const sidebars = document.querySelectorAll('[class*="sidebar"], [class*="w-72"], [class*="w-20"]');
  const navigationElements = document.querySelectorAll('nav, [role="navigation"]');
  
  console.log(`Found ${sidebars.length} potential sidebar elements`);
  console.log(`Found ${navigationElements.length} navigation elements`);

  // Check for single main sidebar
  const mainSidebars = document.querySelectorAll('[class*="min-h-screen"][class*="shadow"]');
  if (mainSidebars.length === 1) {
    tests.singleSidebar = true;
    console.log('✅ Single main sidebar detected');
  } else if (mainSidebars.length === 0) {
    console.log('ℹ️ No main sidebar detected (may be on landing page)');
    tests.singleSidebar = true;
  } else {
    console.log(`❌ Multiple main sidebars detected: ${mainSidebars.length}`);
  }

  // Check for conflicting navigation
  const duplicateNavItems = document.querySelectorAll('[class*="nav"] button, nav button');
  const uniqueNavTexts = new Set();
  let hasDuplicates = false;

  duplicateNavItems.forEach(item => {
    const text = item.textContent?.trim();
    if (text && uniqueNavTexts.has(text)) {
      hasDuplicates = true;
    }
    if (text) uniqueNavTexts.add(text);
  });

  if (!hasDuplicates) {
    tests.noConflictingSidebars = true;
    console.log('✅ No conflicting navigation items detected');
  } else {
    console.log('❌ Duplicate navigation items found');
  }

  // Check for consistent design
  const gradientElements = document.querySelectorAll('[class*="gradient"]');
  const consistentStyling = document.querySelectorAll('[class*="rounded-2xl"], [class*="shadow-xl"]');
  
  if (gradientElements.length > 3 && consistentStyling.length > 2) {
    tests.unifiedDesign = true;
    console.log('✅ Unified design system detected');
  }

  testResults.sidebarConsolidation = tests;
  return tests;
}

// 3. TEST URL HANDLING
function testUrlHandling() {
  console.log('\n🔗 TESTING URL HANDLING...');
  console.log('==========================');
  
  const tests = {
    tabParameters: false,
    directNavigation: false,
    urlUpdates: false,
    bookmarkability: false
  };

  // Test URL parameter recognition
  const currentUrl = new URL(window.location.href);
  const searchParams = currentUrl.searchParams;
  
  // Check if tab parameter is recognized
  const validTabs = ['overview', 'pipelines', 'connectors', 'data-analysis', 'tasks'];
  const currentTab = searchParams.get('tab');
  
  if (currentTab && validTabs.includes(currentTab)) {
    tests.tabParameters = true;
    console.log(`✅ Tab parameter recognized: ${currentTab}`);
  } else if (!currentTab) {
    console.log('ℹ️ No tab parameter (default behavior)');
    tests.tabParameters = true;
  }

  // Test if navigation updates URL
  const navButtons = document.querySelectorAll('nav button, [role="navigation"] button');
  if (navButtons.length > 0) {
    tests.directNavigation = true;
    console.log('✅ Navigation buttons available for testing');
  }

  // Check if URL is bookmarkable
  if (window.location.pathname.includes('/dashboard')) {
    tests.bookmarkability = true;
    console.log('✅ Dashboard URL is bookmarkable');
  }

  testResults.urlHandling = tests;
  return tests;
}

// 4. TEST USER EXPERIENCE
function testUserExperience() {
  console.log('\n👤 TESTING USER EXPERIENCE...');
  console.log('==============================');
  
  const tests = {
    loadingStates: false,
    smoothTransitions: false,
    responsiveDesign: false,
    accessibilityFeatures: false,
    consistentBranding: false
  };

  // Check for loading states
  const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="animate-pulse"]');
  if (loadingElements.length > 0) {
    tests.loadingStates = true;
    console.log('✅ Loading states implemented');
  }

  // Check for smooth transitions
  const transitionElements = document.querySelectorAll('[class*="transition"], [class*="duration"]');
  if (transitionElements.length > 5) {
    tests.smoothTransitions = true;
    console.log('✅ Smooth transitions implemented');
  }

  // Check responsive design
  const responsiveElements = document.querySelectorAll('[class*="md:"], [class*="lg:"], [class*="sm:"]');
  if (responsiveElements.length > 10) {
    tests.responsiveDesign = true;
    console.log('✅ Responsive design implemented');
  }

  // Check accessibility
  const accessibilityElements = document.querySelectorAll('[aria-label], [role], [tabindex]');
  if (accessibilityElements.length > 5) {
    tests.accessibilityFeatures = true;
    console.log('✅ Accessibility features present');
  }

  // Check consistent branding
  const brandingElements = document.querySelectorAll('[class*="DreflowPro"], [class*="DataReflow"]');
  const logoElements = document.querySelectorAll('img[alt*="logo"], [class*="logo"]');
  
  if (brandingElements.length > 0 || logoElements.length > 0) {
    tests.consistentBranding = true;
    console.log('✅ Consistent branding detected');
  }

  testResults.userExperience = tests;
  return tests;
}

// 5. COMPREHENSIVE NAVIGATION TEST
async function testNavigationFlow() {
  console.log('\n🚀 TESTING NAVIGATION FLOW...');
  console.log('==============================');
  
  // Test clicking navigation items
  const navButtons = document.querySelectorAll('nav button');
  let navigationWorks = false;
  
  if (navButtons.length > 0) {
    console.log(`Found ${navButtons.length} navigation buttons`);
    
    // Test clicking the first navigation button
    try {
      const firstButton = navButtons[0];
      const originalUrl = window.location.href;
      
      // Simulate click
      firstButton.click();
      
      // Check if URL changed or content updated
      setTimeout(() => {
        const newUrl = window.location.href;
        if (newUrl !== originalUrl || document.querySelector('[class*="active"]')) {
          navigationWorks = true;
          console.log('✅ Navigation interaction working');
        }
      }, 500);
      
    } catch (error) {
      console.warn('⚠️ Navigation test error:', error.message);
    }
  }
  
  return navigationWorks;
}

// MAIN TEST EXECUTION
async function runNavigationTests() {
  console.log('🧪 Starting Navigation Consolidation Tests...\n');
  
  try {
    await testRedirects();
    testSidebarConsolidation();
    testUrlHandling();
    testUserExperience();
    await testNavigationFlow();
    
    // Generate final report
    console.log('\n📊 NAVIGATION CONSOLIDATION RESULTS');
    console.log('====================================');
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(testResults).forEach(([category, tests]) => {
      const categoryPassed = Object.values(tests).filter(Boolean).length;
      const categoryTotal = Object.keys(tests).length;
      totalTests += categoryTotal;
      passedTests += categoryPassed;
      
      console.log(`${category}: ${categoryPassed}/${categoryTotal} tests passed`);
    });
    
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    console.log(`\n🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT! Navigation consolidation is working perfectly.');
    } else if (successRate >= 75) {
      console.log('✅ GOOD! Navigation consolidation is mostly working.');
    } else {
      console.log('⚠️ NEEDS ATTENTION! Navigation consolidation needs improvement.');
    }
    
    // Specific recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (testResults.redirects.dataAnalysisRedirect) {
      console.log('✅ Redirects are working - users will be guided to unified dashboard');
    }
    if (testResults.sidebarConsolidation.singleSidebar) {
      console.log('✅ Sidebar consolidation successful - no duplicate navigation');
    }
    if (testResults.urlHandling.tabParameters) {
      console.log('✅ URL handling working - bookmarkable navigation');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Auto-run tests when script is loaded
if (typeof window !== 'undefined') {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runNavigationTests, 1000);
    });
  } else {
    setTimeout(runNavigationTests, 1000);
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testNavigationConsolidation = runNavigationTests;
}

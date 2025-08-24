/**
 * Test script to verify the pipeline creation fix
 * This script tests that the pipeline display no longer crashes
 */

// Test function to check if pipelines display correctly
function testPipelineDisplay() {
  console.log('🧪 Testing Pipeline Display Fix...');
  
  // Check if we're on the dashboard page
  const dashboardElements = document.querySelectorAll('h2');
  const hasPipelineSection = Array.from(dashboardElements).some(h2 => 
    h2.textContent.includes('ETL Pipelines')
  );
  
  if (!hasPipelineSection) {
    console.log('⚠️ Not on dashboard page or pipelines section not found');
    return false;
  }
  
  console.log('✅ Found ETL Pipelines section');
  
  // Check for any JavaScript errors in console
  const originalError = console.error;
  let errorCount = 0;
  
  console.error = function(...args) {
    if (args[0] && args[0].toString().includes('Cannot read properties of undefined')) {
      errorCount++;
      console.log('❌ Found pipeline display error:', args[0]);
    }
    originalError.apply(console, args);
  };
  
  // Wait a bit to see if any errors occur
  setTimeout(() => {
    console.error = originalError;
    
    if (errorCount === 0) {
      console.log('✅ No pipeline display errors detected!');
      
      // Check if Create Pipeline button is working
      const createButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.includes('Create Pipeline')
      );
      
      if (createButtons.length > 0) {
        console.log('✅ Create Pipeline button found');
        
        // Test clicking the button
        try {
          createButtons[0].click();
          
          setTimeout(() => {
            const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
            if (modal) {
              console.log('✅ Enhanced pipeline builder modal opened successfully!');
              
              // Check for the new three-panel layout
              const panels = document.querySelectorAll('.grid-cols-1.lg\\:grid-cols-3');
              if (panels.length > 0) {
                console.log('✅ Three-panel layout detected');
                
                // Check for step builder buttons
                const addSourceBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                  btn.textContent.includes('Add Source')
                );
                const addTransformBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                  btn.textContent.includes('Add Transform')
                );
                const addDestinationBtn = Array.from(document.querySelectorAll('button')).find(btn =>
                  btn.textContent.includes('Add Destination')
                );
                
                if (addSourceBtn && addTransformBtn && addDestinationBtn) {
                  console.log('✅ All step builder buttons found');
                  console.log('🎉 Pipeline creation fix is working correctly!');
                  
                  // Close the modal
                  const closeButton = document.querySelector('button:contains("×")') ||
                                     Array.from(document.querySelectorAll('button')).find(btn =>
                                       btn.textContent.includes('Cancel')
                                     );
                  if (closeButton) {
                    closeButton.click();
                    console.log('🔄 Modal closed');
                  }
                  
                  return true;
                } else {
                  console.error('❌ Step builder buttons not found');
                  return false;
                }
              } else {
                console.error('❌ Three-panel layout not detected');
                return false;
              }
            } else {
              console.error('❌ Modal did not open');
              return false;
            }
          }, 500);
        } catch (error) {
          console.error('❌ Error clicking Create Pipeline button:', error);
          return false;
        }
      } else {
        console.error('❌ Create Pipeline button not found');
        return false;
      }
    } else {
      console.error(`❌ Found ${errorCount} pipeline display errors`);
      return false;
    }
  }, 2000);
}

// Test function to check pipeline data structure
function testPipelineDataStructure() {
  console.log('🔍 Testing Pipeline Data Structure...');
  
  // Look for pipeline cards
  const pipelineCards = document.querySelectorAll('[class*="grid-cols-1"][class*="lg:grid-cols-2"] > div');
  
  if (pipelineCards.length > 0) {
    console.log(`✅ Found ${pipelineCards.length} pipeline card(s)`);
    
    // Check if pipeline cards display without errors
    let hasErrors = false;
    pipelineCards.forEach((card, index) => {
      const errorElements = card.querySelectorAll('[class*="text-red"]');
      if (errorElements.length > 0) {
        console.log(`⚠️ Pipeline card ${index + 1} may have display issues`);
        hasErrors = true;
      }
    });
    
    if (!hasErrors) {
      console.log('✅ All pipeline cards display correctly');
      return true;
    } else {
      console.log('⚠️ Some pipeline cards may have display issues');
      return false;
    }
  } else {
    console.log('ℹ️ No existing pipelines found (this is normal for new installations)');
    return true;
  }
}

// Test function to verify API integration
function testPipelineAPIIntegration() {
  console.log('🔗 Testing Pipeline API Integration...');
  
  // Check if fetch requests are being made without errors
  const originalFetch = window.fetch;
  let apiCallCount = 0;
  let apiErrors = 0;
  
  window.fetch = function(...args) {
    if (args[0] && args[0].toString().includes('/api/v1/pipelines')) {
      apiCallCount++;
      console.log(`📡 Pipeline API call detected: ${args[0]}`);
    }
    
    return originalFetch.apply(this, args).catch(error => {
      if (args[0] && args[0].toString().includes('/api/v1/pipelines')) {
        apiErrors++;
        console.error('❌ Pipeline API error:', error);
      }
      throw error;
    });
  };
  
  // Restore original fetch after a delay
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log(`📊 API Integration Summary: ${apiCallCount} calls, ${apiErrors} errors`);
  }, 5000);
}

// Main test function
function runPipelineFixTests() {
  console.log('🚀 Starting Pipeline Fix Verification Tests...');
  console.log('==============================================');
  
  // Test 1: Pipeline display
  testPipelineDisplay();
  
  // Test 2: Pipeline data structure
  setTimeout(() => {
    testPipelineDataStructure();
  }, 1000);
  
  // Test 3: API integration
  setTimeout(() => {
    testPipelineAPIIntegration();
  }, 2000);
  
  console.log('📋 Tests initiated. Check console output for results.');
}

// Auto-run if this script is executed
if (typeof window !== 'undefined') {
  console.log('📋 Pipeline Fix Test Script Loaded');
  console.log('Run runPipelineFixTests() to start testing');
  
  // Provide helper functions globally
  window.testPipelineFix = runPipelineFixTests;
  window.testPipelineDisplay = testPipelineDisplay;
  window.testPipelineData = testPipelineDataStructure;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testPipelineDisplay,
    testPipelineDataStructure,
    testPipelineAPIIntegration,
    runPipelineFixTests
  };
}

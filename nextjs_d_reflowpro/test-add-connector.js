/**
 * Test script to verify the Add Connector button functionality
 * This script can be run in the browser console to test the button
 */

// Test function to simulate clicking the Add Connector button
function testAddConnectorButton() {
  console.log('🧪 Testing Add Connector Button Functionality...');
  
  // Find the Add Connector button
  const addButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Add Connector') || btn.textContent.includes('Add Your First Connector')
  );
  
  if (addButtons.length === 0) {
    console.error('❌ No Add Connector buttons found on the page');
    return false;
  }
  
  console.log(`✅ Found ${addButtons.length} Add Connector button(s)`);
  
  // Test clicking the first Add Connector button
  const button = addButtons[0];
  console.log('🖱️ Clicking Add Connector button...');
  
  // Simulate click
  button.click();
  
  // Wait a bit for the modal to appear
  setTimeout(() => {
    // Check if modal appeared
    const modal = document.querySelector('[class*="fixed"][class*="inset-0"]') || 
                  document.querySelector('[class*="modal"]') ||
                  document.querySelector('div:has(h2:contains("Create New Connector"))');
    
    if (modal) {
      console.log('✅ Modal opened successfully!');
      
      // Check for template selection
      const templates = document.querySelectorAll('[class*="cursor-pointer"]:has(h4)');
      if (templates.length > 0) {
        console.log(`✅ Found ${templates.length} connector templates`);
        
        // Test selecting a template
        console.log('🖱️ Clicking PostgreSQL template...');
        const postgresTemplate = Array.from(templates).find(t => 
          t.textContent.includes('PostgreSQL')
        );
        
        if (postgresTemplate) {
          postgresTemplate.click();
          
          setTimeout(() => {
            // Check if form appeared
            const nameInput = document.querySelector('input[placeholder*="Connector"]') ||
                             document.querySelector('input[type="text"]');
            
            if (nameInput) {
              console.log('✅ Connector form loaded successfully!');
              console.log('✅ All tests passed! The Add Connector button is working correctly.');
              
              // Close the modal
              const closeButton = document.querySelector('button:contains("×")') ||
                                 document.querySelector('button:contains("Cancel")');
              if (closeButton) {
                closeButton.click();
                console.log('🔄 Modal closed');
              }
              
              return true;
            } else {
              console.error('❌ Form did not load after template selection');
              return false;
            }
          }, 500);
        } else {
          console.error('❌ PostgreSQL template not found');
          return false;
        }
      } else {
        console.error('❌ No connector templates found in modal');
        return false;
      }
    } else {
      console.error('❌ Modal did not open after clicking button');
      return false;
    }
  }, 500);
}

// Test function to check if the component is properly loaded
function checkConnectorManagerLoaded() {
  console.log('🔍 Checking if ConnectorManager component is loaded...');
  
  // Look for key elements that indicate the component is loaded
  const indicators = [
    document.querySelector('h2:contains("Data Connectors")'),
    document.querySelector('button:contains("Add Connector")'),
    document.querySelector('[data-testid="database-icon"]'),
    document.querySelector('div:contains("Total Connectors")')
  ];
  
  const loadedCount = indicators.filter(el => el !== null).length;
  
  if (loadedCount > 0) {
    console.log(`✅ ConnectorManager component appears to be loaded (${loadedCount}/4 indicators found)`);
    return true;
  } else {
    console.error('❌ ConnectorManager component does not appear to be loaded');
    return false;
  }
}

// Main test function
function runAddConnectorTests() {
  console.log('🚀 Starting Add Connector Button Tests...');
  console.log('=====================================');
  
  // First check if the component is loaded
  if (!checkConnectorManagerLoaded()) {
    console.log('⚠️ Component not loaded. Make sure you are on the connectors page.');
    return;
  }
  
  // Run the button test
  testAddConnectorButton();
}

// Auto-run if this script is executed
if (typeof window !== 'undefined') {
  console.log('📋 Add Connector Button Test Script Loaded');
  console.log('Run runAddConnectorTests() to start testing');
  
  // Provide helper functions globally
  window.testAddConnector = runAddConnectorTests;
  window.checkConnectorManager = checkConnectorManagerLoaded;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAddConnectorButton,
    checkConnectorManagerLoaded,
    runAddConnectorTests
  };
}

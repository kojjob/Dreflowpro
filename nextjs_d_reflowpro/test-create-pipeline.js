/**
 * Test script to verify the Create Pipeline button functionality
 * This script can be run in the browser console to test the button
 */

// Test function to simulate clicking the Create Pipeline button
function testCreatePipelineButton() {
  console.log('🧪 Testing Enhanced Create Pipeline Button Functionality...');

  // Find the Create Pipeline button
  const createButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
    btn.textContent.includes('Create Pipeline') || btn.textContent.includes('Create Your First Pipeline')
  );

  if (createButtons.length === 0) {
    console.error('❌ No Create Pipeline buttons found on the page');
    return false;
  }

  console.log(`✅ Found ${createButtons.length} Create Pipeline button(s)`);

  // Test clicking the first Create Pipeline button
  const button = createButtons[0];
  console.log('🖱️ Clicking Create Pipeline button...');

  // Simulate click
  button.click();

  // Wait a bit for the modal to appear
  setTimeout(() => {
    // Check if enhanced modal appeared
    const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');

    if (modal) {
      console.log('✅ Enhanced pipeline builder modal opened successfully!');

      // Check for basic form fields
      const nameInput = document.querySelector('input[placeholder*="Pipeline"]');
      if (nameInput) {
        console.log('✅ Pipeline name input found');
      }

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
        console.log('✅ All step builder buttons found (Source, Transform, Destination)');

        // Test adding a source step
        console.log('🖱️ Testing Add Source step...');
        addSourceBtn.click();

        setTimeout(() => {
          // Check if step was added to pipeline flow
          const pipelineFlow = document.querySelector('h3:contains("Pipeline Flow")');
          if (pipelineFlow) {
            const stepCards = document.querySelectorAll('[class*="border-green-200"]');
            if (stepCards.length > 0) {
              console.log('✅ Source step added to pipeline flow');

              // Test adding a transform step
              console.log('🖱️ Testing Add Transform step...');
              addTransformBtn.click();

              setTimeout(() => {
                const transformSteps = document.querySelectorAll('[class*="border-purple-200"]');
                if (transformSteps.length > 0) {
                  console.log('✅ Transform step added to pipeline flow');

                  // Test adding a destination step
                  console.log('🖱️ Testing Add Destination step...');
                  addDestinationBtn.click();

                  setTimeout(() => {
                    const destinationSteps = document.querySelectorAll('[class*="border-orange-200"]');
                    if (destinationSteps.length > 0) {
                      console.log('✅ Destination step added to pipeline flow');
                      console.log('✅ Multi-step pipeline builder working correctly!');

                      // Test step configuration
                      const editButtons = document.querySelectorAll('button[title*="Edit"], button:has(svg)');
                      if (editButtons.length > 0) {
                        console.log('✅ Step edit buttons found');

                        // Test scheduling
                        const scheduleCheckbox = document.querySelector('input[type="checkbox"]');
                        if (scheduleCheckbox) {
                          console.log('✅ Scheduling checkbox found');
                          scheduleCheckbox.click();

                          setTimeout(() => {
                            const cronInput = document.querySelector('input[placeholder*="0 0"]');
                            if (cronInput) {
                              console.log('✅ Cron schedule input appears when scheduling is enabled');
                            }

                            console.log('🎉 All enhanced pipeline builder tests passed!');

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
                          }, 300);
                        }
                      }
                    } else {
                      console.error('❌ Destination step not added');
                    }
                  }, 300);
                } else {
                  console.error('❌ Transform step not added');
                }
              }, 300);
            } else {
              console.error('❌ Source step not added to pipeline flow');
            }
          } else {
            console.error('❌ Pipeline flow section not found');
          }
        }, 300);
      } else {
        console.error('❌ Step builder buttons not found');
        console.log('Missing buttons:', {
          addSource: !!addSourceBtn,
          addTransform: !!addTransformBtn,
          addDestination: !!addDestinationBtn
        });
      }
    } else {
      console.error('❌ Enhanced modal did not open after clicking button');
      return false;
    }
  }, 500);
}

// Test function to check if the component is properly loaded
function checkPipelineManagerLoaded() {
  console.log('🔍 Checking if PipelineManager component is loaded...');
  
  // Look for key elements that indicate the component is loaded
  const indicators = [
    document.querySelector('h2:contains("ETL Pipelines")'),
    document.querySelector('button:contains("Create Pipeline")'),
    document.querySelector('div:contains("Manage and monitor your data transformation pipelines")'),
    document.querySelector('[data-testid="database-icon"]')
  ];
  
  const loadedCount = indicators.filter(el => el !== null).length;
  
  if (loadedCount > 0) {
    console.log(`✅ PipelineManager component appears to be loaded (${loadedCount}/4 indicators found)`);
    return true;
  } else {
    console.error('❌ PipelineManager component does not appear to be loaded');
    return false;
  }
}

// Test function to verify API integration
function testPipelineAPIIntegration() {
  console.log('🔗 Testing Pipeline API Integration...');
  
  // Check if the API service is available
  if (typeof window !== 'undefined' && window.apiService) {
    console.log('✅ API service is available');
    
    // Test if pipeline methods exist
    const methods = ['getPipelines', 'createPipeline', 'deletePipeline', 'executePipeline'];
    const availableMethods = methods.filter(method => 
      typeof window.apiService[method] === 'function'
    );
    
    console.log(`✅ Available API methods: ${availableMethods.join(', ')}`);
    
    if (availableMethods.length === methods.length) {
      console.log('✅ All required API methods are available');
      return true;
    } else {
      console.warn(`⚠️ Some API methods are missing: ${methods.filter(m => !availableMethods.includes(m)).join(', ')}`);
      return false;
    }
  } else {
    console.error('❌ API service is not available');
    return false;
  }
}

// Test function to simulate form filling
function testPipelineFormFilling() {
  console.log('📝 Testing Pipeline Form Filling...');
  
  // Find and click the Create Pipeline button
  const createButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Create Pipeline')
  );
  
  if (!createButton) {
    console.error('❌ Create Pipeline button not found');
    return false;
  }
  
  createButton.click();
  
  setTimeout(() => {
    // Fill out the form
    const nameInput = document.querySelector('input[type="text"]');
    if (nameInput) {
      nameInput.value = 'Test ETL Pipeline';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Pipeline name filled');
    }
    
    const descriptionInput = document.querySelector('textarea');
    if (descriptionInput) {
      descriptionInput.value = 'This is a test pipeline for verification';
      descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Description filled');
    }
    
    // Check if connectors are loaded
    setTimeout(() => {
      const sourceSelect = Array.from(document.querySelectorAll('select')).find(select =>
        select.previousElementSibling?.textContent?.includes('Source')
      );
      
      if (sourceSelect && sourceSelect.options.length > 1) {
        sourceSelect.selectedIndex = 1;
        sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Source connector selected');
      }
      
      const destinationSelect = Array.from(document.querySelectorAll('select')).find(select =>
        select.previousElementSibling?.textContent?.includes('Destination')
      );
      
      if (destinationSelect && destinationSelect.options.length > 1) {
        destinationSelect.selectedIndex = 1;
        destinationSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Destination connector selected');
      }
      
      console.log('✅ Form filling test completed');
      
      // Close modal
      const cancelButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Cancel')
      );
      if (cancelButton) {
        cancelButton.click();
        console.log('🔄 Modal closed');
      }
    }, 1000);
  }, 500);
}

// Main test function
function runCreatePipelineTests() {
  console.log('🚀 Starting Create Pipeline Button Tests...');
  console.log('==========================================');
  
  // First check if the component is loaded
  if (!checkPipelineManagerLoaded()) {
    console.log('⚠️ Component not loaded. Make sure you are on the pipelines page.');
    return;
  }
  
  // Test API integration
  testPipelineAPIIntegration();
  
  // Run the button test
  testCreatePipelineButton();
  
  // Test form filling
  setTimeout(() => {
    testPipelineFormFilling();
  }, 2000);
}

// Auto-run if this script is executed
if (typeof window !== 'undefined') {
  console.log('📋 Create Pipeline Button Test Script Loaded');
  console.log('Run runCreatePipelineTests() to start testing');
  
  // Provide helper functions globally
  window.testCreatePipeline = runCreatePipelineTests;
  window.checkPipelineManager = checkPipelineManagerLoaded;
  window.testPipelineForm = testPipelineFormFilling;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCreatePipelineButton,
    checkPipelineManagerLoaded,
    testPipelineAPIIntegration,
    testPipelineFormFilling,
    runCreatePipelineTests
  };
}

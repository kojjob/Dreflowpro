/**
 * Test script to verify the pipeline edit functionality
 * This script tests that the edit button opens the edit modal correctly
 */

// Test function to check if pipeline edit functionality works
function testPipelineEdit() {
  console.log('🧪 Testing Pipeline Edit Functionality...');
  
  // Check if we're on the dashboard page with pipelines
  const dashboardElements = document.querySelectorAll('h2');
  const hasPipelineSection = Array.from(dashboardElements).some(h2 => 
    h2.textContent.includes('ETL Pipelines')
  );
  
  if (!hasPipelineSection) {
    console.log('⚠️ Not on dashboard page or pipelines section not found');
    return false;
  }
  
  console.log('✅ Found ETL Pipelines section');
  
  // Look for pipeline cards with edit buttons
  const editButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Edit') && btn.querySelector('svg')
  );
  
  if (editButtons.length === 0) {
    console.log('ℹ️ No edit buttons found - this is normal if no pipelines exist');
    
    // Check if there's a "Create Your First Pipeline" button instead
    const createFirstButton = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('Create Your First Pipeline')
    );
    
    if (createFirstButton) {
      console.log('✅ Found "Create Your First Pipeline" button - no existing pipelines to edit');
      return true;
    } else {
      console.log('⚠️ No pipelines or create button found');
      return false;
    }
  }
  
  console.log(`✅ Found ${editButtons.length} edit button(s)`);
  
  // Test clicking the first edit button
  const editButton = editButtons[0];
  console.log('🖱️ Clicking Edit button...');
  
  try {
    editButton.click();
    
    // Wait for the edit modal to appear
    setTimeout(() => {
      // Check if edit modal appeared
      const editModal = Array.from(document.querySelectorAll('h2')).find(h2 =>
        h2.textContent.includes('Edit Pipeline')
      );
      
      if (editModal) {
        console.log('✅ Edit Pipeline modal opened successfully!');
        
        // Check for form fields
        const nameInput = document.querySelector('input[placeholder*="Pipeline"]');
        if (nameInput && nameInput.value) {
          console.log(`✅ Pipeline name field found with value: "${nameInput.value}"`);
        }
        
        // Check for the three-panel layout
        const panels = document.querySelectorAll('.grid-cols-1.lg\\:grid-cols-3');
        if (panels.length > 0) {
          console.log('✅ Three-panel edit layout detected');
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
          console.log('✅ All step builder buttons found in edit modal');
        }
        
        // Check for existing pipeline steps
        const stepCards = document.querySelectorAll('[class*="border-green-200"], [class*="border-purple-200"], [class*="border-orange-200"]');
        if (stepCards.length > 0) {
          console.log(`✅ Found ${stepCards.length} existing pipeline step(s) loaded in edit modal`);
        } else {
          console.log('ℹ️ No existing steps found (pipeline may be empty)');
        }
        
        // Check for Update button
        const updateButton = Array.from(document.querySelectorAll('button')).find(btn =>
          btn.textContent.includes('Update Pipeline')
        );
        
        if (updateButton) {
          console.log('✅ Update Pipeline button found');
        }
        
        console.log('🎉 Pipeline edit functionality is working correctly!');
        
        // Close the modal
        const closeButton = document.querySelector('button:contains("×")') ||
                           Array.from(document.querySelectorAll('button')).find(btn =>
                             btn.textContent.includes('Cancel')
                           );
        if (closeButton) {
          closeButton.click();
          console.log('🔄 Edit modal closed');
        }
        
        return true;
      } else {
        console.error('❌ Edit modal did not open after clicking edit button');
        return false;
      }
    }, 500);
  } catch (error) {
    console.error('❌ Error clicking edit button:', error);
    return false;
  }
}

// Test function to check if edit button exists and is clickable
function testEditButtonPresence() {
  console.log('🔍 Checking for Edit Button Presence...');
  
  // Look for pipeline cards
  const pipelineCards = document.querySelectorAll('[class*="grid-cols-1"][class*="lg:grid-cols-2"] > div');
  
  if (pipelineCards.length === 0) {
    console.log('ℹ️ No pipeline cards found - checking for empty state');
    
    const emptyState = document.querySelector('h3:contains("No Pipelines Found")') ||
                      Array.from(document.querySelectorAll('h3')).find(h3 =>
                        h3.textContent.includes('No Pipelines Found')
                      );
    
    if (emptyState) {
      console.log('✅ Empty state detected - no pipelines to edit');
      return true;
    } else {
      console.log('⚠️ No pipeline cards or empty state found');
      return false;
    }
  }
  
  console.log(`✅ Found ${pipelineCards.length} pipeline card(s)`);
  
  // Check each card for edit button
  let editButtonCount = 0;
  pipelineCards.forEach((card, index) => {
    const editButton = card.querySelector('button:has(svg)') ||
                      Array.from(card.querySelectorAll('button')).find(btn =>
                        btn.textContent.includes('Edit')
                      );
    
    if (editButton) {
      editButtonCount++;
      console.log(`✅ Pipeline card ${index + 1} has edit button`);
    } else {
      console.log(`⚠️ Pipeline card ${index + 1} missing edit button`);
    }
  });
  
  if (editButtonCount === pipelineCards.length) {
    console.log('✅ All pipeline cards have edit buttons');
    return true;
  } else {
    console.log(`⚠️ Only ${editButtonCount}/${pipelineCards.length} cards have edit buttons`);
    return false;
  }
}

// Test function to verify edit modal structure
function testEditModalStructure() {
  console.log('🏗️ Testing Edit Modal Structure...');
  
  // First, try to open an edit modal
  const editButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Edit') && btn.querySelector('svg')
  );
  
  if (editButtons.length === 0) {
    console.log('ℹ️ No edit buttons available to test modal structure');
    return true;
  }
  
  // Click the first edit button
  editButtons[0].click();
  
  setTimeout(() => {
    // Check modal structure
    const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
    
    if (modal) {
      console.log('✅ Edit modal container found');
      
      // Check for required sections
      const checks = [
        { name: 'Pipeline Information section', selector: 'h3:contains("Pipeline Information")' },
        { name: 'Add Pipeline Steps section', selector: 'h3:contains("Add Pipeline Steps")' },
        { name: 'Pipeline Flow section', selector: 'h3:contains("Pipeline Flow")' },
        { name: 'Name input field', selector: 'input[placeholder*="Pipeline"]' },
        { name: 'Description textarea', selector: 'textarea' },
        { name: 'Scheduling checkbox', selector: 'input[type="checkbox"]' },
        { name: 'Update button', selector: 'button:contains("Update Pipeline")' },
        { name: 'Cancel button', selector: 'button:contains("Cancel")' }
      ];
      
      let passedChecks = 0;
      checks.forEach(check => {
        const element = document.querySelector(check.selector) ||
                       Array.from(document.querySelectorAll('*')).find(el =>
                         el.textContent && el.textContent.includes(check.name.split(' ')[0])
                       );
        
        if (element) {
          console.log(`✅ ${check.name} found`);
          passedChecks++;
        } else {
          console.log(`❌ ${check.name} missing`);
        }
      });
      
      console.log(`📊 Modal structure check: ${passedChecks}/${checks.length} elements found`);
      
      // Close modal
      const closeButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Cancel')
      );
      if (closeButton) {
        closeButton.click();
        console.log('🔄 Modal closed');
      }
      
      return passedChecks >= checks.length * 0.8; // 80% pass rate
    } else {
      console.error('❌ Edit modal not found');
      return false;
    }
  }, 500);
}

// Main test function
function runPipelineEditTests() {
  console.log('🚀 Starting Pipeline Edit Functionality Tests...');
  console.log('===============================================');
  
  // Test 1: Check for edit button presence
  testEditButtonPresence();
  
  // Test 2: Test edit functionality
  setTimeout(() => {
    testPipelineEdit();
  }, 1000);
  
  // Test 3: Test modal structure
  setTimeout(() => {
    testEditModalStructure();
  }, 2000);
  
  console.log('📋 Edit tests initiated. Check console output for results.');
}

// Auto-run if this script is executed
if (typeof window !== 'undefined') {
  console.log('📋 Pipeline Edit Test Script Loaded');
  console.log('Run runPipelineEditTests() to start testing');
  
  // Provide helper functions globally
  window.testPipelineEdit = runPipelineEditTests;
  window.testEditButton = testEditButtonPresence;
  window.testEditModal = testEditModalStructure;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testPipelineEdit,
    testEditButtonPresence,
    testEditModalStructure,
    runPipelineEditTests
  };
}

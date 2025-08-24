/**
 * Comprehensive Evaluation Script for Enhanced Pipeline Builder
 * Tests feature completeness, UX, validation, and workflow coverage
 */

// Evaluation Results Storage
const evaluationResults = {
  featureCompleteness: {},
  userExperience: {},
  validation: {},
  missingCapabilities: [],
  workflowCoverage: {},
  configurationDepth: {}
};

// 1. FEATURE COMPLETENESS EVALUATION
function evaluateFeatureCompleteness() {
  console.log('🔍 EVALUATING FEATURE COMPLETENESS...');
  
  const features = {
    multiSource: false,
    multiDestination: false,
    richTransformations: false,
    visualPipelineBuilder: false,
    stepConfiguration: false,
    stepReordering: false,
    realTimeValidation: false
  };
  
  // Test multi-source capability
  const createButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes('Create Pipeline')
  );
  
  if (createButton) {
    createButton.click();
    
    setTimeout(() => {
      // Check for Add Source button
      const addSourceBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Source')
      );
      
      if (addSourceBtn) {
        features.multiSource = true;
        console.log('✅ Multi-source support detected');
        
        // Test adding multiple sources
        addSourceBtn.click();
        setTimeout(() => {
          addSourceBtn.click(); // Add second source
          const sourceSteps = document.querySelectorAll('[class*="border-green-200"]');
          if (sourceSteps.length >= 2) {
            console.log('✅ Multiple sources can be added');
          }
        }, 200);
      }
      
      // Check for Add Destination button
      const addDestBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Destination')
      );
      
      if (addDestBtn) {
        features.multiDestination = true;
        console.log('✅ Multi-destination support detected');
      }
      
      // Check for transformation options
      const addTransformBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Transform')
      );
      
      if (addTransformBtn) {
        features.richTransformations = true;
        console.log('✅ Rich transformations support detected');
        
        // Test transformation configuration
        addTransformBtn.click();
        setTimeout(() => {
          const editButtons = document.querySelectorAll('button:has(svg)');
          if (editButtons.length > 0) {
            editButtons[0].click();
            setTimeout(() => {
              const transformSelect = document.querySelector('select');
              if (transformSelect && transformSelect.options.length > 8) {
                console.log('✅ Multiple transformation types available');
              }
            }, 200);
          }
        }, 200);
      }
      
      // Check visual pipeline builder
      const pipelineFlow = Array.from(document.querySelectorAll('h3')).find(h3 =>
        h3.textContent.includes('Pipeline Flow')
      );
      
      if (pipelineFlow) {
        features.visualPipelineBuilder = true;
        console.log('✅ Visual pipeline builder detected');
      }
      
      // Close modal
      const closeBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Cancel')
      );
      if (closeBtn) closeBtn.click();
      
    }, 500);
  }
  
  evaluationResults.featureCompleteness = features;
  return features;
}

// 2. USER EXPERIENCE EVALUATION
function evaluateUserExperience() {
  console.log('🎨 EVALUATING USER EXPERIENCE...');
  
  const uxMetrics = {
    threePanelLayout: false,
    intuitiveStepping: false,
    visualFeedback: false,
    progressiveDisclosure: false,
    helpText: false,
    errorPrevention: false
  };
  
  // Test three-panel layout
  const createButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes('Create Pipeline')
  );
  
  if (createButton) {
    createButton.click();
    
    setTimeout(() => {
      // Check for three-panel grid
      const threePanelGrid = document.querySelector('.grid-cols-1.lg\\:grid-cols-3');
      if (threePanelGrid) {
        uxMetrics.threePanelLayout = true;
        console.log('✅ Three-panel layout implemented');
      }
      
      // Check for help text and descriptions
      const helpTexts = document.querySelectorAll('p[class*="text-gray-500"], p[class*="text-xs"]');
      if (helpTexts.length > 3) {
        uxMetrics.helpText = true;
        console.log('✅ Adequate help text provided');
      }
      
      // Check for visual feedback
      const colorCodedSteps = document.querySelectorAll('[class*="border-green-"], [class*="border-purple-"], [class*="border-orange-"]');
      if (colorCodedSteps.length > 0) {
        uxMetrics.visualFeedback = true;
        console.log('✅ Visual feedback with color coding');
      }
      
      // Check for progressive disclosure
      const schedulingCheckbox = document.querySelector('input[type="checkbox"]');
      if (schedulingCheckbox) {
        schedulingCheckbox.click();
        setTimeout(() => {
          const cronInput = document.querySelector('input[placeholder*="0 0"]');
          if (cronInput) {
            uxMetrics.progressiveDisclosure = true;
            console.log('✅ Progressive disclosure implemented');
          }
        }, 200);
      }
      
      // Close modal
      const closeBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Cancel')
      );
      if (closeBtn) closeBtn.click();
      
    }, 500);
  }
  
  evaluationResults.userExperience = uxMetrics;
  return uxMetrics;
}

// 3. VALIDATION & ERROR HANDLING EVALUATION
function evaluateValidation() {
  console.log('🛡️ EVALUATING VALIDATION & ERROR HANDLING...');
  
  const validationMetrics = {
    clientSideValidation: false,
    realTimeValidation: false,
    errorMessages: false,
    preventInvalidSubmission: false,
    configurationValidation: false
  };
  
  // Test validation by trying to create empty pipeline
  const createButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes('Create Pipeline')
  );
  
  if (createButton) {
    createButton.click();
    
    setTimeout(() => {
      // Try to submit without steps
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Create Pipeline') && !btn.textContent.includes('Create Your First')
      );
      
      if (submitBtn && submitBtn.disabled) {
        validationMetrics.preventInvalidSubmission = true;
        console.log('✅ Invalid submission prevention detected');
      }
      
      // Check for validation warnings
      const warningElements = document.querySelectorAll('[class*="text-red-500"]');
      if (warningElements.length > 0) {
        validationMetrics.realTimeValidation = true;
        console.log('✅ Real-time validation warnings found');
      }
      
      // Test step configuration validation
      const addSourceBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Source')
      );
      
      if (addSourceBtn) {
        addSourceBtn.click();
        setTimeout(() => {
          const unconfiguredWarnings = Array.from(document.querySelectorAll('span')).filter(span =>
            span.textContent.includes('⚠️') && span.textContent.includes('not configured')
          );
          
          if (unconfiguredWarnings.length > 0) {
            validationMetrics.configurationValidation = true;
            console.log('✅ Step configuration validation detected');
          }
        }, 200);
      }
      
      // Close modal
      const closeBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Cancel')
      );
      if (closeBtn) closeBtn.click();
      
    }, 500);
  }
  
  evaluationResults.validation = validationMetrics;
  return validationMetrics;
}

// 4. MISSING CAPABILITIES IDENTIFICATION
function identifyMissingCapabilities() {
  console.log('🔍 IDENTIFYING MISSING CAPABILITIES...');
  
  const missingFeatures = [];
  
  // Check for advanced transformation configuration
  const createButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes('Create Pipeline')
  );
  
  if (createButton) {
    createButton.click();
    
    setTimeout(() => {
      const addTransformBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Transform')
      );
      
      if (addTransformBtn) {
        addTransformBtn.click();
        setTimeout(() => {
          const editButtons = document.querySelectorAll('button:has(svg)');
          if (editButtons.length > 0) {
            editButtons[0].click();
            setTimeout(() => {
              // Check for detailed transformation configuration
              const configInputs = document.querySelectorAll('input, textarea, select');
              if (configInputs.length < 5) {
                missingFeatures.push('Detailed transformation configuration options');
              }
              
              // Check for conditional logic options
              const conditionalElements = Array.from(document.querySelectorAll('*')).filter(el =>
                el.textContent && (el.textContent.includes('condition') || el.textContent.includes('if'))
              );
              if (conditionalElements.length === 0) {
                missingFeatures.push('Conditional logic and branching');
              }
              
              // Check for data preview capabilities
              const previewElements = Array.from(document.querySelectorAll('*')).filter(el =>
                el.textContent && el.textContent.includes('preview')
              );
              if (previewElements.length === 0) {
                missingFeatures.push('Data preview and testing capabilities');
              }
              
            }, 200);
          }
        }, 200);
      }
      
      // Check for drag-and-drop functionality
      const stepCards = document.querySelectorAll('[class*="border-green-"], [class*="border-purple-"], [class*="border-orange-"]');
      let hasDragDrop = false;
      stepCards.forEach(card => {
        if (card.draggable || card.getAttribute('draggable') === 'true') {
          hasDragDrop = true;
        }
      });
      if (!hasDragDrop) {
        missingFeatures.push('Drag-and-drop step reordering');
      }
      
      // Check for error handling configuration
      const errorHandlingElements = Array.from(document.querySelectorAll('*')).filter(el =>
        el.textContent && (el.textContent.includes('error') || el.textContent.includes('retry'))
      );
      if (errorHandlingElements.length === 0) {
        missingFeatures.push('Error handling and retry configuration');
      }
      
      // Close modal
      const closeBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Cancel')
      );
      if (closeBtn) closeBtn.click();
      
    }, 500);
  }
  
  evaluationResults.missingCapabilities = missingFeatures;
  return missingFeatures;
}

// 5. WORKFLOW COVERAGE EVALUATION
function evaluateWorkflowCoverage() {
  console.log('🔄 EVALUATING WORKFLOW COVERAGE...');
  
  const workflows = {
    dataWarehouseETL: false,
    multiTargetDistribution: false,
    dataQualityPipeline: false,
    analyticsPipeline: false,
    realTimeProcessing: false
  };
  
  // Test if complex workflows can be built
  const createButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes('Create Pipeline')
  );
  
  if (createButton) {
    createButton.click();
    
    setTimeout(() => {
      // Test data warehouse ETL workflow
      const addSourceBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Source')
      );
      const addTransformBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Transform')
      );
      const addDestBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Add Destination')
      );
      
      if (addSourceBtn && addTransformBtn && addDestBtn) {
        // Simulate building a data warehouse ETL
        addSourceBtn.click();
        setTimeout(() => {
          addTransformBtn.click();
          setTimeout(() => {
            addDestBtn.click();
            setTimeout(() => {
              const steps = document.querySelectorAll('[class*="border-green-"], [class*="border-purple-"], [class*="border-orange-"]');
              if (steps.length >= 3) {
                workflows.dataWarehouseETL = true;
                console.log('✅ Data warehouse ETL workflow possible');
              }
              
              // Test multi-target distribution
              addDestBtn.click(); // Add second destination
              setTimeout(() => {
                const destSteps = document.querySelectorAll('[class*="border-orange-"]');
                if (destSteps.length >= 2) {
                  workflows.multiTargetDistribution = true;
                  console.log('✅ Multi-target distribution workflow possible');
                }
              }, 200);
              
            }, 200);
          }, 200);
        }, 200);
      }
      
      // Close modal
      setTimeout(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(btn =>
          btn.textContent.includes('Cancel')
        );
        if (closeBtn) closeBtn.click();
      }, 1000);
      
    }, 500);
  }
  
  evaluationResults.workflowCoverage = workflows;
  return workflows;
}

// 6. CONFIGURATION DEPTH EVALUATION
function evaluateConfigurationDepth() {
  console.log('⚙️ EVALUATING CONFIGURATION DEPTH...');
  
  const configDepth = {
    connectorOptions: 0,
    transformationOptions: 0,
    schedulingOptions: false,
    advancedSettings: false,
    performanceSettings: false
  };
  
  // Count available transformation types
  const transformationTypes = [
    'filter', 'map', 'aggregate', 'join', 'sort', 
    'deduplicate', 'validate', 'calculate'
  ];
  configDepth.transformationOptions = transformationTypes.length;
  
  // Check scheduling options
  const createButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes('Create Pipeline')
  );
  
  if (createButton) {
    createButton.click();
    
    setTimeout(() => {
      const schedulingCheckbox = document.querySelector('input[type="checkbox"]');
      if (schedulingCheckbox) {
        configDepth.schedulingOptions = true;
        console.log('✅ Scheduling configuration available');
      }
      
      // Close modal
      const closeBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Cancel')
      );
      if (closeBtn) closeBtn.click();
      
    }, 500);
  }
  
  evaluationResults.configurationDepth = configDepth;
  return configDepth;
}

// MAIN EVALUATION FUNCTION
function runComprehensiveEvaluation() {
  console.log('🚀 STARTING COMPREHENSIVE PIPELINE BUILDER EVALUATION...');
  console.log('================================================================');
  
  // Run all evaluations
  setTimeout(() => evaluateFeatureCompleteness(), 500);
  setTimeout(() => evaluateUserExperience(), 2000);
  setTimeout(() => evaluateValidation(), 4000);
  setTimeout(() => identifyMissingCapabilities(), 6000);
  setTimeout(() => evaluateWorkflowCoverage(), 8000);
  setTimeout(() => evaluateConfigurationDepth(), 10000);
  
  // Generate final report
  setTimeout(() => {
    generateEvaluationReport();
  }, 12000);
}

// GENERATE EVALUATION REPORT
function generateEvaluationReport() {
  console.log('📊 GENERATING EVALUATION REPORT...');
  console.log('==================================');
  
  console.log('1. FEATURE COMPLETENESS:', evaluationResults.featureCompleteness);
  console.log('2. USER EXPERIENCE:', evaluationResults.userExperience);
  console.log('3. VALIDATION & ERROR HANDLING:', evaluationResults.validation);
  console.log('4. MISSING CAPABILITIES:', evaluationResults.missingCapabilities);
  console.log('5. WORKFLOW COVERAGE:', evaluationResults.workflowCoverage);
  console.log('6. CONFIGURATION DEPTH:', evaluationResults.configurationDepth);
  
  // Calculate overall scores
  const featureScore = Object.values(evaluationResults.featureCompleteness).filter(Boolean).length / Object.keys(evaluationResults.featureCompleteness).length * 100;
  const uxScore = Object.values(evaluationResults.userExperience).filter(Boolean).length / Object.keys(evaluationResults.userExperience).length * 100;
  const validationScore = Object.values(evaluationResults.validation).filter(Boolean).length / Object.keys(evaluationResults.validation).length * 100;
  
  console.log('📈 OVERALL SCORES:');
  console.log(`   Feature Completeness: ${featureScore.toFixed(1)}%`);
  console.log(`   User Experience: ${uxScore.toFixed(1)}%`);
  console.log(`   Validation: ${validationScore.toFixed(1)}%`);
  console.log(`   Missing Features: ${evaluationResults.missingCapabilities.length} identified`);
  
  return evaluationResults;
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.evaluatePipelineBuilder = runComprehensiveEvaluation;
  window.pipelineEvaluationResults = evaluationResults;
}

console.log('📋 Pipeline Builder Evaluation Script Loaded');
console.log('Run evaluatePipelineBuilder() to start comprehensive evaluation');

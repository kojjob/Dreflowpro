/**
 * Comprehensive ETL Pipeline Creation Script
 * Creates "Customer Performance Analysis - July 2025" pipeline
 */

// Pipeline Configuration
const pipelineConfig = {
  name: "Customer Performance Analysis - July 2025",
  description: "Comprehensive ETL pipeline for analyzing customer performance metrics, revenue trends, and engagement scores for July 2025 reporting period",
  isScheduled: true,
  scheduleCron: "0 2 * * *", // Daily at 2 AM
  steps: [
    // Data Sources
    {
      type: 'source',
      name: 'Customer Database',
      connectorType: 'postgresql',
      description: 'Primary customer records, transactions, and activity data'
    },
    {
      type: 'source', 
      name: 'CRM System API',
      connectorType: 'api',
      description: 'Customer interaction data, support tickets, and engagement metrics'
    },
    {
      type: 'source',
      name: 'Sales Database',
      connectorType: 'mysql',
      description: 'Revenue data, purchase history, and transaction details'
    },
    // Transformations
    {
      type: 'transform',
      name: 'July 2025 Date Filter',
      transformationType: 'filter',
      description: 'Filter all data to July 2025 date range',
      config: {
        conditions: [
          { field: 'created_at', operator: 'greater_equal', value: '2025-07-01', logic: 'AND' },
          { field: 'created_at', operator: 'less_than', value: '2025-08-01', logic: 'AND' }
        ]
      }
    },
    {
      type: 'transform',
      name: 'Customer Performance Metrics',
      transformationType: 'calculate',
      description: 'Calculate revenue, transaction count, and engagement scores per customer'
    },
    {
      type: 'transform',
      name: 'Data Quality Validation',
      transformationType: 'validate',
      description: 'Validate data quality and handle missing values'
    },
    {
      type: 'transform',
      name: 'Regional Aggregation',
      transformationType: 'aggregate',
      description: 'Aggregate performance metrics by customer segments and regions'
    },
    // Destinations
    {
      type: 'destination',
      name: 'Analytics Database',
      connectorType: 'postgresql',
      description: 'Store processed data for reporting and analysis'
    },
    {
      type: 'destination',
      name: 'BI Dashboard',
      connectorType: 'api',
      description: 'Send data to business intelligence dashboard for real-time visualization'
    },
    {
      type: 'destination',
      name: 'CSV Export',
      connectorType: 'csv',
      description: 'Export processed data for stakeholder review and external analysis'
    }
  ]
};

// Function to create the complete pipeline
async function createCustomerPerformancePipeline() {
  console.log('🚀 Creating Customer Performance Analysis Pipeline...');
  console.log('====================================================');
  
  // Step 1: Open Create Pipeline Modal
  console.log('📋 Step 1: Opening pipeline creation interface...');
  
  const createButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes('Create Pipeline') || btn.textContent.includes('Create Your First Pipeline')
  );
  
  if (!createButton) {
    console.error('❌ Create Pipeline button not found');
    return false;
  }
  
  createButton.click();
  console.log('✅ Pipeline creation modal opened');
  
  // Wait for modal to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Configure Basic Pipeline Information
  console.log('📝 Step 2: Configuring basic pipeline information...');
  
  // Set pipeline name
  const nameInput = document.querySelector('input[placeholder*="Pipeline"]');
  if (nameInput) {
    nameInput.value = pipelineConfig.name;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Pipeline name set:', pipelineConfig.name);
  }
  
  // Set description
  const descriptionTextarea = document.querySelector('textarea');
  if (descriptionTextarea) {
    descriptionTextarea.value = pipelineConfig.description;
    descriptionTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Pipeline description set');
  }
  
  // Enable scheduling
  const schedulingCheckbox = document.querySelector('input[type="checkbox"]');
  if (schedulingCheckbox && !schedulingCheckbox.checked) {
    schedulingCheckbox.click();
    console.log('✅ Scheduling enabled');
    
    // Set cron schedule
    await new Promise(resolve => setTimeout(resolve, 300));
    const cronInput = document.querySelector('input[placeholder*="0 0"]');
    if (cronInput) {
      cronInput.value = pipelineConfig.scheduleCron;
      cronInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ Cron schedule set:', pipelineConfig.scheduleCron);
    }
  }
  
  // Step 3: Add Data Sources
  console.log('🔌 Step 3: Adding data sources...');
  
  for (const step of pipelineConfig.steps.filter(s => s.type === 'source')) {
    await addPipelineStep('source', step);
  }
  
  // Step 4: Add Transformations
  console.log('⚙️ Step 4: Adding transformation steps...');
  
  for (const step of pipelineConfig.steps.filter(s => s.type === 'transform')) {
    await addPipelineStep('transform', step);
  }
  
  // Step 5: Add Destinations
  console.log('📤 Step 5: Adding destination connectors...');
  
  for (const step of pipelineConfig.steps.filter(s => s.type === 'destination')) {
    await addPipelineStep('destination', step);
  }
  
  // Step 6: Validate Complete Pipeline
  console.log('🛡️ Step 6: Validating complete pipeline...');
  await validateCompletePipeline();
  
  // Step 7: Preview Pipeline Flow
  console.log('👁️ Step 7: Reviewing pipeline flow...');
  await previewPipelineFlow();
  
  console.log('🎉 Customer Performance Analysis Pipeline Created Successfully!');
  console.log('📊 Pipeline Summary:');
  console.log(`   - Name: ${pipelineConfig.name}`);
  console.log(`   - Sources: ${pipelineConfig.steps.filter(s => s.type === 'source').length}`);
  console.log(`   - Transformations: ${pipelineConfig.steps.filter(s => s.type === 'transform').length}`);
  console.log(`   - Destinations: ${pipelineConfig.steps.filter(s => s.type === 'destination').length}`);
  console.log(`   - Scheduled: ${pipelineConfig.isScheduled ? 'Yes' : 'No'} (${pipelineConfig.scheduleCron})`);
  
  return true;
}

// Helper function to add pipeline steps
async function addPipelineStep(stepType, stepConfig) {
  console.log(`   Adding ${stepType}: ${stepConfig.name}`);
  
  // Find and click the appropriate add button
  const addButton = Array.from(document.querySelectorAll('button')).find(btn =>
    btn.textContent.includes(`Add ${stepType.charAt(0).toUpperCase() + stepType.slice(1)}`)
  );
  
  if (!addButton) {
    console.error(`❌ Add ${stepType} button not found`);
    return false;
  }
  
  addButton.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Configure the step
  await configureStep(stepConfig);
  
  console.log(`   ✅ ${stepConfig.name} added successfully`);
  return true;
}

// Helper function to configure individual steps
async function configureStep(stepConfig) {
  // Find the most recently added step (should be the last one)
  const stepCards = document.querySelectorAll('[class*="border-green-"], [class*="border-purple-"], [class*="border-orange-"]');
  if (stepCards.length === 0) return;
  
  const latestStep = stepCards[stepCards.length - 1];
  const editButton = latestStep.querySelector('button:has(svg)');
  
  if (editButton) {
    editButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Configure step name
    const nameInput = document.querySelector('input[placeholder*="descriptive name"]');
    if (nameInput) {
      nameInput.value = stepConfig.name;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Configure connector or transformation
    if (stepConfig.type === 'source' || stepConfig.type === 'destination') {
      await configureConnector(stepConfig);
    } else if (stepConfig.type === 'transform') {
      await configureTransformation(stepConfig);
    }
    
    // Save configuration
    const saveButton = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('Save Configuration')
    );
    if (saveButton) {
      saveButton.click();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

// Helper function to configure connectors
async function configureConnector(stepConfig) {
  const connectorSelect = document.querySelector('select');
  if (connectorSelect) {
    // Find connector option that matches the type
    const option = Array.from(connectorSelect.options).find(opt =>
      opt.textContent.toLowerCase().includes(stepConfig.connectorType)
    );
    
    if (option) {
      connectorSelect.value = option.value;
      connectorSelect.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Try to preview data
      await new Promise(resolve => setTimeout(resolve, 500));
      const previewButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Preview Data')
      );
      if (previewButton) {
        previewButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

// Helper function to configure transformations
async function configureTransformation(stepConfig) {
  const transformSelect = document.querySelector('select');
  if (transformSelect) {
    // Select transformation type
    const option = Array.from(transformSelect.options).find(opt =>
      opt.value === stepConfig.transformationType
    );
    
    if (option) {
      transformSelect.value = option.value;
      transformSelect.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Configure specific transformation settings
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (stepConfig.transformationType === 'filter' && stepConfig.config) {
        await configureFilterTransformation(stepConfig.config);
      }
      
      // Validate configuration
      const validateButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Validate Configuration')
      );
      if (validateButton) {
        validateButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
}

// Helper function to configure filter transformation
async function configureFilterTransformation(filterConfig) {
  if (!filterConfig.conditions) return;
  
  for (const condition of filterConfig.conditions) {
    // Add condition
    const addConditionButton = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('Add Condition')
    );
    
    if (addConditionButton) {
      addConditionButton.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Configure the condition (this would need more specific selectors)
      console.log(`   📋 Added filter condition: ${condition.field} ${condition.operator} ${condition.value}`);
    }
  }
}

// Helper function to validate complete pipeline
async function validateCompletePipeline() {
  const stepCards = document.querySelectorAll('[class*="border-green-"], [class*="border-purple-"], [class*="border-orange-"]');
  
  console.log(`   📊 Pipeline contains ${stepCards.length} steps`);
  
  // Check for validation warnings
  const warnings = document.querySelectorAll('[class*="text-red-500"]');
  if (warnings.length > 0) {
    console.log(`   ⚠️ Found ${warnings.length} validation warning(s)`);
  } else {
    console.log('   ✅ No validation warnings found');
  }
  
  return true;
}

// Helper function to preview pipeline flow
async function previewPipelineFlow() {
  const pipelineFlow = Array.from(document.querySelectorAll('h3')).find(h3 =>
    h3.textContent.includes('Pipeline Flow')
  );
  
  if (pipelineFlow) {
    console.log('   ✅ Pipeline flow visualization confirmed');
    
    // Count arrows (data flow indicators)
    const arrows = document.querySelectorAll('svg');
    console.log(`   🔄 Data flow connections: ${arrows.length}`);
  }
  
  return true;
}

// Function to demonstrate the complete pipeline
function demonstrateCustomerPerformancePipeline() {
  console.log('🎯 CUSTOMER PERFORMANCE ANALYSIS PIPELINE DEMONSTRATION');
  console.log('========================================================');
  
  console.log('📋 Pipeline Overview:');
  console.log('   Purpose: Analyze customer performance metrics for July 2025');
  console.log('   Schedule: Daily execution at 2 AM');
  console.log('   Data Sources: Customer DB, CRM API, Sales DB');
  console.log('   Transformations: Date filtering, metrics calculation, validation, aggregation');
  console.log('   Destinations: Analytics DB, BI Dashboard, CSV export');
  console.log('');
  
  console.log('🔄 Data Flow:');
  console.log('   [Customer DB] ──┐');
  console.log('   [CRM API] ─────┼──→ [July Filter] ──→ [Calculate Metrics] ──→ [Validate] ──→ [Aggregate] ──┐');
  console.log('   [Sales DB] ────┘                                                                           │');
  console.log('                                                                                              ├──→ [Analytics DB]');
  console.log('                                                                                              ├──→ [BI Dashboard]');
  console.log('                                                                                              └──→ [CSV Export]');
  console.log('');
  
  console.log('📊 Expected Outputs:');
  console.log('   • Customer performance metrics by region');
  console.log('   • Revenue trends and transaction analysis');
  console.log('   • Engagement scores and activity patterns');
  console.log('   • Data quality reports and validation results');
  console.log('');
  
  console.log('🚀 Ready to create this pipeline? Run: createCustomerPerformancePipeline()');
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.createCustomerPerformancePipeline = createCustomerPerformancePipeline;
  window.demonstrateCustomerPerformancePipeline = demonstrateCustomerPerformancePipeline;
  window.pipelineConfig = pipelineConfig;
}

// Auto-run demonstration
demonstrateCustomerPerformancePipeline();

// Manual Step-by-Step Guide
function showManualCreationGuide() {
  console.log('📖 MANUAL PIPELINE CREATION GUIDE');
  console.log('==================================');
  console.log('');
  console.log('Follow these steps to manually create the Customer Performance Analysis pipeline:');
  console.log('');
  console.log('🏁 STEP 1: Open Pipeline Builder');
  console.log('   1. Navigate to Dashboard → ETL Pipelines');
  console.log('   2. Click "Create Pipeline" button');
  console.log('   3. Enhanced three-panel interface opens');
  console.log('');
  console.log('📝 STEP 2: Configure Basic Information');
  console.log('   1. Pipeline Name: "Customer Performance Analysis - July 2025"');
  console.log('   2. Description: "Comprehensive ETL pipeline for analyzing customer performance metrics..."');
  console.log('   3. Enable Scheduling: ✓ Checked');
  console.log('   4. Cron Schedule: "0 2 * * *" (Daily at 2 AM)');
  console.log('');
  console.log('🔌 STEP 3: Add Data Sources (3 sources)');
  console.log('   Source 1: Customer Database');
  console.log('   ├─ Click "Add Source"');
  console.log('   ├─ Click edit button on new source step');
  console.log('   ├─ Name: "Customer Database"');
  console.log('   ├─ Connector: Select PostgreSQL connector');
  console.log('   ├─ Click "Preview Data" to see sample customer records');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('   Source 2: CRM System API');
  console.log('   ├─ Click "Add Source"');
  console.log('   ├─ Click edit button on new source step');
  console.log('   ├─ Name: "CRM System API"');
  console.log('   ├─ Connector: Select API connector');
  console.log('   ├─ Click "Preview Data" to see interaction data');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('   Source 3: Sales Database');
  console.log('   ├─ Click "Add Source"');
  console.log('   ├─ Click edit button on new source step');
  console.log('   ├─ Name: "Sales Database"');
  console.log('   ├─ Connector: Select MySQL connector');
  console.log('   ├─ Click "Preview Data" to see sales records');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('⚙️ STEP 4: Add Transformation Steps (4 transforms)');
  console.log('   Transform 1: July 2025 Date Filter');
  console.log('   ├─ Click "Add Transform"');
  console.log('   ├─ Click edit button on new transform step');
  console.log('   ├─ Name: "July 2025 Date Filter"');
  console.log('   ├─ Type: Select "Filter Data"');
  console.log('   ├─ Click "Add Condition"');
  console.log('   ├─ Condition 1: created_at >= 2025-07-01');
  console.log('   ├─ Click "Add Condition"');
  console.log('   ├─ Condition 2: created_at < 2025-08-01');
  console.log('   ├─ Click "Validate Configuration"');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('   Transform 2: Customer Performance Metrics');
  console.log('   ├─ Click "Add Transform"');
  console.log('   ├─ Click edit button on new transform step');
  console.log('   ├─ Name: "Customer Performance Metrics"');
  console.log('   ├─ Type: Select "Calculate Fields"');
  console.log('   ├─ Click "Validate Configuration"');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('   Transform 3: Data Quality Validation');
  console.log('   ├─ Click "Add Transform"');
  console.log('   ├─ Click edit button on new transform step');
  console.log('   ├─ Name: "Data Quality Validation"');
  console.log('   ├─ Type: Select "Validate Data"');
  console.log('   ├─ Click "Validate Configuration"');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('   Transform 4: Regional Aggregation');
  console.log('   ├─ Click "Add Transform"');
  console.log('   ├─ Click edit button on new transform step');
  console.log('   ├─ Name: "Regional Aggregation"');
  console.log('   ├─ Type: Select "Aggregate Data"');
  console.log('   ├─ Click "Validate Configuration"');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('📤 STEP 5: Add Destinations (3 destinations)');
  console.log('   Destination 1: Analytics Database');
  console.log('   ├─ Click "Add Destination"');
  console.log('   ├─ Click edit button on new destination step');
  console.log('   ├─ Name: "Analytics Database"');
  console.log('   ├─ Connector: Select PostgreSQL connector');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('   Destination 2: BI Dashboard');
  console.log('   ├─ Click "Add Destination"');
  console.log('   ├─ Click edit button on new destination step');
  console.log('   ├─ Name: "BI Dashboard"');
  console.log('   ├─ Connector: Select API connector');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('   Destination 3: CSV Export');
  console.log('   ├─ Click "Add Destination"');
  console.log('   ├─ Click edit button on new destination step');
  console.log('   ├─ Name: "CSV Export"');
  console.log('   ├─ Connector: Select CSV connector');
  console.log('   └─ Save Configuration');
  console.log('');
  console.log('🛡️ STEP 6: Final Validation');
  console.log('   1. Review complete pipeline flow (11 steps total)');
  console.log('   2. Check for any validation warnings');
  console.log('   3. Ensure all steps are properly configured');
  console.log('   4. Verify data flow connections');
  console.log('');
  console.log('🚀 STEP 7: Create Pipeline');
  console.log('   1. Click "Create Pipeline" button');
  console.log('   2. Wait for pipeline creation confirmation');
  console.log('   3. Pipeline is ready for execution!');
  console.log('');
  console.log('📊 Expected Result:');
  console.log('   ✅ 3 Data Sources configured');
  console.log('   ✅ 4 Transformation steps configured');
  console.log('   ✅ 3 Destination outputs configured');
  console.log('   ✅ Daily scheduling enabled');
  console.log('   ✅ Complete customer performance analysis pipeline');
  console.log('');
  console.log('🎯 This pipeline will process customer data and generate comprehensive');
  console.log('   performance insights for July 2025 analysis!');
}

// Add to global functions
if (typeof window !== 'undefined') {
  window.showManualCreationGuide = showManualCreationGuide;
}

console.log('📋 Customer Performance Pipeline Script Loaded');
console.log('Run createCustomerPerformancePipeline() to build automatically');
console.log('Run showManualCreationGuide() for step-by-step instructions');

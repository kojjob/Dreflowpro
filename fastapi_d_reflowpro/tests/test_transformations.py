"""
REAL DATA TRANSFORMATIONS TESTING
Tests actual transformation operations: JOIN, DEDUPLICATE, VALIDATE, AGGREGATE.
"""

import logging
from app.services.transformations import DataTransformations

# Configure logging for tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestRealTransformations:
    """Test suite for real data transformation operations."""
    
    def test_join_operations(self):
        """Test JOIN transformation with different join types."""
        logger.info("🧪 Testing JOIN Operations")
        
        # Sample datasets
        customers = [
            {"customer_id": 1, "name": "Alice", "city": "New York"},
            {"customer_id": 2, "name": "Bob", "city": "Los Angeles"},
            {"customer_id": 3, "name": "Charlie", "city": "Chicago"}
        ]
        
        orders = [
            {"order_id": 101, "customer_id": 1, "amount": 250.00},
            {"order_id": 102, "customer_id": 2, "amount": 175.50},
            {"order_id": 103, "customer_id": 1, "amount": 95.00},
            {"order_id": 104, "customer_id": 4, "amount": 300.00}  # Customer doesn't exist
        ]
        
        # Test INNER JOIN
        inner_join_config = {
            "left_on": "customer_id",
            "right_on": "customer_id",
            "how": "inner",
            "suffix": ("_customer", "_order")
        }
        
        result = DataTransformations.join_data(customers, orders, inner_join_config)
        assert result["status"] == "success", f"Inner join failed: {result}"
        assert result["result_count"] == 3, f"Expected 3 records, got {result['result_count']}"
        assert result["join_type"] == "inner"
        logger.info(f"✅ Inner JOIN: {result['original_left_count']} + {result['original_right_count']} → {result['result_count']} records")
        
        # Test LEFT JOIN
        left_join_config = {
            "left_on": "customer_id",
            "right_on": "customer_id", 
            "how": "left"
        }
        
        result = DataTransformations.join_data(customers, orders, left_join_config)
        assert result["status"] == "success", f"Left join failed: {result}"
        assert result["result_count"] == 4, f"Expected 4 records, got {result['result_count']}"  # Alice appears twice
        logger.info(f"✅ Left JOIN: {result['original_left_count']} + {result['original_right_count']} → {result['result_count']} records")
        
        # Test RIGHT JOIN
        right_join_config = {
            "left_on": "customer_id",
            "right_on": "customer_id",
            "how": "right"
        }
        
        result = DataTransformations.join_data(customers, orders, right_join_config)
        assert result["status"] == "success", f"Right join failed: {result}"
        assert result["result_count"] == 4, f"Expected 4 records, got {result['result_count']}"
        logger.info(f"✅ Right JOIN: {result['original_left_count']} + {result['original_right_count']} → {result['result_count']} records")
        
        logger.info("✅ All JOIN operations completed successfully!")
    
    def test_deduplicate_operations(self):
        """Test DEDUPLICATE transformation with different strategies."""
        logger.info("🧪 Testing DEDUPLICATE Operations")
        
        # Sample data with duplicates
        data_with_duplicates = [
            {"id": 1, "name": "Alice", "email": "alice@example.com", "age": 25},
            {"id": 2, "name": "Bob", "email": "bob@example.com", "age": 30},
            {"id": 1, "name": "Alice", "email": "alice@example.com", "age": 25},  # Exact duplicate (same id)
            {"id": 4, "name": "Charlie", "email": "charlie@example.com", "age": 35},
            {"id": 5, "name": "alice", "email": "ALICE@EXAMPLE.COM", "age": 25},  # Fuzzy duplicate
            {"id": 6, "name": "Bob", "email": "bob@example.com", "age": 31}  # Partial duplicate
        ]
        
        # Test exact deduplication (all columns)
        exact_dedup_config = {
            "strategy": "exact",
            "keep": "first"
        }
        
        result = DataTransformations.deduplicate_data(data_with_duplicates, exact_dedup_config)
        assert result["status"] == "success", f"Exact dedup failed: {result}"
        assert result["duplicates_removed"] == 1, f"Expected 1 duplicate removed, got {result['duplicates_removed']}"
        logger.info(f"✅ Exact dedup: {result['original_count']} → {result['result_count']} records ({result['duplicates_removed']} duplicates)")
        
        # Test deduplication by specific columns
        column_dedup_config = {
            "columns": ["name", "email"],
            "strategy": "exact",
            "keep": "last"
        }
        
        result = DataTransformations.deduplicate_data(data_with_duplicates, column_dedup_config)
        assert result["status"] == "success", f"Column dedup failed: {result}"
        assert result["duplicates_removed"] >= 1, f"Expected at least 1 duplicate removed, got {result['duplicates_removed']}"
        logger.info(f"✅ Column dedup: {result['original_count']} → {result['result_count']} records ({result['duplicates_removed']} duplicates)")
        
        # Test fuzzy deduplication
        fuzzy_dedup_config = {
            "columns": ["name", "email"],
            "strategy": "fuzzy",
            "keep": "first"
        }
        
        result = DataTransformations.deduplicate_data(data_with_duplicates, fuzzy_dedup_config)
        assert result["status"] == "success", f"Fuzzy dedup failed: {result}"
        logger.info(f"✅ Fuzzy dedup: {result['original_count']} → {result['result_count']} records ({result['duplicates_removed']} duplicates)")
        
        logger.info("✅ All DEDUPLICATE operations completed successfully!")
    
    def test_validate_operations(self):
        """Test VALIDATE transformation with different validation rules."""
        logger.info("🧪 Testing VALIDATE Operations")
        
        # Sample data with validation issues
        test_data = [
            {"id": 1, "name": "Alice", "email": "alice@example.com", "age": 25, "salary": 50000},
            {"id": 2, "name": "Bob", "email": "invalid-email", "age": -5, "salary": 75000},  # Invalid email, negative age
            {"id": 3, "name": "", "email": "charlie@example.com", "age": 35, "salary": None},  # Empty name, null salary  
            {"id": 4, "name": "David", "email": "david@example.com", "age": 150, "salary": 1000000},  # Age too high
            {"id": 5, "name": "Eve", "email": "eve@example.com", "age": 28, "salary": 60000}
        ]
        
        # Define validation rules
        validation_rules = [
            {
                "name": "not_null_check",
                "type": "not_null",
                "config": {"columns": ["name", "salary"]}
            },
            {
                "name": "email_format_check",
                "type": "data_type",
                "config": {"columns": ["email"], "expected_type": "email"}
            },
            {
                "name": "age_range_check", 
                "type": "range",
                "config": {"column": "age", "min": 0, "max": 120}
            },
            {
                "name": "unique_id_check",
                "type": "unique",
                "config": {"columns": ["id"]}
            }
        ]
        
        # Test validation with report action (keep all data, report issues)
        report_config = {
            "rules": validation_rules,
            "action": "report",
            "strict": False
        }
        
        result = DataTransformations.validate_data(test_data, report_config)
        assert result["status"] == "success", f"Validation report failed: {result}"
        assert result["result_count"] == len(test_data), "Report mode should keep all records"
        assert result["invalid_count"] > 0, "Should detect validation issues"
        logger.info(f"✅ Validation report: {result['result_count']} records, {result['invalid_count']} invalid, {len(result['validation_results'])} rule violations")
        
        # Test validation with filter action (remove invalid records)
        filter_config = {
            "rules": validation_rules,
            "action": "filter",
            "strict": False
        }
        
        result = DataTransformations.validate_data(test_data, filter_config)
        assert result["status"] == "success", f"Validation filter failed: {result}"
        assert result["result_count"] < len(test_data), "Filter mode should remove invalid records"
        logger.info(f"✅ Validation filter: {result['original_count']} → {result['result_count']} records ({result['invalid_count']} removed)")
        
        # Test validation with flag action (mark invalid records)
        flag_config = {
            "rules": validation_rules,
            "action": "flag",
            "strict": False
        }
        
        result = DataTransformations.validate_data(test_data, flag_config)
        assert result["status"] == "success", f"Validation flag failed: {result}"
        assert result["result_count"] == len(test_data), "Flag mode should keep all records"
        # Check if validation status column was added
        flagged_data = result["data"]
        assert any("_validation_status" in record for record in flagged_data), "Should add validation status column"
        logger.info(f"✅ Validation flag: {result['result_count']} records flagged with status")
        
        logger.info("✅ All VALIDATE operations completed successfully!")
    
    def test_aggregate_operations(self):
        """Test AGGREGATE transformation with different aggregation functions."""
        logger.info("🧪 Testing AGGREGATE Operations")
        
        # Sample sales data
        sales_data = [
            {"region": "North", "product": "Widget", "quantity": 10, "revenue": 1000, "date": "2024-01-01"},
            {"region": "North", "product": "Gadget", "quantity": 5, "revenue": 750, "date": "2024-01-01"},
            {"region": "South", "product": "Widget", "quantity": 8, "revenue": 800, "date": "2024-01-01"},
            {"region": "South", "product": "Widget", "quantity": 12, "revenue": 1200, "date": "2024-01-02"},
            {"region": "North", "product": "Widget", "quantity": 15, "revenue": 1500, "date": "2024-01-02"}
        ]
        
        # Test group by aggregation
        group_agg_config = {
            "group_by": ["region"],
            "aggregations": {
                "quantity": "sum",
                "revenue": ["sum", "mean"],
                "product": "count"
            }
        }
        
        result = DataTransformations.aggregate_data(sales_data, group_agg_config)
        assert result["status"] == "success", f"Group aggregation failed: {result}"
        assert result["result_count"] == 2, f"Expected 2 regions, got {result['result_count']}"
        logger.info(f"✅ Group aggregation: {result['original_count']} → {result['result_count']} records by region")
        
        # Test multiple group by columns
        multi_group_config = {
            "group_by": ["region", "product"],
            "aggregations": {
                "quantity": "sum",
                "revenue": "mean"
            }
        }
        
        result = DataTransformations.aggregate_data(sales_data, multi_group_config)
        assert result["status"] == "success", f"Multi-group aggregation failed: {result}"
        assert result["result_count"] == 3, f"Expected 3 region-product combinations, got {result['result_count']}"
        logger.info(f"✅ Multi-group aggregation: {result['original_count']} → {result['result_count']} records by region+product")
        
        # Test global aggregation (no grouping)
        global_agg_config = {
            "aggregations": {
                "quantity": ["sum", "mean", "max", "min"],
                "revenue": ["sum", "mean"]
            }
        }
        
        result = DataTransformations.aggregate_data(sales_data, global_agg_config)
        assert result["status"] == "success", f"Global aggregation failed: {result}"
        assert result["result_count"] == 1, f"Expected 1 global record, got {result['result_count']}"
        logger.info(f"✅ Global aggregation: {result['original_count']} → {result['result_count']} summary record")
        
        logger.info("✅ All AGGREGATE operations completed successfully!")
    
    def run_all_tests(self):
        """Run all transformation tests."""
        logger.info("🚀 STARTING REAL TRANSFORMATION TESTING")
        logger.info("=" * 60)
        
        try:
            self.test_join_operations()
            logger.info("\n" + "=" * 60)
            
            self.test_deduplicate_operations()
            logger.info("\n" + "=" * 60)
            
            self.test_validate_operations()
            logger.info("\n" + "=" * 60)
            
            self.test_aggregate_operations()
            logger.info("\n" + "=" * 60)
            
            logger.info("🎉 ALL TRANSFORMATION TESTS PASSED!")
            
        except Exception as e:
            logger.error(f"❌ TRANSFORMATION TEST FAILED: {str(e)}")
            raise

# Run tests directly
if __name__ == "__main__":
    test_suite = TestRealTransformations()
    test_suite.run_all_tests()
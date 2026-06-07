'use strict';

// Load expected schema configuration
const EXPECTED_SCHEMA = require('./data_store_schema.json');

/**
 * Run schema drift check against active Catalyst database
 * @param {Object} catalystApp - The initialized Catalyst SDK instance
 * @returns {Promise<Object>} - Drift analysis results
 */
async function detectSchemaDrift(catalystApp) {
    const results = {
        timestamp: new Date().toISOString(),
        hasDrift: false,
        driftDetails: []
    };

    try {
        const datastore = catalystApp.datastore();
        // Get all actual tables in Catalyst
        const actualTables = await datastore.getAll();
        const actualTablesMap = new Map();
        actualTables.forEach(t => actualTablesMap.set(t.table_name, t));

        // 1. Check for missing tables
        for (const expectedTable of EXPECTED_SCHEMA.tables) {
            const actualTable = actualTablesMap.get(expectedTable.name);
            if (!actualTable) {
                results.hasDrift = true;
                results.driftDetails.push({
                    type: 'MISSING_TABLE',
                    table: expectedTable.name,
                    message: `Table '${expectedTable.name}' is defined in schema blueprint but missing from active Data Store.`
                });
                continue;
            }

            // Compare columns
            const actualColumnsMap = new Map();
            actualTable.column_details.forEach(c => actualColumnsMap.set(c.column_name.toLowerCase(), c));

            // Check for missing or mismatched columns
            for (const expectedCol of expectedTable.columns) {
                const actualCol = actualColumnsMap.get(expectedCol.name.toLowerCase());
                if (!actualCol) {
                    results.hasDrift = true;
                    results.driftDetails.push({
                        type: 'MISSING_COLUMN',
                        table: expectedTable.name,
                        column: expectedCol.name,
                        message: `Column '${expectedCol.name}' in table '${expectedTable.name}' is missing in active database.`
                    });
                    continue;
                }

                // Compare data types (case-insensitive)
                const expectedType = expectedCol.type.toLowerCase();
                const actualType = actualCol.data_type.toLowerCase();

                // Map compatible types
                let typeMatch = false;
                if (expectedType === actualType) {
                    typeMatch = true;
                } else if (expectedType === 'int' && actualType === 'bigint') {
                    typeMatch = true;
                } else if (expectedType === 'varchar' && actualType === 'text') {
                    typeMatch = true;
                } else if (expectedType === 'double' && actualType === 'double precision') {
                    typeMatch = true;
                }

                if (!typeMatch) {
                    results.hasDrift = true;
                    results.driftDetails.push({
                        type: 'TYPE_MISMATCH',
                        table: expectedTable.name,
                        column: expectedCol.name,
                        message: `Column '${expectedCol.name}' data type mismatch. Expected: ${expectedCol.type}, Actual: ${actualCol.data_type}`
                    });
                }

                // Check nullability (is_nullable vs is_mandatory)
                const expectedMandatory = !expectedCol.is_nullable;
                const actualMandatory = !!actualCol.is_mandatory;
                if (expectedMandatory !== actualMandatory) {
                    results.hasDrift = true;
                    results.driftDetails.push({
                        type: 'CONSTRAINT_MISMATCH',
                        table: expectedTable.name,
                        column: expectedCol.name,
                        message: `Column '${expectedCol.name}' mandatory constraint mismatch. Expected Mandatory: ${expectedMandatory}, Actual Mandatory: ${actualMandatory}`
                    });
                }
            }

            // Check for extra columns in active DB
            const expectedColumnsSet = new Set(expectedTable.columns.map(c => c.name.toLowerCase()));
            const SYSTEM_COLUMNS = new Set(['rowid', 'created_time', 'modified_time', 'creator_id', 'modifier_id']);
            for (const colName of actualColumnsMap.keys()) {
                if (!expectedColumnsSet.has(colName) && !SYSTEM_COLUMNS.has(colName)) {
                    results.hasDrift = true;
                    results.driftDetails.push({
                        type: 'EXTRA_COLUMN',
                        table: expectedTable.name,
                        column: colName,
                        message: `Column '${colName}' found in active table '${expectedTable.name}' but is not in schema blueprint.`
                    });
                }
            }
        }

        // 2. Check for extra tables in active DB
        const expectedTablesSet = new Set(EXPECTED_SCHEMA.tables.map(t => t.name));
        for (const tableName of actualTablesMap.keys()) {
            if (!expectedTablesSet.has(tableName)) {
                results.hasDrift = true;
                results.driftDetails.push({
                    type: 'EXTRA_TABLE',
                    table: tableName,
                    message: `Table '${tableName}' exists in active Data Store but is not defined in schema blueprint.`
                });
            }
        }

    } catch (err) {
        results.error = err.message;
        results.hasDrift = true;
        results.driftDetails.push({
            type: 'EXECUTION_ERROR',
            message: `Failed to execute schema drift check: ${err.message}`
        });
    }

    return results;
}

module.exports = {
    detectSchemaDrift
};

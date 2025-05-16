"""
Admin Database Management API
-----------------------------

This module provides routes for administrators to view and query database tables.
All operations are carefully limited and protected to prevent performance issues.
"""

import time
import json
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import text, Table, MetaData, inspect, select, func
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError
from sqlalchemy.engine import CursorResult
from pydantic import BaseModel, Field

from app.auth import get_current_active_user, get_admin_user as get_current_admin_user
from app.database import get_db, engine
from app.models import User
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/database", tags=["admin", "database"])

# Resource protection constants
MAX_QUERY_TIMEOUT = 10  # seconds
MAX_ROWS_PER_PAGE = 50
MAX_RESULT_CACHE_TIME = 60 * 5  # 5 minutes


# Safe tables that can be viewed by admin
ALLOWED_TABLES = [
    "users",
    "subscriptions",
    "subscription_tiers",
    "api_keys",
    "probe_nodes",
    "diagnostic_results",
    "probe_node_status",
    "usage_logs",
]

# Tables with sensitive data that require special handling
SENSITIVE_TABLES = {
    "users": ["hashed_password"],
    "api_keys": ["hashed_key"],
}

# Models
class TableData(BaseModel):
    rows: List[Dict[str, Any]]
    total: int


class TableInfo(BaseModel):
    name: str
    columns: List[Dict[str, Any]]
    primary_key: List[str]
    indices: List[Dict[str, Any]]
    foreign_keys: List[Dict[str, Any]]


class QueryResult(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time: float


# Cache for table metadata to avoid repeated schema introspection
table_metadata_cache = {}
last_cache_update = 0


# Routes
@router.get("/tables", response_model=List[str])
async def get_table_list(
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get list of available database tables for admin access.
    """
    logger.info(f"Admin {current_user.username} requested table list")
    
    try:
        inspector = inspect(engine)
        all_tables = inspector.get_table_names()
        # Only return allowed tables
        return [table for table in all_tables if table in ALLOWED_TABLES]
    except SQLAlchemyError as e:
        logger.error(f"Database error getting table list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )


@router.get("/{table_name}", response_model=TableData)
async def get_table_data(
    table_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=MAX_ROWS_PER_PAGE),
    filter: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get data from a specific table with pagination and optional filtering.
    
    - Pagination is applied with skip and limit parameters
    - Filtering can be applied with format "column:value" or "column:operator:value"
      Examples: "is_active:true", "created_at:gt:2023-01-01"
    """
    # Check if table is allowed
    if table_name not in ALLOWED_TABLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access to table '{table_name}' is not allowed",
        )
    
    logger.info(f"Admin {current_user.username} requested data from {table_name}")
    
    try:
        # Begin transaction
        with engine.begin() as connection:
            # Get sensitive columns if any
            sensitive_columns = SENSITIVE_TABLES.get(table_name, [])
            
            # Build query with proper column selection
            metadata = MetaData()
            table = Table(table_name, metadata, autoload_with=engine)
            
            # Exclude sensitive columns
            columns = [c for c in table.columns if c.name not in sensitive_columns]
            
            # Apply filter if provided
            where_clause = None
            if filter:
                where_clause = build_filter_clause(table, filter)
            
            # Count total rows with same filter
            count_query = select(func.count()).select_from(table)
            if where_clause:
                count_query = count_query.where(where_clause)
            
            total_count = connection.execute(count_query).scalar()
            
            # Build main query
            query = select(*columns).select_from(table)
            if where_clause:
                query = query.where(where_clause)
            
            # Add pagination
            query = query.offset(skip).limit(limit)
            
            # Execute query with timeout protection
            connection.execute(text(f"SET statement_timeout = {MAX_QUERY_TIMEOUT * 1000}"))
            result = connection.execute(query)
            connection.execute(text("SET statement_timeout = 0"))
            
            # Convert to dict representation
            rows = [dict(row) for row in result]
            
            # Log query details for audit
            logger.info(
                f"Admin database query: table={table_name}, filter={filter}, "
                f"rows={len(rows)}/{total_count}, skip={skip}, limit={limit}"
            )
            
            return {"rows": rows, "total": total_count}
    
    except Exception as e:
        error_msg = f"Error querying table {table_name}: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )


@router.get("/{table_name}/info", response_model=TableInfo)
async def get_table_info(
    table_name: str,
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get information and metadata about a database table.
    """
    # Check if table is allowed
    if table_name not in ALLOWED_TABLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access to table '{table_name}' is not allowed",
        )
    
    global table_metadata_cache, last_cache_update
    current_time = time.time()
    
    # Use cached metadata if available and fresh
    if (table_name in table_metadata_cache and 
        current_time - last_cache_update < MAX_RESULT_CACHE_TIME):
        return table_metadata_cache[table_name]
    
    try:
        inspector = inspect(engine)
        
        # Get column information
        columns = []
        for column in inspector.get_columns(table_name):
            column_info = {
                "name": column["name"],
                "type": str(column["type"]),
                "nullable": column["nullable"],
            }
            columns.append(column_info)
        
        # Get primary key
        pk = inspector.get_pk_constraint(table_name)
        primary_key = pk.get("constrained_columns", [])
        
        # Get indices
        indices = []
        for index in inspector.get_indexes(table_name):
            index_info = {
                "name": index["name"],
                "columns": index["column_names"],
                "unique": index["unique"],
            }
            indices.append(index_info)
        
        # Get foreign keys
        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name):
            fk_info = {
                "name": fk.get("name", "unnamed_fk"),
                "columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
                "referred_columns": fk["referred_columns"],
            }
            foreign_keys.append(fk_info)
        
        # Assemble result
        table_info = {
            "name": table_name,
            "columns": columns,
            "primary_key": primary_key,
            "indices": indices,
            "foreign_keys": foreign_keys,
        }
        
        # Cache the result
        table_metadata_cache[table_name] = table_info
        last_cache_update = current_time
        
        return table_info
    
    except Exception as e:
        error_msg = f"Error getting table info for {table_name}: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )


@router.post("/query", response_model=QueryResult)
async def execute_read_query(
    query: str,
    params: Optional[List[Any]] = None,
    timeout: int = Query(5, ge=1, le=MAX_QUERY_TIMEOUT),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Execute a safe read-only SQL query.
    """
    # Safety checks for query
    query_upper = query.upper()
    
    # Only allow SELECT queries
    if not query_upper.strip().startswith("SELECT"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SELECT queries are allowed",
        )
    
    # Check for unsafe operations
    unsafe_keywords = [
        "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE",
        "GRANT", "REVOKE", "VACUUM", "EXPLAIN"
    ]
    
    for keyword in unsafe_keywords:
        if keyword in query_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unsafe SQL keyword detected: {keyword}",
            )
    
    try:
        start_time = time.time()
        
        with engine.begin() as connection:
            # Set query timeout
            connection.execute(text(f"SET statement_timeout = {timeout * 1000}"))
            try:
                if params:
                    result = connection.execute(text(query), params)
                else:
                    result = connection.execute(text(query))
                
                # Get column names
                columns = result.keys()
                
                # Get rows and convert to list of dicts
                rows = [dict(row) for row in result]
                
                execution_time = time.time() - start_time
                
                # Log query for audit
                logger.info(
                    f"Admin executed query: {query[:100]}{'...' if len(query) > 100 else ''}, "
                    f"rows={len(rows)}, time={execution_time:.2f}s"
                )
                
                return {
                    "columns": list(columns),
                    "rows": rows,
                    "row_count": len(rows),
                    "execution_time": execution_time,
                }
            
            finally:
                # Reset timeout
                connection.execute(text("SET statement_timeout = 0"))
    
    except Exception as e:
        error_msg = f"Error executing query: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )


@router.get("/{table_name}/download")
async def download_table_data(
    table_name: str,
    format: str = Query("csv", regex="^(csv|json)$"),
    filter: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
):
    """
    Download table data in CSV or JSON format.
    """
    # Check if table is allowed
    if table_name not in ALLOWED_TABLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access to table '{table_name}' is not allowed",
        )
    
    try:
        # Get table data similar to get_table_data but without pagination
        with engine.begin() as connection:
            # Get sensitive columns if any
            sensitive_columns = SENSITIVE_TABLES.get(table_name, [])
            
            # Build query with proper column selection
            metadata = MetaData()
            table = Table(table_name, metadata, autoload_with=engine)
            
            # Exclude sensitive columns
            columns = [c for c in table.columns if c.name not in sensitive_columns]
            
            # Apply filter if provided
            where_clause = None
            if filter:
                where_clause = build_filter_clause(table, filter)
            
            # Build main query
            query = select(*columns).select_from(table)
            if where_clause:
                query = query.where(where_clause)
            
            # Execute query with timeout protection
            connection.execute(text(f"SET statement_timeout = {MAX_QUERY_TIMEOUT * 1000}"))
            result = connection.execute(query)
            connection.execute(text("SET statement_timeout = 0"))
            
            # Convert to dict representation
            rows = [dict(row) for row in result]
            
            # Generate output based on format
            if format == "csv":
                # Create CSV content
                import csv
                import io
                
                output = io.StringIO()
                if rows:
                    fieldnames = rows[0].keys()
                    writer = csv.DictWriter(output, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(rows)
                
                # Set response headers
                content = output.getvalue().encode("utf-8")
                media_type = "text/csv"
                filename = f"{table_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
            
            else:  # JSON format
                content = json.dumps(rows, default=str).encode("utf-8")
                media_type = "application/json"
                filename = f"{table_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
            
            # Log download for audit
            logger.info(
                f"Admin {current_user.username} downloaded {table_name} in {format} format, "
                f"rows={len(rows)}, filter={filter}"
            )
            
            # Return response with proper headers
            headers = {
                "Content-Disposition": f"attachment; filename={filename}"
            }
            return Response(
                content=content,
                media_type=media_type,
                headers=headers
            )
    
    except Exception as e:
        error_msg = f"Error downloading table {table_name}: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )


# Helper functions
def build_filter_clause(table, filter_str):
    """
    Parse and build a SQLAlchemy filter clause from a filter string.
    
    Format:
    - "column:value" - exact match
    - "column:operator:value" - comparison with operator
    
    Supported operators: eq, ne, gt, ge, lt, le, like, ilike
    """
    from sqlalchemy import and_, or_, not_
    
    if not filter_str:
        return None
    
    # Get column map for easy access
    columns = {c.name: c for c in table.columns}
    
    # Parse filter parts
    parts = filter_str.split(":")
    
    if len(parts) >= 2:
        col_name = parts[0]
        
        # Check if column exists
        if col_name not in columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Column '{col_name}' not found in table",
            )
        
        column = columns[col_name]
        
        # Handle different formats
        if len(parts) == 2:
            # Simple equality: "column:value"
            value = parts[1]
            return column == convert_value(value, column.type)
        
        elif len(parts) >= 3:
            # Operator comparison: "column:operator:value"
            operator = parts[1].lower()
            value = parts[2]
            
            # Convert value based on column type
            converted_value = convert_value(value, column.type)
            
            # Apply operator
            if operator == "eq":
                return column == converted_value
            elif operator == "ne":
                return column != converted_value
            elif operator == "gt":
                return column > converted_value
            elif operator == "ge":
                return column >= converted_value
            elif operator == "lt":
                return column < converted_value
            elif operator == "le":
                return column <= converted_value
            elif operator == "like":
                return column.like(f"%{value}%")
            elif operator == "ilike":
                return column.ilike(f"%{value}%")
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported operator: {operator}",
                )
    
    # Default: no filter
    return None


def convert_value(value_str, column_type):
    """Convert a string value to the appropriate type based on column type."""
    from sqlalchemy.types import Boolean, Integer, Float, DateTime, String
    
    if isinstance(column_type, String):
        return value_str
    
    elif isinstance(column_type, Boolean):
        if value_str.lower() in ("true", "t", "yes", "y", "1"):
            return True
        elif value_str.lower() in ("false", "f", "no", "n", "0"):
            return False
        raise ValueError(f"Cannot convert '{value_str}' to Boolean")
    
    elif isinstance(column_type, Integer):
        return int(value_str)
    
    elif isinstance(column_type, Float):
        return float(value_str)
    
    elif isinstance(column_type, DateTime):
        try:
            from dateutil import parser
            return parser.parse(value_str)
        except ImportError:
            # Fallback if dateutil not available
            return datetime.fromisoformat(value_str.replace("Z", "+00:00"))
    
    # Default: return as string
    return value_str
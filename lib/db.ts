import { Pool } from "pg";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Determine which database to use
const useSupabase = process.env.USE_SUPABASE === "true";

// Initialize Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Supabase client
let supabase: SupabaseClient | null = null;
if (useSupabase) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_KEY must be set when USE_SUPABASE is true"
    );
  }

  supabase = createClient(supabaseUrl, supabaseKey);
}

// Error logging helper
function logError(operation: string, error: any, context?: any): Error {
  console.error(`[Database Error - ${operation}]`, {
    message: error.message,
    code: error.code,
    details: error,
    context,
    timestamp: new Date().toISOString(),
  });

  // Return user-friendly error
  return new Error("Network error occurred, please retry later");
}

// Standard result types
export interface DbResult<T> {
  data: T;
  error: null;
}

export interface DbError {
  data: null;
  error: Error;
}

export type DbResponse<T> = DbResult<T> | DbError;

// Where clause type
export interface WhereClause {
  [column: string]: any;
}

// Order by clause type
export interface OrderBy {
  column: string;
  direction: "asc" | "desc";
}

// Generic database interface
export const db = {
  /**
   * Select a single row from a table
   */
  async selectOne<T>(
    table: string,
    where: WhereClause
  ): Promise<DbResponse<T | null>> {
    try {
      if (useSupabase && supabase) {
        let query = supabase.from(table).select("*");

        // Apply where conditions
        for (const [column, value] of Object.entries(where)) {
          query = query.eq(column, value);
        }

        const { data, error } = await query.single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows returned
          return {
            data: null,
            error: logError("selectOne", error, { table, where }),
          };
        }

        return { data: (data as T) || null, error: null };
      } else {
        // Build Postgres query
        const columns = Object.keys(where);
        const values = Object.values(where);
        const whereClause = columns
          .map((col, idx) => `${col} = $${idx + 1}`)
          .join(" AND ");

        const result = await pool.query(
          `SELECT * FROM ${table} WHERE ${whereClause}`,
          values
        );

        return { data: (result.rows[0] as T) || null, error: null };
      }
    } catch (error) {
      return {
        data: null,
        error: logError("selectOne", error, { table, where }),
      };
    }
  },

  /**
   * Select multiple rows from a table
   */
  async selectMany<T>(
    table: string,
    where: WhereClause,
    orderBy?: OrderBy
  ): Promise<DbResponse<T[]>> {
    try {
      if (useSupabase && supabase) {
        let query = supabase.from(table).select("*");

        // Apply where conditions
        for (const [column, value] of Object.entries(where)) {
          query = query.eq(column, value);
        }

        // Apply order by
        if (orderBy) {
          query = query.order(orderBy.column, {
            ascending: orderBy.direction === "asc",
          });
        }

        const { data, error } = await query;

        if (error) {
          return {
            data: null,
            error: logError("selectMany", error, { table, where, orderBy }),
          };
        }

        return { data: (data as T[]) || [], error: null };
      } else {
        // Build Postgres query
        const columns = Object.keys(where);
        const values = Object.values(where);
        const whereClause = columns
          .map((col, idx) => `${col} = $${idx + 1}`)
          .join(" AND ");

        let query = `SELECT * FROM ${table} WHERE ${whereClause}`;

        if (orderBy) {
          query += ` ORDER BY ${
            orderBy.column
          } ${orderBy.direction.toUpperCase()}`;
        }

        const result = await pool.query(query, values);

        return { data: result.rows as T[], error: null };
      }
    } catch (error) {
      return {
        data: null,
        error: logError("selectMany", error, { table, where, orderBy }),
      };
    }
  },

  /**
   * Insert a row into a table
   */
  async insert<T>(table: string, values: Partial<T>): Promise<DbResponse<T>> {
    try {
      if (useSupabase && supabase) {
        const { data, error } = await supabase
          .from(table)
          .insert(values)
          .select()
          .single();

        if (error) {
          return {
            data: null,
            error: logError("insert", error, { table, values }),
          };
        }

        return { data: data as T, error: null };
      } else {
        // Build Postgres query
        const columns = Object.keys(values);
        const vals = Object.values(values);
        const placeholders = vals.map((_, idx) => `$${idx + 1}`).join(", ");
        const columnNames = columns.join(", ");

        const result = await pool.query(
          `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) RETURNING *`,
          vals
        );

        return { data: result.rows[0] as T, error: null };
      }
    } catch (error) {
      return {
        data: null,
        error: logError("insert", error, { table, values }),
      };
    }
  },

  /**
   * Update a row in a table
   */
  async update<T>(
    table: string,
    values: Partial<T>,
    where: WhereClause
  ): Promise<DbResponse<T | null>> {
    try {
      if (useSupabase && supabase) {
        let query = supabase.from(table).update(values);

        // Apply where conditions
        for (const [column, value] of Object.entries(where)) {
          query = query.eq(column, value);
        }

        const { data, error } = await query.select().single();

        if (error && error.code !== "PGRST116") {
          return {
            data: null,
            error: logError("update", error, { table, values, where }),
          };
        }

        return { data: (data as T) || null, error: null };
      } else {
        // Build Postgres query
        const setColumns = Object.keys(values);
        const setValues = Object.values(values);
        const whereColumns = Object.keys(where);
        const whereValues = Object.values(where);

        const setClause = setColumns
          .map((col, idx) => `${col} = $${idx + 1}`)
          .join(", ");
        const whereClause = whereColumns
          .map((col, idx) => `${col} = $${setColumns.length + idx + 1}`)
          .join(" AND ");

        const result = await pool.query(
          `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`,
          [...setValues, ...whereValues]
        );

        return { data: (result.rows[0] as T) || null, error: null };
      }
    } catch (error) {
      return {
        data: null,
        error: logError("update", error, { table, values, where }),
      };
    }
  },

  /**
   * Delete rows from a table
   */
  async delete(
    table: string,
    where: WhereClause
  ): Promise<DbResponse<{ count: number }>> {
    try {
      if (useSupabase && supabase) {
        let query = supabase.from(table).delete({ count: "exact" });

        // Apply where conditions
        for (const [column, value] of Object.entries(where)) {
          query = query.eq(column, value);
        }

        const { error, count } = await query;

        if (error) {
          return {
            data: null,
            error: logError("delete", error, { table, where }),
          };
        }

        return { data: { count: count || 0 }, error: null };
      } else {
        // Build Postgres query
        const columns = Object.keys(where);
        const values = Object.values(where);
        const whereClause = columns
          .map((col, idx) => `${col} = $${idx + 1}`)
          .join(" AND ");

        const result = await pool.query(
          `DELETE FROM ${table} WHERE ${whereClause}`,
          values
        );

        return { data: { count: result.rowCount || 0 }, error: null };
      }
    } catch (error) {
      return {
        data: null,
        error: logError("delete", error, { table, where }),
      };
    }
  },
};

export default pool;

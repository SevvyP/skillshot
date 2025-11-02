const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log("Testing database connection...");

    const result = await client.query("SELECT NOW()");
    console.log("✓ Database connected successfully");
    console.log("Current time:", result.rows[0].now);

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log("\n✓ Tables in database:");
    tablesResult.rows.forEach((row) => {
      console.log("  -", row.table_name);
    });

    console.log("\n✓ Database setup complete!");
  } catch (error) {
    console.error("✗ Error setting up database:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();

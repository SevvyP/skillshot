import pool from "./db";

export interface User {
  id: number;
  auth0_id: string;
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BulletPoint {
  id: number;
  user_id: number;
  text: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

// User operations
export async function getUserByAuth0Id(auth0Id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE auth0_id = $1",
    [auth0Id]
  );
  return result.rows[0] || null;
}

export async function createUser(
  auth0Id: string,
  email: string,
  name?: string
): Promise<User> {
  const result = await pool.query<User>(
    "INSERT INTO users (auth0_id, email, name) VALUES ($1, $2, $3) RETURNING *",
    [auth0Id, email, name]
  );
  return result.rows[0];
}

export async function getOrCreateUser(
  auth0Id: string,
  email: string,
  name?: string
): Promise<User> {
  let user = await getUserByAuth0Id(auth0Id);
  if (!user) {
    user = await createUser(auth0Id, email, name);
  }
  return user;
}

// Bullet point operations
export async function getBulletPointsByUserId(
  userId: number
): Promise<BulletPoint[]> {
  const result = await pool.query<BulletPoint>(
    "SELECT * FROM bullet_points WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

export async function getBulletPointById(
  id: number,
  userId: number
): Promise<BulletPoint | null> {
  const result = await pool.query<BulletPoint>(
    "SELECT * FROM bullet_points WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function createBulletPoint(
  userId: number,
  text: string,
  tags: string[] = []
): Promise<BulletPoint> {
  const result = await pool.query<BulletPoint>(
    "INSERT INTO bullet_points (user_id, text, tags) VALUES ($1, $2, $3) RETURNING *",
    [userId, text, tags]
  );
  return result.rows[0];
}

export async function updateBulletPoint(
  id: number,
  userId: number,
  text: string,
  tags: string[]
): Promise<BulletPoint | null> {
  const result = await pool.query<BulletPoint>(
    "UPDATE bullet_points SET text = $1, tags = $2 WHERE id = $3 AND user_id = $4 RETURNING *",
    [text, tags, id, userId]
  );
  return result.rows[0] || null;
}

export async function deleteBulletPoint(
  id: number,
  userId: number
): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM bullet_points WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

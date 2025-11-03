import { db } from "./db";

export interface User {
  id: number;
  auth0_id: string;
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
  const result = await db.selectOne<User>("users", { auth0_id: auth0Id });
  if (result.error) throw result.error;
  return result.data;
}

export async function createUser(auth0Id: string): Promise<User> {
  const result = await db.insert<User>("users", {
    auth0_id: auth0Id,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function getOrCreateUser(auth0Id: string): Promise<User> {
  let user = await getUserByAuth0Id(auth0Id);
  if (!user) {
    user = await createUser(auth0Id);
  }
  return user;
}

// Bullet point operations
export async function getBulletPointsByUserId(
  userId: number
): Promise<BulletPoint[]> {
  const result = await db.selectMany<BulletPoint>(
    "bullet_points",
    { user_id: userId },
    { column: "created_at", direction: "desc" }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function getBulletPointById(
  id: number,
  userId: number
): Promise<BulletPoint | null> {
  const result = await db.selectOne<BulletPoint>("bullet_points", {
    id,
    user_id: userId,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function createBulletPoint(
  userId: number,
  text: string,
  tags: string[] = []
): Promise<BulletPoint> {
  const result = await db.insert<BulletPoint>("bullet_points", {
    user_id: userId,
    text,
    tags,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function updateBulletPoint(
  id: number,
  userId: number,
  text: string,
  tags: string[]
): Promise<BulletPoint | null> {
  const result = await db.update<BulletPoint>(
    "bullet_points",
    { text, tags },
    { id, user_id: userId }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteBulletPoint(
  id: number,
  userId: number
): Promise<boolean> {
  const result = await db.delete("bullet_points", { id, user_id: userId });
  if (result.error) throw result.error;
  return result.data.count > 0;
}

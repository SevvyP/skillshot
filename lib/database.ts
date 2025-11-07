import { db } from "./db";

export interface User {
  id: number;
  auth0_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface BulletPoint {
  id?: number;
  user_id: number;
  content: string;
  job_id: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface Company {
  id: number;
  user_id: number;
  name: string;
  city: string | null;
  state: string | null;
  is_remote: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Job {
  id: number;
  user_id: number;
  company_id: number;
  title: string;
  start_date: Date;
  end_date: Date | null;
  is_current: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Skill {
  id: number;
  user_id: number;
  name: string;
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

export async function getBulletPointsByJobId(
  jobId: number,
  userId: number
): Promise<BulletPoint[]> {
  const result = await db.selectMany<BulletPoint>(
    "bullet_points",
    { job_id: jobId, user_id: userId },
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
  jobId: number,
  content: string
): Promise<BulletPoint> {
  const result = await db.insert<BulletPoint>("bullet_points", {
    user_id: userId,
    job_id: jobId,
    content,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function updateBulletPoint(
  id: number,
  userId: number,
  content: string
): Promise<BulletPoint | null> {
  const result = await db.update<BulletPoint>(
    "bullet_points",
    { content },
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

// Company operations
export async function getCompaniesByUserId(userId: number): Promise<Company[]> {
  const result = await db.selectMany<Company>(
    "companies",
    { user_id: userId },
    { column: "name", direction: "asc" }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function getCompanyById(
  id: number,
  userId: number
): Promise<Company | null> {
  const result = await db.selectOne<Company>("companies", {
    id,
    user_id: userId,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function createCompany(
  userId: number,
  name: string,
  city: string | null = null,
  state: string | null = null,
  isRemote: boolean = false
): Promise<Company> {
  const result = await db.insert<Company>("companies", {
    user_id: userId,
    name,
    city,
    state,
    is_remote: isRemote,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function updateCompany(
  id: number,
  userId: number,
  name: string,
  city: string | null,
  state: string | null,
  isRemote: boolean
): Promise<Company | null> {
  const result = await db.update<Company>(
    "companies",
    { name, city, state, is_remote: isRemote },
    { id, user_id: userId }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteCompany(
  id: number,
  userId: number
): Promise<boolean> {
  const result = await db.delete("companies", { id, user_id: userId });
  if (result.error) throw result.error;
  return result.data.count > 0;
}

// Job operations
export async function getJobsByUserId(userId: number): Promise<Job[]> {
  const result = await db.selectMany<Job>(
    "jobs",
    { user_id: userId },
    { column: "start_date", direction: "desc" }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function getJobsByCompanyId(
  companyId: number,
  userId: number
): Promise<Job[]> {
  const result = await db.selectMany<Job>(
    "jobs",
    { company_id: companyId, user_id: userId },
    { column: "start_date", direction: "desc" }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function getJobById(
  id: number,
  userId: number
): Promise<Job | null> {
  const result = await db.selectOne<Job>("jobs", { id, user_id: userId });
  if (result.error) throw result.error;
  return result.data;
}

export async function createJob(
  userId: number,
  companyId: number,
  title: string,
  startDate: Date,
  endDate: Date | null = null,
  isCurrent: boolean = false
): Promise<Job> {
  const result = await db.insert<Job>("jobs", {
    user_id: userId,
    company_id: companyId,
    title,
    start_date: startDate,
    end_date: endDate,
    is_current: isCurrent,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function updateJob(
  id: number,
  userId: number,
  title: string,
  startDate: Date,
  endDate: Date | null,
  isCurrent: boolean
): Promise<Job | null> {
  const result = await db.update<Job>(
    "jobs",
    { title, start_date: startDate, end_date: endDate, is_current: isCurrent },
    { id, user_id: userId }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteJob(id: number, userId: number): Promise<boolean> {
  const result = await db.delete("jobs", { id, user_id: userId });
  if (result.error) throw result.error;
  return result.data.count > 0;
}

// Skill operations
export async function getSkillsByUserId(userId: number): Promise<Skill[]> {
  const result = await db.selectMany<Skill>(
    "skills",
    { user_id: userId },
    { column: "name", direction: "asc" }
  );
  if (result.error) throw result.error;
  return result.data;
}

export async function getSkillById(
  id: number,
  userId: number
): Promise<Skill | null> {
  const result = await db.selectOne<Skill>("skills", { id, user_id: userId });
  if (result.error) throw result.error;
  return result.data;
}

export async function getOrCreateSkill(
  userId: number,
  name: string
): Promise<Skill> {
  // Try to find existing skill
  const result = await db.selectOne<Skill>("skills", {
    user_id: userId,
    name: name,
  });

  if (result.data) {
    return result.data;
  }

  // Create new skill if not found
  const insertResult = await db.insert<Skill>("skills", {
    user_id: userId,
    name: name,
  });

  if (insertResult.error) throw insertResult.error;
  return insertResult.data;
}

export async function createSkill(userId: number, name: string): Promise<Skill> {
  const result = await db.insert<Skill>("skills", {
    user_id: userId,
    name,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function deleteSkill(id: number, userId: number): Promise<boolean> {
  const result = await db.delete("skills", { id, user_id: userId });
  if (result.error) throw result.error;
  return result.data.count > 0;
}

// Bullet Point Skills junction operations
export async function linkBulletPointToSkill(
  bulletPointId: number,
  skillId: number
): Promise<void> {
  const result = await db.insert("bullet_point_skills", {
    bullet_point_id: bulletPointId,
    skill_id: skillId,
  });
  if (result.error) throw result.error;
}

export async function getSkillsForBulletPoint(
  bulletPointId: number
): Promise<Skill[]> {
  // Use Supabase directly for JOIN query
  const { supabase } = await import("./db");
  
  const { data, error } = await supabase
    .from("bullet_point_skills")
    .select(`
      skill_id,
      skills (
        id,
        user_id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq("bullet_point_id", bulletPointId);

  if (error) throw error;

  // Extract skills from the nested response
  return (data || [])
    .map((item: any) => item.skills)
    .filter((skill: any) => skill !== null) as Skill[];
}

export async function unlinkBulletPointFromSkill(
  bulletPointId: number,
  skillId: number
): Promise<void> {
  const result = await db.delete("bullet_point_skills", {
    bullet_point_id: bulletPointId,
    skill_id: skillId,
  });
  if (result.error) throw result.error;
}

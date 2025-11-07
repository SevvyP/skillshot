-- Migration: Add companies, jobs, skills tables and update bullet_points structure
-- Date: 2025-11-07

-- First, delete all existing bullet points (as per requirement)
DELETE FROM "public"."bullet_points";

-- Create companies table
CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100),
    "state" VARCHAR(50),
    "is_remote" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "company_id" INTEGER NOT NULL REFERENCES "public"."companies"("id") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create skills table
CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("user_id", "name")
);

-- Alter bullet_points table to add job_id, remove tags array, and rename text to content
ALTER TABLE "public"."bullet_points" 
    ADD COLUMN "job_id" INTEGER REFERENCES "public"."jobs"("id") ON DELETE CASCADE;

-- Drop the tags column (moving to normalized skills relationship)
ALTER TABLE "public"."bullet_points" DROP COLUMN IF EXISTS "tags";

-- Rename text column to content
ALTER TABLE "public"."bullet_points" RENAME COLUMN "text" TO "content";

-- Create junction table for bullet_points and skills (many-to-many)
CREATE TABLE IF NOT EXISTS "public"."bullet_point_skills" (
    "bullet_point_id" INTEGER NOT NULL REFERENCES "public"."bullet_points"("id") ON DELETE CASCADE,
    "skill_id" INTEGER NOT NULL REFERENCES "public"."skills"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("bullet_point_id", "skill_id")
);

-- Create indexes for better query performance
CREATE INDEX "idx_companies_user_id" ON "public"."companies" USING btree ("user_id");
CREATE INDEX "idx_jobs_user_id" ON "public"."jobs" USING btree ("user_id");
CREATE INDEX "idx_jobs_company_id" ON "public"."jobs" USING btree ("company_id");
CREATE INDEX "idx_jobs_is_current" ON "public"."jobs" USING btree ("is_current");
CREATE INDEX "idx_skills_user_id" ON "public"."skills" USING btree ("user_id");
CREATE INDEX "idx_skills_name" ON "public"."skills" USING btree ("name");
CREATE INDEX "idx_bullet_points_job_id" ON "public"."bullet_points" USING btree ("job_id");
CREATE INDEX "idx_bullet_point_skills_skill_id" ON "public"."bullet_point_skills" USING btree ("skill_id");

-- Add triggers for updated_at columns
CREATE TRIGGER "update_companies_updated_at" 
    BEFORE UPDATE ON "public"."companies" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_jobs_updated_at" 
    BEFORE UPDATE ON "public"."jobs" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_skills_updated_at" 
    BEFORE UPDATE ON "public"."skills" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Enable Row Level Security
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."bullet_point_skills" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Enable insert for authenticated users only" 
    ON "public"."companies" FOR INSERT 
    TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
    ON "public"."companies" FOR SELECT 
    USING (true);

CREATE POLICY "Enable update for authenticated users only" 
    ON "public"."companies" FOR UPDATE 
    TO "authenticated" USING (true);

CREATE POLICY "Enable delete for authenticated users only" 
    ON "public"."companies" FOR DELETE 
    TO "authenticated" USING (true);

-- Create RLS policies for jobs
CREATE POLICY "Enable insert for authenticated users only" 
    ON "public"."jobs" FOR INSERT 
    TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
    ON "public"."jobs" FOR SELECT 
    USING (true);

CREATE POLICY "Enable update for authenticated users only" 
    ON "public"."jobs" FOR UPDATE 
    TO "authenticated" USING (true);

CREATE POLICY "Enable delete for authenticated users only" 
    ON "public"."jobs" FOR DELETE 
    TO "authenticated" USING (true);

-- Create RLS policies for skills
CREATE POLICY "Enable insert for authenticated users only" 
    ON "public"."skills" FOR INSERT 
    TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
    ON "public"."skills" FOR SELECT 
    USING (true);

CREATE POLICY "Enable update for authenticated users only" 
    ON "public"."skills" FOR UPDATE 
    TO "authenticated" USING (true);

CREATE POLICY "Enable delete for authenticated users only" 
    ON "public"."skills" FOR DELETE 
    TO "authenticated" USING (true);

-- Create RLS policies for bullet_point_skills
CREATE POLICY "Enable insert for authenticated users only" 
    ON "public"."bullet_point_skills" FOR INSERT 
    TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
    ON "public"."bullet_point_skills" FOR SELECT 
    USING (true);

CREATE POLICY "Enable delete for authenticated users only" 
    ON "public"."bullet_point_skills" FOR DELETE 
    TO "authenticated" USING (true);

-- Grant permissions
GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";

GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."companies_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";

GRANT ALL ON SEQUENCE "public"."jobs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."jobs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."jobs_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."skills" TO "anon";
GRANT ALL ON TABLE "public"."skills" TO "authenticated";
GRANT ALL ON TABLE "public"."skills" TO "service_role";

GRANT ALL ON SEQUENCE "public"."skills_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."skills_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."skills_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."bullet_point_skills" TO "anon";
GRANT ALL ON TABLE "public"."bullet_point_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."bullet_point_skills" TO "service_role";

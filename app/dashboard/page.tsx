"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface BulletPoint {
  id: number;
  content: string;
  created_at: string;
  job_id: number;
  skills?: Skill[];
}

interface Job {
  id: number;
  company_id: number;
  title: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
}

interface Company {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  is_remote: boolean;
}

interface Skill {
  id: number;
  name: string;
}

interface CompanyWithJobs extends Company {
  jobs: (Job & { bullet_points: BulletPoint[] })[];
}

export default function Dashboard() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyWithJobs[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBulletText, setNewBulletText] = useState("");
  const [newBulletTags, setNewBulletTags] = useState("");
  const [newBulletJobId, setNewBulletJobId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editTags, setEditTags] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Company management states
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCity, setNewCompanyCity] = useState("");
  const [newCompanyState, setNewCompanyState] = useState("");
  const [newCompanyIsRemote, setNewCompanyIsRemote] = useState(false);

  // Job management states
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [newJobCompanyId, setNewJobCompanyId] = useState<number | null>(null);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobStartDate, setNewJobStartDate] = useState("");
  const [newJobEndDate, setNewJobEndDate] = useState("");
  const [newJobIsCurrent, setNewJobIsCurrent] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadingTimeout(true);
        router.push("/");
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timer);
  }, [isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch companies, jobs, bullet points, and skills in parallel
      const [companiesRes, jobsRes, bulletPointsRes, skillsRes] =
        await Promise.all([
          fetch("/api/companies"),
          fetch("/api/jobs"),
          fetch("/api/bullet-points"),
          fetch("/api/skills"),
        ]);

      let companiesData = [];
      let jobsData = [];
      let bulletPointsData = [];
      let skillsData = [];

      if (companiesRes.ok) {
        const data = await companiesRes.json();
        companiesData = data.companies || [];
      }

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        jobsData = data.jobs || [];
      }

      if (bulletPointsRes.ok) {
        const data = await bulletPointsRes.json();
        bulletPointsData = data.bulletPoints || [];
      }

      if (skillsRes.ok) {
        const data = await skillsRes.json();
        skillsData = data.skills || [];
      }

      // Group bullet points by job_id
      const bulletPointsByJob = bulletPointsData.reduce((acc: any, bp: any) => {
        if (!acc[bp.job_id]) {
          acc[bp.job_id] = [];
        }
        acc[bp.job_id].push(bp);
        return acc;
      }, {});

      // Attach bullet points to jobs
      const jobsWithBullets = jobsData.map((job: Job) => ({
        ...job,
        bullet_points: bulletPointsByJob[job.id] || [],
      }));

      // Group jobs by company_id
      const jobsByCompany = jobsWithBullets.reduce((acc: any, job: any) => {
        if (!acc[job.company_id]) {
          acc[job.company_id] = [];
        }
        acc[job.company_id].push(job);
        return acc;
      }, {});

      // Attach jobs to companies and sort by start date
      const companiesWithJobs = companiesData.map((company: Company) => ({
        ...company,
        jobs: (jobsByCompany[company.id] || []).sort((a: Job, b: Job) => {
          return (
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
          );
        }),
      }));

      setCompanies(companiesWithJobs);
      setSkills(skillsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBulletPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBulletText.trim() || !newBulletJobId) return;

    try {
      const skills = newBulletTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      const response = await fetch("/api/bullet-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newBulletText,
          skills,
          job_id: newBulletJobId,
        }),
      });

      if (response.ok) {
        setNewBulletText("");
        setNewBulletTags("");
        setNewBulletJobId(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error adding bullet point:", error);
    }
  };

  const handleEditBulletPoint = async (id: number) => {
    if (!editText.trim()) return;

    try {
      const skills = editTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      const response = await fetch(`/api/bullet-points/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText, skills }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditText("");
        setEditTags("");
        fetchData();
      }
    } catch (error) {
      console.error("Error updating bullet point:", error);
    }
  };

  const handleDeleteBulletPoint = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bullet point?")) return;

    try {
      const response = await fetch(`/api/bullet-points/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting bullet point:", error);
    }
  };

  const handleDeleteAll = async () => {
    const totalBulletPoints = companies.reduce(
      (sum, company) =>
        sum +
        company.jobs.reduce(
          (jobSum, job) => jobSum + job.bullet_points.length,
          0
        ),
      0
    );

    if (totalBulletPoints === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ALL ${totalBulletPoints} bullet points? This action cannot be undone.`
      )
    )
      return;

    try {
      const response = await fetch("/api/bullet-points/delete-all", {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      } else {
        alert("Error deleting bullet points. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting all bullet points:", error);
      alert("Error deleting bullet points. Please try again.");
    }
  };

  const startEditing = (bulletPoint: BulletPoint) => {
    setEditingId(bulletPoint.id);
    setEditText(bulletPoint.content);
    setEditTags(bulletPoint.skills?.map((s) => s.name).join(", ") || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
    setEditTags("");
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName,
          city: newCompanyCity || null,
          state: newCompanyState || null,
          is_remote: newCompanyIsRemote,
        }),
      });

      if (response.ok) {
        setShowAddCompanyModal(false);
        setNewCompanyName("");
        setNewCompanyCity("");
        setNewCompanyState("");
        setNewCompanyIsRemote(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error adding company:", error);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobCompanyId || !newJobStartDate) return;

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: newJobCompanyId,
          title: newJobTitle,
          start_date: newJobStartDate,
          end_date: newJobIsCurrent ? null : newJobEndDate || null,
          is_current: newJobIsCurrent,
        }),
      });

      if (response.ok) {
        setShowAddJobModal(false);
        setNewJobTitle("");
        setNewJobCompanyId(null);
        setNewJobStartDate("");
        setNewJobEndDate("");
        setNewJobIsCurrent(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error adding job:", error);
    }
  };

  const handleEditJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJobId || !newJobTitle.trim() || !newJobStartDate) return;

    try {
      const response = await fetch(`/api/jobs/${editingJobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newJobTitle,
          start_date: newJobStartDate,
          end_date: newJobIsCurrent ? null : newJobEndDate || null,
          is_current: newJobIsCurrent,
        }),
      });

      if (response.ok) {
        setShowEditJobModal(false);
        setEditingJobId(null);
        setNewJobTitle("");
        setNewJobStartDate("");
        setNewJobEndDate("");
        setNewJobIsCurrent(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating job:", error);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this job? All associated bullet points will be deleted."
      )
    )
      return;

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const handleDeleteSkill = async (id: number, skillName: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${skillName}"?`))
      return;

    try {
      const response = await fetch(`/api/skills/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting skill:", error);
    }
  };

  const startEditingJob = (job: Job) => {
    setEditingJobId(job.id);
    setNewJobTitle(job.title);
    setNewJobStartDate(job.start_date.split("T")[0]);
    setNewJobEndDate(job.end_date ? job.end_date.split("T")[0] : "");
    setNewJobIsCurrent(job.is_current);
    setShowEditJobModal(true);
  };

  const handleDeleteCompany = async (id: number, companyName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${companyName}"? All associated jobs and bullet points will be deleted.`
      )
    )
      return;

    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting company:", error);
    }
  };

  const handleDeleteAllSkills = async () => {
    if (skills.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ALL ${skills.length} skills? This action cannot be undone.`
      )
    )
      return;

    try {
      // Delete all skills one by one
      await Promise.all(
        skills.map((skill) =>
          fetch(`/api/skills/${skill.id}`, {
            method: "DELETE",
          })
        )
      );
      fetchData();
    } catch (error) {
      console.error("Error deleting all skills:", error);
      alert("Error deleting skills. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(
          `Successfully extracted ${data.jobCount} jobs with ${data.bulletPointCount} bullet points and ${data.skillCount} skills!`
        );
        fetchData();
      } else {
        setUploadMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadMessage("Error uploading file. Please try again.");
    } finally {
      setUploadingFile(false);
      // Reset file input
      e.target.value = "";
    }
  };

  if ((isLoading || loading) && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || error || loadingTimeout) {
    return null; // Will redirect to home
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">skillshot</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.name || user.email}</span>
            <a
              href="/api/auth/logout"
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Sign Out
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Upload Resume
          </h2>
          <p className="text-gray-600 mb-4">
            Upload a PDF or Word document to automatically extract bullet points
          </p>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              {uploadingFile ? "Uploading..." : "Choose File"}
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
            </label>
            {uploadMessage && (
              <span
                className={`text-sm ${
                  uploadMessage.includes("Error")
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {uploadMessage}
              </span>
            )}
          </div>
        </div>

        {/* Add New Bullet Point */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Add New Bullet Point
          </h2>
          <form onSubmit={handleAddBulletPoint}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job
              </label>
              <select
                value={newBulletJobId || ""}
                onChange={(e) => setNewBulletJobId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              >
                <option value="">Select a job...</option>
                {companies.map((company) =>
                  (company.jobs || []).map((job) => (
                    <option key={job.id} value={job.id}>
                      {company.name} - {job.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bullet Point Text
              </label>
              <textarea
                value={newBulletText}
                onChange={(e) => setNewBulletText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your accomplishment or responsibility..."
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={newBulletTags}
                onChange={(e) => setNewBulletTags(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="JavaScript, React, Leadership..."
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Add Bullet Point
            </button>
          </form>
        </div>

        {/* Bullet Points List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Your Experience
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddCompanyModal(true)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Add Company
              </button>
              {companies.some((c) =>
                c.jobs.some((j) => j.bullet_points.length > 0)
              ) && (
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete All
                </button>
              )}
            </div>
          </div>

          {companies.length === 0 ? (
            <p className="text-gray-600">
              No experience yet. Add a company or upload a resume to get
              started!
            </p>
          ) : (
            <div className="space-y-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {company.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {company.is_remote
                          ? "Remote"
                          : company.city && company.state
                          ? `${company.city}, ${company.state}`
                          : "Location not specified"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setNewJobCompanyId(company.id);
                          setShowAddJobModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Add Job
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCompany(company.id, company.name)
                        }
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete Company
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {company.jobs.length === 0 ? (
                      <p className="text-sm text-gray-500 italic ml-4">
                        No jobs yet. Click "Add Job" above to get started.
                      </p>
                    ) : (
                      company.jobs.map((job) => (
                        <div
                          key={job.id}
                          className="ml-4 border-l-2 border-indigo-200 pl-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-800">
                                {job.title}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {new Date(job.start_date).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}{" "}
                                -{" "}
                                {job.is_current
                                  ? "Present"
                                  : job.end_date
                                  ? new Date(job.end_date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditingJob(job)}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {job.bullet_points.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                              No bullet points yet
                            </p>
                          ) : (
                            <div className="space-y-3 mt-3">
                              {job.bullet_points.map((bp) => (
                                <div
                                  key={bp.id}
                                  className="bg-gray-50 border border-gray-200 rounded p-3"
                                >
                                  {editingId === bp.id ? (
                                    // Edit Mode
                                    <div>
                                      <textarea
                                        value={editText}
                                        onChange={(e) =>
                                          setEditText(e.target.value)
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
                                        rows={3}
                                      />
                                      <input
                                        type="text"
                                        value={editTags}
                                        onChange={(e) =>
                                          setEditTags(e.target.value)
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
                                        placeholder="Skills (comma-separated)"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() =>
                                            handleEditBulletPoint(bp.id)
                                          }
                                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View Mode
                                    <div>
                                      <p className="text-gray-800 mb-2">
                                        {bp.content}
                                      </p>
                                      {bp.skills && bp.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          {bp.skills.map((skill) => (
                                            <span
                                              key={skill.id}
                                              className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded"
                                            >
                                              {skill.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => startEditing(bp)}
                                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteBulletPoint(bp.id)
                                          }
                                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Your Skills</h2>
            {skills.length > 0 && (
              <button
                onClick={handleDeleteAllSkills}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete All
              </button>
            )}
          </div>
          {skills.length === 0 ? (
            <p className="text-gray-600">
              No skills yet. Upload a resume to automatically extract skills!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium flex items-center gap-2"
                >
                  <span>{skill.name}</span>
                  <button
                    onClick={() => handleDeleteSkill(skill.id, skill.name)}
                    className="text-indigo-900 hover:text-red-600 transition-colors"
                    title="Delete skill"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Job Modal */}
      {/* Add Company Modal */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Company</h3>
            <form onSubmit={handleAddCompany}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={newCompanyCity}
                  onChange={(e) => setNewCompanyCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={newCompanyState}
                  onChange={(e) => setNewCompanyState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., CA, NY"
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newCompanyIsRemote}
                    onChange={(e) => setNewCompanyIsRemote(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Remote company</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Add Company
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCompanyModal(false);
                    setNewCompanyName("");
                    setNewCompanyCity("");
                    setNewCompanyState("");
                    setNewCompanyIsRemote(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Job Modal */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Job</h3>
            <form onSubmit={handleAddJob}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <select
                  value={newJobCompanyId || ""}
                  onChange={(e) => setNewJobCompanyId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={newJobStartDate}
                  onChange={(e) => setNewJobStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newJobIsCurrent}
                    onChange={(e) => setNewJobIsCurrent(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    This is my current job
                  </span>
                </label>
              </div>
              {!newJobIsCurrent && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newJobEndDate}
                    onChange={(e) => setNewJobEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Add Job
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddJobModal(false);
                    setNewJobTitle("");
                    setNewJobCompanyId(null);
                    setNewJobStartDate("");
                    setNewJobEndDate("");
                    setNewJobIsCurrent(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {showEditJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Job</h3>
            <form onSubmit={handleEditJob}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={newJobStartDate}
                  onChange={(e) => setNewJobStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newJobIsCurrent}
                    onChange={(e) => setNewJobIsCurrent(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    This is my current job
                  </span>
                </label>
              </div>
              {!newJobIsCurrent && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newJobEndDate}
                    onChange={(e) => setNewJobEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditJobModal(false);
                    setEditingJobId(null);
                    setNewJobTitle("");
                    setNewJobStartDate("");
                    setNewJobEndDate("");
                    setNewJobIsCurrent(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

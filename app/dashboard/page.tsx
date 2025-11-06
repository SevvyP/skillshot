"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface BulletPoint {
  id: number;
  text: string;
  tags: string[];
  created_at: string;
}

export default function Dashboard() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [bulletPoints, setBulletPoints] = useState<BulletPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBulletText, setNewBulletText] = useState("");
  const [newBulletTags, setNewBulletTags] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editTags, setEditTags] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loadingTimeout, setLoadingTimeout] = useState(false);

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
      fetchBulletPoints();
    }
  }, [user]);

  const fetchBulletPoints = async () => {
    try {
      const response = await fetch("/api/bullet-points");
      if (response.ok) {
        const data = await response.json();
        setBulletPoints(data.bulletPoints);
      }
    } catch (error) {
      console.error("Error fetching bullet points:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBulletPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBulletText.trim()) return;

    try {
      const tags = newBulletTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      const response = await fetch("/api/bullet-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newBulletText, tags }),
      });

      if (response.ok) {
        setNewBulletText("");
        setNewBulletTags("");
        fetchBulletPoints();
      }
    } catch (error) {
      console.error("Error adding bullet point:", error);
    }
  };

  const handleEditBulletPoint = async (id: number) => {
    if (!editText.trim()) return;

    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      const response = await fetch(`/api/bullet-points/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText, tags }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditText("");
        setEditTags("");
        fetchBulletPoints();
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
        fetchBulletPoints();
      }
    } catch (error) {
      console.error("Error deleting bullet point:", error);
    }
  };

  const handleDeleteAll = async () => {
    if (bulletPoints.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ALL ${bulletPoints.length} bullet points? This action cannot be undone.`
      )
    )
      return;

    try {
      const response = await fetch("/api/bullet-points/delete-all", {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBulletPoints();
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
    setEditText(bulletPoint.text);
    setEditTags(bulletPoint.tags.join(", "));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
    setEditTags("");
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
        setUploadMessage(`Successfully extracted ${data.count} bullet points!`);
        fetchBulletPoints();
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
                Tags (comma-separated)
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Your Bullet Points ({bulletPoints.length})
            </h2>
            {bulletPoints.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete All
              </button>
            )}
          </div>

          {bulletPoints.length === 0 ? (
            <p className="text-gray-600">
              No bullet points yet. Add one above or upload a resume to get
              started!
            </p>
          ) : (
            <div className="space-y-4">
              {bulletPoints.map((bp) => (
                <div
                  key={bp.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  {editingId === bp.id ? (
                    // Edit Mode
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
                        rows={3}
                      />
                      <input
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
                        placeholder="Tags (comma-separated)"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditBulletPoint(bp.id)}
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
                      <p className="text-gray-800 mb-2">{bp.text}</p>
                      {bp.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {bp.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm rounded"
                            >
                              {tag}
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
                          onClick={() => handleDeleteBulletPoint(bp.id)}
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
      </main>
    </div>
  );
}

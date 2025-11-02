"use client";

import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, isLoading, error } = useUser();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadingTimeout(true);
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timer);
  }, [isLoading]);

  // If there's an error or loading timeout, show the sign in page
  if (error || loadingTimeout) {
    console.error("Auth error:", error);
  }

  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (user && !loadingTimeout) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">skillshot</h1>
          <p className="text-xl text-gray-700 mb-8">
            Your personal resume bullet point manager. Upload, organize, and
            manage your professional achievements with ease.
          </p>

          <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Get Started
            </h2>
            <p className="text-gray-600 mb-6">
              Sign in to start managing your resume bullet points, extract
              content from your existing resumes, and organize your skills.
            </p>

            <Link
              href="/api/auth/login"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Manage Bullet Points
              </h3>
              <p className="text-gray-600">
                Add, edit, and organize your professional achievements
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Upload Resumes
              </h3>
              <p className="text-gray-600">
                Extract bullet points from PDF and Word documents
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Tag & Organize
              </h3>
              <p className="text-gray-600">
                Automatically tag bullet points with relevant skills
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

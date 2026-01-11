import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ENV } from "../utils/env";
import { getEmailFromJWT } from "../utils/jwt";

interface InterviewStats {
  status: string;
  message: string;
  user_count: number;
  total_interviews: number;
  completed_interviews: number;
  long_interviews: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("studentToken");
        const adminApiUrl = ENV.ADMIN_API_BASE_URL() || "http://localhost:8000";
        
        const response = await fetch(`${adminApiUrl}/admin/interview_stats`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }

        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="relative w-full px-6 py-4 flex items-center justify-center">
          <h1 className="text-base font-semibold">Admin Dashboard</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#2C5F2D] mb-2">
            Welcome, {getEmailFromJWT(localStorage.getItem("studentToken") || "")}
          </h2>
          <p className="text-gray-600">Manage interviews and recruitment</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
            </div>
            <div className="text-3xl font-bold text-[#2C5F2D]">
              {stats?.user_count || 0}
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-600">Total Interviews</p>
            </div>
            <div className="text-3xl font-bold text-[#2C5F2D]">
              {stats?.total_interviews || 0}
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-600">Completed Interviews</p>
            </div>
            <div className="text-3xl font-bold text-[#2C5F2D]">
              {stats?.completed_interviews || 0}
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-600">Long Interviews</p>
            </div>
            <div className="text-3xl font-bold text-[#2C5F2D]">
              {stats?.long_interviews || 0}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            onClick={() => navigate("/admin/jobs")}
            className="p-6 bg-white cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-[#2C5F2D] mb-2">
              Jobs Management
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Create and manage job descriptions
            </p>
            <Button
              variant="outline"
              className="w-full border-[#386641] text-[#386641] hover:bg-[#386641] hover:text-white"
            >
              Manage Jobs
            </Button>
          </Card>

          <Card
            onClick={() => navigate("/admin/users")}
            className="p-6 bg-white cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-[#2C5F2D] mb-2">
              User List
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              View user statistics and details
            </p>
            <Button
              variant="outline"
              className="w-full border-[#386641] text-[#386641] hover:bg-[#386641] hover:text-white"
            >
              View Users
            </Button>
          </Card>

          <Card
            onClick={() => navigate("/admin/recruitment")}
            className="p-6 bg-white cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-[#2C5F2D] mb-2">
              Recruitment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Invite candidates for interviews
            </p>
            <Button
              variant="outline"
              className="w-full border-[#386641] text-[#386641] hover:bg-[#386641] hover:text-white"
            >
              Manage Recruitment
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}

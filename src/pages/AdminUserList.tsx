import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ENV } from "../utils/env";

interface UserDetails {
  user_id: string;
  last_interview_date: string | null;
  interview_time: number | null;
  number_of_interviews: number;
}

interface UserListResponse {
  status: string;
  message: string;
  users: UserDetails[];
}

export default function AdminUserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("studentToken");
        const adminApiUrl = ENV.ADMIN_API_BASE_URL() || "http://localhost:8000";
        
        const response = await fetch(`${adminApiUrl}/admin/user_details?limit=${limit}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const data: UserListResponse = await response.json();
        setUsers(data.users);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [limit]);

  const filteredUsers = users.filter(user =>
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <button
            onClick={() => navigate("/admin")}
            className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">User List</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#2C5F2D] mb-2">
            User Management
          </h2>
          <p className="text-gray-600">View and manage user statistics</p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Card className="p-6 bg-white">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[#2C5F2D]">
              Users ({filteredUsers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-semibold">Email</th>
                  <th className="text-left p-2 text-sm font-semibold">Interviews</th>
                  <th className="text-left p-2 text-sm font-semibold">Last Interview</th>
                  <th className="text-left p-2 text-sm font-semibold">Interview Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{user.user_id}</td>
                    <td className="p-2">{user.number_of_interviews}</td>
                    <td className="p-2">
                      {user.last_interview_date
                        ? new Date(user.last_interview_date).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="p-2">
                      {user.interview_time
                        ? `${Math.round(user.interview_time)} min`
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

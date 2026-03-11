import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SelectionCard from "@/components/SelectionCard";
import CreateJobModal from "@/components/CreateJobModal";
import { ArrowLeft, Plus } from "lucide-react";
import {
  getInvitations,
  createInvitation,
  createBulkInvitations,
  getJobs,
  createJob,
  type Invitation,
  type InvitationRequest,
} from "../services/api/adminApi";
import type { Job } from "../models/job";

export default function AdminRecruitment() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);

  const [singleForm, setSingleForm] = useState({
    email: "",
    job_id: "",
    deadline: "",
    interview_time: 30,
  });

  const [bulkForm, setBulkForm] = useState({
    file: null as File | null,
    job_id: "",
    deadline: "",
    interview_time: 30,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invitationsData, jobsData] = await Promise.all([
          getInvitations(),
          getJobs(true),
        ]);
        setInvitations(invitationsData.invitations);
        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateJob = async (jobData: {
    job_title: string;
    job_description: string;
    technical_skills: string[];
    soft_skills: string[];
  }) => {
    try {
      const newJob = await createJob(jobData);
      toast.success("Job created successfully");
      setIsCreateJobModalOpen(false);
      const jobsData = await getJobs(true);
      setJobs(jobsData);
      
      if (activeTab === "single") {
        setSingleForm({ ...singleForm, job_id: newJob.job_id });
      } else {
        setBulkForm({ ...bulkForm, job_id: newJob.job_id });
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to create job");
    }
  };

  const handleJobSelect = (jobId: string | null) => {
    if (activeTab === "single") {
      setSingleForm({ ...singleForm, job_id: jobId || "" });
    } else {
      setBulkForm({ ...bulkForm, job_id: jobId || "" });
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.job_id) {
      toast.error("Please select a job description");
      return;
    }
    setSubmitting(true);
    try {
      await createInvitation(singleForm as InvitationRequest);
      toast.success("Invitation sent successfully");
      setSingleForm({ email: "", job_id: "", deadline: "", interview_time: 30 });
      const data = await getInvitations();
      setInvitations(data.invitations);
    } catch (error) {
      toast.error((error as Error).message || "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.file) {
      toast.error("Please select a CSV file");
      return;
    }
    if (!bulkForm.job_id) {
      toast.error("Please select a job description");
      return;
    }
    setSubmitting(true);
    try {
      await createBulkInvitations(
        bulkForm.file,
        bulkForm.job_id,
        bulkForm.deadline,
        bulkForm.interview_time
      );
      toast.success("Bulk invitations sent successfully");
      setBulkForm({ file: null, job_id: "", deadline: "", interview_time: 30 });
      const data = await getInvitations();
      setInvitations(data.invitations);
    } catch (error) {
      toast.error((error as Error).message || "Failed to send bulk invitations");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <Spinner size="lg" />
      </div>
    );
  }

  const displayedJobs = showAllJobs ? jobs : jobs.slice(0, 3);
  const selectedJobId = activeTab === "single" ? singleForm.job_id : bulkForm.job_id;

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
          <h1 className="text-base font-semibold">Recruitment Management</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#2C5F2D] mb-2">
            Invite Candidates for Interviews
          </h2>
          <p className="text-gray-600">Send interview invitations to candidates</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-4 border-b">
            <button
              onClick={() => setActiveTab("single")}
              className={`px-4 py-2 font-semibold ${
                activeTab === "single"
                  ? "border-b-2 border-[#386641] text-[#2C5F2D]"
                  : "text-gray-600"
              }`}
            >
              Single Invite
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className={`px-4 py-2 font-semibold ${
                activeTab === "bulk"
                  ? "border-b-2 border-[#386641] text-[#2C5F2D]"
                  : "text-gray-600"
              }`}
            >
              Bulk Invite (CSV)
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2C5F2D] mb-4">
            Select Job Description
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {displayedJobs.map((job) => (
              <SelectionCard
                key={job.job_id}
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                title={job.job_title}
                description={job.job_description}
                isSelected={selectedJobId === job.job_id}
                onClick={() => handleJobSelect(job.job_id)}
                showEstimatedTime={false}
              />
            ))}
            <div
              onClick={() => setIsCreateJobModalOpen(true)}
              className="group relative transition-all duration-200 p-6 pb-8 overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:scale-[1.01] border-2 border-dashed border-gray-300 hover:border-[#386641] rounded-lg"
            >
              <div className="flex flex-col gap-4 flex-1 items-center justify-center">
                <Plus className="w-12 h-12 text-gray-400 group-hover:text-[#386641]" />
                <h3 className="text-sm font-bold text-[#2C5F2D] text-center">
                  Create New Job
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  Add a new job description
                </p>
              </div>
            </div>
          </div>

          {jobs.length > 3 && (
            <button
              onClick={() => setShowAllJobs(!showAllJobs)}
              className="text-[#386641] hover:text-[#2C5233] font-semibold text-sm flex items-center gap-1"
            >
              {showAllJobs ? "Show Less" : `Show All (${jobs.length})`}
            </button>
          )}

          {selectedJobId && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <span className="font-semibold">Selected:</span>{" "}
                {jobs.find((j) => j.job_id === selectedJobId)?.job_title}
              </p>
            </div>
          )}
        </div>

        {activeTab === "single" && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-[#2C5F2D] mb-4">
              Send Single Invitation
            </h3>
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-semibold">Email</label>
                <Input
                  type="email"
                  value={singleForm.email}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, email: e.target.value })
                  }
                  placeholder="candidate@example.com"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Deadline
                </label>
                <Input
                  type="datetime-local"
                  value={singleForm.deadline}
                  onChange={(e) =>
                    setSingleForm({ ...singleForm, deadline: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Interview Time (minutes)
                </label>
                <Input
                  type="number"
                  value={singleForm.interview_time}
                  onChange={(e) =>
                    setSingleForm({
                      ...singleForm,
                      interview_time: parseInt(e.target.value),
                    })
                  }
                  required
                  min="1"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || !singleForm.job_id}
                className="bg-[#386641] hover:bg-[#2C5233] text-white"
              >
                {submitting ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </div>
        )}

        {activeTab === "bulk" && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h3 className="text-lg font-semibold text-[#2C5F2D] mb-4">
              Bulk Invite via CSV
            </h3>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  CSV File (emails only, one per row)
                </label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      file: e.target.files?.[0] || null,
                    })
                  }
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Deadline
                </label>
                <Input
                  type="datetime-local"
                  value={bulkForm.deadline}
                  onChange={(e) =>
                    setBulkForm({ ...bulkForm, deadline: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  Interview Time (minutes)
                </label>
                <Input
                  type="number"
                  value={bulkForm.interview_time}
                  onChange={(e) =>
                    setBulkForm({
                      ...bulkForm,
                      interview_time: parseInt(e.target.value),
                    })
                  }
                  required
                  min="1"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || !bulkForm.job_id}
                className="bg-[#386641] hover:bg-[#2C5233] text-white"
              >
                {submitting ? "Sending..." : "Send Bulk Invitations"}
              </Button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2C5F2D] mb-4">
            Invitations ({invitations.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-semibold">Email</th>
                  <th className="text-left p-2 text-sm font-semibold">Status</th>
                  <th className="text-left p-2 text-sm font-semibold">Deadline</th>
                  <th className="text-left p-2 text-sm font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.invitation_id} className="border-b">
                    <td className="p-2">{inv.email}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          inv.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : inv.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-2">
                      {new Date(inv.deadline).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CreateJobModal
          isOpen={isCreateJobModalOpen}
          onClose={() => setIsCreateJobModalOpen(false)}
          onSubmit={handleCreateJob}
        />
      </main>
    </div>
  );
}

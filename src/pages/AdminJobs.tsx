import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectionCard from "@/components/SelectionCard";
import CreateJobModal from "@/components/CreateJobModal";
import { Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { getJobs, createJob, updateJob, deleteJob } from "../services/api/adminApi";
import type { Job } from "../models/job";

export default function AdminJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const jobsList = await getJobs(true);
      setJobs(jobsList);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (jobData: {
    job_title: string;
    job_description: string;
    technical_skills: string[];
    soft_skills: string[];
  }) => {
    try {
      const newJob = await createJob(jobData);
      toast.success("Job created successfully");
      setIsCreateModalOpen(false);
      await fetchJobs();
    } catch (error) {
      toast.error((error as Error).message || "Failed to create job");
    }
  };

  const handleUpdateJob = async (jobData: {
    job_title: string;
    job_description: string;
    technical_skills: string[];
    soft_skills: string[];
  }) => {
    if (!editingJob) return;
    
    try {
      await updateJob(editingJob.job_id, jobData);
      toast.success("Job updated successfully");
      setEditingJob(null);
      await fetchJobs();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update job");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) {
      return;
    }

    try {
      await deleteJob(jobId);
      toast.success("Job deleted successfully");
      await fetchJobs();
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete job");
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_description.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-base font-semibold">Jobs Management</h1>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="absolute right-6 bg-[#386641] hover:bg-[#2C5233] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#2C5F2D]">
              Job Descriptions ({filteredJobs.length})
            </h2>
          </div>
          <Input
            placeholder="Search jobs by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No jobs found</p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#386641] hover:bg-[#2C5233] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Job
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div key={job.job_id} className="relative">
                <SelectionCard
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
                  isSelected={false}
                  onClick={() => {}}
                  showEstimatedTime={false}
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingJob(job)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteJob(job.job_id)}
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-2 px-2 text-xs text-gray-500">
                  <span className="mr-4">
                    {job.technical_skills?.length || 0} Technical Skills
                  </span>
                  <span>{job.soft_skills?.length || 0} Soft Skills</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateJobModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateJob}
        />

        {editingJob && (
          <CreateJobModal
            isOpen={true}
            onClose={() => setEditingJob(null)}
            onSubmit={handleUpdateJob}
            initialData={{
              job_title: editingJob.job_title,
              job_description: editingJob.job_description,
              technical_skills: editingJob.technical_skills || [],
              soft_skills: editingJob.soft_skills || [],
            }}
          />
        )}
      </main>
    </div>
  );
}


import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// Predefined suggestions
const JOB_TITLE_SUGGESTIONS = [
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "DevOps Engineer",
    "Data Scientist",
    "Product Manager",
    "UX Designer",
    "QA Engineer",
    "Mobile Developer",
];

const TECHNICAL_SKILL_SUGGESTIONS = [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "Python",
    "Java",
    "SQL",
    "AWS",
    "Docker",
    "Git",
    "REST APIs",
    "GraphQL",
    "MongoDB",
    "PostgreSQL",
    "Kubernetes",
];

const SOFT_SKILL_SUGGESTIONS = [
    "Communication",
    "Problem Solving",
    "Teamwork",
    "Leadership",
    "Time Management",
    "Adaptability",
    "Critical Thinking",
    "Creativity",
    "Attention to Detail",
    "Conflict Resolution",
];

interface CustomJobData {
    job_title: string;
    job_description: string;
    technical_skills: string[];
    soft_skills: string[];
}

interface CreateJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (jobData: CustomJobData) => void;
}

export default function CreateJobModal({
    isOpen,
    onClose,
    onSubmit,
}: CreateJobModalProps) {
    // Revert to string for job title as per user request
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    // Store skills as arrays directly for TagInput
    const [technicalSkills, setTechnicalSkills] = useState<string[]>([]);
    const [softSkills, setSoftSkills] = useState<string[]>([]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!jobTitle.trim()) {
            newErrors.jobTitle = "Job title is required";
        }
        // Job description is optional now

        if (technicalSkills.length < 2) {
            newErrors.technicalSkills = "At least two technical skills are required";
        }
        if (softSkills.length < 2) {
            newErrors.softSkills = "At least two soft skills are required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const jobData: CustomJobData = {
            job_title: jobTitle.trim(),
            job_description: jobDescription.trim() || `Role: ${jobTitle.trim()}`,
            technical_skills: technicalSkills,
            soft_skills: softSkills,
        };

        onSubmit(jobData);
        resetForm();
    };

    const resetForm = () => {
        setJobTitle("");
        setJobDescription("");
        setTechnicalSkills([]);
        setSoftSkills([]);
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                    <DialogTitle className="text-xl font-bold">Create Custom Interview</DialogTitle>
                    <DialogClose className="opacity-70 hover:opacity-100 transition-opacity" onClick={handleClose}>
                        <X className="w-5 h-5" />
                    </DialogClose>
                </div>

                {/* Remove default header close since we added custom one */}
                <style>{`
                    [data-radix-collection-item] { list-style: none; }
                    button[aria-label="Close"] { display: none; }
                `}</style>

                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
                    {/* Job Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900">
                            Job Title<span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="e.g. Senior Software Engineer"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className={errors.jobTitle ? "border-red-500" : ""}
                        />
                        {jobTitle && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {JOB_TITLE_SUGGESTIONS.filter(
                                    (s) => s.toLowerCase().includes(jobTitle.toLowerCase()) && s !== jobTitle
                                ).slice(0, 5).map((suggestion) => (
                                    <Badge
                                        key={suggestion}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-gray-100"
                                        onClick={() => setJobTitle(suggestion)}
                                    >
                                        + {suggestion}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {errors.jobTitle && (
                            <p className="text-xs text-red-500">{errors.jobTitle}</p>
                        )}
                    </div>

                    {/* Job Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900">
                            Job Description
                        </label>
                        <p className="text-xs text-gray-500 font-normal mt-0">
                            Job description can be pasted from a company's career page, LinkedIn or similar job boards
                        </p>
                        <Textarea
                            placeholder="Add a job description"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className="min-h-[120px] resize-y text-base"
                        />
                    </div>

                    {/* Technical Skills */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900">
                            Technical Skills<span className="text-red-500">*</span>
                        </label>
                        <TagInput
                            tags={technicalSkills}
                            setTags={setTechnicalSkills}
                            suggestions={TECHNICAL_SKILL_SUGGESTIONS}
                            placeholder="Type and press Enter to add skills (e.g. React, Python)"
                            className={errors.technicalSkills ? "border-red-500" : ""}
                        />
                        {errors.technicalSkills && (
                            <p className="text-xs text-red-500">{errors.technicalSkills}</p>
                        )}
                    </div>

                    {/* Soft Skills */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900">
                            Soft Skills<span className="text-red-500">*</span>
                        </label>
                        <TagInput
                            tags={softSkills}
                            setTags={setSoftSkills}
                            suggestions={SOFT_SKILL_SUGGESTIONS}
                            placeholder="Type and press Enter to add skills (e.g. Communication)"
                            className={errors.softSkills ? "border-red-500" : ""}
                        />
                        {errors.softSkills && (
                            <p className="text-xs text-red-500">{errors.softSkills}</p>
                        )}
                    </div>

                    <DialogFooter className="pt-6 border-t mt-8 flex sm:justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            className="text-gray-500 font-semibold hover:bg-gray-100 hover:text-gray-900 px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#386641] hover:bg-[#2C5233] text-white font-semibold px-4 py-2 rounded-md"
                        >
                            Create Custom Interview
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

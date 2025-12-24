import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [technicalSkills, setTechnicalSkills] = useState("");
    const [softSkills, setSoftSkills] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!jobTitle.trim()) {
            newErrors.jobTitle = "Job title is required";
        }
        if (!jobDescription.trim()) {
            newErrors.jobDescription = "Job description is required";
        }
        if (jobDescription.length < 25) {
            newErrors.jobDescription = "Job description must be at least 50 characters long";
        }
        if (!technicalSkills.trim()) {
            newErrors.technicalSkills = "At least one technical skill is required";
        }
        if (!softSkills.trim()) {
            newErrors.softSkills = "At least one soft skill is required";
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
            job_description: jobDescription.trim(),
            technical_skills: technicalSkills
                .split(",")
                .map((skill) => skill.trim())
                .filter((skill) => skill.length > 0),
            soft_skills: softSkills
                .split(",")
                .map((skill) => skill.trim())
                .filter((skill) => skill.length > 0),
        };

        onSubmit(jobData);
        resetForm();
    };

    const resetForm = () => {
        setJobTitle("");
        setJobDescription("");
        setTechnicalSkills("");
        setSoftSkills("");
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleJobTitleSelect = (title: string) => {
        setJobTitle(title);
    };

    const addSkillToList = (
        currentSkills: string,
        newSkill: string,
        setSkills: (value: string) => void
    ) => {
        const skillsArray = currentSkills
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        // Don't add if already exists
        if (skillsArray.some((s) => s.toLowerCase() === newSkill.toLowerCase())) {
            return;
        }

        if (currentSkills.trim()) {
            setSkills(`${currentSkills}, ${newSkill}`);
        } else {
            setSkills(newSkill);
        }
    };

    const isSkillSelected = (currentSkills: string, skill: string): boolean => {
        const skillsArray = currentSkills
            .split(",")
            .map((s) => s.trim().toLowerCase());
        return skillsArray.includes(skill.toLowerCase());
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Custom Interview</DialogTitle>
                    <DialogDescription>
                        Define a custom job role for your interview practice session.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Job Title */}
                    <div className="space-y-2">
                        <label
                            htmlFor="jobTitle"
                            className="text-sm font-medium leading-none"
                        >
                            Job Title <span className="text-red-500">*</span>
                        </label>
                        <Input
                            id="jobTitle"
                            placeholder="e.g. Senior Software Engineer"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className={errors.jobTitle ? "border-red-500" : ""}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {JOB_TITLE_SUGGESTIONS.map((title) => (
                                <Badge
                                    key={title}
                                    variant={jobTitle === title ? "default" : "outline"}
                                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                                    onClick={() => handleJobTitleSelect(title)}
                                >
                                    {title}
                                </Badge>
                            ))}
                        </div>
                        {errors.jobTitle && (
                            <p className="text-sm text-red-500">{errors.jobTitle}</p>
                        )}
                    </div>

                    {/* Job Description */}
                    <div className="space-y-2">
                        <label
                            htmlFor="jobDescription"
                            className="text-sm font-medium leading-none"
                        >
                            Job Description <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            id="jobDescription"
                            placeholder="Describe the role and responsibilities..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className={errors.jobDescription ? "border-red-500" : ""}
                            rows={3}
                        />
                        {errors.jobDescription && (
                            <p className="text-sm text-red-500">{errors.jobDescription}</p>
                        )}
                    </div>

                    {/* Technical Skills */}
                    <div className="space-y-2">
                        <label
                            htmlFor="technicalSkills"
                            className="text-sm font-medium leading-none"
                        >
                            Technical Skills <span className="text-red-500">*</span>
                        </label>
                        <Input
                            id="technicalSkills"
                            placeholder="e.g. React, Node.js, TypeScript"
                            value={technicalSkills}
                            onChange={(e) => setTechnicalSkills(e.target.value)}
                            className={errors.technicalSkills ? "border-red-500" : ""}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {TECHNICAL_SKILL_SUGGESTIONS.map((skill) => (
                                <Badge
                                    key={skill}
                                    variant={
                                        isSkillSelected(technicalSkills, skill)
                                            ? "default"
                                            : "outline"
                                    }
                                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                                    onClick={() =>
                                        addSkillToList(technicalSkills, skill, setTechnicalSkills)
                                    }
                                >
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                        {errors.technicalSkills && (
                            <p className="text-sm text-red-500">{errors.technicalSkills}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Click to add or type comma-separated skills
                        </p>
                    </div>

                    {/* Soft Skills */}
                    <div className="space-y-2">
                        <label
                            htmlFor="softSkills"
                            className="text-sm font-medium leading-none"
                        >
                            Soft Skills <span className="text-red-500">*</span>
                        </label>
                        <Input
                            id="softSkills"
                            placeholder="e.g. Communication, Leadership"
                            value={softSkills}
                            onChange={(e) => setSoftSkills(e.target.value)}
                            className={errors.softSkills ? "border-red-500" : ""}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {SOFT_SKILL_SUGGESTIONS.map((skill) => (
                                <Badge
                                    key={skill}
                                    variant={
                                        isSkillSelected(softSkills, skill) ? "default" : "outline"
                                    }
                                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                                    onClick={() =>
                                        addSkillToList(softSkills, skill, setSoftSkills)
                                    }
                                >
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                        {errors.softSkills && (
                            <p className="text-sm text-red-500">{errors.softSkills}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Click to add or type comma-separated skills
                        </p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Create Interview</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

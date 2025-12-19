import React from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface TestResult {
  id: string;
  test_id: string;
  user_id: string;
  summary: string;
  score: number;
  question_number: number;
  correct_number: number;
  elapse_time: number;
  qa_history: {
    question: string;
    answer: string;
    summary: string;
  }[];
  created_at: string;
  updated_at: string;
}

interface TestResultsProps {
  testResult: TestResult;
  userName?: string;
}

interface ParsedSummary {
  mainSummary: string;
  resultsOverview: Array<{ text: string; color: string }>;
  topStrengths: Array<{ title: string; description: string }>;
  improvementAreas: Array<{ title: string; description: string }>;
  nextSteps: Array<{ title: string; description: string }>;
}

const parseSummaryContent = (summary: string): ParsedSummary => {
  const result: ParsedSummary = {
    mainSummary: "",
    resultsOverview: [],
    topStrengths: [],
    improvementAreas: [],
    nextSteps: [],
  };

  if (!summary) return result;

  const lines = summary.split("\n");
  
  const overallIndex = lines.findIndex(line => line.includes("**Overall Assessment:**"));
  if (overallIndex !== -1) {
    let assessmentText = "";
    for (let i = overallIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("**") || !line) break;
      assessmentText += line + " ";
    }
    result.mainSummary = assessmentText.trim();
  }

  const breakdownIndex = lines.findIndex(line => line.includes("**Performance Breakdown:**"));
  if (breakdownIndex !== -1) {
    for (let i = breakdownIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes("**Interview Conclusion:**") || line.includes("**Score:**") || line.includes("**Recommendation:**")) break;
      
      const bulletMatch = line.match(/^\*\s+\*\*(.+?):\*\*\s+(.+)/);
      if (bulletMatch) {
        const [, title, description] = bulletMatch;
        const cleanDesc = description.replace(/\*\*/g, "").trim();
        
        if (title.toLowerCase().includes("technical") || 
            title.toLowerCase().includes("coding") || 
            title.toLowerCase().includes("problem")) {
          result.topStrengths.push({ title, description: cleanDesc });
        } else if (title.toLowerCase().includes("communication") || 
                   title.toLowerCase().includes("professionalism") || 
                   title.toLowerCase().includes("experience")) {
          result.improvementAreas.push({ title, description: cleanDesc });
        }
      }
    }
  }

  const recommendationIndex = lines.findIndex(line => line.includes("**Recommendation:**"));
  if (recommendationIndex !== -1) {
    let recommendationText = "";
    for (let i = recommendationIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      recommendationText += line.replace(/\*\*/g, "") + " ";
    }
    if (recommendationText.trim()) {
      result.nextSteps.push({ 
        title: "Recommendation", 
        description: recommendationText.trim() 
      });
    }
  }

  return result;
};

const ResultOverviewItem = ({ color, children }: any) => (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    <p className="text-sm text-gray-600">
      {children}
    </p>
  </div>
);

export const TestResults: React.FC<TestResultsProps> = ({
  testResult,
  userName,
}) => {
  const parsed = parseSummaryContent(testResult.summary);

  const displayData = {
    mainSummary: parsed.mainSummary || testResult.summary.split("\n\n")[0] || "Interview performance summary",
    topStrengths: parsed.topStrengths.length > 0 ? parsed.topStrengths : [
      { title: "Technical Knowledge", description: "Demonstrated strong understanding of core concepts." },
      { title: "Problem Solving", description: "Showed good analytical thinking and approach to challenges." }
    ],
    improvementAreas: parsed.improvementAreas.length > 0 ? parsed.improvementAreas : [
      { title: "Communication", description: "Could benefit from more detailed explanations." },
      { title: "Time Management", description: "Consider practicing under time constraints." }
    ],
    nextSteps: parsed.nextSteps.length > 0 ? parsed.nextSteps : [
      { title: "Practice", description: "Continue practicing similar interview scenarios." },
      { title: "Review", description: "Review the questions and answers from this session." }
    ],
  };

  const getFeedbackText = (summary: any): string => {
    try {
      if (typeof summary === "string") return summary;
      if (Array.isArray(summary)) {
        const answerArray = summary.find((item) => item[0] === "answer");
        if (answerArray) {
          const feedbackArray = answerArray[1].find(
            (item: any) => item[0] === "feedback"
          );
          if (feedbackArray) {
            return feedbackArray[1];
          }
        }
      }
      return "No feedback available.";
    } catch (error) {
      console.error("Error parsing feedback:", error);
      return "Could not parse feedback.";
    }
  };

  return (
    <div className="min-h-screen w-screen p-8">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center mb-2 mx-7">
          <div className="flex items-center gap-2"> 
           <img src="/assets/image 1.svg" alt="Logo" />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              className="bg-[#2C5F2D] text-white font-semibold hover:bg-[#1F4420] hover:scale-[1.01] transition-all"
              onClick={() => window.location.href = "/"}
            >
              <img src="/assets/Vector (Stroke).svg" alt="" className="w-4 h-4 mr-2" />
              Try another interview
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mb-4"
              onClick={() => window.location.href = "/"}
            >
              <XCircle className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="bg-white p-20 rounded-xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-4xl font-bold text-gray-800">
              {userName ? `Great start, ${userName}!` : "Interview Results"}
            </h1>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {Math.round(testResult.elapse_time)} mins
              </span>
            </div>
          </div>

          <p className="text-gray-700 mb-6 leading-relaxed">
            {displayData.mainSummary}
          </p>

          <div className="flex items-center gap-6 mb-8 flex-wrap">
            <span className="font-semibold text-gray-800">
              Results overview
            </span>
            <ResultOverviewItem color="green.400">
              Technical: Exceeds Expectations
            </ResultOverviewItem>
            <ResultOverviewItem color="green.400">
              Problem Solving: Strong
            </ResultOverviewItem>
            <ResultOverviewItem color="red.400">
              Communication: Development Needed
            </ResultOverviewItem>
          </div>

          <Separator className="my-8" />

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr] gap-0">
            <div>
              <div className="flex flex-col items-stretch gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <img src="/assets/badge-check.svg" alt="" />
                    <h2 className="text-xl text-gray-800 font-semibold">
                      Top Strengths
                    </h2>
                  </div>
                  <div className="flex flex-col items-stretch gap-4">
                    {displayData.topStrengths.map((item, i) => (
                      <div key={i}>
                        <p className="font-semibold text-gray-800 mb-1">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <img src="/assets/hand-heart.svg" alt="" />
                    <h2 className="text-xl text-gray-800 font-semibold">
                      Improvement areas
                    </h2>
                  </div>
                  <div className="flex flex-col items-stretch gap-4">
                    {displayData.improvementAreas.map((item, i) => (
                      <div key={i}>
                        <p className="font-semibold text-gray-800 mb-1">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="p-6 rounded-lg border border-green-200" style={{
                backgroundImage: "url('/assets/Rectangle 5 (2).svg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}>
                <div className="flex items-center gap-2 mb-4">
                  <img src="/assets/zoe-talking 1 (2).svg" alt="" className="w-8 h-8" />
                  <h2 className="text-md font-semibold text-green-900">
                    Next Steps
                  </h2>
                </div>
                <div className="flex flex-col items-stretch gap-4">
                  {displayData.nextSteps.map((item, i) => (
                    <div key={i}>
                      <p className="font-semibold text-sm text-gray-800 mb-1">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          <Accordion type="single" collapsible defaultValue="item-0" className="border-none">
            <AccordionItem value="item-0" className="border-none">
              <AccordionTrigger className="justify-center hover:bg-gray-50 rounded-md py-3">
                <span className="font-semibold">
                  Session Transcript
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-6">
                <div className="flex flex-col items-stretch gap-4 max-w-[900px] mx-auto">
                  {testResult.qa_history.map((qa, index) => (
                    <div key={index} className="flex flex-col items-stretch gap-4">
                      <div className="flex gap-3">
                        <div className="rounded-full flex items-center justify-center shrink-0">
                          <img src="/assets/zoe-talking 1 (2).svg" alt="" className="w-[46px] h-[46px]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 mb-1 text-sm">
                            AI Interviewer
                          </p>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {qa.question}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <div className="px-3 rounded-lg max-w-fit">
                          <p className="font-semibold text-gray-800 mb-1 text-sm">
                            You
                          </p>
                          <p className="text-[#5A615F] text-sm leading-relaxed">
                            "{qa.answer}"
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                          <img src="/assets/Frame 56.svg" alt="" />
                        </div>
                      </div>

                      {qa.summary && (
                        <div className="flex justify-center">
                          <div className="px-4 py-3 rounded-md border border-green-200 max-w-[85%]" style={{
                            backgroundImage: "url('/assets/Rectangle 5 (2).svg')",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}>
                            <div className="flex items-center gap-2 mb-6 justify-center">
                              <img src="/assets/hand-heart (1).svg" alt="" className="w-4 h-4" />
                              <p className="text-sm font-semibold text-green-800">
                                Improvement area
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {getFeedbackText(qa.summary)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
};

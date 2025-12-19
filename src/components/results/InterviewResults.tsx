import type { InterviewSession } from '../../models/interview';
import { MessageBubble } from '../ui/MessageBubble';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Badge } from '../ui/badge';

interface InterviewResultsProps {
  session: InterviewSession;
}

export function InterviewResults({ session }: InterviewResultsProps) {
  if (!session.result) {
    return (
      <div className="p-4">
        <p>No results available</p>
      </div>
    );
  }

  const { result } = session;
  const feedbackHistory = session.feedbackHistory || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          Interview Results
        </h2>
        <p className="text-sm text-gray-600">
          {session.jobTitle}
        </p>
      </div>

      <div className="border-t border-gray-200 pt-4" />

      {/* Overall Score and Stats */}
      <div>
        <div className="flex gap-4 mb-4 flex-wrap">
          <Badge className="text-base px-3 py-1">
            Score: {result.score}/5
          </Badge>
          <Badge className="text-base px-3 py-1">
            Questions: {result.totalQuestions}
          </Badge>
          <Badge className="text-base px-3 py-1">
            Duration: {result.elapsedTime} min
          </Badge>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="text-xl font-semibold mb-3 text-blue-700">
          Summary
        </h3>
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {result.summary}
        </p>
      </div>

      {/* Conclusion Section */}
      <div className="bg-green-50 p-4 rounded-md">
        <h3 className="text-xl font-semibold mb-3 text-green-700">
          Conclusion
        </h3>
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {result.conclusion}
        </p>
      </div>

      <div className="border-t border-gray-200 pt-4" />

      {/* Q&A History with Feedback */}
      <div>
        <h3 className="text-xl font-semibold mb-4">
          Q&A History ({session.qaHistory.length} questions)
        </h3>
        <Accordion type="single" collapsible defaultValue="0">
          {session.qaHistory.map((qa, index) => (
            <AccordionItem key={index} value={String(index)}>
              <AccordionTrigger>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">
                      Question {index + 1}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {new Date(qa.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">
                    {qa.question}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="p-4 bg-gray-50 rounded-md">
                  {/* Question */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1">
                      INTERVIEWER
                    </p>
                    <MessageBubble role="assistant" content={qa.question} timestamp={qa.timestamp} />
                  </div>

                  {/* Answer */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1">
                      YOUR ANSWER
                    </p>
                    <MessageBubble role="user" content={qa.answer} timestamp={qa.timestamp} />
                  </div>

                  {/* Feedback for this question (if available) */}
                  {feedbackHistory[index] && (
                    <div className="bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400">
                      <p className="text-xs font-bold text-yellow-700 mb-1">
                        FEEDBACK
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {feedbackHistory[index]}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Phase Statistics */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-xl font-semibold mb-3">
          Interview Statistics
        </h3>
        <div className="flex gap-4 flex-wrap">
          <Badge className="px-3 py-1">
            Introduction: {session.introductionQuestionCount || 0} questions
          </Badge>
          <Badge className="px-3 py-1">
            Project: {session.projectQuestionCount || 0} questions
          </Badge>
          <Badge className="px-3 py-1">
            Technical: {session.technicalQuestionCount || 0} questions
          </Badge>
        </div>
        {session.discussedProjects && session.discussedProjects.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-bold text-gray-600 mb-1">
              Projects Discussed:
            </p>
            <div className="flex gap-2 flex-wrap">
              {session.discussedProjects.map((project, idx) => (
                <Badge key={idx} variant="secondary">
                  {project.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

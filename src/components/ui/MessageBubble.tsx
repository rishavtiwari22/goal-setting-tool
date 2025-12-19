import { FiUser } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`flex flex-col mb-4 max-w-[80%] ${isUser ? 'self-end' : 'self-start'}`}
    >
      <div className="flex items-center mb-1">
        <span
          className={`w-6 h-6 rounded-full inline-flex items-center justify-center mr-2 ${isUser ? 'bg-gray-500' : 'bg-blue-500'}`}
        >
          {isUser && <FiUser size={12} style={{ color: 'white' }} />}
        </span>
        <p className="text-xs text-gray-500">
          {isUser ? 'You' : 'AI Interviewer'}
          {timestamp && ` · ${new Date(timestamp).toLocaleTimeString()}`}
        </p>
      </div>
      <div
        className={`p-3 rounded-lg shadow-sm ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-black'}`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">
            {content}
          </p>
        ) : (
          <div className="text-sm">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

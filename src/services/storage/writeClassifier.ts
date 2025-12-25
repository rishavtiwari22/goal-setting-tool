import { InterviewSession } from '../../models/interview';

export type WritePriority = 'critical' | 'normal';

export interface WriteOperation {
  sessionId: string;
  operation: 'session' | 'qaItem' | 'feedback' | 'user';
  data: any;
  timestamp: number;
  priority: WritePriority;
}

export class WriteClassifier {
  static classifySessionWrite(
    session: InterviewSession,
    previousStatus?: 'ongoing' | 'completed',
    isInitialCreate: boolean = false
  ): WritePriority {
    if (isInitialCreate) {
      return 'critical';
    }

    if (session.status === 'completed' && previousStatus !== 'completed') {
      return 'critical';
    }

    if (session.result && previousStatus !== 'completed') {
      return 'critical';
    }

    return 'normal';
  }

  static classifyQAItemWrite(): WritePriority {
    return 'normal';
  }

  static classifyFeedbackWrite(): WritePriority {
    return 'normal';
  }

  static classifyUserWrite(isInitialCreate: boolean = false): WritePriority {
    return isInitialCreate ? 'critical' : 'normal';
  }

  static isCriticalWrite(operation: WriteOperation): boolean {
    return operation.priority === 'critical';
  }

  static classifyWrite(
    operation: WriteOperation['operation'],
    context: {
      session?: InterviewSession;
      previousStatus?: 'ongoing' | 'completed';
      isInitialCreate?: boolean;
    }
  ): WritePriority {
    switch (operation) {
      case 'session':
        return this.classifySessionWrite(
          context.session!,
          context.previousStatus,
          context.isInitialCreate
        );
      case 'qaItem':
        return this.classifyQAItemWrite();
      case 'feedback':
        return this.classifyFeedbackWrite();
      case 'user':
        return this.classifyUserWrite(context.isInitialCreate);
      default:
        return 'normal';
    }
  }
}


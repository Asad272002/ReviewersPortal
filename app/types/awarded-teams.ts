export interface AwardedTeam {
  id: string;
  teamName: string;
  name?: string; // Alias for teamName for backward compatibility
  proposalId: string;
  proposalTitle: string;
  projectTitle?: string; // Alias for proposalTitle for backward compatibility
  teamUsername?: string; // Normalized team login username (preferred)
  teamLeaderUsername: string; // Links to Users sheet
  teamLeaderEmail: string;
  email?: string; // Alias for teamLeaderEmail for backward compatibility
  teamLeaderName: string;
  awardDate: string;
  status: 'active' | 'inactive' | 'completed';
  category?: string; // Additional field for team category
  awardType?: string; // Additional field for award type
  createdAt: string;
  updatedAt: string;
}

export interface Reviewer {
  id: string;
  userID: string;
  name: string;
  email: string;
  mattermostId: string;
  githubIds: string;
  cvLink: string;
  expertise: string;
  isAvailable: boolean;
  get availability(): boolean; // Alias for isAvailable
  anonymousName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamReviewerAssignment {
  id: string;
  teamId: string;
  reviewerId: string;
  assignedBy: string; // admin user ID
  assignedAt: string;
  status: 'pending' | 'approved' | 'active' | 'revoked' | 'completed';
  approvedBy?: string; // admin user ID
  approvedAt?: string;
  revokedBy?: string; // admin user ID
  revokedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  assignmentId: string;
  senderId: string;
  senderType: 'team' | 'reviewer';
  senderName: string; // anonymized for reviewer
  senderRole?: string;
  messageType: 'text' | 'file';
  content: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  timestamp: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  assignmentId: string;
  teamId: string;
  reviewerId: string;
  status: 'active' | 'paused' | 'ended';
  startedAt: string;
  endedAt?: string;
  lastMessageAt?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamConnectStatus {
  teamId: string;
  hasActiveAssignment: boolean;
  assignmentStatus: 'none' | 'pending' | 'approved' | 'active' | 'revoked';
  reviewerAnonymousName?: string;
  canConnect: boolean;
  lastActivity?: string;
}
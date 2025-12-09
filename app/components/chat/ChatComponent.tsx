'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatSession } from '../../types/awarded-teams';

interface ChatComponentProps {
  sessionId: string;
  userId: string;
  userRole: 'team' | 'reviewer' | 'admin';
  isAnonymized?: boolean;
  onClose?: () => void;
}

interface FileUpload {
  file: File;
  progress: number;
  id: string;
}

export default function ChatComponent({ 
  sessionId, 
  userId, 
  userRole, 
  isAnonymized = false,
  onClose 
}: ChatComponentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial data
  useEffect(() => {
    loadChatData();
    startPolling();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [sessionId]);

  const loadChatData = async () => {
    try {
      setIsLoading(true);
      const roleParam = userRole === 'team' ? 'user' : userRole;
      
      // Load session details
      const sessionResponse = await fetch(`/api/chat/sessions/${sessionId}?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(roleParam)}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const s = sessionData?.data;
        if (s) {
          setSession({
            id: s.id,
            assignmentId: s.assignmentId,
            teamId: s.teamId,
            reviewerId: s.reviewerId,
            status: s.status,
            startedAt: s.createdAt,
            endedAt: s.endedAt,
            lastMessageAt: s.lastActivity,
            messageCount: 0,
            createdAt: s.createdAt,
            updatedAt: s.lastActivity,
          });
        }
      }
      
      // Load messages
      const messagesResponse = await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(roleParam)}`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const m = messagesData?.data?.messages || [];
        const normalized = m.map((row: any) => ({
          id: row.id,
          assignmentId: sessionId, // not provided per-message; tie to session
          senderId: row.senderId,
          senderType: row.senderType,
          senderName: row.senderName,
          senderRole: row.senderType,
          messageType: row.messageType === 'file' ? 'file' : 'text',
          content: row.message,
          fileName: row.fileName || undefined,
          fileUrl: row.fileUrl || undefined,
          timestamp: row.timestamp,
          isRead: !!row.isRead,
          createdAt: row.timestamp,
        }));
        setMessages(normalized);
      }
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = () => {
    // Poll for new messages every 3 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const roleParam = userRole === 'team' ? 'user' : userRole;
        const response = await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(roleParam)}`);
        if (response.ok) {
          const data = await response.json();
          const m = data?.data?.messages || [];
          const normalized = m.map((row: any) => ({
            id: row.id,
            assignmentId: sessionId,
            senderId: row.senderId,
            senderType: row.senderType,
            senderName: row.senderName,
            senderRole: row.senderType,
            messageType: row.messageType === 'file' ? 'file' : 'text',
            content: row.message,
            fileName: row.fileName || undefined,
            fileUrl: row.fileUrl || undefined,
            timestamp: row.timestamp,
            isRead: !!row.isRead,
            createdAt: row.timestamp,
          }));
          setMessages(normalized);
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 3000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          senderId: userId,
          senderType: userRole,
          message: newMessage.trim(),
          messageType: 'text'
        }),
      });
      
      if (response.ok) {
        setNewMessage('');
        // Immediately refresh messages
        loadChatData();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      
      const uploadId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newUpload: FileUpload = {
        file,
        progress: 0,
        id: uploadId
      };
      
      setFileUploads(prev => [...prev, newUpload]);
      uploadFile(newUpload);
    });
  };

  const uploadFile = async (upload: FileUpload) => {
    try {
      const formData = new FormData();
      formData.append('file', upload.file);
      formData.append('sessionId', sessionId);
      formData.append('senderId', userId);
      formData.append('senderRole', userRole);
      
      // Simulate progress (in a real app, you'd track actual upload progress)
      const progressInterval = setInterval(() => {
        setFileUploads(prev => prev.map(f => 
          f.id === upload.id ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
        ));
      }, 200);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          senderId: userId,
          senderType: userRole,
          message: `Shared file: ${upload.file.name}`,
          messageType: 'file',
          fileName: upload.file.name
        }),
      });
      
      clearInterval(progressInterval);
      
      if (response.ok) {
        setFileUploads(prev => prev.map(f => 
          f.id === upload.id ? { ...f, progress: 100 } : f
        ));
        
        // Remove from uploads after a delay
        setTimeout(() => {
          setFileUploads(prev => prev.filter(f => f.id !== upload.id));
        }, 2000);
        
        // Refresh messages
        loadChatData();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setFileUploads(prev => prev.filter(f => f.id !== upload.id));
      alert('Failed to upload file. Please try again.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSenderDisplayName = (message: ChatMessage) => {
    if (isAnonymized && message.senderRole === 'reviewer') {
      return 'Review Circle Reviewer';
    }
    return message.senderRole === 'team' ? 'Team Member' : 
           message.senderRole === 'reviewer' ? 'Reviewer' : 'Admin';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-[#0C021E] rounded-lg border border-[#9D9FA9]">
        <div className="text-white font-montserrat">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96 bg-[#0C021E] rounded-lg border border-[#9D9FA9] overflow-hidden">
      {/* Chat Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#9D9FA9] bg-[#1A0B2E]">
        <div>
          <h3 className="font-montserrat font-semibold text-white">
            {isAnonymized ? 'Anonymous Chat Session' : 'Chat Session'}
          </h3>
          <p className="text-sm text-[#9D9FA9]">
            Status: {session?.status || 'Active'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#9D9FA9] hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div 
        className={`flex-1 overflow-y-auto p-4 space-y-3 ${
          dragOver ? 'bg-[#9050E9]/10 border-2 border-dashed border-[#9050E9]' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {messages.length === 0 ? (
          <div className="text-center text-[#9D9FA9] font-montserrat py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === userId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === userId
                    ? 'bg-[#9050E9] text-white'
                    : 'bg-[#1A0B2E] text-white border border-[#9D9FA9]'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium opacity-75">
                    {getSenderDisplayName(message)}
                  </span>
                  <span className="text-xs opacity-50 ml-2">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                
                {message.messageType === 'file' ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">📎</span>
                    <span className="text-sm">{message.content}</span>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* File Upload Progress */}
        {fileUploads.map((upload) => (
          <div key={upload.id} className="flex justify-end">
            <div className="max-w-xs bg-[#9050E9]/50 text-white px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs">📎</span>
                <span className="text-xs">{upload.file.name}</span>
              </div>
              <div className="w-full bg-[#1A0B2E] rounded-full h-1">
                <div 
                  className="bg-[#9050E9] h-1 rounded-full transition-all duration-300"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#9D9FA9] bg-[#1A0B2E]">
        {session?.status !== 'active' && (
          <div className="mb-2 text-center text-[#9D9FA9] text-sm font-montserrat">
            This session is not active. Chat is read-only.
          </div>
        )}
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files)}
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          />
          
          <button
            onClick={() => { if (session?.status === 'active') fileInputRef.current?.click(); }}
            className={`px-3 py-2 border border-[#9D9FA9] text-white rounded transition-colors ${session?.status === 'active' ? 'bg-[#0C021E] hover:bg-[#9050E9]' : 'bg-[#0C021E] opacity-50 cursor-not-allowed'}`}
            title="Attach file"
            disabled={session?.status !== 'active'}
          >
            📎
          </button>
          
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            className="flex-1 px-3 py-2 bg-[#0C021E] border border-[#9D9FA9] text-white rounded resize-none focus:outline-none focus:border-[#9050E9] font-montserrat"
            rows={2}
            disabled={isSending || session?.status !== 'active'}
          />
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending || session?.status !== 'active'}
            className="px-4 py-2 bg-[#9050E9] hover:bg-[#A96AFF] disabled:bg-[#9D9FA9] disabled:cursor-not-allowed text-white rounded transition-colors font-montserrat font-medium"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
        
        {dragOver && (
          <div className="mt-2 text-center text-[#9050E9] text-sm font-montserrat">
            Drop files here to share
          </div>
        )}
      </div>
    </div>
  );
}
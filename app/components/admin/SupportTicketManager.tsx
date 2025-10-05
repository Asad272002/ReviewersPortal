'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SupportTicket {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Safe date utilities to handle both ISO and legacy locale strings
const parseDateSafe = (s: string | undefined | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateShort = (s: string | undefined | null) => {
  const d = parseDateSafe(s);
  return d ? d.toLocaleDateString() : (s || '—');
};

const formatDateLong = (s: string | undefined | null) => {
  const d = parseDateSafe(s);
  return d ? d.toLocaleString() : (s || '—');
};

const getTimeSafe = (s: string | undefined | null) => {
  const d = parseDateSafe(s);
  return d ? d.getTime() : 0;
};

export default function SupportTicketManager() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/admin/support-tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId: string, status: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: status as any });
        }
      } else {
        console.error('Error updating ticket status');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityUpdate = async (ticketId: string, priority: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
      });

      if (response.ok) {
        await fetchTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, priority: priority as any });
        }
      } else {
        console.error('Error updating ticket priority');
      }
    } catch (error) {
      console.error('Error updating ticket priority:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNotes = async (ticketId: string) => {
    if (!notes.trim()) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        await fetchTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, notes });
        }
        setNotes('');
      } else {
        console.error('Error adding notes');
      }
    } catch (error) {
      console.error('Error adding notes:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleViewDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setNotes(ticket.notes || '');
    setShowDetails(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || ticket.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  if (isLoading) {
    return (
      <div className="bg-[#0C021E] rounded-lg border border-[#9D9FA9] p-6">
        <p className="font-montserrat text-[#9D9FA9]">Loading support tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0C021E] rounded-lg border border-[#9D9FA9] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-montserrat font-semibold text-xl text-white">Support Tickets</h3>
          <div className="flex items-center gap-4">
            <div className="text-sm font-montserrat text-[#9D9FA9]">
              Total: {tickets.length} | Open: {tickets.filter(t => t.status === 'open').length}
            </div>
            <button
              onClick={fetchTickets}
              className="bg-blue-600 hover:bg-blue-700 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              Refresh
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4">
          <div>
            <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 bg-[#0C021E] border border-[#9D9FA9] rounded text-white text-sm focus:outline-none focus:border-[#A96AFF]"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          <div>
            <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="p-2 bg-[#0C021E] border border-[#9D9FA9] rounded text-white text-sm focus:outline-none focus:border-[#A96AFF]"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-[#0C021E] rounded-lg border border-[#9D9FA9] p-6">
        <h4 className="font-montserrat font-semibold text-lg text-white mb-4">Support Tickets</h4>
        
        {filteredTickets.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-montserrat text-[#9D9FA9] mb-4">No support tickets found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#9D9FA9]">
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Name</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Email</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Category</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Message</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Status</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Priority</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Created</th>
                  <th className="text-left font-montserrat text-[#9D9FA9] py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets
                  // Robust sorting with fallback for invalid dates
                  .sort((a, b) => getTimeSafe(b.createdAt) - getTimeSafe(a.createdAt))
                  .map((ticket) => (
                    <tr key={ticket.id} className="border-b border-[#9D9FA9]/30 hover:bg-[#1A0B2E]">
                      <td className="font-montserrat text-white py-3 px-2 font-medium">
                        {ticket.name}
                      </td>
                      <td className="font-montserrat text-[#9D9FA9] py-3 px-2 text-sm">
                        {ticket.email}
                      </td>
                      <td className="font-montserrat text-[#9D9FA9] py-3 px-2 text-sm">
                        {ticket.category}
                      </td>
                      <td className="font-montserrat text-[#9D9FA9] py-3 px-2 max-w-xs">
                        <div className="truncate" title={ticket.message}>
                          {ticket.message.length > 50 ? `${ticket.message.substring(0, 50)}...` : ticket.message}
                        </div>
                      </td>
                      <td className="font-montserrat py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="font-montserrat py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="font-montserrat text-[#9D9FA9] py-3 px-2 text-sm">
                        {formatDateShort(ticket.createdAt)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(ticket)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                            title="View Details"
                          >
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {showDetails && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0C021E] border border-[#9D9FA9] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-montserrat font-semibold text-xl text-white">Ticket Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-[#9D9FA9] hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Name</label>
                    <p className="font-montserrat text-white">{selectedTicket.name}</p>
                  </div>
                  <div>
                    <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Email</label>
                    <p className="font-montserrat text-white">{selectedTicket.email}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Category</label>
                  <p className="font-montserrat text-white">{selectedTicket.category}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Status</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusUpdate(selectedTicket.id, e.target.value)}
                      disabled={updating}
                      className="w-full p-2 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Priority</label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handlePriorityUpdate(selectedTicket.id, e.target.value)}
                      disabled={updating}
                      className="w-full p-2 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Message</label>
                  <div className="p-3 bg-[rgba(144,80,233,0.1)] border border-[#9D9FA9] rounded">
                    <p className="font-montserrat text-white whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block font-montserrat text-[#9D9FA9] mb-1 text-sm">Admin Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-[#0C021E] border border-[#9D9FA9] rounded text-white focus:outline-none focus:border-[#A96AFF]"
                    placeholder="Add internal notes about this ticket..."
                  />
                  <button
                    onClick={() => handleAddNotes(selectedTicket.id)}
                    disabled={updating || !notes.trim()}
                    className="mt-2 bg-[#9050E9] hover:bg-[#A96AFF] disabled:bg-gray-600 text-white font-montserrat font-medium py-2 px-4 rounded transition-colors"
                  >
                    {updating ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
                
                <div className="text-sm font-montserrat text-[#9D9FA9] opacity-70">
                  <p>Created: {formatDateLong(selectedTicket.createdAt)}</p>
                  <p>Last Updated: {formatDateLong(selectedTicket.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
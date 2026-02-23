'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, AlertTriangle, Calendar, Clock, MapPin, Mail, CheckCircle, XCircle } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  section: string;
  semester: number;
}

export default function EmergencyNotifications() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [notificationType, setNotificationType] = useState<'schedule_change' | 'urgent_update'>('schedule_change');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Schedule Change Fields
  const [scheduleData, setScheduleData] = useState({
    subjectName: '',
    subjectCode: '',
    facultyName: '',
    changeType: 'reschedule' as 'reschedule' | 'cancellation' | 'room_change' | 'time_change',
    originalDate: '',
    newDate: '',
    originalTime: '',
    newTime: '',
    originalRoom: '',
    newRoom: '',
    reason: '',
  });

  // Urgent Update Fields
  const [urgentData, setUrgentData] = useState({
    updateMessage: '',
    effectiveDate: '',
    priority: 'high' as 'high' | 'urgent',
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/admin/batches');
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleSendScheduleChange = async () => {
    if (!selectedBatch || !scheduleData.subjectName || !scheduleData.subjectCode || !scheduleData.facultyName) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notifications/schedule-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch,
          ...scheduleData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        // Reset form
        setScheduleData({
          subjectName: '',
          subjectCode: '',
          facultyName: '',
          changeType: 'reschedule',
          originalDate: '',
          newDate: '',
          originalTime: '',
          newTime: '',
          originalRoom: '',
          newRoom: '',
          reason: '',
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send notifications' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendUrgentUpdate = async () => {
    if (!selectedBatch || !urgentData.updateMessage || !urgentData.effectiveDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notifications/urgent-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch,
          ...urgentData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        // Reset form
        setUrgentData({
          updateMessage: '',
          effectiveDate: '',
          priority: 'high',
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send notifications' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-red-500" />
            Emergency Notifications & Schedule Changes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Send urgent notifications to students and faculty about schedule changes or important updates
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Display */}
          {message && (
            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Batch Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Batch <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Batch --</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} {batch.section} - Semester {batch.semester}
                </option>
              ))}
            </select>
          </div>

          {/* Notification Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Notification Type</label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={notificationType === 'schedule_change' ? 'default' : 'outline'}
                onClick={() => setNotificationType('schedule_change')}
                className="flex-1"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Change
              </Button>
              <Button
                type="button"
                variant={notificationType === 'urgent_update' ? 'default' : 'outline'}
                onClick={() => setNotificationType('urgent_update')}
                className="flex-1"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Urgent Update
              </Button>
            </div>
          </div>

          {/* Schedule Change Form */}
          {notificationType === 'schedule_change' && (
            <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-semibold text-blue-900">Schedule Change Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={scheduleData.subjectName}
                    onChange={(e) => setScheduleData({ ...scheduleData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Data Structures"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={scheduleData.subjectCode}
                    onChange={(e) => setScheduleData({ ...scheduleData, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., CS201"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Faculty Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={scheduleData.facultyName}
                    onChange={(e) => setScheduleData({ ...scheduleData, facultyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Dr. Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Change Type</label>
                  <select
                    value={scheduleData.changeType}
                    onChange={(e) => setScheduleData({ ...scheduleData, changeType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="reschedule">Reschedule</option>
                    <option value="cancellation">Cancellation</option>
                    <option value="room_change">Room Change</option>
                    <option value="time_change">Time Change</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Original Date</label>
                  <input
                    type="date"
                    value={scheduleData.originalDate}
                    onChange={(e) => setScheduleData({ ...scheduleData, originalDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">New Date</label>
                  <input
                    type="date"
                    value={scheduleData.newDate}
                    onChange={(e) => setScheduleData({ ...scheduleData, newDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Original Time</label>
                  <input
                    type="time"
                    value={scheduleData.originalTime}
                    onChange={(e) => setScheduleData({ ...scheduleData, originalTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">New Time</label>
                  <input
                    type="time"
                    value={scheduleData.newTime}
                    onChange={(e) => setScheduleData({ ...scheduleData, newTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Original Room</label>
                  <input
                    type="text"
                    value={scheduleData.originalRoom}
                    onChange={(e) => setScheduleData({ ...scheduleData, originalRoom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Room 101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">New Room</label>
                  <input
                    type="text"
                    value={scheduleData.newRoom}
                    onChange={(e) => setScheduleData({ ...scheduleData, newRoom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Room 205"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason for Change</label>
                <textarea
                  value={scheduleData.reason}
                  onChange={(e) => setScheduleData({ ...scheduleData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Explain why the schedule is being changed..."
                />
              </div>

              <Button
                onClick={handleSendScheduleChange}
                disabled={loading || !selectedBatch}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Mail className="h-4 w-4 mr-2 animate-spin" />
                    Sending Notifications...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Schedule Change Notification
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Urgent Update Form */}
          {notificationType === 'urgent_update' && (
            <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
              <h3 className="font-semibold text-red-900">Urgent Update Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Update Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={urgentData.updateMessage}
                    onChange={(e) => setUrgentData({ ...urgentData, updateMessage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={4}
                    placeholder="Describe the urgent update in detail..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Effective Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={urgentData.effectiveDate}
                      onChange={(e) => setUrgentData({ ...urgentData, effectiveDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Priority Level</label>
                    <select
                      value={urgentData.priority}
                      onChange={(e) => setUrgentData({ ...urgentData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="high">High Priority</option>
                      <option value="urgent">🚨 URGENT</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSendUrgentUpdate}
                disabled={loading || !selectedBatch}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <>
                    <Mail className="h-4 w-4 mr-2 animate-spin" />
                    Sending Urgent Notifications...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Send Urgent Update Notification
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageCircle, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  User,
  Building2,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartment } from '@/contexts/DepartmentContext';

// ============================================================================
// PUBLISHER TO PRINCIPAL MESSAGE COMPONENT
// ============================================================================

interface MessageToPrincipalProps {
  className?: string;
}

interface SendMessageResult {
  success: boolean;
  messageId?: number;
  error?: string;
  timestamp?: string;
}

export default function MessageToPrincipal({ className = '' }: MessageToPrincipalProps) {
  const { user } = useAuth();
  const { activeDepartment } = useDepartment();

  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<SendMessageResult | null>(null);
  const [messageHistory, setMessageHistory] = useState<Array<{
    id: string;
    message: string;
    priority: string;
    timestamp: Date;
    status: 'sent' | 'failed';
  }>>([]);

  const maxCharacters = 4000;
  const characterCount = message.length;
  const isMessageValid = message.trim().length > 0 && characterCount <= maxCharacters;

  // Check if user is a publisher or admin
  const isPublisher = user?.role === 'admin' || (user?.role === 'mentor' && user?.mentor_type === 'publisher');

  const handleSendMessage = async () => {
    if (!isMessageValid || !user || !activeDepartment) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/telegram/send-to-principal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderName: `${user.first_name} ${user.last_name}`.trim() || user.email,
          senderRole: user.role,
          senderDepartment: activeDepartment.name,
          message: message.trim(),
          priority
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLastResult({
          success: true,
          messageId: result.messageId,
          timestamp: result.timestamp
        });

        // Add to message history
        setMessageHistory(prev => [
          {
            id: `msg-${Date.now()}`,
            message: message.trim(),
            priority,
            timestamp: new Date(),
            status: 'sent'
          },
          ...prev.slice(0, 4) // Keep only last 5 messages
        ]);

        // Clear the message
        setMessage('');
        setPriority('medium');

      } else {
        setLastResult({
          success: false,
          error: result.error || 'Failed to send message'
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setLastResult({
        success: false,
        error: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <MessageCircle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <MessageCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isPublisher) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This feature is only available for mentors with publisher role and administrators.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Message Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span>Message to Principal</span>
            <Badge variant="outline" className="ml-2">
              Telegram
            </Badge>
          </CardTitle>
          <CardDescription>
            Send important messages directly to the principal via Telegram bot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sender Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">From:</span>
                <span>{`${user?.first_name} ${user?.last_name}`.trim() || user?.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Department:</span>
                <span>{activeDepartment?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{user?.role}</Badge>
              </div>
            </div>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message Priority</label>
            <div className="flex space-x-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg border transition-colors ${
                    priority === p
                      ? getPriorityColor(p)
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  {getPriorityIcon(p)}
                  <span className="text-sm font-medium capitalize">{p}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority messages will send urgent notifications to the principal
            </p>
          </div>

          {/* Message Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to the principal here..."
              className="min-h-[120px] resize-none"
              maxLength={maxCharacters}
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Be clear and concise in your communication</span>
              <span className={characterCount > maxCharacters * 0.9 ? 'text-red-500' : ''}>
                {characterCount}/{maxCharacters}
              </span>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!isMessageValid || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to Principal
              </>
            )}
          </Button>

          {/* Result Display */}
          {lastResult && (
            <Alert className={lastResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={lastResult.success ? 'text-green-800' : 'text-red-800'}>
                {lastResult.success ? (
                  <>
                    Message sent successfully to principal via Telegram!
                    {lastResult.messageId && (
                      <span className="block text-xs mt-1 opacity-75">
                        Message ID: {lastResult.messageId}
                      </span>
                    )}
                  </>
                ) : (
                  lastResult.error || 'Failed to send message'
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Messages */}
      {messageHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Messages</CardTitle>
            <CardDescription>
              Your last few messages sent to the principal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messageHistory.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 mt-1">
                    {msg.status === 'sent' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(msg.priority)}`}
                      >
                        {msg.priority.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">How to Set Up Telegram Bot</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. Create a bot using @BotFather on Telegram</p>
            <p>2. Get the bot token and add it to TELEGRAM_BOT_TOKEN environment variable</p>
            <p>3. Get the principal's chat ID and add it to PRINCIPAL_TELEGRAM_CHAT_ID</p>
            <p>4. Restart the server to initialize the bot</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
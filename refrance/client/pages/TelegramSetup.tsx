import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bot, 
  CheckCircle, 
  Clock, 
  MessageCircle, 
  RefreshCw,
  Copy,
  ExternalLink,
  Settings
} from 'lucide-react';

interface SetupStep {
  step: number;
  title: string;
  description: string;
  status: string;
}

interface BotInfo {
  token: string;
  principalChatId: string;
}

interface ChatInfo {
  chatId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  messageText?: string;
  date: string;
}

export default function TelegramSetup() {
  const [setupInfo, setSetupInfo] = useState<{
    steps: SetupStep[];
    botInfo: BotInfo;
    nextActions: string[];
  } | null>(null);
  const [chatIds, setChatIds] = useState<ChatInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [principalChatId, setPrincipalChatId] = useState('');

  useEffect(() => {
    fetchSetupInfo();
  }, []);

  const fetchSetupInfo = async () => {
    try {
      const response = await fetch('/api/telegram/setup');
      const data = await response.json();
      setSetupInfo(data);
    } catch (error) {
      console.error('Error fetching setup info:', error);
    }
  };

  const fetchChatIds = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/telegram/getchatid');
      const data = await response.json();
      if (data.success) {
        setChatIds(data.recentChats);
      }
    } catch (error) {
      console.error('Error fetching chat IDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const testMessage = async () => {
    if (!principalChatId) {
      setTestResult('Please enter a chat ID first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId: principalChatId }),
      });
      
      const data = await response.json();
      if (data.success) {
        setTestResult('✅ Test message sent successfully!');
      } else {
        setTestResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!setupInfo) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Bot className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Telegram Bot Setup</h1>
          <p className="text-muted-foreground">Configure your Telegram bot for principal communication</p>
        </div>
      </div>

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Setup Progress</span>
          </CardTitle>
          <CardDescription>
            Follow these steps to complete your Telegram bot configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {setupInfo.steps.map((step) => (
            <div key={step.step} className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                {step.status.includes('✅') ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold">Step {step.step}: {step.title}</h3>
                  <Badge variant={step.status.includes('✅') ? 'default' : 'secondary'}>
                    {step.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-2">{step.description}</p>
                {step.step === 2 && (
                  <div className="text-sm space-y-1 bg-muted p-3 rounded">
                    <p className="font-medium">Instructions for Principal:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open Telegram and search for: <strong>@Principle_Pygram_bot</strong></li>
                      <li>Start a conversation by sending <strong>/start</strong></li>
                      <li>Send any message to the bot</li>
                      <li>Inform the admin that you've messaged the bot</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bot Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Bot Configuration Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium">Bot Token</span>
              <Badge variant={setupInfo.botInfo.token === 'Configured' ? 'default' : 'destructive'}>
                {setupInfo.botInfo.token}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium">Principal Chat ID</span>
              <Badge variant={setupInfo.botInfo.principalChatId === 'Configured' ? 'default' : 'destructive'}>
                {setupInfo.botInfo.principalChatId}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Get Chat IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Find Principal's Chat ID</span>
          </CardTitle>
          <CardDescription>
            After the principal messages the bot, click "Get Chat IDs" to find their chat ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={fetchChatIds} disabled={loading} className="w-full">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Get Recent Chat IDs
              </>
            )}
          </Button>

          {chatIds.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Recent Chat IDs:</h4>
              {chatIds.map((chat, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <strong>Chat ID: {chat.chatId}</strong>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(chat.chatId.toString())}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <Badge variant="outline">
                      {new Date(chat.date).toLocaleDateString()}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p><strong>From:</strong> {chat.firstName} {chat.lastName} {chat.username ? `(@${chat.username})` : ''}</p>
                    <p><strong>Message:</strong> {chat.messageText}</p>
                  </div>
                </div>
              ))}
              
              <Alert>
                <AlertDescription>
                  Copy the chat ID of the principal and add it to your .env file as TELEGRAM_PRINCIPAL_CHAT_ID=&lt;chat_id&gt;, then restart the server.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Test Bot Connection</span>
          </CardTitle>
          <CardDescription>
            Test sending a message to a specific chat ID (useful for testing before updating .env)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chatId">Principal's Chat ID</Label>
            <Input
              id="chatId"
              placeholder="Enter chat ID (e.g., 123456789)"
              value={principalChatId}
              onChange={(e) => setPrincipalChatId(e.target.value)}
            />
          </div>
          
          <Button onClick={testMessage} disabled={loading || !principalChatId}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Test Message
              </>
            )}
          </Button>

          {testResult && (
            <Alert>
              <AlertDescription>{testResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Next Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {setupInfo.nextActions.map((action, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle>Useful Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" asChild className="w-full justify-start">
            <a href="https://t.me/Principle_Pygram_bot" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Bot in Telegram
            </a>
          </Button>
          <Button variant="outline" asChild className="w-full justify-start">
            <a href="/api/telegram/status" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Check Bot Status (API)
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Crown } from 'lucide-react';

export default function FloatingTalkButton() {
  const { user, isAuthenticated } = useAuth();
  
  // Only show for authenticated users who can send messages
  const canSendMessages = isAuthenticated && user && (
    user.role === 'mentor' || 
    user.mentor_type === 'publisher' || 
    user.mentor_type === 'creator'
  );

  if (!canSendMessages) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      <Button 
        variant="default"
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-gradient-to-r from-blue-500 to-indigo-600"
        onClick={() => window.open('/principle-chat-gpt.html', '_blank')}
        title="Chat with Principal"
      >
        <Crown className="h-6 w-6" />
      </Button>
    </div>
  );
}
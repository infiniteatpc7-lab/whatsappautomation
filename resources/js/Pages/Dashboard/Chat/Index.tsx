import React, { useEffect, useState } from 'react';
import { Messenger } from '@/features/chat/components/messenger';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { usePage } from '@inertiajs/react';
import { useChatStore } from '@/features/chat/utils/store';
import { Conversation } from '@/features/chat/utils/types';
import { SharedProps } from '@/types';

type ChatPageProps = SharedProps & {
  initialConversations?: Conversation[];
  hasConnectedAccount?: boolean;
  activePhoneNumber?: string | null;
};

export default function ChatPage() {
  const { auth, initialConversations = [], hasConnectedAccount, activePhoneNumber } = usePage<ChatPageProps>().props;
  const isWhatsAppConnected = Boolean(auth.workspace?.has_whatsapp || hasConnectedAccount);
  const { setConversations, refreshConversations, pollActiveMessages } = useChatStore();
  const [mobileHeight, setMobileHeight] = useState<number | null>(null);

  useEffect(() => {
    if (initialConversations) {
      setConversations(initialConversations);
    }
  }, [initialConversations]);

  // Handle mobile virtual keyboard via visualViewport API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      if (window.innerWidth < 768 && window.visualViewport) {
        // Compute exact available height minus 56px dashboard header
        const available = Math.round(window.visualViewport.height - 56);
        setMobileHeight(available > 150 ? available : null);
        // Lock window scroll to top so header is never scrolled away
        window.scrollTo(0, 0);
      } else {
        setMobileHeight(null);
      }
    };

    handleResize();
    const vv = window.visualViewport;
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Fast background polling: active thread messages every 2.5s, conversation list every 5s
  useEffect(() => {
    if (!isWhatsAppConnected) return;

    const messagesInterval = window.setInterval(() => {
      pollActiveMessages();
    }, 2500);

    const conversationsInterval = window.setInterval(() => {
      refreshConversations();
    }, 5000);

    return () => {
      window.clearInterval(messagesInterval);
      window.clearInterval(conversationsInterval);
    };
  }, [isWhatsAppConnected]);

  return (
    <div
      style={mobileHeight ? { height: `${mobileHeight}px`, maxHeight: `${mobileHeight}px` } : undefined}
      className='flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] min-h-0 flex-1 flex-col overflow-hidden p-0 sm:p-2 md:p-3'
    >
      {isWhatsAppConnected ? (
        <Messenger activePhoneNumber={activePhoneNumber} />
      ) : (
        <WhatsAppLockedState
          featureName='WhatsApp Live Chat'
          description='To send and receive WhatsApp messages from customers in real-time, connect your Meta WhatsApp Cloud API credentials in Workspace settings.'
        />
      )}
    </div>
  );
}

import React from 'react';
import PageContainer from '@/components/layout/page-container';
import { AiChatDemo } from '@/features/ai-chat/components/ai-chat-demo';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { usePage } from '@inertiajs/react';
import { SharedProps } from '@/types';

export default function AIChatPage() {
  const { auth } = usePage<SharedProps>().props;
  const isWhatsAppConnected = Boolean(auth.workspace?.has_whatsapp);

  return (
    <PageContainer>
      {isWhatsAppConnected ? (
        <AiChatDemo />
      ) : (
        <WhatsAppLockedState
          featureName='AI WhatsApp Assistant'
          description='Automate customer inquiries with intelligent AI response flows. Connect your Meta WhatsApp Business API account to activate AI auto-replies.'
        />
      )}
    </PageContainer>
  );
}

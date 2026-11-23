import React from 'react';
import { Messenger } from '@/features/chat/components/messenger';
import { WhatsAppLockedState } from '@/components/whatsapp-locked-state';
import { usePage } from '@inertiajs/react';
import { SharedProps } from '@/types';

export default function ChatPage() {
  const { auth } = usePage<SharedProps>().props;
  const isWhatsAppConnected = Boolean(auth.workspace?.has_whatsapp);

  return (
    <div className='flex min-h-0 flex-1 p-4 md:p-6'>
      {isWhatsAppConnected ? (
        <Messenger />
      ) : (
        <WhatsAppLockedState
          featureName='WhatsApp Live Chat'
          description='To send and receive WhatsApp messages from customers in real-time, connect your Meta WhatsApp Cloud API credentials in Workspace settings.'
        />
      )}
    </div>
  );
}

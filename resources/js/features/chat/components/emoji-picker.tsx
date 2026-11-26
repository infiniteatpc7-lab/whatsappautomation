'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & People',
    icon: '😊',
    emojis: [
      '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','🥹','😊','😇','🙂','🙃','😉','😌',
      '😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸',
      '🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢',
      '😭','😮‍💨','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🫣',
      '🤗','🫡','🤔','🫢','🤫','🫠','🤥','😶','😐','😑','😬','🫨','🙄','😯','😦','😧',
      '😮','😲','🥱','😴','🤤','😪','😵','😵‍💫','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕',
      '🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺',
      '🫶','👏','🙌','👐','🤲','🤝','👍','👎','👊','✊','🤛','🤜','🤞','✌️','🫰','🤟',
      '🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💪'
    ],
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵',
      '🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝',
      '🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🐙',
      '🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓',
      '🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑',
      '🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🪴','🍃','🍂','🍁','🍄','🌾','💐','🌷',
      '🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑'
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '🍔',
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
      '🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠',
      '🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭',
      '🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱',
      '🥟','🍤','🍙','🍚','🍘','🍥','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮',
      '🍭','🍬','🍫','🍿','🍩','🍪','🥛','🍼','☕','🫖','🍵','🧃','🥤','🧋','🍺','🍻'
    ],
  },
  {
    id: 'activities',
    name: 'Activity & Sports',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍',
      '🏏','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🎿','🏂',
      '🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴',
      '🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🎨','🎬','🎤'
    ],
  },
  {
    id: 'objects',
    name: 'Objects & Symbols',
    icon: '💡',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❣️','💕','💞','💓','💗',
      '💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎',
      '💯','💢','♨️','💥','💫','💦','💨','🕳️','💣','💬','👁️‍🗨️','🗨️','🗯️','💭','💤','🔔',
      '💡','🔦','🕯️','🪔','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','📷','📸','📹','📼','🔋',
      '🔌','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️'
    ],
  },
];

export function EmojiPicker({ onSelect, onClose, className }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState('smileys');
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const currentCategory = useMemo(() => {
    return EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];
  }, [activeTab]);

  const displayedEmojis = useMemo(() => {
    if (!search.trim()) {
      return currentCategory.emojis;
    }
    // Simple filter across all categories when searching
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    return all;
  }, [search, currentCategory]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'absolute bottom-16 left-0 z-50 flex flex-col w-[340px] sm:w-[380px] h-[370px]',
        'rounded-2xl border border-border/40 shadow-2xl overflow-hidden backdrop-blur-xl',
        'bg-[#242626] dark:bg-[#242626] text-[#e9edef] light:bg-white light:text-[#111b21]',
        className
      )}
    >
      {/* Category Icons Header */}
      <div className='flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-border/20 bg-[#182229]/60 dark:bg-[#182229]/60'>
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type='button'
            onClick={() => {
              setActiveTab(cat.id);
              setSearch('');
            }}
            className={cn(
              'p-1.5 rounded-lg text-lg transition-all cursor-pointer',
              activeTab === cat.id
                ? 'bg-white/15 dark:bg-white/15 scale-110'
                : 'opacity-60 hover:opacity-100 hover:bg-white/5'
            )}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Search Input Bar (WhatsApp style) */}
      <div className='px-3 py-2'>
        <div className='relative flex items-center'>
          <Icons.search className='absolute left-3 size-4 text-muted-foreground/70 pointer-events-none' />
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search emoji'
            className='w-full rounded-lg bg-[#111b21] dark:bg-[#111b21] pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground/60 border-0 focus:outline-none focus:ring-1 focus:ring-[#00a884]'
          />
        </div>
      </div>

      {/* Category Name */}
      <div className='px-3 py-1 text-[11px] font-semibold text-muted-foreground dark:text-[#8696a0] select-none'>
        {search ? 'All Emojis' : currentCategory.name}
      </div>

      {/* Emojis Grid */}
      <div className='flex-1 overflow-y-auto px-2.5 py-1 grid grid-cols-8 gap-1 select-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted/40 [&::-webkit-scrollbar-thumb]:rounded-full'>
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type='button'
            onClick={() => onSelect(emoji)}
            className='size-9 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer'
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Bottom Switch Bar (Emoji / GIF / Sticker) */}
      <div className='flex items-center justify-center gap-6 py-2 border-t border-border/20 bg-[#182229]/60 dark:bg-[#182229]/60 text-xs text-muted-foreground'>
        <span className='font-semibold text-[#00a884] cursor-pointer'>Emoji</span>
        <span className='hover:text-foreground cursor-pointer opacity-70'>GIF</span>
        <span className='hover:text-foreground cursor-pointer opacity-70'>Stickers</span>
      </div>
    </motion.div>
  );
}
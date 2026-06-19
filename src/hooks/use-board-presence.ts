'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

export function useBoardPresence(
  supabase: SupabaseClient<Database>,
  boardId: string
) {
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    const channel = supabase.channel(`presence-board-${boardId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length || 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, boardId]);

  return onlineCount;
}

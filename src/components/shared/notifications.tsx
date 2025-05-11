'use client';
import { useEffect } from ’react’;
import { supabase } from ’@/lib/supabase’;
export function Notifications({ userId }) {
useEffect(() => {
const channel = supabase
.channel(’notifications’)
.on(’postgres_changes’, { event: ’INSERT’, schema: ’public’, table: ’
notifications’ }, (payload) => {
alert(payload.new.message);
})
.subscribe();

return () => supabase.removeChannel(channel);
}, []);
return null;
}
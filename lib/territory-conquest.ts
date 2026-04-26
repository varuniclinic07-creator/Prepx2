import { createClient } from '@/lib/supabase-server';

// AC-13: captureDistrict checks mastery then assigns to user's squad
export async function captureDistrict(userId: string, districtId: string): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  // Get user's squad
  const { data: membership } = await supabase
    .from('squad_members')
    .select('squad_id')
    .eq('user_id', userId)
    .single();
  const squadId = membership?.squad_id;
  if (!squadId) return { success: false, message: 'You must join a squad to capture territory.' };

  // Get linked topic for district
  const { data: links } = await supabase
    .from('district_topics')
    .select('topic_id')
    .eq('district_id', districtId)
    .limit(1);
  const topicId = links?.[0]?.topic_id;

  // Check if user "mastered" the topic: has scored >=8 on a quiz for it
  let mastered = false;
  if (topicId) {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('score, max_score')
      .eq('user_id', userId)
      .eq('quiz_id', topicId)
      .order('score', { ascending: false })
      .limit(1);
    if (attempts && attempts.length > 0) {
      const pct = attempts[0].max_score ? (attempts[0].score / attempts[0].max_score) : 0;
      mastered = pct >= 0.8;
    }
  }

  // Fallback: allow capture if no linked topic (MVP leniency)
  if (!mastered && topicId) {
    return { success: false, message: 'Master the linked topic (score ≥80%) to capture this district.' };
  }

  // Upsert ownership
  const { error } = await supabase.from('territory_ownership').upsert({
    district_id: districtId,
    squad_id: squadId,
    captured_at: new Date().toISOString(),
    capture_count: 1,
  }, { onConflict: 'district_id,squad_id' });

  if (error) {
    return { success: false, message: error.message };
  }

  // Increment capture count
  await supabase.rpc('increment_capture', { d_id: districtId, s_id: squadId });

  return { success: true, message: 'Territory captured for your squad!' };
}

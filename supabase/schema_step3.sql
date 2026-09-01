-- PulseX Step 3a Schema Migration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create `events` table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('exam', 'assignment', 'meeting', 'general')),
  priority INT NOT NULL CHECK (priority BETWEEN 1 AND 4),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create `sent_log` table
CREATE TABLE IF NOT EXISTS public.sent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reminder_stage TEXT NOT NULL CHECK (reminder_stage IN ('7d', '3d', '1d', 'morning')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create `streaks` table
CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_total INT NOT NULL DEFAULT 0,
  tasks_completed INT NOT NULL DEFAULT 0,
  all_completed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, date)
);

-- 4. Create `classification_log` table
CREATE TABLE IF NOT EXISTS public.classification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  matched_keyword TEXT,
  assigned_priority INT NOT NULL
);


-- Row Level Security (RLS)

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_log ENABLE ROW LEVEL SECURITY;

-- Events Policies
CREATE POLICY "Users can read their own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- Sent Log Policies (Join through events)
CREATE POLICY "Users can read sent_log for their events" ON public.sent_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = sent_log.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Users can insert sent_log for their events" ON public.sent_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = sent_log.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Users can update sent_log for their events" ON public.sent_log FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = sent_log.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Users can delete sent_log for their events" ON public.sent_log FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = sent_log.event_id AND events.user_id = auth.uid())
);

-- Streaks Policies
CREATE POLICY "Users can read their own streaks" ON public.streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own streaks" ON public.streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streaks" ON public.streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own streaks" ON public.streaks FOR DELETE USING (auth.uid() = user_id);

-- Classification Log Policies (Join through events)
CREATE POLICY "Users can read classification_log for their events" ON public.classification_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = classification_log.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Users can insert classification_log for their events" ON public.classification_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = classification_log.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Users can update classification_log for their events" ON public.classification_log FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = classification_log.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Users can delete classification_log for their events" ON public.classification_log FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = classification_log.event_id AND events.user_id = auth.uid())
);

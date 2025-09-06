-- Create visits table to track individual student visits
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mess_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(student_id, mess_id, date)
);

-- Add location column to messes table
ALTER TABLE public.messes ADD COLUMN IF NOT EXISTS location TEXT;

-- Enable RLS on visits table
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for visits table
CREATE POLICY "Students can view their own visits"
ON public.visits
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own visits"
ON public.visits
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mess owners can view visits to their messes"
ON public.visits
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM messes 
  WHERE messes.id = visits.mess_id 
  AND messes.owner_id = auth.uid()
));

-- Create trigger to update daily_visitors when a visit is recorded
CREATE OR REPLACE FUNCTION public.update_daily_visitor_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.daily_visitors (mess_id, date, visitor_count)
  VALUES (NEW.mess_id, NEW.date, 1)
  ON CONFLICT (mess_id, date) 
  DO UPDATE SET 
    visitor_count = daily_visitors.visitor_count + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_visitor_count_trigger
AFTER INSERT ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_visitor_count();
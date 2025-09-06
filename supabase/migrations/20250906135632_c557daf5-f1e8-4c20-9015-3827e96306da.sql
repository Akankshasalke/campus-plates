-- Fix the function search path issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
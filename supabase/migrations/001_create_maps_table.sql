-- Time-Thread Maps Table
-- Run this migration in your Supabase SQL editor

-- Create the maps table
CREATE TABLE IF NOT EXISTS public.maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    video_id VARCHAR(50),
    video_url TEXT,
    graph_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    raw_transcript TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on updated_at for efficient sorting
CREATE INDEX IF NOT EXISTS idx_maps_updated_at ON public.maps (updated_at DESC);

-- Create index on video_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_maps_video_id ON public.maps (video_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
-- For public access (no auth required):
CREATE POLICY "Allow public access to maps" ON public.maps
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on row update
DROP TRIGGER IF EXISTS update_maps_updated_at ON public.maps;
CREATE TRIGGER update_maps_updated_at
    BEFORE UPDATE ON public.maps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant access to the anon role (for client-side access)
GRANT ALL ON public.maps TO anon;
GRANT ALL ON public.maps TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.maps IS 'Stores processed conversation graphs from video/audio transcripts';
COMMENT ON COLUMN public.maps.graph_data IS 'JSON containing nodes and edges for React Flow visualization';
COMMENT ON COLUMN public.maps.video_id IS 'YouTube video ID if source is YouTube';
COMMENT ON COLUMN public.maps.raw_transcript IS 'Original transcript text before processing';

-- ComfyUI + LTX2.3 Integration Settings

CREATE TABLE comfyui_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host TEXT NOT NULL DEFAULT 'localhost',
    port INT NOT NULL DEFAULT 8188,
    secure BOOLEAN DEFAULT false,
    api_endpoint TEXT NOT NULL DEFAULT '/api',
    ws_endpoint TEXT NOT NULL DEFAULT '/ws',
    workflow_template JSONB, -- Stores the LTX2.3 workflow JSON
    default_positive_prompt TEXT DEFAULT 'A high quality educational video, smooth motion, cinematic lighting',
    default_negative_prompt TEXT DEFAULT 'blurry, distorted, low quality, watermark',
    steps INT DEFAULT 20,
    cfg_scale FLOAT DEFAULT 7.5,
    width INT DEFAULT 768,
    height INT DEFAULT 512,
    frame_count INT DEFAULT 24,
    fps INT DEFAULT 8,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comfyui_prompt_id to astra_scripts for tracking
ALTER TABLE astra_scripts 
    ADD COLUMN IF NOT EXISTS comfy_prompt_id TEXT,
    ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'pending' CHECK (video_status IN ('pending','queued','generating','completed','failed')),
    ADD COLUMN IF NOT EXISTS comfy_video_url TEXT;

-- Add tracking table for ComfyUI prompt jobs
CREATE TABLE comfyui_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    astra_script_id UUID REFERENCES astra_scripts(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    workflow JSONB NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
    output_files TEXT[] DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_comfyui_jobs_status ON comfyui_jobs(status);
CREATE INDEX idx_comfyui_jobs_astra_script ON comfyui_jobs(astra_script_id);

-- Default settings row
INSERT INTO comfyui_settings (host, port, workflow_template, default_positive_prompt, default_negative_prompt)
VALUES (
    'comfyui',
    8188,
    '{
      "1": {
        "inputs": {
          "model": "ltx_video/ltx-video-2b-v0.9.safetensors",
          "positive": "A high quality educational video explaining a concept, smooth motion, cinematic lighting",
          "negative": "blurry, distorted, low quality, watermark",
          "width": 768,
          "height": 512,
          "length": 24,
          "fps": 8,
          "steps": 20,
          "cfg": 7.5,
          "seed": 0
        },
        "class_type": "LTXVideoSampler"
      },
      "2": {
        "inputs": {
          "filename_prefix": "prepx_astra",
          "images": ["1", 0]
        },
        "class_type": "SaveImage"
      }
    }'::jsonb,
    'A high quality educational video, smooth motion, cinematic lighting',
    'blurry, distorted, low quality, watermark'
)
ON CONFLICT DO NOTHING;

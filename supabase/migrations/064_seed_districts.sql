-- Seed a starter set of 12 representative Indian districts so the
-- /conquest 3D map has actual nodes to render. Idempotent via NOT EXISTS.
INSERT INTO districts (name, state, center_lat, center_lng)
SELECT v.name, v.state, v.lat, v.lng FROM (VALUES
  ('New Delhi',   'Delhi',         28.6139, 77.2090),
  ('Mumbai',      'Maharashtra',   19.0760, 72.8777),
  ('Pune',        'Maharashtra',   18.5204, 73.8567),
  ('Bengaluru',   'Karnataka',     12.9716, 77.5946),
  ('Chennai',     'Tamil Nadu',    13.0827, 80.2707),
  ('Hyderabad',   'Telangana',     17.3850, 78.4867),
  ('Kolkata',     'West Bengal',   22.5726, 88.3639),
  ('Jaipur',      'Rajasthan',     26.9124, 75.7873),
  ('Lucknow',     'Uttar Pradesh', 26.8467, 80.9462),
  ('Patna',       'Bihar',         25.5941, 85.1376),
  ('Bhopal',      'Madhya Pradesh',23.2599, 77.4126),
  ('Guwahati',    'Assam',         26.1445, 91.7362)
) AS v(name, state, lat, lng)
WHERE NOT EXISTS (
  SELECT 1 FROM districts d WHERE d.name = v.name AND d.state = v.state
);

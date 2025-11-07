-- Add receiver fee settings
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES 
  ('receiver_fee_percentage', '0.5', 'Percentage fee charged to money receiver'),
  ('receiver_fee_fixed', '0.25', 'Fixed fee charged to money receiver')
ON CONFLICT (setting_key) DO NOTHING;
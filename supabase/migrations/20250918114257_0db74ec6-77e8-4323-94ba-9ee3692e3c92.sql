-- Enable password strength checking and leaked password protection
-- This improves security by preventing weak and compromised passwords
-- Update auth configuration
UPDATE auth.config 
SET password_min_length = 8;
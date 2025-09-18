-- Update netlifegy@gmail.com to be an ADMIN user
UPDATE public.profiles 
SET role = 'ADMIN', 
    full_name = 'netlifegy'
WHERE email = 'netlifegy@gmail.com';
-- Add DELETE policy to profiles table to enable account deletion and GDPR compliance
CREATE POLICY "Users can delete their own profile"
ON public.profiles 
FOR DELETE
USING (auth.uid() = id);
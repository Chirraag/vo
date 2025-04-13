-- First drop existing foreign key constraints
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_campaignid_fkey;
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS "call_logs_contactId_fkey";
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_campaignid_fkey;

-- Re-add the constraints with CASCADE rules
ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_campaignid_fkey 
    FOREIGN KEY ("campaignId") 
    REFERENCES public.campaigns(id) 
    ON DELETE CASCADE;

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT "call_logs_contactId_fkey" 
    FOREIGN KEY ("contactId") 
    REFERENCES public.contacts(id) 
    ON DELETE CASCADE;

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_campaignid_fkey 
    FOREIGN KEY ("campaignId") 
    REFERENCES public.campaigns(id) 
    ON DELETE CASCADE;
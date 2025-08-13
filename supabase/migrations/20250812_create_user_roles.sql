-- Migration: Create user_roles table for multi-role support
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (
        role IN (
            'client',
            'tradie',
            'admin',
            'marketing',
            'finance',
            'support',
            'employee'
        )
    ),
    created_at timestamp without time zone DEFAULT now()
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
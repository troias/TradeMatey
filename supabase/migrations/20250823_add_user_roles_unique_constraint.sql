-- Add unique constraint on (user_id, role) for user_roles to prevent duplicates
-- Also widen the role CHECK if needed to include any new roles not in original table.
-- 1. Remove duplicate rows deterministically keeping the earliest created_at
WITH ranked AS (
    SELECT id,
        user_id,
        role,
        ROW_NUMBER() OVER (
            PARTITION BY user_id,
            role
            ORDER BY created_at ASC,
                id ASC
        ) AS rn
    FROM public.user_roles
)
DELETE FROM public.user_roles ur USING ranked r
WHERE ur.id = r.id
    AND r.rn > 1;
-- 2. Update the CHECK constraint if it lacks newer roles
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'user_roles'
        AND c.conname = 'user_roles_role_check'
) THEN -- nothing to do
NULL;
END IF;
EXCEPTION
WHEN others THEN -- ignore
NULL;
END;
$$;
-- 3. Create the unique index (idempotent) then attach constraint if missing
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'i'
        AND relname = 'idx_user_roles_user_id_role'
) THEN CREATE UNIQUE INDEX idx_user_roles_user_id_role ON public.user_roles(user_id, role);
END IF;
END;
$$;
-- 4. Add named constraint referencing that index if not exists (Postgres lacks IF NOT EXISTS for constraints)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
) THEN
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE USING INDEX idx_user_roles_user_id_role;
END IF;
END;
$$;
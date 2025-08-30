-- Run test scenarios for redeem_admin_invite
\ echo 'Starting redeem_admin_invite SQL tests' -- helper to show row counts
\ echo 'Initial state'
SELECT *
FROM users;
SELECT *
FROM admin_invites;
-- 1) invalid token
\ echo 'Test 1: invalid token (expect error)' DO $$ BEGIN PERFORM redeem_admin_invite(
    'nope',
    '00000000-0000-0000-0000-000000000000',
    NULL
);
RAISE NOTICE 'unexpected success';
EXCEPTION
WHEN others THEN RAISE NOTICE 'error: %',
SQLERRM;
END $$;
-- 2) user not found
\ echo 'Test 2: user not found'
INSERT INTO admin_invites (token, email, used)
VALUES ('t-user-missing', NULL, false);
DO $$ BEGIN PERFORM redeem_admin_invite(
    't-user-missing',
    '11111111-1111-1111-1111-111111111111',
    NULL
);
RAISE NOTICE 'unexpected success';
EXCEPTION
WHEN others THEN RAISE NOTICE 'error: %',
SQLERRM;
END $$;
-- 3) success path
\ echo 'Test 3: success'
INSERT INTO users (id, email)
VALUES (
        '22222222-2222-2222-2222-222222222222',
        'x@example.com'
    );
INSERT INTO admin_invites (token, email, used)
VALUES ('t-success', 'x@example.com', false);
DO $$ BEGIN PERFORM redeem_admin_invite(
    't-success',
    '22222222-2222-2222-2222-222222222222',
    NULL
);
RAISE NOTICE 'redeemed ok';
EXCEPTION
WHEN others THEN RAISE NOTICE 'error: %',
SQLERRM;
END $$;
SELECT *
FROM user_roles;
SELECT *
FROM admin_audit;
-- 4) already used
\ echo 'Test 4: already used' DO $$ BEGIN PERFORM redeem_admin_invite(
    't-success',
    '22222222-2222-2222-2222-222222222222',
    NULL
);
RAISE NOTICE 'unexpected success';
EXCEPTION
WHEN others THEN RAISE NOTICE 'error: %',
SQLERRM;
END $$;
-- 5) actor not admin
\ echo 'Test 5: actor not admin'
INSERT INTO users (id, email)
VALUES (
        '33333333-3333-3333-3333-333333333333',
        'actor@example.com'
    );
INSERT INTO admin_invites (token, email, used)
VALUES ('t-actor', NULL, false);
DO $$ BEGIN PERFORM redeem_admin_invite(
    't-actor',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);
RAISE NOTICE 'unexpected success';
EXCEPTION
WHEN others THEN RAISE NOTICE 'error: %',
SQLERRM;
END $$;
\ echo 'SQL tests complete'
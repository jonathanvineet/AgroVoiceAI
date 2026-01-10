echo "=== Checking Supabase Configuration ==="
echo "SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "Has ANON_KEY: $([ ! -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && echo 'YES' || echo 'NO')"
echo "Has SERVICE_ROLE_KEY: $([ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ] && echo 'YES' || echo 'NO')"

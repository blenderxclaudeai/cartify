
# Extension Integration — Status

All gaps have been resolved. Here's the final state:

## ✅ Completed

1. **`handle_new_user` trigger** — already existed on `auth.users`
2. **Photo category enum** — renamed `hair` → `upper_body`, `hands_wrist` → `lifestyle`
3. **Storage policies** — RLS policies added for read/upload/update/delete on `profile-photos` bucket, scoped to `{user_id}/` folder
4. **Token copy on Profile page** — "Copy Token" button added for extension pairing
5. **Dead code cleanup** — deleted `AppSidebar.tsx`, `AppLayout.tsx`, `Dashboard.tsx`, `WalletPage.tsx`, `Privacy.tsx`

## Extension API Contract

The Chrome Extension should call these endpoints:

### Try-On Request
```
POST /functions/v1/tryon-request
Authorization: Bearer <jwt>
Body: { pageUrl, imageUrl, title?, price?, retailerDomain? }
```

### Affiliate Redirect
```
GET /functions/v1/redirect?target=<url>&retailerDomain=<domain>&clickRef=<ref>
Authorization: Bearer <jwt> (optional)
```

### Profile Photos (Supabase REST)
```
GET /rest/v1/profile_photos?user_id=eq.<user_id>&select=*
Authorization: Bearer <jwt>
apikey: <anon_key>
```
Then generate signed URLs via storage API.

### Try-On History (Supabase REST)
```
GET /rest/v1/tryon_requests?user_id=eq.<user_id>&select=*&order=created_at.desc
Authorization: Bearer <jwt>
apikey: <anon_key>
```

## ⚠️ Remaining (non-blocking)

- `tryon-request` edge function still returns mock results — connect to real AI model when ready
- CORS is set to `*` — restrict in production

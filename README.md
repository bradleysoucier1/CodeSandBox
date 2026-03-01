# Firebase Code Sandbox

Simple browser-based code sandbox with:

- Firebase Authentication (Google + email/password)
- Firestore-backed sandbox CRUD (create/delete/save)
- Query-param routing:
  - Editor: `?sb=[sandbox id]&view=editor`
  - Preview: `?sb=[sandbox id]&view=preview`
- HTML/CSS/JS editing plus file upload (`.html`, `.css`, `.js`)

## Local run

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Firestore rules deployment

Save rules are in `firestore.rules`. Deploy with Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

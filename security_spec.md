# Data Invariants
1. Profiles can only be created and updated by an Admin, except for visitors who might follow. However, in this app, follows don't seem to be implemented as updates by visitors.
2. Posts can only be created by an Admin.
3. Visitors can add comments to a Post, but they can only append to the comments array and cannot modify the img, caption, or other post properties.
4. Chats can only be created and updated by an Admin (who simulates both sides of the conversation for the portfolio, or chats with visitors, but here it's simple client-side logic).
5. Highlights can only be created and updated by an Admin.

# The "Dirty Dozen" Payloads
1. Create Profile as non-admin
2. Update Profile's bio as non-admin
3. Create Post as non-admin
4. Update Post's caption as non-admin
5. Delete Post as non-admin
6. Update Post comments as non-admin modifying the caption at the same time
7. Create Chat as non-admin
8. Update Chat's name as non-admin
9. Append a massive comment payload (exceeding text size)
10. Update Highlight as non-admin
11. Add a comment where the user is not signed in
12. Modify an existing comment as non-admin

# The Test Runner
A complete `firestore.rules.test.ts` file that verifies these constraints.

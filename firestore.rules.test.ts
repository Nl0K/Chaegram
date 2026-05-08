import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import * as fs from "fs";
import { describe, it, beforeAll, afterAll, expect } from "vitest";

const projectId = "test-project-" + Date.now();

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: projectId,
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Firestore Security Rules - The Dirty Dozen", () => {
  it("1. Create Profile as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    const mockData = { username: "hack", name: "hacker" };
    await expect(setDoc(doc(db, "profiles", "hackId"), mockData)).rejects.toThrow();
  });

  it("2. Update Profile's bio as non-admin should fail", async () => {
    const adminDb = testEnv.authenticatedContext("Qs2Zg7QlN5eFtGphwnLDXbRdDv53", { email: "admin@admin.com", email_verified: true }).firestore();
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    
    // First setup as admin
    const id = "profile2";
    const validData = {
        username: "admin", name: "admin", bio: "admin", website: "admin",
        avatar: "admin", followersCount: "0", followingCount: "0",
        fontFamily: "nanum", postCount: 0, followedByUsers: [], followedByCount: 0
    };
    await setDoc(doc(adminDb, "profiles", id), validData);

    // Attempt update as hacker
    await expect(updateDoc(doc(db, "profiles", id), { bio: "hacked" })).rejects.toThrow();
  });

  it("3. Create Post as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    const mockData = { img: "hack", likes: 0, caption: "hack", time: "now", commentsCount: 0, comments: [] };
    await expect(setDoc(doc(db, "posts", "post1"), mockData)).rejects.toThrow();
  });

  it("4. Update Post's caption as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    await expect(updateDoc(doc(db, "posts", "post1"), { caption: "hacked" })).rejects.toThrow();
  });

  it("5. Delete Post as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    await expect(deleteDoc(doc(db, "posts", "post1"))).rejects.toThrow();
  });

  it("6. Update Post comments as non-admin modifying caption should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    await expect(updateDoc(doc(db, "posts", "post1"), { comments: [], caption: "hacked" })).rejects.toThrow();
  });

  it("7. Create Chat as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    await expect(setDoc(doc(db, "chats", "chat1"), { name: "hack" })).rejects.toThrow();
  });

  it("8. Update Chat's name as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    await expect(updateDoc(doc(db, "chats", "chat1"), { name: "hacked" })).rejects.toThrow();
  });

  it("9. Append a massive comment payload should fail", async () => {
    const db = testEnv.authenticatedContext("adminId", { email: "kid81338@gmail.com", email_verified: true }).firestore();
    const id = "postMassive";
    const validData = {
        img: "admin", likes: 0, caption: "admin", time: "now",
        commentsCount: 0, comments: []
    };
    const oversizedString = "a".repeat(2500); // Exceeds caption limit
    const oversizedData = { ...validData, caption: oversizedString };
    await expect(setDoc(doc(db, "posts", id), oversizedData)).rejects.toThrow();
  });

  it("10. Update Highlight as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    await expect(updateDoc(doc(db, "highlights", "h1"), { title: "hacked" })).rejects.toThrow();
  });

  it("11. Allow get on public profiles", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await expect(getDoc(doc(unauthedDb, "profiles", "main"))).resolves.toBeDefined();
  });

  it("12. Modify an existing comment as non-admin should fail", async () => {
    const db = testEnv.authenticatedContext("hackId", { email: "hack@hack.com", email_verified: true }).firestore();
    await expect(updateDoc(doc(db, "posts", "post1"), { comments: [{ user: "hack", text: "hacked", time: "now", likes: 0, isLiked: false }] })).rejects.toThrow();
  });
});

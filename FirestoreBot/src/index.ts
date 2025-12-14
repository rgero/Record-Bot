import { db } from "./firebase";

async function main() {
  await db.collection("test").add({
    message: "Firestore connected successfully",
    createdAt: new Date(),
  });

  console.log("✅ Firestore write successful");
}

main().catch(console.error);

"""One-time restructure: doctors/patients -> users + records.

What it does
    * converts every legacy `doctors` account into a `users` document
      (credentials are preserved so existing logins keep working),
    * drops the legacy `patients`, `medical_files`, `analysis_results` and
      `doctors` collections,
    * creates the `users` / `records` indexes.

Run from backend/:  python migrate_to_user_model.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import *  # noqa: F401,F403  - loads backend/.env
import database  # noqa: E402


def run():
    legacy_users = []
    if "doctors" in database.db.list_collection_names():
        legacy_users = list(database.db["doctors"].find({}))

    # Drop the old model completely.
    for collection in ("patients", "medical_files", "analysis_results"):
        if collection in database.db.list_collection_names():
            database.db[collection].drop()
            print(f"[drop] {collection}")

    next_id = 1001
    for doc in legacy_users:
        username = (doc.get("username") or "").strip().lower()
        if not username or database.users.find_one({"username": username}):
            continue
        database.users.insert_one({
            "userId": f"U{next_id}",
            "username": username,
            "passwordHash": doc.get("password_hash") or doc.get("passwordHash"),
            "name": doc.get("name") or "User",
            "phone": None,
            "age": None,
            "gender": None,
            "contact": None,
            "archived": 0,
            "createdAt": doc.get("createdAt") or database._now_iso(),
        })
        next_id += 1

    if "doctors" in database.db.list_collection_names():
        database.db["doctors"].drop()
        print("[drop] doctors")

    database.init_db()
    database.seed_default_user()

    print("\nSchema:");
    print("  users  :", database.users.count_documents({}), "accounts")
    print("  records:", database.records.count_documents({}), "records")
    print("  collections:", sorted(database.db.list_collection_names()))


if __name__ == "__main__":
    run()

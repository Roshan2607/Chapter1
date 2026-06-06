import sys
import unittest
from unittest.mock import MagicMock

# Add current dir to path to find database.py
import os
sys.path.append(os.path.dirname(__file__))

import database

class TestAuth(unittest.TestCase):
    def test_password_hashing(self):
        password = "SecurePassword123"
        hashed = database.hash_password(password)
        self.assertNotEqual(password, hashed)
        self.assertTrue(hashed.startswith("pbkdf2_sha256$"))
        
        # Verify correctness
        self.assertTrue(database.verify_password(password, hashed))
        # Verify incorrect password
        self.assertFalse(database.verify_password("wrong", hashed))
        self.assertFalse(database.verify_password("", hashed))

    def test_mock_registration_and_auth(self):
        # We can mock the mongodb collections for unit testing database actions 
        # without requiring a live Mongo server running.
        database.users_col = MagicMock()
        database.sessions_col = MagicMock()

        # 1. Register User Mock
        database.users_col.find_one.return_value = None
        mock_insert_res = MagicMock()
        mock_insert_res.inserted_id = "507f1f77bcf86cd799439011"
        database.users_col.insert_one.return_value = mock_insert_res

        user = database.register_user("test@example.com", "Test User", "mypassword")
        self.assertEqual(user["email"], "test@example.com")
        self.assertEqual(user["name"], "Test User")
        self.assertEqual(user["_id"], "507f1f77bcf86cd799439011")
        self.assertNotIn("password_hash", user)

        # 2. Authenticate User Mock
        hashed_password = database.hash_password("mypassword")
        database.users_col.find_one.return_value = {
            "_id": "507f1f77bcf86cd799439011",
            "email": "test@example.com",
            "name": "Test User",
            "password_hash": hashed_password
        }
        
        auth_user = database.authenticate_user("test@example.com", "mypassword")
        self.assertIsNotNone(auth_user)
        self.assertEqual(auth_user["email"], "test@example.com")
        self.assertNotIn("password_hash", auth_user)

        # Failed auth
        self.assertIsNone(database.authenticate_user("test@example.com", "wrong_password"))

if __name__ == "__main__":
    unittest.main()

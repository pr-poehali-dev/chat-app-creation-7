ALTER TABLE t_p64880888_chat_app_creation_7.users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_username ON t_p64880888_chat_app_creation_7.users(username);
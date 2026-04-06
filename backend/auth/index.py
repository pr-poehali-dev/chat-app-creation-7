"""
Авторизация Nexus Messenger — username + password.
?action=register|login|me|logout
"""
import json
import os
import hashlib
import secrets
import psycopg2
from datetime import datetime, timedelta

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p64880888_chat_app_creation_7')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def json_resp(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False)
    }

def hash_password(password: str) -> str:
    salt = 'nexus_salt_2026'
    return hashlib.sha256((salt + password).encode()).hexdigest()

def create_session(cur, user_id: int) -> str:
    token = secrets.token_hex(32)
    expires_at = datetime.utcnow() + timedelta(days=30)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
        (user_id, token, expires_at)
    )
    return token

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    # ?action=register
    if action == 'register':
        username = (body.get('username') or '').strip().lower()
        password = (body.get('password') or '').strip()
        display_name = (body.get('display_name') or '').strip()

        if not username:
            return json_resp({'error': 'Введите имя пользователя'}, 400)
        if len(username) < 3:
            return json_resp({'error': 'Имя пользователя минимум 3 символа'}, 400)
        if not username.replace('_', '').replace('.', '').isalnum():
            return json_resp({'error': 'Только буквы, цифры, _ и .'}, 400)
        if not password:
            return json_resp({'error': 'Введите пароль'}, 400)
        if len(password) < 6:
            return json_resp({'error': 'Пароль минимум 6 символов'}, 400)

        name = display_name or username
        pw_hash = hash_password(password)

        conn = get_conn()
        cur = conn.cursor()

        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s", (username,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return json_resp({'error': 'Имя пользователя уже занято'}, 409)

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (login, login_type, username, display_name, password_hash) VALUES (%s, 'username', %s, %s, %s) RETURNING id",
            (username, username, name, pw_hash)
        )
        user_id = cur.fetchone()[0]
        token = create_session(cur, user_id)
        conn.commit()
        cur.close()
        conn.close()

        return json_resp({
            'success': True,
            'token': token,
            'user': {'id': user_id, 'username': username, 'display_name': name}
        })

    # ?action=login
    if action == 'login':
        username = (body.get('username') or '').strip().lower()
        password = (body.get('password') or '').strip()

        if not username or not password:
            return json_resp({'error': 'Введите имя пользователя и пароль'}, 400)

        pw_hash = hash_password(password)
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(
            f"SELECT id, display_name FROM {SCHEMA}.users WHERE username=%s AND password_hash=%s",
            (username, pw_hash)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return json_resp({'error': 'Неверное имя пользователя или пароль'}, 401)

        user_id, display_name = row
        token = create_session(cur, user_id)
        conn.commit()
        cur.close()
        conn.close()

        return json_resp({
            'success': True,
            'token': token,
            'user': {'id': user_id, 'username': username, 'display_name': display_name or username}
        })

    # ?action=me
    if action == 'me':
        token = (body.get('token') or '').strip()
        if not token:
            return json_resp({'error': 'Нет токена'}, 401)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT u.id, u.username, u.display_name FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token=%s AND s.expires_at>NOW()",
            (token,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return json_resp({'error': 'Сессия недействительна'}, 401)

        return json_resp({'user': {'id': row[0], 'username': row[1], 'display_name': row[2] or row[1]}})

    # ?action=logout
    if action == 'logout':
        token = (body.get('token') or '').strip()
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
            conn.commit()
            cur.close()
            conn.close()
        return json_resp({'success': True})

    return json_resp({'error': 'Unknown action'}, 404)

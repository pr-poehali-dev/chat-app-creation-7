"""
Авторизация пользователей Nexus Messenger.
Поддерживает вход по email или номеру телефона с OTP-кодом.
Действие передаётся через query param: ?action=send-otp|verify-otp|me|logout
"""
import json
import os
import random
import string
import secrets
import psycopg2
from datetime import datetime, timedelta

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p64880888_chat_app_creation_7')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def json_resp(data, status=200):
    return {'statusCode': status, 'headers': {**CORS_HEADERS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    # ?action=send-otp — сгенерировать и сохранить OTP
    if action == 'send-otp':
        login = (body.get('login') or '').strip().lower()
        login_type = body.get('login_type', 'email')

        if not login:
            return json_resp({'error': 'Укажите email или номер телефона'}, 400)

        code = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.otp_codes SET used=TRUE WHERE login=%s AND used=FALSE",
            (login,)
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.otp_codes (login, code, expires_at) VALUES (%s, %s, %s)",
            (login, code, expires_at)
        )
        conn.commit()
        cur.close()
        conn.close()

        # В демо-режиме возвращаем код напрямую
        return json_resp({'success': True, 'demo_code': code, 'login_type': login_type})

    # ?action=verify-otp — проверить код и создать сессию
    if action == 'verify-otp':
        login = (body.get('login') or '').strip().lower()
        code = (body.get('code') or '').strip()
        login_type = body.get('login_type', 'email')
        display_name = (body.get('display_name') or '').strip()

        if not login or not code:
            return json_resp({'error': 'Укажите логин и код'}, 400)

        conn = get_conn()
        cur = conn.cursor()

        cur.execute(
            f"SELECT id FROM {SCHEMA}.otp_codes WHERE login=%s AND code=%s AND used=FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
            (login, code)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return json_resp({'error': 'Неверный или истёкший код'}, 401)

        otp_id = row[0]
        cur.execute(f"UPDATE {SCHEMA}.otp_codes SET used=TRUE WHERE id=%s", (otp_id,))

        cur.execute(f"SELECT id, display_name FROM {SCHEMA}.users WHERE login=%s", (login,))
        user_row = cur.fetchone()

        if user_row:
            user_id = user_row[0]
            name = user_row[1] or display_name or login
        else:
            name = display_name or login
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (login, login_type, display_name) VALUES (%s, %s, %s) RETURNING id",
                (login, login_type, name)
            )
            user_id = cur.fetchone()[0]

        token = secrets.token_hex(32)
        expires_at = datetime.utcnow() + timedelta(days=30)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user_id, token, expires_at)
        )
        conn.commit()
        cur.close()
        conn.close()

        return json_resp({'success': True, 'token': token, 'user': {'id': user_id, 'login': login, 'display_name': name, 'login_type': login_type}})

    # ?action=me — получить пользователя по токену
    if action == 'me':
        token = (body.get('token') or '').strip()
        if not token:
            return json_resp({'error': 'Нет токена'}, 401)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT u.id, u.login, u.display_name, u.login_type FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token=%s AND s.expires_at>NOW()",
            (token,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return json_resp({'error': 'Сессия недействительна'}, 401)

        return json_resp({'user': {'id': row[0], 'login': row[1], 'display_name': row[2], 'login_type': row[3]}})

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

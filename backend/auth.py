import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
ALLOWED_EMAILS = [
    e.strip().lower()
    for e in os.environ.get("ALLOWED_EMAILS", "").split(",")
    if e.strip()
]

security = HTTPBearer()


async def verify_google_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Verify a Google ID token and check the email allow-list.

    Returns the decoded token payload on success.
    Raises 401 for invalid/expired tokens, 403 for unauthorized emails.
    """
    token = credentials.credentials
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = idinfo.get("email", "").lower()
    if not ALLOWED_EMAILS or email not in ALLOWED_EMAILS:
        raise HTTPException(status_code=403, detail="Access denied")

    return idinfo

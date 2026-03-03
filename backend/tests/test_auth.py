import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import sys
sys.path.insert(0, '..')


class TestVerifyGoogleToken:
    """Test the verify_google_token auth dependency."""

    @pytest.mark.asyncio
    @patch('auth.ALLOWED_EMAILS', ['test@example.com'])
    @patch('auth.id_token.verify_oauth2_token')
    async def test_valid_token_and_allowed_email(self, mock_verify):
        """Test that a valid token with an allowed email succeeds."""
        from auth import verify_google_token

        mock_verify.return_value = {
            'email': 'test@example.com',
            'name': 'Test User',
            'picture': 'https://example.com/photo.jpg',
        }
        credentials = HTTPAuthorizationCredentials(
            scheme='Bearer', credentials='valid-token'
        )

        result = await verify_google_token(credentials)

        assert result['email'] == 'test@example.com'
        assert result['name'] == 'Test User'

    @pytest.mark.asyncio
    @patch('auth.ALLOWED_EMAILS', ['test@example.com'])
    @patch('auth.id_token.verify_oauth2_token')
    async def test_invalid_token_raises_401(self, mock_verify):
        """Test that an invalid token raises 401."""
        from auth import verify_google_token

        mock_verify.side_effect = ValueError("Invalid token")
        credentials = HTTPAuthorizationCredentials(
            scheme='Bearer', credentials='bad-token'
        )

        with pytest.raises(HTTPException) as exc_info:
            await verify_google_token(credentials)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid or expired token"

    @pytest.mark.asyncio
    @patch('auth.ALLOWED_EMAILS', ['allowed@example.com'])
    @patch('auth.id_token.verify_oauth2_token')
    async def test_unauthorized_email_raises_403(self, mock_verify):
        """Test that a valid token with disallowed email raises 403."""
        from auth import verify_google_token

        mock_verify.return_value = {
            'email': 'notallowed@example.com',
            'name': 'Unauthorized User',
        }
        credentials = HTTPAuthorizationCredentials(
            scheme='Bearer', credentials='valid-token'
        )

        with pytest.raises(HTTPException) as exc_info:
            await verify_google_token(credentials)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Access denied"

    @pytest.mark.asyncio
    @patch('auth.ALLOWED_EMAILS', [])
    @patch('auth.id_token.verify_oauth2_token')
    async def test_empty_allowlist_denies_all(self, mock_verify):
        """Test that an empty allow-list denies all users."""
        from auth import verify_google_token

        mock_verify.return_value = {
            'email': 'anyone@example.com',
            'name': 'Anyone',
        }
        credentials = HTTPAuthorizationCredentials(
            scheme='Bearer', credentials='valid-token'
        )

        with pytest.raises(HTTPException) as exc_info:
            await verify_google_token(credentials)

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    @patch('auth.ALLOWED_EMAILS', ['test@example.com'])
    @patch('auth.id_token.verify_oauth2_token')
    async def test_token_email_is_lowered_for_comparison(self, mock_verify):
        """Test that the email from the token is lowercased for matching."""
        from auth import verify_google_token

        mock_verify.return_value = {
            'email': 'Test@Example.COM',
            'name': 'Test User',
        }
        credentials = HTTPAuthorizationCredentials(
            scheme='Bearer', credentials='valid-token'
        )

        result = await verify_google_token(credentials)
        assert result['email'] == 'Test@Example.COM'

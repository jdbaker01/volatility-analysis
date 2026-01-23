import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
import requests

DB_PATH = Path(__file__).parent / "price_cache.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS daily_prices (
            ticker TEXT NOT NULL,
            date TEXT NOT NULL,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            adj_close REAL,
            volume INTEGER,
            PRIMARY KEY (ticker, date)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache_metadata (
            ticker TEXT PRIMARY KEY,
            last_updated TEXT
        )
    """)
    conn.commit()
    conn.close()


def get_cached_data(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    conn = get_connection()
    query = """
        SELECT date, open, high, low, close, adj_close, volume
        FROM daily_prices
        WHERE ticker = ? AND date >= ? AND date <= ?
        ORDER BY date
    """
    df = pd.read_sql_query(query, conn, params=(ticker.upper(), start_date, end_date))
    conn.close()
    if not df.empty:
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
    return df


def save_to_cache(ticker: str, df: pd.DataFrame):
    if df.empty:
        return
    conn = get_connection()
    ticker = ticker.upper()

    for idx, row in df.iterrows():
        date_str = idx.strftime('%Y-%m-%d') if hasattr(idx, 'strftime') else str(idx)[:10]
        conn.execute("""
            INSERT OR REPLACE INTO daily_prices
            (ticker, date, open, high, low, close, adj_close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ticker,
            date_str,
            row['open'],
            row['high'],
            row['low'],
            row['close'],
            row['adj_close'],
            int(row['volume']) if pd.notna(row['volume']) else 0
        ))

    conn.execute("""
        INSERT OR REPLACE INTO cache_metadata (ticker, last_updated)
        VALUES (?, ?)
    """, (ticker, datetime.now().strftime('%Y-%m-%d')))

    conn.commit()
    conn.close()


def needs_update(ticker: str) -> bool:
    conn = get_connection()
    cursor = conn.execute(
        "SELECT last_updated FROM cache_metadata WHERE ticker = ?",
        (ticker.upper(),)
    )
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return True

    last_updated = datetime.strptime(row['last_updated'], '%Y-%m-%d').date()
    today = datetime.now().date()

    return last_updated < today


def fetch_from_yahoo(ticker: str, start_date: datetime, end_date: datetime) -> pd.DataFrame:
    """Fetch data directly from Yahoo Finance API."""
    ticker = ticker.upper()

    period1 = int(start_date.timestamp())
    period2 = int(end_date.timestamp())

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    params = {
        "period1": period1,
        "period2": period2,
        "interval": "1d",
        "events": "history",
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()

    data = response.json()

    if "chart" not in data or "result" not in data["chart"] or not data["chart"]["result"]:
        raise ValueError(f"No data found for ticker: {ticker}")

    result = data["chart"]["result"][0]

    if "timestamp" not in result or not result["timestamp"]:
        raise ValueError(f"No price data found for ticker: {ticker}")

    timestamps = result["timestamp"]
    quotes = result["indicators"]["quote"][0]
    adj_close = result["indicators"].get("adjclose", [{}])[0].get("adjclose", quotes["close"])

    df = pd.DataFrame({
        "date": pd.to_datetime(timestamps, unit="s"),
        "open": quotes["open"],
        "high": quotes["high"],
        "low": quotes["low"],
        "close": quotes["close"],
        "adj_close": adj_close if adj_close else quotes["close"],
        "volume": quotes["volume"],
    })

    df.set_index("date", inplace=True)
    df.index = df.index.tz_localize(None)

    return df


def fetch_and_cache(ticker: str, years: int = 5) -> pd.DataFrame:
    ticker = ticker.upper()
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)

    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')

    if not needs_update(ticker):
        cached = get_cached_data(ticker, start_str, end_str)
        if not cached.empty:
            return cached

    df = fetch_from_yahoo(ticker, start_date, end_date)

    if df.empty:
        raise ValueError(f"No data found for ticker: {ticker}")

    save_to_cache(ticker, df)

    return df


init_db()

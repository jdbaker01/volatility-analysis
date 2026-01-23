from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from volatility import calculate_volatility

app = FastAPI(title="Volatility Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/volatility/{ticker}")
async def get_volatility(ticker: str, lookback_years: int = 5):
    try:
        result = calculate_volatility(ticker, lookback_years)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating volatility: {str(e)}")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

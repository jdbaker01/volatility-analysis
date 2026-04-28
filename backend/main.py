import os
from dotenv import load_dotenv
load_dotenv()

from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from volatility import calculate_volatility
from auth import verify_google_token
from database import init_schema, close_pool
from portfolio import (
    create_portfolio, get_portfolios, get_portfolio,
    update_portfolio, delete_portfolio, set_holdings,
    get_all_leaf_holdings,
)
from portfolio_analytics import calculate_portfolio_analytics

app = FastAPI(title="Volatility Analysis API")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

prod_origin = os.environ.get("FRONTEND_URL")
if prod_origin:
    allowed_origins.append(prod_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models for request validation ---

class CreatePortfolioRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    portfolio_type: str = Field(..., pattern=r"^(group|leaf)$")
    parent_id: Optional[str] = None


class UpdatePortfolioRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    portfolio_type: Optional[str] = Field(None, pattern=r"^(group|leaf)$")


class HoldingItem(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    shares: float = Field(..., gt=0)


class SetHoldingsRequest(BaseModel):
    holdings: List[HoldingItem]


# --- Lifecycle events ---

@app.on_event("startup")
async def startup():
    if os.environ.get("DATABASE_URL"):
        await init_schema()


@app.on_event("shutdown")
async def shutdown():
    await close_pool()


# --- Existing endpoints ---

@app.get("/api/volatility/{ticker}")
async def get_volatility(
    ticker: str,
    lookback_years: int = 5,
    user: dict = Depends(verify_google_token),
):
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


# --- Portfolio endpoints ---

@app.get("/api/portfolios")
async def list_portfolios(user: dict = Depends(verify_google_token)):
    email = user.get("email", "").lower()
    portfolios = await get_portfolios(email)
    return {"portfolios": portfolios}


@app.post("/api/portfolios", status_code=201)
async def create_portfolio_endpoint(
    body: CreatePortfolioRequest,
    user: dict = Depends(verify_google_token),
):
    email = user.get("email", "").lower()
    try:
        result = await create_portfolio(
            email, body.name, body.portfolio_type, body.parent_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/portfolios/{portfolio_id}")
async def get_portfolio_endpoint(
    portfolio_id: str,
    user: dict = Depends(verify_google_token),
):
    email = user.get("email", "").lower()
    result = await get_portfolio(email, portfolio_id)
    if not result:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return result


@app.put("/api/portfolios/{portfolio_id}")
async def update_portfolio_endpoint(
    portfolio_id: str,
    body: UpdatePortfolioRequest,
    user: dict = Depends(verify_google_token),
):
    email = user.get("email", "").lower()
    try:
        result = await update_portfolio(
            email, portfolio_id, name=body.name, portfolio_type=body.portfolio_type
        )
        if not result:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/portfolios/{portfolio_id}")
async def delete_portfolio_endpoint(
    portfolio_id: str,
    user: dict = Depends(verify_google_token),
):
    email = user.get("email", "").lower()
    success = await delete_portfolio(email, portfolio_id)
    if not success:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {"status": "deleted"}


@app.put("/api/portfolios/{portfolio_id}/holdings")
async def set_holdings_endpoint(
    portfolio_id: str,
    body: SetHoldingsRequest,
    user: dict = Depends(verify_google_token),
):
    email = user.get("email", "").lower()
    try:
        result = await set_holdings(
            email, portfolio_id,
            [h.model_dump() for h in body.holdings],
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/portfolios/{portfolio_id}/analytics")
async def get_portfolio_analytics(
    portfolio_id: str,
    user: dict = Depends(verify_google_token),
):
    email = user.get("email", "").lower()
    portfolio = await get_portfolio(email, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    holdings = await get_all_leaf_holdings(email, portfolio_id)
    if not holdings:
        return {
            "portfolio_id": portfolio_id,
            "portfolio_name": portfolio["name"],
            "current_value": 0,
            "daily_pnl": None,
            "weekly_pnl": None,
            "monthly_pnl": None,
            "holdings_detail": [],
            "var": {
                "historical": {"var_95": None, "var_95_pct": None, "method": "historical"},
                "parametric": {"var_95": None, "var_95_pct": None, "method": "parametric"},
            },
        }

    try:
        analytics = calculate_portfolio_analytics(holdings)
        return {
            "portfolio_id": portfolio_id,
            "portfolio_name": portfolio["name"],
            **analytics,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating analytics: {str(e)}")

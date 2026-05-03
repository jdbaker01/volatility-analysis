"""Generate synthetic brokerage statement PDFs for testing PDF-import extraction.

These PDFs are entirely fabricated. Names, account numbers, balances, and
holdings are placeholder values invented for testing only — no real statements
are downloaded, opened, or referenced. Tickers are real so the eventual
extraction tests can reason about real symbols.

Usage:
    pip install reportlab
    python generate_sample_statements.py

Outputs:
    sample_wells_fargo_brokerage.pdf
    sample_fidelity_netbenefits_401k.pdf
"""

from __future__ import annotations

import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT_DIR = Path(__file__).parent

# --- Shared styles ----------------------------------------------------------

STYLES = getSampleStyleSheet()
BODY = ParagraphStyle("body", parent=STYLES["BodyText"], fontSize=9, leading=11)
SMALL = ParagraphStyle("small", parent=STYLES["BodyText"], fontSize=7, leading=9, textColor=colors.grey)
H1 = ParagraphStyle("h1", parent=STYLES["Heading1"], fontSize=16, leading=20, spaceAfter=6)
H2 = ParagraphStyle("h2", parent=STYLES["Heading2"], fontSize=12, leading=14, spaceBefore=10, spaceAfter=4)
H3 = ParagraphStyle("h3", parent=STYLES["Heading3"], fontSize=10, leading=12, spaceBefore=6, spaceAfter=2)


def money(x: float) -> str:
    return f"${x:,.2f}"


def shares(x: float) -> str:
    return f"{x:,.4f}".rstrip("0").rstrip(".") or "0"


# --- Wells Fargo Advisors brokerage statement -------------------------------

def build_wells_fargo() -> list:
    flow: list = []
    burgundy = colors.HexColor("#9B1B30")

    # Header
    flow.append(Paragraph('<font color="#9B1B30"><b>Wells Fargo Advisors</b></font>', H1))
    flow.append(Paragraph("One North Jefferson Avenue<br/>St. Louis, MO 63103", SMALL))
    flow.append(Spacer(1, 8))

    # Account info block
    info = [
        ["Statement Period:", "March 1, 2026 – March 31, 2026"],
        ["Account Holder:", "Jane Q. Sample"],
        ["Account Number:", "XXXX-XX-4821"],
        ["Account Type:", "Individual Brokerage"],
        ["Financial Advisor:", "Sample Advisor (555) 555-0100"],
    ]
    t = Table(info, colWidths=[1.6 * inch, 4.0 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), burgundy),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 12))

    # Account Value Summary
    flow.append(Paragraph("Account Value Summary", H2))
    summary = [
        ["", "This Period", "Year to Date"],
        ["Beginning Value", money(248_310.55), money(231_902.18)],
        ["Net Contributions / (Withdrawals)", money(2_000.00), money(6_000.00)],
        ["Income Earned", money(412.30), money(1_184.92)],
        ["Change in Investment Value", money(7_188.40), money(18_824.15)],
        ["Ending Value", money(257_911.25), money(257_911.25)],
    ]
    t = Table(summary, colWidths=[2.6 * inch, 1.5 * inch, 1.5 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), burgundy),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.black),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 12))

    # Asset Allocation
    flow.append(Paragraph("Asset Allocation", H2))
    alloc = [
        ["Asset Class", "Value", "% of Account"],
        ["Equities (Stocks & ETFs)", money(198_421.40), "76.9%"],
        ["Fixed Income (Bonds & Bond ETFs)", money(48_215.10), "18.7%"],
        ["Cash & Money Market Funds", money(11_274.75), "4.4%"],
        ["Total", money(257_911.25), "100.0%"],
    ]
    t = Table(alloc, colWidths=[3.4 * inch, 1.3 * inch, 1.0 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    flow.append(t)
    flow.append(PageBreak())

    # Investment Detail
    flow.append(Paragraph("Investment Detail", H1))
    flow.append(Paragraph(
        "Holdings are shown by asset class. Quantities reflect positions held as of "
        "the statement closing date. Prices and market values are end-of-period.",
        BODY,
    ))
    flow.append(Spacer(1, 8))

    def detail_table(rows):
        header = ["Symbol", "Description", "Quantity", "Price", "Market Value", "Cost Basis", "Unrealized G/L"]
        data = [header] + rows
        t = Table(data, colWidths=[
            0.7 * inch, 2.2 * inch, 0.8 * inch, 0.8 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch,
        ])
        t.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BACKGROUND", (0, 0), (-1, 0), burgundy),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F2F3")]),
        ]))
        return t

    # Stocks
    flow.append(Paragraph("Stocks", H3))
    stocks = [
        ["AAPL", "Apple Inc.",                shares(120),  money(192.45), money(23_094.00), money(14_500.00), money(8_594.00)],
        ["MSFT", "Microsoft Corporation",      shares(60),   money(412.10), money(24_726.00), money(18_800.00), money(5_926.00)],
        ["GOOGL", "Alphabet Inc. Class A",     shares(45),   money(168.20), money(7_569.00),  money(6_100.00),  money(1_469.00)],
        ["BRK.B", "Berkshire Hathaway Cl. B",  shares(50),   money(411.35), money(20_567.50), money(16_200.00), money(4_367.50)],
        ["JPM",  "JPMorgan Chase & Co.",       shares(80),   money(202.10), money(16_168.00), money(13_400.00), money(2_768.00)],
    ]
    flow.append(detail_table(stocks))
    flow.append(Spacer(1, 10))

    # ETFs
    flow.append(Paragraph("Exchange Traded Funds", H3))
    etfs = [
        ["SPY",  "SPDR S&P 500 ETF Trust",       shares(120),  money(518.20), money(62_184.00), money(48_000.00), money(14_184.00)],
        ["VTI",  "Vanguard Total Stock Market",  shares(150),  money(258.40), money(38_760.00), money(31_200.00), money(7_560.00)],
        ["QQQ",  "Invesco QQQ Trust",            shares(15),   money(442.85), money(6_642.75),  money(5_100.00),  money(1_542.75)],
    ]
    flow.append(detail_table(etfs))
    flow.append(Spacer(1, 10))

    # Bonds / Fixed Income
    flow.append(Paragraph("Fixed Income — Bond ETFs", H3))
    bonds = [
        ["BND",  "Vanguard Total Bond Market ETF", shares(400),  money(72.85),  money(29_140.00), money(31_500.00), money(-2_360.00)],
        ["AGG",  "iShares Core US Aggregate Bond", shares(200),  money(95.40),  money(19_080.00), money(20_400.00), money(-1_320.00)],
    ]
    flow.append(detail_table(bonds))
    flow.append(Spacer(1, 10))

    # Cash & Money Market — the extractor must drop these
    flow.append(Paragraph("Cash & Money Market Funds", H3))
    cash = [
        ["WFCXX", "Wells Fargo Money Market Fund Cl. A", shares(11_274.75), money(1.00), money(11_274.75), money(11_274.75), money(0.00)],
    ]
    flow.append(detail_table(cash))
    flow.append(Spacer(1, 12))

    flow.append(Paragraph(
        "<i>This is a sample document for software testing purposes. All names, account "
        "numbers, balances, and holdings are fictitious. Wells Fargo Advisors is a trade "
        "name referenced for realism only.</i>",
        SMALL,
    ))
    return flow


# --- Fidelity NetBenefits 401(k) statement ----------------------------------

def build_fidelity_401k() -> list:
    flow: list = []
    fidelity_green = colors.HexColor("#368727")

    # Header
    flow.append(Paragraph('<font color="#368727"><b>Fidelity NetBenefits&reg;</b></font>', H1))
    flow.append(Paragraph("Quarterly Retirement Plan Statement", H3))
    flow.append(Paragraph("82 Devonshire Street &middot; Boston, MA 02109", SMALL))
    flow.append(Spacer(1, 10))

    info = [
        ["Statement Period:", "January 1, 2026 – March 31, 2026"],
        ["Plan Name:", "ACME Corporation 401(k) Plan"],
        ["Plan Number:", "12345"],
        ["Participant:", "John A. Sample"],
        ["Date of Birth:", "01/15/1985"],
        ["Vesting %:", "100%"],
    ]
    t = Table(info, colWidths=[1.5 * inch, 4.0 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), fidelity_green),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 14))

    # Account Summary
    flow.append(Paragraph("Your Account Summary", H2))
    summary = [
        ["", "This Period", "Year to Date"],
        ["Beginning Balance",                 money(184_220.05), money(184_220.05)],
        ["Employee Contributions",            money(3_750.00),   money(3_750.00)],
        ["Employer Matching Contributions",   money(1_875.00),   money(1_875.00)],
        ["Investment Earnings",               money(8_640.20),   money(8_640.20)],
        ["Withdrawals & Fees",                money(-25.00),     money(-25.00)],
        ["Ending Balance",                    money(198_460.25), money(198_460.25)],
    ]
    t = Table(summary, colWidths=[2.8 * inch, 1.5 * inch, 1.5 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), fidelity_green),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.black),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 14))

    # Investments
    flow.append(Paragraph("Your Investments", H2))
    flow.append(Paragraph(
        "Holdings reflect units / shares of each fund as of the statement closing date. "
        "Prices shown are the closing NAV. Self-directed brokerage holdings, if any, "
        "are reported on a separate page.",
        BODY,
    ))
    flow.append(Spacer(1, 6))

    header = ["Investment", "Ticker", "Shares / Units", "Share Price", "Current Value", "% of Account"]
    rows = [
        ["Fidelity 500 Index Fund",                "FXAIX",  shares(425.182), money(176.40), money(74_999.10), "37.8%"],
        ["Fidelity Total Market Index Fund",       "FSKAX",  shares(180.512), money(154.20), money(27_834.95), "14.0%"],
        ["Fidelity US Bond Index Fund",            "FXNAX",  shares(610.330), money(11.05),  money(6_744.15),  "3.4%"],
        ["Fidelity Contrafund",                    "FCNTX",  shares(75.422),  money(22.10),  money(1_666.83),  "0.8%"],
        ["Fidelity Blue Chip Growth Fund",         "FBGRX",  shares(120.005), money(218.50), money(26_221.10), "13.2%"],
        ["Vanguard Target Retirement 2050 Fund",   "VFIFX",  shares(412.000), money(54.40),  money(22_412.80), "11.3%"],
        ["State Street Global All Cap Equity ex-US Index Fund", "—", shares(800.50), money(13.85), money(11_086.93), "5.6%"],
        ["Stable Value Fund (Class III)",          "—",      shares(2_500.00),money(1.00),   money(2_500.00),  "1.3%"],
        ["Fidelity Government Money Market Fund",  "FZFXX",  shares(4_995.00),money(1.00),   money(4_995.00),  "2.5%"],
        ["Fidelity Self-Directed Brokerage — AAPL", "AAPL",  shares(50.000),  money(192.45), money(9_622.50),  "4.8%"],
        ["Fidelity Self-Directed Brokerage — VTI",  "VTI",   shares(40.000),  money(258.40), money(10_336.00), "5.2%"],
    ]
    data = [header] + rows
    t = Table(data, colWidths=[
        2.8 * inch, 0.7 * inch, 0.9 * inch, 0.8 * inch, 1.0 * inch, 0.8 * inch,
    ])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, 0), fidelity_green),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EFF7EC")]),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 12))

    # Contribution sources
    flow.append(Paragraph("Sources of Contributions", H2))
    sources = [
        ["Source", "Vested %", "Balance"],
        ["Pre-Tax",                "100%", money(112_300.50)],
        ["Roth",                   "100%", money(36_710.20)],
        ["Employer Match",         "100%", money(28_412.00)],
        ["Employer Profit Sharing", "100%", money(21_037.55)],
        ["Total",                  "—",    money(198_460.25)],
    ]
    t = Table(sources, colWidths=[3.0 * inch, 1.0 * inch, 1.6 * inch])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 14))

    flow.append(Paragraph(
        "<i>This is a sample document for software testing purposes. Names, plan and "
        "account details, balances, and holdings are fictitious. Fidelity NetBenefits is "
        "a registered trademark of FMR LLC, referenced here only for visual realism.</i>",
        SMALL,
    ))
    return flow


# --- Driver ----------------------------------------------------------------

def render(name: str, story_builder) -> Path:
    out = OUTPUT_DIR / name
    doc = SimpleDocTemplate(
        str(out),
        pagesize=LETTER,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title=name,
        author="volatility-analysis test fixtures",
    )
    doc.build(story_builder())
    return out


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    a = render("sample_wells_fargo_brokerage.pdf", build_wells_fargo)
    b = render("sample_fidelity_netbenefits_401k.pdf", build_fidelity_401k)
    print(f"Wrote {a.relative_to(OUTPUT_DIR.parent.parent)}")
    print(f"Wrote {b.relative_to(OUTPUT_DIR.parent.parent)}")


if __name__ == "__main__":
    main()

# 0024. Real News Ingestion: rationale

## Context

Spec 0017 built the News and Filings page and the `news_and_events` table, but `OfficialFilingsAndNewsService` never ingests anything: when the table is empty it returns `SEED_NEWS_EVENTS`, and for other symbols it fabricates an item. On a trading screen, invented "official filings" are actively harmful, because they look like real evidence. The project already has `GEMINI_API_KEY` and `ALPHA_VANTAGE_API_KEY`, the scanner's watched F&O universe (`instruments`), and the Angel One instrument file (which carries BSE scrip codes and names). NSE's website APIs reject plain scripted requests unless a browser session cookie is fetched first. BSE's public API needs a `Referer` header. Alpha Vantage's free tier allows 25 requests a day.

## Rationale

Free official sources (NSE, BSE) are the ground truth for filings. RSS and Alpha Vantage add the general headlines the exchanges don't publish. Adapters isolate each source's quirks (NSE cookies, BSE referer, AV quota), so one breaking doesn't take down the page. Rules first keeps most classification explainable and free, which matches the app's explainable evidence approach. Gemini handles only the leftovers, under a hard daily cap, and the default keeps the pipeline working with no AI at all. Filtering to the watched F&O universe keeps volume to what the scanner can act on. Options considered: a paid news API (better coverage, but a cost and a new vendor), scraping news sites (brittle and terms risky), and keeping seed data labelled "Sample" (rejected: invented filings on a trading page mislead).


## News sources decision (2026-11-10)

The first build reached NSE through its website JSON API, priming a session cookie from the home page and sending browser style headers, and BSE through its website API with a `Referer` header. In verification BSE answered with an access denied page and then an empty response, Alpha Vantage `NEWS_SENTIMENT` turned out to be premium only on this key (a GLOBAL_QUOTE control call worked), and an automated check of BSE was itself stopped as bot check circumvention. A read only web check found NSE's terms of use (via search snippets) prohibit systematic or automated data collection from its website, and could not confirm the exchanges' RSS feed URLs (NSE timed out, BSE answered 403).

Options weighed: keep the scraping (works for NSE today, but it bypasses bot protection and likely breaches the terms, and can break at any time); official public feeds only (permitted in spirit, but URLs and terms must be confirmed by a person); a paid licensed feed (reliable and permitted, a cost and a new vendor); market RSS only (simplest, but no official filings).

Decision: official public feeds only, plain honest requests, and both exchanges off until the engineer confirms the feed URLs and terms in a browser and sets them in config. A blocked or missing feed is shown as skipped, never worked around. Alpha Vantage stays in code, disabled, until a premium key is bought. Company names come from a committed file the engineer fills from a permitted source, because the live `instruments` table has no name column and the Angel One instrument file's names are just the trading symbols (useful for BSE scrip code mapping, not for matching company names in headlines). This trades coverage today for a pipeline that stays within what the sources allow.

A cross check of this update (another model) found 26 gaps and contradictions; all recommended fixes were applied on the engineer's instruction and recorded under **News sources detail** in `index.md`. The most consequential: deleting the scraped legacy rows so feed ids don't duplicate them, a precise definition of a blocked feed with a 6 hour back off, and an explicit header allowlist so the no imitation rule is testable.

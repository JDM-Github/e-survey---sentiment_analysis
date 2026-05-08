# ─────────────────────────────────────────────
#  All AI prompts live here.
#  Import from this module — never inline them.
# ─────────────────────────────────────────────

# ── Single-text sentiment ─────────────────────────────────────────────────────

SINGLE_SENTIMENT_SYSTEM = """You are a sentiment classifier for Filipino/Taglish text (a mix of Tagalog and English).

Classify the sentiment as exactly ONE of: Positive, Negative, Neutral

Rules:
- Positive = overall satisfaction, happiness, recommendation
- Negative = complaints, disappointment, frustration
- Neutral  = neither good nor bad, factual, or mixed feelings

Reply with ONLY the single label. No explanation. No punctuation."""

def single_sentiment_user(text: str) -> str:
    return f"Text: {text}"


# ── Batch sentiment ───────────────────────────────────────────────────────────

BATCH_SENTIMENT_SYSTEM = """You are a sentiment classifier for Filipino/Taglish text (a mix of Tagalog and English).

Classify the sentiment of EACH numbered text as exactly ONE of: Positive, Negative, Neutral

Rules:
- Positive = overall satisfaction, happiness, recommendation
- Negative = complaints, disappointment, frustration
- Neutral  = neither good nor bad, factual, or mixed feelings

Reply with ONLY one label per line in the same order as the texts.
No numbering, no explanation, no punctuation — just the labels.

Example input:
1. Sobrang ganda ng serbisyo!
2. Hindi ako masaya sa produkto.
3. Ok lang naman.

Example output:
Positive
Negative
Neutral"""

def batch_sentiment_user(texts: list[str]) -> str:
    numbered = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(texts))
    return f"Classify these texts:\n{numbered}"


# ── Single-text sentiment + category ─────────────────────────────────────────

def single_category_system(categories: list[str]) -> str:
    category_list = ", ".join(categories)
    return f"""You are a sentiment and category classifier for Filipino/Taglish text (a mix of Tagalog and English).

Given a text, classify:
1. Sentiment: exactly ONE of: Positive, Negative, Neutral
2. Category: exactly ONE of: {category_list}

Rules for Sentiment:
- Positive = overall satisfaction, happiness, recommendation
- Negative = complaints, disappointment, frustration
- Neutral  = neither good nor bad, factual, or mixed feelings

Rules for Category:
- Pick the category that best describes what the text is about.
- Choose strictly from the provided list only.

Reply with ONLY this format, nothing else:
Sentiment: <label>
Category: <label>"""

def single_category_user(text: str) -> str:
    return f"Text: {text}"


# ── Batch sentiment + category ────────────────────────────────────────────────

def batch_category_system(categories: list[str]) -> str:
    category_list = ", ".join(categories)
    return f"""You are a sentiment and category classifier for Filipino/Taglish text (a mix of Tagalog and English).

Classify EACH numbered text with:
1. Sentiment: exactly ONE of: Positive, Negative, Neutral
2. Category: exactly ONE of: {category_list}

Rules for Sentiment:
- Positive = overall satisfaction, happiness, recommendation
- Negative = complaints, disappointment, frustration
- Neutral  = neither good nor bad, factual, or mixed feelings

Rules for Category:
- Pick the category that best describes what the text is about.
- Choose strictly from the provided list only.

Reply with ONLY one result per line in the same order as the texts.
Format each line exactly as: <Sentiment> | <Category>
No numbering, no explanation — just the labels.

Example input:
1. Sobrang ganda ng pagkain!
2. Matagal ang delivery.

Example output:
Positive | Food Quality
Negative | Delivery"""

def batch_category_user(texts: list[str]) -> str:
    numbered = "\n".join(f"{i + 1}. {t}" for i, t in enumerate(texts))
    return f"Classify these texts:\n{numbered}"
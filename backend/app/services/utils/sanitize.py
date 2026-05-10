"""Input sanitization utility using bleach.

All user-provided text should be run through sanitize_input() before:
1. Storing in the database
2. Injecting into AI prompts
"""
import bleach

# Default max lengths per field type
MAX_LENGTHS = {
    "title": 100,
    "description": 5000,
    "short_text": 200,
    "long_text": 10000,
    "email": 120,
    "password": 128,
    "url": 500,
    "message": 2000,
    "query": 500,
}


def sanitize_input(text, max_length=5000):
    """Sanitize a single text input.

    - Strips all HTML tags and attributes
    - Trims whitespace
    - Enforces max length
    - Returns empty string for None/non-string inputs
    """
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)

    # Strip ALL HTML tags (no allowed tags)
    cleaned = bleach.clean(text, tags=[], attributes={}, strip=True)

    # Trim whitespace
    cleaned = cleaned.strip()

    # Enforce max length
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]

    return cleaned


def sanitize_dict(data, schema=None):
    """Sanitize all string values in a dictionary.

    Args:
        data: dict with string values to sanitize
        schema: optional dict mapping field names to max_length
                 e.g. {"title": 100, "description": 5000}

    Returns:
        new dict with sanitized values (original is not mutated)
    """
    if not isinstance(data, dict):
        return data

    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            max_len = (schema or {}).get(key, MAX_LENGTHS.get(key, 5000))
            sanitized[key] = sanitize_input(value, max_length=max_len)
        else:
            sanitized[key] = value

    return sanitized


def sanitize_idea_data(data):
    """Sanitize idea creation/update data with field-specific limits."""
    schema = {
        "title": MAX_LENGTHS["title"],
        "description": MAX_LENGTHS["description"],
        "problem": MAX_LENGTHS["description"],
        "solution": MAX_LENGTHS["description"],
        "audience": MAX_LENGTHS["short_text"],
        "market": MAX_LENGTHS["short_text"],
        "industry": MAX_LENGTHS["short_text"],
        "target_market": MAX_LENGTHS["short_text"],
        "target_audience": MAX_LENGTHS["short_text"],
        "stage": 20,
    }
    return sanitize_dict(data, schema)

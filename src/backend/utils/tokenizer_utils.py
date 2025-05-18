# src/backend/utils/tokenizer_utils.py
import tiktoken
import logging

logger = logging.getLogger(__name__)

ENCODING = None
try:
    ENCODING = tiktoken.get_encoding("cl100k_base")
    logger.info("tiktoken: Using 'cl100k_base' encoding.")
except Exception:
    try:
        ENCODING = tiktoken.get_encoding("p50k_base")
        logger.info("tiktoken: Using 'p50k_base' encoding as fallback.")
    except Exception as e:
        logger.error(f"tiktoken: Critical - Failed to load any standard tiktoken encodings. Token counting will be highly approximate. Error: {e}")

def count_tokens(text: str) -> int:
    if not text:
        return 0
    if ENCODING:
        try:
            return len(ENCODING.encode(text))
        except Exception as e:
            logger.error(f"tiktoken: Error encoding text for token count: {e}. Falling back to char count for this text.")
            return len(text) // 4 
    logger.warning("tiktoken: ENCODING not available, falling back to character count for token estimation.")
    return len(text) // 4

def truncate_text_by_tokens(text: str, max_tokens: int) -> str:
    if not text or max_tokens <= 0:
        return ""
    if ENCODING:
        try:
            tokens = ENCODING.encode(text)
            if len(tokens) > max_tokens:
                truncated_tokens = tokens[:max_tokens]
                try:
                    return ENCODING.decode(truncated_tokens) + "..."
                except Exception: # Handle potential issues decoding partial tokens
                    try:
                        return ENCODING.decode(truncated_tokens[:-1]) + "..." # Try one less token
                    except Exception as e_dec:
                        logger.warning(f"tiktoken: Decoding truncated tokens failed severely: {e_dec}. Using aggressive char-based fallback.")
                        # Fallback to a very rough character-based truncation if decode fails
                        # Average token length can vary, 3 is a conservative guess for chars/token
                        char_limit_approx = max_tokens * 3 
                        return text[:char_limit_approx] + "..." if len(text) > char_limit_approx else text
            return text
        except Exception as e:
            logger.error(f"tiktoken: Error truncating text by tokens: {e}. Falling back to char count for this text.")
            # Fallback to character based if encoding fails
            char_limit = max_tokens * 4 
            return text[:char_limit] + "..." if len(text) > char_limit else text
            
    logger.warning("tiktoken: ENCODING not available, falling back to character count for truncation.")
    char_limit = max_tokens * 4 
    return text[:char_limit] + "..." if len(text) > char_limit else text 
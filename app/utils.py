import string
from fastapi import HTTPException
BASE62 = string.ascii_lowercase + string.ascii_uppercase + string.digits

def encode_base62(num: int) -> str:
    if num == 0:
        return BASE62[0]
    
    result = []
    base = len(BASE62)
    while num > 0:
        remainder = num % base
        result.append(BASE62[remainder])
        num //= base
        
    return ''.join(reversed(result))

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import engine, get_db
from app import models, schemas
from app.utils import encode_base62


models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {
        "message": "URL Shrotener is running"
    }
    
@app.post("/shorten", response_model=schemas.URLResponse)
def create_short_url(
    url_data: schemas.URLCreate,
    db: Session = Depends(get_db)
):
    # Step 1: Create DB entry without short_code
    new_url = models.URL(original_url=str(url_data.url))
    db.add(new_url)
    db.commit()
    db.refresh(new_url)
    
    # Step 2: Generate Base62 short_code
    short_code = encode_base62(new_url.id)
    
    # Step 3: Update Record
    new_url.short_code = short_code
    db.commit()
    db.refresh(new_url)
    print(new_url)
    return new_url

    
    
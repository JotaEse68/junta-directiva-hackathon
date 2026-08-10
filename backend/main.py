from fastapi import FastAPI

app = FastAPI(title="Junta Directiva AI - Hackathon Backend")

@app.get("/health")
def health():
    return {"status": "ok"}

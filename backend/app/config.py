from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "FiinQuant Financial Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "fiinquant-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24h

    # FiinQuant credentials
    FIINQUANT_USERNAME: str = "anh.phamthitu@fiingroup.vn"
    FIINQUANT_PASSWORD: str = "Anhkiet15"

    # Database — MySQL for web platform
    DATABASE_URL: str = "mysql+aiomysql://root:12345@localhost:3306/fiinquant"
    DATABASE_URL_SYNC: str = "mysql+pymysql://root:12345@localhost:3306/fiinquant"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 300  # 5 minutes

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Market data settings
    MARKET_POLL_INTERVAL: int = 30  # seconds
    VN_MARKET_TICKERS: List[str] = [
        "VN30", "VNINDEX", "HNX30", "UPCOM",
        "VHM", "VIC", "VNM", "VCB", "BID", "CTG",
        "HPG", "SSI", "VND", "HDB", "MBB",
        "TCB", "ACB", "STB", "EIB", "VPB",
        "FPT", "MWG", "MSN", "SAB", "GVR"
    ]

    # ML settings
    MODEL_PATH: str = "ml/registry/versions/v1.0/model.pkl"
    SHAP_EXPLAINER_PATH: str = "ml/registry/versions/v1.0/shap_explainer.pkl"
    FEATURE_CONFIG_PATH: str = "ml/config/features.yaml"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

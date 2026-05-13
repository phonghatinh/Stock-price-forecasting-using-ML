# FiinQuant AI Financial Platform

> Nền tảng phân tích chứng khoán Việt Nam kết hợp AI + XAI (Explainable AI), powered by FiinQuantX API.

---

## 🏗️ Kiến trúc dự án

```
fiinquant-web/
├── backend/     FastAPI — REST API + WebSocket
├── frontend/    Next.js 14 — UI với dark finance theme
├── ml/          ML Pipeline — XGBoost + SHAP
└── infra/       Docker Compose + Nginx
```

## 🚀 Khởi động nhanh

### Yêu cầu
- Python 3.11+
- Node.js 20+
- PostgreSQL 16
- Redis 7

### 1. Backend (FastAPI)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API Docs: http://localhost:8000/api/docs

### 2. Frontend (Next.js)
```powershell
cd frontend
npm install
npm run dev
```

Web: http://localhost:3000

### 3. Docker (tất cả cùng lúc)
```powershell
cd infra
docker-compose up -d
```

---

## 📊 Modules

| Module | URL | Mô tả |
|--------|-----|--------|
| Dashboard | `/` | Tổng quan thị trường real-time |
| XAI Analysis | `/analysis/[ticker]` | SHAP, tín hiệu, biểu đồ nến |
| Portfolio | `/portfolio` | CRUD + Markowitz optimization |
| AI Reflection | `/reflection` | Lịch sử dự báo, phân tích sai số |

## 🔑 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/v1/market/overview` | Tổng quan thị trường |
| GET | `/api/v1/market/candles/{ticker}` | Dữ liệu nến OHLCV |
| GET | `/api/v1/analysis/{ticker}` | Phân tích XAI đầy đủ |
| GET | `/api/v1/prediction/recommendations` | AI khuyến nghị batch |
| GET | `/api/v1/portfolio/` | Danh sách portfolio |
| POST | `/api/v1/portfolio/optimize` | Markowitz tối ưu hóa |
| GET | `/api/v1/reflection/summary` | AI self-reflection |
| WS | `/ws/market` | Real-time market feed |

## 🧠 ML Pipeline

```powershell
cd ml
python pipelines/train.py
```

Trains XGBoost model với:
- 23 features (kỹ thuật + cơ bản + vĩ mô)
- TimeSeriesSplit cross-validation
- SHAP explainer tự động


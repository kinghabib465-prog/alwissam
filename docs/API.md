# API Overview — عيادة الوسام

Base URL: `/api`

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Staff or patient login (`portal: staff\|patient`) |
| POST | `/api/auth/logout` | Destroy session |
| POST | `/api/auth/password-reset` | Request reset token |
| PUT | `/api/auth/password-reset` | Complete reset |
| POST | `/api/auth/activate` | Activate long-term patient account |

## Public

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/public/appointments` | Create appointment request |

## Secretary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/secretary/appointments/:id` | assign / confirm / reject / emergency / request_approval |
| POST | `/api/secretary/patients` | Create patient |
| POST | `/api/secretary/payments` | Record payment |
| POST | `/api/secretary/waiting-room/:id` | Update waiting room status |

## Medical

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/medical/dental-chart` | Update tooth state |

## Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/secretaries` | Create secretary account |

## Realtime

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/realtime/stream` | SSE clinic stats stream |

All mutating staff endpoints require header `x-csrf-token` matching the session CSRF token.

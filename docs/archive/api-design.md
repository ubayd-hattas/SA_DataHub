# SA Data Hub — API Design

Future REST API for programmatic access to SA Data Hub statistics. The API shares the same data-access layer (`src/lib/db/`) as server components — no duplicate query logic.

---

## Design Principles

1. **Version from day one** — all routes under `/api/v1/`
2. **Read-only initially** — government data platform, not a write API
3. **Same types as the website** — API responses mirror `Statistic`, `DataSeries`, registry metadata
4. **Cache-friendly** — `Cache-Control` on slow-changing data
5. **Rate-limited** — protect Neon connection pool and Vercel function budget

---

## Base URL

```
Production:  https://sadatahub.tech/api/v1
Development: http://localhost:3000/api/v1
```

---

## Authentication (Future)

| Phase | Auth |
|-------|------|
| v1 launch | None (public read) |
| v1.1 | Optional API key for higher rate limits |
| v2 | OAuth for partner integrations |

No authentication required for initial launch. Document fair-use limits.

---

## Response Envelope

### Success

```json
{
  "data": { },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-28T12:00:00Z",
    "version": "v1"
  }
}
```

### Collection with pagination

```json
{
  "data": [ ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-28T12:00:00Z",
    "version": "v1",
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "totalItems": 213,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Dataset 'foo' not found",
    "details": []
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-06-28T12:00:00Z",
    "version": "v1"
  }
}
```

---

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 400 | Invalid query parameters |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Database unavailable |

---

## Endpoints

### Datasets

#### `GET /api/v1/datasets`

List all datasets (registry entries).

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category slug |
| `q` | string | Search name/description |
| `geographicLevel` | string | `national`, `provincial`, `municipal` |

**Response `data` item:**

```json
{
  "slug": "unemployment",
  "statId": "unemployment-national",
  "name": "National Unemployment Rate",
  "category": "unemployment",
  "unit": "%",
  "cadence": "quarterly",
  "automationLevel": "semi-auto",
  "source": {
    "name": "Statistics South Africa",
    "shortName": "Stats SA",
    "url": "https://www.statssa.gov.za/..."
  },
  "seriesStart": "Q1 2022",
  "seriesEnd": "Q4 2025",
  "lastUpdated": "2026-02-17",
  "freshnessStatus": "fresh"
}
```

---

#### `GET /api/v1/datasets/{slug}`

Dataset metadata + latest snapshot.

**Path:** `slug` = registry ID (`unemployment`, `youth-unemployment`, etc.)

---

#### `GET /api/v1/datasets/{slug}/observations`

Time series data.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `geography` | string | `ZA` | Geography code |
| `from` | date | | `period_start >= from` |
| `to` | date | | `period_start <= to` |
| `limit` | int | 500 | Max rows |
| `format` | string | `json` | `json` or `csv` |

**Response `data`:**

```json
{
  "slug": "unemployment",
  "statId": "unemployment-national",
  "geography": { "code": "ZA", "name": "South Africa" },
  "unit": "%",
  "observations": [
    { "periodLabel": "Q4 2025", "periodStart": "2025-10-01", "value": 31.4 }
  ]
}
```

**Cache:** `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`

---

#### `GET /api/v1/datasets/{slug}/export.csv`

CSV download — mirrors `lib/export.ts` series format.

```
Content-Type: text/csv
Content-Disposition: attachment; filename="unemployment-national.csv"
```

---

### Categories

#### `GET /api/v1/categories`

List UI categories with stat counts.

#### `GET /api/v1/categories/{id}/statistics`

All statistics for a category with latest snapshots.

---

### Geographies

#### `GET /api/v1/geographies`

List geographies.

| Param | Type | Description |
|-------|------|-------------|
| `level` | string | `national`, `province`, `municipality` |
| `parent` | string | Parent geography code |

#### `GET /api/v1/geographies/{code}`

Single geography metadata.

---

### Provinces

#### `GET /api/v1/provinces`

All province snapshots (equivalent to `provinces.json`).

#### `GET /api/v1/provinces/{slug}`

Single province profile. Slug: `western-cape`, `gauteng`, etc.

---

### Municipalities

#### `GET /api/v1/municipalities`

Paginated municipality directory.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `pageSize` | int | 50 | Items per page (max 100) |
| `province` | string | | Province code `WC`, `GP` |
| `category` | string | | `A`, `B`, `C` |
| `q` | string | | Name search |
| `sort` | string | `name` | `name`, `population`, `density` |
| `order` | string | `asc` | `asc`, `desc` |

#### `GET /api/v1/municipalities/{code}`

Full municipality profile (Census 2022).

---

### Updates

#### `GET /api/v1/updates`

Dataset update log (replaces `update-history.ts`).

| Param | Type | Description |
|-------|------|-------------|
| `dataset` | string | Filter by slug |
| `limit` | int | Default 50 |

---

### Stories

#### `GET /api/v1/stories`

List data stories (metadata only).

#### `GET /api/v1/stories/{slug}`

Full story with sections. Stat callouts resolved to live values.

---

### Meta

#### `GET /api/v1/health`

```json
{
  "status": "ok",
  "database": "connected",
  "version": "0.1.0"
}
```

#### `GET /api/v1/openapi.json`

OpenAPI 3.1 spec for documentation UI.

---

## Pagination

### Offset pagination (default)

```
GET /api/v1/municipalities?page=2&pageSize=50
```

Suitable for municipality directory (213 items).

### Keyset pagination (future)

```
GET /api/v1/datasets/unemployment/observations?cursor=2025-10-01&limit=100
```

Better for large observation exports.

---

## Filtering

Use query parameters consistently:

- Exact match: `category=unemployment`
- Date range: `from=2024-01-01&to=2025-12-31`
- Geography: `geography=WC`

Complex filters deferred to v2 (`?filter[unemployment][gte]=30`).

---

## Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Anonymous | 100 requests | per minute per IP |
| API key (future) | 1000 requests | per minute |

**Implementation (v1):** simple in-memory token bucket in middleware or Vercel KV later.

**Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1719576000
```

---

## CORS

```typescript
// Public API — allow browser access from any origin for read-only data
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

Restrict if abuse occurs.

---

## Versioning

| Version | Path | Status |
|---------|------|--------|
| v1 | `/api/v1/*` | Current |
| v2 | `/api/v2/*` | Breaking changes only |

**Breaking change examples:** rename fields, change pagination defaults, remove endpoints.

**Non-breaking:** add fields, add endpoints, add optional query params.

Deprecation: `Sunset` header + 6-month notice in changelog.

---

## Implementation Map

| Route | Query function |
|-------|----------------|
| `/datasets` | `db.listDatasets()` |
| `/datasets/{slug}/observations` | `db.getObservations()` |
| `/provinces` | `db.getProvinceSnapshots()` |
| `/municipalities` | `db.searchMunicipalities()` |
| `/updates` | `db.getUpdateEvents()` |

```typescript
// src/app/api/v1/datasets/[slug]/observations/route.ts
import { getObservations } from '@/lib/db/observations'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(request.url)
  const geography = searchParams.get('geography') ?? 'ZA'
  const data = await getObservations(params.slug, geography, parseQuery(searchParams))
  return NextResponse.json({ data, meta: buildMeta() }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  })
}
```

---

## Public API Considerations

### Open data alignment

- License: CC BY 4.0 (matches schema.org `Dataset` license)
- Attribution: include `source` in every response
- Bulk download: `/export.csv` endpoints + full dump on `/downloads` page

### Embeds (future)

```
GET /api/v1/embed/stat/{statId}
→ minimal JSON for iframe widgets
```

### Documentation UI

Host at `/api/docs` using OpenAPI + Scalar or Swagger UI.

### Abuse prevention

- Rate limits
- No expensive arbitrary SQL endpoint in v1
- Monitor Vercel function duration

---

## CSV Response Format

Matches `lib/export.ts` series mode:

```csv
# SA Data Hub Export
# Dataset: National Unemployment Rate
# Source: Statistics South Africa
# Downloaded: 2026-06-28
# URL: https://sadatahub.tech

id,title,category,seriesName,period,value,unit
unemployment-national,National Unemployment Rate,unemployment,Unemployment Rate (%),Q4 2025,31.4,%
```

---

## Related Documents

- [database-schema.md](./database-schema.md)
- [migration-plan.md](./migration-plan.md) — API in Phase 5
- `src/lib/export.ts` — CSV format reference

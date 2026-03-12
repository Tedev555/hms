# Module 9: Reports & Analytics

**Phase:** 5
**Priority:** Medium
**Dependencies:** All other modules (Modules 1-8) — this module aggregates data from across the system

---

## 1. Overview

The Reports & Analytics module provides management dashboards and exportable reports for operational, clinical, and financial decision-making. It aggregates data from all HMS modules to present KPIs, trends, and detailed reports. This is primarily a read-only module that queries data produced by other modules.

---

## 2. User Stories

### US-9.1: View Executive Dashboard
**As a** hospital director,
**I want to** see a high-level dashboard with key operational metrics,
**So that** I can monitor hospital performance at a glance.

**Acceptance Criteria:**
- Dashboard shows today's KPIs:
  - Total patients today (OPD / IPD / Emergency breakdown)
  - Bed occupancy rate (%) by ward
  - Revenue today vs. target (if configured)
  - Average OPD wait time
  - Lab test turnaround time (average hours)
  - Pharmacy low-stock alerts count
  - Pending lab results count
- Data refreshes on page load (no real-time push required initially)
- Clickable KPI cards drill down to detailed reports

### US-9.2: View OPD Daily Summary
**As a** admin or director,
**I want to** view a daily summary of OPD activity,
**So that** I can understand patient volumes and doctor workloads.

**Acceptance Criteria:**
- Report for a selected date or date range
- Shows: total appointments, appointments by status (completed, cancelled, no-show), appointments by doctor, appointments by department
- Breakdown by appointment type (OPD, follow-up, emergency, teleconsult)
- Exportable to CSV

### US-9.3: View IPD Census Report
**As a** director or nurse manager,
**I want to** see the current inpatient census,
**So that** I know how many patients are admitted, by ward and status.

**Acceptance Criteria:**
- Current snapshot of all active admissions
- Grouped by ward: patient count, bed occupancy rate
- Shows: patient name, bed, attending doctor, admission date, primary diagnosis
- Historical census for a selected date is available

### US-9.4: View Revenue Summary
**As a** admin or director,
**I want to** see a daily, weekly, or monthly revenue summary,
**So that** I can track financial performance.

**Acceptance Criteria:**
- Revenue broken down by: period (day/week/month), payment method, service category (consultation, pharmacy, lab, IPD)
- Shows: total billed, total collected, outstanding balance
- Comparison with previous period (e.g., this month vs. last month)
- Visual charts (bar or line graph)
- Exportable to CSV

### US-9.5: View Outstanding Payments Report
**As a** admin or receptionist,
**I want to** see a report of all unpaid and overdue invoices,
**So that** I can follow up on outstanding payments.

**Acceptance Criteria:**
- List of invoices with status: issued, partially_paid, overdue
- Shows: invoice number, patient, total, paid, balance, due date, days overdue
- Sortable by amount, due date, or days overdue
- Total outstanding amount shown as a summary
- Exportable to CSV

### US-9.6: View Pharmacy Stock Report
**As a** pharmacist or admin,
**I want to** generate a comprehensive stock report,
**So that** I can manage inventory and procurement effectively.

**Acceptance Criteria:**
- All drugs with: current stock, reorder level, stock value (currentStock x unitPrice)
- Summary: total inventory value, count of low-stock items, count of out-of-stock items
- Filterable by category, stock status
- Exportable to CSV

### US-9.7: View Drug Expiry Alert Report
**As a** pharmacist,
**I want to** see all drug batches expiring within a specified period,
**So that** I can prioritize dispensing or arrange disposal.

**Acceptance Criteria:**
- Configurable period (30, 60, 90 days or custom)
- Shows: drug name, batch number, quantity remaining, expiry date, days until expiry
- Sorted by nearest expiry first
- Highlight already-expired batches
- Exportable to CSV

### US-9.8: View Lab Test Volume Report
**As a** lab manager or director,
**I want to** see test volumes over a period,
**So that** I can plan lab capacity and staffing.

**Acceptance Criteria:**
- Test count by category and individual test over a selected period
- Shows: test name, count ordered, count completed, count pending
- Average turnaround time per test
- Exportable to CSV

### US-9.9: View Lab Turnaround Time Report
**As a** lab manager,
**I want to** track the average time from order to result for lab tests,
**So that** I can identify bottlenecks and improve lab efficiency.

**Acceptance Criteria:**
- Average turnaround time by test category and individual test
- Compares actual turnaround to the target turnaround hours
- Filterable by date range, category, priority
- Exportable to CSV

### US-9.10: View Doctor Workload Report
**As a** director,
**I want to** see workload distribution across doctors,
**So that** I can balance patient loads and plan staffing.

**Acceptance Criteria:**
- Per doctor: appointment count (OPD), active inpatients, prescriptions written, lab orders created
- For a selected date range
- Sortable by total workload
- Exportable to CSV

### US-9.11: View Diagnosis Frequency Report
**As a** director or doctor,
**I want to** see the most common diagnoses over a period,
**So that** I can identify health trends and allocate resources.

**Acceptance Criteria:**
- Top N diagnoses by frequency over a selected period
- Based on appointment chief complaints and admission primary diagnoses
- Breakdown by department
- Exportable to CSV

### US-9.12: Export Report as CSV
**As a** admin or director,
**I want to** export any report as a CSV file,
**So that** I can analyze data in Excel or other tools.

**Acceptance Criteria:**
- Every report view has an "Export CSV" button
- CSV includes all columns visible in the report
- File is downloaded to the user's browser
- Filename includes report name and date range

---

## 3. Business Requirements

### BR-9.1: Dashboard KPIs
The executive dashboard SHALL display the following KPIs:
| KPI | Source Module | Calculation |
|-----|-------------|-------------|
| Total patients today | Appointments, Admissions | Count of unique patients with appointments or active admissions today |
| OPD patients today | Appointments | Count of appointments with type OPD scheduled today |
| IPD patients today | Admissions | Count of active admissions |
| Emergency patients today | Appointments | Count of appointments with type emergency today |
| Bed occupancy rate | Wards/Beds | (Occupied beds / Total beds) x 100, per ward |
| Revenue today | Billing | Sum of payments recorded today |
| Average OPD wait time | Appointments | Average time from checked_in to in_progress status |
| Lab turnaround time | Lab Orders | Average time from order creation to result entry |
| Low stock alerts | Pharmacy | Count of drugs where currentStock <= reorderLevel |
| Pending lab results | Lab Orders | Count of orders with status != completed and != cancelled |

### BR-9.2: Report Access Control
| Report Category | Receptionist | Admin | Doctor | Nurse | Director |
|----------------|-------------|-------|--------|-------|----------|
| Clinical reports | No | Yes | Own patients | Department | Yes |
| Financial reports | Outstanding only | Yes | No | No | Yes |
| Inventory reports | No | Yes | No | No | Yes |
| Lab reports | No | Yes | No | No | Yes |
| HR/Workload reports | No | Yes | No | No | Yes |

### BR-9.3: Date Range Filtering
- All reports SHALL support date range filtering
- Default ranges SHALL include: today, this week, this month, last month, custom range
- Date ranges SHALL be validated (start date <= end date)

### BR-9.4: Data Freshness
- Dashboard data SHALL be current as of the last page load
- Reports SHALL query live data (no pre-aggregated cache initially)
- Future optimization may introduce materialized views or Redis caching for heavy queries

### BR-9.5: Export Format
- CSV export SHALL use UTF-8 encoding with BOM for Excel compatibility
- Column headers SHALL be human-readable
- Date/time values SHALL use ISO 8601 format
- Monetary values SHALL include 2 decimal places

---

## 4. Technical Specifications

### 4.1 API Endpoints

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| GET | `/api/v1/reports/dashboard` | Executive dashboard KPIs | admin, director |
| GET | `/api/v1/reports/opd-summary` | OPD daily/period summary | admin, director |
| GET | `/api/v1/reports/ipd-census` | IPD census report | admin, director, nurse |
| GET | `/api/v1/reports/revenue` | Revenue summary | admin, director |
| GET | `/api/v1/reports/outstanding-payments` | Outstanding payments | admin, director, receptionist |
| GET | `/api/v1/reports/pharmacy-stock` | Pharmacy stock report | pharmacist, admin, director |
| GET | `/api/v1/reports/drug-expiry` | Drug expiry alert report | pharmacist, admin |
| GET | `/api/v1/reports/lab-volume` | Lab test volume | lab_tech, admin, director |
| GET | `/api/v1/reports/lab-turnaround` | Lab turnaround times | lab_tech, admin, director |
| GET | `/api/v1/reports/doctor-workload` | Doctor workload | admin, director |
| GET | `/api/v1/reports/diagnosis-frequency` | Diagnosis frequency | doctor, admin, director |

### 4.2 Common Query Parameters

All report endpoints accept:
| Parameter | Type | Description |
|-----------|------|-------------|
| `dateFrom` | ISO date | Start of period (inclusive) |
| `dateTo` | ISO date | End of period (inclusive) |
| `format` | string | `json` (default) or `csv` |

Additional filters per report (e.g., `departmentId`, `wardId`, `doctorId`).

### 4.3 Dashboard Response Example

```json
{
  "data": {
    "date": "2026-03-12",
    "patients": {
      "opd": 45,
      "ipd": 120,
      "emergency": 8,
      "total": 173
    },
    "bedOccupancy": {
      "overall": 78.5,
      "byWard": [
        { "wardId": "uuid", "wardName": "General", "total": 50, "occupied": 38, "rate": 76.0 },
        { "wardId": "uuid", "wardName": "ICU", "total": 10, "occupied": 9, "rate": 90.0 }
      ]
    },
    "revenue": {
      "today": 125000.00,
      "target": 150000.00,
      "percentOfTarget": 83.3
    },
    "averageWaitTime": {
      "minutes": 22
    },
    "labTurnaround": {
      "averageHours": 4.5
    },
    "alerts": {
      "lowStockDrugs": 7,
      "pendingLabResults": 15
    }
  }
}
```

### 4.4 CSV Export

When `format=csv` is passed, the API returns:
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="report-name-2026-03-12.csv"`
- BOM prefix for Excel compatibility

### 4.5 Chart Library

Frontend charts use **Recharts** (already in project dependencies):
- Bar charts for comparisons (revenue by category, test volumes)
- Line charts for trends (revenue over time, patient volumes)
- Pie/donut charts for distributions (payment methods, appointment types)
- Gauge or KPI cards for dashboard metrics

---

## 5. Additional Information

### UI Pages
- `/dashboard` — Executive dashboard with KPI cards and summary charts
- `/reports` — Report index page with links to all reports
- `/reports/opd-summary` — OPD summary with date picker and filters
- `/reports/ipd-census` — IPD census view
- `/reports/revenue` — Revenue report with charts
- `/reports/outstanding` — Outstanding payments list
- `/reports/pharmacy-stock` — Pharmacy stock report
- `/reports/drug-expiry` — Drug expiry alerts
- `/reports/lab-volume` — Lab test volume report
- `/reports/lab-turnaround` — Lab turnaround time report
- `/reports/doctor-workload` — Doctor workload report
- `/reports/diagnosis-frequency` — Diagnosis frequency report

### Performance Considerations
- Some reports may query large datasets — use database indexes and pagination for list reports
- Dashboard queries should be optimized with aggregate queries (COUNT, SUM, AVG) rather than fetching all rows
- Consider adding database indexes on date fields used in report queries (already indexed: `scheduledAt`, `issueDate`, `createdAt`, `recordedAt`)
- For very large deployments, materialized views or scheduled aggregation jobs may be needed

### Edge Cases
- **Empty data**: Reports should gracefully handle periods with no data (show zeros, not errors)
- **Timezone**: All dates/times stored in UTC; reports should display in the hospital's local timezone
- **Very large exports**: CSV exports should stream data for large result sets to avoid memory issues
- **Concurrent access**: Multiple users can view the same report simultaneously without conflict

### Cross-Module Dependencies
- **All modules**: This module reads from every other module's data
- No other module depends on Reports & Analytics (it's a read-only consumer)

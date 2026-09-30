"use client";
import SkeletonTable from "@/app/components/SkeletonTable";
import { useState, useMemo } from "react";
import useDashboardStore, { fmtMoneyC, currencyOf } from "@/lib/use-store";
import PaginationControls from "@/app/components/PaginationControls";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";

export default function DefaulterEntryPage() {
  const { getDefaulterEntries, deleteEntry, bulkDelete, loading, showToast } = useDashboardStore();
  const rawEntries = getDefaulterEntries ? getDefaulterEntries() : [];

  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, title: "", message: "", onConfirm: null, loading: false, loadingText: "" });

  const filtered = useMemo(() => {
    let rows = rawEntries;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      rows = rows.filter(e => 
        (e.firstName || "").toLowerCase().includes(q) || 
        (e.lastName || "").toLowerCase().includes(q) || 
        (e.company || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [rawEntries, searchTerm]);

  const paginatedRows = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  const toggleAll = (checked) => setSelected(checked ? new Set(filtered.map(r => r.id)) : new Set());
  const toggleRow = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleDeleteSelected = () => {
    if (!selected.size) return;
    const count = selected.size;
    setDeleteConfirm({
      isOpen: true,
      title: `Delete ${count} records?`,
      message: `Are you sure you want to delete these ${count} defaulter records? This cannot be undone.`,
      loadingText: "Deleting...",
      onConfirm: async () => {
        setDeleteConfirm(prev => ({ ...prev, loading: true }));
        const ok = await bulkDelete(Array.from(selected));
        if (ok) {
          setSelected(new Set());
          showToast(`Deleted ${count} records`);
        }
        setDeleteConfirm({ isOpen: false, title: "", message: "", onConfirm: null, loading: false, loadingText: "" });
      }
    });
  };

  const handleDelete = (entry) => {
    setDeleteConfirm({
      isOpen: true,
      title: "Delete record?",
      message: "Are you sure you want to delete this record? This cannot be undone.",
      loadingText: "Deleting...",
      onConfirm: async () => {
        setDeleteConfirm(prev => ({ ...prev, loading: true }));
        await deleteEntry(entry.id);
        showToast("Deleted record");
        setDeleteConfirm({ isOpen: false, title: "", message: "", onConfirm: null, loading: false, loadingText: "" });
      }
    });
  };

  if (loading) return <SkeletonTable />;

  return (
    <div className="page-inner" style={{ outline: "none" }} tabIndex={0}>
      {/* Header aligned with image styling */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: "22px", color: "white" }}>Defaulter Entry</h1>
          <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
            {filtered.length} records
          </span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="search-wrap" style={{ position: "relative" }}>
            <input
              className="search-input"
              style={{ width: "220px", background: "var(--surface-2, #1e2433)", border: "1px solid var(--border, #2d3748)", padding: "8px 12px 8px 32px", borderRadius: "6px", color: "white" }}
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #9ca3af)" }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          {selected.size > 0 && (
            <button className="btn-del" onClick={handleDeleteSelected} style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>
              Delete ({selected.size})
            </button>
          )}
        </div>
      </div>

      <div className="kpi-strip" style={{ marginBottom: "20px" }}>
        <div className="kpi-card" style={{ background: "var(--surface, #111827)", border: "1px solid var(--border, #2d3748)", padding: "20px", borderRadius: "10px", width: "240px" }}>
          <div className="kpi-label" style={{ fontSize: "11px", color: "var(--text-muted, #9ca3af)", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Candidates</div>
          <div className="kpi-value" style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>{filtered.length}</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ background: "var(--surface, #111827)", border: "1px solid var(--border, #2d3748)", borderRadius: "10px", padding: "60px", textAlign: "center" }}>
          <div style={{ color: "var(--text-muted, #9ca3af)", marginBottom: "8px" }}>No defaulter entries found</div>
          <div style={{ fontSize: "13px", color: "var(--text-dim, #6b7280)" }}>Entries submitted from the Defaulter Modal will appear here.</div>
        </div>
      ) : (
        <div className="tbl-wrap" style={{ border: "1px solid var(--border, #2d3748)", borderRadius: "10px", overflow: "hidden", background: "var(--surface, #111827)" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1800px" }}>
              <thead>
                <tr style={{ background: "var(--surface-2, #1e2433)", borderBottom: "1px solid var(--border, #2d3748)", textAlign: "left", fontSize: "11px", color: "var(--text-muted, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ width: "40px", padding: "12px 16px", textAlign: "center" }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => toggleAll(e.target.checked)} />
                  </th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Company</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>First Name</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Last Name</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Street 2</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>City</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>State</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Zip</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Home Phone</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Email</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Drivers License</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Last Charge Date</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Total Amount</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Amount Paid</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Outstanding Amount</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Date Last Paid</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>SSN</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>DOB</th>
                  <th style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>Notes</th>
                  <th style={{ padding: "12px 16px", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((entry, idx) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--border, #2d3748)", background: selected.has(entry.id) ? "rgba(99,102,241,0.05)" : "transparent" }}>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggleRow(entry.id)} />
                    </td>
                    <td style={{ padding: "12px 16px", color: "white", fontWeight: "500", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.company || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "white", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.firstName || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "white", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.lastName || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.street2 || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.city || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.state || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.zip || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.homePhone || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.email || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.driversLicense || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "white", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.lastChargeDate || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "white", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>{fmtMoneyC(entry.totalAmount, "USD", 2)}</td>
                    <td style={{ padding: "12px 16px", color: "white", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>{fmtMoneyC(entry.amountPaid, "USD", 2)}</td>
                    <td style={{ padding: "12px 16px", color: "#fb7185", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>{fmtMoneyC(entry.outstandingAmount, "USD", 2)}</td>
                    <td style={{ padding: "12px 16px", color: "white", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.dateLastPaid || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.ssn || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.dob || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim, #9ca3af)", fontSize: "13px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.notes}>{entry.notes || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", position: "sticky", right: 0, background: "var(--surface, #111827)", borderLeft: "1px solid var(--border, #2d3748)" }}>
                      <button onClick={() => handleDelete(entry)} style={{ background: "none", border: "none", color: "var(--text-dim, #6b7280)", cursor: "pointer", fontSize: "16px" }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border, #2d3748)" }}>
            <PaginationControls total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        loading={deleteConfirm.loading}
        loadingText={deleteConfirm.loadingText}
      />
    </div>
  );
}

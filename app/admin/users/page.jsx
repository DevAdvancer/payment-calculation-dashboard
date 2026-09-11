"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import useDashboardStore, { MONTH_NAMES, INSTANCE_OPTIONS, SERVICE_TYPES, ALL_STATUSES } from "@/lib/use-store";
import { useMemo } from "react";

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'payment', label: 'Payment Calc' },
  { id: 'monthly', label: 'Monthly Summary' },
  { id: 'defaulter', label: 'Defaulter Sheet' },
  { id: 'history', label: 'Candidate History' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'placement', label: 'New Placement' },
  { id: 'laidoff', label: 'Laid Off / Resigned' },
  { id: 'po-details', label: 'PO Details' },
  { id: 'notifications', label: 'Notifications' }
];

const AVAILABLE_FILTERS = [
  { id: 'company', label: 'Company' },
  { id: 'status', label: 'Status' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'instance', label: 'Instance' },
  { id: 'type', label: 'Type' },
  { id: 'client', label: 'Client' },
  { id: 'candidate', label: 'Candidate' },
  { id: 'po_num', label: 'PO Number' },
  { id: 'category', label: 'Category' },
  { id: 'currency', label: 'Currency' }
];

const PAGE_FILTERS = {
  'dashboard': [],
  'payment': ['company', 'status', 'month', 'year', 'instance', 'type'],
  'monthly': ['company', 'month', 'year'],
  'defaulter': ['company', 'month', 'year'],
  'history': [],
  'expenses': ['category', 'status', 'month', 'year', 'currency'],
  'placement': [],
  'laidoff': ['company', 'month', 'year'],
  'po-details': ['company', 'month', 'year'],
  'notifications': []
};

function UserRow({ user, onUpdate, onPromptDelete, onPromptResetPassword, onPromptAccess }) {
  const [currentStatus, setCurrentStatus] = useState(user.status || "active");
  const [currentRole, setCurrentRole] = useState(user.role || "user");
  const [isSaving, setIsSaving] = useState(false);

  const hasStatusChanges = user.status !== currentStatus;
  const hasRoleChanges = user.role !== currentRole;

  const handleSaveRole = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole })
      });
      if (!res.ok) throw new Error("Failed to update role");
      const data = await res.json();
      onUpdate(data.user);
      toast.success("Role updated");
    } catch (error) {
      toast.error(error.message);
      setCurrentRole(user.role);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      onUpdate(data.user);
      toast.success("Status updated");
    } catch (error) {
      toast.error(error.message);
      setCurrentStatus(user.status);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    onPromptDelete(user);
  };

  const handleResetPassword = () => {
    onPromptResetPassword(user);
  };

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{user.name || "N/A"}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-ink-muted)" }}>
          <span>{user.email}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(user.email);
              toast.success("Email copied to clipboard");
            }}
            title="Copy Email"
            style={{ 
              background: "transparent", 
              border: "none", 
              cursor: "pointer", 
              color: "var(--color-ink-muted)", 
              display: "flex", 
              alignItems: "center", 
              padding: "4px",
              borderRadius: "4px",
              transition: "color 0.2s, background 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-main)"; e.currentTarget.style.background = "var(--color-surface-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-ink-muted)"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <select 
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            disabled={isSaving}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", outline: "none", background: "var(--color-surface-2)", color: currentRole === 'admin' ? "var(--color-primary)" : "var(--text-dim)", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "all 0.2s" }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          
          {hasRoleChanges && (
            <div style={{ display: "flex", gap: 6 }}>
              <button 
                onClick={handleSaveRole}
                disabled={isSaving}
                style={{ padding: "6px 10px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s", boxShadow: "0 1px 2px rgba(59, 130, 246, 0.2)" }}
              >{isSaving ? "..." : "Save"}</button>
              <button 
                onClick={() => setCurrentRole(user.role)}
                disabled={isSaving}
                style={{ padding: "6px 10px", background: "var(--color-surface)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s" }}
              >Cancel</button>
            </div>
          )}
        </div>
      </td>
      <td>
        <button onClick={() => onPromptAccess(user)} style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer", transition: "all 0.15s" }}>
          Access
        </button>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select 
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              disabled={isSaving}
              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", outline: "none", background: "var(--color-surface-2)", color: currentStatus === "active" ? "var(--color-success)" : "var(--color-warning)", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            {hasStatusChanges && (
              <div style={{ display: "flex", gap: 6 }}>
                <button 
                  onClick={handleSaveStatus}
                  disabled={isSaving}
                  style={{ padding: "6px 10px", background: "var(--color-success)", color: "white", border: "none", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s", boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)" }}
                >{isSaving ? "..." : "Save"}</button>
                <button 
                  onClick={() => setCurrentStatus(user.status)}
                  disabled={isSaving}
                  style={{ padding: "6px 10px", background: "var(--color-surface)", color: "var(--color-ink-muted)", border: "1px solid var(--color-border)", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s" }}
                >Cancel</button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={handleResetPassword}
              style={{ 
                background: "var(--color-surface-2)", 
                padding: "6px 12px", 
                border: "1px solid var(--color-accent-soft)", 
                color: "var(--color-primary)", 
                fontWeight: 600, 
                cursor: "pointer",
                borderRadius: "6px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s",
                fontSize: "12px"
              }}
            >
              Reset Password
            </button>
            <button 
              onClick={handleDelete}
              style={{ 
                background: "var(--color-danger-soft)", 
                padding: "6px 12px", 
                border: "1px solid var(--color-danger)", 
                color: "var(--color-danger)", 
                fontWeight: 600, 
                cursor: "pointer",
                borderRadius: "6px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.15s",
                fontSize: "12px"
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AccessControlPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingModal, setIsDeletingModal] = useState(false);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({ name: '', email: '', password: '', role: 'user', status: 'active' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Reset Password Modal State
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '', confirmNewPassword: '' });
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Access Modal State
  const [userToManageAccess, setUserToManageAccess] = useState(null);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessData, setAccessData] = useState({ pages: {} });

  
  const { getActive, expenses = [] } = useDashboardStore();
  const entries = getActive ? getActive() : [];
  
  const optionsMap = useMemo(() => {
    const opts = {};
    opts.month = MONTH_NAMES || [];
    
    const yrs = new Set(entries.map(e => String(e.year || "").trim()).filter(x => x && x !== "0"));
    yrs.add(String(new Date().getFullYear()));
    opts.year = [...yrs].sort((a,b)=>Number(b)-Number(a));

    const comps = new Set(entries.map(e => String(e.company || "").trim()).filter(x => x && x !== "0"));
    opts.company = [...comps].sort();

    const stats = new Set(entries.map(e => String(e.status || "").trim()).filter(x => x && x !== "0"));
    if (ALL_STATUSES) ALL_STATUSES.forEach(s => stats.add(s));
    opts.status = [...stats].sort();

    const insts = new Set(entries.map(e => String(e.instance || "")).filter(Boolean));
    if (INSTANCE_OPTIONS) INSTANCE_OPTIONS.forEach(i => insts.add(i));
    opts.instance = [...insts].sort();

    const types = new Set(entries.map(e => String(e.serviceType || "")).filter(Boolean));
    if (SERVICE_TYPES) SERVICE_TYPES.forEach(t => types.add(t));
    opts.type = [...types].sort();

    const clients = new Set(entries.map(e => String(e.client || "").trim()).filter(x => x && x !== "0"));
    opts.client = [...clients].sort();

    const cands = new Set(entries.map(e => String(e.candidate || "").trim()).filter(x => x && x !== "0"));
    opts.candidate = [...cands].sort();

    const pos = new Set(entries.map(e => String(e.poNumber || "").trim()).filter(x => x && x !== "0"));
    opts.po_num = [...pos].sort();

        const cats = new Set(expenses.map(e => String(e.category||"").trim()).filter(x => x && x !== "0"));
    opts.category = [...cats].sort();
    opts.currency = ["USD", "GBP", "INR"];
    
    return opts;
  }, [entries]);


  const handleOpenAccessModal = (user) => {
    setUserToManageAccess(user);
    if (user.permissions && Object.keys(user.permissions).length > 0) {
      setAccessData(user.permissions);
    } else {
      const fullAccess = { pages: {} };
      AVAILABLE_PAGES.forEach(p => {
        fullAccess.pages[p.id] = { access: true, filters: PAGE_FILTERS[p.id] || [] };
      });
      setAccessData(fullAccess);
    }
    setIsAccessModalOpen(true);
  };

  const handleSaveAccess = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userToManageAccess.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: accessData })
      });
      if (!res.ok) throw new Error("Failed to save permissions");
      toast.success("Permissions updated");
      setIsAccessModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = (updatedUser) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeletingModal(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success("User deleted");
      setUserToDelete(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeletingModal(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");

    if (!createFormData.name || !createFormData.email || !createFormData.password) {
      setCreateError("All required fields must be filled.");
      return;
    }
    if (createFormData.password.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFormData)
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes("duplicate key value")) {
          throw new Error("A user with this email already exists.");
        }
        throw new Error(data.error || "Failed to create user");
      }
      
      setUsers([...users, data.user]);
      toast.success("User created");
      setIsCreateModalOpen(false);
      setCreateFormData({ name: '', email: '', password: '', role: 'user', status: 'active' });
    } catch (error) {
      setCreateError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (resetPasswordData.newPassword !== resetPasswordData.confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (resetPasswordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/users/${userToResetPassword.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordData.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      
      toast.success("Password reset successfully");
      setUserToResetPassword(null);
      setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div style={{ padding: "40px 56px", maxWidth: 1400, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
          Users
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-ink-muted)", marginTop: 4 }}>
          Manage users and their permissions within the system.
        </p>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-surface-2)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>Manage Users</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={fetchUsers}
              disabled={isLoading}
              style={{ padding: "8px 16px", background: "var(--color-surface-2)", color: "var(--text-main)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              </svg>
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button 
              onClick={() => {
                setCreateError("");
                setIsCreateModalOpen(true);
              }}
              style={{ padding: "8px 16px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              Create
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Control</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--color-ink-muted)" }}>Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--color-ink-muted)" }}>No users found.</td>
                </tr>
              ) : (
                users.map(user => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    onUpdate={handleUpdateUser} 
                    onPromptDelete={(user) => setUserToDelete(user)} 
                    onPromptResetPassword={(user) => setUserToResetPassword(user)}
                    onPromptAccess={handleOpenAccessModal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--color-surface)", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, fontSize: "18px", color: "var(--color-ink)" }}>Delete User</h3>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "14px" }}>
              Are you sure you want to delete <strong>{userToDelete.name || userToDelete.email}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingModal}
                style={{ padding: "8px 16px", border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: "6px", cursor: isDeletingModal ? "not-allowed" : "pointer", color: "var(--color-ink)", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isDeletingModal}
                style={{ padding: "8px 16px", border: "none", background: "var(--color-danger)", borderRadius: "6px", cursor: isDeletingModal ? "not-allowed" : "pointer", color: "#fff", fontWeight: 500 }}
              >
                {isDeletingModal ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--color-surface)", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, fontSize: "18px", color: "var(--color-ink)" }}>Create New Account</h3>
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              {createError && (
                <div style={{ padding: "10px 12px", background: "var(--color-danger-soft)", border: "1px solid var(--color-danger)", borderRadius: "6px", color: "var(--color-danger)", fontSize: "13px", fontWeight: 500 }}>
                  {createError}
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>Name *</label>
                <input 
                  type="text" 
                  required
                  value={createFormData.name} 
                  onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="John Doe"
                />
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>Email *</label>
                  <input 
                    type="email" 
                    required
                    value={createFormData.email} 
                    onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                    placeholder="john@example.com"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>Password *</label>
                  <input 
                    type="password" 
                    required
                    value={createFormData.password} 
                    onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                    placeholder="Enter password"
                  />
                  <p style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "6px", lineHeight: "1.4" }}>
                    Please save this password on your device as this won't be displayed after you finally save it.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>Role</label>
                  <select 
                    value={createFormData.role} 
                    onChange={(e) => setCreateFormData({...createFormData, role: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", outline: "none", fontSize: "14px" }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>Status</label>
                  <select 
                    value={createFormData.status} 
                    onChange={(e) => setCreateFormData({...createFormData, status: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", outline: "none", fontSize: "14px" }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button 
                  type="button"
                  onClick={() => {
                    setCreateError("");
                    setIsCreateModalOpen(false);
                  }}
                  disabled={isCreating}
                  style={{ padding: "8px 16px", border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: "6px", cursor: isCreating ? "not-allowed" : "pointer", color: "var(--color-ink)", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  style={{ padding: "8px 16px", border: "none", background: "var(--color-primary)", borderRadius: "6px", cursor: isCreating ? "not-allowed" : "pointer", color: "#fff", fontWeight: 500 }}
                >
                  {isCreating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {userToResetPassword && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--color-surface)", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, fontSize: "18px", color: "var(--color-ink)" }}>Reset Password</h3>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "14px", marginTop: 4, marginBottom: 16 }}>
              Enter a new password for <strong>{userToResetPassword.name || userToResetPassword.email}</strong>.
            </p>
            <form onSubmit={handleResetPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>New Password</label>
                <input 
                  type="password" 
                  required
                  value={resetPasswordData.newPassword} 
                  onChange={(e) => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>Confirm New Password</label>
                <input 
                  type="password" 
                  required
                  value={resetPasswordData.confirmNewPassword} 
                  onChange={(e) => setResetPasswordData({...resetPasswordData, confirmNewPassword: e.target.value})}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--color-border)", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="••••••••"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button 
                  type="button"
                  onClick={() => {
                    setUserToResetPassword(null);
                    setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
                  }}
                  disabled={isResettingPassword}
                  style={{ padding: "8px 16px", border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: "6px", cursor: isResettingPassword ? "not-allowed" : "pointer", color: "var(--color-ink)", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isResettingPassword}
                  style={{ padding: "8px 16px", border: "none", background: "var(--color-primary)", borderRadius: "6px", cursor: isResettingPassword ? "not-allowed" : "pointer", color: "#fff", fontWeight: 500 }}
                >
                  {isResettingPassword ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Permissions Modal */}
      {isAccessModalOpen && userToManageAccess && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--color-surface)", padding: "32px", borderRadius: "12px", width: "800px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, fontSize: "20px", color: "var(--color-ink)", marginBottom: "8px" }}>Access Permissions</h3>
            <p style={{ color: "var(--color-ink-muted)", fontSize: "14px", marginBottom: "24px", marginTop: 0 }}>
              Configure page and filter access for <strong>{userToManageAccess.name || userToManageAccess.email}</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {AVAILABLE_PAGES.map(page => {
                const pageData = accessData.pages[page.id] || { access: false, filters: [] };
                const hasAccess = pageData.access;
                const applicableFilters = PAGE_FILTERS[page.id] || [];

                return (
                  <div key={page.id} style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px", background: hasAccess ? "var(--color-surface-2)" : "var(--color-surface)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <input 
                        type="checkbox" 
                        id={`page-${page.id}`}
                        checked={hasAccess}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAccessData(prev => ({
                            ...prev,
                            pages: {
                              ...prev.pages,
                              [page.id]: {
                                access: checked,
                                filters: checked ? applicableFilters : [], mode: checked ? "write" : "write"
                              }
                            }
                          }));
                        }}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor={`page-${page.id}`} style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-ink)", cursor: "pointer" }}>
                        {page.label}
                      </label>
                    </div>

                    
                      {hasAccess && (
                        <div style={{ marginTop: "16px", paddingLeft: "28px", display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink-muted)" }}>Permissions:</div>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--color-ink-muted)", cursor: "pointer" }}>
                            <input 
                              type="radio" 
                              name={`mode-${page.id}`} 
                              checked={pageData.mode !== "read"} 
                              onChange={() => {
                                setAccessData(prev => ({
                                  ...prev,
                                  pages: { ...prev.pages, [page.id]: { ...prev.pages[page.id], mode: "write" } }
                                }));
                              }}
                            />
                            Read & Write
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--color-ink-muted)", cursor: "pointer" }}>
                            <input 
                              type="radio" 
                              name={`mode-${page.id}`} 
                              checked={pageData.mode === "read"} 
                              onChange={() => {
                                setAccessData(prev => ({
                                  ...prev,
                                  pages: { ...prev.pages, [page.id]: { ...prev.pages[page.id], mode: "read" } }
                                }));
                              }}
                            />
                            Read Only
                          </label>
                        </div>
                      )}
{hasAccess && applicableFilters.length > 0 && (
                      <div style={{ marginTop: "16px", paddingLeft: "28px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink-muted)", marginBottom: "10px" }}>Allowed Filters:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                          {applicableFilters.map(filterId => {
                            const filter = AVAILABLE_FILTERS.find(f => f.id === filterId);
                            if (!filter) return null;
                            const hasFilter = pageData.filters.includes(filter.id);
                            return (
                              <label key={filter.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--color-ink-muted)", cursor: "pointer" }}>
                                <input 
                                  type="checkbox"
                                  checked={hasFilter}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setAccessData(prev => {
                                      const existingFilters = prev.pages[page.id]?.filters || [];
                                      const newFilters = checked 
                                        ? [...existingFilters, filter.id] 
                                        : existingFilters.filter(f => f !== filter.id);
                                      return {
                                        ...prev,
                                        pages: {
                                          ...prev.pages,
                                          [page.id]: {
                                            ...prev.pages[page.id],
                                            filters: newFilters
                                          }
                                        }
                                      };
                                    });
                                  }}
                                />
                                {filter.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                      {hasAccess && applicableFilters.length > 0 && (
                        <div style={{ marginTop: "16px", paddingLeft: "28px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink-muted)", margin: "16px 0 10px" }}>Locked Row Filters (Leave blank to allow all):</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", flexDirection: "column" }}>
                          {applicableFilters.map(filterId => { 
                            const filter = AVAILABLE_FILTERS.find(f => f.id === filterId); 
                            if (!filter) return null; 
                            const lockedValue = pageData.lockedFilters?.[filter.id] || ""; 
                              return (
                              <div key={`lock-${filter.id}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--color-ink-muted)" }}>
                                <span style={{ width: 80 }}>{filter.label}</span>
                                  <MultiSelectDropdown
                                    options={optionsMap[filter.id] || []}
                                    selected={Array.isArray(lockedValue) ? lockedValue : (lockedValue ? [String(lockedValue)] : [])}
                                    placeholder="Any (Unlocked)"
                                    onChange={(val) => {
                                      setAccessData(prev => { 
                                      const lockedF = { ...(prev.pages[page.id]?.lockedFilters || {}) }; 
                                        if (!val || val.length === 0) { 
                                        delete lockedF[filter.id]; 
                                        } else { 
                                        lockedF[filter.id] = val; 
                                        } 
                                        return { 
                                          ...prev, 
                                          pages: { 
                                            ...prev.pages, 
                                            [page.id]: { 
                                              ...prev.pages[page.id], 
                                            lockedFilters: lockedF 
                                            } 
                                          } 
                                        }; 
                                      }); 
                                    }}
                                    style={{ minWidth: 200 }}
                                  />
                                </div>
                              ); 
                            })}
                          </div>
                        </div>
                      )}
{hasAccess && applicableFilters.length === 0 && (
                      <div style={{ marginTop: "16px", paddingLeft: "28px", fontSize: "13px", color: "var(--color-ink-muted)", fontStyle: "italic" }}>
                        No filters available for this page.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px", borderTop: "1px solid var(--color-border)", paddingTop: "24px" }}>
              <button 
                type="button"
                onClick={() => setIsAccessModalOpen(false)}
                disabled={isLoading}
                style={{ padding: "8px 16px", border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: "6px", cursor: isLoading ? "not-allowed" : "pointer", color: "var(--color-ink)", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveAccess}
                disabled={isLoading}
                style={{ padding: "8px 16px", border: "none", background: "var(--color-primary)", borderRadius: "6px", cursor: isLoading ? "not-allowed" : "pointer", color: "#fff", fontWeight: 500 }}
              >
                {isLoading ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

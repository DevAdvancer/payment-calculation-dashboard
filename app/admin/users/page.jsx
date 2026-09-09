"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

function UserRow({ user, onUpdate, onPromptDelete, onPromptResetPassword }) {
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
    <tr style={{ borderBottom: "1px solid #eef0f3" }}>
      <td style={{ padding: "16px 24px", color: "#111827", fontWeight: 500 }}>{user.name || "N/A"}</td>
      <td style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
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
              color: "#94a3b8", 
              display: "flex", 
              alignItems: "center", 
              padding: "4px",
              borderRadius: "4px",
              transition: "color 0.2s, background 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "transparent"; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </td>
      <td style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <select 
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            disabled={isSaving}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", background: "#f8fafc", color: currentRole === 'admin' ? "#8b5cf6" : "#64748b", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "all 0.2s" }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          
          {hasRoleChanges && (
            <div style={{ display: "flex", gap: 6 }}>
              <button 
                onClick={handleSaveRole}
                disabled={isSaving}
                style={{ padding: "6px 10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s", boxShadow: "0 1px 2px rgba(59, 130, 246, 0.2)" }}
              >{isSaving ? "..." : "Save"}</button>
              <button 
                onClick={() => setCurrentRole(user.role)}
                disabled={isSaving}
                style={{ padding: "6px 10px", background: "#fff", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s" }}
              >Cancel</button>
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: "16px 24px" }}>
        <Link href={`/admin/access-control?userId=${user.id}`} style={{ display: "inline-block", textDecoration: "none", padding: "6px 14px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 16, fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
          Access
        </Link>
      </td>
      <td style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select 
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              disabled={isSaving}
              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", background: "#f8fafc", color: currentStatus === 'active' ? "#10b981" : "#f59e0b", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            {hasStatusChanges && (
              <div style={{ display: "flex", gap: 6 }}>
                <button 
                  onClick={handleSaveStatus}
                  disabled={isSaving}
                  style={{ padding: "6px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s", boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)" }}
                >{isSaving ? "..." : "Save"}</button>
                <button 
                  onClick={() => setCurrentStatus(user.status)}
                  disabled={isSaving}
                  style={{ padding: "6px 10px", background: "#fff", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", transition: "transform 0.1s" }}
                >Cancel</button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              onClick={handleResetPassword}
              style={{ 
                background: "#e0e7ff", 
                padding: "6px 12px", 
                border: "1px solid #c7d2fe", 
                color: "#4f46e5", 
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
                background: "#fee2e2", 
                padding: "6px 12px", 
                border: "1px solid #fca5a5", 
                color: "#ef4444", 
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
    <div style={{ padding: "40px 56px", maxWidth: 1000, margin: "0 auto", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          Access Control
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Manage users and their permissions within the system.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e3e6ea", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eef0f3" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Manage Users</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={fetchUsers}
              disabled={isLoading}
              style={{ padding: "8px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "6px" }}>
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
              style={{ padding: "8px 16px", background: "#1a1f2e", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              Create
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #eef0f3" }}>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Name</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Email</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Role</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Control</th>
                <th style={{ padding: "12px 24px", fontWeight: 600, color: "#64748b" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>No users found.</td>
                </tr>
              ) : (
                users.map(user => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    onUpdate={handleUpdateUser} 
                    onPromptDelete={(user) => setUserToDelete(user)} 
                    onPromptResetPassword={(user) => setUserToResetPassword(user)}
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
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, fontSize: "18px", color: "#111827" }}>Delete User</h3>
            <p style={{ color: "#4b5563", fontSize: "14px" }}>
              Are you sure you want to delete <strong>{userToDelete.name || userToDelete.email}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingModal}
                style={{ padding: "8px 16px", border: "1px solid #d1d5db", background: "#fff", borderRadius: "6px", cursor: isDeletingModal ? "not-allowed" : "pointer", color: "#374151", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isDeletingModal}
                style={{ padding: "8px 16px", border: "none", background: "#ef4444", borderRadius: "6px", cursor: isDeletingModal ? "not-allowed" : "pointer", color: "#fff", fontWeight: 500 }}
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
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, fontSize: "18px", color: "#111827" }}>Create New Account</h3>
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              {createError && (
                <div style={{ padding: "10px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "6px", color: "#ef4444", fontSize: "13px", fontWeight: 500 }}>
                  {createError}
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>Name *</label>
                <input 
                  type="text" 
                  required
                  value={createFormData.name} 
                  onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="John Doe"
                />
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>Email *</label>
                  <input 
                    type="email" 
                    required
                    value={createFormData.email} 
                    onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                    placeholder="john@example.com"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>Password *</label>
                  <input 
                    type="password" 
                    required
                    value={createFormData.password} 
                    onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                    placeholder="Enter password"
                  />
                  <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px", lineHeight: "1.4" }}>
                    Please save this password on your device as this won't be displayed after you finally save it.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>Role</label>
                  <select 
                    value={createFormData.role} 
                    onChange={(e) => setCreateFormData({...createFormData, role: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px" }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>Status</label>
                  <select 
                    value={createFormData.status} 
                    onChange={(e) => setCreateFormData({...createFormData, status: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px" }}
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
                  style={{ padding: "8px 16px", border: "1px solid #d1d5db", background: "#fff", borderRadius: "6px", cursor: isCreating ? "not-allowed" : "pointer", color: "#374151", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  style={{ padding: "8px 16px", border: "none", background: "#1a1f2e", borderRadius: "6px", cursor: isCreating ? "not-allowed" : "pointer", color: "#fff", fontWeight: 500 }}
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
          <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, fontSize: "18px", color: "#111827" }}>Reset Password for {userToResetPassword.name || userToResetPassword.email}</h3>
            <form onSubmit={handleResetPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>New Password *</label>
                <input 
                  type="password" 
                  required
                  value={resetPasswordData.newPassword} 
                  onChange={(e) => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>Confirm New Password *</label>
                <input 
                  type="password" 
                  required
                  value={resetPasswordData.confirmNewPassword} 
                  onChange={(e) => setResetPasswordData({...resetPasswordData, confirmNewPassword: e.target.value})}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
                  placeholder="Confirm new password"
                />
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button 
                  type="button"
                  onClick={() => setUserToResetPassword(null)}
                  disabled={isResettingPassword}
                  style={{ padding: "8px 16px", border: "1px solid #d1d5db", background: "#fff", borderRadius: "6px", cursor: isResettingPassword ? "not-allowed" : "pointer", color: "#374151", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isResettingPassword}
                  style={{ padding: "8px 16px", border: "none", background: "#4f46e5", borderRadius: "6px", cursor: isResettingPassword ? "not-allowed" : "pointer", color: "#fff", fontWeight: 500 }}
                >
                  {isResettingPassword ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

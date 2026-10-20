'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Plus, UserCheck } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { apiRequest } from '@/lib/api';

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [rolesData, setRolesData] = useState<any>({ roles: [], available_permissions: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Catalogue Manager');
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = () => {
    setLoading(true);
    Promise.allSettled([
      apiRequest('/admin/staff'),
      apiRequest('/admin/roles'),
    ]).then(([staffRes, rolesRes]) => {
      if (staffRes.status === 'fulfilled') setStaffList(staffRes.value || []);
      if (rolesRes.status === 'fulfilled') setRolesData(rolesRes.value || { roles: [], available_permissions: [] });
      setLoading(false);
    });
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone: phone || null,
          department: department || null,
          employee_id: employeeId || null,
          role_names: [selectedRole],
        }),
      });
      setShowModal(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setDepartment('');
      setEmployeeId('');
      loadStaff();
      alert('Staff member registered successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-neutral-900">
              Staff & RBAC Administration
            </h1>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">
              Assign discrete operational roles and enforce granular server-side permissions
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition"
          >
            <Plus className="w-4 h-4" /> Add Staff Member
          </button>
        </div>

        {/* Staff Table */}
        {loading ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Querying staff directory...
          </div>
        ) : staffList.length > 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-400 uppercase font-semibold">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Assigned Roles</th>
                    <th className="py-3 px-4">Active Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-neutral-900 block">{s.full_name}</span>
                        <span className="text-[11px] text-neutral-400 font-mono">{s.email}</span>
                      </td>
                      <td className="py-3 px-4">{s.department || 'Operations'}</td>
                      <td className="py-3 px-4 font-mono">{s.employee_id || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {s.roles.map((r: string) => (
                            <span key={r} className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-600 font-semibold uppercase text-[10px]">
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-neutral-200 p-12 text-center text-xs text-neutral-400">
            No staff records found.
          </div>
        )}

        {/* Roles Breakdown */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
            Configured System Roles & Granular Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesData.roles.map((r: any) => (
              <div key={r.id} className="border border-neutral-200 rounded p-4 text-xs space-y-2">
                <h4 className="font-bold text-neutral-900 uppercase">{r.name}</h4>
                <p className="text-[11px] text-neutral-500">{r.description}</p>
                <div className="pt-2 flex flex-wrap gap-1">
                  {r.permissions.map((p: string) => (
                    <span key={p} className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded text-[9px] font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">Create Staff Account</h3>
                <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-black">✕</button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div>
                  <label className="block font-semibold uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                    placeholder="e.g. Priya Sen"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                    placeholder="priya@jwas.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase mb-1">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                      placeholder="e.g. Merchandising"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold uppercase mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black"
                      placeholder="e.g. EMP-104"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase mb-1">Assign Operational Role *</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-neutral-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-black font-semibold"
                  >
                    {rolesData.roles.map((r: any) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-neutral-300 rounded font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-black text-white active:text-white px-5 py-2 font-bold uppercase tracking-wider rounded hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-400 transition"
                  >
                    {submitting ? 'Creating...' : 'Provision Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

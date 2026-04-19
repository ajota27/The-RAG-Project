import { useState, useEffect } from 'react'

function UserManagementModal({ isOpen, onClose, currentUser, getHeaders }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  })

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      resetForm()
    }
  }, [isOpen])

  if (!isOpen) return null

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/users', { headers: getHeaders() })
      const data = await res.json()
      setUsers(data)
    } catch (err) { console.error("Error fetching users", err) }
    finally { setLoading(false) }
  }

  const resetForm = () => {
    setFormData({ username: '', password: '', role: 'user' })
    setEditingUser(null)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({ username: user.username, password: '', role: user.role })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const method = editingUser ? 'PUT' : 'POST'
    const url = editingUser 
      ? `http://localhost:8000/users/${editingUser.id}` 
      : 'http://localhost:8000/users'

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        fetchUsers()
        resetForm()
      } else {
        const errData = await res.json()
        alert(errData.detail || "Error al procesar usuario")
      }
    } catch (err) { console.error("Error saving user", err) }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return
    try {
      const res = await fetch(`http://localhost:8000/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) fetchUsers()
      else {
        const errData = await res.json()
        alert(errData.detail || "Error al eliminar")
      }
    } catch (err) { console.error("Error deleting user", err) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gestión de Usuarios</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario de Usuario */}
        <form className="user-form" onSubmit={handleSubmit}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {editingUser ? (
              <><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Editar Perfil</>
            ) : (
              <><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> Registrar Nuevo Usuario</>
            )}
          </h2>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre de Usuario</label>
              <div className="input-with-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input 
                  className="modal-input" 
                  placeholder="Ej: adm_central" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{editingUser ? 'Nueva Clave' : 'Contraseña'}</label>
              <div className="input-with-icon">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input 
                  type="password"
                  className="modal-input" 
                  placeholder={editingUser ? "Dejar vacío para mantener" : "Mínimo 8 caracteres"}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Permisos del Sistema</label>
              <div className="select-wrapper">
                <select 
                  className="modal-input modal-select" 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  disabled={editingUser && editingUser.id === currentUser.user_id}
                >
                  <option value="user">Colaborador (Solo consultas)</option>
                  <option value="admin">Administrador (Control total)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            {editingUser && (
              <button type="button" className="cancel-btn" onClick={resetForm}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar Edición
              </button>
            )}
            <button type="submit" className="new-chat-btn" style={{ borderRadius: '10px', height: '45px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {editingUser ? 'Guardar Cambios' : 'Confirmar Registro'}
            </button>
          </div>
        </form>

        {/* Lista de Usuarios */}
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Usuarios Registrados</h3>
        <div className="user-table-container">
          {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando usuarios...</div> : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === currentUser.user_id;
                  const isAdmin = u.role === 'admin';
                  const canEdit = isSelf || !isAdmin;
                  const canDelete = !isAdmin && !isSelf;

                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: isSelf ? 600 : 400 }}>
                        {u.username} {isSelf && <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}> (Tú)</span>}
                      </td>
                      <td>
                        <span className={`role-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          {canEdit && (
                            <button className="action-btn edit" onClick={() => handleEdit(u)} title="Editar usuario">
                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          {canDelete && (
                            <button className="action-btn delete" onClick={() => handleDelete(u.id)} title="Eliminar usuario">
                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagementModal

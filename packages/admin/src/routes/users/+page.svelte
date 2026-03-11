<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { focusTrap } from '$lib/focusTrap.js';
  import { toast } from '$lib/toast.svelte.js';

  let users = $state<any[]>([]);
  let error = $state('');
  let showCreate = $state(false);
  let newUser = $state({ email: '', name: '', password: '', role: 'editor' as string });

  let editingUser = $state<any>(null);
  let editForm = $state({ name: '', email: '', role: 'editor' as string, password: '' });

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/users');
      users = res.data;
    } catch (err: any) { error = err.message; }
  }

  onMount(load);

  async function createUser() {
    try {
      await api.post('/users', newUser);
      showCreate = false;
      newUser = { email: '', name: '', password: '', role: 'editor' };
      toast.success('User created.');
      load();
    } catch (err: any) { error = err.message; }
  }

  function startEdit(user: any) {
    editingUser = user;
    editForm = { name: user.name, email: user.email, role: user.role, password: '' };
  }

  async function saveEdit() {
    if (!editingUser) return;
    try {
      const payload: any = { name: editForm.name, email: editForm.email, role: editForm.role };
      if (editForm.password.trim()) payload.password = editForm.password;
      await api.put(`/users/${editingUser.id}`, payload);
      editingUser = null;
      toast.success('User updated.');
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user?')) return;
    try { await api.del(`/users/${id}`); toast.success('User deleted.'); load(); }
    catch (err: any) { error = err.message; }
  }
</script>

<div class="page-header">
  <h1>Users ({users.length})</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New User</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div class="table-wrap">
  <table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th></th></tr></thead>
    <tbody>
      {#each users as user}
        <tr>
          <td><strong>{user.name}</strong></td>
          <td>{user.email}</td>
          <td><span class="badge badge-published">{user.role}</span></td>
          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-outline" onclick={() => startEdit(user)}>Edit</button>
            <button class="btn btn-sm btn-danger" onclick={() => deleteUser(user.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog" aria-labelledby="new-user-title" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => showCreate = false}>
      <div class="modal-header"><h2 id="new-user-title">New User</h2><button class="btn-icon" onclick={() => showCreate = false} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createUser(); }}>
        <div class="form-group"><label for="new-user-name">Name</label><input id="new-user-name" class="form-control" bind:value={newUser.name} required /></div>
        <div class="form-group"><label for="new-user-email">Email</label><input id="new-user-email" class="form-control" type="email" bind:value={newUser.email} required /></div>
        <div class="form-group"><label for="new-user-password">Password</label><input id="new-user-password" class="form-control" type="password" bind:value={newUser.password} required minlength="8" /></div>
        <div class="form-group">
          <label for="new-user-role">Role</label>
          <select id="new-user-role" class="form-control" bind:value={newUser.role}>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if editingUser}
  <div class="modal-overlay" onclick={() => editingUser = null} role="dialog" aria-labelledby="edit-user-title" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => editingUser = null}>
      <div class="modal-header"><h2 id="edit-user-title">Edit User</h2><button class="btn-icon" onclick={() => editingUser = null} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
        <div class="form-group"><label for="edit-user-name">Name</label><input id="edit-user-name" class="form-control" bind:value={editForm.name} required /></div>
        <div class="form-group"><label for="edit-user-email">Email</label><input id="edit-user-email" class="form-control" type="email" bind:value={editForm.email} required /></div>
        <div class="form-group">
          <label for="edit-user-password">New Password</label>
          <input id="edit-user-password" class="form-control" type="password" bind:value={editForm.password} minlength="8" placeholder="Leave blank to keep current" />
          <small style="color: var(--c-text-light); font-size: 0.75rem;">Min 8 characters. Leave blank to keep existing password.</small>
        </div>
        <div class="form-group">
          <label for="edit-user-role">Role</label>
          <select id="edit-user-role" class="form-control" bind:value={editForm.role}>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => editingUser = null}>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
{/if}

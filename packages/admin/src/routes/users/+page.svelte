<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let users = $state<any[]>([]);
  let error = $state('');
  let showCreate = $state(false);
  let newUser = $state({ email: '', name: '', password: '', role: 'editor' as string });

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
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user?')) return;
    try { await api.del(`/users/${id}`); load(); }
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
          <td style="text-align: right;">
            <button class="btn btn-sm btn-danger" onclick={() => deleteUser(user.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header"><h2>New User</h2><button class="btn-icon" onclick={() => showCreate = false}>✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createUser(); }}>
        <div class="form-group"><label>Name</label><input class="form-control" bind:value={newUser.name} required /></div>
        <div class="form-group"><label>Email</label><input class="form-control" type="email" bind:value={newUser.email} required /></div>
        <div class="form-group"><label>Password</label><input class="form-control" type="password" bind:value={newUser.password} required minlength="8" /></div>
        <div class="form-group">
          <label>Role</label>
          <select class="form-control" bind:value={newUser.role}>
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

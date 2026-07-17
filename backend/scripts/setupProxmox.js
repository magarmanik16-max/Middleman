import dotenv from 'dotenv';

// Reads from a SEPARATE admin token (must have Sys.Permission / Administrator).
dotenv.config();

const BASE = process.env.PROXMOX_API_URL || 'https://localhost:8006';
const ADMIN_TOKEN = process.env.PROXMOX_ADMIN_TOKEN; // e.g. root@pam!setup
const TARGET_USER = process.env.PROXMOX_TARGET_USER || 'devcloud@pve';
const ROLE = process.env.PROXMOX_ROLE || 'TimesGlobalCloud';

// Least-privilege set needed by TimesGlobal Cloud: full VM lifecycle + storage allocation
const PRIVS = [
  'VM.Allocate',
  'VM.Config.CPU',
  'VM.Config.Memory',
  'VM.Config.Disk',
  'VM.Config.Network',
  'VM.Config.Options',
  'VM.Config.Cloudinit',
  'VM.PowerMgmt',
  'VM.Console',
  'VM.Audit',
  'VM.Snapshot',
  'VM.Backup',
  'Datastore.AllocateSpace'
].join(',');

if (process.env.NODE_ENV !== 'production') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function api(method, path, body) {
  const params = new URLSearchParams(body).toString();
  const res = await fetch(`${BASE}/api2/json${path}`, {
    method,
    headers: {
      Authorization: `PVEAPIToken=${ADMIN_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    ...(body && { body: params })
  });
  const text = await res.text();
  if (!res.ok) {
    // 400 on role/acl "already exists" is fine
    if (res.status === 400 && /already exists|exists and is not/.test(text)) return null;
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text).data : null;
}

async function main() {
  if (!ADMIN_TOKEN) {
    console.error('Set PROXMOX_ADMIN_TOKEN (a token with Sys.Permission / Administrator).');
    process.exit(1);
  }

  console.log(`Creating role "${ROLE}" with ${PRIVS.split(',').length} privileges...`);
  await api('POST', `/access/roles/${ROLE}`, { privs: PRIVS });

  console.log(`Assigning role "${ROLE}" to ${TARGET_USER} on / ...`);
  await api('POST', '/access/acl', {
    path: '/',
    users: TARGET_USER,
    roles: ROLE
  });

  console.log('Done. Retry workspace provisioning now.');
}

main().catch((e) => {
  console.error('Setup failed:', e.message);
  process.exit(1);
});

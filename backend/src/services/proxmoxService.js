import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import Workspace from '../models/Workspace.js';
import { sshService } from './sshService.js';

const execAsync = promisify(exec);

// Proxmox uses a self-signed cert by default. Node.js 18's fetch() (undici)
// doesn't support the `agent` option, so we temporarily disable TLS
// verification ONLY for Proxmox requests by setting the env var around
// each call. This is thread-safe in Node.js's single-threaded event loop
// and avoids the dangerous module-level global flag.
function withInsecureFetch(url, options) {
  const orig = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  return fetch(url, options).finally(() => {
    if (orig === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = orig;
    }
  });
}

// ── IP address helpers ────────────────────────────────────────────────────────

function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function numberToIp(num) {
  return [(num >>> 24), (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
}

class ProxmoxService {
  // Env vars are read lazily (getters) so they are picked up after dotenv.config()
  // runs at app startup, rather than being captured at module-import time.
  get baseUrl() {
    return process.env.PROXMOX_API_URL || 'https://localhost:8006';
  }
  get token() {
    return process.env.PROXMOX_API_TOKEN;
  }
  get secret() {
    return process.env.PROXMOX_API_SECRET;
  }
  get node() {
    return process.env.PROXMOX_NODE || 'pve';
  }

  get authHeader() {
    return {
      Authorization: `PVEAPIToken=${this.token}=${this.secret}`
    };
  }

  /** Strip the Authorization header from a raw Proxmox error response so secrets
   *  don't leak into logs or API error messages. */
  sanitizeError(text) {
    return text.replace(/PVEAPIToken=[^&\s"]+/g, 'PVEAPIToken=***');
  }

  async request(method, path, body = null) {
    const url = `${this.baseUrl}/api2/json${path}`;
    const headers = { ...this.authHeader };
    const options = { method, headers };
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.body = new URLSearchParams(body).toString();
    }

    const res = await withInsecureFetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Proxmox API ${method} ${path} failed (${res.status}): ${this.sanitizeError(text)}`);
    }
    const data = await res.json();
    return data.data;
  }

  async getNextVMID() {
    try {
      const data = await this.request('GET', '/cluster/nextid');
      return parseInt(data, 10);
    } catch (error) {
      logger.error('Error getting next VMID:', error.message);
      return 100;
    }
  }

  async waitForTask(upid, timeoutMs = 300000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const status = await this.request('GET', `/nodes/${this.node}/tasks/${upid}/status`);
        if (status.status === 'stopped') {
          return status.exitstatus; // 'OK' or an error string
        }
      } catch (e) {
        logger.warn(`Task status check failed for ${upid}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error(`Proxmox task ${upid} timed out after ${timeoutMs}ms`);
  }

  async findAvailableIP() {
    // Configurable pool of IP addresses for workspace containers.
    // These env vars can be set in the .env file or left to use defaults:
    //   WORKSPACE_SUBNET    = "192.168.55.0/24"
    //   WORKSPACE_GATEWAY   = "192.168.55.1"
    //   WORKSPACE_IP_START  = "192.168.55.100"
    //   WORKSPACE_IP_END    = "192.168.55.200"
    const subnet = process.env.WORKSPACE_SUBNET || '192.168.55.0/24';
    const gateway = process.env.WORKSPACE_GATEWAY || '192.168.55.1';
    const rangeStart = process.env.WORKSPACE_IP_START || '192.168.55.100';
    const rangeEnd = process.env.WORKSPACE_IP_END || '192.168.55.200';
    const cidrBits = parseInt(subnet.split('/')[1], 10) || 24;

    const start = ipToNumber(rangeStart);
    const end = ipToNumber(rangeEnd);
    const gwNum = ipToNumber(gateway);

    // Collect IPs already assigned in the database
    const usedDocs = await Workspace.find(
      { ip: { $ne: null, $exists: true } },
      { ip: 1 }
    );
    const usedIPs = new Set(usedDocs.map(d => d.ip));

    for (let i = start; i <= end; i++) {
      const ip = numberToIp(i);
      if (i === gwNum || usedIPs.has(ip)) continue;

      // Best-effort ping check to avoid IPs claimed outside our DB
      try {
        await execAsync(`ping -c 1 -W 1 ${ip}`);
        // Ping got a reply — IP is occupied, skip
        logger.info(`IP ${ip} is occupied (ping replied), trying next...`);
        continue;
      } catch (e) {
        // If ping is not installed (e.g. minimal Docker image), skip verification
        if (e.code === 'ENOENT') {
          logger.warn('ping command not available — skipping IP verification');
          return { ip, gateway, cidr: cidrBits };
        }
        // No reply — IP is likely free, claim it
        logger.info(`Allocating static IP ${ip} for new container`);
        return { ip, gateway, cidr: cidrBits };
      }
    }

    throw new Error('No available IP addresses in the configured range');
  }

  async createContainer(userId, resources, sshUsername, sshPassword) {
    const vmid = await this.getNextVMID();

    // ── Hook script setup (best-effort) ──────────────────────────────────────
    // Upload the hook script (if not already present) and a per-container
    // creds file so the hook can create the sudo user on container start.
    // If this fails, the container is still created with root-only access.
    // If the API user is not root@pam, Proxmox will reject the hookscript
    // property, so we track success and fall back to SSH-based provisioning.
    let hookScriptReady = false;
    try {
      await this.ensureHookScript();
      hookScriptReady = true;
      if (sshUsername && sshPassword) {
        await this.uploadCredsFile(vmid, sshUsername, sshPassword);
      }
    } catch (e) {
      logger.warn(`Hook script setup failed, will fall back to SSH-based user provisioning: ${e.message}`);
    }

    // Allocate a static IP instead of DHCP so we know the address at creation time
    const allocated = await this.findAvailableIP();

    const rootPassword = this.generatePassword();

    const config = {
      vmid,
      hostname: `ws-${userId}-${vmid}`.slice(0, 64),
      ostemplate: 'local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst',
      memory: resources.memory,
      cores: resources.cpu,
      rootfs: `local-lvm:${resources.disk}`,
      net0: `name=eth0,bridge=vmbr0,ip=${allocated.ip}/${allocated.cidr},gw=${allocated.gateway},type=veth`,
      // Only include hookscript if the user/token has permission to set it
      // (non-root users like devcloud@pve are denied by Proxmox)
      ...(hookScriptReady && { hookscript: this.HOOK_SCRIPT_PATH }),
      features: 'nesting=1',
      password: rootPassword,
      unprivileged: 1,
      start: 1
    };

    // Proxmox create is asynchronous: the response is a task UPID, not a
    // finished container. Wait for the task to complete before reporting success.
    const upid = await this.request('POST', `/nodes/${this.node}/lxc`, config);
    const exitstatus = await this.waitForTask(upid);
    // Success is "OK", or "WARNINGS: N" (CT created with non-fatal warnings).
    const ok = exitstatus === 'OK' || String(exitstatus).startsWith('WARNINGS:');
    if (!ok) {
      throw new Error(`Container create task failed: ${exitstatus}`);
    }

    // Confirm the container exists and is booting
    await this.request('GET', `/nodes/${this.node}/lxc/${vmid}/status/current`);
    await new Promise(r => setTimeout(r, 5000));

    // ── Fallback user provisioning (when hookscript can't be used) ───────
    // If the hookscript approach wasn't available (e.g. non-root API token),
    // try to create the sudo user directly via SSH + pct exec.
    // We first wait for the container to finish booting, then run provisioning
    // with retries so temporary boot-time unavailability doesn't cause failure.
    if (!hookScriptReady && sshUsername && sshPassword) {
      try {
        if (!sshService.isConfigured) {
          logger.warn(
            'SSH user provisioning skipped: PROXMOX_SSH_PASSWORD or PROXMOX_SSH_KEY not set. ' +
            'Container will have root-only access. ' +
            'Set these env vars to enable automatic sudo user creation, ' +
            'or SSH in as root using the root password shown in the UI.'
          );
        } else {
          // Wait for container to reach running state (up to 60s)
          const containerReady = await this.waitForContainerRunning(vmid, 60000);
          if (containerReady) {
            // Give SSH daemon a moment to start inside the container
            await new Promise(r => setTimeout(r, 5000));
            const hostname = `ws-${userId}-${vmid}`;
            await sshService.provisionContainerUser(vmid, sshUsername, sshPassword, hostname, allocated.ip);
            logger.info(`SSH-provisioned user ${sshUsername} in container ${vmid}`);
          } else {
            logger.warn(`Container ${vmid} did not become ready in time, SSH user provisioning skipped`);
          }
        }
      } catch (e) {
        logger.warn(`SSH user provisioning failed, container will use root-only access: ${e.message}`);
      }
    }

    return { vmid, ip: allocated.ip, rootPassword, status: 'created', config };
  }

  async startContainer(vmid) {
    await this.request('POST', `/nodes/${this.node}/lxc/${vmid}/status/start`);
  }

  async stopContainer(vmid) {
    await this.request('POST', `/nodes/${this.node}/lxc/${vmid}/status/stop`);
  }

  async restartContainer(vmid) {
    await this.request('POST', `/nodes/${this.node}/lxc/${vmid}/status/restart`);
  }

  async deleteContainer(vmid) {
    try {
      await this.stopContainer(vmid);
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      logger.warn(`Container ${vmid} may already be stopped: ${e.message}`);
    }
    try {
      await this.request('DELETE', `/nodes/${this.node}/lxc/${vmid}`);
    } catch (e) {
      // Container already removed on the Proxmox side — treat as success
      if (/does not exist|not found|404/i.test(e.message)) {
        logger.warn(`Container ${vmid} already removed from Proxmox`);
        return true;
      }
      throw e;
    }
    // Clean up the per-container creds file from storage (best-effort)
    await this.deleteCredsFile(vmid);
    return true;
  }

  async getContainerStatus(vmid) {
    const data = await this.request('GET', `/nodes/${this.node}/lxc/${vmid}/status/current`);
    return data.status;
  }

  /** Poll container status until it reaches 'running' or timeout expires. */
  async waitForContainerRunning(vmid, timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const status = await this.getContainerStatus(vmid);
        if (status === 'running') {
          return true;
        }
        logger.info(`Container ${vmid} status: ${status}, waiting...`);
      } catch (e) {
        logger.warn(`Could not check status for ${vmid}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    return false;
  }

  async getContainerIP(vmid, maxRetries = 10, delayMs = 3000) {
    // Poll for the container's IP with retries.
    // DHCP can take 10-30 seconds after the container starts, so we retry
    // several times before giving up.
    const extractIP = (net) => {
      if (!net) return null;
      if (typeof net === 'object') {
        if (net.inet) return net.inet.split('/')[0];
        if (net.inet6) return net.inet6.split('/')[0];
        return null;
      }
      return null;
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data = await this.request('GET', `/nodes/${this.node}/lxc/${vmid}/status/current`);
        const ip = extractIP(data?.net0);
        if (ip) return ip;
        if (attempt < maxRetries) {
          logger.info(`IP not yet assigned for ${vmid}, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        }
      } catch (e) {
        logger.warn(`Could not fetch status for ${vmid} (attempt ${attempt}/${maxRetries}): ${e.message}`);
        if (attempt >= maxRetries) return null;
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    return null;
  }

  // ── Hook script constants ──────────────────────────────────────────────────────

  get storage() {
    return process.env.PROXMOX_STORAGE || 'local';
  }

  get HOOK_SCRIPT_FILENAME() {
    return 'timesglobal-hook.sh';
  }

  get HOOK_SCRIPT_PATH() {
    return `${this.storage}:snippets/${this.HOOK_SCRIPT_FILENAME}`;
  }

  /** Build the hook script string. Uses join() instead of template literal to
   *  avoid escaping issues with bash variable references (${1}, ${VMID}, etc.). */
  get HOOK_SCRIPT() {
    return [
      '#!/bin/bash',
      '# TimesGlobal Cloud container hook script',
      '# Uploaded via Proxmox API by TimesGlobal Cloud backend',
      '# Creates a sudo user inside the container on post-start',
      '',
      'VMID="${1}"',
      'PHASE="${2}"',
      '',
      'if [ "${PHASE}" != "post-start" ]; then',
      '    exit 0',
      'fi',
      '',
      'logger -t "devcloud-hook" "Container ${VMID} post-start hook triggered"',
      '',
      'CREDS_FILE="/var/lib/vz/snippets/devcloud-${VMID}.creds"',
      '',
      'if [ ! -f "${CREDS_FILE}" ]; then',
      '    logger -t "devcloud-hook" "No creds file ${CREDS_FILE} for container ${VMID}, skipping"',
      '    exit 0',
      'fi',
      '',
      'read -r USERNAME < "${CREDS_FILE}"',
      'PASSWORD=$(tail -n +2 "${CREDS_FILE}" | head -1)',
      '',
      'if [ -z "${USERNAME}" ] || [ -z "${PASSWORD}" ]; then',
      '    logger -t "devcloud-hook" "Invalid creds in ${CREDS_FILE} for container ${VMID}"',
      '    rm -f "${CREDS_FILE}"',
      '    exit 1',
      'fi',
      '',
      'logger -t "devcloud-hook" "Creating user \'${USERNAME}\' in container ${VMID}"',
      '',
      '# Create user if not exists, set password, add to sudo',
      'pct exec "${VMID}" -- useradd -m -s /bin/bash "${USERNAME}" 2>/dev/null || true',
      'pct exec "${VMID}" -- usermod -aG sudo "${USERNAME}"',
      'echo "${USERNAME}:${PASSWORD}" | pct exec "${VMID}" -- chpasswd',
      '',
      'rm -f "${CREDS_FILE}"',
      '',
      'logger -t "devcloud-hook" "User \'${USERNAME}\' created successfully in container ${VMID}"',
      'exit 0',
      ''
    ].join('\n');
  }

  /**
   * Upload a file to Proxmox storage via the API (multipart/form-data).
   * Used for hook scripts and credential files.
   */
  async uploadFile(storageId, contentType, filename, content) {
    const url = `${this.baseUrl}/api2/json/nodes/${this.node}/storage/${storageId}/upload`;

    const formData = new FormData();
    const blob = new Blob([content], { type: 'text/plain' });
    formData.append('content', contentType);
    formData.append('filename', blob, filename);    const res = await withInsecureFetch(url, {
      method: 'POST',
      headers: { Authorization: `PVEAPIToken=${this.token}=${this.secret}` },
      body: formData
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Storage upload failed (${res.status}): ${this.sanitizeError(text)}`);
    }

    const data = await res.json();
    return data.data;
  }

  /** Upload the hook script to Proxmox storage (idempotent — overwrites if exists). */
  async ensureHookScript() {
    await this.uploadFile(this.storage, 'snippets', this.HOOK_SCRIPT_FILENAME, this.HOOK_SCRIPT);
    logger.info('Hook script uploaded to Proxmox storage');
  }

  /** Upload per-container credentials file that the hook script reads on post-start. */
  async uploadCredsFile(vmid, username, password) {
    const filename = `devcloud-${vmid}.creds`;
    const content = `${username}\n${password}`;
    await this.uploadFile(this.storage, 'snippets', filename, content);
    logger.info(`Creds file ${filename} uploaded for container ${vmid}`);
  }

  /** Delete a per-container credentials file from Proxmox storage. */
  async deleteCredsFile(vmid) {
    const filename = `devcloud-${vmid}.creds`;
    try {
      const url = `${this.baseUrl}/api2/json/nodes/${this.node}/storage/${this.storage}/content/${this.storage}:snippets/${filename}`;
      const res = await withInsecureFetch(url, {
        method: 'DELETE',
        headers: { Authorization: `PVEAPIToken=${this.token}=${this.secret}` }
      });
      if (!res.ok) {
        const text = await res.text();
        logger.warn(`Failed to delete creds file ${filename}: ${this.sanitizeError(text)}`);
      }
    } catch (e) {
      logger.warn(`Error deleting creds file ${filename}: ${e.message}`);
    }
  }

  /** Generate a cryptographically secure random password using Node.js crypto. */
  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(16);
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(bytes[i] % chars.length);
    }
    return password;
  }
}

export const proxmoxService = new ProxmoxService();

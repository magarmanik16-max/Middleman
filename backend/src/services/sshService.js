import { Client } from 'ssh2';
import { logger } from '../utils/logger.js';

class SSHService {
  get host() {
    return process.env.PROXMOX_SSH_HOST || process.env.PROXMOX_API_URL?.replace(/https?:\/\//, '').replace(/:8006$/, '') || '192.168.55.1';
  }
  get port() {
    return parseInt(process.env.PROXMOX_SSH_PORT, 10) || 22;
  }
  get username() {
    return process.env.PROXMOX_SSH_USER || 'root';
  }
  get password() {
    return process.env.PROXMOX_SSH_PASSWORD;
  }
  get privateKey() {
    return process.env.PROXMOX_SSH_KEY;
  }

  /** Check whether SSH credentials are configured (password or key). */
  get isConfigured() {
    return !!(this.password || this.privateKey);
  }

  /**
   * Run a command on the Proxmox host via SSH and return stdout.
   */
  async exec(command) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const config = {
        host: this.host,
        port: this.port,
        username: this.username,
        readyTimeout: 15000
      };

      if (this.privateKey) {
        config.privateKey = this.privateKey;
      } else if (this.password) {
        config.password = this.password;
      } else {
        // Try default key-based auth
      }

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          let stdout = '';
          let stderr = '';
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) {
              reject(new Error(`SSH command exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
            } else {
              resolve(stdout.trim());
            }
          }).on('data', (data) => {
            stdout += data.toString();
          }).stderr.on('data', (data) => {
            stderr += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        reject(err);
      });

      conn.connect(config);
    });
  }

  /**
   * Run a pct exec command on the Proxmox host with retries.
   */
  async execPct(vmid, cmd, retries = 3, delayMs = 5000) {
    const fullCmd = `pct exec ${vmid} -- ${cmd}`;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.exec(fullCmd);
      } catch (e) {
        if (attempt < retries) {
          logger.warn(`pct exec failed (attempt ${attempt}/${retries}), retrying in ${delayMs}ms: ${e.message.slice(0, 100)}`);
          await new Promise(r => setTimeout(r, delayMs));
        } else {
          throw e;
        }
      }
    }
  }

  /**
   * Write a text file on the Proxmox host via SSH.
   */
  async writeFile(remotePath, content) {
    const b64 = Buffer.from(content).toString('base64');
    const cmd = `mkdir -p $(dirname "${remotePath}") && echo "${b64}" | base64 -d > "${remotePath}"`;
    await this.exec(cmd);
    logger.info(`Wrote ${remotePath} (${content.length} bytes)`);
  }

  /**
   * Welcome MOTD displayed in /etc/motd on every login after provisioning.
   * Written directly during container provisioning (step 8) — no sudo needed.
   */
  getWelcomeMOTD(hostname) {
    const name = hostname || 'TimesGlobal Cloud Workspace';
    return [
      '╔══════════════════════════════════════════════════╗',
      '║          🚀 TimesGlobal Cloud                   ║',
      '║                                                  ║',
      `║  ${name.padEnd(46).slice(0, 46)}║`,
      '║                                                  ║',
      '║  Welcome to your personal dev environment!       ║',
      '║                                                  ║',
      '║  Use \"sudo apt-get install <package>\" to        ║',
      '║  install any tools you need.                     ║',
      '║                                                  ║',
      '╚══════════════════════════════════════════════════╝',
      ''
    ].join('\n');
  }

  /**
   * Build the post-login welcome script (placed in /etc/profile.d/).
   *
   * FIRST LOGIN:
   *   - Create a flag file in the user's home dir so this runs only once
   *   - Show a message reminding the user to change their default password
   *
   * SUBSEQUENT LOGINS:
   *   - Show the normal workspace welcome banner
   *
   * IMPORTANT: This script runs as the regular sudo USER, not root.
   * Never try to write to system paths like /etc/motd — they will fail
   * with Permission denied. Always use $HOME for the flag file.
   */
  getWelcomeScript(ip, hostname) {
    const ipPart = ip || '';
    const name = hostname || 'TimesGlobal Cloud Workspace';
    return [
      '#!/bin/bash',
      '# TimesGlobal Cloud welcome message',
      '# Runs on every interactive login shell.',
      '#',
      '# The MOTD at /etc/motd is already set to the welcome message',
      '# during provisioning. This script handles per-login banners.',
      '',
      'FLAG_FILE="$HOME/.devcloud-welcomed"',
      '',
      'if [ ! -f "$FLAG_FILE" ]; then',
      '  # ── First login ──',
      '  touch "$FLAG_FILE" 2>/dev/null',
      '  echo',
      '  echo "╔══════════════════════════════════════════════════╗"',
      '  echo "║     🔑  Welcome to TimesGlobal Cloud!           ║"',
      '  echo "║                                                  ║"',
      `  echo "║  ${name.slice(0, 35).padEnd(35)}║"`,
      '  echo "║                                                  ║"',
      '  echo "║  For security, please change your default        ║"',
      '  echo "║  password by running:                            ║"',
      '  echo "║                                                  ║"',
      '  echo "║      passwd                                       ║"',
      '  echo "║                                                  ║"',
      '  echo "║  You can verify your password expiry anytime      ║"',
      '  echo "║  with:  chage -l \$(whoami)                       ║"',
      '  echo "╚══════════════════════════════════════════════════╝"',
      '  echo',
      'fi',
      '',
      '# ── Subsequent logins: normal welcome banner ──',
      'if [ -n "$BASH_VERSION" ] || [ -n "$ZSH_VERSION" ]; then',
      '  echo',
      '  echo "╔══════════════════════════════════════════════════╗"',
      '  echo "║       ✅  Connected to TimesGlobal Cloud       ║"',
      '  echo "║                                                  ║"',
      `  echo "║  You\'re inside your personal dev environment!   ║"`,
      `  [ -n "${ipPart}" ] && echo "║  IP: ${ipPart.padEnd(42).slice(0, 42)}║"`,
      '  echo "║                                                  ║"',
      '  echo "║  - Full sudo access                              ║"',
      '  echo "║  - Ubuntu 24.04                                  ║"',
      '  echo '+"'║  - Install packages: sudo apt-get install <pkg>   ║'",
      '  echo "╚══════════════════════════════════════════════════╝"',
      '  echo',
      'fi',
      ''
    ].join('\n');
  }

  /**
   * Provision a sudo user inside a container using pct exec.
   * Creates the user, sets password, adds to sudo group.
   * Also ensures openssh-server is installed and configured for password auth.
   * Installs MOTD and welcome script to remind user to change default password.
   */
  async provisionContainerUser(vmid, username, password, hostname, ip) {
    // Write the WELCOME MOTD to /etc/motd so the warning never shows on subsequent logins.
    // The warning is handled by SSH's "You are required to change your password" message.
    const motdContent = this.getWelcomeMOTD(hostname);
    const motdB64 = Buffer.from(motdContent).toString('base64');

    const welcomeScript = this.getWelcomeScript(ip, hostname);
    const welcomeB64 = Buffer.from(welcomeScript).toString('base64');

    // IMPORTANT: When using pct exec, shell operators (|, ||, &&, >, ;)
    // are interpreted by the HOST's shell, not inside the container.
    // Commands using these operators MUST be wrapped in bash -c '...'
    // so they execute entirely inside the container.
    //
    // Also, any user-supplied strings (like passwords) can contain shell-special
    // characters (&, $, `, etc.) that bash interprets even inside bash -c.
    // Base64-encode such values so they pass through safely.

    // Base64 encode credentials to avoid shell escaping issues
    const credsB64 = Buffer.from(`${username}:${password}`).toString('base64');

    const commands = [
      // Step 1: Install/update openssh-server if not present (best-effort)
      "bash -c 'which sshd || (apt-get update -qq && apt-get install -y -qq openssh-server 2>/dev/null) || true'",
      // Step 2: Enable password authentication in sshd
      "sed -i 's/^#*\\s*PasswordAuthentication\\s.*/PasswordAuthentication yes/' /etc/ssh/sshd_config",
      "sed -i 's/^#*\\s*ChallengeResponseAuthentication\\s.*/ChallengeResponseAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true",
      // Step 3: Restart SSH to pick up config changes (uses || for fallback init systems)
      "bash -c 'systemctl restart sshd 2>/dev/null || service ssh restart 2>/dev/null || /etc/init.d/ssh restart 2>/dev/null || true'",
      // Step 4: Create the sudo user (ignore if already exists)
      `useradd -m -s /bin/bash ${username} 2>/dev/null || true`,
      // Step 5: Add to sudo group
      `usermod -aG sudo ${username}`,
      // Step 6: Set password via base64 to avoid &, $, etc. being interpreted by bash
      `bash -c 'echo ${credsB64} | base64 -d | chpasswd'`,
      // Step 7: Write welcome MOTD to /etc/motd
      `bash -c 'echo ${motdB64} | base64 -d > /etc/motd'`,
      // Step 8: Write profile.d welcome script
      `bash -c 'mkdir -p /etc/profile.d && echo ${welcomeB64} | base64 -d > /etc/profile.d/timesglobal-cloud-welcome.sh && chmod +x /etc/profile.d/timesglobal-cloud-welcome.sh'`
    ];

    for (const cmd of commands) {
      try {
        const result = await this.execPct(vmid, cmd);
        const truncated = cmd.slice(0, 100).replace(/\n/g, ' ');
        logger.info(`provisionUser: ${truncated}... -> ${(result || 'OK').slice(0, 80)}`);
      } catch (e) {
        logger.warn(`provisionUser command failed (may be harmless): ${e.message.slice(0, 120)}`);
      }
    }
  }
}

export const sshService = new SSHService();

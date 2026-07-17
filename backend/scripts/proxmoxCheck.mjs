import dotenv from 'dotenv';
import { proxmoxService } from '../src/services/proxmoxService.js';
dotenv.config();

async function listCTs() {
  const data = await proxmoxService.request('GET', `/nodes/${proxmoxService.node}/lxc`);
  return data.map(c => c.vmid);
}

async function main() {
  const before = await listCTs();
  console.log('CTs before:', before);

  console.log('--- create TEST container ---');
  const t0 = Date.now();
  const created = await proxmoxService.createContainer('verifyuser', { cpu: 1, memory: 512, disk: 10 });
  console.log(`createContainer OK after ${Date.now() - t0}ms, vmid=${created.vmid}`);
  const ip = await proxmoxService.getContainerIP(created.vmid);
  console.log(`TEST container ${created.vmid} IP: ${ip}`);

  console.log('--- cleanup: test + orphans 100,102,104 ---');
  for (const vmid of [created.vmid, ...[100, 102, 104]]) {
    try { await proxmoxService.deleteContainer(vmid); console.log(`deleted ${vmid}`); }
    catch (e) { console.log(`delete ${vmid} skipped: ${e.message}`); }
  }
  console.log('CTs after:', await listCTs());
  console.log('--- done ---');
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

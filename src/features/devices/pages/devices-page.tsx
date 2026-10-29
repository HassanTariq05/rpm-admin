import { useQuery } from '@tanstack/react-query'
import { Button } from '@heroui/react'
import { Battery, Bluetooth, Download, MonitorSmartphone, Plus, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/app/components/page-header'
import { StatusBadge } from '@/app/components/status-badge'
import { dashboardApi } from '@/features/dashboard/data/dashboard.api'

export function DevicesPage() {
  const { data: devices = [], isPending } = useQuery({ queryKey: ['devices'], queryFn: dashboardApi.getDevices })
  const connected = devices.filter((device) => device.status === 'Connected').length
  const delayed = devices.filter((device) => device.status === 'Sync delayed').length
  const offline = devices.filter((device) => device.status === 'Offline').length

  return <>
    <PageHeader eyebrow="Connected care" title="Device fleet" description="Track connected monitoring equipment, battery health, and device sync reliability." actions={<><Button variant="outline" onPress={() => toast.info('Connect device inventory export.')}><Download size={16} /> Export</Button><Button onPress={() => toast.info('Device pairing workflow is ready for integration.')}><Plus size={16} /> Pair device</Button></>} />
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[{ label: 'Connected', value: connected, icon: Wifi, className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' }, { label: 'Sync delayed', value: delayed, icon: RefreshCw, className: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' }, { label: 'Offline', value: offline, icon: WifiOff, className: 'text-slate-500 bg-slate-100 dark:bg-slate-800' }].map(({ label, value, icon: Icon, className }) => <div key={label} className="panel flex items-center gap-4 p-5"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${className}`}><Icon size={19} /></span><div><p className="text-2xl font-bold">{isPending ? '—' : value}</p><p className="text-xs muted">{label}</p></div></div>)}
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {devices.map((device) => <article key={device.id} className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><MonitorSmartphone size={20} /></span><StatusBadge status={device.status} /></div>
        <h2 className="mt-4 text-sm font-bold">{device.name}</h2><p className="mt-1 text-xs muted">{device.category} · {device.id}</p>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50"><p className="text-[10px] muted">Assigned patient</p><p className="mt-1 text-xs font-semibold">{device.patient}</p></div>
        <div className="mt-4 flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 muted"><Bluetooth size={14} /> Last sync</span><span className="font-medium">{device.lastSync}</span></div>
        <div className="mt-3"><div className="mb-1.5 flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 muted"><Battery size={14} /> Battery</span><span className={`font-bold ${device.battery < 20 ? 'text-rose-600' : ''}`}>{device.battery}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${device.battery < 20 ? 'bg-rose-500' : device.battery < 40 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${device.battery}%` }} /></div></div>
        <div className="mt-5 border-t border-[var(--border)] pt-4"><p className="text-[10px] muted">Serial: <span className="font-mono">{device.serial}</span></p><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" className="flex-1" onPress={() => toast.info(`Connect diagnostic history for ${device.id}.`)}>Diagnostics</Button><Button variant="ghost" size="sm" className="flex-1" onPress={() => toast.info(`Connect device management for ${device.id}.`)}>Manage</Button></div></div>
      </article>)}
    </div>
    {!isPending && devices.length === 0 ? <div className="panel p-12 text-center"><p className="font-semibold">No devices enrolled</p><p className="mt-1 text-sm muted">Pair the first device to start receiving readings.</p></div> : null}
  </>
}

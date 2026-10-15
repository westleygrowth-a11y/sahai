"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowDownRight, Bell, Building2, CheckCircle2, ChevronRight, ClipboardList, Clock3, GitBranch, LayoutDashboard, ListTodo, LogOut, Plus, Search, Settings2, ShieldCheck, Sparkles, TriangleAlert, Users, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brand } from "./brand";
import { STATUS_LABELS, ROLE_LABELS, type Serialize } from "@/lib/domain";
import { formatDate } from "@/lib/time";
import type { workspace, taskDetail } from "@/lib/workspace";
type Data = Serialize<Awaited<ReturnType<typeof workspace>>>;
type Task = Data["tasks"][number];
type Person = Data["people"][number];
type Detail = NonNullable<Serialize<Awaited<ReturnType<typeof taskDetail>>>>;
type Mutate = (operation: () => Promise<unknown>, success: string) => Promise<boolean>;
export async function api(path: string, body?: unknown, method = body === undefined ? "GET" : "POST") {
  const response = await fetch(`/api/${path}`, { method, cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (response.status === 401) { window.location.assign("/login"); throw new Error("Please sign in again."); }
  if (!response.ok) throw new Error(data.error || "The request failed.");
  return data;
}
const initials = (name: string) => name.split(" ").filter(w => w !== "Demo").slice(0,2).map(w => w[0]).join("");
const closed = (task: Task) => ["COMPLETED", "CANCELLED"].includes(task.status);
const localValue = (value: string) => new Date(new Date(value).getTime() + 5 * 3600000).toISOString().slice(0,16);
const fromLocal = (value: FormDataEntryValue | null) => new Date(`${value}:00+05:00`).toISOString();
function Field({ name, label, children }: { name: string; label: string; children: ReactNode }) {
  return <div className="field"><Label htmlFor={name}>{label}</Label>{children}</div>;
}
function Status({ status }: { status: string }) { return <Badge className={`status ${status}`}>{STATUS_LABELS[status] ?? status}</Badge>; }
function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }
function Modal({ title, description, children, close, large = false }: { title: string; description?: string; children: ReactNode; close: () => void; large?: boolean }) {
  return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className={large ? "!max-w-[1100px] !max-h-[92vh] overflow-y-auto bg-card p-0" : "!max-w-[700px] !max-h-[92vh] overflow-y-auto bg-card p-0"}>
    <DialogHeader className="border-b border-border p-6 pr-12"><DialogTitle>{title}</DialogTitle><DialogDescription>{description ?? "Changes are saved securely to the workspace."}</DialogDescription></DialogHeader>{children}
  </DialogContent></Dialog>;
}
export function Workspace({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState(initial.user.role === "SYSTEM_ADMIN" ? "Organization" : "Overview");
  const [view, setView] = useState("List");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [newTask, setNewTask] = useState<{ parent?: Task } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [personEditor, setPersonEditor] = useState<{ person?: Person } | null>(null);
  const [departmentEditor, setDepartmentEditor] = useState<{ department?: Data["departments"][number] } | null>(null);
  const [locationEditor, setLocationEditor] = useState(false);
  const [summary, setSummary] = useState("");
  const selected = data.tasks.find(t => t.id === selectedId);
  const person = (id: string) => data.people.find(p => p.id === id)?.name ?? "Outside your directory";
  const dept = (id: string | null) => data.departments.find(d => d.id === id)?.name ?? "Organization";
  const visible = data.tasks.filter(t => `${t.title} ${person(t.executorId)}`.toLowerCase().includes(search.toLowerCase()) && (!status || t.status === status) && (!department || t.departmentId === department));
  const mutate: Mutate = async (operation, success) => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try { await operation(); setData(await api("workspace")); setNotice(success); return true; }
    catch(e) { setError(e instanceof Error ? e.message : "Please try again."); return false; }
    finally { busyRef.current = false; setBusy(false); }
  };
  const nav = [{ name: "Overview", icon: LayoutDashboard }, { name: "Tasks", icon: ListTodo }, { name: "Organization", icon: Users },
    { name: "Notifications", icon: Bell }, { name: "Automation", icon: Sparkles }, { name: "Settings", icon: Settings2 }];
  const filteredNav = data.user.role === "SYSTEM_ADMIN" ? nav.filter(n => ["Organization", "Settings"].includes(n.name)) : nav;
  const unread = data.notifications.filter(n => !n.readAt).length;
  const title = tab === "Overview" ? data.user.role === "CEO" ? "Command center" : data.user.role === "EMPLOYEE" ? "My workspace" : "Division overview" : tab;
  return <div className="shell"><aside className="sidebar"><Brand/><div className="mobile-logo"><Brand/></div><nav className="nav" aria-label="Main navigation">{filteredNav.map(({ name, icon: Icon }) => <button key={name} className={tab === name ? "active" : ""} aria-current={tab === name ? "page" : undefined} onClick={() => { setTab(name); setError(""); setNotice(""); }}><Icon/>{name}{name === "Notifications" && unread > 0 && <Badge variant="secondary">{unread}</Badge>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="flex-row"><span className="avatar">{initials(data.user.name)}</span><div><p style={{ color: "#e3ecff" }}>{data.user.name}</p><p>{ROLE_LABELS[data.user.role]}</p></div></div>
      {data.demo && <Badge variant="outline">Demonstration workspace</Badge>}<p>Faisalabad, Pakistan<br/>Asia/Karachi · PKT</p>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => mutate(async () => { await api("logout", {}); window.location.assign("/login"); }, "Signed out.")}><LogOut data-icon="inline-start"/>Sign out</Button>
    </div></aside><main className="main"><header className="topbar"><div><h1>{title}</h1><p className="muted small" style={{ marginTop: 6 }}>{data.demo ? "Demonstration workspace · " : ""}{data.institutions.find(i => i.id === data.user.institutionId)?.name}</p></div><div className="flex-row wrap"><Badge variant="outline">Asia/Karachi · PKT</Badge>{data.assignableIds.length > 0 && <Button onClick={() => setNewTask({})}><Plus data-icon="inline-start"/>New task</Button>}</div></header>
    <div className="content" aria-busy={busy}>{error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}{notice && <div className="success-message" role="status">{notice}</div>}
      {(tab === "Overview" || tab === "Tasks") && <>
        {tab === "Overview" && <div className="metrics">{[{ label: "Active tasks", value: data.metrics.active, icon: ClipboardList, color: "" }, { label: "Overdue", value: data.metrics.overdue, icon: TriangleAlert, color: "red" }, { label: "Blocked", value: data.metrics.blocked, icon: Clock3, color: "amber" }, { label: "Awaiting review", value: data.metrics.review, icon: ShieldCheck, color: "purple" }].map(m => <div className="panel metric" key={m.label}><span className={`metric-icon ${m.color}`}><m.icon size={21}/></span><div><strong>{m.value}</strong><span className="muted small">{m.label}</span></div></div>)}</div>}
        <div className={tab === "Overview" ? "workspace-grid" : ""}><div className="stack"><section className="panel"><div className="panel-title"><h2>{tab === "Overview" ? "Assignments in your scope" : "Task workspace"}</h2><div className="filters"><div className="search"><Input aria-label="Search tasks" placeholder="Search tasks or owners…" value={search} onChange={e => setSearch(e.target.value)}/></div><select aria-label="Filter department" value={department} onChange={e => setDepartment(e.target.value)}><option value="">All departments</option>{data.departments.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select><select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></div></div>
          {tab === "Tasks" && <div className="filters" style={{ padding: "12px 18px" }}>{["List", "Tree", "Kanban"].map(v => <Button key={v} size="sm" variant={view === v ? "secondary" : "ghost"} onClick={() => setView(v)}>{v}</Button>)}</div>}
          {visible.length === 0 ? <Empty>No assignments match this view.</Empty> : tab === "Tasks" && view === "Tree" ? <div className="panel-body"><TaskTree tasks={visible} onSelect={setSelectedId} person={person}/></div> : tab === "Tasks" && view === "Kanban" ? <div className="panel-body kanban">{Object.entries(STATUS_LABELS).map(([key,label]) => <section className="kanban-column" key={key}><h3>{label} <span className="muted">{visible.filter(t => t.status === key).length}</span></h3>{visible.filter(t => t.status === key).map(t => <div className="kanban-card" key={t.id}><button className="task-link" onClick={() => setSelectedId(t.id)}>{t.title}</button><p className="muted small">{person(t.executorId)}</p><p className="muted small">{formatDate(t.dueAt)}</p></div>)}</section>)}</div> : <div className="table-scroll"><table className="task-table"><thead><tr><th>Task</th><th>Executor</th><th>Department</th><th>Status</th><th>Due · PKT</th></tr></thead><tbody>{visible.map(t => <tr key={t.id}><td><div className="task-title">{t.parentId && <ArrowDownRight size={14} className="muted"/>}<button className="task-link" onClick={() => setSelectedId(t.id)}>{t.title}</button></div><p className="small muted" style={{ marginTop: 4 }}>{t.priority}{t.requiredEvidence ? " · Evidence required" : ""}</p><p className="mobile-date small muted">Due {formatDate(t.dueAt)} PKT</p></td><td><div className="flex-row"><span className="avatar small" style={{ width: 27, height: 27 }}>{initials(person(t.executorId))}</span>{person(t.executorId).replace("Demo ", "")}</div></td><td>{dept(t.departmentId)}</td><td><Status status={t.status}/></td><td className={!closed(t) && new Date(t.dueAt) < new Date() ? "overdue" : "muted"} style={{ whiteSpace: "nowrap" }}>{formatDate(t.dueAt)}</td></tr>)}</tbody></table></div>}
        </section>{tab === "Overview" && <><div className="two-column">{(data.user.role === "EMPLOYEE" ? [] : data.user.role === "FINANCE_DIRECTOR" ? ["Finance"] : data.user.role === "OPERATIONS_DIRECTOR" ? ["Operations"] : ["Finance", "Operations"]).map(division => {
          const rootIds = new Set(data.departments.filter(d => d.name === division).map(d => d.id));
          let changed = true; while (changed) { changed = false; for (const d of data.departments) if (d.parentId && rootIds.has(d.parentId) && !rootIds.has(d.id)) { rootIds.add(d.id); changed = true; } }
          const departments = data.departments.filter(d => rootIds.has(d.id) && d.name !== division);
          return <section className="panel" key={division}><div className="panel-title"><h2>{division} division</h2><Badge variant="outline">Open workload</Badge></div><div className="panel-body stack">{departments.length ? departments.map(d => { const count = data.tasks.filter(t => t.departmentId === d.id && !closed(t)).length; return <div key={d.id}><div className="flex-row between small"><span>{d.name}</span><span className="muted">{count} tasks</span></div><div className="bar" style={{ marginTop: 8 }}><div style={{ width: `${Math.min(100, count / Math.max(data.metrics.active, 1) * 100)}%` }}/></div></div>; }) : <p className="muted small">No visible departments.</p>}</div></section>;
        })}</div><section className="panel"><div className="panel-title"><h2>Recent activity</h2><span className="muted small">{data.metrics.completedThisWeek} completed this week</span></div><div className="panel-body"><ul className="timeline">{data.history.slice(0,5).map(h => <li key={h.id}><p className="small">{h.message}</p><p className="muted small">{formatDate(h.createdAt)} · {h.actorId === "rules-engine" ? "Rules engine · simulated" : person(h.actorId)}</p></li>)}</ul>{!data.history.length && <Empty>No activity yet.</Empty>}</div></section></>}
      </div>{tab === "Overview" && <aside className="stack"><section className="panel"><div className="panel-title"><h2>Priority attention</h2><TriangleAlert size={17}/></div>{data.tasks.filter(t => !closed(t) && (t.status === "BLOCKED" || t.status === "SUBMITTED_FOR_REVIEW" || new Date(t.dueAt) < new Date())).slice(0,5).map(t => <div className="attention" key={t.id}><Clock3/><div><button className="task-link small" onClick={() => setSelectedId(t.id)}>{t.title}</button><p className="muted small">{STATUS_LABELS[t.status]} · {person(t.executorId).replace("Demo ", "")}</p></div></div>)}{!data.metrics.overdue && !data.metrics.blocked && !data.metrics.review && <Empty>No urgent items in your scope.</Empty>}</section><section className="panel"><div className="panel-title"><h2>Operations briefing</h2><Badge variant="outline">Simulated</Badge></div><div className="panel-body stack"><p className="muted small">Rules-based summary. No live AI, inferred progress, or external messages.</p><p className="small">{summary || `${data.metrics.active} open assignments. ${data.metrics.overdue} overdue and ${data.metrics.blocked} blocked in your scope.`}</p><Button variant="outline" size="sm" disabled={busy} onClick={() => mutate(async () => { const result = await api("briefing"); setSummary(result.text); }, "Rules-based briefing refreshed.")}><Sparkles data-icon="inline-start"/>Refresh briefing</Button></div></section></aside>}</div>
      </>}
      {tab === "Organization" && <><div className="panel panel-body flex-row between wrap"><div><h2>Reporting hierarchy</h2><p className="muted small">Assignments and delegation never change formal reporting lines. Principals are Academic Department Heads.</p></div>{data.user.role === "CEO" && <Button onClick={() => setPersonEditor({})}><Plus data-icon="inline-start"/>Add employee</Button>}</div>
        <div className="two-column"><section className="panel"><div className="panel-title"><h2>People & reporting lines</h2><Badge variant="outline">{data.people.length} visible people</Badge></div><div className="panel-body"><PeopleTree people={data.people} edit={data.user.role === "CEO" ? p => setPersonEditor({ person: p }) : undefined}/></div></section>
        <div className="stack"><section className="panel"><div className="panel-title"><h2>Institutions & campuses</h2>{["CEO", "SYSTEM_ADMIN"].includes(data.user.role) && <Button size="sm" variant="outline" onClick={() => setLocationEditor(true)}>Add location</Button>}</div><div className="panel-body stack">{data.institutions.map(i => <div key={i.id}><h3>{i.name}</h3>{i.demo && <Badge variant="outline">Demo data</Badge>}{data.campuses.filter(c => c.institutionId === i.id).map(c => <p className="muted small" key={c.id}>↳ {c.name}</p>)}</div>)}</div></section><section className="panel"><div className="panel-title"><h2>Departments</h2>{["CEO", "SYSTEM_ADMIN"].includes(data.user.role) && <Button size="sm" variant="outline" onClick={() => setDepartmentEditor({})}>Add department</Button>}</div><div className="panel-body stack">{data.departments.map(d => <div className="flex-row between" key={d.id}><div><h3>{d.name}</h3><p className="muted small">{d.parentId ? `Under ${dept(d.parentId)}` : "Division"}</p></div>{["CEO", "SYSTEM_ADMIN"].includes(data.user.role) && <Button variant="ghost" size="sm" onClick={() => setDepartmentEditor({ department: d })}>Edit</Button>}</div>)}</div></section></div></div></>}
      {tab === "Notifications" && <section className="panel"><div className="panel-title"><h2>Notification center</h2><Badge variant="outline">In-app only</Badge></div>{data.notifications.length === 0 ? <Empty>No notifications yet.</Empty> : data.notifications.map(n => <div className="attention" key={n.id}><Bell/><div style={{ flex: 1 }}><p>{n.message}</p><p className="muted small">{formatDate(n.createdAt)}{n.simulated ? " · Simulated notification" : " · Internal notification"}</p>{n.taskId && <Button variant="link" size="sm" onClick={() => setSelectedId(n.taskId)}>Open assignment</Button>}</div>{!n.readAt && <Button variant="outline" size="sm" disabled={busy} onClick={() => mutate(() => api("notifications/read", { id: n.id }), "Notification marked as read.")}>Mark read</Button>}</div>)}</section>}
      {tab === "Automation" && <><section className="panel panel-body stack"><div className="flex-row between wrap"><h2>Rules-based follow-up engine</h2><Badge variant="outline">Simulation · no live AI</Badge></div><p className="muted">The persistent worker checks deadlines every 15 minutes, honors configured working hours and holidays, limits reminders, and escalates through actual reporting lines. All generated notifications stay inside SAH AI.</p><p className="muted small">Default policy is a development assumption: Monday–Friday, 09:00–17:00 PKT, one reminder per task per day, escalation every 24 overdue hours. Confirm your institution’s policy before operational use.</p>{data.user.role === "CEO" && <Button style={{ alignSelf: "start" }} disabled={busy} onClick={() => mutate(async () => { const result = await api("automation/run", {}); setSummary(result.skipped || `${result.reminders} reminders and ${result.escalations} escalation events created.`); }, "Follow-up simulation checked.")}>Run follow-up simulation</Button>}{summary && <p role="status">{summary}</p>}</section><section className="panel"><div className="panel-title"><h2>Escalation history</h2><Badge variant="outline">Simulated</Badge></div>{data.escalations.length ? data.escalations.map(e => <div className="attention" key={e.id}><GitBranch/><div><p>{data.tasks.find(t => t.id === e.taskId)?.title}</p><p className="muted small">Level {e.level} → {person(e.toUserId)} · {formatDate(e.createdAt)}</p></div></div>) : <Empty>No escalation events in your scope.</Empty>}</section><section className="panel panel-body stack"><h2>Future integrations</h2><p className="muted">OpenAI tool calling, ZKTeco attendance, WhatsApp/email, and campus maintenance are later phases. No device, biometric, or messaging connection is active.</p></section></>}
      {tab === "Settings" && <><section className="panel panel-body stack"><h2>Account & workspace</h2><p>{data.user.name} · {data.user.email}</p><p className="muted">{ROLE_LABELS[data.user.role]} · {data.user.title}</p><p className="muted small">Sessions expire after eight hours. Reporting-line, permission, or password changes revoke existing sessions. Technical administration does not grant operational task access.</p><Button variant="outline" style={{ alignSelf: "start" }} disabled={busy} onClick={() => mutate(async () => { await api("logout", {}); window.location.assign("/login"); }, "Signed out.")}>Sign out</Button></section>{data.user.role === "CEO" && <PolicyForm data={data} busy={busy} mutate={mutate}/>}</>}
    </div></main>
    {newTask && <NewTask data={data} parent={newTask.parent} close={() => setNewTask(null)} busy={busy} mutate={mutate}/>}
    {selected && <TaskDialog key={selected.id} task={selected} data={data} close={() => setSelectedId(null)} selectTask={setSelectedId} delegate={() => { setSelectedId(null); setNewTask({ parent: selected }); }} busy={busy} mutate={mutate}/>}
    {personEditor && <PersonForm data={data} person={personEditor.person} close={() => setPersonEditor(null)} busy={busy} mutate={mutate}/>}
    {departmentEditor && <DepartmentForm data={data} department={departmentEditor.department} close={() => setDepartmentEditor(null)} busy={busy} mutate={mutate}/>}
    {locationEditor && <LocationForm data={data} close={() => setLocationEditor(false)} busy={busy} mutate={mutate}/>}
  </div>;
}
function TaskTree({ tasks, onSelect, person }: { tasks: Task[]; onSelect: (id: string) => void; person: (id: string) => string }) {
  function node(task: Task, seen: Set<string>): ReactNode {
    if (seen.has(task.id)) return null;
    const next = new Set(seen).add(task.id);
    return <div className={`tree-node ${!task.parentId || !tasks.some(t => t.id === task.parentId) ? "root" : ""}`} key={task.id}><div className="flex-row wrap"><button className="task-link" onClick={() => onSelect(task.id)}>{task.title}</button><Status status={task.status}/></div><p className="muted small">Executor: {person(task.executorId)} · Accountable: {person(task.accountableOwnerId)}</p>{tasks.filter(t => t.parentId === task.id).map(t => node(t,next))}</div>;
  }
  return <>{tasks.filter(t => !t.parentId || !tasks.some(p => p.id === t.parentId)).map(t => node(t,new Set()))}</>;
}
function PeopleTree({ people, edit }: { people: Person[]; edit?: (p: Person) => void }) {
  function node(person: Person, seen: Set<string>): ReactNode {
    if (seen.has(person.id)) return null;
    const next = new Set(seen).add(person.id);
    return <div className={`tree-node ${!person.managerId || !people.some(p => p.id === person.managerId) ? "root" : ""}`} key={person.id}><div className="person"><span className="avatar small">{initials(person.name)}</span><div style={{ flex: 1 }}><h3>{person.name}</h3><p className="muted small">{person.title}{!person.active ? " · Inactive" : ""}</p></div>{edit && <Button size="sm" variant="ghost" onClick={() => edit(person)}>Edit</Button>}</div>{people.filter(p => p.managerId === person.id).map(p => node(p,next))}</div>;
  }
  return <>{people.filter(p => !p.managerId || !people.some(m => m.id === p.managerId)).map(p => node(p,new Set()))}</>;
}
function NewTask({ data, parent, close, busy, mutate }: { data: Data; parent?: Task; close: () => void; busy: boolean; mutate: Mutate }) {
  const [formError, setFormError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    try {
      const body = { title: f.get("title"), instructions: f.get("instructions"), executorId: f.get("executorId"), dueAt: fromLocal(f.get("dueAt")), priority: f.get("priority"), requiredEvidence: f.get("requiredEvidence"), sensitivity: parent?.sensitivity ?? f.get("sensitivity"), parentId: parent?.id, mandatory: f.get("mandatory") === "on", draft: f.get("draft") === "on" };
      const ok = await mutate(async () => { try { await api("tasks", body); } catch(e) { setFormError(e instanceof Error ? e.message : "Unable to save."); throw e; } }, parent ? "Subtask delegated. Original accountability retained." : "Assignment saved.");
      if (ok) close();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Check the deadline."); }
  }
  return <Modal title={parent ? "Delegate a subtask" : "Create assignment"} description={parent ? `Parent: ${parent.title}. Deadline must not exceed ${formatDate(parent.dueAt)} PKT.` : "Choose an authorized executor. Reporting relationships stay unchanged."} close={close}><form onSubmit={submit} className="modal-content">
    {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
    <Field name="title" label="Task title"><Input id="title" name="title" required minLength={3} maxLength={180}/></Field>
    <Field name="instructions" label="Detailed instructions"><Textarea id="instructions" name="instructions" required minLength={3} maxLength={10000} rows={3}/></Field>
    <div className="two-column"><Field name="executorId" label="Assigned executor"><select id="executorId" name="executorId" required defaultValue=""><option value="" disabled>Choose a person</option>{data.people.filter(p => data.assignableIds.includes(p.id) && (!parent || p.institutionId === parent.institutionId)).map(p => <option key={p.id} value={p.id}>{p.name} · {p.title}</option>)}</select></Field>
      <Field name="dueAt" label="Due date & time · Asia/Karachi"><Input id="dueAt" name="dueAt" type="datetime-local" required max={parent ? localValue(parent.dueAt) : undefined} defaultValue={parent ? localValue(parent.dueAt) : undefined}/></Field></div>
    <div className="two-column"><Field name="priority" label="Priority"><select id="priority" name="priority" defaultValue="NORMAL">{["LOW","NORMAL","HIGH","CRITICAL"].map(p => <option key={p}>{p}</option>)}</select></Field><Field name="sensitivity" label="Record classification"><select id="sensitivity" name="sensitivity" disabled={!!parent} defaultValue={parent?.sensitivity ?? "STANDARD"}><option value="STANDARD">Standard operations</option>{data.user.canAccessHr && <option value="HR">Restricted HR</option>}{data.user.canAccessFinance && <option value="FINANCE">Restricted finance</option>}</select></Field></div>
    <Field name="requiredEvidence" label="Required evidence"><Textarea id="requiredEvidence" name="requiredEvidence" placeholder="Leave blank if no upload is required." maxLength={2000}/></Field>
    {parent && <label className="flex-row"><input name="mandatory" type="checkbox" defaultChecked/>Mandatory subtask before parent completion</label>}
    {!parent && <label className="flex-row"><input name="draft" type="checkbox"/>Save as draft without notifying the executor</label>}
    <p className="muted small">Completion requires a separate authorized human review. Creating a subtask preserves the original accountable owner.</p>
    <div className="flex-row" style={{ justifyContent: "flex-end" }}><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button disabled={busy} type="submit">{busy ? "Saving…" : parent ? "Delegate subtask" : "Create task"}</Button></div>
  </form></Modal>;
}
function TaskDialog({ task, data, close, selectTask, delegate, busy, mutate }: { task: Task; data: Data; close: () => void; selectTask: (id: string) => void; delegate: () => void; busy: boolean; mutate: Mutate }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [action, setAction] = useState("comment");
  useEffect(() => {
    let alive = true;
    api(`tasks/${task.id}`).then(d => { if (alive) setDetail(d); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [task.id, task.version]);
  const person = (id: string) => data.people.find(p => p.id === id)?.name ?? "Outside your directory";
  const lifecycle: Record<string,string[]> = { ASSIGNED: ["ACKNOWLEDGED"], ACKNOWLEDGED: ["IN_PROGRESS","BLOCKED"], IN_PROGRESS: ["BLOCKED","SUBMITTED_FOR_REVIEW"], BLOCKED: ["IN_PROGRESS"], CHANGES_REQUESTED: ["IN_PROGRESS","BLOCKED","SUBMITTED_FOR_REVIEW"] };
  async function perform(body: unknown, message: string) {
    setError(""); setFeedback("");
    const ok = await mutate(async () => { try { await api(`tasks/${task.id}`, body, "PATCH"); } catch(e) { setError(e instanceof Error ? e.message : "Unable to update."); throw e; } }, message);
    if (ok) setFeedback(message);
    return ok;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const f = new FormData(form);
    let body: Record<string,unknown> = { action, note: f.get("note"), version: task.version };
    if (Object.keys(STATUS_LABELS).includes(action)) body = { ...body, action: "status", status: action };
    if (["APPROVED","CHANGES_REQUESTED"].includes(action)) body = { ...body, action: "review", decision: action };
    if (action === "extension") body.dueAt = fromLocal(f.get("extensionDueAt"));
    if (action === "reassign") body.executorId = f.get("newExecutor");
    if (await perform(body, "Task updated. Activity recorded.")) { form.reset(); setAction("comment"); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const f = new FormData(form);
    const ok = await mutate(async () => {
      const response = await fetch(`/api/tasks/${task.id}/evidence`, { method: "POST", body: f });
      const result = await response.json();
      if (!response.ok) { setError(result.error); throw new Error(result.error); }
    }, "Evidence securely uploaded.");
    if (ok) { form.reset(); setFeedback("Evidence securely uploaded."); }
  }
  const actions = [{ value: "comment", label: "Post an update / comment" }];
  if (task.canExecute) for (const next of lifecycle[task.status] ?? []) actions.push({ value: next, label: STATUS_LABELS[next] });
  if (task.canManage && task.status === "DRAFT") actions.push({ value: "ASSIGNED", label: "Publish assignment" });
  if (task.canManage && !closed(task)) {
    if (task.status === "SUBMITTED_FOR_REVIEW" && !task.canExecute) actions.push({ value: "APPROVED", label: "Approve completion" }, { value: "CHANGES_REQUESTED", label: "Request corrections" });
    if (task.status !== "SUBMITTED_FOR_REVIEW") actions.push({ value: "reassign", label: "Reassign executor" });
    actions.push({ value: "request-update", label: "Request an update" }, { value: "CANCELLED", label: "Cancel task" });
  }
  if (!closed(task) && (task.canExecute || task.canManage)) actions.push({ value: "extension", label: "Request deadline extension" });
  return <Modal title={task.title} description={`${task.id.slice(0,8)} · ${task.priority} priority · ${task.sensitivity} classification`} close={close} large><div className="modal-content">
    {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
    {feedback && <div className="success-message" role="status">{feedback}</div>}
    <div className="flex-row between wrap"><Status status={task.status}/><div className="flex-row"><span className={!closed(task) && new Date(task.dueAt) < new Date() ? "overdue small" : "muted small"}>Due {formatDate(task.dueAt)} PKT</span>{task.canDelegateTask && !closed(task) && !["DRAFT","SUBMITTED_FOR_REVIEW"].includes(task.status) && <Button size="sm" onClick={delegate}><GitBranch data-icon="inline-start"/>Delegate</Button>}</div></div>
    <div className="two-column"><div className="stack"><section className="panel panel-body stack"><h2>Assignment</h2><p className="detail-copy">{task.instructions}</p><div className="two-column small"><div><p className="muted">Accountable owner</p><p>{person(task.accountableOwnerId)}</p></div><div><p className="muted">Assigned executor</p><p>{person(task.executorId)}</p></div><div><p className="muted">Originating requester</p><p>{person(task.originatingAssignerId)}</p></div><div><p className="muted">Formal reporting manager</p><p>{task.reportingManagerId ? person(task.reportingManagerId) : "Top-level role"}</p></div></div><p className="small muted">{task.requiredEvidence ? `Required evidence: ${task.requiredEvidence}` : "No evidence upload required for this assignment."}</p></section>
    <section className="panel"><div className="panel-title"><h2>Delegation tree</h2></div><div className="panel-body"><TaskTree tasks={data.tasks.filter(t => t.rootId === task.rootId)} onSelect={selectTask} person={person}/><p className="muted small" style={{ marginTop: 12 }}>Only assignments within your authorized visibility are shown. Closing a child never automatically closes its parent.</p></div></section>
    <section className="panel"><div className="panel-title"><h2>Evidence</h2><span className="muted small">2 MB maximum per file</span></div><div className="panel-body stack">{detail?.attachments.length ? detail.attachments.map(a => <a key={a.id} className="small" href={`/api/evidence/${a.id}`} download>{a.name} · {Math.ceil(a.size / 1024)} KB ↗</a>) : <p className="muted small">No evidence uploaded.</p>}
    {!closed(task) && task.status !== "SUBMITTED_FOR_REVIEW" && (task.canExecute || task.canManage) && <form onSubmit={upload} className="stack"><Field name="evidenceFile" label="Upload evidence"><Input id="evidenceFile" type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.txt" required/></Field><Button variant="outline" size="sm" disabled={busy} type="submit">Upload evidence</Button></form>}</div></section>
    </div><div className="stack"><form className="panel panel-body stack" onSubmit={submit}><h2>Update assignment</h2><Field name="taskAction" label="Action"><select id="taskAction" value={action} onChange={e => setAction(e.target.value)}>{actions.map(a => <option value={a.value} key={a.value}>{a.label}</option>)}</select></Field>
      {action === "extension" && <Field name="extensionDueAt" label="Requested deadline · PKT"><Input id="extensionDueAt" name="extensionDueAt" type="datetime-local" required min={localValue(task.dueAt)}/></Field>}
      {action === "reassign" && <Field name="newExecutor" label="New executor"><select name="newExecutor" id="newExecutor" required defaultValue=""><option disabled value="">Choose authorized employee</option>{data.people.filter(p => data.assignableIds.includes(p.id) && p.institutionId === task.institutionId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
      <Field name="taskNote" label="Update / reason"><Textarea id="taskNote" name="note" required minLength={3} maxLength={5000} rows={3} placeholder="Describe progress, a specific blocker, or your review decision."/></Field><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save update"}</Button><p className="muted small">Updates are appended to immutable history. Status and approval permissions are checked on the server.</p></form>
      {detail?.extensionRequests.filter(r => r.status === "PENDING").map(r => <section className="panel panel-body stack" key={r.id}><h3>Pending deadline request</h3><p className="small">{r.reason}</p><p className="muted small">Requested: {formatDate(r.requestedAt)} PKT</p>{task.canManage && !task.canExecute && r.requesterId !== data.user.id ? <div className="flex-row"><Button size="sm" disabled={busy} onClick={() => perform({ action: "extension-review", requestId: r.id, approve: true, version: task.version, note: "Approved the requested deadline extension." }, "Extension approved.")}>Approve extension</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => perform({ action: "extension-review", requestId: r.id, approve: false, version: task.version, note: "Rejected the requested deadline extension." }, "Extension rejected.")}>Reject</Button></div> : <p className="muted small">Awaiting authorized manager review.</p>}</section>)}
      <section className="panel"><div className="panel-title"><h2>Activity history</h2><Activity size={16}/></div><div className="panel-body">{detail ? <ul className="timeline">{detail.activities.map(a => <li key={a.id}><p className="small">{a.message}</p><p className="muted small">{formatDate(a.createdAt)} · {a.actorId === "rules-engine" ? "Rules engine · simulation" : person(a.actorId)}</p></li>)}</ul> : <p className="muted small">Loading history…</p>}</div></section>
    </div></div>
  </div></Modal>;
}
function PersonForm({ data, person, close, busy, mutate }: { data: Data; person?: Person; close: () => void; busy: boolean; mutate: Mutate }) {
  const [institutionId, setInstitutionId] = useState(person?.institutionId ?? data.user.institutionId);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    const body = { id: person?.id, name: f.get("personName"), email: f.get("personEmail"), title: f.get("personTitle"), password: f.get("personPassword") || undefined,
      role: f.get("personRole"), institutionId, departmentId: f.get("personDepartment") || null, campusId: f.get("personCampus") || null, managerId: f.get("personManager") || null,
      canDelegate: f.get("canDelegate") === "on", canCrossDepartment: f.get("canCrossDepartment") === "on", canAccessHr: f.get("canAccessHr") === "on", canAccessFinance: f.get("canAccessFinance") === "on", active: f.get("active") === "on" };
    const ok = await mutate(async () => { try { await api("organization/employees", body); } catch(e) { setError(e instanceof Error ? e.message : "Unable to save."); throw e; } }, "Employee saved. Reporting changes audited and previous sessions revoked.");
    if (ok) close();
  }
  return <Modal title={person ? "Edit employee" : "Add employee"} close={close} description="Management permissions are granted by the CEO. Changing existing accounts revokes their sessions."><form onSubmit={submit} className="modal-content">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="two-column"><Field name="personName" label="Full name"><Input id="personName" name="personName" defaultValue={person?.name} required minLength={2} maxLength={100}/></Field><Field name="personEmail" label="Email"><Input id="personEmail" name="personEmail" type="email" defaultValue={person?.email} required/></Field></div>
    <div className="two-column"><Field name="personTitle" label="Job title"><Input id="personTitle" name="personTitle" defaultValue={person?.title} placeholder="e.g. Principal · Academic Department Head" required minLength={2} maxLength={100}/></Field><Field name="personRole" label="Authorization role"><select id="personRole" name="personRole" defaultValue={person?.role ?? "EMPLOYEE"}>{Object.entries(ROLE_LABELS).filter(([key]) => key !== "CEO" || person?.role === "CEO").map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div>
    <Field name="personInstitution" label="Institution"><select id="personInstitution" value={institutionId} disabled={!!person} onChange={e => setInstitutionId(e.target.value)}>{data.institutions.map(i => <option value={i.id} key={i.id}>{i.name}</option>)}</select></Field>
    <div className="two-column"><Field name="personDepartment" label="Department"><select id="personDepartment" name="personDepartment" defaultValue={person?.departmentId ?? ""}><option value="">No department</option>{data.departments.filter(d => d.institutionId === institutionId).map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></Field><Field name="personCampus" label="Campus"><select id="personCampus" name="personCampus" defaultValue={person?.campusId ?? ""}><option value="">No campus</option>{data.campuses.filter(c => c.institutionId === institutionId).map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></Field></div>
    <Field name="personManager" label="Reports to"><select id="personManager" name="personManager" defaultValue={person?.managerId ?? ""}><option value="">No manager · top-level / technical role</option>{data.people.filter(p => p.active && p.id !== person?.id && p.role !== "SYSTEM_ADMIN" && (p.institutionId === institutionId || p.role === "CEO")).map(p => <option value={p.id} key={p.id}>{p.name} · {p.title}</option>)}</select></Field>
    <Field name="personPassword" label={person ? "New password · leave blank to keep current" : "Initial password · minimum 12 characters"}><Input id="personPassword" name="personPassword" type="password" minLength={12} maxLength={128} required={!person} autoComplete="new-password"/></Field>
    <div className="two-column">{[{ name: "canDelegate", label: "May delegate to authorized reports", value: person?.canDelegate }, { name: "canCrossDepartment", label: "Explicit cross-department employee assignment", value: person?.canCrossDepartment }, { name: "canAccessHr", label: "Restricted HR record access", value: person?.canAccessHr }, { name: "canAccessFinance", label: "Restricted finance record access", value: person?.canAccessFinance }].map(flag => <label className="flex-row small" key={flag.name}><input name={flag.name} type="checkbox" defaultChecked={flag.value ?? false}/>{flag.label}</label>)}</div>
    <label className="flex-row small"><input name="active" type="checkbox" defaultChecked={person?.active ?? true}/>Account active</label><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save employee"}</Button>
  </form></Modal>;
}
function DepartmentForm({ data, department, close, busy, mutate }: { data: Data; department?: Data["departments"][number]; close: () => void; busy: boolean; mutate: Mutate }) {
  const [institution, setInstitution] = useState(department?.institutionId ?? data.user.institutionId);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    const ok = await mutate(async () => { try { await api("organization/departments", { id: department?.id, name: f.get("departmentName"), institutionId: institution, parentId: f.get("departmentParent") || null }); } catch(e) { setError(e instanceof Error ? e.message : "Unable to save."); throw e; } }, "Department hierarchy saved.");
    if (ok) close();
  }
  return <Modal title={department ? "Edit department" : "Add department"} close={close}><form onSubmit={submit} className="modal-content">{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Field name="departmentName" label="Department name"><Input id="departmentName" name="departmentName" defaultValue={department?.name} minLength={2} maxLength={100} required/></Field>
    <Field name="departmentInstitution" label="Institution"><select id="departmentInstitution" disabled={!!department} value={institution} onChange={e => setInstitution(e.target.value)}>{data.institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
    <Field name="departmentParent" label="Parent department / division"><select id="departmentParent" name="departmentParent" defaultValue={department?.parentId ?? ""}><option value="">Top-level division</option>{data.departments.filter(d => d.institutionId === institution && d.id !== department?.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
    <p className="muted small">Maintenance belongs under HR & Administration in the confirmed SAH hierarchy. Preserve confirmed reporting policy when editing.</p><Button type="submit" disabled={busy}>Save department</Button>
  </form></Modal>;
}
function LocationForm({ data, close, busy, mutate }: { data: Data; close: () => void; busy: boolean; mutate: Mutate }) {
  const [kind, setKind] = useState("campus");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    if (await mutate(async () => { try { await api("organization/locations", { name: f.get("locationName"), institutionId: kind === "campus" ? f.get("locationInstitution") : undefined }); } catch(e) { setError(e instanceof Error ? e.message : "Unable to save."); throw e; } }, "Location created.")) close();
  }
  return <Modal title="Add institution or campus" close={close}><form className="modal-content" onSubmit={submit}>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<Field name="locationKind" label="Location type"><select id="locationKind" value={kind} onChange={e => setKind(e.target.value)}><option value="campus">Campus</option><option value="institution">Institution</option></select></Field><Field name="locationName" label="Location name"><Input id="locationName" name="locationName" required minLength={2} maxLength={150}/></Field>{kind === "campus" && <Field name="locationInstitution" label="Institution"><select id="locationInstitution" name="locationInstitution">{data.institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>}<Button disabled={busy} type="submit">Create location</Button></form></Modal>;
}
function PolicyForm({ data, busy, mutate }: { data: Data; busy: boolean; mutate: Mutate }) {
  const policy = data.policy;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget);
    await mutate(() => api("automation/policy", { timezone: "Asia/Karachi", workingDays: f.getAll("days").map(Number), startHour: Number(f.get("startHour")), endHour: Number(f.get("endHour")), reminderLimit: Number(f.get("reminderLimit")), escalationHours: Number(f.get("escalationHours")), holidays: String(f.get("holidays")).split(/[\s,]+/).filter(Boolean) }), "Follow-up policy saved.");
  }
  return <form className="panel panel-body stack" onSubmit={submit}><div className="flex-row between"><h2>Follow-up policy</h2><Badge variant="outline">CEO configuration</Badge></div><p className="muted small">Development defaults require institutional confirmation. Quiet hours are all hours outside the window below. Weekends are any unchecked days.</p>
    <fieldset><legend className="muted small">Working days · Asia/Karachi</legend><div className="flex-row wrap" style={{ marginTop: 10 }}>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day,index) => <label key={day} className="flex-row small"><input type="checkbox" name="days" value={index} defaultChecked={policy?.workingDays.includes(index) ?? (index > 0 && index < 6)}/>{day}</label>)}</div></fieldset>
    <div className="two-column"><Field name="startHour" label="Start hour · 0–23"><Input id="startHour" name="startHour" type="number" min={0} max={23} defaultValue={policy?.startHour ?? 9} required/></Field><Field name="endHour" label="End hour · 1–24"><Input id="endHour" name="endHour" type="number" min={1} max={24} defaultValue={policy?.endHour ?? 17} required/></Field><Field name="reminderLimit" label="Daily reminders per task · 0 or 1"><Input id="reminderLimit" name="reminderLimit" type="number" min={0} max={1} defaultValue={policy?.reminderLimit ?? 1} required/></Field><Field name="escalationHours" label="Overdue hours between escalation levels"><Input id="escalationHours" name="escalationHours" type="number" min={1} max={720} defaultValue={policy?.escalationHours ?? 24} required/></Field></div>
    <Field name="holidays" label="Holidays · YYYY-MM-DD, separated by commas or new lines"><Textarea id="holidays" name="holidays" defaultValue={policy?.holidays.join("\n") ?? ""}/></Field><Button disabled={busy} style={{ alignSelf: "start" }} type="submit">Save follow-up policy</Button>
  </form>;
}

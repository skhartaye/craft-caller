"use client";
import { useEffect, useState, useRef } from "react";
import {
  AudioLines,
  LayoutGrid,
  BookOpen,
  SlidersHorizontal,
  FlaskConical,
  Phone,
  Settings,
  Plus,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Send,
  RotateCcw,
  Download,
  Archive,
  Menu,
  X,
  FileText,
  Lock,
  MessageSquare,
} from "lucide-react";
import {
  sample,
  freshService,
  opening,
  practiceReply,
  validService,
  type Service,
  type Message,
} from "../lib/studio";
import {
  useCloud,
  CloudAccount,
  type CloudService,
} from "../components/cloud-workspace";
import { validateServiceContent } from "../lib/validation";
type View =
  | "Overview"
  | "Services"
  | "Conversation rules"
  | "Practice room"
  | "Call activity"
  | "Connections";
const nav = [
  { name: "Overview", icon: LayoutGrid },
  { name: "Services", icon: BookOpen },
  { name: "Conversation rules", icon: SlidersHorizontal },
  { name: "Practice room", icon: FlaskConical },
  { name: "Call activity", icon: Phone },
  { name: "Connections", icon: Settings },
] as const;
export default function Home() {
  const cloud = useCloud();
  const [cloudMode, setCloudMode] = useState(false),
    [cloudBusy, setCloudBusy] = useState(false),
    [versions, setVersions] = useState<Record<string, number>>({}),
    [aiMode, setAiMode] = useState(false),
    [cloudOwner, setCloudOwner] = useState("");
  const [view, setView] = useState<View>("Overview"),
    [services, setServices] = useState<Service[]>([sample]),
    [selected, setSelected] = useState(sample.id),
    [draft, setDraft] = useState<Service>(sample),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [mobile, setMobile] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [ended, setEnded] = useState(false),
    [busy, setBusy] = useState(false),
    [q, setQ] = useState(""),
    [a, setA] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const active = services.filter((s) => !s.archived);
  const service =
    services.find((s) => s.id === selected && !s.archived) || active[0];
  useEffect(() => {
    try {
      const raw = localStorage.getItem("callcraft-studio-v1");
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (!Array.isArray(data) || !data.every(validService)) throw Error();
        setServices(data);
        const first = data.find((s) => !s.archived);
        if (first) {
          setSelected(first.id);
          setDraft(first);
        }
      }
    } catch {
      setNotice(
        "Saved data could not be read. The example is loaded; export any work before closing.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !cloudMode)
      try {
        localStorage.setItem("callcraft-studio-v1", JSON.stringify(services));
      } catch {
        setNotice(
          "Browser storage is unavailable. Export your service to keep a copy.",
        );
      }
  }, [services, ready, cloudMode]);
  useEffect(() => {
    if (cloudMode && (!cloud.session || cloud.session.user.id !== cloudOwner)) {
      setCloudMode(false);
      setAiMode(false);
      try {
        const data = JSON.parse(
          localStorage.getItem("callcraft-studio-v1") || "[]",
        );
        const local =
          Array.isArray(data) && data.every(validService) ? data : [sample];
        setServices(local);
        const first = local.find((s: Service) => !s.archived);
        setSelected(first?.id || "");
        setDraft(first || freshService());
      } catch {
        setServices([sample]);
        setSelected(sample.id);
        setDraft(sample);
      }
      setMessages([]);
      setVersions({});
    }
  }, [cloud.session, cloudMode, cloudOwner]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);
  const editing = view === "Services" || view === "Conversation rules";
  const savedDraft = services.find((s) => s.id === draft.id);
  const dirty =
    editing &&
    (savedDraft
      ? JSON.stringify(savedDraft) !== JSON.stringify(draft)
      : !!(draft.name || draft.company || draft.description || draft.reason));
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function canLeave() {
    return (
      !dirty ||
      window.confirm("Discard unsaved changes? Save first to keep your edits.")
    );
  }
  function go(v: View) {
    if (busy || cloudBusy || !canLeave()) return;
    setView(v);
    setMobile(false);
    setNotice("");
    if (service) setDraft(structuredClone(service));
    setQ("");
    setA("");
    window.history.replaceState(
      null,
      "",
      `#${v.toLowerCase().replaceAll(" ", "-")}`,
    );
  }
  function pick(id: string) {
    if (busy || cloudBusy || !canLeave()) return;
    setSelected(id);
    const s = services.find((s) => s.id === id);
    if (s) setDraft(structuredClone(s));
    setMessages([]);
    setEnded(false);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (cloudBusy) return;
    const clean = {
      ...draft,
      name: draft.name.trim(),
      company: draft.company.trim(),
      description: draft.description.trim(),
      reason: draft.reason.trim(),
    };
    const error = validateServiceContent(clean);
    if (error) {
      setNotice(error);
      return;
    }
    if (cloudMode) {
      setCloudBusy(true);
      try {
        const row = await cloud.request<CloudService>("studio-services", {
          service: clean,
          expectedVersion: versions[clean.id] || 0,
        });
        setVersions((v) => ({ ...v, [row.id]: row.version }));
        setNotice(
          `Saved cloud version ${row.version}. Practice uses this saved version.`,
        );
      } catch (e) {
        setNotice(
          e instanceof Error ? e.message : "Cloud save failed. Try again.",
        );
        return;
      } finally {
        setCloudBusy(false);
      }
    } else
      setNotice("Saved in this browser. Practice uses these saved details.");
    setServices((old) =>
      old.some((s) => s.id === clean.id)
        ? old.map((s) => (s.id === clean.id ? clean : s))
        : [...old, clean],
    );
    setSelected(clean.id);
    setDraft(clean);
    setMessages([]);
    setEnded(false);
  }
  function create() {
    if (busy || cloudBusy || !canLeave()) return;
    const s = freshService();
    setDraft(s);
    setView("Services");
    setMobile(false);
    setNotice("");
  }
  function exportService() {
    if (!service) return;
    const blob = new Blob([JSON.stringify(service, null, 2)], {
      type: "application/json",
    });
    const u = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = u;
    link.download = "callcraft-service.json";
    link.click();
    URL.revokeObjectURL(u);
  }
  function start() {
    if (!service) return;
    setMessages([
      { role: "caller", text: opening(service), source: "Saved opening" },
    ]);
    setEnded(false);
  }
  async function send(text: string) {
    if (!service || ended || busy || !text.trim()) return;
    setMessages((m) => [
      ...(m.length
        ? m
        : [
            {
              role: "caller" as const,
              text: opening(service),
              source: "Saved opening",
            },
          ]),
      { role: "customer", text },
    ]);
    setInput("");
    setBusy(true);
    try {
      const result =
        aiMode && cloudMode
          ? await cloud.request<{
              text: string;
              source: string;
              ended: boolean;
              version: number;
            }>("practice", { serviceId: service.id, text, history: messages })
          : practiceReply(text, service);
      setMessages((m) => [
        ...m,
        { role: "caller", text: result.text, source: result.source },
      ]);
      setEnded(!!result.ended);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Practice failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function switchWorkspace() {
    if (!canLeave() || cloudBusy) return;
    if (cloudMode) {
      let local: Service[] = [sample];
      try {
        const data = JSON.parse(
          localStorage.getItem("callcraft-studio-v1") || "[]",
        );
        if (Array.isArray(data) && data.every(validService)) local = data;
      } catch {}
      setServices(local);
      setSelected(local.find((s) => !s.archived)?.id || "");
      setDraft(local.find((s) => !s.archived) || freshService());
      setCloudMode(false);
      setAiMode(false);
      setMessages([]);
      return;
    }
    if (!cloud.session) {
      go("Connections");
      setNotice("Sign in to open your private cloud workspace.");
      return;
    }
    setCloudBusy(true);
    try {
      const rows = await cloud.request<CloudService[]>("studio-services");
      const items = rows.map((r) => ({
        ...r.document,
        id: r.id,
        archived: r.archived,
      }));
      if (!items.every(validService))
        throw Error(
          "Cloud records could not be read. Contact your administrator.",
        );
      setVersions(Object.fromEntries(rows.map((r) => [r.id, r.version])));
      setCloudOwner(cloud.session.user.id);
      setCloudMode(true);
      setServices(items);
      const first = items.find((s) => !s.archived);
      setSelected(first?.id || "");
      setDraft(first || freshService());
      setMessages([]);
      setNotice(
        "Cloud workspace loaded. Browser drafts have not been uploaded.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Cloud load failed.");
    } finally {
      setCloudBusy(false);
    }
  }
  async function archiveService(s: Service, archived: boolean) {
    if (!canLeave() || cloudBusy) return;
    setCloudBusy(true);
    try {
      if (cloudMode) {
        const row = await cloud.request<CloudService>("studio-services", {
          service: { ...s, archived },
          expectedVersion: versions[s.id] || 0,
        });
        setVersions((v) => ({ ...v, [s.id]: row.version }));
      }
      setServices((old) =>
        old.map((item) => (item.id === s.id ? { ...item, archived } : item)),
      );
      setView("Overview");
      setDraft(
        services.find((item) => item.id !== s.id && !item.archived) ||
          freshService(),
      );
      setNotice(
        archived
          ? "Service archived. Restore it from the archive below."
          : "Service restored.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Could not update the archive.",
      );
    } finally {
      setCloudBusy(false);
    }
  }
  const field = (
    key: keyof Service,
    label: string,
    multiline = false,
    required = false,
  ) => (
    <div className="field">
      <label htmlFor={key}>
        {label}
        {required ? " *" : ""}
      </label>
      {multiline ? (
        <textarea
          disabled={cloudBusy}
          id={key}
          name={key}
          required={required}
          maxLength={4000}
          rows={3}
          value={draft[key] as string}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      ) : (
        <input
          autoComplete="off"
          disabled={cloudBusy}
          id={key}
          name={key}
          required={required}
          maxLength={500}
          value={draft[key] as string}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      )}
    </div>
  );
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <AudioLines size={29} />
          <span>
            callcraft<span className="brand-dot">.</span>
          </span>
          <button
            className="mobile-close iconbtn"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-avatar">Y</span>
          <div>
            <strong>Your workspace</strong>
            <small>Caller studio</small>
          </div>
          <span className="workspace-chevron">⌄</span>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? "nav-item selected" : "nav-item"}
              aria-current={view === name ? "page" : undefined}
              onClick={() => go(name)}
            >
              <Icon size={19} />
              {name}
              {name === "Services" && (
                <span className="count">{active.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="safe-card">
            <ShieldCheck size={23} />
            <strong>Good calls start with trust.</strong>
            <p>Clear intentions. Approved answers. Respectful conversations.</p>
          </div>
          <div className="profile">
            <span className="workspace-avatar">Y</span>
            <div>
              <strong>Your studio</strong>
              <small>Local workspace</small>
            </div>
            <span className="local-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="crumb">
            <button
              className="mobile-menu iconbtn"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{view}</strong>
          </div>
          <span className="mode">
            <span />
            Setup mode
          </span>
        </header>
        <main id="main">
          <div className="workspace-switch">
            <span>
              <strong>
                {cloudMode ? "Cloud workspace" : "Browser workspace"}
              </strong>
              <small>
                {cloudMode
                  ? "Private records · versioned saves"
                  : "Drafts on this device"}
              </small>
            </span>
            <button
              className="secondary"
              disabled={cloudBusy || busy}
              onClick={switchWorkspace}
            >
              {cloudBusy
                ? "Working…"
                : cloudMode
                  ? "Use browser drafts"
                  : "Open cloud workspace"}
            </button>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR CALLER, THOUGHTFULLY BUILT</div>
              <h1>
                {view === "Overview"
                  ? "Better conversations start here."
                  : view}
              </h1>
            </div>
            {view === "Overview" || view === "Services" ? (
              <button className="primary" onClick={create}>
                <Plus size={18} />
                Create service
              </button>
            ) : null}
          </div>
          <div className="notice" role="status">
            {notice}
          </div>
          {view === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="pill light">
                    <AudioLines size={15} />
                    Made for meaningful conversations
                  </span>
                  <h2>
                    A friendly voice.
                    <br />
                    Your expertise.
                  </h2>
                  <p>
                    Give your caller the right knowledge and clear boundaries.
                    Then make sure every answer feels right.
                  </p>
                  <button
                    className="dark-btn"
                    onClick={() => go(service ? "Practice room" : "Services")}
                  >
                    {service
                      ? "Try a practice conversation"
                      : "Set up your first service"}
                    <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className="voice-art" aria-hidden="true">
                  <div className="orbit one" />
                  <div className="orbit two" />
                  <div className="orbit three" />
                  <div className="voice-orb">
                    <AudioLines size={70} strokeWidth={1.6} />
                  </div>
                  <div className="art-label">
                    <span />
                    Friendly by design
                  </div>
                  <div className="art-float">“Happy to help with that.”</div>
                </div>
              </section>
              <section className="stats" aria-label="Workspace summary">
                <div>
                  <span className="stat-icon lavender">
                    <BookOpen size={21} />
                  </span>
                  <div>
                    <small>Services in your workspace</small>
                    <strong>{active.length.toString().padStart(2, "0")}</strong>
                  </div>
                </div>
                <div>
                  <span className="stat-icon mint">
                    <MessageSquare size={21} />
                  </span>
                  <div>
                    <small>Approved answers</small>
                    <strong>
                      {active
                        .reduce((n, s) => n + s.faqs.length, 0)
                        .toString()
                        .padStart(2, "0")}
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="stat-icon peach">
                    <Phone size={21} />
                  </span>
                  <div>
                    <small>Live calling</small>
                    <strong className="stat-word">Not connected</strong>
                  </div>
                </div>
              </section>
              <div className="overview-grid">
                <section className="panel">
                  <div className="section-head">
                    <h2>Your services</h2>
                    <button className="textbtn" onClick={() => go("Services")}>
                      Manage services
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  {active.length ? (
                    active.slice(0, 3).map((s) => (
                      <button
                        key={s.id}
                        className="service-row"
                        onClick={() => {
                          pick(s.id);
                          setView("Services");
                        }}
                      >
                        <span className="service-icon">
                          <BookOpen size={22} />
                        </span>
                        <span className="service-info">
                          <strong>{s.name}</strong>
                          <small>
                            {s.company} · {s.faqs.length} approved answers
                          </small>
                        </span>
                        <span className="pill">
                          {s.id === "sample-service" ? "Example" : "Draft"}
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))
                  ) : (
                    <div className="empty">
                      <BookOpen />
                      <h3>Your first service starts here</h3>
                      <button className="primary" onClick={create}>
                        Create service
                      </button>
                    </div>
                  )}
                  <button className="add-row" onClick={create}>
                    <Plus size={17} />
                    Add another service
                  </button>
                  <div className="inline-note">
                    <FileText size={16} />
                    Example content is editable. Replace it with your real
                    service details.
                  </div>
                </section>
                <section className="panel checklist">
                  <div className="section-head">
                    <h2>Before the first call</h2>
                    <span className="pill">Setup</span>
                  </div>
                  {[
                    {
                      title: "Define your service",
                      detail: "What you offer and who you help",
                      done: !!service,
                      view: "Services",
                    },
                    {
                      title: "Set conversation boundaries",
                      detail: "Approved facts, tone, and handoffs",
                      done: !!service?.rules,
                      view: "Conversation rules",
                    },
                    {
                      title: "Practice the conversation",
                      detail: "Try questions and unexpected replies",
                      done: messages.length > 1,
                      view: "Practice room",
                    },
                    {
                      title: "Connect live calling",
                      detail: "Provider, eligibility, and call limits",
                      done: false,
                      view: "Connections",
                    },
                  ].map((item, i) => (
                    <button
                      key={item.title}
                      className="check-row"
                      onClick={() => go(item.view as View)}
                    >
                      <span className={item.done ? "step done" : "step"}>
                        {item.done ? <Check size={14} /> : i + 1}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </section>
              </div>
              <div className="bottom-note">
                <ShieldCheck size={17} />
                <span>
                  No real calls are made in setup mode.{" "}
                  {cloudMode
                    ? "Your services are stored in your private cloud workspace."
                    : "Your drafts stay in this browser."}
                </span>
                <button className="textbtn" onClick={() => go("Connections")}>
                  View connections
                  <ChevronRight size={15} />
                </button>
              </div>
            </>
          )}
          {(view === "Services" || view === "Conversation rules") && (
            <div className="editor-layout">
              <section className="panel editor">
                <div className="section-head">
                  <h2>
                    {view === "Services"
                      ? "Service details"
                      : "How your caller behaves"}
                  </h2>
                  <span className="pill">
                    {cloudMode
                      ? `Cloud version ${versions[draft.id] || 0}`
                      : "Browser draft"}
                  </span>
                </div>
                <form
                  onSubmit={save}
                  aria-label={
                    view === "Services"
                      ? "Service details"
                      : "Conversation rules"
                  }
                >
                  {view === "Services" ? (
                    <>
                      {field("name", "Service name", false, true)}
                      {field("company", "Business name", false, true)}
                      {field("audience", "Who you help")}
                      {field("description", "What you offer", true, true)}
                      {field("reason", "Why you are calling", true, true)}
                      {field("goal", "Desired next step")}
                      {field("greeting", "Opening message")}
                      <div className="inline-note">
                        <ShieldCheck size={18} />
                        Identify the caller as AI and ask whether now is a good
                        time.
                      </div>
                    </>
                  ) : (
                    <>
                      {!service ? (
                        <p>Create and save a service first.</p>
                      ) : (
                        <>
                          <div className="field">
                            <label htmlFor="rule-service">Service</label>
                            <select
                              id="rule-service"
                              name="service"
                              value={selected}
                              onChange={(e) => pick(e.target.value)}
                            >
                              {active.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {field("rules", "Conversation instructions", true)}
                          <p className="callout">
                            Practice mode checks approved FAQ matches and stop
                            requests. Free-form instructions are saved for a
                            future AI connection; they do not change this
                            scripted matcher.
                          </p>
                          <h3>Always-on boundaries</h3>
                          {[
                            "Use approved information only",
                            "Respect stop requests",
                            "Ask for clarification when unsure",
                            "Never claim an action happened without confirmation",
                          ].map((t) => (
                            <p className="boundary" key={t}>
                              <ShieldCheck size={17} />
                              {t}
                            </p>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  {(view === "Services" || service) && (
                    <div className="form-actions">
                      <button
                        className="primary"
                        type="submit"
                        disabled={cloudBusy}
                      >
                        <Check size={17} />
                        {cloudBusy
                          ? "Saving…"
                          : `Save ${view === "Services" ? "service" : "rules"}`}
                      </button>
                      <span>
                        {cloudMode
                          ? "Version history is preserved"
                          : "Saved on this device"}
                      </span>
                    </div>
                  )}
                </form>
              </section>
              <aside className="editor-side">
                <section className="panel">
                  <h2>Service library</h2>
                  {active.map((s) => (
                    <button
                      className={
                        draft.id === s.id
                          ? "library-item current"
                          : "library-item"
                      }
                      key={s.id}
                      onClick={() => pick(s.id)}
                    >
                      <BookOpen size={18} />
                      <span>{s.name}</span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  <button className="add-row" onClick={create}>
                    <Plus size={17} />
                    Create service
                  </button>
                </section>
                {service && (
                  <section className="panel">
                    <div className="section-head">
                      <h2>Approved answers</h2>
                      <span className="pill">{draft.faqs.length}</span>
                    </div>
                    {draft.faqs.map((f) => (
                      <div className="faq" key={f.id}>
                        <strong>{f.question}</strong>
                        <p>{f.answer}</p>
                        <button
                          className="textbtn"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              faqs: draft.faqs.filter((x) => x.id !== f.id),
                            })
                          }
                        >
                          Remove from draft
                        </button>
                      </div>
                    ))}
                    <form
                      aria-label="Add approved answer"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!q.trim() || !a.trim()) return;
                        setDraft({
                          ...draft,
                          faqs: [
                            ...draft.faqs,
                            {
                              id: crypto.randomUUID(),
                              question: q.trim(),
                              answer: a.trim(),
                            },
                          ],
                        });
                        setQ("");
                        setA("");
                        setNotice(
                          "Answer added to draft. Save the service or rules to use it in practice.",
                        );
                      }}
                    >
                      <div className="field">
                        <label htmlFor="question">Customer question *</label>
                        <input
                          id="question"
                          name="question"
                          required
                          maxLength={200}
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="answer">Approved answer *</label>
                        <textarea
                          id="answer"
                          name="answer"
                          required
                          maxLength={1000}
                          rows={3}
                          value={a}
                          onChange={(e) => setA(e.target.value)}
                        />
                      </div>
                      <button className="secondary" type="submit">
                        <Plus size={16} />
                        Add answer to draft
                      </button>
                    </form>
                  </section>
                )}
                {service && (
                  <div className="secondary-actions">
                    <button className="textbtn" onClick={exportService}>
                      <Download size={16} />
                      Export saved service
                    </button>
                    <button
                      className="textbtn"
                      disabled={cloudBusy}
                      onClick={() => archiveService(service, true)}
                    >
                      <Archive size={16} />
                      Archive service
                    </button>
                  </div>
                )}
              </aside>
            </div>
          )}
          {view === "Practice room" && (
            <div className="practice-layout">
              <section className="panel conversation">
                <div className="section-head">
                  <div>
                    <h2>Try a conversation</h2>
                    <small>
                      {aiMode
                        ? "AI answer matching · text only · uses API credits"
                        : "Scripted preview · no AI or phone connection"}
                    </small>
                  </div>
                  <button
                    className="iconbtn"
                    aria-label="Reset practice conversation"
                    onClick={start}
                    disabled={!service || busy}
                  >
                    <RotateCcw size={19} />
                  </button>
                </div>
                {!service ? (
                  <div className="empty">
                    <h3>Create a service to practice</h3>
                    <button className="primary" onClick={create}>
                      Create service
                    </button>
                  </div>
                ) : (
                  <>
                    <fieldset className="practice-mode">
                      <legend>Practice mode</legend>
                      <label>
                        <input
                          type="radio"
                          name="practice-mode"
                          checked={!aiMode}
                          disabled={busy}
                          onChange={() => {
                            setAiMode(false);
                            setMessages([]);
                            setEnded(false);
                          }}
                        />
                        Scripted
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="practice-mode"
                          checked={aiMode}
                          disabled={
                            busy || !cloudMode || !cloud.config?.aiConfigured
                          }
                          onChange={() => {
                            setAiMode(true);
                            setMessages([]);
                            setEnded(false);
                          }}
                        />
                        AI answer matching
                      </label>
                    </fieldset>
                    {(!cloudMode || !cloud.config?.aiConfigured) && (
                      <p className="mode-help">
                        AI practice needs a cloud service, sign-in, and server
                        AI configuration.
                      </p>
                    )}
                    <div className="field practice-select">
                      <label htmlFor="practice-service">Practice service</label>
                      <select
                        id="practice-service"
                        name="service"
                        disabled={busy}
                        value={service.id}
                        onChange={(e) => pick(e.target.value)}
                      >
                        {active.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      className="messages"
                      role="log"
                      aria-label="Practice transcript"
                      aria-live="polite"
                    >
                      {!messages.length ? (
                        <div className="empty">
                          <span className="empty-orb">
                            <AudioLines size={34} />
                          </span>
                          <h3>Meet your caller.</h3>
                          <p>
                            Test approved answers, unknown questions, and stop
                            requests.
                          </p>
                          <button className="primary" onClick={start}>
                            Start practice
                          </button>
                        </div>
                      ) : (
                        messages.map((m, i) => (
                          <div key={i} className={`message ${m.role}`}>
                            <small>
                              {m.role === "caller"
                                ? "Your caller"
                                : "You, as the customer"}
                            </small>
                            <p>{m.text}</p>
                            {m.source && <span>{m.source}</span>}
                          </div>
                        ))
                      )}
                      {busy && (
                        <p role="status">Preparing the practice response…</p>
                      )}
                      <div ref={bottom} />
                    </div>
                    <div className="suggestions">
                      {[
                        "How much does it cost?",
                        "What do you do?",
                        "Do you guarantee results?",
                        "Please stop calling",
                      ].map((t) => (
                        <button
                          disabled={ended || busy}
                          key={t}
                          onClick={() => send(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <form
                      className="composer"
                      aria-label="Send practice reply"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send(input);
                      }}
                    >
                      <label className="sr-only" htmlFor="reply">
                        Customer reply
                      </label>
                      <input
                        id="reply"
                        name="reply"
                        required
                        maxLength={1000}
                        disabled={ended || busy}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          ended
                            ? "Practice ended. Reset to try again."
                            : "Reply as the customer…"
                        }
                      />
                      <button
                        type="submit"
                        className="primary"
                        disabled={ended || busy}
                        aria-label="Send reply"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </>
                )}
              </section>
              <aside>
                <section className="panel">
                  <h2>What this preview checks</h2>
                  <p className="boundary">
                    <Check size={18} />
                    Answers come from saved FAQs
                  </p>
                  <p className="boundary">
                    <Check size={18} />
                    Unknown questions get a handoff
                  </p>
                  <p className="boundary">
                    <Check size={18} />
                    Stop requests end the practice
                  </p>
                  <div className="callout">
                    {aiMode
                      ? "AI selects approved FAQ answers. The server rejects unknown answer IDs and does not accept generated prose. Each request uses API credits; voice and real calls remain disabled."
                      : "This uses keyword matching, not a language model. It does not demonstrate real AI accuracy, voice, or live opt-out enforcement."}
                  </div>
                  <button
                    className="secondary"
                    onClick={() => go("Conversation rules")}
                  >
                    Edit knowledge & rules
                  </button>
                </section>
              </aside>
            </div>
          )}
          {view === "Call activity" && (
            <section className="panel empty large">
              <span className="empty-orb">
                <Phone size={33} />
              </span>
              <span className="pill">Live calling disabled</span>
              <h2>No calls yet. Start with a practice.</h2>
              <p>
                Real call history will appear after a calling backend is
                connected. Practice conversations are not phone calls.
              </p>
              <button className="primary" onClick={() => go("Practice room")}>
                Open practice room
              </button>
            </section>
          )}
          {view === "Connections" && (
            <>
              <CloudAccount />
              <div className="connection-grid">
                {[
                  {
                    title: "Voice intelligence",
                    provider: "OpenAI · text practice first",
                    icon: AudioLines,
                    detail:
                      "Listens and responds using approved service knowledge.",
                  },
                  {
                    title: "Phone calling",
                    provider: "Twilio",
                    icon: Phone,
                    detail:
                      "Places eligible calls and reports delivery and call outcomes.",
                  },
                  {
                    title: "Accounts & storage",
                    provider: "Supabase",
                    icon: Lock,
                    detail:
                      "Provides user accounts, isolated business records, and call history.",
                  },
                ].map(({ title, provider, icon: Icon, detail }) => (
                  <section className="panel connection" key={title}>
                    <span className="stat-icon lavender">
                      <Icon size={24} />
                    </span>
                    <span className="pill">
                      {title === "Voice intelligence" &&
                      cloud.config?.aiConfigured
                        ? "Configured · unverified"
                        : title === "Accounts & storage" && cloud.client
                          ? "Configured · sign in to verify"
                          : "Not connected"}
                    </span>
                    <h2>{title}</h2>
                    <strong>{provider}</strong>
                    <p>{detail}</p>
                    <div className="connection-foot">
                      <Lock size={15} />
                      Requires server configuration
                    </div>
                  </section>
                ))}
              </div>
              <section className="panel launch">
                <h2>What is needed before live calls</h2>
                <div className="launch-grid">
                  <div>
                    <h3>Calling setup</h3>
                    <ul>
                      <li>Verified business and outbound phone number</li>
                      <li>Destination country and eligible contact source</li>
                      <li>Calling hours and recipient time zones</li>
                    </ul>
                  </div>
                  <div>
                    <h3>Server-enforced controls</h3>
                    <ul>
                      <li>Opt-outs and duplicate call prevention</li>
                      <li>Daily spending and call duration limits</li>
                      <li>Verified webhooks and accountable call history</li>
                    </ul>
                  </div>
                </div>
                <p className="callout">
                  Provider keys are configured only on the server. Cloud storage
                  and AI practice require sign-in and deployment configuration.
                  Phone calls, callbacks, and bookings remain disabled.
                </p>
              </section>
            </>
          )}
          {view === "Services" && services.some((s) => s.archived) && (
            <section className="panel archive-panel">
              <h2>Archived services</h2>
              {services
                .filter((s) => s.archived)
                .map((s) => (
                  <div className="archive-row" key={s.id}>
                    <span>{s.name}</span>
                    <button
                      className="secondary"
                      disabled={cloudBusy}
                      onClick={() => archiveService(s, false)}
                    >
                      Restore service
                    </button>
                  </div>
                ))}
            </section>
          )}
        </main>
        <footer>
          <span>callcraft studio</span>
          <span>Thoughtful calls. Clear boundaries.</span>
        </footer>
      </div>
    </div>
  );
}

"use client";
import { Download, Phone, ShieldCheck } from "lucide-react";
import type { Service } from "../lib/studio";
export function TelegramSetup({
  service,
  onExport,
  onServices,
}: {
  service: Service | undefined;
  onExport: () => void;
  onServices: () => void;
}) {
  return (
    <div className="practice-layout">
      <section className="panel">
        <div className="section-head">
          <h2>Prepare your Telegram test call</h2>
          <span className="pill">Setup · not connected</span>
        </div>
        <div className="callout">
          The call will ring inside Telegram. A separate regular caller account
          and a local calling worker are required.
        </div>
        <h3>Approved service</h3>
        {service ? (
          <>
            <p className="boundary">
              <ShieldCheck size={18} />
              {service.name} · {service.faqs.length} approved answers
            </p>
            <button className="primary" onClick={onExport}>
              <Download size={17} />
              Export service for the test
            </button>
          </>
        ) : (
          <>
            <p className="boundary">Save a service before preparing a call.</p>
            <button className="primary" onClick={onServices}>
              Set up a service
            </button>
          </>
        )}
        <div className="launch-grid">
          <div>
            <h3>On the caller’s computer</h3>
            <ol className="telegram-steps">
              <li>Create your Telegram API application.</li>
              <li>Sign in locally to the caller account.</li>
              <li>Load the exported service and confirm the recipient.</li>
              <li>Run one agreed test call.</li>
            </ol>
          </div>
          <div>
            <h3>Test limits</h3>
            <ul>
              <li>One recipient; no automatic retries</li>
              <li>Two-minute session limit</li>
              <li>AI introduction and stop requests</li>
              <li>No saved call audio or transcript</li>
            </ul>
          </div>
        </div>
        <a
          className="secondary"
          href="https://github.com/skhartaye/craft-caller/blob/main/telegram/README.md"
          target="_blank"
          rel="noreferrer"
        >
          Open local setup instructions
        </a>
      </section>
      <aside>
        <section className="panel">
          <span className="stat-icon mint">
            <Phone size={23} />
          </span>
          <h2 style={{ marginTop: 18 }}>What is still needed</h2>
          <p className="boundary">Local caller login</p>
          <p className="boundary">A different receiving Telegram account</p>
          <p className="boundary">AI credentials and an approved test budget</p>
          <p className="callout">
            This website does not currently start calls. Native calling
            dependencies were checked locally; account login, live audio and an
            actual call still need verification.
          </p>
          <p className="mode-help">
            Telegram transport has no standard carrier-minute charge. AI usage,
            internet access, and hosting can still cost money.
          </p>
        </section>
      </aside>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "./logo";

export default function Home() {
  return (
    <>
      <nav className="nav">
        <span className="wordmark">
          <Logo />
          Smart Trade Copilot
        </span>
        <span className="nav-cluster">
          <a href="#how">How it works</a>
          <a href="#cli">CLI</a>
          <Link href="/try-it">Analyze</Link>
          <a
            href="https://github.com/victorjayeoba/Smart-Trade-Copilot"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </span>
        <span className="links">
          <Link href="/try-it" className="cta">
            Try it
          </Link>
        </span>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            OKX onchainOS · X Layer · Builder Track
          </span>
          <h1>
            Know if a token is safe to buy —{" "}
            <span className="grad">before you ape in.</span>
          </h1>
          <p>
            An autonomous AI agent investigates any token across the OKX
            onchainOS skill suite, then a deterministic safety core it{" "}
            <strong>cannot override</strong> rules BUY / CAUTION / AVOID — and
            executes the swap only when it's safe.
          </p>
          <div className="hero-actions">
            <Link href="/try-it" className="cta">
              Try it →
            </Link>
            <a className="btn-secondary" href="#how">
              Learn more →
            </a>
          </div>
        </div>

        <div className="hero-mock" aria-hidden="true">
          <div className="mock-bar">
            <span className="tl r" />
            <span className="tl y" />
            <span className="tl g" />
            <span className="mock-q">should I buy $PEPE?</span>
          </div>
          <div className="mock-body">
            <div className="mock-row">
              <span className="mc ok">✔</span> OKX Security · honeypot / rug / tax
              <span className="mock-src live">live</span>
            </div>
            <div className="mock-row">
              <span className="mc ok">✔</span> OKX Token + Market · liquidity, dev
              history
              <span className="mock-src live">live</span>
            </div>
            <div className="mock-row">
              <span className="mc ok">✔</span> OKX Clusters · holder concentration
              <span className="mock-src live">live</span>
            </div>
            <div className="mock-row dim">
              <span className="mc run">◴</span> OKX Signals · smart-money flow
            </div>
            <div className="mock-verdict">
              <span className="mv">🟢 BUY</span>
              <span className="mvn">deterministic safety core · non-overridable</span>
            </div>
          </div>
        </div>
      </header>

      <section className="section" id="how">
        <div className="section-head">
          <h2>How it works</h2>
          <p>
            Autonomy in gathering evidence. Determinism in the safety verdict.
            The agent is structurally unable to approve what the core vetoes.
          </p>
        </div>
        <div className="how-grid">
          <div className="how-card">
            <div className="n">01 — INVESTIGATE</div>
            <h3>Autonomous agent</h3>
            <p>
              An LLM agent dynamically decides which OKX onchainOS skills to
              call — security, market, holders, smart-money signals — and
              aborts early the moment a honeypot is found.
            </p>
          </div>
          <div className="how-card">
            <div className="n">02 — ADJUDICATE</div>
            <h3>Non-overridable safety core</h3>
            <p>
              A deterministic, unit-tested engine computes the verdict. The
              model is contractually forbidden from softening it. A scan that
              doesn't complete is never treated as a pass.
            </p>
          </div>
          <div className="how-card">
            <div className="n">03 — EXECUTE</div>
            <h3>Gated on-chain swap</h3>
            <p>
              If — and only if — the verdict permits, the agent quotes and
              broadcasts a real swap via the OKX Agentic Wallet. AVOID makes
              the buy path structurally unreachable.
            </p>
          </div>
        </div>
        <div className="section-cta">
          <Link href="/try-it" className="cta">
            Analyze a token →
          </Link>
        </div>
      </section>

      <section className="section cli-section" id="cli">
        <div className="section-head">
          <h2>Same agent, in your terminal</h2>
          <p>
            One identity, three surfaces — this web app, an OKX Plugin Store
            skill, and a standalone CLI. The CLI runs the <b>same</b> autonomous
            agent against the <b>same</b> non-overridable safety core.
          </p>
        </div>

        <div className="cli-box">
          <div className="cli-bar">
            <span className="tl r" />
            <span className="tl y" />
            <span className="tl g" />
            <span className="cli-title">smart-trade-copilot · CLI</span>
          </div>
          <div className="cli-body">
            <div className="cli-line">
              <span className="cli-prompt">$</span> node src/index.js analyze
              BONK <span className="cli-flag">--chain</span> solana
            </div>
            <div className="cli-out">
              <span className="cli-ok">✔</span> security{"  "}
              <span className="cli-ok">✔</span> fundamentals{"  "}
              <span className="cli-ok">✔</span> clusters{"  "}
              <span className="cli-ok">✔</span> signals{"  "}
              <span className="cli-ok">✔</span> meme{"  "}
              <span className="cli-ok">✔</span> defi
            </div>
            <div className="cli-out cli-verdict">
              🟡 VERDICT: CAUTION · BONK on solana — dev linked to a prior rug
            </div>
          </div>
        </div>

        <p className="cli-note">
          Six real OKX onchainOS skills, one deterministic verdict. Add{" "}
          <code>--buy &lt;amount&gt; --pay &lt;token&gt;</code> for gated,
          confirmation-required on-chain execution — or <code>--demo</code> to
          run offline with no API key.
        </p>
      </section>

      <footer className="footer">
        Powered by OKX onchainOS · X&nbsp;Layer · the agent calls{" "}
        <code>security · token · clusters · signals · memepump · defi</code> as
        tools.
        <br />
        Also ships as an OKX Plugin Store skill and a standalone CLI ·{" "}
        <a
          href="https://github.com/victorjayeoba/Smart-Trade-Copilot"
          target="_blank"
          rel="noreferrer"
        >
          source on GitHub
        </a>
      </footer>
    </>
  );
}

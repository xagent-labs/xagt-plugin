import { TimerReset, Trophy, Zap } from "lucide-react";
import { MonthMiniList, PhantomShell, usePhantomProgress } from "@/components/PhantomShell";
import { HOME_STATS, MISSIONS, TROPHY_RULES } from "@/data/site";

const Home = () => {
  const { checked, completed, percent, toggle } = usePhantomProgress();

  return (
    <PhantomShell>
      <section className="hero-grid">
        <div className="slash-card hero-card">
          <div className="hero-badge">HOME SCREEN / INTRUSION START</div>
          <div className="hero-copy">
            <p className="hero-kicker">PERSONA-STYLE TRAINING UI / 女神异闻录式训练界面</p>
            <h2 className="hero-title">
              TAKE
              <span> THE MAT</span>
            </h2>
            <p className="hero-description">
              这不是普通的训练清单，而是你的 palace infiltration map。
              每次上垫，我们先偷位置，再偷节奏，最后偷走那种“我做不到”的旧想法。
            </p>
          </div>
          <div className="hero-actions">
            <div className="alert-ribbon">NEXT TARGET / BUILD A-GAME, ROUND BY ROUND</div>
            <div className="progress-shell">
              <div className="progress-labels">
                <span>PALACE CLEAR RATE / 渗透进度</span>
                <span>{completed}/30</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <div className="progress-percent">{percent}% COMPLETE / 进度推进中</div>
            </div>
          </div>
        </div>

        <div className="hero-side">
          <div className="stat-card tilt-left">
            <div className="stat-topline">
              <TimerReset className="h-4 w-4" />
              <span>6 MONTH ARC / 六月潜入路线</span>
            </div>
            <MonthMiniList checked={checked} toggle={toggle} />
          </div>

          <div className="stat-strip">
            {HOME_STATS.map((stat) => (
              <div key={stat.label} className="stat-chip">
                <div className="stat-chip-label">{stat.label}</div>
                <div className="stat-chip-value">{stat.value}</div>
                <div className="stat-chip-note">{stat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <section className="slash-card mission-card">
          <div className="section-head compact">
            <div>
              <p className="section-tag">TODAY'S ALERT / 今日目标提示</p>
              <h2 className="section-title">HOT MISSION PICKS</h2>
            </div>
          </div>
          <div className="mission-list">
            {MISSIONS.map((mission) => (
              <article key={mission.code} className="mission-item">
                <div className="mission-code">{mission.code}</div>
                <div className="mission-body">
                  <h3>{mission.title}</h3>
                  <p>{mission.detail}</p>
                </div>
                <div className="mission-rank">{mission.difficulty}</div>
              </article>
            ))}
          </div>
        </section>

        <aside className="intel-column">
          <section className="slash-card quote-card">
            <p className="quote-tag">COMBAT LAW / 实战法则</p>
            <blockquote>
              Position first,
              <br />
              then pressure,
              <br />
              then finish.
            </blockquote>
            <p className="quote-note">
              先把动作做对，再把动作做快。Style 很重要，但顺序更重要。
            </p>
          </section>

          <section className="slash-card trophy-card">
            <div className="trophy-top">
              <Trophy className="h-5 w-5" />
              <span>WIN CONDITION / 过关条件</span>
            </div>
            <ul>
              {TROPHY_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="trophy-accent">
              <Zap className="h-4 w-4" />
              LOOK COOL. STAY CALM. KEEP ROLLING.
            </div>
          </section>
        </aside>
      </section>
    </PhantomShell>
  );
};

export default Home;

import { Crosshair, Sparkles, Sword } from "lucide-react";
import { PhantomShell } from "@/components/PhantomShell";
import { FEATURED_COMBO, MISSIONS } from "@/data/site";

const Mission = () => {
  return (
    <PhantomShell>
      <section className="content-grid mission-screen-grid">
        <section className="slash-card mission-card">
          <div className="section-head">
            <div>
              <p className="section-tag">MISSION BOARD / 任务总览</p>
              <h2 className="section-title">SELECT YOUR TARGET</h2>
            </div>
            <p className="section-note">
              真正的训练日不要同时打太多支线。选一个主题，把它打穿，进步会来得更快。
            </p>
          </div>
          <div className="mission-list">
            {MISSIONS.map((mission) => (
              <article key={mission.code} className="mission-item">
                <div className="mission-code">{mission.code}</div>
                <div className="mission-body">
                  <h3>{mission.title}</h3>
                  <p>{mission.detail}</p>
                  <p className="mission-reward">REWARD / {mission.reward}</p>
                </div>
                <div className="mission-rank">{mission.difficulty}</div>
              </article>
            ))}
          </div>
        </section>

        <aside className="intel-column">
          <section className="slash-card quote-card">
            <p className="quote-tag">FEATURED ROUTE / 推荐连段</p>
            <blockquote>
              Escape
              <br />
              is a combo,
              <br />
              not a panic.
            </blockquote>
            <ul className="combo-list">
              {FEATURED_COMBO.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>

          <section className="slash-card trophy-card">
            <div className="trophy-top">
              <Crosshair className="h-5 w-5" />
              <span>TARGETING HUD / 锁定提示</span>
            </div>
            <div className="hud-list">
              <div className="hud-item">
                <Sword className="h-4 w-4" />
                <span>One mission only / 一次只练一个主题</span>
              </div>
              <div className="hud-item">
                <Sparkles className="h-4 w-4" />
                <span>Make it repeatable / 先追求可重复</span>
              </div>
              <div className="hud-item">
                <Crosshair className="h-4 w-4" />
                <span>Track one clean win / 记录一次干净成功</span>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </PhantomShell>
  );
};

export default Mission;

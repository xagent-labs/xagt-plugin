import { PhantomShell, usePhantomProgress } from "@/components/PhantomShell";
import { ARSENAL_QUOTES, SECTIONS, WEAPONS } from "@/data/site";

const Arsenal = () => {
  const { checked, toggle } = usePhantomProgress();

  return (
    <PhantomShell>
      <section className="content-grid arsenal-screen-grid">
        <section className="arsenal-panel">
          <div className="section-head">
            <div>
              <p className="section-tag">ARSENAL / 技能武器库</p>
              <h2 className="section-title">BUILD YOUR MOVESET</h2>
            </div>
            <p className="section-note">
              与其把所有技术都碰一点，不如先把自己的四类核心路线打磨成真正能用的 moveset。
            </p>
          </div>

          <div className="arsenal-grid">
            {SECTIONS.map((section, sectionIndex) => {
              const Icon = section.icon;
              return (
                <article key={section.id} className={`skill-panel skill-panel-${sectionIndex + 1}`}>
                  <div className="skill-header">
                    <div className="skill-number">{section.code}</div>
                    <div>
                      <div className="skill-title-row">
                        <Icon className="h-4 w-4" />
                        <h3>{section.title}</h3>
                      </div>
                      <p>{section.subtitle}</p>
                    </div>
                  </div>

                  <ul className="skill-list">
                    {section.items.map((item, index) => {
                      const key = `${section.id}-${index}`;
                      return (
                        <li key={key}>
                          <label className="skill-item">
                            <input
                              type="checkbox"
                              checked={!!checked[key]}
                              onChange={() => toggle(key)}
                            />
                            <span className="skill-check" />
                            <span className="skill-copy">{item}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="intel-column">
          <section className="slash-card quote-card">
            <p className="quote-tag">TACTICAL VOICE / 战术语录</p>
            <blockquote>
              {ARSENAL_QUOTES[0]}
              <br />
              {ARSENAL_QUOTES[1]}
            </blockquote>
            <p className="quote-note">{ARSENAL_QUOTES[2]}</p>
          </section>

          <section className="slash-card mission-card">
            <div className="section-head compact">
              <div>
                <p className="section-tag">SIGNATURE SET / 招牌动作</p>
                <h2 className="section-title">WEAPON LIST</h2>
              </div>
            </div>
            <div className="weapon-list">
              {WEAPONS.map((weapon) => (
                <article key={weapon.name} className="weapon-item">
                  <div className="weapon-name">{weapon.name}</div>
                  <div className="weapon-type">{weapon.type}</div>
                  <div className="weapon-note">{weapon.note}</div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </PhantomShell>
  );
};

export default Arsenal;

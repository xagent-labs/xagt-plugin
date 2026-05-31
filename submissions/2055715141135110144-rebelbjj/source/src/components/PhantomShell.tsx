import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Star, Sword, VenetianMask } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  HOME_TAGLINES,
  NAV_ITEMS,
  SIX_MONTH_PLAN,
  STORAGE_KEY,
  TOTAL_CHECKBOXES,
} from "@/data/site";

export const usePhantomProgress = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const completed = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked],
  );
  const percent = Math.round((completed / TOTAL_CHECKBOXES) * 100);

  return {
    checked,
    completed,
    percent,
    toggle: (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] })),
  };
};

export const PhantomShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const pageCode = useMemo(() => {
    const found = NAV_ITEMS.find((item) => item.to === location.pathname);
    return found?.label.split(" / ")[0] ?? "HOME";
  }, [location.pathname]);

  return (
    <main className="phantom-stage min-h-screen overflow-hidden">
      <div className="phantom-noise" />
      <div className="speedlines speedlines-left" />
      <div className="speedlines speedlines-right" />
      <div className="starburst starburst-top" />
      <div className="starburst starburst-bottom" />
      <div className="silhouette silhouette-left" />
      <div className="silhouette silhouette-right" />
      <div className="mask-mark mask-mark-top">
        <VenetianMask className="h-7 w-7" />
      </div>
      <div className="mask-mark mask-mark-bottom">
        <VenetianMask className="h-7 w-7" />
      </div>

      <div className="phantom-container mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <header className="top-nav slash-card">
          <Link to="/" className="brand-lockup">
            <div className="brand-mark">
              <Sword className="h-4 w-4" />
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="brand-tag">SOLANA DEVNET / BJJ DOSSIER</p>
              <h1 className="brand-title">PHANTOM MAT PASS</h1>
            </div>
          </Link>

          <nav className="nav-row">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className="nav-pill"
                activeClassName="nav-pill-active"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="page-badge">
            <Star className="h-4 w-4" />
            <span>{pageCode} SCREEN</span>
          </div>
        </header>

        <section className="headline-strip">
          {HOME_TAGLINES.map((tagline) => (
            <div key={tagline} className="headline-chip">
              {tagline}
            </div>
          ))}
        </section>

        {children}
      </div>
    </main>
  );
};

export const MonthMiniList = ({
  checked,
  toggle,
}: {
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
}) => (
  <ul className="month-list">
    {SIX_MONTH_PLAN.map((goal, index) => {
      const key = `plan-${index}`;
      return (
        <li key={key}>
          <label className="month-item">
            <input
              type="checkbox"
              checked={!!checked[key]}
              onChange={() => toggle(key)}
            />
            <span className="month-index">0{index + 1}</span>
            <span className="month-copy">{goal}</span>
          </label>
        </li>
      );
    })}
  </ul>
);

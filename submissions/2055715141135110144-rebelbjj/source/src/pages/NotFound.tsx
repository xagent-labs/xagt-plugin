import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/lib/locale";

const NotFound = () => {
  const location = useLocation();
  const { pick } = useLocale();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="atlas-app">
      <div className="atlas-shell">
        <section className="atlas-hero atlas-panel">
          <div className="atlas-hero-copy">
            <div className="atlas-chip">404 ERROR</div>
            <p className="atlas-kicker">
              {pick({
                "zh-CN": "ROUTE LOST / 页面未找到",
                "zh-TW": "ROUTE LOST / 頁面未找到",
                en: "ROUTE LOST / PAGE NOT FOUND",
                ja: "ROUTE LOST / ページが見つかりません",
              })}
            </p>
            <h1 className="atlas-title">
              PAGE
              <span> LOST</span>
            </h1>
            <p className="atlas-description">
              {pick({
                "zh-CN": "这个入口暂时不存在。回到首页后，可以继续查看百日计划、训练日志、热身转盘和技巧库。",
                "zh-TW": "這個入口暫時不存在。回到首頁後，可以繼續查看百日計劃、訓練日誌、熱身轉盤和技巧庫。",
                en: "This route does not exist yet. Head back home to continue with the plan, logs, roulette, and move library.",
                ja: "このルートはまだ存在しません。ホームに戻って、プランや記録、ルーレット、技ライブラリを続けて使えます。",
              })}
            </p>
            <div className="rebel-home-cta-row">
              <Link to="/" className="rebel-button rebel-button-primary">
                <ArrowLeft className="h-4 w-4" />
                <span>
                  {pick({
                    "zh-CN": "返回首页",
                    "zh-TW": "返回首頁",
                    en: "Back Home",
                    ja: "ホームへ戻る",
                  })}
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default NotFound;

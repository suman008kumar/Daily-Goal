import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Timer,
  MoreHorizontal,
} from "lucide-react";
import "./MobileNavbar.css";

const MOBILE_ITEMS = [
  {
    label: "Home",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Monitor",
    path: "/live-monitoring",
    icon: Video,
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Sessions",
    path: "/sessions",
    icon: Timer,
  },
];

function MobileNavbar({ onMoreClick }) {
  return (
    <nav
      className="daily-goal-mobile-navbar"
      aria-label="Mobile navigation"
    >
      <div className="daily-goal-mobile-navbar__inner">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                [
                  "daily-goal-mobile-navbar__item",
                  isActive
                    ? "daily-goal-mobile-navbar__item--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <span className="daily-goal-mobile-navbar__icon">
                <Icon size={19} strokeWidth={2.1} />
              </span>

              <span className="daily-goal-mobile-navbar__label">
                {item.label}
              </span>
            </NavLink>
          );
        })}

        <button
          type="button"
          className="daily-goal-mobile-navbar__item daily-goal-mobile-navbar__more"
          onClick={onMoreClick}
          aria-label="Open more navigation options"
        >
          <span className="daily-goal-mobile-navbar__icon">
            <MoreHorizontal size={20} strokeWidth={2.1} />
          </span>

          <span className="daily-goal-mobile-navbar__label">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}

export default MobileNavbar;
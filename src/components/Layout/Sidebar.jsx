import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Timer,
  Bell,
  FileText,
  Users,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import logo from "../../assets/logo/D-G.png";

import "./Sidebar.css";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Live Monitoring",
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
  {
    label: "Alerts",
    path: "/alerts",
    icon: Bell,
  },
  {
    label: "Smart Report",
    path: "/smart-report",
    icon: FileText,
  },
  {
    label: "Live Users",
    path: "/live-users",
    icon: Users,
    badge: "DEMO",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

const SUPPORT_ITEM = {
  label: "Help & Support",
  icon: HelpCircle,
};

function Sidebar({
  isOpen = true,
  isCollapsed = false,
  onClose,
  onToggleCollapse,
}) {
  const handleNavigation = () => {
    if (window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="daily-goal-sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "daily-goal-sidebar",
          isOpen ? "daily-goal-sidebar--open" : "",
          isCollapsed
            ? "daily-goal-sidebar--collapsed"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

        {/* =====================================================
            BRAND
        ====================================================== */}

        <div className="daily-goal-sidebar__top">

          <NavLink
            to="/"
            className="daily-goal-sidebar__brand"
            onClick={handleNavigation}
            aria-label="Daily Goal Dashboard"
          >

            {/* ONLY LOGO - NO BACKGROUND */}
            <span className="daily-goal-sidebar__brand-logo">
              <img
                src={logo}
                alt="Daily Goal"
                className="daily-goal-sidebar__logo"
              />
            </span>

            <span className="daily-goal-sidebar__brand-content">

              <span className="daily-goal-sidebar__brand-name">
                <span className="daily-goal-sidebar__brand-daily">
                  Daily
                </span>{" "}
                <span className="daily-goal-sidebar__brand-goal">
                  Goal
                </span>
              </span>

              <span className="daily-goal-sidebar__brand-caption">
                Focus. Learn. Grow.
              </span>

            </span>

          </NavLink>

          <button
            type="button"
            className="daily-goal-sidebar__mobile-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>

        </div>

        {/* =====================================================
            NAVIGATION
        ====================================================== */}

        <div className="daily-goal-sidebar__navigation">

          <p className="daily-goal-sidebar__section-title">
            <span>Workspace</span>
          </p>

          <nav
            className="daily-goal-sidebar__nav"
            aria-label="Main navigation"
          >

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  onClick={handleNavigation}
                  className={({ isActive }) =>
                    [
                      "daily-goal-sidebar__nav-item",
                      isActive
                        ? "daily-goal-sidebar__nav-item--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                >

                  <span className="daily-goal-sidebar__nav-icon">
                    <Icon
                      size={20}
                      strokeWidth={2}
                    />
                  </span>

                  <span className="daily-goal-sidebar__nav-label">
                    {item.label}
                  </span>

                  {item.badge && (
                    <span className="daily-goal-sidebar__nav-badge">
                      {item.badge}
                    </span>
                  )}

                </NavLink>
              );
            })}

          </nav>
        </div>

        {/* =====================================================
            BOTTOM
        ====================================================== */}

        <div className="daily-goal-sidebar__bottom">

          <NavLink
            to="/help"
            className="daily-goal-sidebar__support"
            onClick={handleNavigation}
          >

            <span className="daily-goal-sidebar__nav-icon">
              <HelpCircle
                size={19}
                strokeWidth={2}
              />
            </span>

            <span className="daily-goal-sidebar__nav-label">
              {SUPPORT_ITEM.label}
            </span>

          </NavLink>

          <div className="daily-goal-sidebar__profile">

            <div
              className="daily-goal-sidebar__avatar"
              aria-hidden="true"
            >
              DG
            </div>

            <div className="daily-goal-sidebar__profile-info">
              <strong>Study Profile</strong>
              <span>Focus learner</span>
            </div>

            <span className="daily-goal-sidebar__profile-status" />

          </div>

          <button
            type="button"
            className="daily-goal-sidebar__collapse"
            onClick={onToggleCollapse}
            aria-label={
              isCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            title={
              isCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >

            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}

            <span>
              {isCollapsed
                ? "Expand"
                : "Collapse"}
            </span>

          </button>

        </div>
      </aside>
    </>
  );
}

export default Sidebar;
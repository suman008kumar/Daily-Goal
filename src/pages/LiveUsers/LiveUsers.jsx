import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  Focus,
  Monitor,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

import Badge from "../../components/Common/Badge";
import Button from "../../components/Common/Button";
import Modal from "../../components/Common/Modal";
import EmptyState from "../../components/Common/EmptyState";

import { getSessions } from "../../services/storageService";

import "./LiveUsers.css";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const STATUS_META = {
  ACTIVE: {
    label: "Active",
    variant: "success",
    icon: Activity,
  },
  PAUSED: {
    label: "Paused",
    variant: "warning",
    icon: Clock3,
  },
  IDLE: {
    label: "Idle",
    variant: "secondary",
    icon: EyeOff,
  },
  OFFLINE: {
    label: "Offline",
    variant: "inactive",
    icon: Monitor,
  },
};

const normalizeStatus = (value) => {
  const status = String(value || "").trim().toUpperCase();

  if (["RUNNING", "ACTIVE", "MONITORING"].includes(status)) {
    return "ACTIVE";
  }

  if (["PAUSED", "BREAK"].includes(status)) {
    return "PAUSED";
  }

  if (["IDLE", "WAITING"].includes(status)) {
    return "IDLE";
  }

  return "OFFLINE";
};

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const getScore = (session) =>
  clamp(
    session?.focusScore ??
      session?.score ??
      session?.focus ??
      session?.averageFocusScore ??
      0
  );

const getDurationSeconds = (session) =>
  Math.max(
    0,
    Number(
      session?.durationSeconds ??
        session?.elapsedSeconds ??
        session?.studyTimeSeconds ??
        session?.duration ??
        0
    ) || 0
  );

const getTimestamp = (session) =>
  session?.startTime ??
  session?.startedAt ??
  session?.createdAt ??
  session?.timestamp ??
  null;

const getFocusedSeconds = (session) =>
  Math.max(
    0,
    Number(
      session?.focusedSeconds ??
        session?.focusTimeSeconds ??
        session?.productiveSeconds ??
        0
    ) || 0
  );

const getDistractionSeconds = (session) =>
  Math.max(
    0,
    Number(
      session?.distractionSeconds ??
        session?.distractedSeconds ??
        session?.distractionTimeSeconds ??
        0
    ) || 0
  );

const getPhoneSeconds = (session) =>
  Math.max(
    0,
    Number(
      session?.phoneSeconds ??
        session?.phoneUsageSeconds ??
        session?.phoneTimeSeconds ??
        0
    ) || 0
  );

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  }

  return `${secs}s`;
};

const formatTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getDisplayName = (session, index) =>
  session?.userName ||
  session?.studentName ||
  session?.name ||
  session?.user?.name ||
  session?.profile?.name ||
  `Study User ${index + 1}`;

const getInitials = (name) => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "DG";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const getAttentionState = (session, score) => {
  if (session?.attention) {
    return String(session.attention);
  }

  if (score >= 85) return "Focused";
  if (score >= 70) return "Mostly Focused";
  if (score >= 50) return "Needs Attention";

  return "Distracted";
};

const getUserKey = (session, index) =>
  session?.userId ||
  session?.studentId ||
  session?.user?.id ||
  session?.id ||
  `live-user-${index}`;

const getLatestSessionPerUser = (sessions) => {
  const map = new Map();

  sessions.forEach((session, index) => {
    const key = getUserKey(session, index);
    const previous = map.get(key);

    if (!previous) {
      map.set(key, { session, index });
      return;
    }

    const currentTime = new Date(getTimestamp(session) || 0).getTime();
    const previousTime = new Date(
      getTimestamp(previous.session) || 0
    ).getTime();

    if (currentTime >= previousTime) {
      map.set(key, { session, index });
    }
  });

  return Array.from(map.values());
};

const buildLiveUser = (session, index) => {
  const score = getScore(session);
  const status = normalizeStatus(
    session?.monitoringStatus ?? session?.status ?? session?.state
  );

  return {
    id: getUserKey(session, index),
    name: getDisplayName(session, index),
    initials: getInitials(getDisplayName(session, index)),
    status,
    score,
    attention: getAttentionState(session, score),
    durationSeconds: getDurationSeconds(session),
    focusedSeconds: getFocusedSeconds(session),
    distractionSeconds: getDistractionSeconds(session),
    phoneSeconds: getPhoneSeconds(session),
    startTime: getTimestamp(session),
    cameraEnabled: session?.cameraEnabled !== false,
    aiMode: session?.aiMode || session?.mode || "DEMO",
    session,
  };
};

/* -------------------------------------------------------------------------- */
/* Stat Card                                                                  */
/* -------------------------------------------------------------------------- */

const LiveStat = ({ icon: Icon, label, value, helper, tone = "primary" }) => (
  <div className={`live-users__stat live-users__stat--${tone}`}>
    <div className="live-users__stat-icon">
      <Icon size={19} strokeWidth={2.2} />
    </div>

    <div className="live-users__stat-content">
      <span className="live-users__stat-label">{label}</span>
      <strong className="live-users__stat-value">{value}</strong>
      {helper && <span className="live-users__stat-helper">{helper}</span>}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* User Row                                                                   */
/* -------------------------------------------------------------------------- */

const UserRow = ({ user, onOpen }) => {
  const statusMeta = STATUS_META[user.status] || STATUS_META.OFFLINE;
  const StatusIcon = statusMeta.icon;

  return (
    <button
      type="button"
      className="live-users__row"
      onClick={() => onOpen(user)}
      aria-label={`Open ${user.name}`}
    >
      <div className="live-users__user">
        <div className="live-users__avatar-wrap">
          <div className="live-users__avatar">{user.initials}</div>

          {user.status === "ACTIVE" && (
            <span className="live-users__online-dot" />
          )}
        </div>

        <div className="live-users__user-info">
          <strong>{user.name}</strong>

          <span>
            <Clock3 size={13} />
            {formatDuration(user.durationSeconds)}
          </span>
        </div>
      </div>

      <div className="live-users__status">
        <Badge
          variant={statusMeta.variant}
          size="sm"
          icon={<StatusIcon size={13} />}
          showIcon
          pulse={user.status === "ACTIVE"}
        >
          {statusMeta.label}
        </Badge>
      </div>

      <div className="live-users__focus">
        <div className="live-users__focus-top">
          <span>Focus</span>
          <strong>{Math.round(user.score)}%</strong>
        </div>

        <div className="live-users__mini-progress">
          <span style={{ width: `${user.score}%` }} />
        </div>
      </div>

      <div className="live-users__attention">
        <span className="live-users__attention-icon">
          <Focus size={15} />
        </span>

        <span>{user.attention}</span>
      </div>

      <div className="live-users__camera">
        {user.cameraEnabled ? (
          <span className="live-users__camera-on">
            <Camera size={16} />
            Camera
          </span>
        ) : (
          <span className="live-users__camera-off">
            <Camera size={16} />
            Off
          </span>
        )}
      </div>

      <div className="live-users__arrow">
        <MoreHorizontal size={20} />
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Details                                                                    */
/* -------------------------------------------------------------------------- */

const UserDetails = ({ user }) => {
  if (!user) return null;

  const statusMeta = STATUS_META[user.status] || STATUS_META.OFFLINE;
  const StatusIcon = statusMeta.icon;

  return (
    <div className="live-users__details">
      <div className="live-users__details-hero">
        <div className="live-users__details-avatar">
          {user.initials}

          {user.status === "ACTIVE" && (
            <span className="live-users__details-live-dot" />
          )}
        </div>

        <div>
          <div className="live-users__details-name">{user.name}</div>

          <div className="live-users__details-meta">
            <Badge
              variant={statusMeta.variant}
              size="sm"
              icon={<StatusIcon size={13} />}
              showIcon
              pulse={user.status === "ACTIVE"}
            >
              {statusMeta.label}
            </Badge>

            <span>
              <Clock3 size={14} />
              Started {formatTime(user.startTime)}
            </span>
          </div>
        </div>
      </div>

      <div className="live-users__details-score">
        <div className="live-users__details-score-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle
              className="live-users__details-track"
              cx="60"
              cy="60"
              r="48"
            />

            <circle
              className="live-users__details-progress"
              cx="60"
              cy="60"
              r="48"
              strokeDasharray={`${user.score * 3.0159} 301.59`}
            />
          </svg>

          <div>
            <strong>{Math.round(user.score)}</strong>
            <span>Focus</span>
          </div>
        </div>

        <div className="live-users__details-score-copy">
          <span>Current attention</span>
          <strong>{user.attention}</strong>
          <p>
            Focus performance is calculated from the available local session
            monitoring data.
          </p>
        </div>
      </div>

      <div className="live-users__details-grid">
        <div>
          <span>Study Time</span>
          <strong>{formatDuration(user.durationSeconds)}</strong>
        </div>

        <div>
          <span>Focused Time</span>
          <strong>{formatDuration(user.focusedSeconds)}</strong>
        </div>

        <div>
          <span>Distraction</span>
          <strong>{formatDuration(user.distractionSeconds)}</strong>
        </div>

        <div>
          <span>Phone Usage</span>
          <strong>{formatDuration(user.phoneSeconds)}</strong>
        </div>
      </div>

      <div className="live-users__details-monitor">
        <div>
          <ShieldCheck size={17} />
          <span>Camera Monitoring</span>
          <strong>{user.cameraEnabled ? "Enabled" : "Disabled"}</strong>
        </div>

        <div>
          <Brain size={17} />
          <span>AI Mode</span>
          <strong>{user.aiMode}</strong>
        </div>
      </div>

      {user.status === "ACTIVE" && (
        <div className="live-users__details-note">
          <Zap size={17} />
          <div>
            <strong>Live monitoring</strong>
            <span>
              This view reflects the latest locally available session data.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

const LiveUsers = () => {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [focusFilter, setFocusFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadUsers = useCallback(() => {
    setIsRefreshing(true);

    try {
      const storedSessions = getSessions();
      setSessions(Array.isArray(storedSessions) ? storedSessions : []);
    } catch (error) {
      console.warn("Unable to load live user data:", error);
      setSessions([]);
    } finally {
      window.setTimeout(() => {
        setIsRefreshing(false);
      }, 350);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    const handleStorage = () => {
      loadUsers();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadUsers]);

  const liveUsers = useMemo(() => {
    const latest = getLatestSessionPerUser(sessions);

    return latest.map(({ session, index }) =>
      buildLiveUser(session, index)
    );
  }, [sessions]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return liveUsers.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        String(user.id).toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || user.status === statusFilter;

      const matchesFocus =
        focusFilter === "ALL" ||
        (focusFilter === "HIGH" && user.score >= 85) ||
        (focusFilter === "MEDIUM" && user.score >= 70 && user.score < 85) ||
        (focusFilter === "LOW" && user.score < 70);

      return matchesSearch && matchesStatus && matchesFocus;
    });
  }, [liveUsers, search, statusFilter, focusFilter]);

  const stats = useMemo(() => {
    const active = liveUsers.filter((user) => user.status === "ACTIVE");
    const paused = liveUsers.filter((user) => user.status === "PAUSED");

    const averageFocus =
      liveUsers.length > 0
        ? liveUsers.reduce((sum, user) => sum + user.score, 0) /
          liveUsers.length
        : 0;

    const cameraUsers = liveUsers.filter((user) => user.cameraEnabled);

    return {
      total: liveUsers.length,
      active: active.length,
      paused: paused.length,
      averageFocus,
      cameraUsers: cameraUsers.length,
    };
  }, [liveUsers]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setFocusFilter("ALL");
  };

  const hasFilters =
    search.trim() || statusFilter !== "ALL" || focusFilter !== "ALL";

  return (
    <div className="live-users-page">
      <div className="live-users-page__ambient live-users-page__ambient--one" />
      <div className="live-users-page__ambient live-users-page__ambient--two" />

      {/* Header */}
      <header className="live-users__header">
        <div>
          <div className="live-users__eyebrow">
            <span className="live-users__eyebrow-dot" />
            Live Monitoring
          </div>

          <h1>Live Users</h1>

          <p>
            Monitor currently available study sessions and focus activity from
            your local DAILY GOAL data.
          </p>
        </div>

        <div className="live-users__header-actions">
          <Badge
            variant="ai"
            size="md"
            icon={<Brain size={15} />}
            showIcon
            pulse
          >
            Frontend AI
          </Badge>

          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={17} />}
            loading={isRefreshing}
            loadingText="Refreshing"
            onClick={loadUsers}
          >
            Refresh
          </Button>
        </div>
      </header>

      {/* Demo Notice */}
      <section className="live-users__demo-notice">
        <div className="live-users__demo-icon">
          <UsersRound size={21} />
        </div>

        <div>
          <strong>Live Users uses local session data</strong>
          <span>
            No backend or real-time user network is connected. Active users
            shown here come from the latest available sessions in this browser.
          </span>
        </div>

        <Badge variant="warning" size="sm">
          LOCAL DATA
        </Badge>
      </section>

      {/* Stats */}
      <section className="live-users__stats">
        <LiveStat
          icon={UsersRound}
          label="Tracked Users"
          value={stats.total}
          helper="Latest unique sessions"
          tone="primary"
        />

        <LiveStat
          icon={Activity}
          label="Active Now"
          value={stats.active}
          helper="Currently running"
          tone="success"
        />

        <LiveStat
          icon={Clock3}
          label="Paused"
          value={stats.paused}
          helper="Paused sessions"
          tone="warning"
        />

        <LiveStat
          icon={Focus}
          label="Average Focus"
          value={`${Math.round(stats.averageFocus)}%`}
          helper="Across available users"
          tone="accent"
        />
      </section>

      {/* Toolbar */}
      <section className="live-users__toolbar">
        <div className="live-users__search">
          <Search size={18} />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users..."
            aria-label="Search users"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="live-users__toolbar-actions">
          <button
            type="button"
            className={`live-users__filter-toggle ${
              showFilters ? "is-active" : ""
            }`}
            onClick={() => setShowFilters((value) => !value)}
          >
            <Filter size={17} />
            Filters
            {hasFilters && <span className="live-users__filter-count">!</span>}
          </button>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </div>
      </section>

      {/* Filters */}
      {showFilters && (
        <section className="live-users__filters">
          <div className="live-users__filter-group">
            <label htmlFor="live-status-filter">Status</label>

            <select
              id="live-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="IDLE">Idle</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          <div className="live-users__filter-group">
            <label htmlFor="live-focus-filter">Focus Level</label>

            <select
              id="live-focus-filter"
              value={focusFilter}
              onChange={(event) => setFocusFilter(event.target.value)}
            >
              <option value="ALL">All Levels</option>
              <option value="HIGH">High · 85%+</option>
              <option value="MEDIUM">Medium · 70–84%</option>
              <option value="LOW">Low · Below 70%</option>
            </select>
          </div>

          <div className="live-users__filter-summary">
            <span>Showing</span>
            <strong>{filteredUsers.length}</strong>
            <span>of {liveUsers.length}</span>
          </div>
        </section>
      )}

      {/* User List */}
      <section className="live-users__card">
        <div className="live-users__card-header">
          <div>
            <div className="live-users__card-title">
              <span className="live-users__live-icon">
                <Activity size={17} />
              </span>
              Current Sessions
            </div>

            <p>
              Latest session for each locally available user.
            </p>
          </div>

          <Badge variant="active" size="sm" dot pulse>
            {stats.active} Active
          </Badge>
        </div>

        {filteredUsers.length > 0 ? (
          <div className="live-users__table">
            <div className="live-users__table-head">
              <span>User</span>
              <span>Status</span>
              <span>Focus</span>
              <span>Attention</span>
              <span>Camera</span>
              <span />
            </div>

            <div className="live-users__table-body">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onOpen={setSelectedUser}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="live-users__empty">
            <EmptyState
              iconKey={hasFilters ? "search" : "users"}
              title={
                hasFilters
                  ? "No matching users"
                  : "No live session data yet"
              }
              description={
                hasFilters
                  ? "Try changing your search or filters."
                  : "Start a study session to see its monitoring information here."
              }
              size="md"
              animated
              showDecoration
              action={
                hasFilters
                  ? {
                      label: "Clear Filters",
                      variant: "secondary",
                      onClick: clearFilters,
                    }
                  : undefined
              }
            />
          </div>
        )}
      </section>

      {/* Privacy */}
      <section className="live-users__privacy">
        <div className="live-users__privacy-icon">
          <ShieldCheck size={20} />
        </div>

        <div>
          <strong>Privacy-first monitoring</strong>
          <span>
            DAILY GOAL keeps monitoring data in the browser unless you
            explicitly connect another storage or service.
          </span>
        </div>

        <div className="live-users__privacy-items">
          <span>
            <CheckCircle2 size={15} />
            Local session data
          </span>

          <span>
            <CheckCircle2 size={15} />
            No remote user tracking
          </span>

          <span>
            <CheckCircle2 size={15} />
            Camera permission required
          </span>
        </div>
      </section>

      {/* Details Modal */}
      <Modal
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? `${selectedUser.name} — Live Details` : "Live Details"}
        subtitle="Current monitoring information"
        size="md"
        variant="default"
        showIcon
        icon={<UsersRound size={20} />}
      >
        <UserDetails user={selectedUser} />
      </Modal>
    </div>
  );
};

export default LiveUsers;
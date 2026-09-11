"use client";
import { useState, useRef, useEffect } from "react";

export default function MultiSelectDropdown({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select...",
  className = "",
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Click outside detection
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleOption = (option) => {
    let next;
    if (selected.includes(option)) {
      next = selected.filter(item => item !== option);
    } else {
      next = [...selected, option];
    }
    onChange(next);
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    onChange([...options]);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  // Determine display label
  let label = placeholder;
  if (selected.length > 0) {
    if (selected.length === options.length) {
      label = placeholder.startsWith("All ") ? placeholder : `All Selected (${selected.length})`;
    } else if (selected.length === 1) {
      label = selected[0];
    } else {
      // E.g., "2 Companies" or "2 Months"
      const unit = placeholder.replace(/^All\s+/, ""); // "Companies" or "Months"
      label = `${selected.length} ${unit}`;
    }
  }

  const hasAll = selected.length === options.length;
  const hasSome = selected.length > 0 && selected.length < options.length;

  return (
    <div
      ref={containerRef}
      className={`multiselect-container ${className}`}
      style={{ position: "relative", display: "inline-block", ...style }}
    >
      <style>{`
        .multiselect-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 10px;
          font-size: 12px;
          border: 1px solid var(--border-md, var(--color-border, var(--color-border)));
          border-radius: var(--r-md, var(--radius-md, 6px));
          background: var(--surface-1, var(--color-surface, var(--color-surface)));
          color: var(--text-main, var(--color-ink, var(--text-main)));
          cursor: pointer;
          min-width: 140px;
          height: 29px;
          user-select: none;
          gap: 8px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .multiselect-trigger:hover {
          border-color: var(--teal, var(--color-accent, var(--color-primary)));
        }
        .multiselect-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }
        .multiselect-arrow {
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid var(--text-muted, var(--color-ink-muted, var(--text-muted)));
          margin-top: 2px;
          transition: transform 0.15s;
        }
        .multiselect-arrow.open {
          transform: rotate(180deg);
        }
        .multiselect-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 999;
          min-width: 200px;
          max-height: 260px;
          background: var(--surface-1, var(--color-surface, var(--color-surface)));
          border: 1px solid var(--border, var(--color-border, var(--color-border)));
          border-radius: var(--r-md, var(--radius-md, 8px));
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          overflow-y: auto;
          padding: 6px;
        }
        .multiselect-actions {
          display: flex;
          justify-content: space-between;
          padding-bottom: 6px;
          margin-bottom: 6px;
          border-bottom: 1px solid var(--border-md, var(--color-border, var(--color-border)));
        }
        .multiselect-btn {
          background: none;
          border: none;
          font-size: 11px;
          color: var(--teal, var(--color-accent, var(--color-primary)));
          cursor: pointer;
          font-weight: 600;
          padding: 2px 4px;
        }
        .multiselect-btn:hover {
          text-decoration: underline;
        }
        .multiselect-item {
          display: flex;
          align-items: center;
          padding: 5px 8px;
          font-size: 12px;
          color: var(--text-main, var(--color-ink, var(--text-main)));
          cursor: pointer;
          border-radius: var(--r-sm, 4px);
          user-select: none;
          transition: background 0.1s;
        }
        .multiselect-item:hover {
          background: var(--surface-2, var(--color-surface-hover, var(--color-surface-2)));
        }
        .multiselect-checkbox {
          margin-right: 8px;
          width: 13px;
          height: 13px;
          cursor: pointer;
          accent-color: var(--teal, var(--color-accent, var(--color-primary)));
        }
        .multiselect-item-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      <div className="multiselect-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="multiselect-label">{label}</span>
        <span className={`multiselect-arrow ${isOpen ? "open" : ""}`} />
      </div>

      {isOpen && (
        <div className="multiselect-dropdown">
          <div className="multiselect-actions">
            <button className="multiselect-btn" onClick={handleSelectAll}>Select All</button>
            <button className="multiselect-btn" onClick={handleClearAll}>Clear</button>
          </div>
          {options.map((option) => {
            const isChecked = selected.includes(option);
            return (
              <div
                key={option}
                className="multiselect-item"
                onClick={() => handleToggleOption(option)}
              >
                <input
                  type="checkbox"
                  className="multiselect-checkbox"
                  checked={isChecked}
                  readOnly
                />
                <span className="multiselect-item-label">{option}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

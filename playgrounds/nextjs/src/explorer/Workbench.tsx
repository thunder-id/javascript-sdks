// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {createTheme, Theme} from '@thunderid/browser';
import {ThemeContext, ThemeContextValue} from '@thunderid/react';
import {ChangeEvent, CSSProperties, ReactElement, useEffect, useMemo, useRef, useState} from 'react';
import {A11yFinding, auditElement, CANVAS_BACKGROUND} from './a11y';
import type {Args, ArgValue, ComponentDef, PropControl, StoryDef} from './types';
import ErrorBoundary from '../components/ErrorBoundary';
import {Copy} from '../components/Icons';
import {timestamp} from '../lib/events';

export type Viewport = 'desktop' | 'tablet' | 'mobile';
export type PreviewTheme = 'dark' | 'light';
export type PanelTab = 'controls' | 'code' | 'actions' | 'a11y';

interface WorkbenchProps {
  component: ComponentDef;
  grid: boolean;
  onTabChange: (tab: PanelTab) => void;
  previewTheme: PreviewTheme;
  story: StoryDef;
  tab: PanelTab;
  viewport: Viewport;
}

interface ActionEntry {
  detail: string;
  id: number;
  name: string;
  time: string;
}

const VIEWPORT_WIDTH: Record<Viewport, string> = {desktop: '100%', mobile: '375px', tablet: '768px'};

const TABS: [PanelTab, string][] = [
  ['controls', 'Controls'],
  ['code', 'Code'],
  ['actions', 'Actions'],
  ['a11y', 'Accessibility'],
];

const formatDefault = (value: ArgValue | undefined): string => {
  if (value === undefined || value === '') return '-';
  if (typeof value === 'string') return `'${value}'`;

  return String(value);
};

const ControlInput = ({
  control,
  onChange,
  value,
}: {
  control: PropControl;
  onChange: (value: ArgValue) => void;
  value: ArgValue | undefined;
}): ReactElement => {
  if (control.control === 'bool') {
    return (
      <button
        type="button"
        role="switch"
        className="pg-switch"
        aria-checked={value === true}
        aria-label={control.name}
        onClick={() => onChange(value !== true)}
      >
        <span />
      </button>
    );
  }

  if (control.control === 'text' || control.control === 'number') {
    const isNumber: boolean = control.control === 'number';

    return (
      <input
        className="pg-input"
        type={isNumber ? 'number' : 'text'}
        aria-label={control.name}
        value={String(value ?? '')}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(isNumber ? Number(event.target.value) : event.target.value)
        }
      />
    );
  }

  return (
    <div role="radiogroup" aria-label={control.name} className="pg-options">
      {control.control.map((option: string) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

const buildCode = (component: ComponentDef, args: Args): string => {
  const snippet = component.code(args);
  const imports: string[] = Array.from(new Set(snippet.imports)).sort();
  const body: string = snippet.jsx
    .split('\n')
    .map((line: string) => `    ${line}`)
    .join('\n');

  const other: string = snippet.otherImports?.length ? `${snippet.otherImports.join('\n')}\n` : '';

  // SDK components use hooks and server actions, so the file that renders them is a client component.
  return `'use client';\n\n${other}import {${imports.join(', ')}} from '${snippet.from ?? '@thunderid/nextjs'}';\n\nexport default function Example() {\n  return (\n${body}\n  );\n}`;
};

const Workbench = ({
  component,
  grid,
  onTabChange,
  previewTheme,
  story,
  tab,
  viewport,
}: WorkbenchProps): ReactElement => {
  const [args, setArgs] = useState<Args>(() => ({...component.defaults, ...story.args}));
  const [log, setLog] = useState<ActionEntry[]>([]);
  const [findings, setFindings] = useState<A11yFinding[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const dark: boolean = previewTheme === 'dark';
  const theme: Theme = useMemo(() => createTheme({}, dark), [dark]);
  const themeValue: ThemeContextValue = useMemo(
    () => ({colorScheme: previewTheme, direction: 'ltr', theme, toggleTheme: () => undefined}),
    [previewTheme, theme],
  );

  const action = (name: string, detail = ''): void => {
    setLog((previous: ActionEntry[]) =>
      [{detail, id: (previous[0]?.id ?? 0) + 1, name, time: timestamp()}, ...previous].slice(0, 50),
    );
  };

  // Re-audit whenever the rendered story changes, including async renders from live components.
  useEffect(() => {
    const frame: HTMLDivElement | null = frameRef.current;

    if (!frame) return undefined;

    let pending = 0;
    const audit = (): void => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => setFindings(auditElement(frame, CANVAS_BACKGROUND[previewTheme])));
    };
    const observer: MutationObserver = new MutationObserver(audit);

    observer.observe(frame, {attributes: true, characterData: true, childList: true, subtree: true});
    audit();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
    };
  }, [previewTheme, viewport]);

  const code: string = buildCode(component, args);

  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const frameStyle: CSSProperties = {
    ...(theme.cssVariables as CSSProperties),
    width: VIEWPORT_WIDTH[viewport],
  };

  return (
    <>
      <div className="pg-canvas" data-theme={previewTheme} data-grid={grid}>
        <div ref={frameRef} className="pg-frame" data-viewport={viewport} style={frameStyle}>
          <div className="pg-frame-inner">
            <ThemeContext.Provider value={themeValue}>
              <ErrorBoundary>{component.render(args, action)}</ErrorBoundary>
            </ThemeContext.Provider>
          </div>
        </div>
      </div>

      <section aria-label="Story tools" className="pg-panel">
        <div role="tablist" className="pg-tabs">
          {TABS.map(([id, label]: [PanelTab, string]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => onTabChange(id)}>
              {label}
              {id === 'actions' && log.length > 0 && <span className="pg-count">{log.length}</span>}
              {id === 'a11y' && findings.some((finding: A11yFinding) => finding.result !== 'Pass') && (
                <span className="pg-count">
                  {findings.filter((finding: A11yFinding) => finding.result !== 'Pass').length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="pg-panel-body" role="tabpanel">
          {tab === 'controls' &&
            (component.controls.length ? (
              <div role="table" aria-label="Props" className="pg-props">
                <div role="row" className="pg-props-row" data-head="true">
                  <span role="columnheader">Name</span>
                  <span role="columnheader">Description</span>
                  <span role="columnheader">Default</span>
                  <span role="columnheader">Control</span>
                </div>
                {component.controls.map((control: PropControl) => (
                  <div key={control.name} role="row" className="pg-props-row">
                    <span role="cell" className="pg-prop-name">
                      {control.name}
                    </span>
                    <span role="cell" className="pg-prop-desc">
                      {control.description}
                      <code>{control.type}</code>
                    </span>
                    <span role="cell" className="pg-prop-default">
                      {formatDefault(component.defaults[control.name])}
                    </span>
                    <div role="cell">
                      <ControlInput
                        control={control}
                        value={args[control.name]}
                        onChange={(value: ArgValue) =>
                          setArgs((previous: Args) => ({...previous, [control.name]: value}))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pg-empty">This component has no editable props in the playground.</p>
            ))}

          {tab === 'code' && (
            <div className="pg-code">
              <div className="pg-row" style={{alignItems: 'center'}}>
                <span className="pg-card-meta">Next.js client component · generated from the current props</span>
                <div className="pg-spacer" />
                <button type="button" className="pg-btn" data-size="sm" onClick={() => void copyCode()}>
                  <Copy />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre>{code}</pre>
            </div>
          )}

          {tab === 'actions' && (
            <div className="pg-actions-log">
              {log.map((entry: ActionEntry) => (
                <div key={entry.id}>
                  <span>{entry.time}</span>
                  <span>{entry.name}</span>
                  <span title={entry.detail}>{entry.detail}</span>
                </div>
              ))}
              {log.length === 0 && <p className="pg-empty">Interact with the preview to log events here.</p>}
            </div>
          )}

          {tab === 'a11y' && (
            <ul className="pg-a11y">
              {findings.map((finding: A11yFinding) => (
                <li key={finding.rule}>
                  <span className="pg-a11y-badge" data-result={finding.result}>
                    {finding.result}
                  </span>
                  <span className="pg-a11y-rule">{finding.rule}</span>
                  <span className="pg-a11y-detail">{finding.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
};

export default Workbench;

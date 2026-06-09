// =====================================================================
// heimdall-boot.js — runtime loader for the REAL Heimdall component
// library. Fetches the original .tsx/.ts source (imported verbatim from
// github.com/tinkermonkey/heimdall), strips only the import/export
// *statements*, lets Babel strip the *types* + transpile JSX, then evals
// the result so every real component is exposed as a global.
//
// The compiled heimdall bundle is cached in localStorage (it never
// changes), so only the very first load pays the compile cost. The app
// layer (lab-*.jsx + data) is always recompiled fresh.
// =====================================================================
(function () {
  var CACHE_KEY = 'heimdall_bundle_v3';

  // Real Heimdall source — dependency order: support .ts, utils/hooks, Icon, then
  // components. Bare names resolve to src/components/; src/* paths are verbatim.
  var HEIM_FILES = [
    'statusColors.ts', 'dropdownPlacement.ts', 'chartColors.ts', 'chartTone.ts',
    'src/utils/dateUtils.ts', 'src/utils/heatmapUtils.ts',
    'src/utils/graph.ts', 'src/utils/graphLayout.ts',
    'src/hooks/usePanZoom.ts', 'src/hooks/useDropdownMenu.ts', 'src/hooks/useFocusTrap.ts',
    'src/hooks/useBodyOverflow.ts', 'src/hooks/useVirtualList.ts',
    'Icon.tsx',
    'Button.tsx', 'Chip.tsx', 'Badge.tsx', 'Avatar.tsx', 'VersionPill.tsx', 'ProgressBar.tsx',
    'SegmentedControl.tsx', 'TabBar.tsx',
    'TextInput.tsx', 'TextArea.tsx', 'NumberInput.tsx', 'Select.tsx', 'TriState.tsx', 'Field.tsx',
    'AppTitle.tsx', 'Titlebar.tsx', 'NavItem.tsx', 'Sidebar.tsx', 'Topbar.tsx', 'Statusbar.tsx', 'ShellLayout.tsx',
    'Panel.tsx', 'StatTile.tsx', 'StatGrid.tsx', 'MetricRow.tsx', 'KVGrid.tsx', 'Table.tsx',
    'AlertStrip.tsx', 'ConfigTile.tsx', 'QuickAccessTile.tsx', 'QuickAccessGrid.tsx',
    'ActivityTimeline.tsx', 'PageHeader.tsx', 'FilterBar.tsx', 'RowMenu.tsx', 'LogStream.tsx',
    'AssetCard.tsx', 'AssetGrid.tsx', 'ResultCard.tsx', 'PipelineCard.tsx', 'FormCallout.tsx',
    'HierarchyRow.tsx', 'HierarchyTree.tsx', 'VersionTimeline.tsx', 'OrderedList.tsx',
    'ChartWrapper.tsx', 'Sparkline.tsx', 'LineChart.tsx', 'BarChart.tsx', 'BarH.tsx', 'BarV.tsx',
    'StackedBar.tsx', 'Donut.tsx', 'Heatmap.tsx', 'StatusTimeline.tsx',
    'Modal.tsx', 'ConfirmDialog.tsx', 'Drawer.tsx', 'Toast.tsx', 'CommandPalette.tsx',
    'FilterDropdown.tsx', 'WorkspaceSwitcherDialog.tsx', 'SplitPane.tsx', 'InspectorPanel.tsx',
    'EntityPicker.tsx', 'KeyValueEditor.tsx', 'RelationshipBuilder.tsx',
    'GraphCanvasContext.tsx', 'GraphCanvas.tsx', 'GraphNode.tsx', 'GraphEdge.tsx',
    'GraphInspector.tsx', 'TopologyNode.tsx', 'LineageRail.tsx',
    'ChatMessage.tsx', 'ChatDivider.tsx', 'ChatSuggestions.tsx', 'ChatComposer.tsx', 'ChatContainer.tsx',
  ];

  // App layer — authored for this project, always fresh (uses heimdall globals).
  // All app files live under app/.
  var APP_FILES = [
    'data.js', 'data-ext.js',
    'lab-icons.jsx',
    'view-overview.jsx', 'view-containers.jsx', 'view-topology.jsx',
    'view-network.jsx', 'view-other.jsx',
    'chat-rail.jsx', 'lab-tweaks.jsx', 'lab-app.jsx',
  ];

  function stripImports(src) {
    var lines = src.split('\n'), out = [], i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*import\b/.test(line)) {
        var j = i;
        while (j < lines.length && !/from\s+['"][^'"]+['"]\s*;?\s*$|^\s*import\s+['"][^'"]+['"]\s*;?\s*$/.test(lines[j])) j++;
        i = j + 1; continue;
      }
      out.push(line); i++;
    }
    return out.join('\n');
  }

  function stripExports(src) {
    var names = [];
    src = src.replace(/^[ \t]*export\s+default\s+.*$/gm, '');
    src = src.replace(/\bexport\s+(const|function|class)\s+([A-Za-z0-9_$]+)/g, function (m, k, n) { names.push(n); return k + ' ' + n; });
    src = src.replace(/\bexport\s+type\s*\{[\s\S]*?\}\s*(?:from\s*['"][^'"]+['"])?\s*;?/g, '');
    src = src.replace(/\bexport\s*\{[\s\S]*?\}\s*(?:from\s*['"][^'"]+['"])?\s*;?/g, '');
    src = src.replace(/\bexport\s+(interface|type|enum)\s+/g, '$1 ');
    return { src: src, names: names };
  }

  // Library files: src/* paths are verbatim; bare names live in src/components/.
  function resolveHeim(f) { return f.indexOf('/') < 0 ? 'src/components/' + f : f; }

  async function fetchText(f) {
    var res = await fetch(f);
    if (!res.ok) throw new Error(f + ' HTTP ' + res.status);
    return res.text();
  }

  function compileFile(f, src, opts) {
    src = stripImports(src);
    var r = stripExports(src);
    var presets = opts.ts
      ? [['typescript', { isTSX: true, allExtensions: true }], ['react', { runtime: 'classic' }]]
      : [['react', { runtime: 'classic' }]];
    var code = Babel.transform(r.src, {
      filename: f.replace(/\.[jt]sx?$/, '') + '.tsx',
      presets: presets, compact: false, comments: false,
    }).code;
    var assigns = r.names.map(function (n) { return 'try{window[' + JSON.stringify(n) + ']=' + n + ';}catch(e){}'; }).join('');
    // Wrap each file in an IIFE so module-local top-level names stay private
    // (mirrors real ES module scoping); only window-assigned exports leak.
    return ';(function(){\n' + code + '\n' + assigns + '\n})();\n';
  }

  async function buildHeimdall() {
    var cached = null;
    try { cached = localStorage.getItem(CACHE_KEY); } catch (e) {}
    if (cached) return cached;
    var parts = [];
    for (var k = 0; k < HEIM_FILES.length; k++) {
      var f = HEIM_FILES[k];
      var src = await fetchText(resolveHeim(f));
      parts.push(compileFile(f, src, { ts: true }));
    }
    var bundle = parts.join('\n');
    try { localStorage.setItem(CACHE_KEY, bundle); } catch (e) {}
    return bundle;
  }

  async function buildApp() {
    var parts = [];
    for (var k = 0; k < APP_FILES.length; k++) {
      var f = APP_FILES[k];
      var src = await fetchText('app/' + f);
      var isPlain = /\.js$/.test(f);
      // plain data files: run as-is (they self-assign to window); jsx: compile
      parts.push(isPlain ? src : compileFile(f, src, { ts: false }));
    }
    return parts.join('\n');
  }

  function installGlobals() {
    var R = window.React;
    var hookNames = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback',
      'useLayoutEffect', 'useId', 'useImperativeHandle', 'useContext', 'useReducer',
      'useTransition', 'useDeferredValue', 'useSyncExternalStore', 'createContext',
      'forwardRef', 'memo', 'Fragment', 'Children', 'cloneElement', 'isValidElement', 'createElement'];
    hookNames.forEach(function (n) { if (R && R[n] !== undefined) window[n] = R[n]; });
    if (window.ReactDOM) {
      window.createPortal = window.ReactDOM.createPortal;
      window.flushSync = window.ReactDOM.flushSync;
    }
  }

  function fail(msg) {
    var el = document.getElementById('boot-status');
    if (el) { el.textContent = msg; el.classList.add('boot-status--error'); }
    console.error('[heimdall-boot]', msg);
  }

  async function boot() {
    try {
      installGlobals();
      var heim = await buildHeimdall();
      (0, eval)(heim);            // expose all heimdall components as globals
      installGlobals();           // re-assert in case
      var app = await buildApp();
      (0, eval)(app);             // data + views + render
    } catch (e) {
      // a bad cache can poison the build — clear and report
      try { localStorage.removeItem(CACHE_KEY); } catch (x) {}
      fail('Boot failed: ' + (e && e.message ? e.message : e) + '\n(reload to retry)');
      throw e;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

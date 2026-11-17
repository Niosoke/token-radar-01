// Token Radar's dashboard. It reads window.RADAR (dashboard/data.js, written by
// main.ts from the same board as board.json) and renders the ranked board, a
// filterable and sortable table, a per-protocol detail view with the model's own
// arithmetic and the protocol's farm plan, and the live-token view. No network:
// every byte it shows is in data.js. State lives in the URL hash, so a detail
// view or a filtered view is a link: #p=<slug>, #category=Dexs, #tab=live.
//
// The page does not trust the implied values it is handed: modelOf recomputes
// each row from the raw figures (TVL, 7-day change, age, chains) and the model
// constants, and the detail view shows the recomputed number beside the board's.
// Row arrays, one index each (lib/model.ts radarRow):
//   0 rank, 1 slug, 2 name, 3 category index, 4 chain indexes, 5 tvl,
//   6 change_7d, 7 age_days, 8 implied, 9 watchlist (1/0).
// Live rows: 0 slug, 1 name, 2 category index, 3 chain indexes, 4 tvl, 5 mcap,
// 6 change_7d.
(function () {
  'use strict';
  var DATA = window.RADAR;
  var root = document.getElementById('board');
  if (!DATA || !root) return;
  root.setAttribute('aria-busy', 'false');

  var R = { rank: 0, slug: 1, name: 2, cat: 3, chains: 4, tvl: 5, chg: 6, age: 7, imp: 8, watch: 9 };
  var M = DATA.model;
  var state = { tab: 'board', q: '', category: 'all', chain: 'all', scope: 'all', sort: 'imp', dir: -1, p: '' };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtInt(n) { return n === null || n === undefined ? 'n/a' : '$' + Math.round(n).toLocaleString('en-US'); }
  function fmtPct(n) { if (n === null || n === undefined || !isFinite(n)) return 'n/a'; return (n > 0 ? '+' : '') + n.toFixed(2) + '%'; }
  function fmtAge(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return Math.round(d) + 'd';
  }
  function fmtMult(m) { return 'x' + m.toFixed(2); }
  function catName(row) { return DATA.cats[row[R.cat]] || 'Uncategorised'; }
  function chainNames(row) { return row[R.chains].map(function (i) { return DATA.chains[i]; }); }
  function chainOf(row) { var c = chainNames(row); return c.length > 0 ? c[0] : 'its main chain'; }

  // The model, recomputed in the page from the raw figures: category multiple
  // from the snapshot's own live-token medians (DATA.benchmarks), else the
  // global median; growth, maturity and breadth from the model constants.
  // Returns { cm, base, gm, mm, bm, implied, fromCategory }.
  function modelOf(row) {
    var cat = catName(row), cm = DATA.global_multiple, fromCategory = false;
    for (var i = 0; i < DATA.benchmarks.length; i++) {
      if (DATA.benchmarks[i][0] === cat) { cm = DATA.benchmarks[i][1]; fromCategory = true; break; }
    }
    var chg = row[R.chg] === null || row[R.chg] === undefined ? 0 : row[R.chg];
    var growth = Math.min(M.growth_cap, Math.max(M.growth_floor, chg));
    var gm = 1 + (growth / 100) * M.growth_weight;
    var age = row[R.age] === null || row[R.age] === undefined ? M.unknown_age_days : row[R.age];
    var mm = M.maturity_floor + (Math.min(Math.max(age, 0), M.maturity_days) / M.maturity_days) * M.maturity_range;
    var bm = 1 + M.breadth_per_chain * Math.min(Math.max(row[R.chains].length - 1, 0), M.breadth_max_chains);
    var base = row[R.tvl] * cm;
    return { cm: cm, base: base, gm: gm, mm: mm, bm: bm, implied: Math.max(1, Math.round(base * gm * mm * bm)), fromCategory: fromCategory };
  }

  // The farm plan is the same derivation main.ts writes to board.json: category,
  // chains, TVL and age decide the action, the capital, the hold and every cost
  // and time. No name is special-cased.
  function capitalFor(row) {
    if (row[R.tvl] >= 5e9) return 250;
    if (row[R.tvl] >= 1e9) return 150;
    if (row[R.tvl] >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) { if (age === null || age === undefined) return 30; if (age < 180) return 60; if (age < 365) return 45; return 30; }
  function actionFor(row, capital, chain) {
    var c = catName(row).toLowerCase();
    var name = row[R.name];
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open; borrow a small amount against it once so both sides of the book are touched.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ', in the pair the app itself suggests, and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app the same week.';
    if (c.indexOf('restak') >= 0 || c.indexOf('staking') >= 0) return 'Stake $' + capital + " of the chain's staking asset through " + name + ' and keep the receipt token in the same wallet.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('options') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedged position, then close it after a day.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one small market position on ' + name + ', then settle it when the market resolves.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0 || c.indexOf('vault') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares for the whole hold period.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + ' and hold it in the farming wallet.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + " of the protocol's yield-bearing asset on " + chain + ' and hold it; do not move it between wallets.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy active for the whole hold period.';
    if (c.indexOf('oracle') >= 0 || c.indexOf('chain') >= 0) return 'Use ' + name + ' through its app on ' + chain + ': run one ' + (capital >= 150 ? 'large' : 'small') + ' transaction a week so the wallet is counted as active.';
    if (c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s basis vault on " + chain + ' and keep the position open.';
    if (c.indexOf('launchpad') >= 0 || c.indexOf('farm') >= 0) return 'Join ' + name + "'s current farm on " + chain + ' with $' + capital + " and claim only through the app's own page.";
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(row) {
    var chain = chainOf(row), capital = capitalFor(row), hold = holdDaysFor(row[R.age]);
    var gas = capital >= 150 ? 8 : 4;
    var steps = [
      ['Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', 'under $3 of gas for the first transaction', '5 minutes'],
      [actionFor(row, capital, chain), '$' + capital + ' of capital and about $' + gas + ' of gas', '15 minutes to set up'],
      ['Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote, and never from a second wallet.', 'about $2 of gas a week', '10 minutes a week'],
      ['Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', 'the $' + capital + ' stays in the position', hold + ' days'],
      ["Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", 'no fee to check, and never pay to claim', '10 minutes'],
      ['Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', 'nothing but the log', '5 minutes']
    ];
    return steps.map(function (s) {
      var t = s[0] + ' Cost: ' + s[1] + '. Time: ' + s[2] + '.';
      if (t.length > 600) t = t.slice(0, 596) + '...';
      return t;
    });
  }

  function readHash() {
    // The hash is the whole state: a navigation that drops a parameter drops
    // the state it carried (a filtered view never keeps an earlier detail open).
    state.tab = 'board'; state.q = ''; state.category = 'all'; state.chain = 'all';
    state.scope = 'all'; state.sort = 'imp'; state.dir = -1; state.p = '';
    var h = window.location.hash.replace(/^#/, '');
    if (!h) return;
    var p = new URLSearchParams(h);
    if (p.get('tab')) state.tab = p.get('tab');
    if (p.get('q') !== null) state.q = p.get('q');
    if (p.get('category')) state.category = p.get('category');
    if (p.get('chain')) state.chain = p.get('chain');
    if (p.get('scope')) state.scope = p.get('scope');
    if (p.get('sort')) state.sort = p.get('sort');
    if (p.get('p')) state.p = p.get('p');
  }
  function writeHash() {
    var p = new URLSearchParams();
    if (state.tab !== 'board') p.set('tab', state.tab);
    if (state.q) p.set('q', state.q);
    if (state.category !== 'all') p.set('category', state.category);
    if (state.chain !== 'all') p.set('chain', state.chain);
    if (state.scope !== 'all') p.set('scope', state.scope);
    if (state.sort !== 'imp') p.set('sort', state.sort);
    if (state.p) p.set('p', state.p);
    var h = p.toString();
    if (window.history && history.replaceState) history.replaceState(null, '', h ? '#' + h : '#');
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var rows = DATA.rows.filter(function (row) {
      if (state.scope === 'watchlist' && !row[R.watch]) return false;
      if (state.scope === 'early' && row[R.watch]) return false;
      if (state.category !== 'all' && catName(row) !== state.category) return false;
      if (state.chain !== 'all' && chainNames(row).indexOf(state.chain) < 0) return false;
      if (q && row[R.name].toLowerCase().indexOf(q) < 0 && row[R.slug].toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = { imp: R.imp, tvl: R.tvl, chg: R.chg, age: R.age }[state.sort] || R.imp;
    rows.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av === null || av === undefined) av = -Infinity;
      if (bv === null || bv === undefined) bv = -Infinity;
      return (bv - av) * (state.dir < 0 ? 1 : -1) || (a[R.slug] < b[R.slug] ? -1 : 1);
    });
    return rows;
  }

  function sortBtn(label, key) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' \u25bc' : ' \u25b2') : '';
    return '<button data-sort="' + key + '">' + label + arrow + '</button>';
  }
  function rowHtml(row) {
    var cls = state.p === row[R.slug] ? ' class="sel"' : '';
    var badge = row[R.rank] <= 10 ? '<span class="pill prime">Prime</span>' : row[R.watch] ? '<span class="pill watch">Watchlist</span>' : '';
    var chg = row[R.chg];
    var chgHtml = chg === null ? '<span class="mono">n/a</span>' : '<span class="' + (chg >= 0 ? 'up' : 'down') + '">' + fmtPct(chg) + '</span>';
    var chains = chainNames(row);
    return '<tr' + cls + ' data-slug="' + esc(row[R.slug]) + '"><td><span class="rank' + (row[R.rank] <= 3 ? ' top3' : '') + '">#' + row[R.rank] + '</span></td>' +
      '<td class="name"><b>' + esc(row[R.name]) + '</b><small>' + esc(row[R.slug]) + badge + '</small></td>' +
      '<td>' + esc(catName(row)) + '</td>' +
      '<td>' + esc(chains.slice(0, 3).join(', ')) + (chains.length > 3 ? ' +' + (chains.length - 3) : '') + '</td>' +
      '<td class="num">' + fmtUsd(row[R.tvl]) + '</td><td class="num">' + chgHtml + '</td>' +
      '<td class="num">' + fmtAge(row[R.age]) + '</td>' +
      '<td class="num"><b>' + fmtInt(row[R.imp]) + '</b></td>' +
      '<td class="num">' + fmtUsd(capitalFor(row) + 12) + '</td></tr>';
  }

  function detailHtml(row) {
    var mo = modelOf(row);
    var match = mo.implied === row[R.imp];
    var multNote = mo.fromCategory
      ? 'the median market-cap-to-TVL of the ' + catName(row) + ' protocols that already trade'
      : 'the whole snapshot\u2019s median (too few live ' + catName(row) + ' protocols to price the category on its own)';
    var steps = farmSteps(row);
    var hold = holdDaysFor(row[R.age]);
    var bars = [
      ['Growth, 7 days', mo.gm, 0.7, 1.6, fmtMult(mo.gm) + '  (' + fmtPct(row[R.chg]) + ')'],
      ['Maturity, no token', mo.mm, 0.6, 1.0, fmtMult(mo.mm) + '  (' + fmtAge(row[R.age]) + ')'],
      ['Chain breadth', mo.bm, 1.0, 1.2, fmtMult(mo.bm) + '  (' + row[R.chains].length + ' chain' + (row[R.chains].length === 1 ? '' : 's') + ')']
    ].map(function (b) {
      var pct = Math.max(0, Math.min(100, ((b[1] - b[2]) / (b[3] - b[2])) * 100));
      return '<div class="bar-row"><span>' + b[0] + '</span><span class="bar"><i style="width:' + pct.toFixed(0) + '%"></i></span><small>' + b[4] + '</small></div>';
    }).join('');
    return '<section class="detail" id="detail"><button class="close" data-close="1">Close \u00d7</button>' +
      '<h2>' + esc(row[R.name]) + '</h2><p class="sub">Rank #' + row[R.rank] + ' &middot; ' + esc(row[R.slug]) + ' &middot; ' + esc(catName(row)) + ' &middot; ' + esc(chainNames(row).join(', ') || 'no chain listed') +
      (row[R.watch] ? ' &middot; <span class="pill watch">On the watchlist</span>' : '') + (row[R.rank] <= 10 ? ' &middot; <span class="pill prime">Prime pick</span>' : '') + '</p>' +
      '<dl class="kv"><div><dt>Implied value</dt><dd>' + fmtInt(row[R.imp]) + '</dd></div>' +
      '<div><dt>TVL</dt><dd>' + fmtUsd(row[R.tvl]) + '</dd></div>' +
      '<div><dt>7-day change</dt><dd>' + fmtPct(row[R.chg]) + '</dd></div>' +
      '<div><dt>Tracked since</dt><dd>' + fmtAge(row[R.age]) + '</dd></div>' +
      '<div><dt>Farm cost</dt><dd>' + fmtUsd(capitalFor(row) + 12) + '</dd></div>' +
      '<div><dt>Hold at least</dt><dd>' + hold + ' days</dd></div></dl>' +
      '<h3>How the value is worked out</h3><p class="math">' + fmtUsd(row[R.tvl]) + ' TVL &times; <code>' + mo.cm.toFixed(4) + '</code> category multiple = <code>' + fmtInt(mo.base) + '</code> base' +
      ' &times; ' + fmtMult(mo.gm) + ' growth &times; ' + fmtMult(mo.mm) + ' maturity &times; ' + fmtMult(mo.bm) + ' breadth = <code>' + fmtInt(row[R.imp]) + '</code>. ' +
      'The page recomputes it from the same figures and gets <code>' + fmtInt(mo.implied) + '</code> &mdash; ' + (match ? 'it matches the board.' : 'it does NOT match the board.') + '</p>' +
      '<p>' + esc(multNote) + '. A token is worth what the market already pays for a dollar of TVL in its own category; growth, age with no token, and the number of chains it runs on scale that base up or down. No protocol name is special-cased anywhere in this model.</p>' +
      '<div class="bars">' + bars + '</div>' +
      '<h3>Farm plan &mdash; six steps, with cost and time</h3><ol class="steps">' +
      steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></section>';
  }

  function liveHtml() {
    var rows = DATA.live.map(function (r) {
      var chg = r[6];
      var chgHtml = chg === null ? 'n/a' : '<span class="' + (chg >= 0 ? 'up' : 'down') + '">' + fmtPct(chg) + '</span>';
      var chains = r[3].map(function (i) { return DATA.chains[i]; });
      return '<tr><td class="name"><b>' + esc(r[1]) + '</b><small>' + esc(r[0]) + '</small></td><td>' + esc(DATA.cats[r[2]] || 'Uncategorised') + '</td>' +
        '<td>' + esc(chains.slice(0, 3).join(', ')) + '</td><td class="num">' + fmtUsd(r[4]) + '</td>' +
        '<td class="num"><b>' + fmtUsd(r[5]) + '</b></td><td class="num">' + chgHtml + '</td></tr>';
    }).join('');
    return '<p class="count">These protocols already have a token that trades, so the market has priced them: the board shows their market cap, not a model. They are not launch candidates.</p>' +
      '<table class="board"><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">7d</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function methodHtml() {
    var bench = DATA.benchmarks.map(function (b) {
      return '<tr><td>' + esc(b[0]) + '</td><td>' + b[1].toFixed(4) + '</td><td>' + b[2] + '</td></tr>';
    }).join('');
    return '<section class="method"><h2>How the value is scored</h2>' +
      '<p><b>Implied value = TVL &times; category multiple &times; growth &times; maturity &times; breadth.</b> ' +
      'The category multiple is the median market-cap-to-TVL ratio of the live-token protocols in that category, read off this snapshot (at least 3 of them, else the whole snapshot&rsquo;s median of ' + DATA.global_multiple.toFixed(4) + '). ' +
      'Growth clamps the 7-day TVL change to &minus;60&hellip;+120% and moves the value half as far; maturity rises from 0.60 for a brand-new protocol to 1.00 after three years with no token; breadth adds 2% per extra chain, up to 20%. ' +
      'Age unknown counts as 365 days. Nothing in the model names a protocol.</p>' +
      '<table><thead><tr><th>Category</th><th>Multiple</th><th>Live protocols counted</th></tr></thead><tbody>' + bench + '</tbody></table>' +
      '<p>Snapshot: ' + esc(DATA.source) + ', as of ' + esc(DATA.as_of) + '. Watchlist floor: ' + fmtUsd(DATA.floor_usd) + ' TVL. ' +
      'The board ranks all ' + DATA.watchlist_size + ' watchlist protocols plus ' + DATA.early_size + ' early ones below the floor that pass the same rule &mdash; ' + DATA.board_size + ' rows in all.</p></section>';
  }

  function setAsideHtml() {
    if (!DATA.excluded || DATA.excluded.length === 0) return '';
    var items = DATA.excluded.map(function (e) { return '<li><b>' + esc(e[1]) + '</b> (' + esc(e[0]) + ') &mdash; ' + esc(e[2]) + '</li>'; }).join('');
    return '<details class="setaside"><summary>' + DATA.excluded_size + ' pre-token protocols set aside, with the reason each was set aside</summary>' +
      '<p>These record no token either, but the watchlist&rsquo;s own rule keeps them off the board: each is a wrapped, staked or bridged product of a token that already trades, a versioned pool, or an exchange product. A launch of its own is not what they are.</p><ul>' + items + '</ul></details>';
  }

  function render() {
    var stats = document.getElementById('stats');
    var top = DATA.rows[0];
    stats.innerHTML =
      '<div><dt>Board rows</dt><dd>' + DATA.board_size + '</dd></div>' +
      '<div><dt>Watchlist covered</dt><dd>' + DATA.watchlist_size + ' / ' + DATA.watchlist_size + '</dd></div>' +
      '<div><dt>Top implied value</dt><dd>' + fmtUsd(top ? top[R.imp] : 0) + '</dd></div>' +
      '<div><dt>Snapshot as of</dt><dd>' + esc(DATA.as_of) + '</dd></div>';

    var catOpts = ['<option value="all">All categories</option>'].concat(DATA.cats.map(function (c) { return '<option' + (state.category === c ? ' selected' : '') + '>' + esc(c) + '</option>'; })).join('');
    var chainOpts = ['<option value="all">All chains</option>'].concat(DATA.chains.map(function (c) { return '<option' + (state.chain === c ? ' selected' : '') + '>' + esc(c) + '</option>'; })).join('');
    var scopeOpts = [['all', 'All ranked'], ['watchlist', 'Watchlist only'], ['early', 'Early only']].map(function (o) {
      return '<option value="' + o[0] + '"' + (state.scope === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
    var sortOpts = [['imp', 'Implied value'], ['tvl', 'TVL'], ['chg', '7-day change'], ['age', 'Age']].map(function (o) {
      return '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');

    var html = '<div class="tabs" role="tablist">' +
      '<button class="tab" data-tab="board" aria-selected="' + (state.tab === 'board') + '">Pre-token board (' + DATA.board_size + ')</button>' +
      '<button class="tab" data-tab="live" aria-selected="' + (state.tab === 'live') + '">Already launched (' + DATA.live_size + ')</button></div>';

    if (state.tab === 'live') {
      html += liveHtml() + methodHtml() + setAsideHtml();
      root.innerHTML = html;
      bindCommon();
      return;
    }

    var selected = null;
    if (state.p) {
      for (var i = 0; i < DATA.rows.length; i++) if (DATA.rows[i][R.slug] === state.p) { selected = DATA.rows[i]; break; }
    }
    var rows = filteredRows();
    html += '<div class="controls">' +
      '<label>Search<input id="f-q" type="search" placeholder="Protocol or slug&hellip;" value="' + esc(state.q) + '"></label>' +
      '<label>Category<select id="f-cat">' + catOpts + '</select></label>' +
      '<label>Chain<select id="f-chain">' + chainOpts + '</select></label>' +
      '<label>Scope<select id="f-scope">' + scopeOpts + '</select></label>' +
      '<label>Sort by<select id="f-sort">' + sortOpts + '</select></label></div>' +
      '<p class="count">Showing <b>' + rows.length + '</b> of ' + DATA.board_size + ' ranked protocols' +
      (state.scope === 'watchlist' ? ' &mdash; the whole watchlist' : '') + '. Click any row for its detail view and farm plan.</p>';
    if (selected) html += detailHtml(selected);
    if (rows.length === 0) {
      html += '<p class="empty">No protocol matches this filter. Clear the search or pick another category.</p>';
    } else {
      html += '<table class="board"><thead><tr><th>' + sortBtn('Rank', 'imp') + '</th><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">' + sortBtn('TVL', 'tvl') + '</th><th class="num">' + sortBtn('7d', 'chg') + '</th><th class="num">' + sortBtn('Age', 'age') + '</th><th class="num">' + sortBtn('Implied value', 'imp') + '</th><th class="num">Farm cost</th></tr></thead><tbody>' +
        rows.map(rowHtml).join('') + '</tbody></table>';
    }
    html += methodHtml() + setAsideHtml();
    root.innerHTML = html;
    bindCommon();
  }

  function bindCommon() {
    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); state.p = ''; writeHash(); render(); });
    });
    var q = document.getElementById('f-q');
    if (q) q.addEventListener('input', function () { state.q = q.value; writeHash(); render(); q.focus(); q.setSelectionRange(q.value.length, q.value.length); });
    var cat = document.getElementById('f-cat');
    if (cat) cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var ch = document.getElementById('f-chain');
    if (ch) ch.addEventListener('change', function () { state.chain = ch.value; writeHash(); render(); });
    var sc = document.getElementById('f-scope');
    if (sc) sc.addEventListener('change', function () { state.scope = sc.value; writeHash(); render(); });
    var so = document.getElementById('f-sort');
    if (so) so.addEventListener('change', function () { state.sort = so.value; writeHash(); render(); });
    root.querySelectorAll('[data-sort]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-sort');
        if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = -1; }
        writeHash(); render();
      });
    });
    root.querySelectorAll('tbody tr[data-slug]').forEach(function (tr) {
      tr.addEventListener('click', function () { state.p = tr.getAttribute('data-slug'); writeHash(); render(); var d = document.getElementById('detail'); if (d) d.scrollIntoView(); });
    });
    var close = root.querySelector('[data-close]');
    if (close) close.addEventListener('click', function () { state.p = ''; writeHash(); render(); });
  }

  window.addEventListener('hashchange', function () { readHash(); render(); });
  readHash();
  render();
})();

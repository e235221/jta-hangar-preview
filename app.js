/* React 19 UMD build. Form values remain in memory and are never transmitted. */
(() => {
  const h = React.createElement;
  const params = new URLSearchParams(window.location.search);
  const video = (params.get('video') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
  const isApplyView = params.get('view') === 'apply';
  const homeHref = `./index.html${video ? `?video=${encodeURIComponent(video)}` : ''}`;
  const applyHref = `./index.html?view=apply${video ? `&video=${encodeURIComponent(video)}` : ''}`;
  const cautionStorageKey = 'jta-hangar-caution-reviewed';
  const storageKey = 'jta-hangar-prototype-events-v1';
  let memoryEvents = [];

  function sessionId() {
    try {
      let id = sessionStorage.getItem('jta-hangar-session');
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
        sessionStorage.setItem('jta-hangar-session', id);
      }
      return id;
    } catch {
      return 'storage-unavailable';
    }
  }

  function savedEvents() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return memoryEvents;
    }
  }

  function track(type, extra = {}) {
    const events = savedEvents();
    events.push({ type, at: new Date().toISOString(), session: sessionId(), video: video || null, ...extra });
    memoryEvents = events;
    try { localStorage.setItem(storageKey, JSON.stringify(events)); } catch { /* private browsing */ }
  }

  function hasReviewedCaution() {
    try { return sessionStorage.getItem(cautionStorageKey) === '1'; } catch { return false; }
  }

  function markCautionReviewed() {
    try { sessionStorage.setItem(cautionStorageKey, '1'); } catch { /* private browsing */ }
  }

  // 日付計算・祝日判定
  function dateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function addDays(date, days) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + days);
    return result;
  }

  function japanToday() {
    const parts = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const number = type => Number(parts.find(part => part.type === type).value);
    return new Date(number('year'), number('month') - 1, number('day'));
  }

  function nthMonday(year, month, ordinal) {
    const first = new Date(year, month - 1, 1).getDay();
    return 1 + ((8 - first) % 7) + 7 * (ordinal - 1);
  }

  function japaneseHolidays(year) {
    const days = new Set();
    const put = (month, day) => days.add(dateString(new Date(year, month - 1, day)));
    [[1, 1], [2, 11], [2, 23], [4, 29], [5, 3], [5, 4], [5, 5], [8, 11], [11, 3], [11, 23]].forEach(([m, d]) => put(m, d));
    [[1, nthMonday(year, 1, 2)], [7, nthMonday(year, 7, 3)], [9, nthMonday(year, 9, 3)], [10, nthMonday(year, 10, 2)]].forEach(([m, d]) => put(m, d));
    put(3, Math.floor(20.8431 + .242194 * (year - 1980) - Math.floor((year - 1980) / 4)));
    put(9, Math.floor(23.2488 + .242194 * (year - 1980) - Math.floor((year - 1980) / 4)));
    const originals = [...days].sort();
    originals.forEach(value => {
      const [y, m, d] = value.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      if (date.getDay() === 0) {
        let substitute = addDays(date, 1);
        while (days.has(dateString(substitute))) substitute = addDays(substitute, 1);
        days.add(dateString(substitute));
      }
    });
    const sorted = [...days].sort();
    for (let i = 0; i < sorted.length - 1; i++) {
      const [y, m, d] = sorted[i].split('-').map(Number);
      const middle = addDays(new Date(y, m - 1, d), 1);
      if (!days.has(dateString(middle)) && dateString(addDays(middle, 1)) === sorted[i + 1]) days.add(dateString(middle));
    }
    return days;
  }

  function validVisitDate(value, earliest, latest) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < earliest || value > latest) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return dateString(date) === value && date.getDay() !== 0 && date.getDay() !== 6 && !japaneseHolidays(year).has(value);
  }

  // JTA航空教室の公開情報を参考にした注意事項。
  const officialCautions = [
    {
      title: '1. 見学内容および航空機について',
      body: '当日の運航状況や整備スケジュールにより、見学内容が予告なく変更となる場合や、整備格納庫内に航空機が駐機していない場合があります。あらかじめご了承ください。'
    },
    {
      title: '2. 集合時間と体調管理',
      body: '空港制限区域内における厳格な保安・安全管理のため、集合時間は厳守してください。発熱や風邪症状など体調がすぐれない場合は、無理をなさらず参加をお控えください。'
    },
    {
      title: '3. 服装および履物について（厳守事項）',
      body: '格納庫内は階段の昇降や突起物・機材設備がある作業現場です。安全確保のため、動きやすい服装（長ズボン着用を推奨）と、スニーカーなど履きなれた運動靴でお越しください。サンダル、ミュール、ハイヒール、厚底靴、スカート等でのご参加は安全上固くお断りいたします。'
    },
    {
      title: '4. 手荷物・持ち物の持ち込み制限',
      body: '航空機や設備への接触事故および異物混入（FOD：エンジン吸気事故等の防止）のため、格納庫内への大きな手荷物（キャリーケース、大型リュックサック等）の持ち込みはできません。手荷物は最小限にし、貴重品は各自で管理してください。'
    },
    {
      title: '5. 案内担当者（整備士・スタッフ）の指示の遵守',
      body: '格納庫内は常に航空機や重機が稼働する作業エリアです。見学中は安全のため必ず案内担当者の指示に従い、指定された見学通路や安全白線の内側から絶対に離れないでください。'
    },
    {
      title: '6. 写真・動画撮影およびSNS等への公開規程',
      body: '撮影は案内担当者が許可した指定エリア・対象に限り可能です。保安上の理由および航空機密保持のため、指定エリア外や特定設備の撮影は禁止です。また、撮影した写真や動画をSNS、ブログ、動画配信サイト等のインターネット上に無断で公開・投稿することは固く禁止されています（公開をご希望の場合は事前に担当者へご相談ください）。'
    },
    {
      title: '7. 特別な配慮が必要な場合のご連絡',
      body: '歩行や階段の昇降にサポートが必要な方、車椅子をご利用の方などは、安全な見学ルートと誘導体制を確保するため、お申し込み時または事前に必ずお知らせください。'
    }
  ];

  // 注意事項モーダルダイアログ（デジタル庁DADS・アクセシビリティ準拠）
  function CautionModal({ isOpen, onClose, onConfirm, confirmLabel }) {
    const modalRef = React.useRef(null);
    React.useEffect(() => {
      if (!isOpen) return;
      const previousFocus = document.activeElement;
      function handleKeyDown(e) {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Tab') {
          const controls = [...modalRef.current.querySelectorAll('button:not([disabled]), a[href]')];
          if (!controls.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      modalRef.current?.focus();
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        if (previousFocus?.isConnected) previousFocus.focus();
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return h('div', {
      className: 'modal-backdrop',
      onClick: onClose,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-caution-title'
    },
      h('div', { ref: modalRef, className: 'modal-content', tabIndex: -1, onClick: e => e.stopPropagation() },
        h('div', { className: 'modal-header' },
          h('div', { className: 'modal-title-group' },
            h('h2', { id: 'modal-caution-title' }, '見学時の注意事項')
          ),
          h('button', {
            className: 'modal-close-button',
            onClick: onClose,
            'aria-label': '注意事項モーダルを閉じる'
          }, '✕')
        ),
        h('div', { className: 'modal-body' },
          h('p', { className: 'modal-lead' }, '申し込みの前に、服装・手荷物・撮影などの注意事項をご確認ください。'),
          h('div', { className: 'modal-cautions-list' },
            officialCautions.map((item, idx) =>
              h('div', { key: idx, className: 'modal-caution-card' },
                h('h3', null, item.title),
                h('p', null, item.body)
              )
            )
          )
        ),
        h('div', { className: 'modal-footer' },
          h('button', {
            className: 'button button-red modal-agree-btn',
            type: 'button',
            onClick: onConfirm
          }, confirmLabel)
        )
      )
    );
  }

  // デジタル庁DADS準拠 インタラクティブ月別カレンダーピッカー
  function CalendarPicker({ selectedDate, onSelectDate, earliest, latest }) {
    const today = japanToday();
    const initialMonth = selectedDate ? new Date(selectedDate) : addDays(today, 60);
    const [viewYear, setViewYear] = React.useState(initialMonth.getFullYear());
    const [viewMonth, setViewMonth] = React.useState(initialMonth.getMonth());

    const holidays = React.useMemo(() => japaneseHolidays(viewYear), [viewYear]);

    function prevMonth() {
      if (viewMonth === 0) {
        setViewYear(y => y - 1);
        setViewMonth(11);
      } else {
        setViewMonth(m => m - 1);
      }
    }

    function nextMonth() {
      if (viewMonth === 11) {
        setViewYear(y => y + 1);
        setViewMonth(0);
      } else {
        setViewMonth(m => m + 1);
      }
    }

    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const weeks = [];
    let currentWeek = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dObj = new Date(viewYear, viewMonth, day);
      const dayOfWeek = dObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.has(dStr);
      const inRange = dStr >= earliest && dStr <= latest;
      const selectable = inRange && !isWeekend && !isHoliday;
      const isSelected = selectedDate === dStr;

      currentWeek.push({
        day,
        dStr,
        selectable,
        isSelected,
        isWeekend,
        isHoliday,
        dayOfWeek
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];

    return h('div', { className: 'calendar-picker' },
      h('div', { className: 'calendar-nav-header' },
        h('button', {
          type: 'button',
          className: 'cal-nav-btn',
          onClick: prevMonth,
          'aria-label': '前の月を表示'
        }, '‹ 前月'),
        h('span', { className: 'calendar-month-title' },
          `${viewYear}年 ${viewMonth + 1}月`
        ),
        h('button', {
          type: 'button',
          className: 'cal-nav-btn',
          onClick: nextMonth,
          'aria-label': '次の月を表示'
        }, '翌月 ›')
      ),

      h('table', { className: 'calendar-table', role: 'grid' },
        h('thead', null,
          h('tr', null,
            weekLabels.map((label, idx) =>
              h('th', {
                key: label,
                className: idx === 0 ? 'cal-sun' : idx === 6 ? 'cal-sat' : ''
              }, label)
            )
          )
        ),
        h('tbody', null,
          weeks.map((week, wIdx) =>
            h('tr', { key: wIdx },
              week.map((cell, cIdx) => {
                if (!cell) return h('td', { key: cIdx, className: 'cal-empty' });
                return h('td', { key: cIdx, className: 'cal-cell' },
                  h('button', {
                    type: 'button',
                    disabled: !cell.selectable,
                    className: `cal-day-btn ${cell.selectable ? 'available' : 'unavailable'} ${cell.isSelected ? 'selected' : ''} ${cell.isWeekend ? 'weekend' : ''} ${cell.isHoliday ? 'holiday' : ''}`,
                    onClick: () => cell.selectable && onSelectDate(cell.dStr),
                    'aria-label': `${cell.dStr}${cell.selectable ? '（選択可能）' : '（休催・対象外）'}`,
                    title: cell.selectable ? '見学希望日として選択' : cell.isHoliday ? '祝日（休催）' : cell.isWeekend ? '土日（休催）' : '受付期間外'
                  },
                    h('span', { className: 'day-num' }, cell.day),
                    null
                  )
                );
              })
            )
          )
        )
      ),

      h('div', { className: 'calendar-legend' },
        h('div', { className: 'legend-item' },
          h('span', { className: 'legend-dot available' }),
          h('span', null, '選択できる平日')
        ),
        h('div', { className: 'legend-item' },
          h('span', { className: 'legend-dot selected' }),
          h('span', null, '選択中')
        ),
        h('div', { className: 'legend-item' },
          h('span', { className: 'legend-dot unavailable' }),
          h('span', null, '休催（土日・祝日・期間外）')
        )
      )
    );
  }

  // グローバルヘッダー
  function Header({ onApply }) {
    const prefix = isApplyView ? homeHref : '';
    return h(React.Fragment, null,
      h('a', { className: 'skip-link', href: '#main' }, '本文へ移動'),
      h('header', { className: 'site-header' },
        h('div', { className: 'header-inner' },
          h('a', { className: 'brand', href: isApplyView ? homeHref : '#top', 'aria-label': 'JTA整備格納庫見学 試作サイトの先頭へ' },
            h('span', { className: 'brand-name', translate: 'no' }, 'JTA'),
            h('span', { className: 'brand-divider', 'aria-hidden': 'true' }),
            h('span', { className: 'brand-label' }, '整備格納庫見学')
          ),
          isApplyView ? null : h('nav', { 'aria-label': '主要メニュー', className: 'header-nav' },
            h('a', { href: `${prefix}#experience` }, '見学の魅力'),
            h('a', { href: `${prefix}#details` }, '開催情報'),
            h('a', { href: `${prefix}#faq` }, 'よくある質問')
          ),
          isApplyView
            ? h('a', { className: 'header-cta secondary', href: homeHref }, 'ページへ戻る')
            : h('button', { className: 'header-cta', type: 'button', onClick: () => onApply('header') }, '見学を申し込む')
        )
      )
    );
  }

  // 最初の画面は、見学の内容と次の行動を短く示す。
  function Hero() {
    return h('section', { className: 'hero', id: 'top', 'aria-labelledby': 'hero-title' },
      h('picture', { className: 'hero-picture' },
        h('source', { media: '(max-width: 700px)', srcSet: './assets/hero-mobile.webp' }),
        h('img', {
          src: './assets/hero-wide.webp',
          width: 2000,
          height: 1125,
          alt: 'JTAのボーイング737が整備格納庫に置かれている様子',
          fetchPriority: 'high'
        })
      ),
      h('div', { className: 'hero-content' },
        h('h1', { id: 'hero-title' }, '飛行機を、', h('br'), '近くで見よう。'),
        h('p', { className: 'hero-subtitle' }, '動画で気になった整備の現場へ。大きな翼や格納庫の空気を、自分の目で確かめてみませんか。'),
        h('div', { className: 'hero-button-group' },
          h('a', {
            className: 'button button-red hero-cta-btn',
            href: '#details'
          }, '見学の詳細を見る')
        )
      )
    );
  }

  // 機体の中心へスクロールで寄る。動きを減らす設定では静止画と文章を表示する。
  function ZoomStory() {
    const sectionRef = React.useRef(null);
    React.useEffect(() => {
      const section = sectionRef.current;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let frame = 0;
      function update() {
        frame = 0;
        if (reduced.matches) {
          section.style.setProperty('--zoom-progress', '1');
          return;
        }
        const rect = section.getBoundingClientRect();
        const distance = Math.max(1, rect.height - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / distance));
        section.style.setProperty('--zoom-progress', progress.toFixed(3));
        section.style.setProperty('--zoom-scale', (1 + progress * 0.26).toFixed(3));
        section.style.setProperty('--zoom-inset', `${Math.round((1 - progress) * Math.min(window.innerWidth * 0.075, 100))}px`);
        section.style.setProperty('--words-opacity', Math.max(0, Math.min(1, (progress - 0.48) / 0.25)).toFixed(3));
      }
      function schedule() { if (!frame) frame = requestAnimationFrame(update); }
      update();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      reduced.addEventListener('change', schedule);
      return () => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        reduced.removeEventListener('change', schedule);
        if (frame) cancelAnimationFrame(frame);
      };
    }, []);
    return h('section', { id: 'experience', ref: sectionRef, className: 'zoom-story', 'aria-labelledby': 'zoom-title' },
      h('div', { className: 'zoom-stage' },
        h('div', { className: 'zoom-frame' },
          h('img', { src: './assets/front.webp', width: 1500, height: 1100, alt: '整備格納庫に置かれた航空機を正面から見た写真', loading: 'lazy' }),
          null
        ),
        h('div', { className: 'zoom-copy' },
          h('h2', { id: 'zoom-title' }, '見上げた先に、', h('br'), '本物のスケール。'),
          h('p', null, 'その大きさも、整備の空気も。格納庫でしか出会えない景色があります。')
        )
      )
    );
  }

  function Experience() {
    const sectionRef = React.useRef(null);
    const trackRef = React.useRef(null);
    React.useEffect(() => {
      const section = sectionRef.current;
      const track = trackRef.current;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      let frame = 0;
      function update() {
        frame = 0;
        if (reduced.matches) {
          section.style.setProperty('--album-shift', '0px');
          return;
        }
        const rect = section.getBoundingClientRect();
        const distance = Math.max(1, rect.height - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / distance));
        const cards = track.querySelectorAll('.experience-image');
        const shift = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0;
        section.style.setProperty('--album-shift', `${(progress * shift).toFixed(1)}px`);
      }
      function schedule() { if (!frame) frame = requestAnimationFrame(update); }
      update();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      reduced.addEventListener('change', schedule);
      return () => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        reduced.removeEventListener('change', schedule);
        if (frame) cancelAnimationFrame(frame);
      };
    }, []);
    return h('section', { ref: sectionRef, className: 'experience-detail', 'aria-labelledby': 'experience-detail-title' },
      h('div', { className: 'experience-stage' },
        h('div', { className: 'experience-heading' },
          h('h2', { id: 'experience-detail-title' }, '格納庫で見るもの'),
          h('p', null, '機体を近くで見て、整備の現場を知る。動画の続きは、格納庫にあります。')
        ),
        h('div', { className: 'experience-window' },
          h('div', { ref: trackRef, className: 'experience-track' },
            h('figure', { className: 'experience-image' },
              h('img', { src: './assets/visitors-wing.webp', width: 1600, height: 1200, alt: '見学者が航空機の主翼とエンジンを見上げる様子', loading: 'lazy' }),
              h('figcaption', null, '翼の下で、機体の大きさを感じる。')
            ),
            h('figure', { className: 'experience-image' },
              h('img', { src: './assets/hangar-work.webp', width: 1500, height: 1050, alt: '整備格納庫内の通路と作業設備', loading: 'lazy' }),
              h('figcaption', null, '普段は見られない整備の現場へ。')
            )
          )
        ),
        h('p', { className: 'experience-note' }, '当日の整備・運航状況により、見学内容や航空機の有無は変わります。')
      )
    );
  }

  const detailRows = [
    ['開催日時', '平日10:00から1日1回／所要時間 約2時間'],
    ['休催日', '土曜・日曜・祝日。平日も施設の整備・運航状況により実施できない場合があります。'],
    ['申込期間', '見学希望日の90日前から60日前まで（平日枠のみ受け付け）'],
    ['料金', '無料（現地までの交通費は各自ご負担となります）'],
    ['服装・履物', '動きやすい服装（長ズボン推奨）とスニーカー等の運動靴（サンダル・ヒール不可）']
  ];

  // 開催概要 ＆ 注意事項セクション（DADS準拠）
  function Details({ onOpenCaution }) {
    return h('section', { id: 'details', className: 'details', 'aria-labelledby': 'details-title' },
      h('div', { className: 'details-inner' },
        h('div', { className: 'details-heading' },
          h('h2', { id: 'details-title' }, '開催情報')
        ),
        h('div', { className: 'details-body' },
          h('dl', { className: 'detail-list' }, detailRows.map(([label, value]) =>
            h('div', { key: label, className: 'detail-row' },
              h('dt', null, label),
              h('dd', null, value)
            )
          )),
          // 注意事項コールアウトバナー
          h('div', { className: 'details-caution-callout' },
            h('div', { className: 'caution-callout-text' },
              h('h3', null, '見学時の注意事項'),
              h('p', null, '申し込みの前に、安全のための服装や撮影のルールをご確認ください。')
            ),
            h('button', {
              type: 'button',
              className: 'button button-caution',
              onClick: onOpenCaution
            }, '注意事項を確認する')
          )
        )
      )
    );
  }

  const faqs = [
    ['就職を考えていなくても参加できますか？', 'はい、大歓迎です。飛行機や航空機整備の現場への純粋な興味・関心から気軽にご参加いただけます。採用選考とは一切関係ありません。'],
    ['航空機に詳しくなくても楽しめますか？', '事前知識は一切必要ありません。整備現場の仕組みや航空機の構造について、スタッフが分かりやすく丁寧に解説します。'],
    ['参加費は本当にかかりませんか？', '見学の参加費は無料です。現地（那覇空港近郊のJTAメンテナンスセンター）までの交通費は各自でご負担ください。'],
    ['当日は必ず飛行機を間近で見られますか？', '運航状況や定期整備スケジュールにより、格納庫内に航空機が駐機していない場合や、安全上の理由から見学ルートが変更となる場合があります。'],
    ['写真や動画は自由に撮影・公開できますか？', '安全保安上および機密保持のため、案内担当者が許可した指定エリア・対象のみ撮影可能です。撮影した写真・動画をSNSやブログ、動画サイト等のインターネット上に無断で公開・投稿することは固く禁止されています。']
  ];

  // よくある質問（DADSアコーディオン設計）
  function Faq() {
    return h('section', { id: 'faq', className: 'faq', 'aria-labelledby': 'faq-title' },
      h('div', { className: 'faq-inner' },
        h('div', { className: 'faq-heading' },
          h('h2', { id: 'faq-title' }, 'よくある質問')
        ),
        h('div', { className: 'faq-list' }, faqs.map(([question, answer]) =>
          h('details', { key: question },
            h('summary', null,
              question,
              h('svg', { className: 'faq-chevron', viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': 'true' },
                h('path', { d: 'm5 9 7 7 7-7', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
              )
            ),
            h('p', null, answer)
          )
        ))
      )
    );
  }

  // フッター前CTAセクション
  function EndCta({ onApply }) {
    return h('section', { className: 'end-cta', 'aria-labelledby': 'cta-title' },
      h('div', { className: 'end-cta-inner' },
        h('h2', { id: 'cta-title' }, '次は、格納庫へ。'),
        h('p', null, '行ってみたいと思ったら、希望日を選んでください。申し込みの前に注意事項を確認できます。'),
        h('button', {
          className: 'button button-red end-cta-button',
          type: 'button',
          onClick: () => onApply('bottom')
        }, '見学を申し込む'),
        h('img', { className: 'end-cta-photo', src: './assets/aircraft-side.webp', width: 1500, height: 1050, alt: '格納庫内にある航空機の機体と尾翼', loading: 'lazy' })
      )
    );
  }

  // フッター（DADS準拠のクリアな構造）
  function Footer() {
    return h('footer', { className: 'footer' },
      h('div', { className: 'footer-inner' },
        h('div', { className: 'footer-brand-wrap' },
          h('span', { className: 'footer-brand', translate: 'no' }, 'JTA'),
          h('p', { className: 'footer-desc' }, '日本トランスオーシャン航空 整備格納庫見学 試作サイト')
        ),
        h('div', { className: 'footer-links' },
          h('a', { href: 'https://jta-okinawa.com/', target: '_blank', rel: 'noopener noreferrer' }, 'JTA公式サイト（外部サイト） ↗'),
          h('a', { href: 'https://jta-okinawa.com/booking_system/classroom/', target: '_blank', rel: 'noopener noreferrer' }, 'JTA航空教室公式案内 ↗')
        )
      ),
      h('div', { className: 'footer-bottom' },
        h('p', null, '本サイトはユーザーテスト用の試作です。実際の予約は成立しません。')
      )
    );
  }

  // ホームページ全体
  function HomePage() {
    const [isCautionOpen, setIsCautionOpen] = React.useState(false);
    React.useEffect(() => { track('page_view'); }, []);

    function openCaution(placement) {
      if (placement !== 'details') track('cta_click', { placement });
      track('caution_view', { from: placement });
      setIsCautionOpen(true);
    }

    function goToApply() {
      markCautionReviewed();
      window.location.assign(applyHref);
    }

    return h(React.Fragment, null,
      h(Header, { onApply: openCaution }),
      h('main', { id: 'main' },
        h(Hero),
        h(ZoomStory),
        h(Experience),
        h('div', { className: 'info-band' },
          h(Details, { onOpenCaution: () => openCaution('details') }),
          h(Faq)
        ),
        h(EndCta, { onApply: openCaution })
      ),
      h(Footer),
      h(CautionModal, {
        isOpen: isCautionOpen,
        onClose: () => setIsCautionOpen(false),
        onConfirm: goToApply,
        confirmLabel: '確認・同意して申し込みへ'
      })
    );
  }

  const emptyApplication = {
    date: '',
    name: '',
    kana: '',
    phone: '',
    schoolType: '',
    school: '',
    email: '',
    support: '',
    agreed: false
  };

  // 応募フォーム画面コンポーネント（DADS フォーム設計完全準拠）
  function ApplyPage() {
    const [step, setStep] = React.useState(1);
    const [form, setForm] = React.useState(() => ({ ...emptyApplication, agreed: hasReviewedCaution() }));
    const [dateError, setDateError] = React.useState('');
    const [isCautionOpen, setIsCautionOpen] = React.useState(() => !hasReviewedCaution());

    const today = japanToday();
    const earliest = dateString(addDays(today, 60));
    const latest = dateString(addDays(today, 90));

    React.useEffect(() => { track('application_view'); }, []);
    React.useEffect(() => {
      if (step > 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('apply-step-title')?.focus();
      }
    }, [step]);

    function change(key) {
      return event => {
        const val = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setForm(current => ({ ...current, [key]: val }));
        if (key === 'date') setDateError('');
      };
    }

    function handleCalendarSelect(dStr) {
      setForm(current => ({ ...current, date: dStr }));
      setDateError('');
    }

    function next(event) {
      event.preventDefault();
      if (!validVisitDate(form.date, earliest, latest)) {
        setDateError('申込期間内（本日より60日後〜90日後）の平日を選んでください。土日祝日は選べません。');
        document.getElementById('visit-date')?.focus();
        return;
      }
      if (!form.agreed) {
        alert('見学時の安全とルールに関する注意事項をご確認の上、同意のチェックをお願いいたします。');
        return;
      }
      setStep(2);
    }

    function review(event) {
      event.preventDefault();
      setStep(3);
    }

    function finish() {
      track('application_complete', { chosenDate: form.date });
      setForm(emptyApplication);
      setStep(4);
    }

    const label = (id, title, control, optional = false) => h('div', { className: 'form-field' },
      h('label', { htmlFor: id },
        title,
        optional ? h('span', { className: 'optional' }, '任意') : h('span', { className: 'required' }, '必須')
      ),
      control
    );

    return h(React.Fragment, null,
      h(Header),
      h('main', { id: 'main', className: 'apply-page' },
        h('div', { className: 'apply-inner' },
          step < 4 ? h('ol', { className: 'apply-steps', 'aria-label': '申し込みの手順' },
            ['希望日', '参加者情報', '確認'].map((name, index) => h('li', { key: name, className: step === index + 1 ? 'current' : step > index + 1 ? 'done' : '' },
              h('span', { 'aria-hidden': 'true' }, index + 1), name
            ))
          ) : null,

          h('h1', { id: 'apply-step-title', tabIndex: -1 },
            step === 1 ? '見学希望日を選ぶ' :
            step === 2 ? '参加者情報を入力する' :
            step === 3 ? '入力内容を確認する' :
            '申込操作が完了しました'
          ),

          // STEP 1: カレンダーと日付、注意事項のボタン
          step === 1 ? h('form', { className: 'apply-card date-step', onSubmit: next },
            h('div', { className: 'step-guide-box' },
              h('h2', null, 'カレンダーから日付を選ぶ'),
              h('p', { className: 'form-intro' }, '開催日時：平日10:00開始（所要時間約2時間）。希望日の90日前から60日前までの平日日程をお選びいただけます。')
            ),

            // 月別カレンダーピッカー
            h(CalendarPicker, {
              selectedDate: form.date,
              onSelectDate: handleCalendarSelect,
              earliest,
              latest
            }),

            // 選択された日付の確認表示と入力欄
            h('div', { className: 'selected-date-display' },
              label('visit-date', '選択された見学希望日',
                h('div', { className: 'date-input-wrap' },
                  h('input', {
                    id: 'visit-date',
                    name: 'date',
                    type: 'date',
                    required: true,
                    min: earliest,
                    max: latest,
                    value: form.date,
                    onChange: change('date'),
                    'aria-describedby': dateError ? 'date-error' : 'date-help',
                    'aria-invalid': !!dateError
                  }),
                  form.date ? h('span', { className: 'date-confirm-pill' }, `${form.date}（平日 10:00〜12:00）`) : null
                )
              ),
              h('p', { id: 'date-help', className: 'field-help' }, '※カレンダーの日付をクリックするか、上記入力欄から直接選択してください。'),
              dateError ? h('p', { id: 'date-error', className: 'field-error', role: 'alert' }, dateError) : null
            ),

            // 申込前に確認した注意事項の再確認と同意状態。
            h('div', { className: 'caution-section' },
              h('div', { className: 'caution-section-header' },
                h('h2', { className: 'cautions-title' }, '見学時の注意事項'),
                h('button', {
                  type: 'button',
                  className: 'button button-caution-modal',
                  onClick: () => {
                    setIsCautionOpen(true);
                    track('caution_view', { from: 'apply_step1' });
                  }
                },
                  h('span', null, '注意事項を再確認する')
                )
              ),
              h('p', { className: 'caution-intro' }, '注意事項を確認済みです。必要に応じて内容を再確認できます。'),
              h('label', { className: 'agree-row' },
                h('input', {
                  type: 'checkbox',
                  required: true,
                  checked: form.agreed,
                  onChange: change('agreed')
                }),
                h('span', null, '注意事項の内容を確認し、見学時のルールに同意します。')
              )
            ),

            h('div', { className: 'form-actions' },
              h('button', { className: 'button button-red submit-btn', type: 'submit' }, '参加者情報へ進む')
            )
          ) : null,

          // STEP 2: 氏名、電話番号、参加者情報
          step === 2 ? h('form', { className: 'apply-card', onSubmit: review },
            h('div', { className: 'step-guide-box' },
              h('h2', null, '参加者と連絡先'),
              h('p', { className: 'form-intro' }, '見学に参加されるご本人の情報をご入力ください。※試作画面のため、入力内容は外部へ送信・保存されません。')
            ),

            h('div', { className: 'form-grid' },
              // 氏名
              label('applicant-name', 'お名前（氏名）',
                h('input', {
                  id: 'applicant-name',
                  name: 'name',
                  autoComplete: 'name',
                  required: true,
                  placeholder: '例：山田 太郎',
                  value: form.name,
                  onChange: change('name')
                })
              ),
              label('applicant-kana', 'ふりがな',
                h('input', {
                  id: 'applicant-kana',
                  name: 'kana',
                  required: true,
                  placeholder: '例：やまだ たろう',
                  value: form.kana,
                  onChange: change('kana')
                })
              ),
              // 電話番号
              label('applicant-phone', '電話番号',
                h('input', {
                  id: 'applicant-phone',
                  name: 'phone',
                  type: 'tel',
                  autoComplete: 'tel',
                  inputMode: 'tel',
                  required: true,
                  placeholder: '例：090-1234-5678',
                  value: form.phone,
                  onChange: change('phone')
                })
              ),
              // メールアドレス
              label('applicant-email', 'メールアドレス',
                h('input', {
                  id: 'applicant-email',
                  name: 'email',
                  type: 'email',
                  autoComplete: 'email',
                  required: true,
                  placeholder: '例：taro@example.jp',
                  value: form.email,
                  onChange: change('email')
                })
              ),
              // 区分
              label('school-type', '区分',
                h('select', {
                  id: 'school-type',
                  name: 'schoolType',
                  required: true,
                  value: form.schoolType,
                  onChange: change('schoolType')
                },
                  h('option', { value: '' }, '選択してください'),
                  h('option', { value: '高校生' }, '高校生'),
                  h('option', { value: '大学生' }, '大学生')
                )
              ),
              // 学校名
              label('school-name', '学校名',
                h('input', {
                  id: 'school-name',
                  name: 'school',
                  autoComplete: 'organization',
                  required: true,
                  placeholder: '例：〇〇高等学校 / 〇〇大学',
                  value: form.school,
                  onChange: change('school')
                })
              )
            ),

            label('support', '見学時の特別な配慮・伝えたいこと',
              h('textarea', {
                id: 'support',
                name: 'support',
                rows: 4,
                value: form.support,
                onChange: change('support'),
                placeholder: '車椅子の利用、歩行・階段昇降時のサポート希望などがあればご記入ください。'
              }),
              true
            ),

            h('div', { className: 'form-actions' },
              h('button', { className: 'button button-red submit-btn', type: 'submit' }, '入力内容を確認する'),
              h('button', { className: 'text-button', type: 'button', onClick: () => setStep(1) }, '希望日・注意事項へ戻る')
            )
          ) : null,

          // STEP 3: 確認画面
          step === 3 ? h('div', { className: 'apply-card' },
            h('h2', null, 'お申し込み内容の確認'),
            h('dl', { className: 'review-list' }, [
              ['見学希望日時', `${form.date}（平日 10:00〜12:00）`],
              ['お名前（氏名）', form.name],
              ['ふりがな', form.kana],
              ['電話番号', form.phone],
              ['メールアドレス', form.email],
              ['区分', form.schoolType],
              ['学校名', form.school],
              ['注意事項への同意', '同意済み'],
              ['特別な配慮・連絡事項', form.support || '特になし']
            ].map(([key, value]) => h('div', { key }, h('dt', null, key), h('dd', null, value)))),

            h('div', { className: 'demo-notice' },
              h('strong', null, '【試作プロトタイプのご案内】'),
              h('p', null, 'この画面はユーザーテスト用の試作です。「内容を確定する」ボタンを押しても実際の予約は成立せず、ご入力いただいた氏名や連絡先等の個人情報はこのサイトから送信・保存されません。')
            ),

            h('div', { className: 'form-actions' },
              h('button', { className: 'button button-red submit-btn', type: 'button', onClick: finish }, '内容を確定する（完了テスト）'),
              h('button', { className: 'text-button', type: 'button', onClick: () => setStep(2) }, '入力内容を修正する')
            )
          ) : null,

          // STEP 4: 完了画面
          step === 4 ? h('div', { className: 'apply-card completion' },
            h('p', { className: 'completion-mark', 'aria-hidden': 'true' }, '✓'),
            h('h2', null, 'お申し込み操作が完了しました。'),
            h('p', { role: 'status', className: 'completion-lead' }, '見学お申し込み画面の全手順が正常に完了しました。ご協力ありがとうございました。'),
            h('div', { className: 'demo-notice' },
              h('p', null, '※これはユーザーテスト用試作のため、実際の予約は行われておりません。入力データも保存されておりませんのでご安心ください。')
            ),
            h('div', { className: 'completion-actions' },
              h('a', { className: 'button button-red', href: homeHref }, 'トップページへ戻る')
            )
          ) : null
        )
      ),
      h(Footer),

      // 注意事項モーダル
      h(CautionModal, {
        isOpen: isCautionOpen,
        onClose: () => {
          if (hasReviewedCaution()) setIsCautionOpen(false);
          else window.location.assign(homeHref);
        },
        onConfirm: () => {
          markCautionReviewed();
          setForm(current => ({ ...current, agreed: true }));
          setIsCautionOpen(false);
        },
        confirmLabel: '確認・同意する'
      })
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(isApplyView ? h(ApplyPage) : h(HomePage));
})();

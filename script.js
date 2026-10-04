const subjects = [
  { id: 'math', name: '수학', english: 'MATHEMATICS', icon: '∑', subtitle: '수학 과제 · 유니미 정답', rounds: [] },
  { id: 'physics', name: '물리', english: 'PHYSICS', icon: '↗', subtitle: '물리 과제 · 정답', rounds: [] },
  { id: 'chemistry', name: '화학', english: 'CHEMISTRY', icon: '⚗', subtitle: '화학 과제 · 정답', rounds: [] },
  { id: 'key-of-wisdom', name: '지성의 열쇠', english: 'KEY OF WISDOM', icon: '⌑', subtitle: '지성의 열쇠 과제 · 정답', rounds: [] },
  { id: 'liberal-arts', name: '기타 교양', english: 'LIBERAL ARTS', icon: '✳', subtitle: '기타 교양 과제 · 정답', rounds: [] },
  { id: 'more', name: '그 밖의 과목', english: 'MORE TO COME', icon: '＋', subtitle: '새로운 과목도 함께 추가해요', rounds: [] },
];

const filterRow = document.querySelector('#filters');
const grid = document.querySelector('#subject-grid');
const search = document.querySelector('#search');
const emptyState = document.querySelector('#empty-state');
const resultCount = document.querySelector('#result-count');
const uploadList = document.querySelector('#upload-list');
let activeFilter = '전체';

function renderFilters() {
  const names = ['전체', ...subjects.map(subject => subject.name)];
  filterRow.innerHTML = names.map(name => `<button class="filter-btn${name === activeFilter ? ' selected' : ''}" type="button" data-filter="${name}" aria-pressed="${name === activeFilter}">${name}</button>`).join('');
  filterRow.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    renderFilters();
    renderSubjects();
  }));
}

function roundMarkup(subject) {
  if (!subject.rounds.length) return '';
  return `<div class="round-list">${subject.rounds.map(round => `
    <div class="round-item"><span class="round-title">${escapeHtml(round.name)}</span><span class="round-links">
      ${round.files.map(file => `<a href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">${escapeHtml(file.name)}</a>`).join('')}
    </span></div>`).join('')}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function renderSubjects() {
  const query = search.value.trim().toLocaleLowerCase('ko');
  const filtered = subjects.filter(subject => {
    const matchesFilter = activeFilter === '전체' || subject.name === activeFilter;
    const haystack = `${subject.name} ${subject.english} ${subject.subtitle} ${subject.rounds.map(round => round.name).join(' ')}`.toLocaleLowerCase('ko');
    return matchesFilter && haystack.includes(query);
  });
  resultCount.textContent = query || activeFilter !== '전체' ? `${filtered.length}개 과목` : `전체 ${subjects.length}과목`;
  emptyState.hidden = filtered.length !== 0;
  grid.innerHTML = filtered.map((subject, index) => `
    <article class="subject-card" data-subject="${subject.id}">
      <div class="subject-top"><span class="subject-index">SUBJECT / 0${index + 1}</span><span class="subject-icon" aria-hidden="true">${subject.icon}</span></div>
      <h3>${subject.name}</h3><p class="subject-subtitle">${subject.subtitle}</p>
      <div class="round-row"><span class="round-count"><strong>${String(subject.rounds.length).padStart(2, '0')}</strong> ROUNDS</span>
        <button class="open-rounds" type="button" aria-expanded="false">회차 보기 <span aria-hidden="true">＋</span></button></div>
      ${roundMarkup(subject)}
    </article>`).join('');
  grid.querySelectorAll('.open-rounds').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('.subject-card');
    const isOpen = card.classList.toggle('expanded');
    button.setAttribute('aria-expanded', String(isOpen));
    button.innerHTML = isOpen ? '접기 <span aria-hidden="true">−</span>' : '회차 보기 <span aria-hidden="true">＋</span>';
  }));
}

function fieldValue(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = body.match(new RegExp(`^### ${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=\\n### |$)`, 'm'));
  return match ? match[1].trim().replace(/^_No response_$/i, '') : '';
}

function uploadedFiles(body) {
  const found = new Map();
  const markdownLink = /\[([^\]]+)\]\((https:\/\/github\.com\/user-attachments\/(?:files|assets)\/[^)\s]+|https:\/\/user-images\.githubusercontent\.com\/[^)\s]+)\)/g;
  for (const match of body.matchAll(markdownLink)) {
    try {
      const url = new URL(match[2]);
      const isGithubAttachment = url.hostname === 'github.com' && url.pathname.startsWith('/user-attachments/');
      const isGithubImage = url.hostname === 'user-images.githubusercontent.com';
      if (isGithubAttachment || isGithubImage) found.set(url.href, match[1].trim() || '파일 다운로드');
    } catch { /* Ignore malformed links in public submissions. */ }
  }
  return [...found.entries()].map(([url, name]) => ({ url, name }));
}

function renderUploads(issues) {
  const submissions = issues.filter(issue => !issue.pull_request).map(issue => {
    const body = issue.body || '';
    return {
      title: fieldValue(body, '과목') || '기타 자료',
      round: fieldValue(body, '회차') || '회차 미기재',
      type: fieldValue(body, '자료 종류') || '자료',
      issueUrl: issue.html_url,
      date: new Date(issue.created_at),
      files: uploadedFiles(body),
    };
  }).filter(item => item.files.length).sort((a, b) => b.date - a.date);

  subjects.forEach(subject => { subject.rounds = []; });
  submissions.forEach(submission => {
    const subject = subjects.find(item => item.name === submission.title);
    if (!subject) return;
    let round = subject.rounds.find(item => item.name === submission.round);
    if (!round) {
      round = { name: submission.round, files: [] };
      subject.rounds.push(round);
    }
    submission.files.forEach(file => round.files.push({ ...file, name: file.name, type: submission.type }));
  });
  subjects.forEach(subject => subject.rounds.sort((a, b) => b.name.localeCompare(a.name, 'ko', { numeric: true })));
  renderSubjects();

  if (!submissions.length) {
    uploadList.innerHTML = '<p class="no-uploads">아직 등록된 자료가 없어요. 첫 자료를 공유해 주세요.</p>';
    return;
  }

  uploadList.replaceChildren();
  submissions.slice(0, 12).forEach(item => {
    const card = document.createElement('article');
    card.className = 'upload-item';
    const details = document.createElement('div');
    details.className = 'upload-details';
    const subject = document.createElement('span');
    subject.className = 'upload-subject';
    subject.textContent = item.title;
    const title = document.createElement('strong');
    title.textContent = `${item.round} · ${item.type}`;
    const date = document.createElement('span');
    date.className = 'upload-date';
    date.textContent = Number.isNaN(item.date.getTime()) ? '' : item.date.toLocaleDateString('ko-KR');
    details.append(subject, title, date);
    const links = document.createElement('div');
    links.className = 'download-links';
    item.files.forEach(file => {
      const link = document.createElement('a');
      link.href = file.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = `↓ ${file.name}`;
      links.append(link);
    });
    const issueLink = document.createElement('a');
    issueLink.className = 'submission-link';
    issueLink.href = item.issueUrl;
    issueLink.target = '_blank';
    issueLink.rel = 'noreferrer';
    issueLink.textContent = '정보 ↗';
    links.append(issueLink);
    card.append(details, links);
    uploadList.append(card);
  });
}

async function loadUploads() {
  try {
    const url = new URL('https://api.github.com/repos/kelvin2008-a11y/sturdy-study-assignments/issues');
    url.searchParams.set('state', 'all');
    url.searchParams.set('labels', '자료공유');
    url.searchParams.set('per_page', '100');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    renderUploads(await response.json());
  } catch {
    uploadList.innerHTML = '<p class="no-uploads">자료 목록을 불러오지 못했어요. 잠시 뒤 다시 방문해 주세요. <a href="https://github.com/kelvin2008-a11y/sturdy-study-assignments/issues?q=is%3Aissue+label%3A%22%EC%9E%90%EB%A3%8C%EA%B3%B5%EC%9C%A0%22" target="_blank" rel="noreferrer">GitHub에서 자료 보기 ↗</a></p>';
  }
}

search.addEventListener('input', renderSubjects);
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement !== search) {
    event.preventDefault();
    search.focus();
  }
  if (event.key === 'Enter' && document.activeElement === search) document.activeElement.blur();
});

renderFilters();
renderSubjects();
loadUploads();
